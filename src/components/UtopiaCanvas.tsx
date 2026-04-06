'use client';

import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import { Suspense, useState, useEffect, useRef } from 'react';
import { Universe } from './Universe';
import { Portals } from './Portal';
import { PointerLockControls, OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useMultiverseStore } from '@/store/multiverse';

// Universal Locomotion component handling WASD and VR Thumsticks
function LocomotionWorld({ children }: { children: React.ReactNode }) {
  const worldRef = useRef<THREE.Group>(null);
  const keys = useRef<Record<string, boolean>>({});
  const { gl, camera } = useThree();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT') {
        useMultiverseStore.getState().startVoiceInput();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
      if (e.code === 'Space') {
        useMultiverseStore.getState().stopVoiceInput();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const triggerPressedRef = useRef(false);

  useFrame((state, delta) => {
    if (!worldRef.current) return;
    const speed = 8 * delta; // standard walking speed
    
    const dir = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    const camera = state.camera;
    camera.getWorldDirection(dir);
    dir.y = 0; // Lock movement to horizontal plane
    if (dir.lengthSq() < 0.0001) {
      dir.set(0, 0, -1);
    } else {
      dir.normalize();
    }
    right.crossVectors(dir, up).normalize();

    let moveX = 0;
    let moveZ = 0;

    // Desktop WASD
    const kd = keys.current;
    if (kd['KeyW']) moveZ += 1;
    if (kd['KeyS']) moveZ -= 1;
    if (kd['KeyA']) moveX -= 1;
    if (kd['KeyD']) moveX += 1;

    // VR Joysticks Locomotion and Input
    const session = gl.xr.getSession();
    if (session && session.inputSources) {
      for (const source of session.inputSources) {
        if (!source.gamepad) continue;
        const axes = source.gamepad.axes;
        
        // Grab the thumbstick (usually indices 2, 3 for Oculus, 0, 1 for basic wands)
        const lx = axes.length > 2 ? axes[2] : axes[0];
        const ly = axes.length > 2 ? axes[3] : axes[1];
        
        // Deadzone > 0.1
        if (typeof lx === 'number' && Math.abs(lx) > 0.1) moveX += lx;
        if (typeof ly === 'number' && Math.abs(ly) > 0.1) moveZ -= ly; 
        
        // Voice trigger logic (primary trigger usually buttons[0])
        const triggerBtn = source.gamepad.buttons[0];
        if (triggerBtn) {
          if (triggerBtn.pressed && !triggerPressedRef.current) {
            triggerPressedRef.current = true;
            useMultiverseStore.getState().startVoiceInput();
          } else if (!triggerBtn.pressed && triggerPressedRef.current) {
            triggerPressedRef.current = false;
            useMultiverseStore.getState().stopVoiceInput();
          }
        }
      }
    }

    if (moveX !== 0 || moveZ !== 0) {
      // By moving the world backwards relative to player intention, we simulate smooth player movement!
      if (!isNaN(dir.x) && !isNaN(right.x)) {
        worldRef.current.position.addScaledVector(dir, -moveZ * speed);
        worldRef.current.position.addScaledVector(right, -moveX * speed);
      }
    }
  });

  return <group ref={worldRef}>{children}</group>;
}

// Initialize XR store
const store = createXRStore();

export function UtopiaCanvas() {
  const [mounted, setMounted] = useState(false);
  const [isVR, setIsVR] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Avoid SSR hydration mismatches

  const handleEnterDesktop = () => {
    setIsVR(false);
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(console.error);
    }
    const canvas = document.querySelector('canvas');
    if (canvas) canvas.requestPointerLock();
  };

  const handleEnterVR = async () => {
    try {
      const supported = await navigator.xr?.isSessionSupported('immersive-vr');
      if (supported) {
        setIsVR(true);
        setTimeout(() => store.enterVR(), 100);
      } else {
        console.warn("VR not supported on this device. Starting desktop mode.");
        handleEnterDesktop();
      }
    } catch (e) {
      console.warn("XR Support check failed", e);
      handleEnterDesktop();
    }
  };

  const SceneContent = (
    <Suspense fallback={null}>
      <LocomotionWorld>
         <ambientLight intensity={1} />
        <Universe />
        <Portals />
      </LocomotionWorld>
    </Suspense>
  );

  return (
    <>
      <div className="absolute bottom-4 left-4 z-50 flex gap-4">
        <button
          onClick={handleEnterVR}
          className="modern-button"
        >
          Enter VR
        </button>
        <button
          onClick={handleEnterDesktop}
          className="modern-button"
        >
          Desktop (M&K)
        </button>
      </div>
      
      <Canvas style={{ width: '100vw', height: '100vh', display: 'block' }} camera={{ position: [0, 1.6, 0] }}>
        {!isVR && <PointerLockControls makeDefault />}
        {isVR ? (
          <XR store={store}>
            {SceneContent}
          </XR>
        ) : (
          SceneContent
        )}
      </Canvas>
    </>
  );
}
