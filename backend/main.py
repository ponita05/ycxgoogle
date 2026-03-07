import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from livekit.api import LiveKitAPI, AccessToken, VideoGrants

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
