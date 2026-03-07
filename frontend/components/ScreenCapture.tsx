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
        className={`rounded-xl px-6 py-3 font-semibold text-white shadow-md ${
          isSharing
            ? "bg-rose-600 hover:bg-rose-700"
            : "bg-sky-600 hover:bg-sky-700"
        }`}
      >
        {isSharing ? "Stop Screen Share" : "Share Screen"}
      </button>

      {isSharing && (
        <span className="flex items-center gap-1 text-sm text-emerald-700">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
          Screen sharing — agent is watching
        </span>
      )}

      {error && <p className="text-sm text-rose-700">{error}</p>}
    </div>
  );
}
