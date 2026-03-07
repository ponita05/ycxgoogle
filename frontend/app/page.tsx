"use client";

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { useState } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import ScreenCapture from "@/components/ScreenCapture";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const ROOM_NAME = "game-audio-room";

async function fetchToken(identity: string): Promise<{ token: string; url: string }> {
  const res = await fetch(`${BACKEND_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room: ROOM_NAME, identity }),
  });
  if (!res.ok) throw new Error("Failed to fetch token");
  return res.json();
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setConnecting(true);
    setError(null);
    try {
      const identity = `player-${Math.random().toString(36).slice(2, 7)}`;
      const { token, url } = await fetchToken(identity);
      setLivekitUrl(url);
      setToken(token);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }

  function disconnect() {
    setToken(null);
    setLivekitUrl(null);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Game Audio AI</h1>
        <p className="text-zinc-400 text-sm max-w-md">
          Share your screen while gaming. Gemini watches the action and Lyria
          generates adaptive music in real-time.
        </p>
      </div>

      {!token ? (
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={connect}
            disabled={connecting}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-2xl font-semibold text-lg transition-colors"
          >
            {connecting ? "Connecting..." : "Start Session"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      ) : (
        <LiveKitRoom
          token={token}
          serverUrl={livekitUrl!}
          connect={true}
          audio={false}
          video={false}
          onDisconnected={disconnect}
          className="flex flex-col items-center gap-6 w-full max-w-lg"
        >
          <RoomAudioRenderer />

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full flex flex-col items-center gap-6">
            <ScreenCapture />
            <div className="w-full border-t border-zinc-800" />
            <AudioPlayer />
          </div>

          <button
            onClick={disconnect}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            End session
          </button>
        </LiveKitRoom>
      )}
    </main>
  );
}
