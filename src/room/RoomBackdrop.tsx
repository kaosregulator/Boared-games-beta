import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { VideoRoomScene } from './VideoRoomScene';

/** Seated at the play table, looking across the bedroom at the poster wall. */
const SEAT = {
  at: [1.0, 1.24, -0.5] as [number, number, number],
  look: [-0.3, 1.32, -2.48] as [number, number, number],
};

function SeatedCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...SEAT.at);
    camera.lookAt(...SEAT.look);
  }, [camera]);
  return null;
}

/**
 * The backdrop renders on demand only. Nothing in it moves while a game is on
 * the table, so a short burst of frames is enough and the GPU stays free for
 * the board itself. This mounts inside the Suspense boundary, so the burst only
 * starts once the room textures have actually decoded.
 */
function RenderBurst() {
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => {
    invalidate();
    let left = 12;
    const id = window.setInterval(() => {
      invalidate();
      left -= 1;
      if (left <= 0) window.clearInterval(id);
    }, 180);
    return () => window.clearInterval(id);
  }, [invalidate]);
  return null;
}

/**
 * The real bedroom behind an in-progress game, so playing at the table happens
 * in the same room you walked through rather than over a flat picture.
 */
export function RoomBackdrop() {
  return (
    <Canvas
      frameloop="demand"
      dpr={1}
      camera={{ fov: 70, near: 0.05, far: 60 }}
      gl={{ antialias: false, powerPreference: 'low-power' }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        scene.fog = new THREE.Fog('#160d15', 6, 18);
      }}
    >
      <SeatedCamera />
      <Suspense fallback={null}>
        <RenderBurst />
        <VideoRoomScene hoveredId={null} pulledGameId={null} tapeOn={false} lampsWarm={false} />
      </Suspense>
    </Canvas>
  );
}
