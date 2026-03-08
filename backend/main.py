import base64
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal, Optional

import aiofiles
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from google import genai
from google.genai import types as genai_types
from pydantic import BaseModel
from livekit.api import AccessToken, VideoGrants

load_dotenv()

app = FastAPI(title="ycxgoogle backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LIVEKIT_URL = os.getenv("LIVEKIT_URL")
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

STORE_DIR = Path(__file__).parent / "store"
STORE_DIR.mkdir(exist_ok=True)

app.mount("/store", StaticFiles(directory=str(STORE_DIR)), name="store")

# ---------------------------------------------------------------------------
# Agent state — keyed by room so multiple devices stay isolated
# ---------------------------------------------------------------------------

_EMPTY_STATE: dict[str, Any] = {
    "description": None,
    "prompt": None,
    "is_playing": False,
    "last_updated": None,
    "room": None,
}

# { room_name -> state_dict }
agent_states: dict[str, dict[str, Any]] = {}


class AgentStateUpdate(BaseModel):
    description: str
    prompt: str
    is_playing: bool = True
    room: str = ""


@app.post("/internal/agent/update")
async def update_agent_state(update: AgentStateUpdate):
    """Called internally by the agent worker to push per-room state."""
    agent_states[update.room] = {
        "description": update.description,
        "prompt": update.prompt,
        "is_playing": update.is_playing,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "room": update.room,
    }
    return {"ok": True}


@app.get("/agent/state")
async def get_agent_state(room: str = Query(default="game-audio-room")):
    """Return the latest agent state for a specific room."""
    return agent_states.get(room, {**_EMPTY_STATE, "room": room})


# ---------------------------------------------------------------------------
# In-memory recordings store
# ---------------------------------------------------------------------------

class Recording(BaseModel):
    id: str
    date: str
    duration: str
    status: Literal["Complete", "Processing", "Failed"]
    tags: list[str]
    headline: str | None = None
    video_filename: str | None = None
    thumbnail_filename: str | None = None


class RecordingCreate(BaseModel):
    duration: str
    tags: list[str] = []
    headline: str | None = None


class RecordingMeta(BaseModel):
    thumbnail_b64: str  # data:image/jpeg;base64,...
    headline: str


recordings: list[Recording] = []


def _format_date(dt: datetime) -> str:
    return dt.strftime("%b %-d, %Y")


def _duration_to_seconds(duration: str) -> int:
    """Parse 'M:SS' or 'MM:SS' into total seconds."""
    try:
        parts = duration.split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 0


# ---------------------------------------------------------------------------
# Token endpoint
# ---------------------------------------------------------------------------

class TokenRequest(BaseModel):
    room: str
    identity: str


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/token")
async def get_token(req: TokenRequest):
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        raise HTTPException(status_code=500, detail="LiveKit credentials not configured")

    token = (
        AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(req.identity)
        .with_name(req.identity)
        .with_grants(
            VideoGrants(
                room_join=True,
                room=req.room,
                can_publish=True,
                can_subscribe=True,
            )
        )
        .to_jwt()
    )

    return {"token": token, "url": LIVEKIT_URL}


# ---------------------------------------------------------------------------
# Recordings endpoints
# ---------------------------------------------------------------------------

@app.get("/recordings")
async def list_recordings() -> list[Recording]:
    return list(reversed(recordings))


@app.post("/recordings", status_code=201)
async def create_recording(req: RecordingCreate) -> Recording:
    rec = Recording(
        id=f"REC-{len(recordings) + 1:03d}",
        date=_format_date(datetime.now(timezone.utc)),
        duration=req.duration,
        status="Complete",
        tags=req.tags,
        headline=req.headline,
    )
    recordings.append(rec)
    return rec


@app.post("/recordings/{recording_id}/meta")
async def upload_recording_meta(recording_id: str, meta: RecordingMeta):
    """Save base64 thumbnail image and headline for a recording."""
    idx = next((i for i, r in enumerate(recordings) if r.id == recording_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Recording not found")

    b64_data = meta.thumbnail_b64.split(",", 1)[-1]
    thumb_bytes = base64.b64decode(b64_data)
    thumb_filename = f"{recording_id}_thumb.jpg"
    async with aiofiles.open(STORE_DIR / thumb_filename, "wb") as f:
        await f.write(thumb_bytes)

    recordings[idx] = recordings[idx].model_copy(update={
        "headline": meta.headline,
        "thumbnail_filename": thumb_filename,
    })
    return {"ok": True}


class ThumbnailGenRequest(BaseModel):
    intense_description: str  # most intense Overshoot description from the session
    headline: str


@app.post("/recordings/{recording_id}/generate-thumbnail")
async def generate_thumbnail(recording_id: str, req: ThumbnailGenRequest):
    """Use nano banana (Google Imagen) to generate an AI thumbnail from the most intense moment."""
    idx = next((i for i, r in enumerate(recordings) if r.id == recording_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Recording not found")
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")

    prompt = (
        f"Cinematic video game screenshot thumbnail: {req.intense_description}. "
        "Dramatic lighting, intense atmosphere, highly detailed game environment, "
        "photorealistic game art style, wide angle shot, dynamic composition, "
        "cinematic color grading, ultra HD 4K, sharp focus, vibrant colors."
    )

    client = genai.Client(api_key=GOOGLE_API_KEY)
    response = await client.aio.models.generate_images(
        model="imagen-3.0-generate-002",
        prompt=prompt,
        config=genai_types.GenerateImagesConfig(
            number_of_images=1,
            output_mime_type="image/jpeg",
            aspect_ratio="16:9",
        ),
    )

    image_bytes = response.generated_images[0].image.image_bytes
    thumb_filename = f"{recording_id}_thumb.jpg"
    async with aiofiles.open(STORE_DIR / thumb_filename, "wb") as f:
        await f.write(image_bytes)

    recordings[idx] = recordings[idx].model_copy(update={
        "headline": req.headline,
        "thumbnail_filename": thumb_filename,
    })

    b64 = base64.b64encode(image_bytes).decode()
    return {"thumbnail_data_url": f"data:image/jpeg;base64,{b64}", "ok": True}


@app.post("/recordings/{recording_id}/video")
async def upload_recording_video(recording_id: str, request: Request):
    """Accept raw video/webm body and store it in backend/store/."""
    idx = next((i for i, r in enumerate(recordings) if r.id == recording_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Recording not found")

    data = await request.body()
    video_filename = f"{recording_id}.webm"
    async with aiofiles.open(STORE_DIR / video_filename, "wb") as f:
        await f.write(data)

    recordings[idx] = recordings[idx].model_copy(update={"video_filename": video_filename})
    return {"ok": True}


@app.get("/recordings/{recording_id}/video")
async def serve_recording_video(recording_id: str, download: bool = False):
    """Stream or download the video file for a recording."""
    rec = next((r for r in recordings if r.id == recording_id), None)
    if not rec or not rec.video_filename:
        raise HTTPException(status_code=404, detail="Video not found")
    path = STORE_DIR / rec.video_filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Video file missing")
    disposition = "attachment" if download else "inline"
    return FileResponse(
        str(path),
        media_type="video/webm",
        headers={"Content-Disposition": f'{disposition}; filename="{rec.video_filename}"'},
    )


@app.get("/recordings/{recording_id}/thumbnail")
async def serve_recording_thumbnail(recording_id: str):
    """Serve the thumbnail image for a recording."""
    rec = next((r for r in recordings if r.id == recording_id), None)
    if not rec or not rec.thumbnail_filename:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    path = STORE_DIR / rec.thumbnail_filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Thumbnail file missing")
    return FileResponse(str(path), media_type="image/jpeg")


@app.delete("/recordings/{recording_id}", status_code=204)
async def delete_recording(recording_id: str):
    global recordings
    before = len(recordings)
    recordings = [r for r in recordings if r.id != recording_id]
    if len(recordings) == before:
        raise HTTPException(status_code=404, detail="Recording not found")


# ---------------------------------------------------------------------------
# Stats endpoint
# ---------------------------------------------------------------------------

@app.get("/stats")
async def get_stats():
    today = _format_date(datetime.now(timezone.utc))
    sessions_today = sum(1 for r in recordings if r.date == today)
    total = len(recordings)

    if total > 0:
        avg_secs = sum(_duration_to_seconds(r.duration) for r in recordings) // total
        avg_duration = f"{avg_secs // 60}:{avg_secs % 60:02d}"
    else:
        avg_duration = "0:00"

    processing = sum(1 for r in recordings if r.status == "Processing")

    return {
        "sessions_today": sessions_today,
        "tracks_generated": total,
        "avg_duration": avg_duration,
        "processing": processing,
    }
