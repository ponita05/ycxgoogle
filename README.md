# Game Audio AI

Real-time adaptive game music powered by AI. Share your screen while gaming — Gemini watches the action via [Overshoot](https://overshoot.dev) vision analysis, and [Lyria](https://deepmind.google/technologies/gemini/lyria/) generates a continuous soundtrack that reacts to what's happening on screen.

## How It Works

```
Browser                          Backend
┌──────────────┐          ┌──────────────────────┐
│ Share screen ├──video──►│ Overshoot Vision AI  │
│              │          │ (analyzes frames     │
│              │          │  every 3 seconds)    │
│              │          └─────────┬────────────┘
│              │                    │ scene description
│              │          ┌────────▼────────────┐
│              │◄──audio──┤ Lyria RealTime       │
│ Play music   │          │ (generates adaptive  │
│              │          │  music from prompt)  │
└──────────────┘          └─────────────────────┘
```

All communication flows through a [LiveKit](https://livekit.io/) room in real-time:

1. **Browser** joins a LiveKit room and shares screen
2. **Overshoot** subscribes to the screen share track, analyzes frames with a vision model (Qwen3-VL-8B), and returns scene descriptions (mood, action level, environment)
3. Scene descriptions update the **Lyria RealTime** music generation prompt
4. Lyria streams 48 kHz stereo PCM audio back into the LiveKit room
5. **Browser** receives and plays the adaptive soundtrack

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Real-time | LiveKit (WebRTC rooms, audio/video tracks) |
| Backend API | FastAPI + Uvicorn (token server) |
| Agent Worker | LiveKit Agents SDK (Python) |
| Vision AI | Overshoot (LiveKit source, frame analysis) |
| Music Gen | Google Gemini — Lyria RealTime (streaming PCM) |

## Project Structure

```
ycxgoogle/
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Main UI — session management, LiveKit room
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Tailwind styles
│   └── components/
│       ├── ScreenCapture.tsx     # Screen share controls
│       └── AudioPlayer.tsx       # Music playback status
├── backend/
│   ├── main.py                   # FastAPI token server
│   ├── agent.py                  # LiveKit agent — Overshoot + Lyria pipeline
│   ├── requirements.txt          # Python dependencies
│   └── .env.example              # Environment variable template
└── README.md
```

## Prerequisites

- **Node.js** 20+ (or [Bun](https://bun.sh))
- **Python** 3.11+
- **LiveKit Cloud** account — [livekit.io](https://livekit.io/) (free tier available)
- **Google AI API key** — for Gemini / Lyria access
- **Overshoot API key** — [overshoot.dev](https://overshoot.dev)

## Quickstart

### 1. Clone and navigate

```bash
git clone <repo-url>
cd ycxgoogle/ycxgoogle
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your credentials:

```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
GOOGLE_API_KEY=your_gemini_api_key
OVERSHOOT_API_KEY=your_overshoot_api_key

# Optional tuning
FRAME_SAMPLE_INTERVAL=3       # Seconds between frame analyses
LYRIA_CLIP_DURATION=10         # Lyria clip duration
```

### 3. Start the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Terminal 1 — Token server
uvicorn main:app --reload --port 8000

# Terminal 2 — Agent worker
python agent.py dev
```

### 4. Start the frontend

```bash
cd frontend
npm install                     # or: bun install
npm run dev                     # or: bun dev
```

### 5. Use it

1. Open [http://localhost:3000](http://localhost:3000)
2. Click **Start Session**
3. Click **Share Screen** and select your game window
4. Music begins playing within a few seconds as the AI analyzes your screen

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/token` | Returns a LiveKit access token. Body: `{ "room": "string", "identity": "string" }` |
| `GET` | `/health` | Health check — returns `{ "status": "ok" }` |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LIVEKIT_URL` | Yes | LiveKit server WebSocket URL |
| `LIVEKIT_API_KEY` | Yes | LiveKit API key |
| `LIVEKIT_API_SECRET` | Yes | LiveKit API secret |
| `GOOGLE_API_KEY` | Yes | Google Gemini API key (Lyria access) |
| `OVERSHOOT_API_KEY` | Yes | Overshoot vision AI API key |
| `FRAME_SAMPLE_INTERVAL` | No | Seconds between frame analyses (default: `3`) |
| `LYRIA_CLIP_DURATION` | No | Lyria clip duration in seconds (default: `10`) |
| `OVERSHOOT_MODEL` | No | Vision model (default: `Qwen/Qwen3-VL-8B-Instruct`) |
