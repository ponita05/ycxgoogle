import os
import uuid
from datetime import datetime, timezone
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

# ---------------------------------------------------------------------------
# In-memory recordings store
# ---------------------------------------------------------------------------

class Recording(BaseModel):
    id: str
    date: str
    duration: str
    status: Literal["Complete", "Processing", "Failed"]
    tags: list[str]


class RecordingCreate(BaseModel):
    duration: str
    tags: list[str] = []


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
    )
    recordings.append(rec)
    return rec


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
