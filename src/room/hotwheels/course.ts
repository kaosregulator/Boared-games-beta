import * as THREE from 'three';
import { DESK_TOP } from './world';

/**
 * The orange plastic, laid around the bedroom.
 *
 * Pieces are open strips (floor runs, ramps, the desk top) plus two loops.
 * The car is never glued to a strip: the strip is just a surface it can
 * drive on, so you can follow it or leave it. Raised strips have side rails
 * that keep you on; floor strips you can drive straight across.
 *
 * Lap, seen from the doorway: finish line on the north run, loop, the
 * tunnel under the bed, the big jump over the rug, the powered climb that
 * throws you onto the desk, across the desk, off the edge, and back north
 * through the second loop to the line.
 */

export interface Frame {
  p: THREE.Vector3;
  tangent: THREE.Vector3;
  up: THREE.Vector3;
  right: THREE.Vector3;
}

export interface Piece {
  id: string;
  frames: Frame[];
  half: number;
  /** Chain lift: carries the car up at this speed, gravity or not. 0 = none. */
  lift: number;
  /** Side rails stop you sliding off. Floor pieces have none you'd notice. */
  railed: boolean;
}

export interface Loop {
  id: string;
  /** Floor point where the car leaves the entry run. */
  base: THREE.Vector3;
  /** Travel direction on the floor. */
  dir: THREE.Vector3;
  /** Sideways step so the exit clears the entry, like the real clamp. */
  side: THREE.Vector3;
  r: number;
  shift: number;
  frames: Frame[];
}

export interface Booster {
  p: THREE.Vector3;
  tangent: THREE.Vector3;
  up: THREE.Vector3;
  right: THREE.Vector3;
}

const FLOOR = 0.01;
const DECK = DESK_TOP + 0.01;
export const LANE_HALF = 0.085;
const _UP = new THREE.Vector3(0, 1, 0);

type P = [number, number, number];

function framesFrom(points: P[], spacing = 0.02): Frame[] {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  const n = Math.max(2, Math.ceil(curve.getLength() / spacing));
  const frames: Frame[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const p = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, _UP);
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
    right.normalize();
    const up = new THREE.Vector3().crossVectors(right, tangent).normalize();
    frames.push({ p, tangent, up, right });
  }
  return frames;
}

function piece(id: string, points: P[], opts: { lift?: number; railed?: boolean; half?: number } = {}): Piece {
  const frames = framesFrom(points);
  const railed = opts.railed ?? frames.some(f => f.p.y > 0.05);
  return { id, frames, half: opts.half ?? LANE_HALF, lift: opts.lift ?? 0, railed };
}

function loop(id: string, x: number, z: number, heading: number, r: number, shift: number): Loop {
  const dir = new THREE.Vector3(Math.cos(heading), 0, Math.sin(heading));
  // + shift steps left of travel, seen from above; - steps right.
  const side = new THREE.Vector3(dir.z, 0, -dir.x).multiplyScalar(Math.sign(shift) || 1);
  const base = new THREE.Vector3(x, FLOOR, z);
  const frames: Frame[] = [];
  const steps = 96;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const th = t * Math.PI * 2;
    const lat = Math.abs(shift) * (t - Math.sin(th) / (Math.PI * 2));
    const p = base.clone()
      .addScaledVector(dir, r * Math.sin(th))
      .addScaledVector(_UP, r * (1 - Math.cos(th)))
      .addScaledVector(side, lat);
    const dLat = Math.abs(shift) * (1 - Math.cos(th)) / (Math.PI * 2);
    const tangent = dir.clone().multiplyScalar(r * Math.cos(th))
      .addScaledVector(_UP, r * Math.sin(th))
      .addScaledVector(side, dLat)
      .normalize();
    const center = base.clone().addScaledVector(_UP, r).addScaledVector(side, lat);
    const up = center.sub(p);
    up.addScaledVector(tangent, -up.dot(tangent)).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    frames.push({ p, tangent, up, right });
  }
  return { id, base, dir, side, r, shift: Math.abs(shift), frames };
}

/** Heading angles in the XZ plane: 0 = east (+x), PI/2 = south (+z). */
const WEST = Math.PI;
const NORTH = -Math.PI / 2;

export const LOOP_A = loop('loop-a', 0.32, -0.8, WEST, 0.2, 0.22);
export const LOOP_B = loop('loop-b', 1.72, 1.0, NORTH, 0.19, -0.12);

const loopAExit = LOOP_A.base.clone().addScaledVector(LOOP_A.side, LOOP_A.shift);
const loopBExit = LOOP_B.base.clone().addScaledVector(LOOP_B.side, LOOP_B.shift);

const f = FLOOR;

export const PIECES: Piece[] = [
  // North run: from the second loop, past the finish line, into the first loop.
  piece('north', [
    [loopBExit.x, f, loopBExit.z],
    [loopBExit.x, f, 0.5],
    [1.86, f, 0.0],
    [1.88, f, -0.4],
    [1.78, f, -0.7],
    [1.5, f, -0.83],
    [1.25, f, -0.82],
    [0.9, f, -0.8],
    [0.6, f, -0.8],
    [LOOP_A.base.x, f, LOOP_A.base.z],
  ]),
  // Out of the first loop, round to the head of the bed, under it, out by the closet desk.
  piece('bed-run', [
    [loopAExit.x, f, loopAExit.z],
    [0.0, f, -0.58],
    [-0.55, f, -0.62],
    [-0.95, f, -0.74],
    [-1.3, f, -1.08],
    [-1.52, f, -1.5],
    [-1.75, f, -1.74],
    [-1.98, f, -1.68],
    [-2.04, f, -1.4],
    [-2.0, f, -1.0],
    [-1.98, f, -0.5],
    [-1.98, f, -0.05],
    [-1.92, f, 0.2],
    [-1.74, f, 0.34],
    [-1.5, f, 0.38],
  ]),
  // Powered launch ramp toward the rug: the long jump.
  piece('jump', [
    [-1.5, f, 0.38],
    [-1.32, 0.05, 0.43],
    [-1.16, 0.2, 0.49],
    [-1.02, 0.34, 0.54],
    [-0.93, 0.4, 0.57],
  ], { lift: 1.62, railed: true }),
  // Landing ramp over the card deck, then round the snacks to the desk climb.
  piece('landing', [
    [-0.3, 0.2, 0.8],
    [-0.08, 0.13, 0.89],
    [0.14, 0.07, 0.97],
    [0.34, 0.025, 1.06],
    [0.5, f, 1.13],
    [0.66, f, 1.17],
    [0.8, f, 1.2],
  ], { railed: false }),
  // Chain-lift up to desk height, curling south at the top so the lip throws
  // you along the computer desk's front edge.
  piece('climb', [
    [0.8, f, 1.2],
    [1.05, 0.08, 1.2],
    [1.32, 0.28, 1.14],
    [1.58, 0.47, 1.08],
    [1.78, 0.6, 1.07],
    [1.95, 0.68, 1.1],
    [2.06, 0.71, 1.17],
    [2.12, 0.72, 1.26],
    [2.14, 0.725, 1.34],
  ], { lift: 1.38, railed: true }),
  // Along the front lip of the computer desk, past the keyboard, round the
  // corner in front of the printer.
  piece('desk', [
    [2.16, DECK, 1.42],
    [2.19, DECK, 1.56],
    [2.19, DECK, 1.9],
    [2.2, DECK, 2.22],
    [2.29, DECK, 2.4],
    [2.25, DECK, 2.53],
    [2.08, DECK, 2.58],
  ], { railed: true }),
  // Down off the desk, curling north beside the army men.
  piece('drop', [
    [2.08, DECK, 2.58],
    [1.9, DECK - 0.08, 2.58],
    [1.74, 0.42, 2.54],
    [1.63, 0.24, 2.4],
    [1.6, 0.1, 2.2],
    [1.62, 0.02, 1.95],
    [1.63, f, 1.65],
    [1.66, f, 1.38],
  ], { railed: true }),
  // North under the climb into the second loop.
  piece('loop-b-run', [
    [1.66, f, 1.38],
    [1.7, f, 1.2],
    [LOOP_B.base.x, f, LOOP_B.base.z],
  ], { railed: false }),
];

export const LOOPS = [LOOP_A, LOOP_B];

function at(pieceId: string, u: number): Booster {
  const p = PIECES.find(x => x.id === pieceId)!;
  const fr = p.frames[Math.round(u * (p.frames.length - 1))];
  return { p: fr.p.clone(), tangent: fr.tangent.clone(), up: fr.up.clone(), right: fr.right.clone() };
}

/** Spinning-tyre boosters, the real Hot Wheels kind. */
export const BOOSTERS: Booster[] = [
  at('north', 0.8),
  at('bed-run', 0.93),
  at('landing', 0.8),
  at('loop-b-run', 0.3),
];

/** Finish line across the north run. */
export const FINISH = (() => {
  const b = nearest('north', 1.15, -0.82);
  return { ...b, half: 0.3 };
})();

/** Nitro cans: two on the course, two hidden for explorers. */
export const NITRO_SPOTS: THREE.Vector3[] = [
  at('bed-run', 0.72).p,
  at('desk', 0.45).p,
  new THREE.Vector3(2.75, FLOOR, 1.9), // back of the knee hole, under the desk
  new THREE.Vector3(-2.5, FLOOR, -0.9), // deep under the bed, by the headboard
];

function nearest(pieceId: string, x: number, z: number): Booster {
  const p = PIECES.find(pc => pc.id === pieceId)!;
  let best = p.frames[0];
  for (const fr of p.frames) if (Math.hypot(fr.p.x - x, fr.p.z - z) < Math.hypot(best.p.x - x, best.p.z - z)) best = fr;
  return { p: best.p.clone(), tangent: best.tangent.clone(), up: best.up.clone(), right: best.right.clone() };
}

/**
 * The nearest floor-level-or-higher bit of the lap to (x, z), facing the way
 * the lap runs: where a car that came off in a race gets put back.
 */
export function backOnTrack(x: number, z: number) {
  let best: Frame | null = null;
  let bestD = Infinity;
  for (const pc of PIECES) {
    // Not onto a chain lift or a jump ramp mid-climb: you'd just fall off again.
    if (pc.lift > 0) continue;
    for (const fr of pc.frames) {
      const d = Math.hypot(fr.p.x - x, fr.p.z - z);
      if (d < bestD) {
        bestD = d;
        best = fr;
      }
    }
  }
  const fr = best ?? PIECES[0].frames[0];
  return { p: fr.p.clone(), heading: Math.atan2(fr.tangent.z, fr.tangent.x) };
}

export function startPose() {
  const s = nearest('north', 1.42, -0.83);
  return { p: s.p.clone(), heading: Math.atan2(s.tangent.z, s.tangent.x) };
}

// ---------------------------------------------------------------------------
// Surface lookup. Segments are bucketed on a coarse grid so a query only
// checks the plastic near the car.

interface Seg {
  piece: Piece;
  a: Frame;
  b: Frame;
}

const CELL = 0.25;
const grid = new Map<string, Seg[]>();

function key(ix: number, iz: number) {
  return `${ix},${iz}`;
}

for (const pc of PIECES) {
  for (let i = 0; i < pc.frames.length - 1; i++) {
    const seg = { piece: pc, a: pc.frames[i], b: pc.frames[i + 1] };
    const reach = pc.half + 0.05;
    const x0 = Math.floor((Math.min(seg.a.p.x, seg.b.p.x) - reach) / CELL);
    const x1 = Math.floor((Math.max(seg.a.p.x, seg.b.p.x) + reach) / CELL);
    const z0 = Math.floor((Math.min(seg.a.p.z, seg.b.p.z) - reach) / CELL);
    const z1 = Math.floor((Math.max(seg.a.p.z, seg.b.p.z) + reach) / CELL);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const k = key(ix, iz);
        const list = grid.get(k);
        if (list) list.push(seg);
        else grid.set(k, [seg]);
      }
    }
  }
}

export interface TrackHit {
  y: number;
  piece: Piece;
  /** Signed distance from the centre line, + is right of travel. */
  lateral: number;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
}

/**
 * Highest bit of plastic under (x, z) that the car could be standing on:
 * nothing more than `maxY` above the floor of the query.
 */
export function trackUnder(x: number, z: number, maxY: number, slack = 0): TrackHit | null {
  const list = grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (!list) return null;
  let best: TrackHit | null = null;
  for (const seg of list) {
    const ax = seg.a.p.x;
    const az = seg.a.p.z;
    const dx = seg.b.p.x - ax;
    const dz = seg.b.p.z - az;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-10) continue;
    const t = ((x - ax) * dx + (z - az) * dz) / len2;
    // A little past each end, so the outside of a bend has no gaps between segments.
    if (t < -0.35 || t > 1.35) continue;
    const tc = Math.min(1, Math.max(0, t));
    const cx = ax + dx * tc;
    const cz = az + dz * tc;
    const len = Math.sqrt(len2);
    // Right of travel in XZ is (-dz, dx) for +y up.
    const lateral = ((x - cx) * -dz + (z - cz) * dx) / len;
    if (Math.abs(lateral) > seg.piece.half + slack) continue;
    const y = seg.a.p.y + (seg.b.p.y - seg.a.p.y) * tc;
    if (y > maxY) continue;
    if (!best || y > best.y) {
      const tangent = seg.b.p.clone().sub(seg.a.p).normalize();
      best = { y, piece: seg.piece, lateral, tangent, right: seg.a.right };
    }
  }
  return best;
}

export const COURSE_FLOOR = FLOOR;
