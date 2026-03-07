"use client";

import React, { useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Represents the actual agent pipeline:
// GameScreen → Overshoot Vision AI → Scene Description → Lyria Prompt → Lyria RealTime → Audio Output
const initialNodes = [
  { id: '1', type: 'input',  position: { x: 0,   y: 200 }, data: { label: '🎮 Game Screen Capture' } },
  { id: '2',                 position: { x: 260, y: 100 }, data: { label: '👁️ Overshoot Vision AI' } },
  { id: '3',                 position: { x: 260, y: 300 }, data: { label: '📝 Scene Description' } },
  { id: '4',                 position: { x: 520, y: 200 }, data: { label: '🎵 Lyria Prompt Builder' } },
  { id: '5',                 position: { x: 780, y: 200 }, data: { label: '🌊 Lyria RealTime' } },
  { id: '6', type: 'output', position: { x: 1040, y: 200 }, data: { label: '🔊 Audio Output (LiveKit)' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', label: 'video frames' },
  { id: 'e2-3', source: '2', target: '3', label: 'analysis' },
  { id: 'e3-4', source: '3', target: '4', label: 'description' },
  { id: 'e4-5', source: '4', target: '5', label: 'weighted prompts' },
  { id: 'e5-6', source: '5', target: '6', label: '48kHz PCM' },
];

export default function VisualEditor() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className="h-[500px] w-full overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        style={{ background: '#0c0a14' }}
      >
        <Background color="#2d1f5e" gap={24} />
        <Controls className="!bg-violet-950/80 !border-violet-500/30 !rounded-lg" />
        <MiniMap
          nodeColor="#7c3aed"
          maskColor="rgba(12, 10, 20, 0.85)"
          className="!bg-violet-950/60 !border !border-violet-500/20 !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}
