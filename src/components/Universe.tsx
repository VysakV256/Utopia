'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMultiverseStore } from '@/store/multiverse';

const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export function Universe() {
  const { universes, currentUniverseId } = useMultiverseStore();
  const activeUniverse = universes.find((u) => u.id === currentUniverseId);
  
  const shaderCode = activeUniverse?.shader || '';
  
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Memoize uniforms so we don't recreate them every render
  const uniforms = useMemo(
    () => ({
      time: { value: 0.0 },
      resolution: { value: new THREE.Vector2(1, 1) } // Simplified, can be hooked to useThree
    }),
    []
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.getElapsedTime();
    }
  });

  if (!shaderCode) return null;

  return (
    <mesh>
      {/* A large sphere encompassing the scene, inverted to see from inside */}
      <sphereGeometry args={[500, 64, 64]} />
      <shaderMaterial
        key={String(shaderCode)} // Force recompilation when shader changes
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={shaderCode}
        uniforms={uniforms}
        side={THREE.BackSide} /* Very important, renders on the inside */
        depthWrite={false}
      />
    </mesh>
  );
}
