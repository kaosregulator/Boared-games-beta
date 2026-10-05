import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { VideoRoomScene } from './VideoRoomScene';

/** Seated at the play table, looking across the bedroom. */
const SEAT = {
  at: [1.18, 1.22, -0.28] as [number, number, number],
  look: [-0.45, 1.12, -2.45] as [number, number, number],
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
 * the table, so a handful of frames after the textures land is enough and the
 * GPU stays free for the board itself.
 */
function RenderOnce() {
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => {
    const timers = [0, 80, 240, 700, 1600].map(ms => window.setTimeout(invalidate, ms));
    return () => timers.forEach(window.clearTimeout);
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
        gl.toneMappingExposure = 0.95;
        scene.fog = new THREE.Fog('#160d15', 6, 18);
      }}
    >
      <SeatedCamera />
      <RenderOnce />
      <Suspense fallback={null}>
        <VideoRoomScene hoveredId={null} pulledGameId={null} tapeOn={false} lampsWarm={false} />
      </Suspense>
    </Canvas>
  );
}
