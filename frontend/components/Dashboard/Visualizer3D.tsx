"use client";

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Line, Text } from '@react-three/drei';
import * as THREE from 'three';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const ROOM_NAME = "game-audio-room";

// ─── Mood detection ──────────────────────────────────────────────────────────
type Mood = 'COMBAT' | 'ACTION' | 'CALM' | 'NEUTRAL';

interface MoodConfig {
  label: string;
  speed: number;         // particle speed multiplier
  color: string;         // badge color (Tailwind)
  border: string;
  dot: string;
}

const MOOD_MAP: Record<Mood, MoodConfig> = {
  COMBAT:  { label: 'COMBAT',      speed: 3.5, color: 'text-red-400',     border: 'border-red-500/30',     dot: 'bg-red-400 shadow-[0_0_6px_#f87171]' },
  ACTION:  { label: 'ACTION',      speed: 2.0, color: 'text-amber-400',   border: 'border-amber-500/30',   dot: 'bg-amber-400 shadow-[0_0_6px_#fbbf24]' },
  CALM:    { label: 'CALM',        speed: 0.4, color: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400 shadow-[0_0_6px_#34d399]' },
  NEUTRAL: { label: 'PROCESSING',  speed: 1.2, color: 'text-cyan-400',    border: 'border-cyan-500/30',    dot: 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]' },
};

function detectMood(description: string | null): Mood {
  if (!description) return 'NEUTRAL';
  const t = description.toLowerCase();
  if (/combat|boss|fight|battle|attack|danger|chase|shooting|explosion|monster|dragon|enemy|sword|fearful|horror|panic|intense|tense/.test(t)) return 'COMBAT';
  if (/action|running|jumping|platforming|fast|quick|urgent|challenge|race|evade|escape/.test(t)) return 'ACTION';
  if (/calm|peaceful|quiet|menu|exploration|walk|puzzle|slow|gentle|serene|ambient|town|village|forest|field|relax|safe/.test(t)) return 'CALM';
  return 'NEUTRAL';
}

// ─── Network architecture (mirrors real pipeline) ───────────────────────────
const LAYERS = [
  { count: 4, color: '#4ade80', hex: 0x4ade80, name: 'Game Input' },
  { count: 6, color: '#22d3ee', hex: 0x22d3ee, name: 'Overshoot' },
  { count: 8, color: '#818cf8', hex: 0x818cf8, name: 'Scene Analysis' },
  { count: 6, color: '#a78bfa', hex: 0xa78bfa, name: 'Lyria Prompt' },
  { count: 3, color: '#f472b6', hex: 0xf472b6, name: 'Audio Out' },
];

const LAYER_GAP = 3.2;
const NODE_GAP = 0.85;

function nodePos(li: number, ni: number, count: number): THREE.Vector3 {
  const x = (li - (LAYERS.length - 1) / 2) * LAYER_GAP;
  const y = (ni - (count - 1) / 2) * NODE_GAP;
  const z = Math.sin(li * 1.9 + ni * 2.3) * 0.35;
  return new THREE.Vector3(x, y, z);
}

// ─── Pulsing node ────────────────────────────────────────────────────────────
function Node({ position, color, phaseOffset }: {
  position: THREE.Vector3; color: string; phaseOffset: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phaseOffset;
    mat.current.emissiveIntensity = 0.35 + Math.sin(t * 1.8) * 0.25;
    ref.current.scale.setScalar(1 + Math.sin(t * 1.8) * 0.07);
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.13, 16, 16]} />
      <meshStandardMaterial ref={mat} color={color} emissive={color} emissiveIntensity={0.35} metalness={0.4} roughness={0.3} />
    </mesh>
  );
}

// ─── Signal particles — speed driven by mood via shared ref ─────────────────
function SignalParticles({ connections, speedRef }: {
  connections: Array<{ from: THREE.Vector3; to: THREE.Vector3; toLayerIdx: number; baseSpeed: number; offset: number }>;
  speedRef: React.MutableRefObject<number>;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const currentSpeed = useRef(1.0); // smooth lerp target

  const colors = useMemo(
    () => connections.map(c => new THREE.Color(LAYERS[c.toLayerIdx].hex)),
    [connections],
  );

  useEffect(() => {
    if (!meshRef.current) return;
    colors.forEach((col, i) => meshRef.current.setColorAt(i, col));
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [colors]);

  useFrame(({ clock }) => {
    // Lerp toward mood target — smooth transition between intensities
    currentSpeed.current += (speedRef.current - currentSpeed.current) * 0.015;
    const spd = currentSpeed.current;
    const t = clock.elapsedTime;
    connections.forEach((conn, i) => {
      const p = ((t * conn.baseSpeed * spd + conn.offset) % 1);
      dummy.position.lerpVectors(conn.from, conn.to, p);
      dummy.scale.setScalar(Math.sin(p * Math.PI) * 0.9 + 0.1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, connections.length]}>
      <sphereGeometry args={[0.045, 8, 8]} />
      <meshStandardMaterial vertexColors emissive="white" emissiveIntensity={0.9} />
    </instancedMesh>
  );
}

// ─── Full network ────────────────────────────────────────────────────────────
function NeuralNetwork({ speedRef }: { speedRef: React.MutableRefObject<number> }) {
  const positions = useMemo(
    () => LAYERS.map((l, li) => Array.from({ length: l.count }, (_, ni) => nodePos(li, ni, l.count))),
    [],
  );

  const connections = useMemo(() => {
    const conns: Array<{ from: THREE.Vector3; to: THREE.Vector3; toLayerIdx: number; baseSpeed: number; offset: number }> = [];
    let idx = 0;
    for (let l = 0; l < LAYERS.length - 1; l++) {
      for (let i = 0; i < LAYERS[l].count; i++) {
        for (let j = 0; j < LAYERS[l + 1].count; j++) {
          conns.push({ from: positions[l][i], to: positions[l + 1][j], toLayerIdx: l + 1, baseSpeed: 0.22 + (idx % 7) * 0.03, offset: (idx * 0.618033) % 1 });
          idx++;
        }
      }
    }
    return conns;
  }, [positions]);

  return (
    <group>
      {LAYERS.map((layer, li) => (
        <Text key={`lbl-${li}`} position={[positions[li][0].x, -2.9, 0]} fontSize={0.18} color={layer.color} anchorX="center" anchorY="middle">
          {layer.name}
        </Text>
      ))}
      {connections.map((conn, i) => (
        <Line key={`ln-${i}`} points={[conn.from, conn.to]} color="#ffffff" lineWidth={0.5} transparent opacity={0.05} />
      ))}
      <SignalParticles connections={connections} speedRef={speedRef} />
      {LAYERS.map((layer, li) =>
        positions[li].map((pos, ni) => (
          <Node key={`n-${li}-${ni}`} position={pos} color={layer.color} phaseOffset={li * 0.7 + ni * 0.4} />
        )),
      )}
    </group>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────
export default function Visualizer3D() {
  const [agentState, setAgentState] = useState<{ description: string | null; is_playing: boolean } | null>(null);
  const speedRef = useRef<number>(1.0);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/agent/state?room=${ROOM_NAME}`);
        if (!res.ok) return;
        const state = await res.json();
        setAgentState(state);
        speedRef.current = MOOD_MAP[detectMood(state.description)].speed;
      } catch {}
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  const mood = detectMood(agentState?.description ?? null);
  const moodCfg = MOOD_MAP[mood];

  return (
    <div className="h-[420px] w-full overflow-hidden relative" style={{ background: '#120a0e' }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 58 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[8, 6, 4]} intensity={1.5} color="#f472b6" />
        <pointLight position={[-8, -6, -4]} intensity={1.0} color="#22d3ee" />
        <pointLight position={[0, 8, 0]} intensity={0.6} color="#a78bfa" />
        <NeuralNetwork speedRef={speedRef} />
        <Stars radius={80} depth={60} count={4000} factor={3} saturation={0} fade speed={0.5} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} minPolarAngle={Math.PI / 3} maxPolarAngle={(Math.PI * 2) / 3} />
      </Canvas>

      {/* ── Mood badge — top left ── */}
      <div className="absolute top-3 left-3">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-black/60 backdrop-blur-sm ${moodCfg.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${moodCfg.dot} ${mood !== 'NEUTRAL' ? 'animate-pulse' : ''}`} />
          <span className={`text-[9px] font-mono uppercase tracking-widest ${moodCfg.color}`}>
            {moodCfg.label}
          </span>
          <span className="text-[9px] text-white/25 font-mono ml-1">
            ×{MOOD_MAP[mood].speed.toFixed(1)}
          </span>
        </div>
      </div>

      {/* ── Scene description — top right ── */}
      {agentState?.description ? (
        <div className="absolute top-3 right-3 max-w-[220px]">
          <div className="bg-black/65 backdrop-blur-sm border border-pink-500/20 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse shadow-[0_0_4px_#f472b6]" />
              <span className="text-[9px] font-mono text-pink-400 uppercase tracking-widest">Overshoot</span>
            </div>
            <p className="text-[11px] text-white/65 leading-relaxed line-clamp-4">
              {agentState.description}
            </p>
          </div>
        </div>
      ) : (
        <div className="absolute top-3 right-3">
          <div className="bg-black/40 border border-white/5 rounded-xl px-3 py-2">
            <span className="text-[10px] text-white/20 font-mono">Awaiting session...</span>
          </div>
        </div>
      )}
    </div>
  );
}
