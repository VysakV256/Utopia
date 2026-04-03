'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export function ShaderThumbnail({ shaderCode }: { shaderCode: string }) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || imageSrc || !shaderCode) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let geometry: THREE.SphereGeometry | null = null;

    try {
      renderer = new THREE.WebGLRenderer({ 
        canvas: canvasRef.current, 
        preserveDrawingBuffer: true,
        alpha: true 
      });
      renderer.setSize(128, 128); // Thumbnail resolution

      const scene = new THREE.Scene();
      // Match the main universe camera setup for accurate 3D mapping
      const camera = new THREE.PerspectiveCamera(80, 1, 0.1, 1000);
      camera.position.set(0, 0, 0);

      geometry = new THREE.SphereGeometry(100, 64, 64);
      material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: shaderCode,
        uniforms: {
          time: { value: 12.0 }, // Higher static time offset for more vivid initial snapshots
          resolution: { value: new THREE.Vector2(128, 128) }
        },
        side: THREE.BackSide, // Inside the sphere
        depthWrite: false
      });

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      // Render the single frame
      renderer.render(scene, camera);
      
      // Save it as a data URL image
      setImageSrc(canvasRef.current.toDataURL('image/jpeg', 0.8));

    } catch (e) {
      console.warn("Thumbnail shader compilation failed", e);
    } finally {
      // Clean up heavily to prevent WebGL Context exhaustion (MAX ~16 limit)
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
      }
      if (material) material.dispose();
      if (geometry) geometry.dispose();
    }
  }, [shaderCode, imageSrc]);

  if (imageSrc) {
    return (
      <img 
        src={imageSrc} 
        className="w-16 h-16 rounded-lg object-cover border border-[var(--glass-border)] shrink-0" 
        alt="Universe thumbnail" 
      />
    );
  }

  return (
    <div className="w-16 h-16 rounded-lg bg-white/10 shrink-0 border border-[var(--glass-border)] flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} width={128} height={128} className="w-full h-full object-cover" />
    </div>
  );
}
