"use client";

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { useCallback, useRef, useState } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import ScreenCapture from "@/components/ScreenCapture";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const ROOM_NAME = "game-audio-room";

const VIBES = [
  "Neon pursuit",
  "Cinematic dread",
  "Stealth pulse",
  "Boss fight surge",
  "Dreamy exploration",
  "Retro arcade rush",
] as const;

type TrackHistoryItem = {
  id: string;
  title: string;
  vibe: string;
  startedAt: number;
  endedAt?: number;
};

async function fetchToken(identity: string): Promise<{ token: string; url: string }> {
  const res = await fetch(`${BACKEND_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room: ROOM_NAME, identity }),
  });
  if (!res.ok) throw new Error("Failed to fetch token");
  return res.json();
}

function formatDuration(startedAt: number, endedAt?: number): string {
  const end = endedAt ?? Date.now();
  const seconds = Math.max(1, Math.floor((end - startedAt) / 1000));
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [playbackActive, setPlaybackActive] = useState(false);
  const [trackHistory, setTrackHistory] = useState<TrackHistoryItem[]>([]);

  const activeTrackIdRef = useRef<string | null>(null);
  const vibeIndexRef = useRef(0);
  const prevPlaybackRef = useRef<boolean>(false);

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
    setIsSharing(false);
    setPlaybackActive(false);
    if (activeTrackIdRef.current) {
      const currentId = activeTrackIdRef.current;
      setTrackHistory((prev) =>
        prev.map((item) => (item.id === currentId && !item.endedAt ? { ...item, endedAt: Date.now() } : item))
      );
      activeTrackIdRef.current = null;
    }
  }

  const onPlaybackChange = useCallback((isPlaying: boolean, agentConnected: boolean) => {
    setPlaybackActive(isPlaying);
    void agentConnected;

    if (isPlaying && !prevPlaybackRef.current && !activeTrackIdRef.current) {
      const vibe = VIBES[vibeIndexRef.current % VIBES.length];
      vibeIndexRef.current += 1;
      const id = crypto.randomUUID();
      const startedAt = Date.now();

      setTrackHistory((prev) => [
        {
          id,
          title: `Adaptive Track ${prev.length + 1}`,
          vibe,
          startedAt,
        },
        ...prev,
      ]);

      activeTrackIdRef.current = id;
    }

    if (!isPlaying && prevPlaybackRef.current && activeTrackIdRef.current) {
      const activeTrackId = activeTrackIdRef.current;
      setTrackHistory((prev) =>
        prev.map((item) => (item.id === activeTrackId && !item.endedAt ? { ...item, endedAt: Date.now() } : item))
      );
      activeTrackIdRef.current = null;
    }
    prevPlaybackRef.current = isPlaying;
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-transparent px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="aurora-bg" />
      <div className="pointer-events-none absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="glass-card rounded-3xl p-6 sm:p-8">
          <p className="mb-3 inline-flex rounded-full border border-sky-300/70 bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-800">
            Real-time Reactive Audio
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">
            ScreenPulse Composer Dashboard
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-700 sm:text-base">
            Generate adaptive background music and live narration from what is happening on screen. The dashboard tracks the vibes generated throughout your session.
          </p>
        </section>

        {!token ? (
          <section className="glass-card rounded-3xl p-8">
            <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
              <p className="text-sm text-slate-700">Launch a LiveKit room, then share your screen to start AI music generation.</p>
              <button
                onClick={connect}
                disabled={connecting}
                className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-teal-500 px-6 py-4 text-base font-black text-white shadow-lg shadow-sky-500/20 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {connecting ? "Connecting..." : "Start Session"}
              </button>
              {error && <p className="text-sm text-rose-700">{error}</p>}
            </div>
          </section>
        ) : (
          <LiveKitRoom
            token={token}
            serverUrl={livekitUrl!}
            connect={true}
            audio={false}
            video={false}
            onDisconnected={disconnect}
            className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]"
          >
            <RoomAudioRenderer />

            <section className="glass-card rounded-3xl p-6">
              <h2 className="text-lg font-bold text-slate-900">Live Session Controls</h2>
              <p className="mt-1 text-sm text-slate-600">Use screen share to drive analysis and adaptive music.</p>
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white/65 p-5">
                <ScreenCapture
                  onShareStart={() => {
                    setIsSharing(true);
                  }}
                  onShareStop={() => {
                    setIsSharing(false);
                  }}
                />
                <div className="my-5 border-t border-slate-200" />
                <AudioPlayer onPlaybackChange={onPlaybackChange} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                <StatusPill label="Screen" value={isSharing ? "Sharing" : "Idle"} active={isSharing} />
                <StatusPill label="Playback" value={playbackActive ? "Active" : "Standby"} active={playbackActive} />
              </div>

              <button
                onClick={disconnect}
                className="mt-6 w-full rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                End Session
              </button>
            </section>

            <section className="glass-card rounded-3xl p-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Previously Played Music</h2>
                <p className="mt-1 text-sm text-slate-600">Tracks generated in this session and the applied vibe.</p>
                <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {trackHistory.length === 0 ? (
                    <EmptyPanel message="No generated tracks yet. Start screen sharing to begin adaptive scoring." />
                  ) : (
                    trackHistory.map((track) => (
                      <article key={track.id} className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm font-bold text-sky-900">{track.title}</h3>
                          <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                            {track.vibe}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-600">
                          Duration: {formatDuration(track.startedAt, track.endedAt)}
                          {!track.endedAt ? " (live)" : ""}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>
          </LiveKitRoom>
        )}
      </div>
    </main>
  );
}

function StatusPill({ label, value, active }: { label: string; value: string; active: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/75 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-bold ${active ? "text-emerald-700" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-600">
      {message}
    </div>
  );
}
