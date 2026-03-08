"use client";

<<<<<<< HEAD
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { useCallback, useRef, useState } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import ScreenCapture from "@/components/ScreenCapture";
=======
import { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar } from "@/components/Dashboard/Sidebar";
import { RecordingsPanel } from "@/components/Dashboard/RecordingsPanel";
import VisualEditor from "@/components/Dashboard/VisualEditor";
import Visualizer3D from "@/components/Dashboard/Visualizer3D";
import { LiveSession } from "@/components/Dashboard/LiveSession";
>>>>>>> 054cd4ce443f75d56d0d2d1ccb465dd658450b51

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const sections = ["live", "flow", "visualizer", "recordings", "settings"];

<<<<<<< HEAD
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
=======
interface Stats {
  sessions_today: number;
  tracks_generated: number;
  avg_duration: string;
  processing: number;
>>>>>>> 054cd4ce443f75d56d0d2d1ccb465dd658450b51
}

function formatDuration(startedAt: number, endedAt?: number): string {
  const end = endedAt ?? Date.now();
  const seconds = Math.max(1, Math.floor((end - startedAt) / 1000));
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export default function Home() {
<<<<<<< HEAD
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
=======
  const [activeSection, setActiveSection] = useState("live");
  const [stats, setStats] = useState<Stats>({
    sessions_today: 0,
    tracks_generated: 0,
    avg_duration: "0:00",
    processing: 0,
  });
  const observerRef = useRef<IntersectionObserver | null>(null);
>>>>>>> 054cd4ce443f75d56d0d2d1ccb465dd658450b51

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/stats`);
      if (res.ok) setStats(await res.json());
    } catch {
      // silently fail — stats are non-critical
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

<<<<<<< HEAD
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
=======
  const statCards = [
    { label: "Sessions Today",   value: String(stats.sessions_today),  color: "from-cyan-400 to-blue-500" },
    { label: "Tracks Generated", value: String(stats.tracks_generated), color: "from-violet-400 to-purple-600" },
    { label: "Avg Duration",     value: stats.avg_duration,             color: "from-pink-400 to-rose-500" },
    { label: "Processing",       value: String(stats.processing),       color: "from-emerald-400 to-teal-500" },
  ];
>>>>>>> 054cd4ce443f75d56d0d2d1ccb465dd658450b51

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
<<<<<<< HEAD
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
=======
    <div className="min-h-screen bg-[#050505] text-white flex">
      <Sidebar activeSection={activeSection} scrollTo={scrollTo} />

      <div className="flex-1 ml-60 overflow-y-auto">

        {/* Hero Stats Bar */}
        <div className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5 px-8 py-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="text-xs font-medium text-white/50 uppercase tracking-widest">Live</span>
            </div>
            <div className="flex items-center gap-6">
              {statCards.map((s) => (
                <div key={s.label} className="text-center">
                  <div className={`text-lg font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent tabular-nums`}>
                    {s.value}
                  </div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-8 py-12 space-y-32 max-w-6xl mx-auto">

          {/* ── LIVE SESSION ──────────────────────────── */}
          <section id="live" className="scroll-mt-20">
            <SectionLabel color="text-cyan-400" glyph="01">Live Session</SectionLabel>
            <div className="mt-6 p-[1px] rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 shadow-[0_0_60px_rgba(0,200,255,0.2)]">
              <div className="bg-[#070b12] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-3 border-b border-cyan-500/10 bg-cyan-500/5">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">STREAM ACTIVE</span>
                  <div className="ml-auto flex gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] border border-cyan-500/20">LiveKit</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] border border-blue-500/20">AI Audio</span>
                  </div>
                </div>
                <LiveSession />
              </div>
            </div>
          </section>

          {/* ── ANALYSIS & FLOW ───────────────────────── */}
          <section id="flow" className="scroll-mt-20">
            <SectionLabel color="text-violet-400" glyph="02">Analysis & Flow</SectionLabel>
            <div className="mt-6 p-[1px] rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 shadow-[0_0_60px_rgba(139,92,246,0.25)]">
              <div className="bg-[#0c0a14] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-3 border-b border-violet-500/10 bg-violet-500/5">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse shadow-[0_0_10px_#a78bfa]" />
                  <span className="text-xs font-mono text-violet-400 uppercase tracking-widest">NODE EDITOR</span>
                  <div className="ml-auto flex gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 text-[10px] border border-violet-500/20">React Flow</span>
                    <span className="px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-400 text-[10px] border border-fuchsia-500/20">Editable</span>
                  </div>
                </div>
                <VisualEditor />
              </div>
            </div>
          </section>

          {/* ── 3D VISUALIZER ─────────────────────────── */}
          <section id="visualizer" className="scroll-mt-20">
            <SectionLabel color="text-pink-400" glyph="03">3D Visualizer</SectionLabel>
            <div className="mt-6 p-[1px] rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 shadow-[0_0_60px_rgba(236,72,153,0.25)]">
              <div className="bg-[#120a0e] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-3 border-b border-pink-500/10 bg-pink-500/5">
                  <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse shadow-[0_0_10px_#f472b6]" />
                  <span className="text-xs font-mono text-pink-400 uppercase tracking-widest">3D RENDERER</span>
                  <div className="ml-auto flex gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 text-[10px] border border-pink-500/20">Three.js</span>
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[10px] border border-orange-500/20">WebGL</span>
                  </div>
                </div>
                <Visualizer3D />
              </div>
            </div>
          </section>

          {/* ── RECORDINGS ────────────────────────────── */}
          <section id="recordings" className="scroll-mt-20">
            <SectionLabel color="text-emerald-400" glyph="04">Recordings</SectionLabel>
            <div className="mt-6 p-[1px] rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 shadow-[0_0_60px_rgba(16,185,129,0.2)]">
              <div className="bg-[#080f0d] rounded-2xl overflow-hidden">
                <RecordingsPanel />
              </div>
            </div>
          </section>

          {/* ── SETTINGS ──────────────────────────────── */}
          <section id="settings" className="scroll-mt-20 pb-32">
            <SectionLabel color="text-amber-400" glyph="05">Settings</SectionLabel>
            <div className="mt-6 p-[1px] rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 shadow-[0_0_60px_rgba(245,158,11,0.2)]">
              <div className="bg-[#110e07] rounded-2xl p-8 space-y-5">
                {[
                  { label: "Backend URL", value: BACKEND_URL },
                  { label: "LiveKit Room", value: "game-audio-room" },
                  { label: "Frame Sample Interval", value: "3s  (FRAME_SAMPLE_INTERVAL)" },
                  { label: "Overshoot Model", value: "Qwen/Qwen3-VL-8B-Instruct  (OVERSHOOT_MODEL)" },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-1">{label}</h3>
                    <p className="text-xs font-mono text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function SectionLabel({ color, glyph, children }: { color: string; glyph: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className={`text-[10px] font-mono ${color} opacity-60`}>{glyph}</span>
      <div className={`h-px flex-1 bg-gradient-to-r ${color.replace("text-", "from-").replace("-400", "-500/30")} to-transparent`} />
      <h2 className={`text-xl font-bold tracking-tight ${color}`}>{children}</h2>
      <div className={`h-px flex-1 bg-gradient-to-l ${color.replace("text-", "from-").replace("-400", "-500/30")} to-transparent`} />
    </div>
>>>>>>> 054cd4ce443f75d56d0d2d1ccb465dd658450b51
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
