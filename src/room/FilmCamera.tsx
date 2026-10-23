import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BEANBAG_SEAT, LAYOUT, NEON_WALL } from './roomLayout';
import { EAST_X } from './videoRoom';

type V3 = [number, number, number];

export interface FilmShot {
  label: string;
  seconds: number;
  /** Lens for the shot, vertical degrees. */
  fov: number;
  /** Eye path (smooth curve through these). */
  at: V3[];
  /** What the lens follows along the way. */
  look: V3[];
  /** Room lights off for this shot. */
  lightsOut?: boolean;
}

const { dresser, crt, boombox, shelf, toyshelf, bed, window: win, clutterdesk, gameboy } = LAYOUT;

/**
 * The menu reel: a slow, almost free-cam walk round the room, one shot per
 * corner. The recorder (scripts/recordFilm.mjs) fades to black between shots.
 */
export const FILM: FilmShot[] = [
  {
    label: 'The TV wall',
    seconds: 7,
    fov: 60,
    at: [
      [0.35, 1.75, 2.2],
      [0.05, 1.55, 0.6],
      [-0.45, 1.32, -1.0],
    ],
    look: [
      [-0.6, 1.0, -2.6],
      [-0.7, 1.05, -2.6],
      [crt.x, crt.y + 0.28, crt.z],
    ],
  },
  {
    label: 'Across the rug',
    seconds: 7,
    fov: 58,
    at: [
      [1.3, 0.42, 0.9],
      [0.4, 0.38, -0.3],
      [-0.6, 0.5, -0.55],
    ],
    look: [
      [0.2, 0.1, -1.9],
      [-0.3, 0.15, -1.5],
      [boombox.x - 0.45, 0.3, boombox.z - 0.25],
    ],
  },
  {
    label: 'String lights',
    seconds: 6.5,
    fov: 55,
    at: [
      [0.7, 1.25, -0.6],
      [1.25, 1.45, -1.2],
      [1.7, 1.6, -1.35],
    ],
    look: [
      [shelf.x - 0.1, 1.1, shelf.z],
      [shelf.x, 1.2, shelf.z],
      [shelf.x + 0.2, 1.35, shelf.z + 0.1],
    ],
  },
  {
    label: 'Neon wall',
    seconds: 6,
    fov: 58,
    at: [
      [0.9, 1.2, -1.0],
      [1.3, 1.15, -0.2],
      [1.4, 1.1, 0.6],
    ],
    look: [
      [EAST_X, NEON_WALL.y + 0.05, NEON_WALL.z],
      [EAST_X, 1.0, -0.6],
      [toyshelf.x, 0.8, toyshelf.z],
    ],
  },
  {
    label: 'Bed and window',
    seconds: 6.5,
    fov: 58,
    at: [
      [-0.9, 1.1, 0.6],
      [-1.1, 1.3, -0.5],
      [-1.2, 1.45, -1.55],
    ],
    look: [
      [bed.x, 0.6, bed.z + 0.15],
      [bed.x - 0.05, 0.9, -1.2],
      [win.x, 1.3, win.z],
    ],
  },
  {
    label: 'The desk',
    seconds: 6,
    fov: 55,
    at: [
      [-1.0, 1.35, 0.6],
      [-1.2, 1.25, 1.3],
      [-1.35, 1.2, 2.1],
    ],
    look: [
      [clutterdesk.x - 0.07, 1.0, clutterdesk.z - 0.35],
      [clutterdesk.x - 0.07, 1.0, clutterdesk.z],
      [clutterdesk.x - 0.17, 1.05, clutterdesk.z + 0.15],
    ],
  },
  {
    label: 'Bean bag',
    seconds: 6,
    fov: 52,
    at: [
      [0.8, 0.9, 0.6],
      [0.3, 0.8, 1.0],
      [-0.5, 0.85, 0.9],
    ],
    look: [
      [gameboy.x, gameboy.y, gameboy.z],
      [gameboy.x, gameboy.y, gameboy.z],
      [BEANBAG_SEAT.at[0] + 0.12, 0.5, gameboy.z],
    ],
  },
  {
    label: 'Lights out',
    seconds: 8,
    fov: 66,
    lightsOut: true,
    // a slow pull back from the TV wall to the whole room, glowing
    at: [
      [0.4, 1.35, 0.4],
      [0.35, 1.6, 1.2],
      [0.25, 1.9, 2.0],
    ],
    look: [
      [0.0, 1.0, -2.4],
      [-0.1, 1.0, -2.5],
      [dresser.x + 0.55, 0.95, dresser.z + 0.2],
    ],
  },
];

/** When each shot starts and ends on the reel's clock, for the recorder's fades. */
export const FILM_CUTS = FILM.reduce<{ label: string; start: number; end: number }[]>((cuts, shot) => {
  const start = cuts.length ? cuts[cuts.length - 1].end : 0;
  cuts.push({ label: shot.label, start, end: start + shot.seconds });
  return cuts;
}, []);
export const FILM_SECONDS = FILM_CUTS[FILM_CUTS.length - 1].end;

/** Slow in, slow out, but never quite stopping, like an operator walking it. */
const glide = (t: number) => 0.12 * t + 0.88 * (t * t * (3 - 2 * t));

const POS = new THREE.Vector3();
const LOOK = new THREE.Vector3();

/**
 * Drives the camera along the reel. Time comes from the capture harness
 * (window.__tourTime) so frames are evenly spaced however slowly they render.
 */
export function FilmCamera({ onShot }: { onShot?: (shot: FilmShot, index: number) => void }) {
  const camera = useThree(state => state.camera) as THREE.PerspectiveCamera;
  const clock = useRef(0);
  const current = useRef(-1);
  const curves = useMemo(
    () =>
      FILM.map(shot => ({
        at: new THREE.CatmullRomCurve3(shot.at.map(p => new THREE.Vector3(...p)), false, 'centripetal'),
        look: new THREE.CatmullRomCurve3(shot.look.map(p => new THREE.Vector3(...p)), false, 'centripetal'),
      })),
    [],
  );

  useEffect(() => {
    (window as unknown as { __filmCuts?: typeof FILM_CUTS }).__filmCuts = FILM_CUTS;
  }, []);

  useFrame((_, delta) => {
    const driven = (window as unknown as { __tourTime?: number }).__tourTime;
    if (typeof driven === 'number') clock.current = driven;
    else clock.current = (clock.current + Math.min(delta, 0.05)) % FILM_SECONDS;
    const t = Math.min(clock.current, FILM_SECONDS - 1e-3);
    const index = Math.max(0, FILM_CUTS.findIndex(c => t < c.end));
    const cut = FILM_CUTS[index];
    const shot = FILM[index];
    if (index !== current.current) {
      current.current = index;
      onShot?.(shot, index);
    }
    const k = glide((t - cut.start) / shot.seconds);
    curves[index].at.getPoint(k, POS);
    curves[index].look.getPoint(k, LOOK);
    // Handheld: a few slow, unrelated sways, a couple of centimetres at most.
    POS.x += Math.sin(t * 0.9 + 1.3) * 0.008 + Math.sin(t * 2.3) * 0.003;
    POS.y += Math.sin(t * 1.4 + 0.4) * 0.006;
    LOOK.x += Math.sin(t * 0.7 + 2.1) * 0.012;
    LOOK.y += Math.sin(t * 1.1) * 0.008;
    camera.position.copy(POS);
    camera.lookAt(LOOK);
    camera.rotateZ(Math.sin(t * 0.6 + 0.8) * 0.006);
    if (camera.fov !== shot.fov) {
      camera.fov = shot.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
