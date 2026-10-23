import React, { Component, Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { withKtx2 } from './ktx2';
import * as THREE from 'three';
import type { HoverTarget } from './Interactable';
import type { Hotspot } from './hotspots';
import type { LavaSpec } from './LavaLamp';
import { propCardFor } from './propCards';

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
  | 'crate'
  | 'hotwheels';

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
  hotwheels: '/models/hotwheels.glb',
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
  /** Things baked into this mesh that get their own card. */
  hotspots?: Hotspot[];
  /** What the player is pointing at, to outline the right box. */
  activeId?: string | null;
  children?: React.ReactNode;
  /**
   * Lava lamps baked into this mesh. Their painted glass is pulled in so the
   * live lamp drawn over it (LavaLamp) is all you see.
   */
  lava?: LavaSpec[];
}

const V = new THREE.Vector3();
const INV = new THREE.Matrix4();

/**
 * Pull every vertex of a baked lava lamp's glass in toward its axis, inside
 * the radius the live lamp is drawn at. Geometry is shared with the GLTF
 * cache, so each one is only squeezed once.
 */
function squeezeLava(root: THREE.Object3D, scale: number, offset: THREE.Vector3, lamps: LavaSpec[]) {
  root.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geo = mesh.geometry as THREE.BufferGeometry;
    if (geo.userData.lavaSqueezed) return;
    geo.userData.lavaSqueezed = true;
    const pos = geo.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!pos) return;
    // Mesh space -> the prop's placed frame (metres, floor at 0), and back.
    const toPlaced = new THREE.Matrix4().multiplyMatrices(rootInv, mesh.matrixWorld);
    INV.copy(toPlaced).invert();
    let moved = 0;
    for (let i = 0; i < pos.count; i += 1) {
      V.fromBufferAttribute(pos, i).applyMatrix4(toPlaced).multiplyScalar(scale).add(offset);
      for (const lamp of lamps) {
        // Leave the base alone; go right up to the cap.
        if (V.y < lamp.y0 + (lamp.y1 - lamp.y0) * 0.02 || V.y > lamp.y1) continue;
        const t = (V.y - lamp.y0) / (lamp.y1 - lamp.y0);
        const r = lamp.r0 + (lamp.r1 - lamp.r0) * t;
        const dx = V.x - lamp.x;
        const dz = V.z - lamp.z;
        const d = Math.hypot(dx, dz);
        if (d > r * 1.7 || d < r * 0.85) continue;
        const k = (r * 0.85) / d;
        V.x = lamp.x + dx * k;
        V.z = lamp.z + dz * k;
        V.sub(offset).divideScalar(scale).applyMatrix4(INV);
        pos.setXYZ(i, V.x, V.y, V.z);
        moved += 1;
        break;
      }
    }
    if (moved) {
      pos.needsUpdate = true;
      geo.computeBoundingSphere();
      geo.computeBoundingBox();
    }
  });
}

const GAME_LABEL: Record<string, string> = {
  monopoly: 'Monopoly',
  battleship: 'Battleship',
  pawnrush: 'Sorry!',
  clue: 'Clue',
  life: 'The Game of Life',
  yahtzee: 'Yahtzee',
};

/** Thin amber outline around whatever is being pointed at. */
function Outline({ size, position }: { size: [number, number, number]; position: [number, number, number] }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(size[0], size[1], size[2])), [size[0], size[1], size[2]]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <lineSegments geometry={geo} position={position} renderOrder={5}>
      <lineBasicMaterial color="#ffd27a" transparent opacity={0.85} depthTest={false} />
    </lineSegments>
  );
}

/** `?hotspots` outlines every hotspot box, for lining them up with the meshes. */
const SHOW_ALL_HOTSPOTS = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('hotspots');

function HotspotBox({ spot, active }: { spot: Hotspot; active: boolean }) {
  const card = propCardFor(spot.id);
  const target = useMemo<HoverTarget>(
    () =>
      spot.gameId
        ? { id: spot.id, kind: 'game', gameId: spot.gameId, label: GAME_LABEL[spot.gameId] ?? spot.gameId, hint: 'Inspect · play' }
        : { id: spot.id, kind: 'prop', label: card?.title ?? spot.id, hint: card?.action?.label ?? 'Memory card' },
    [spot.id, spot.gameId, card],
  );
  const [w, ht, d] = spot.size;
  const centre: [number, number, number] = [spot.at[0], spot.at[1], spot.at[2] - d / 2];
  return (
    <>
      <mesh position={centre} userData={{ interactable: target, volume: w * ht * d }}>
        <boxGeometry args={[w, ht, d]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {(active || SHOW_ALL_HOTSPOTS) && <Outline size={[w * 1.06 + 0.01, ht * 1.06 + 0.01, d * 1.06 + 0.01]} position={centre} />}
    </>
  );
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
  hotspots,
  activeId = null,
  children,
  lava,
}: RoomModelProps) {
  const url = MODEL_URL[id];
  const { scene } = useGLTF(url, false, true, withKtx2);
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

  useMemo(() => {
    if (lava?.length) squeezeLava(root, fitted.fitScale, fitted.offset, lava);
  }, [root, fitted, lava]);

  return (
    <group position={position} rotation={rotation}>
      <group position={fitted.offset} scale={fitted.fitScale}>
        <primitive object={root} />
      </group>
      {interactable && (
        <mesh
          position={[0, Math.max(fitted.size.y, 0.2) / 2, 0]}
          userData={{ interactable, volume: fitted.size.x * fitted.size.y * fitted.size.z }}
        >
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
        <Outline
          size={[fitted.size.x + 0.02, fitted.size.y + 0.02, fitted.size.z + 0.02]}
          position={[0, fitted.size.y / 2, 0]}
        />
      )}
      {hotspots?.map(spot => (
        <HotspotBox key={spot.id} spot={spot} active={activeId === spot.id} />
      ))}
      {children}
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
  useGLTF.preload(MODEL_URL[id], false, true, withKtx2);
});
