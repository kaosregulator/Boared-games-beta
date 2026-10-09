import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
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
 * Alpha cut-out of a loose prop standing on a surface. Two crossed planes so it
 * reads from every walking angle, plus a soft contact shadow underneath.
 */
export function Cutout({
  map,
  width,
  height,
  position,
  rotation = 0,
  emissive = 0.5,
  cross = true,
  shadow = true,
}: {
  map: THREE.Texture;
  width: number;
  height: number;
  position: [number, number, number];
  rotation?: number;
  emissive?: number;
  cross?: boolean;
  shadow?: boolean;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, height / 2, 0]}>
        <planeGeometry args={[width, height]} />
        {paintedMaterial(map, emissive, true)}
      </mesh>
      {cross && (
        <mesh position={[0, height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[width * 0.8, height]} />
          {paintedMaterial(map, emissive, true)}
        </mesh>
      )}
      {shadow && (
        <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[width * 0.42, 16]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.38} />
        </mesh>
      )}
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
