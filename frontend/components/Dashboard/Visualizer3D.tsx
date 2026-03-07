"use client";

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';

function Box(props: any) {
  const mesh = useRef<THREE.Mesh>(null!);
  const [hovered, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  useFrame((state, delta) => (mesh.current.rotation.x += delta));

  return (
    <mesh
      {...props}
      ref={mesh}
      scale={active ? 1.5 : 1}
      onClick={() => setActive(!active)}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? '#f472b6' : '#fb923c'} />
    </mesh>
  );
}

export default function Visualizer3D() {
  return (
    <div className="h-[360px] w-full overflow-hidden" style={{ background: '#120a0e' }}>
      <Canvas>
        <ambientLight intensity={Math.PI / 2} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} decay={0} intensity={Math.PI} color="#f472b6" />
        <pointLight position={[-10, -10, -10]} decay={0} intensity={Math.PI} color="#fb923c" />
        <Box position={[-1.2, 0, 0]} />
        <Box position={[1.2, 0, 0]} />
        <OrbitControls />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Environment preset="night" />
      </Canvas>
    </div>
  );
}
