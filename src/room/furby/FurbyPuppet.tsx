import React, { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { buildFurbyRig } from './furbyRig';
import type { FurbyBrain } from './furbyBrain';
import type { Ellipsoid } from './HoldArms';

export const FURBY_URL = '/models/furby.glb';
/** A 1998 Furby stands about 16 cm; the mesh is 0.937 units tall. */
export const FURBY_SCALE = 0.16 / 0.937;
export const FURBY_HEIGHT = 0.16;
/**
 * What a hand can't pass through, in the puppet's own space (metres, feet at
 * the origin): the round body, and the head, which bulges out further at the
 * back. Measured off the mesh, fur included.
 */
export const FURBY_SOLID: Ellipsoid[] = [
  { center: new THREE.Vector3(0, 0.05, 0.004), radii: new THREE.Vector3(0.072, 0.062, 0.062) },
  { center: new THREE.Vector3(0, 0.105, -0.012), radii: new THREE.Vector3(0.062, 0.05, 0.058) },
];

/**
 * One rigged Furby, driven by its brain every frame. Sits with its feet on
 * the group's origin, facing +z.
 */
export function FurbyPuppet({
  brain,
  tint,
  visible = true,
  children,
}: {
  brain: FurbyBrain;
  tint?: THREE.ColorRepresentation;
  visible?: boolean;
  children?: React.ReactNode;
}) {
  const gltf = useGLTF(FURBY_URL);
  const rig = useMemo(() => buildFurbyRig(gltf.scene, tint), [gltf.scene, tint]);
  useEffect(() => () => rig.dispose(), [rig]);
  useEffect(() => () => brain.dispose(), [brain]);
  useFrame((_, dt) => {
    if (!visible) return;
    brain.update(dt);
    brain.apply(rig);
  });
  return (
    <group visible={visible}>
      <primitive object={rig.root} scale={FURBY_SCALE} />
      {children}
    </group>
  );
}

useGLTF.preload(FURBY_URL);
