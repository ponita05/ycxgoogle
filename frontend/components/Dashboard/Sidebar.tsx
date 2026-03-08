import React from 'react';
import { Radio, Mic, Activity, Cpu, Settings } from 'lucide-react';
import clsx from 'clsx';

interface SidebarProps {
  activeSection: string;
  scrollTo: (id: string) => void;
}

const items = [
  { id: 'live',        label: 'Live Session',   icon: Radio,    color: 'text-cyan-400',    glow: 'shadow-cyan-500/50',    activeBg: 'bg-cyan-500/10',    activeBorder: 'border-cyan-500/50' },
  { id: 'flow',        label: 'Analysis & Flow', icon: Activity, color: 'text-violet-400',  glow: 'shadow-violet-500/50',  activeBg: 'bg-violet-500/10',  activeBorder: 'border-violet-500/50' },
  { id: 'visualizer',  label: '3D Visualizer',   icon: Cpu,      color: 'text-pink-400',    glow: 'shadow-pink-500/50',    activeBg: 'bg-pink-500/10',    activeBorder: 'border-pink-500/50' },
  { id: 'recordings',  label: 'Recordings',      icon: Mic,      color: 'text-emerald-400', glow: 'shadow-emerald-500/50', activeBg: 'bg-emerald-500/10', activeBorder: 'border-emerald-500/50' },
  { id: 'settings',    label: 'Settings',        icon: Settings, color: 'text-amber-400',   glow: 'shadow-amber-500/50',   activeBg: 'bg-amber-500/10',   activeBorder: 'border-amber-500/50' },
];

export function Sidebar({ activeSection, scrollTo }: SidebarProps) {
  return (
    <aside className="w-60 bg-[#050505] border-r border-white/5 h-screen flex flex-col fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
            <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
              <path d="M6 0L12 12H0L6 0Z" fill="white" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-none">Game Audio</div>
            <div className="text-[10px] text-white/30 font-mono mt-0.5">AI Studio</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="text-[10px] font-medium text-white/20 uppercase tracking-widest px-3 pt-2 pb-1">Navigation</p>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border text-left",
                isActive
                  ? `${item.activeBg} ${item.color} ${item.activeBorder}`
                  : "border-transparent text-white/40 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <Icon
                size={15}
                className={clsx(
                  "flex-shrink-0 transition-all",
                  isActive && `drop-shadow-[0_0_6px_currentColor]`
                )}
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <span className={clsx("ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0", item.color.replace("text-", "bg-"))} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
          <span className="text-[11px] text-white/30">All systems operational</span>
        </div>
        <div className="text-[10px] text-white/15 font-mono">v0.1.0-alpha</div>
      </div>
    </aside>
  );
}
