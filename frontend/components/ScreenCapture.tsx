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
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={isSharing ? stopShare : startShare}
        className={`px-6 py-3 rounded-xl font-semibold text-white transition-colors ${
          isSharing
            ? "bg-red-600 hover:bg-red-700"
            : "bg-indigo-600 hover:bg-indigo-700"
        }`}
      >
        {isSharing ? "Stop Screen Share" : "Share Screen"}
      </button>

      {isSharing && (
        <span className="text-sm text-green-400 flex items-center gap-1">
          <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Screen sharing — agent is watching
        </span>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
