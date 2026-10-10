import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface DynamicModelProps {
  url: string;
  position: [number, number, number];
  rotY: number;
  /** Height in meters. Uniform scale, so the mesh is never squashed. */
  height: number;
  shadow?: boolean;
}

/** A user-uploaded GLB, fitted by height and sat on `position`. */
export function DynamicModel({ url, position, rotY, height, shadow = true }: DynamicModelProps) {
  const { scene } = useGLTF(url);
  const root = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
    });
    return clone;
  }, [scene, shadow]);

  const { fitScale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = size.y > 1e-4 ? height / size.y : 1;
    return {
      fitScale: s,
      offset: new THREE.Vector3(-center.x * s, -box.min.y * s, -center.z * s),
    };
  }, [root, height]);

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <group position={offset} scale={fitScale}>
        <primitive object={root} />
      </group>
    </group>
  );
}
