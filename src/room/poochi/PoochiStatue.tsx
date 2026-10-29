import React, { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { HoverTarget } from '../Interactable';
import { SpeakerAnchor } from '../../tv/SpeakerAnchor';
import { LAYOUT } from '../roomLayout';

export const POOCHI_CARD = 'poochi';
const STATUE_URL = '/models/poochi-statue.glb';
/** The mesh is 1.71 units tall; the real toy is about 16 cm. */
const HEIGHT = 0.16;
const SCALE = HEIGHT / 1.71;

/**
 * Poo-Chi switched off on the dresser, on the free end of the top beside
 * the TV, turned a little toward the room. This is the user's unrigged
 * model (scripts/build-poochi-statue.mjs paints it). Clicking him opens his
 * card; "Play with him" takes him to the table.
 */
export const POOCHI_SPOT = (() => {
  const d = LAYOUT.dresser;
  return { x: d.x - d.sx / 2 + 0.09, y: d.y + d.sy, z: d.z + 0.2, rotY: 0.45 };
})();

function Statue() {
  const gltf = useGLTF(STATUE_URL);
  const scene = useMemo(() => {
    const s = gltf.scene.clone(true);
    s.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = true;
    });
    // The capsule clones this real model, so Poo-Chi floats clean with no dresser slab.
    s.userData.holoRoot = POOCHI_CARD;
    return s;
  }, [gltf.scene]);
  return <primitive object={scene} scale={SCALE} />;
}

export function PoochiStatue({ hovered, away }: { hovered: boolean; away: boolean }) {
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const target = useMemo<HoverTarget>(() => ({ id: POOCHI_CARD, kind: 'prop', label: 'Poo-Chi', hint: 'Examine' }), []);
  useFrame(({ clock }) => {
    if (glow.current) glow.current.opacity = hovered ? 0.16 : Math.max(0, Math.sin(clock.elapsedTime * 1.3 + 1)) * 0.03;
  });
  if (away) return null;
  const p = POOCHI_SPOT;
  return (
    <group position={[p.x, p.y, p.z]} rotation={[0, p.rotY, 0]}>
      {/* Poo-Chi's barks and gearbox come from where he sits, in the room's HRTF speakers. */}
      <SpeakerAnchor id="poochi" position={[0, HEIGHT * 0.6, 0.04]} />
      <Suspense fallback={null}>
        <Statue />
      </Suspense>
      <mesh position={[0, HEIGHT * 0.5, 0]}>
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshBasicMaterial ref={glow} color="#7fd6ff" transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, HEIGHT * 0.5, 0]} userData={{ interactable: target, volume: 0.0004 }}>
        <boxGeometry args={[0.12, HEIGHT * 1.1, 0.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

useGLTF.preload(STATUE_URL);
