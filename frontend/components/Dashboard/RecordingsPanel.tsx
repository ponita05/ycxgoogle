"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Play, Calendar, Clock, Download, Trash2, RefreshCw } from 'lucide-react';

interface Recording {
  id: string;
  date: string;
  duration: string;
  status: 'Complete' | 'Processing' | 'Failed';
  tags: string[];
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const statusConfig = {
  Complete:   { dot: 'bg-emerald-400 shadow-[0_0_6px_#34d399]', text: 'text-emerald-400' },
  Processing: { dot: 'bg-amber-400 shadow-[0_0_6px_#fbbf24] animate-pulse', text: 'text-amber-400' },
  Failed:     { dot: 'bg-red-400 shadow-[0_0_6px_#f87171]', text: 'text-red-400' },
};

export function RecordingsPanel() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchRecordings = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/recordings`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data: Recording[] = await res.json();
      setRecordings(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load recordings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecordings();
    const interval = setInterval(fetchRecordings, 10_000);
    return () => clearInterval(interval);
  }, [fetchRecordings]);

  async function deleteRecording(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`${BACKEND_URL}/recordings/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Delete failed");
      setRecordings((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-emerald-500/10 bg-emerald-500/5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Recent Recordings</h2>
        <button
          onClick={fetchRecordings}
          className="text-[#888] hover:text-emerald-400 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 py-3 bg-red-500/5 border-b border-red-500/10 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="px-6 py-8 text-center text-sm text-white/30 animate-pulse">
          Loading recordings...
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && recordings.length === 0 && (
        <div className="px-6 py-10 text-center">
          <div className="text-2xl mb-2">🎙️</div>
          <p className="text-sm text-white/30">No recordings yet.</p>
          <p className="text-xs text-white/20 mt-1">Start a live session to generate one.</p>
        </div>
      )}

      {/* Rows */}
      <div className="divide-y divide-emerald-500/5">
        {recordings.map((rec) => (
          <div
            key={rec.id}
            className="group px-6 py-4 hover:bg-emerald-500/5 transition-colors flex items-center gap-4"
          >
            <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/20 hover:border-emerald-400/50 transition-all text-emerald-400 hover:shadow-[0_0_12px_rgba(52,211,153,0.3)] flex-shrink-0">
              <Play size={13} fill="currentColor" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="text-sm font-mono font-medium text-white">{rec.id}</span>
                <span className="flex items-center gap-1.5 text-[11px]">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusConfig[rec.status].dot}`} />
                  <span className={statusConfig[rec.status].text}>{rec.status}</span>
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-white/30">
                <span className="flex items-center gap-1"><Calendar size={10} /> {rec.date}</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {rec.duration}</span>
                <div className="flex gap-1 flex-wrap">
                  {rec.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/70 text-[10px]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-500/10 text-white/30 hover:text-emerald-400 transition-colors">
                <Download size={14} />
              </button>
              <button
                onClick={() => deleteRecording(rec.id)}
                disabled={deletingId === rec.id}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
