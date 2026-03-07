"use client";

import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/Dashboard/Sidebar";
import { RecordingsPanel } from "@/components/Dashboard/RecordingsPanel";
import VisualEditor from "@/components/Dashboard/VisualEditor";
import Visualizer3D from "@/components/Dashboard/Visualizer3D";
import { LiveSession } from "@/components/Dashboard/LiveSession";

const sections = ["live", "flow", "visualizer", "recordings", "settings"];

export default function Home() {
  const [activeSection, setActiveSection] = useState("live");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const stats = [
    { label: "Sessions Today", value: "12", color: "from-cyan-400 to-blue-500", glow: "shadow-cyan-500/30" },
    { label: "Tracks Generated", value: "47", color: "from-violet-400 to-purple-600", glow: "shadow-purple-500/30" },
    { label: "Avg Duration", value: "8:42", color: "from-pink-400 to-rose-500", glow: "shadow-pink-500/30" },
    { label: "Processing", value: "2", color: "from-emerald-400 to-teal-500", glow: "shadow-emerald-500/30" },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      <Sidebar activeSection={activeSection} scrollTo={scrollTo} />

      <div className="flex-1 ml-60 overflow-y-auto">

        {/* Hero Stats Bar */}
        <div className="sticky top-0 z-20 bg-[#050505]/90 backdrop-blur-xl border-b border-white/5 px-8 py-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="text-xs font-medium text-white/50 uppercase tracking-widest">Live</span>
            </div>
            <div className="flex items-center gap-6">
              {stats.map((s) => (
                <div key={s.label} className="text-center">
                  <div className={`text-lg font-bold bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>
                    {s.value}
                  </div>
                  <div className="text-[10px] text-white/30 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-8 py-12 space-y-32 max-w-6xl mx-auto">

          {/* ── LIVE SESSION ──────────────────────────── */}
          <section id="live" className="scroll-mt-20">
            <SectionLabel color="text-cyan-400" glyph="01">Live Session</SectionLabel>
            <div className="mt-6 p-[1px] rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 shadow-[0_0_60px_rgba(0,200,255,0.2)]">
              <div className="bg-[#070b12] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-3 border-b border-cyan-500/10 bg-cyan-500/5">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#22d3ee]" />
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">STREAM ACTIVE</span>
                  <div className="ml-auto flex gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] border border-cyan-500/20">LiveKit</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] border border-blue-500/20">AI Audio</span>
                  </div>
                </div>
                <LiveSession />
              </div>
            </div>
          </section>

          {/* ── ANALYSIS & FLOW ───────────────────────── */}
          <section id="flow" className="scroll-mt-20">
            <SectionLabel color="text-violet-400" glyph="02">Analysis & Flow</SectionLabel>
            <div className="mt-6 p-[1px] rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 shadow-[0_0_60px_rgba(139,92,246,0.25)]">
              <div className="bg-[#0c0a14] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-3 border-b border-violet-500/10 bg-violet-500/5">
                  <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse shadow-[0_0_10px_#a78bfa]" />
                  <span className="text-xs font-mono text-violet-400 uppercase tracking-widest">NODE EDITOR</span>
                  <div className="ml-auto flex gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 text-[10px] border border-violet-500/20">React Flow</span>
                    <span className="px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-400 text-[10px] border border-fuchsia-500/20">Editable</span>
                  </div>
                </div>
                <VisualEditor />
              </div>
            </div>
          </section>

          {/* ── 3D VISUALIZER ─────────────────────────── */}
          <section id="visualizer" className="scroll-mt-20">
            <SectionLabel color="text-pink-400" glyph="03">3D Visualizer</SectionLabel>
            <div className="mt-6 p-[1px] rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 shadow-[0_0_60px_rgba(236,72,153,0.25)]">
              <div className="bg-[#120a0e] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-3 border-b border-pink-500/10 bg-pink-500/5">
                  <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse shadow-[0_0_10px_#f472b6]" />
                  <span className="text-xs font-mono text-pink-400 uppercase tracking-widest">3D RENDERER</span>
                  <div className="ml-auto flex gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 text-[10px] border border-pink-500/20">Three.js</span>
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[10px] border border-orange-500/20">WebGL</span>
                  </div>
                </div>
                <Visualizer3D />
              </div>
            </div>
          </section>

          {/* ── RECORDINGS ────────────────────────────── */}
          <section id="recordings" className="scroll-mt-20">
            <SectionLabel color="text-emerald-400" glyph="04">Recordings</SectionLabel>
            <div className="mt-6 p-[1px] rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 shadow-[0_0_60px_rgba(16,185,129,0.2)]">
              <div className="bg-[#080f0d] rounded-2xl overflow-hidden">
                <RecordingsPanel />
              </div>
            </div>
          </section>

          {/* ── SETTINGS ──────────────────────────────── */}
          <section id="settings" className="scroll-mt-20 pb-32">
            <SectionLabel color="text-amber-400" glyph="05">Settings</SectionLabel>
            <div className="mt-6 p-[1px] rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 shadow-[0_0_60px_rgba(245,158,11,0.2)]">
              <div className="bg-[#110e07] rounded-2xl p-8">
                <h3 className="text-base font-semibold text-white mb-2">Configuration</h3>
                <p className="text-sm text-white/30">Settings configuration not implemented yet.</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

function SectionLabel({ color, glyph, children }: { color: string; glyph: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className={`text-[10px] font-mono ${color} opacity-60`}>{glyph}</span>
      <div className={`h-px flex-1 bg-gradient-to-r ${color.replace("text-", "from-").replace("-400", "-500/30")} to-transparent`} />
      <h2 className={`text-xl font-bold tracking-tight ${color}`}>{children}</h2>
      <div className={`h-px flex-1 bg-gradient-to-l ${color.replace("text-", "from-").replace("-400", "-500/30")} to-transparent`} />
    </div>
  );
}
