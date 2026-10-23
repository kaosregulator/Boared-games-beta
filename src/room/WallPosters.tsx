import React, { Suspense, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { EAST_X, NORTH_Z, SOUTH_Z, WEST_X } from './videoRoom';

/**
 * The posters a kid put up: the two movie one-sheets went in proper frames
 * either side of the window; the game and album art is tacked straight to the
 * wall with pushpins, the way it came out of the magazine or the CD shop.
 * Everything sits flush, a few millimetres off the wall.
 */

type Wall = 'north' | 'south' | 'east' | 'west';

interface PosterSpec {
  file: string;
  wall: Wall;
  /** Position along the wall (x on north/south, z on east/west), metres. */
  along: number;
  /** Centre height. */
  y: number;
  /** Width; height follows the picture. */
  w: number;
  aspect: number;
  framed?: boolean;
  /** A touch of tilt, as hung by hand. */
  tilt?: number;
}

export const POSTERS: PosterSpec[] = [
  // north: above the game shelf and above the window
  { file: 'super-mario-64.jpg', wall: 'north', along: 2.25, y: 2.56, w: 0.62, aspect: 768 / 536, tilt: 0.01 },
  { file: 'zelda-ocarina.jpg', wall: 'north', along: -2.32, y: 2.56, w: 0.62, aspect: 768 / 534, tilt: -0.012 },
  // south: the two movie one-sheets, true 27 x 40 in size, framed either side of the window
  { file: 'jurassic-park.jpg', wall: 'south', along: 1.72, y: 1.95, w: 0.62, aspect: 689 / 1024, framed: true },
  { file: 'toy-story.jpg', wall: 'south', along: -1.98, y: 1.95, w: 0.62, aspect: 686 / 1024, framed: true },
  // east: over the desk, clear of the neon wall
  { file: 'street-fighter-2.jpg', wall: 'east', along: -0.3, y: 2.05, w: 0.44, aspect: 597 / 768, tilt: 0.015 },
  // west: over the bed and over the desk
  { file: 'nirvana-nevermind.jpg', wall: 'west', along: -1.46, y: 2.08, w: 0.5, aspect: 1, tilt: -0.01 },
  { file: '2pac-all-eyez.jpg', wall: 'west', along: 0.8, y: 2.0, w: 0.5, aspect: 1, tilt: 0.008 },
];

const GAP = 0.006;

/** Where a poster hangs and which way it faces. */
function placement(p: PosterSpec): { pos: [number, number, number]; rotY: number } {
  switch (p.wall) {
    case 'north':
      return { pos: [p.along, p.y, NORTH_Z + GAP], rotY: 0 };
    case 'south':
      return { pos: [p.along, p.y, SOUTH_Z - GAP], rotY: Math.PI };
    case 'east':
      return { pos: [EAST_X - GAP, p.y, p.along], rotY: -Math.PI / 2 };
    default:
      return { pos: [WEST_X + GAP, p.y, p.along], rotY: Math.PI / 2 };
  }
}

function Pin({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <mesh position={[x, y, 0.004]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.006, 0.006, 0.006, 12]} />
      <meshStandardMaterial color={color} roughness={0.35} />
    </mesh>
  );
}

function Poster({ spec }: { spec: PosterSpec }) {
  const tex = useTexture(`/room/posters/${spec.file}`);
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
  }, [tex]);
  const { pos, rotY } = placement(spec);
  const w = spec.w;
  const h = w / spec.aspect;
  if (spec.framed) {
    const border = 0.022;
    const depth = 0.022;
    return (
      <group position={pos} rotation={[0, rotY, 0]}>
        {/* frame: four mitred sides */}
        {[
          [0, h / 2 + border / 2, w + border * 2, border],
          [0, -h / 2 - border / 2, w + border * 2, border],
          [-w / 2 - border / 2, 0, border, h],
          [w / 2 + border / 2, 0, border, h],
        ].map(([x, y, fw, fh], k) => (
          <mesh key={k} position={[x, y, depth / 2]}>
            <boxGeometry args={[fw, fh, depth]} />
            <meshStandardMaterial color="#161214" roughness={0.45} metalness={0.2} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.004]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial map={tex} roughness={0.6} />
        </mesh>
        {/* the glass: a faint sheen over the print */}
        <mesh position={[0, 0, depth - 0.003]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.06} roughness={0.05} metalness={0.9} depthWrite={false} />
        </mesh>
      </group>
    );
  }
  return (
    <group position={pos} rotation={[0, rotY, spec.tilt ?? 0]}>
      <mesh position={[0, 0, 0.001]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={tex} roughness={0.78} />
      </mesh>
      <Pin x={-w / 2 + 0.02} y={h / 2 - 0.02} color="#d9342b" />
      <Pin x={w / 2 - 0.02} y={h / 2 - 0.02} color="#2f6fd6" />
      <Pin x={-w / 2 + 0.02} y={-h / 2 + 0.02} color="#f2c230" />
      <Pin x={w / 2 - 0.02} y={-h / 2 + 0.02} color="#3db86a" />
    </group>
  );
}

export function WallPosters() {
  return (
    <Suspense fallback={null}>
      {POSTERS.map(p => (
        <Poster key={p.file} spec={p} />
      ))}
    </Suspense>
  );
}
