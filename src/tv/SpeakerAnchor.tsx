import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { placeSpeaker, type SpeakerId } from './surround';

const ears = { at: new THREE.Vector3(), forward: new THREE.Vector3(), up: new THREE.Vector3() };
const turn = new THREE.Quaternion();
const spot = new THREE.Vector3();
const face = new THREE.Vector3();

/**
 * Drop inside whatever makes the sound (the CRT, the boombox, the PC) and that
 * speaker's sound comes from here. Faces the parent's +Z, which is the front of
 * every set in the room.
 */
export function SpeakerAnchor({ id, position = [0, 0, 0] }: { id: SpeakerId; position?: [number, number, number] }) {
  const at = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    const g = at.current;
    if (!g) return;
    camera.getWorldPosition(ears.at);
    camera.getWorldDirection(ears.forward);
    ears.up.set(0, 1, 0).applyQuaternion(camera.getWorldQuaternion(turn));
    g.getWorldPosition(spot);
    face.set(0, 0, 1).transformDirection(g.matrixWorld);
    placeSpeaker(id, ears, spot, face);
  });
  return <group ref={at} position={position} />;
}
