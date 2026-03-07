"use client";

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { useState, useRef, useEffect } from "react";
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

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LiveSession() {
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const sessionStartRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function connect() {
    setConnecting(true);
    setError(null);
    try {
      const identity = `player-${Math.random().toString(36).slice(2, 7)}`;
      const { token, url } = await fetchToken(identity);
      setLivekitUrl(url);
      setToken(token);
      sessionStartRef.current = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - (sessionStartRef.current ?? Date.now())) / 1000));
      }, 1000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Save recording to backend
    if (sessionStartRef.current !== null) {
      const durationSecs = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      const duration = formatDuration(durationSecs);
      sessionStartRef.current = null;

      try {
        await fetch(`${BACKEND_URL}/recordings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duration, tags: ["Live Session"] }),
        });
      } catch {
        // non-blocking — don't block UI on save failure
      }
    }

    setElapsed(0);
    setToken(null);
    setLivekitUrl(null);
  }

  return (
    <div className="flex flex-col items-center justify-center gap-8 p-12 w-full min-h-[300px]">
      {!token ? (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_40px_rgba(0,200,255,0.4)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="10,8 16,12 10,16"/>
              </svg>
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 opacity-20 blur-md -z-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Ready to Start?</h2>
            <p className="text-sm text-white/40 max-w-sm leading-relaxed">
              Connect to the live session to capture gameplay and generate adaptive music in real time.
            </p>
          </div>
          <button
            onClick={connect}
            disabled={connecting}
            className="relative px-8 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', boxShadow: '0 0 30px rgba(6,182,212,0.4)' }}
          >
            {connecting ? "Connecting..." : "Start Session"}
          </button>
          {error && (
            <p className="text-xs text-red-400 border border-red-500/20 bg-red-500/5 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
        </div>
      ) : (
        <LiveKitRoom
          token={token}
          serverUrl={livekitUrl!}
          connect={true}
          audio={false}
          video={false}
          onDisconnected={disconnect}
          className="flex flex-col items-center gap-5 w-full max-w-lg"
        >
          <RoomAudioRenderer />

          {/* Session timer */}
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#22d3ee]" />
            <span className="text-xs font-mono text-cyan-400 tabular-nums">
              {formatDuration(elapsed)}
            </span>
            <span className="text-[10px] text-white/30 uppercase tracking-wider">live</span>
          </div>

          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-6 w-full flex flex-col items-center gap-5">
            <ScreenCapture />
            <div className="w-full border-t border-cyan-500/10" />
            <AudioPlayer />
          </div>

          <button
            onClick={disconnect}
            className="px-5 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-400/50 transition-colors text-xs font-medium"
          >
            End Session
          </button>
        </LiveKitRoom>
      )}
    </div>
  );
}
