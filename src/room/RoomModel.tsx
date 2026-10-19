import React, { Component, Suspense, useMemo } from 'react';
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
  | 'cards'
  | 'door'
  | 'backpack'
  | 'hotpockets'
  | 'nes'
  | 'rubik'
  | 'armor'
  | 'army'
  | 'gushers'
  | 'teddy'
  | 'jordans'
  | 'car'
  | 'books'
  | 'clutterdesk'
  | 'board'
  | 'battleship'
  | 'clue'
  | 'life'
  | 'yahtzee'
  | 'beanbag'
  | 'crate';

export const MODEL_URL: Record<ModelId, string> = {
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
  door: '/models/door.glb',
  backpack: '/models/backpack.glb',
  hotpockets: '/models/hotpockets.glb',
  nes: '/models/nes.glb',
  rubik: '/models/rubik.glb',
  armor: '/models/armor.glb',
  army: '/models/army.glb',
  gushers: '/models/gushers.glb',
  teddy: '/models/teddy.glb',
  jordans: '/models/jordans.glb',
  car: '/models/car.glb',
  books: '/models/books.glb',
  clutterdesk: '/models/clutterdesk.glb',
  board: '/models/board.glb',
  battleship: '/models/battleship.glb',
  clue: '/models/clue.glb',
  life: '/models/life.glb',
  yahtzee: '/models/yahtzee.glb',
  beanbag: '/models/beanbag.glb',
  crate: '/models/crate.glb',
};

/**
 * Tripo writes every prop as a fully metallic PBR material and a mesh of
 * hundreds of thousands of triangles. Fully metallic surfaces ignore the
 * base color unless an environment map is present, so the furniture renders
 * black. Raycasting those meshes every frame freezes the tab.
 */
function finishMaterials(root: THREE.Object3D, tint: THREE.Color, amount: number) {
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.raycast = () => {};
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach(m => {
      const mat = m as THREE.MeshStandardMaterial;
      if (!mat || !('color' in mat)) return;
      if (amount > 0) mat.color.lerp(tint, amount);
      mat.metalness = 0;
      mat.metalnessMap = null;
      mat.roughness = 0.86;
      mat.roughnessMap = null;
      mat.envMapIntensity = 0.15;
      const physical = mat as THREE.MeshPhysicalMaterial;
      if (physical.transmission) physical.transmission = 0;
      mat.needsUpdate = true;
    });
  });
}

interface RoomModelProps {
  id: ModelId;
  /** World position of the model's floor contact centre. */
  position: [number, number, number];
  rotation?: [number, number, number];
  /**
   * Scale uniformly so this model-space axis equals `meters`.
   * Only one axis — fitting width and height together was squashing meshes.
   */
  axis?: 'x' | 'y' | 'z';
  meters?: number;
  /** @deprecated use axis + meters */
  fitWidth?: number;
  /** @deprecated use axis + meters */
  fitHeight?: number;
  fitDepth?: number;
  /** Uniform scale multiplier after fitting. */
  scale?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
  interactable?: HoverTarget;
  /** Tint toward warm wood/purple. Keep low so baked Tripo art stays crisp. */
  tintAmount?: number;
  hovered?: boolean;
}

/**
 * Places a Tripo GLB into the bedroom, centred on XZ with the floor at y=0.
 */
export function RoomModel({
  id,
  position,
  rotation = [0, 0, 0],
  axis,
  meters,
  fitWidth,
  fitHeight,
  fitDepth,
  scale = 1,
  castShadow = true,
  receiveShadow = true,
  interactable,
  tintAmount = 0.04,
  hovered = false,
}: RoomModelProps) {
  const url = MODEL_URL[id];
  const { scene } = useGLTF(url);
  const root = useMemo(() => {
    const clone = scene.clone(true);
    finishMaterials(clone, new THREE.Color('#7a5a52'), tintAmount);
    clone.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
    });
    return clone;
  }, [scene, tintAmount, castShadow, receiveShadow]);

  const fitted = useMemo(() => {
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    let s = scale;
    if (size.x > 1e-4 && size.y > 1e-4 && size.z > 1e-4) {
      if (meters && axis) {
        const len = axis === 'x' ? size.x : axis === 'y' ? size.y : size.z;
        s = scale * (meters / len);
      } else if (fitWidth && fitHeight) {
        s = scale * Math.min(fitWidth / Math.max(size.x, size.z), fitHeight / size.y);
      } else if (fitWidth) {
        s *= fitWidth / Math.max(size.x, size.z);
      } else if (fitHeight) {
        s *= fitHeight / size.y;
      } else if (fitDepth) {
        s *= fitDepth / size.z;
      }
    }
    return {
      fitScale: s,
      // Centre XZ on the pivot; park the floor (bbox.min.y) at y=0
      offset: new THREE.Vector3(-center.x * s, -box.min.y * s, -center.z * s),
      size: size.multiplyScalar(s),
    };
  }, [root, axis, meters, fitWidth, fitHeight, fitDepth, scale]);

  return (
    <group position={position} rotation={rotation}>
      <group position={fitted.offset} scale={fitted.fitScale}>
        <primitive object={root} />
      </group>
      {interactable && (
        <mesh position={[0, Math.max(fitted.size.y, 0.2) / 2, 0]} userData={{ interactable }}>
          <boxGeometry
            args={[
              Math.max(fitted.size.x, 0.16),
              Math.max(fitted.size.y, 0.16),
              Math.max(fitted.size.z, 0.16),
            ]}
          />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      {hovered && (
        <mesh position={[0, 0.55, 0.1]}>
          <sphereGeometry args={[0.62, 18, 14]} />
          <meshBasicMaterial color="#ffd59a" transparent opacity={0.1} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

class ModelBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

/** One prop failing or still downloading must not blank the rest of the room. */
export function SafeRoomModel(props: RoomModelProps) {
  return (
    <ModelBoundary>
      <Suspense fallback={null}>
        <RoomModel {...props} />
      </Suspense>
    </ModelBoundary>
  );
}

(
  [
    'bed',
    'shelf',
    'crt',
    'dresser',
    'desk',
    'nightstand',
    'boombox',
    'window',
    'gameboy',
    'door',
    'backpack',
    'toyshelf',
  ] as ModelId[]
).forEach(id => {
  useGLTF.preload(MODEL_URL[id]);
});
