"use client";

import { useRemoteParticipants, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

export default function AudioPlayer() {
  const participants = useRemoteParticipants();
  const tracks = useTracks(
    [{ source: Track.Source.Microphone, withPlaceholder: false }],
    { onlySubscribed: true },
  );

  const agentConnected = participants.length > 0;
  const isPlaying = tracks.length > 0;

  return (
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
