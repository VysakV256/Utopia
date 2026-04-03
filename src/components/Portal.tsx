'use client';

import { useMultiverseStore } from '@/store/multiverse';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';

function Portal({ universe, position, ringColor = "var(--accent)" }: { universe: any; position: [number, number, number], ringColor?: string }) {
  const setCurrentUniverse = useMultiverseStore((state) => state.setCurrentUniverse);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Re-use the fragment shader of that specific universe
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      // Slight floating motion
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.2;
    }
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={() => {
        // Traversal logic
        setCurrentUniverse(universe.id);
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[1, 32, 32]} />
      {/* Mini version of the universe shading */}
      <shaderMaterial
        ref={materialRef}
        vertexShader={`
          varying vec2 vUv;
          varying vec3 vPosition;
          void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={universe.shader}
        uniforms={{ time: { value: 0 } }}
      />
      
      {/* Highlight ring on hover */}
      {hovered && (
        <mesh>
          <torusGeometry args={[1.2, 0.05, 16, 100]} />
          <meshBasicMaterial color={ringColor} />
        </mesh>
      )}
    </mesh>
  );
}

// Spawns rings of portals for connected universes around the user
export function Portals() {
  const { universes, currentUniverseId } = useMultiverseStore();

  const currentUniverse = universes.find((u) => u.id === currentUniverseId);
  
  let connected: { universe: any, relationType: 'parent' | 'child' | 'neighbor' | 'genesis' }[] = [];

  if (currentUniverseId === 'genesis') {
    // Show all universes that have no parent (orphans) 
    // plus any explicit children or neighbors
    universes.forEach((u) => {
      if (u.id === 'genesis') return;
      if (!u.parentUniverseId || u.parentUniverseId === 'genesis') {
        connected.push({ universe: u, relationType: 'child' });
      } else if (currentUniverse?.neighborUniverseIds?.includes(u.id) || u.neighborUniverseIds?.includes('genesis')) {
        connected.push({ universe: u, relationType: 'neighbor' });
      }
    });
  } else if (currentUniverse) {
    universes.forEach((u) => {
      if (u.id === currentUniverseId) return;

      if (u.id === currentUniverse.parentUniverseId) {
        connected.push({ universe: u, relationType: 'parent' });
      } else if (u.parentUniverseId === currentUniverseId) {
        connected.push({ universe: u, relationType: 'child' });
      } else if (
        currentUniverse.neighborUniverseIds?.includes(u.id) || 
        (currentUniverseId && u.neighborUniverseIds?.includes(currentUniverseId))
      ) {
        connected.push({ universe: u, relationType: 'neighbor' });
      }
    });

    // If no connections (orphaned), link back to genesis
    if (connected.length === 0) {
      const genesis = universes.find(u => u.id === 'genesis');
      if (genesis) {
        connected.push({ universe: genesis, relationType: 'genesis' });
      }
    }
  }

  // Deduplicate
  const seen = new Set();
  const uniqueConnections = connected.filter(c => {
    if (seen.has(c.universe.id)) return false;
    seen.add(c.universe.id);
    return true;
  });

  // Distribute them in a circle around the origin
  const radius = 5;

  return (
    <>
      {uniqueConnections.map((conn, idx) => {
        const angle = (idx / uniqueConnections.length) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Visual distinction
        let ringColor = 'var(--accent)';
        if (conn.relationType === 'parent') ringColor = '#4ADE80'; // Greenish
        else if (conn.relationType === 'child') ringColor = '#60A5FA'; // Blueish
        else if (conn.relationType === 'neighbor') ringColor = '#C084FC'; // Purpleish
        else if (conn.relationType === 'genesis') ringColor = '#FFFFFF';

        return (
          <Portal 
            key={conn.universe.id} 
            universe={conn.universe} 
            position={[x, 1.5, z]} 
            ringColor={ringColor}
          />
        );
      })}
    </>
  );
}
