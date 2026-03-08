"use client";

import { LiveKitRoom, RoomAudioRenderer, useTracks, useLocalParticipant } from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { useState, useRef, useEffect, useCallback } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import ScreenCapture from "@/components/ScreenCapture";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const ROOM_NAME = "game-audio-room";

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

async function fetchToken(identity: string) {
  const res = await fetch(`${BACKEND_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room: ROOM_NAME, identity }),
  });
  if (!res.ok) throw new Error("Failed to fetch token");
  return res.json() as Promise<{ token: string; url: string }>;
}

// ─── Intensity scoring — pick the most cinematic/intense Overshoot description ──
function scoreIntensity(desc: string): number {
  const d = desc.toLowerCase();
  let score = 0;
  const high = ["combat", "battle", "boss", "explosion", "chase", "attack", "enemy",
    "intense", "urgent", "critical", "dread", "danger", "fight", "war", "horror",
    "escape", "ambush", "siege", "final", "death", "fire", "blood", "trap"];
  const med = ["exploration", "dungeon", "stealth", "wonder", "excitement",
    "mysterious", "dark", "cave", "ruins", "forest", "storm"];
  const low = ["cutscene", "dialogue", "inventory", "victory", "sorrow",
    "peaceful", "menu", "loading", "safe", "calm"];
  high.forEach(k => { if (d.includes(k)) score += 3; });
  med.forEach(k => { if (d.includes(k)) score += 1; });
  low.forEach(k => { if (d.includes(k)) score -= 1; });
  return score;
}

// ─── Nano Banana fallback: capture a video frame via canvas ──────────────────
async function captureThumbFromVideo(videoBlob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(videoBlob);
    video.src = url;
    video.muted = true;

    const drawFrame = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(video, 0, 0, 640, 360);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };

    video.addEventListener("loadeddata", () => {
      video.currentTime = Math.min(1.5, (video.duration * 0.15) || 0);
    });
    video.addEventListener("seeked", drawFrame, { once: true });
    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, 640, 360);
        ctx.fillStyle = "#ffffff22";
        ctx.font = "20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("Game Session", 320, 180);
      }
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    });
    video.load();
  });
}

// ─── Nano Banana: derive headline from the most intense description ───────────
function deriveHeadline(description: string | null): string {
  if (!description) return "Game Session Recording";
  const first = description.split(/[.!?]/)[0].trim();
  const clean = first.replace(/^(the scene shows|the player is|it appears|we see)\s*/i, "");
  const capped = clean.charAt(0).toUpperCase() + clean.slice(1);
  return capped.length > 80 ? capped.slice(0, 77) + "..." : capped || "Game Session Recording";
}

// ─── Pipeline stage card ─────────────────────────────────────────────────────
function PipelineStage({
  num, label, active, value, colorClass, borderClass, dotClass,
}: {
  num: number; label: string; active: boolean; value?: string | null;
  colorClass: string; borderClass: string; dotClass: string;
}) {
  return (
    <div className={`rounded-xl border p-3 transition-all ${active ? borderClass + " bg-white/[0.03]" : "border-white/5 bg-transparent opacity-50"}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? dotClass : "bg-white/15"}`} />
        <span className={`text-[10px] font-mono uppercase tracking-widest ${active ? colorClass : "text-white/30"}`}>
          {String(num).padStart(2, "0")} — {label}
        </span>
      </div>
      {value && (
        <p className="text-xs text-white/50 leading-relaxed line-clamp-2 pl-3.5">
          {value}
        </p>
      )}
    </div>
  );
}

// ─── Session ended: video + AI thumbnail + playback ──────────────────────────
function SessionEndedView({
  videoUrl, thumbDataUrl, headline, duration, onNewSession,
}: {
  videoUrl: string;
  thumbDataUrl: string;
  headline: string;
  duration: string;
  onNewSession: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }

  return (
    <div className="w-full p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          <span className="text-xs font-mono text-emerald-400">Session Complete</span>
          <span className="text-[10px] text-white/30 font-mono">{duration}</span>
        </div>
        <button
          onClick={onNewSession}
          className="px-4 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400/50 transition-colors text-xs font-medium"
        >
          + New Session
        </button>
      </div>

      <div
        className="relative rounded-xl overflow-hidden bg-black border border-white/10 group cursor-pointer"
        onClick={togglePlay}
      >
        {/* AI-generated thumbnail shown before play */}
        {!playing && (
          <img
            src={thumbDataUrl}
            alt="Session thumbnail"
            className="w-full aspect-video object-cover"
          />
        )}
        <video
          ref={videoRef}
          src={videoUrl}
          className={`w-full aspect-video object-contain ${playing ? "block" : "hidden"}`}
          onEnded={() => setPlaying(false)}
          onPause={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
        />
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"}`}>
          <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-xl">
            {playing ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </div>
        </div>
        {/* AI thumbnail badge */}
        {!playing && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-violet-500/20">
            <span className="w-1 h-1 rounded-full bg-violet-400" />
            <span className="text-[9px] font-mono text-violet-300/80">AI thumbnail · most intense moment</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-white leading-snug">{headline}</h3>
        <p className="text-[11px] text-white/30 font-mono">
          Duration: {duration} · Stored locally · video/webm · audio + video
        </p>
      </div>
    </div>
  );
}

// ─── Connected view ──────────────────────────────────────────────────────────
function ConnectedView({
  onDisconnect, elapsed, onStreamReady, onDescriptionUpdate, onAudioTrackReady,
}: {
  onDisconnect: () => void;
  elapsed: number;
  onStreamReady: (stream: MediaStream) => void;
  onDescriptionUpdate: (desc: string | null) => void;
  onAudioTrackReady: (track: MediaStreamTrack) => void;
}) {
  const [agentState, setAgentState] = useState<{
    description: string | null;
    prompt: string | null;
    is_playing: boolean;
    last_updated: string | null;
  } | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const { localParticipant, isScreenShareEnabled } = useLocalParticipant();
  const allTracks = useTracks([Track.Source.ScreenShare]);
  const localScreenTrack = allTracks.find(t => t.participant === localParticipant);

  // Watch for the Lyria audio track
  const audioTracks = useTracks(
    [{ source: Track.Source.Microphone, withPlaceholder: false }],
    { onlySubscribed: true },
  );
  const agentAudioMSTrack = audioTracks[0]?.publication.track?.mediaStreamTrack ?? null;
  const agentAudioTrackId = agentAudioMSTrack?.id;

  useEffect(() => {
    if (agentAudioMSTrack) onAudioTrackReady(agentAudioMSTrack);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentAudioTrackId]);

  useEffect(() => {
    setIsSharing(isScreenShareEnabled);
  }, [isScreenShareEnabled]);

  const pollState = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/agent/state?room=${ROOM_NAME}`);
      if (res.ok) {
        const data = await res.json();
        setAgentState(data);
        onDescriptionUpdate(data.description ?? null);
      }
    } catch {}
  }, [onDescriptionUpdate]);

  useEffect(() => {
    pollState();
    const id = setInterval(pollState, 2000);
    return () => clearInterval(id);
  }, [pollState]);

  const cleanPrompt = agentState?.prompt
    ? agentState.prompt
        .replace("video game soundtrack — ", "")
        .replace(" — no vocals, cinematic orchestral or electronic, adaptive game music", "")
    : null;

  // Condense the description for the top-right overlay badge
  const sceneLabel = agentState?.description
    ? agentState.description.split(/[,.|]/)[0].trim().slice(0, 52)
    : null;

  const stages = [
    {
      num: 1, label: "Screen Capture",
      active: isSharing,
      value: isSharing ? "Streaming frames every 3s to Overshoot" : "Press Share Screen to begin",
      colorClass: "text-cyan-400", borderClass: "border-cyan-500/25",
      dotClass: "bg-cyan-400 shadow-[0_0_6px_#22d3ee] animate-pulse",
    },
    {
      num: 2, label: "Overshoot Vision AI",
      active: !!agentState?.description,
      value: agentState?.description ?? (isSharing ? "Waiting for first frame..." : null),
      colorClass: "text-violet-400", borderClass: "border-violet-500/25",
      dotClass: "bg-violet-400 shadow-[0_0_6px_#a78bfa] animate-pulse",
    },
    {
      num: 3, label: "Lyria Music Gen",
      active: !!cleanPrompt,
      value: cleanPrompt,
      colorClass: "text-pink-400", borderClass: "border-pink-500/25",
      dotClass: "bg-pink-400 shadow-[0_0_6px_#f472b6] animate-pulse",
    },
    {
      num: 4, label: "Audio Output",
      active: agentState?.is_playing ?? false,
      value: null,
      colorClass: "text-emerald-400", borderClass: "border-emerald-500/25",
      dotClass: "bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse",
    },
  ] as const;

  return (
    <div className="w-full p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#22d3ee]" />
          <span className="text-xs font-mono text-cyan-400 tabular-nums">{formatDuration(elapsed)}</span>
          <span className="text-[10px] text-white/30 uppercase tracking-wider">live</span>
        </div>

        {/* ── Overshoot live detection badge (top-right) ── */}
        <div className={`flex-1 flex justify-end transition-all duration-500 ${sceneLabel ? "opacity-100" : "opacity-0"}`}>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 max-w-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_5px_#a78bfa] flex-shrink-0" />
            <span className="text-[10px] font-mono text-violet-300 truncate" title={agentState?.description ?? ""}>
              {sceneLabel ?? ""}
            </span>
          </div>
        </div>

        <button
          onClick={onDisconnect}
          className="px-4 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-400/50 transition-colors text-xs font-medium flex-shrink-0"
        >
          End Session
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3">
          <ScreenCapture
            onShareStart={() => setIsSharing(true)}
            onShareStop={() => setIsSharing(false)}
            localScreenTrack={localScreenTrack}
            onStreamReady={onStreamReady}
          />
        </div>
        <div className="col-span-2 space-y-2">
          {stages.slice(0, 3).map((s) => (
            <PipelineStage key={s.num} {...s} />
          ))}
          <div className={`rounded-xl border p-3 transition-all ${stages[3].active ? "border-emerald-500/25 bg-white/[0.03]" : "border-white/5 opacity-50"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stages[3].active ? stages[3].dotClass : "bg-white/15"}`} />
              <span className={`text-[10px] font-mono uppercase tracking-widest ${stages[3].active ? stages[3].colorClass : "text-white/30"}`}>
                04 — Audio Output
              </span>
            </div>
            <div className="pl-3.5">
              <AudioPlayer />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root LiveSession component ──────────────────────────────────────────────
export function LiveSession() {
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("Processing session recording...");
  const [sessionEndedData, setSessionEndedData] = useState<{
    videoUrl: string;
    thumbDataUrl: string;
    headline: string;
    duration: string;
  } | null>(null);

  const sessionStartRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  // Track the most intense Overshoot description across the session
  const mostIntenseRef = useRef<{ description: string; score: number } | null>(null);
  // Audio stitching
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function handleStreamReady(stream: MediaStream) {
    recordedChunksRef.current = [];
    mostIntenseRef.current = null;

    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    audioCtxRef.current = ctx;
    audioDestRef.current = dest;

    const combined = new MediaStream([
      ...stream.getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";

    const mr = new MediaRecorder(combined, { mimeType });
    mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
    mr.start(1000);
    mediaRecorderRef.current = mr;
  }

  function handleAudioTrackReady(track: MediaStreamTrack) {
    const ctx = audioCtxRef.current;
    const dest = audioDestRef.current;
    if (!ctx || !dest) return;
    audioSourceRef.current?.disconnect();
    const src = ctx.createMediaStreamSource(new MediaStream([track]));
    src.connect(dest);
    audioSourceRef.current = src;
  }

  function handleDescriptionUpdate(desc: string | null) {
    if (!desc) return;
    const score = scoreIntensity(desc);
    const current = mostIntenseRef.current;
    if (!current || score > current.score) {
      mostIntenseRef.current = { description: desc, score };
    }
  }

  async function stopAndGetBlob(): Promise<Blob | null> {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") return null;
    return new Promise((resolve) => {
      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        resolve(blob.size > 0 ? blob : null);
      };
      mr.stop();
    });
  }

  function cleanupAudio() {
    audioSourceRef.current?.disconnect();
    audioSourceRef.current = null;
    audioDestRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
  }

  async function connect() {
    setConnecting(true);
    setError(null);
    setSessionEndedData(null);
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
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const secs = sessionStartRef.current !== null
      ? Math.floor((Date.now() - sessionStartRef.current) / 1000)
      : 0;
    sessionStartRef.current = null;

    setToken(null);
    setLivekitUrl(null);
    setElapsed(0);
    setProcessing(true);
    setProcessingLabel("Stopping recording...");

    try {
      const blob = await stopAndGetBlob();
      cleanupAudio();

      const intenseDesc = mostIntenseRef.current?.description ?? null;
      const headline = deriveHeadline(intenseDesc);
      const duration = formatDuration(secs);

      let recId: string | null = null;
      try {
        const recRes = await fetch(`${BACKEND_URL}/recordings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ duration, tags: ["Live Session"], headline }),
        });
        if (recRes.ok) recId = (await recRes.json()).id;
      } catch {}

      if (blob && recId) {
        const videoUrl = URL.createObjectURL(blob);

        // ── Nano banana: AI-generate thumbnail from the most intense moment ──
        let thumbDataUrl: string | null = null;
        if (intenseDesc) {
          setProcessingLabel("Generating AI thumbnail from most intense moment...");
          try {
            const thumbRes = await fetch(`${BACKEND_URL}/recordings/${recId}/generate-thumbnail`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ intense_description: intenseDesc, headline }),
            });
            if (thumbRes.ok) {
              const data = await thumbRes.json();
              thumbDataUrl = data.thumbnail_data_url;
            }
          } catch {}
        }

        // Fallback: canvas frame capture if AI thumbnail failed
        if (!thumbDataUrl) {
          setProcessingLabel("Capturing thumbnail...");
          thumbDataUrl = await captureThumbFromVideo(blob);
          // Upload fallback thumbnail as meta
          if (recId) {
            try {
              await fetch(`${BACKEND_URL}/recordings/${recId}/meta`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ thumbnail_b64: thumbDataUrl, headline }),
              });
            } catch {}
          }
        }

        setProcessingLabel("Uploading video...");
        try {
          await fetch(`${BACKEND_URL}/recordings/${recId}/video`, {
            method: "POST",
            headers: { "Content-Type": "video/webm" },
            body: blob,
          });
        } catch {}

        setSessionEndedData({ videoUrl, thumbDataUrl, headline, duration });
      } else {
        if (!recId) {
          try {
            await fetch(`${BACKEND_URL}/recordings`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ duration, tags: ["Live Session"], headline }),
            });
          } catch {}
        }
      }
    } finally {
      setProcessing(false);
    }
  }

  if (processing) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 min-h-[300px] text-center">
        <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
        <p className="text-sm text-white/40">{processingLabel}</p>
      </div>
    );
  }

  if (!token && sessionEndedData) {
    return (
      <SessionEndedView
        {...sessionEndedData}
        onNewSession={() => setSessionEndedData(null)}
      />
    );
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-12 min-h-[300px] text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_40px_rgba(0,200,255,0.4)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polygon points="10,8 16,12 10,16" />
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
          className="px-8 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(135deg,#06b6d4,#3b82f6)", boxShadow: "0 0 30px rgba(6,182,212,0.4)" }}
        >
          {connecting ? "Connecting..." : "Start Session"}
        </button>
        {error && (
          <p className="text-xs text-red-400 border border-red-500/20 bg-red-500/5 rounded-lg px-4 py-2">{error}</p>
        )}
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={livekitUrl!}
      connect={true}
      audio={false}
      video={false}
      onDisconnected={disconnect}
      className="w-full"
    >
      <RoomAudioRenderer />
      <ConnectedView
        onDisconnect={disconnect}
        elapsed={elapsed}
        onStreamReady={handleStreamReady}
        onDescriptionUpdate={handleDescriptionUpdate}
        onAudioTrackReady={handleAudioTrackReady}
      />
    </LiveKitRoom>
  );
}
