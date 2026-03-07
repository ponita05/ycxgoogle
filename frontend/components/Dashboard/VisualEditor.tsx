"use client";

import React, { useCallback } from 'react';
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Audio Input' }, type: 'input' },
  { id: '2', position: { x: 0, y: 100 }, data: { label: 'Analyzer' } },
  { id: '3', position: { x: 0, y: 200 }, data: { label: 'Output' }, type: 'output' },
];

const initialEdges = [{ id: 'e1-2', source: '1', target: '2' }, { id: 'e2-3', source: '2', target: '3' }];

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
