import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { HoverTarget } from './Interactable';

export type ModelId =
  | 'bed'
  | 'shelf'
  | 'crt'
  | 'dresser'
  | 'desk'
  | 'nightstand'
  | 'boombox'
  | 'window'
  | 'gameboy'
  | 'vhs_stack'
  | 'vhs_loose'
  | 'toyshelf'
  | 'cards';

const MODEL_URL: Record<ModelId, string> = {
  bed: '/models/bed.glb',
  shelf: '/models/shelf.glb',
  crt: '/models/crt.glb',
  dresser: '/models/dresser.glb',
  desk: '/models/desk.glb',
  nightstand: '/models/nightstand.glb',
  boombox: '/models/boombox.glb',
  window: '/models/window.glb',
  gameboy: '/models/gameboy.glb',
  vhs_stack: '/models/vhs_stack.glb',
  vhs_loose: '/models/vhs_loose.glb',
  toyshelf: '/models/toyshelf.glb',
  cards: '/models/cards.glb',
};

/** Warm the Tripo albedo toward the reference painting's purple/wood cast. */
function tintMaterials(root: THREE.Object3D, tint: THREE.Color, amount = 0.18) {
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach(m => {
      const mat = m as THREE.MeshStandardMaterial;
      if (!mat || !('color' in mat)) return;
      mat.color.lerp(tint, amount);
      mat.roughness = Math.min(1, (mat.roughness ?? 0.8) * 1.05);
      mat.envMapIntensity = 0.35;
      mat.needsUpdate = true;
    });
  });
}

interface RoomModelProps {
  id: ModelId;
  /** World position of the model's floor contact (y = 0 of the asset). */
  position: [number, number, number];
  rotation?: [number, number, number];
  /** Target real-world size on the longest horizontal axis (meters). */
  fitWidth?: number;
  /** Target real-world height (meters). Overrides fitWidth when set with fitDepth. */
  fitHeight?: number;
  fitDepth?: number;
  /** Uniform scale multiplier after fitting. */
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Optional interaction payload for the reach raycaster. */
  interactable?: HoverTarget;
  /** Tint strength toward the room's warm purple wood look. */
  tintAmount?: number;
  hovered?: boolean;
}

/**
 * Places a compressed Tripo GLB into the bedroom, scaled to real-world size.
 * Models sit on y=0 in their own space; we keep that convention.
 */
export function RoomModel({
  id,
  position,
  rotation = [0, 0, 0],
  fitWidth,
  fitHeight,
  fitDepth,
  scale = 1,
  castShadow = true,
  receiveShadow = true,
  interactable,
  tintAmount = 0.16,
  hovered = false,
}: RoomModelProps) {
  const url = MODEL_URL[id];
  const { scene } = useGLTF(url);
  const root = useMemo(() => {
    const clone = scene.clone(true);
    tintMaterials(clone, new THREE.Color('#6a4a62'), tintAmount);
    clone.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
    });
    return clone;
  }, [scene, tintAmount, castShadow, receiveShadow]);

  const fitScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.x < 1e-4 || size.y < 1e-4 || size.z < 1e-4) return scale;
    let s = scale;
    if (fitWidth) s *= fitWidth / Math.max(size.x, size.z);
    if (fitHeight) s *= fitHeight / size.y;
    // If both width and height requested, prefer the more constraining (min)
    if (fitWidth && fitHeight) {
      s = scale * Math.min(fitWidth / Math.max(size.x, size.z), fitHeight / size.y);
    }
    if (fitDepth && !fitWidth) s *= fitDepth / size.z;
    return s;
  }, [root, fitWidth, fitHeight, fitDepth, scale]);

  // Shift so the model's floor (bbox.min.y) lands at y=0
  const yOffset = useMemo(() => {
    const box = new THREE.Box3().setFromObject(root);
    return -box.min.y * fitScale;
  }, [root, fitScale]);

  return (
    <group position={position} rotation={rotation} userData={interactable ? { interactable } : undefined}>
      <group position={[0, yOffset, 0]} scale={fitScale}>
        <primitive object={root} />
      </group>
      {hovered && (
        <mesh position={[0, 0.4, 0]}>
          <sphereGeometry args={[0.55, 16, 12]} />
          <meshBasicMaterial color="#ffd59a" transparent opacity={0.08} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

// Warm the browser cache for the hero furniture set.
(['bed', 'shelf', 'crt', 'dresser', 'desk', 'nightstand', 'boombox', 'window', 'gameboy'] as ModelId[]).forEach(id => {
  useGLTF.preload(MODEL_URL[id]);
});
