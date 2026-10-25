import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BEANBAG_SEAT, LAYOUT, NEON_WALL } from './roomLayout';
import { EAST_X } from './videoRoom';
import { BOOK_SPOT } from './ispy/ISpyGame';
import { filmClock } from './filmClock';

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
  /** A toy world set up in the room for this shot. */
  world?: 'army' | 'ispy';
  /** The world drives the camera itself (the I Spy page follows its own finds). */
  director?: boolean;
}

const { dresser, crt, toyshelf, clutterdesk, gameboy, hotwheels } = LAYOUT;

/** The 1998 Furby sat up by the pillow (BED_FURBY in RealRoomScene, turned into room space). */
const BED_FURBY_AT: V3 = [-2.61, 0.6, -0.22];
const BOOK: V3 = [BOOK_SPOT.x, 0.02, BOOK_SPOT.z];

/**
 * The menu reel: a slow, almost free-cam walk round the room, one shot per
 * corner, with the toys out: the TV on Arthur, the Furby on the bed, the
 * army town popped up on the rug mid-battle, the race track, the I Spy book
 * and a page of it being played. The recorder (scripts/recordFilm.mjs)
 * fades to black between shots.
 */
export const FILM: FilmShot[] = [
  {
    label: 'The TV wall',
    seconds: 7,
    fov: 56,
    at: [
      [0.35, 1.75, 2.2],
      [0.0, 1.5, 0.4],
      [-0.6, 1.2, -1.45],
    ],
    look: [
      [-0.6, 1.0, -2.6],
      [-0.7, 1.05, -2.6],
      [crt.x, crt.y + 0.27, crt.z],
    ],
  },
  {
    label: 'Furby on the bed',
    seconds: 6,
    fov: 44,
    at: [
      [-1.55, 1.0, 0.55],
      [-1.8, 0.92, 0.1],
      [-1.85, 0.95, -0.4],
    ],
    look: [BED_FURBY_AT, BED_FURBY_AT, [BED_FURBY_AT[0], BED_FURBY_AT[1] + 0.02, BED_FURBY_AT[2] + 0.05]],
  },
  {
    label: 'Army town',
    seconds: 10,
    fov: 58,
    world: 'army',
    // Down out of the sky over the rug, low along the road through town, up past the tower to the tan army.
    at: [
      [1.35, 1.25, 1.0],
      [0.75, 0.3, 0.45],
      [0.27, 0.1, 0.0],
      [0.3, 0.12, -0.45],
      [0.8, 0.34, -0.85],
    ],
    look: [
      [0.2, 0.0, -0.35],
      [0.15, 0.04, -0.2],
      [0.2, 0.05, -0.7],
      [0.22, 0.04, -1.1],
      [0.22, 0.05, -1.14],
    ],
  },
  {
    label: 'Race track',
    seconds: 6,
    fov: 50,
    at: [
      [0.7, 0.55, 0.75],
      [0.62, 0.5, -0.25],
      [0.72, 0.55, -1.2],
    ],
    look: [
      [hotwheels.x, 0.18, hotwheels.z + 0.2],
      [hotwheels.x, 0.2, hotwheels.z],
      [hotwheels.x, 0.18, hotwheels.z - 0.2],
    ],
  },
  {
    label: 'Neon wall',
    seconds: 6,
    fov: 54,
    // Wide enough that the shelf's teddy and skateboard stay crisp.
    at: [
      [0.6, 1.35, -1.2],
      [0.7, 1.3, -0.3],
      [0.6, 1.3, 0.9],
    ],
    look: [
      [EAST_X, NEON_WALL.y + 0.05, NEON_WALL.z],
      [EAST_X - 0.2, 1.0, -0.6],
      [toyshelf.x, 0.75, toyshelf.z],
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
    label: 'The I Spy book',
    seconds: 5,
    fov: 48,
    at: [
      [-0.15, 0.62, 1.0],
      [-0.5, 0.5, 0.95],
      [-0.85, 0.45, 0.8],
    ],
    look: [BOOK, BOOK, BOOK],
  },
  {
    label: 'I Spy',
    seconds: 14,
    fov: 60,
    world: 'ispy',
    director: true,
    at: [[0, 1, 0]],
    look: [[0, 0, 0]],
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
    filmClock.t = t;
    filmClock.shot = index;
    filmClock.shotT = t - cut.start;
    // The I Spy page frames its own shots.
    if (shot.director) return;
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
