"use client";

import { useRemoteParticipants, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
<<<<<<< HEAD
import { useEffect } from "react";

interface AudioPlayerProps {
  onPlaybackChange?: (isPlaying: boolean, agentConnected: boolean) => void;
}

export default function AudioPlayer({ onPlaybackChange }: AudioPlayerProps) {
  const participants = useRemoteParticipants();

=======

export default function AudioPlayer() {
  const participants = useRemoteParticipants();
>>>>>>> 054cd4ce443f75d56d0d2d1ccb465dd658450b51
  const tracks = useTracks(
    [{ source: Track.Source.Microphone, withPlaceholder: false }],
    { onlySubscribed: true },
  );

  const agentConnected = participants.length > 0;
  const isPlaying = tracks.length > 0;

  useEffect(() => {
    onPlaybackChange?.(isPlaying, agentConnected);
  }, [isPlaying, agentConnected, onPlaybackChange]);

  return (
<<<<<<< HEAD
    <div className="flex flex-col items-center gap-3">
      <div
        className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
          isPlaying
            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
            : "border-slate-200 bg-white/70 text-slate-700"
        }`}
      >
        {isPlaying ? (
          <>
            <MusicIcon className="h-4 w-4 animate-pulse" />
            AI soundtrack currently playing
          </>
        ) : agentConnected ? (
          <>
            <WaveIcon className="h-4 w-4" />
            Agent connected, waiting for screen context
          </>
        ) : (
          <>
            <WaveIcon className="h-4 w-4 opacity-60" />
            Waiting for agent stream
          </>
        )}
      </div>
    </div>
  );
}

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
      />
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
=======
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
        isPlaying ? "bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]"
        : agentConnected ? "bg-amber-400"
        : "bg-white/15"
      }`} />
      <span className={`text-xs ${
        isPlaying ? "text-emerald-400"
        : agentConnected ? "text-amber-400"
        : "text-white/25"
      }`}>
        {isPlaying
          ? "Lyria music streaming"
          : agentConnected
          ? "Agent connected — share screen to start"
          : "Waiting for agent to join..."
        }
      </span>
      {isPlaying && (
        <span className="ml-auto flex gap-0.5">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="w-0.5 bg-emerald-400 rounded-full animate-pulse"
              style={{
                height: `${8 + (i % 3) * 4}px`,
                animationDelay: `${i * 0.15}s`,
                animationDuration: "0.8s",
              }}
            />
          ))}
        </span>
      )}
    </div>
  );
}
>>>>>>> 054cd4ce443f75d56d0d2d1ccb465dd658450b51
