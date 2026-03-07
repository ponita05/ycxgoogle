"use client";

import { VideoTrack, useLocalParticipant, type TrackReference } from "@livekit/components-react";
import { createLocalScreenTracks, LocalTrack, Track } from "livekit-client";
import { useState } from "react";

interface ScreenCaptureProps {
  onShareStart?: () => void;
  onShareStop?: () => void;
  /** TrackReference from useTracks() — passed in by the parent to avoid hook duplication */
  localScreenTrack?: TrackReference;
  /** Called with the raw MediaStream when screen sharing starts (for recording) */
  onStreamReady?: (stream: MediaStream) => void;
}

export default function ScreenCapture({ onShareStart, onShareStop, localScreenTrack, onStreamReady }: ScreenCaptureProps) {
  const { localParticipant } = useLocalParticipant();
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startShare() {
    setError(null);
    try {
      const tracks = await createLocalScreenTracks({ audio: false });
      const mediaTracks: MediaStreamTrack[] = [];
      for (const track of tracks) {
        await localParticipant.publishTrack(track);
        if (track.kind === Track.Kind.Video) {
          track.on("ended", stopShare);
          mediaTracks.push(track.mediaStreamTrack);
        }
      }
      setIsSharing(true);
      onShareStart?.();
      if (mediaTracks.length > 0) {
        onStreamReady?.(new MediaStream(mediaTracks));
      }
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
    <div className="flex flex-col gap-3 w-full">
      {/* Live preview — fills the left panel when sharing */}
      <div className={`relative bg-black rounded-xl overflow-hidden border transition-all ${
        isSharing ? "aspect-video border-cyan-500/20" : "h-32 border-white/5"
      }`}>
        {localScreenTrack ? (
          <VideoTrack
            trackRef={localScreenTrack}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <div className="text-3xl opacity-20">🖥</div>
            <p className="text-xs text-white/20">Screen preview will appear here</p>
          </div>
        )}

        {/* LIVE badge */}
        {isSharing && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-red-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[9px] font-mono text-white/70 uppercase tracking-widest">LIVE</span>
          </div>
        )}

        {/* Frame indicator when sharing */}
        {isSharing && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-cyan-500/20">
            <span className="text-[9px] font-mono text-cyan-400/70">→ Overshoot every 3s</span>
          </div>
        )}
      </div>

      {/* Toggle button */}
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

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
