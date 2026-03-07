"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { createLocalScreenTracks, LocalTrack, Track } from "livekit-client";
import { useState } from "react";

interface ScreenCaptureProps {
  onShareStart?: () => void;
  onShareStop?: () => void;
}

export default function ScreenCapture({ onShareStart, onShareStop }: ScreenCaptureProps) {
  const { localParticipant } = useLocalParticipant();
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startShare() {
    setError(null);
    try {
      const tracks = await createLocalScreenTracks({ audio: false });
      for (const track of tracks) {
        await localParticipant.publishTrack(track);
        if (track.kind === Track.Kind.Video) {
          track.on("ended", stopShare);
        }
      }
      setIsSharing(true);
      onShareStart?.();
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "NotAllowedError") {
        setError(e.message);
      }
    }
  }

  async function stopShare() {
    const publications = localParticipant.getTrackPublications();
    for (const pub of publications.values()) {
      if (pub.source === Track.Source.ScreenShare) {
        await localParticipant.unpublishTrack(pub.track as LocalTrack);
      }
    }
    setIsSharing(false);
    onShareStop?.();
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <button
        onClick={isSharing ? stopShare : startShare}
        className={`w-full px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
          isSharing
            ? "border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-400/60"
            : "border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-400/60"
        }`}
      >
        {isSharing ? "⏹ Stop Screen Share" : "🖥 Share Screen"}
      </button>

      {isSharing && (
        <span className="flex items-center gap-1.5 text-xs text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_#22d3ee]" />
          Screen sharing — agent is watching
        </span>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
