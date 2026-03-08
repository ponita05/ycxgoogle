"""
LiveKit agent worker — real-time game audio generator.

Pipeline:
  1. Browser participant joins LiveKit room and shares screen
  2. Agent generates a token for Overshoot to join the same room
  3. Overshoot watches the screen share via LiveKitSource and returns
     game state descriptions in real-time via on_result callback
  4. Descriptions update weighted prompts on a Lyria RealTime session
  5. Lyria streams 48kHz stereo PCM → published back into the LiveKit room
"""

import asyncio
import logging
import os
import ssl
import certifi
import httpx

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli
from livekit.api import AccessToken, VideoGrants
import overshoot
from google import genai
from google.genai import types as genai_types

load_dotenv()

# Fix macOS Python 3.13 SSL cert verification
os.environ.setdefault("SSL_CERT_FILE", certifi.where())
os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())

logger = logging.getLogger("game-audio-agent")

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
OVERSHOOT_API_KEY = os.getenv("OVERSHOOT_API_KEY")

FRAME_INTERVAL = float(os.getenv("FRAME_SAMPLE_INTERVAL", "3"))
OVERSHOOT_MODEL = os.getenv("OVERSHOOT_MODEL", "Qwen/Qwen3-VL-8B-Instruct")


def make_livekit_token(room: str, identity: str, can_publish: bool = False) -> str:
    return (
        AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_name(identity)
        .with_grants(
            VideoGrants(
                room_join=True,
                room=room,
                can_publish=can_publish,
                can_subscribe=True,
            )
        )
        .to_jwt()
    )


async def entrypoint(ctx: JobContext):
    logger.info(f"Agent starting — room: {ctx.room.name}")

    await ctx.connect(auto_subscribe=AutoSubscribe.SUBSCRIBE_NONE)

    # Audio source for Lyria output → published into the room
    audio_source = rtc.AudioSource(sample_rate=48000, num_channels=2)
    audio_track = rtc.LocalAudioTrack.create_audio_track("lyria-music", audio_source)
    await ctx.room.local_participant.publish_track(
        audio_track,
        rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE),
    )
    logger.info("Published Lyria audio track")

    # Lyria RealTime session
    genai_client = genai.Client(
        api_key=GOOGLE_API_KEY,
        http_options={"api_version": "v1alpha"},
    )

    current_description: list[str] = ["epic video game background music"]
    raw_description: list[str] = [""]
    prompt_update_event = asyncio.Event()

    async def _post_backend_state(raw: str, prompt: str) -> None:
        """Fire-and-forget: push current agent state to the FastAPI backend."""
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    "http://localhost:8000/internal/agent/update",
                    json={
                        "description": raw,
                        "prompt": prompt,
                        "is_playing": True,
                        "room": ctx.room.name,
                    },
                    timeout=2.0,
                )
        except Exception as e:
            logger.debug(f"Backend state update failed: {e}")

    async def lyria_loop():
        """Maintain a persistent Lyria session; update prompts as descriptions change."""
        logger.info("Connecting to Lyria RealTime...")
        async with genai_client.aio.live.music.connect(
            model="models/lyria-realtime-exp"
        ) as session:
            await session.set_weighted_prompts(
                prompts=[
                    genai_types.WeightedPrompt(
                        text=current_description[0], weight=1.0
                    )
                ]
            )
            await session.set_music_generation_config(
                config=genai_types.LiveMusicGenerationConfig(
                    bpm=120,
                    temperature=1.0,
                )
            )
            await session.play()
            logger.info("Lyria playing")

            async def push_audio():
                async for message in session.receive():
                    try:
                        chunk = message.server_content.audio_chunks[0]
                        pcm_bytes = chunk.data
                        # Lyria outputs raw 16-bit PCM at 48kHz stereo
                        samples_per_channel = len(pcm_bytes) // (2 * 2)  # 16-bit * 2ch
                        frame = rtc.AudioFrame(
                            data=pcm_bytes,
                            sample_rate=48000,
                            num_channels=2,
                            samples_per_channel=samples_per_channel,
                        )
                        await audio_source.capture_frame(frame)
                    except Exception as e:
                        logger.debug(f"Audio chunk error: {e}")

            async def update_prompts():
                while True:
                    await prompt_update_event.wait()
                    prompt_update_event.clear()
                    desc = current_description[0]
                    raw = raw_description[0]
                    logger.info(f"Updating Lyria prompt: {desc[:80]}")
                    # Push state to backend (non-blocking)
                    asyncio.create_task(_post_backend_state(raw, desc))
                    try:
                        await session.set_weighted_prompts(
                            prompts=[
                                genai_types.WeightedPrompt(text=desc, weight=1.0)
                            ]
                        )
                    except Exception as e:
                        logger.error(f"Prompt update error: {e}")

            await asyncio.gather(push_audio(), update_prompts())

    async def overshoot_loop():
        """Connect Overshoot to the LiveKit room screen share and call Lyria on results."""
        logger.info("Waiting for a screen share participant...")

        # Wait until at least one remote participant joins
        while len(ctx.room.remote_participants) == 0:
            await asyncio.sleep(1)

        overshoot_token = make_livekit_token(
            room=ctx.room.name,
            identity="overshoot-vision",
            can_publish=False,
        )

        os_client = overshoot.Overshoot(api_key=OVERSHOOT_API_KEY)

        def on_result(result):
            description = result.result
            logger.info(f"Overshoot result: {description[:100]}")

            # Skip descriptions that are clearly not game content
            _skip_keywords = (
                "desktop", "browser", "taskbar", "file manager", "finder",
                "settings", "system", "operating system", "dock", "toolbar",
                "no game", "not a game", "cannot identify", "can't identify",
                "unclear", "blurry", "black screen", "loading screen",
            )
            desc_lower = description.lower()
            if any(kw in desc_lower for kw in _skip_keywords):
                logger.info("Skipping non-game description")
                return

            raw_description[0] = description
            current_description[0] = (
                f"video game soundtrack — {description} — "
                "no vocals, cinematic orchestral or electronic, adaptive game music"
            )
            prompt_update_event.set()

        def on_error(error):
            logger.error(f"Overshoot error: {error}")

        logger.info("Starting Overshoot stream on LiveKit room")
        stream = await os_client.streams.create(
            source=overshoot.LiveKitSource(
                url=LIVEKIT_URL,
                token=overshoot_token,
            ),
            prompt=(
                "You are watching a screen share of someone playing a video game. "
                "Ignore any desktop chrome, browser UI, taskbars, or OS elements — focus only on the game itself. "
                "Describe the in-game scene for adaptive music generation. "
                "Be specific: name the energy level (intense combat / stealth / exploration / boss fight / victory / cutscene), "
                "the environment (underground cave / open sky / dense forest / futuristic city / etc.), "
                "and the dominant emotion (dread, triumph, wonder, urgency, sorrow, excitement). "
                "Do NOT use generic words like 'calm', 'menu', or 'computer screen'. "
                "If no clear game content is visible, say 'no game content visible'. "
                "Answer in 1-2 punchy sentences."
            ),
            model=OVERSHOOT_MODEL,
            mode="frame",
            interval_seconds=FRAME_INTERVAL,
            on_result=on_result,
            on_error=on_error,
        )

        logger.info("Overshoot stream active")

        # Keep the stream alive until the room disconnects
        try:
            while ctx.room.connection_state == rtc.ConnectionState.CONN_CONNECTED:
                await asyncio.sleep(5)
        finally:
            await stream.close()
            await os_client.close()
            logger.info("Overshoot stream closed")

    asyncio.ensure_future(lyria_loop())
    asyncio.ensure_future(overshoot_loop())

    logger.info("Agent ready — waiting for participants")


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
        )
    )
