import React from 'react';
import { Play, Calendar, Clock, Download, MoreHorizontal } from 'lucide-react';

interface Recording {
  id: string;
  date: string;
  duration: string;
  status: 'Complete' | 'Processing' | 'Failed';
  tags: string[];
}

export function RecordingsPanel() {
  const recordings: Recording[] = [
    { id: 'REC-001', date: 'Mar 7, 2026', duration: '12:45', status: 'Complete', tags: ['Gameplay', 'Boss Fight'] },
    { id: 'REC-002', date: 'Mar 6, 2026', duration: '08:30', status: 'Processing', tags: ['Menu Music', 'Ambient'] },
    { id: 'REC-003', date: 'Mar 5, 2026', duration: '05:15', status: 'Complete', tags: ['Victory Theme'] },
  ];

  const statusConfig = {
    Complete:   { dot: 'bg-emerald-400 shadow-[0_0_6px_#34d399]', text: 'text-emerald-400' },
    Processing: { dot: 'bg-amber-400 shadow-[0_0_6px_#fbbf24] animate-pulse', text: 'text-amber-400' },
    Failed:     { dot: 'bg-red-400 shadow-[0_0_6px_#f87171]', text: 'text-red-400' },
  };

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-emerald-500/10 bg-emerald-500/5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Recent Recordings</h2>
        <button className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
          View All →
        </button>
      </div>

      {/* Rows */}
      <div className="divide-y divide-emerald-500/5">
        {recordings.map((rec) => (
          <div
            key={rec.id}
            className="group px-6 py-4 hover:bg-emerald-500/5 transition-colors flex items-center gap-4"
          >
            {/* Play button */}
            <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/20 hover:border-emerald-400/50 transition-all text-emerald-400 hover:shadow-[0_0_12px_rgba(52,211,153,0.3)] flex-shrink-0">
              <Play size={13} fill="currentColor" />
            </button>

            {/* Info */}
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
                <div className="flex gap-1">
                  {rec.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400/70 text-[10px]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-500/10 text-white/30 hover:text-emerald-400 transition-colors">
                <Download size={14} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-500/10 text-white/30 hover:text-emerald-400 transition-colors">
                <MoreHorizontal size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
