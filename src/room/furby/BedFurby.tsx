import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HoverTarget } from '../Interactable';
import { SpeakerAnchor } from '../../tv/SpeakerAnchor';
import { FurbyPuppet, FURBY_HEIGHT } from './FurbyPuppet';
import { bedBrain, furbyAnchors, setFurbyDark, useFurby } from './furbyStore';

export const FURBY_CARD = 'furby';

/**
 * The Furby left on the bed by the pillow. It blinks, looks around and
 * chatters when you're near; turn the lights off and it says it's dark,
 * yawns and goes to sleep, snoring. Clicking it opens its card, and the
 * card's "Pick it up" puts it in your hands (FurbyHold).
 *
 * Lives inside the bed's group, so position and rotation are bed-local.
 */
export function BedFurby({
  position,
  rotation,
  hovered,
  dark,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  hovered: boolean;
  dark: boolean;
}) {
  const { held } = useFurby();
  const away = held === 'bed';
  const anchor = useRef<THREE.Group>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const world = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo<HoverTarget>(() => ({ id: FURBY_CARD, kind: 'prop', label: 'Furby', hint: 'Examine' }), []);

  useEffect(() => {
    if (anchor.current) furbyAnchors.bed = anchor.current;
    return () => {
      delete furbyAnchors.bed;
    };
  }, []);

  useFrame(({ camera, clock }) => {
    setFurbyDark(dark);
    if (!away && anchor.current) {
      anchor.current.getWorldPosition(world);
      bedBrain.attentive = camera.position.distanceTo(world) < 2.2;
    }
    if (glow.current) glow.current.opacity = hovered ? 0.16 : Math.max(0, Math.sin(clock.elapsedTime * 1.4)) * 0.03;
  });

  return (
    <group ref={anchor} position={position} rotation={rotation}>
      {/* The Furby's voice comes from its beak, in the room's HRTF speakers. */}
      <SpeakerAnchor id="furby" position={[0, FURBY_HEIGHT * 0.7, 0.05]} />
      <Suspense fallback={null}>
        <FurbyPuppet brain={bedBrain} visible={!away} />
      </Suspense>
      {!away && (
        <>
          <mesh position={[0, FURBY_HEIGHT * 0.5, 0]}>
            <sphereGeometry args={[0.13, 16, 12]} />
            <meshBasicMaterial ref={glow} color="#ffd27a" transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh position={[0, FURBY_HEIGHT * 0.5, 0]} userData={{ interactable: target, volume: 0.0004 }}>
            <boxGeometry args={[0.2, FURBY_HEIGHT * 1.1, 0.18]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </>
      )}
    </group>
  );
}
