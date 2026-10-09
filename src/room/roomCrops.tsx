import React, { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Art cut straight out of the reference painting and the clip, served from
 * /room. Names ending in `_full` are the painting's version of a prop that
 * also exists as a clip crop; alpha cut-outs are the small loose props.
 */
export const CROPS = [
  // clip crops used by the first pass
  'poster_sharks',
  'poster_rundmc',
  'poster_spacejam',
  'frames_west',
  'toyshelf',
  'dresser',
  'door',
  'ufo_poster',
  'coat',
  'desk_east',
  'tv_east',
  'deskchair',
  'bed_quilt',
  'bed_pillow',
  'nightstand_west',
  'boombox',
  'crt_play',
  'spine_monopoly',
  'spine_battleship',
  'spine_sorry',
  'spine_clue',
  'spine_life',
  'spine_yahtzee',
  // north wall, west to east
  'poster_sharks_full',
  'window_glass',
  'prints_west',
  'poster_rundmc_full',
  'photos_west',
  'poster_spacejam_full',
  'prints_north',
  'vcr_stack',
  'light_switch',
  'door_full',
  'dresser_full',
  'lava_north',
  'hat_hook',
  'coat_full',
  // west desk and nightstand
  'lava_west',
  'alarm_clock',
  'camera_blue',
  'books_west',
  'desk_lamp_ref',
  'teddy_nightstand',
  'mug',
  'skateboard_ref',
  'office_chair',
  // bed
  'pillow_smiley',
  'pillow_pattern',
  'goosebumps',
  'gushers',
  'gameboy',
  // dresser top and shelf top
  'teddy_green',
  'helmet',
  'smiley_plush',
  'rubiks',
  'figure_shelf_r',
  'figure_shelf_l',
  'figure_spiderman',
  'figure_mario',
  // floor
  'figure_green',
  'skates',
  'bat_lean',
  'car_red',
  'car_blue',
  'car_yellow',
  'tapes_floor',
  'mono_box_floor',
  // east wall
  'frames_east',
] as const;

export type CropName = (typeof CROPS)[number];
export type Crops = Record<CropName, THREE.Texture>;

export function useRoomCrops(): Crops {
  const urls = useMemo(() => CROPS.map(name => `/room/${name}.png`), []);
  const loaded = useLoader(THREE.TextureLoader, urls);
  return useMemo(() => {
    const out = {} as Crops;
    CROPS.forEach((name, i) => {
      const tex = loaded[i];
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      out[name] = tex;
    });
    return out;
  }, [loaded]);
}

/**
 * The reference art is already lit, so props re-emit their own map at partial
 * strength. That keeps the painted highlights readable without flattening the
 * room's real lights.
 */
export function paintedMaterial(map: THREE.Texture, emissive = 0.42, cutout = false) {
  return (
    <meshStandardMaterial
      map={map}
      emissive="#ffffff"
      emissiveMap={map}
      emissiveIntensity={emissive}
      roughness={0.82}
      metalness={0.04}
      transparent={cutout}
      alphaTest={cutout ? 0.35 : 0}
      side={cutout ? THREE.DoubleSide : THREE.FrontSide}
    />
  );
}

export function Solid({ color, rough = 0.85 }: { color: string; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={0.05} />;
}

/**
 * Alpha cut-out of a loose prop standing on a surface. The plane turns about
 * its vertical axis to face the player, so the painted prop reads from every
 * walking angle, and a soft contact shadow anchors it to the surface.
 */
export function Cutout({
  map,
  width,
  height,
  position,
  rotation = 0,
  emissive = 0.5,
  shadow = true,
}: {
  map: THREE.Texture;
  width: number;
  height: number;
  position: [number, number, number];
  /** Fixed yaw; only used when `face` is off. */
  rotation?: number;
  emissive?: number;
  shadow?: boolean;
}) {
  const plane = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    const m = plane.current;
    if (!m) return;
    m.getWorldPosition(WORLD);
    const yaw = Math.atan2(camera.position.x - WORLD.x, camera.position.z - WORLD.z);
    // undo the parent's yaw so the plane faces the camera in world space
    m.parent?.getWorldQuaternion(PARENT_Q);
    EULER.setFromQuaternion(PARENT_Q, 'YXZ');
    m.rotation.set(0, yaw - EULER.y, 0);
  });
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh ref={plane} position={[0, height / 2, 0]}>
        <planeGeometry args={[width, height]} />
        {paintedMaterial(map, emissive, true)}
      </mesh>
      {shadow && (
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[width * 0.42, 16]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.38} />
        </mesh>
      )}
    </group>
  );
}

const WORLD = new THREE.Vector3();
const PARENT_Q = new THREE.Quaternion();
const EULER = new THREE.Euler();

/**
 * Wrap a region of a painted crop around a tapered cylinder. The region is
 * tiled `copies` times side by side on a canvas so the painted front shows from
 * every angle without seams or alpha fringes -- the lava lamps use this.
 */
export function PaintedCone({
  map,
  region,
  radiusTop,
  radiusBottom,
  height,
  position,
  emissive = 1.0,
  copies = 2,
  color = '#1b1b22',
}: {
  map: THREE.Texture;
  /** u0, v0, u1, v1 of the crop to wrap (v measured from the top). */
  region: [number, number, number, number];
  radiusTop: number;
  radiusBottom: number;
  height: number;
  position: [number, number, number];
  emissive?: number;
  copies?: number;
  /** Cap and base colour. */
  color?: string;
}) {
  const wrapped = useMemo(() => {
    const img = map.image as HTMLImageElement | HTMLCanvasElement | undefined;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    if (ctx && img && img.width > 0) {
      const [u0, v0, u1, v1] = region;
      const sx = u0 * img.width;
      const sy = v0 * img.height;
      const sw = (u1 - u0) * img.width;
      const sh = (v1 - v0) * img.height;
      const slice = 256 / copies;
      for (let i = 0; i < copies; i += 1) {
        ctx.drawImage(img, sx, sy, sw, sh, i * slice, 0, slice, 256);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [map, region, copies]);
  const capR = radiusTop * 0.8;
  return (
    <group position={position}>
      <mesh position={[0, height / 2 + 0.02, 0]} castShadow>
        <cylinderGeometry args={[radiusTop, radiusBottom, height, 24, 1, true]} />
        {/* unlit: the glass is its own light source, so the painted colour stays pure */}
        <meshBasicMaterial map={wrapped} color={new THREE.Color(emissive, emissive, emissive)} />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <cylinderGeometry args={[radiusBottom * 0.75, radiusBottom * 1.05, 0.02, 20]} />
        <Solid color={color} rough={0.5} />
      </mesh>
      <mesh position={[0, height + 0.02 + 0.012, 0]}>
        <cylinderGeometry args={[capR * 0.8, capR, 0.025, 16]} />
        <Solid color={color} rough={0.5} />
      </mesh>
    </group>
  );
}

/** A thin box with painted art on the front: posters, boxes, books, consoles. */
export function ArtSlab({
  map,
  size,
  position,
  rotation = [0, 0, 0],
  color = '#201418',
  emissive = 0.48,
  top = false,
}: {
  map: THREE.Texture;
  size: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  emissive?: number;
  /** Put the art on the top face instead of the front. */
  top?: boolean;
}) {
  const [w, h, d] = size;
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[w, h, d]} />
        <Solid color={color} />
      </mesh>
      {top ? (
        <mesh position={[0, h / 2 + 0.0015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, d]} />
          {paintedMaterial(map, emissive)}
        </mesh>
      ) : (
        <mesh position={[0, 0, d / 2 + 0.0015]}>
          <planeGeometry args={[w, h]} />
          {paintedMaterial(map, emissive)}
        </mesh>
      )}
    </group>
  );
}
