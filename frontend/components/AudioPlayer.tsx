"use client";

import { useRemoteParticipants, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useRef } from "react";

export default function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const participants = useRemoteParticipants();

  // Subscribe to all remote audio tracks (agent music output)
  const tracks = useTracks(
    [{ source: Track.Source.Microphone, withPlaceholder: false }],
    { onlySubscribed: true }
  );

  useEffect(() => {
    // Auto-play is handled by @livekit/components-react AudioRenderer internally.
    // This component is a visual indicator only.
  }, [tracks]);

  const agentConnected = participants.length > 0;
  const isPlaying = tracks.length > 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
          isPlaying
            ? "bg-purple-900/60 text-purple-300 border border-purple-600"
            : "bg-zinc-800 text-zinc-400 border border-zinc-700"
        }`}
      >
        {isPlaying ? (
          <>
            <MusicIcon className="w-4 h-4 animate-pulse" />
            Lyria music playing
          </>
        ) : agentConnected ? (
          <>
            <WaveIcon className="w-4 h-4" />
            Agent connected — share screen to start
          </>
        ) : (
          <>
            <WaveIcon className="w-4 h-4 opacity-50" />
            Waiting for agent...
          </>
        )}
      </div>
    </div>
  );
}

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  );
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V5m-4 7h.01M17 19V5m-4 7h.01M5 12h.01M19 12h.01" />
    </svg>
  );
}
