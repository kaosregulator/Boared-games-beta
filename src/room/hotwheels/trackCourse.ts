import * as THREE from 'three';

/**
 * Orange Hot Wheels plastic laid through the bedroom. The car is locked in
 * the groove, so a loop can turn it upside down and the camera rolls the
 * whole room with it. The shell is 6.0m by 5.5m; this course stays inside it.
 */

export interface TrackFrame {
  p: THREE.Vector3;
  tangent: THREE.Vector3;
  up: THREE.Vector3;
  right: THREE.Vector3;
  /** 0..1 along the closed lap. */
  u: number;
  loop: boolean;
  cave: boolean;
}

export interface LoopDef {
  x: number;
  y: number;
  z: number;
  r: number;
}

const y0 = 0.055;

/** Big loop in the open floor south of the card table, in the XY plane. */
export const LOOP_BIG: LoopDef = { x: 0.42, y: 0.74, z: 0.82, r: 0.58 };
/** Smaller loop on the north run, also in the XY plane. */
export const LOOP_SMALL: LoopDef = { x: 0.78, y: 0.46, z: -1.02, r: 0.36 };
const LOOPS = [LOOP_BIG, LOOP_SMALL];

function v(x: number, y: number, z: number) {
  return new THREE.Vector3(x, y, z);
}

function pushLoop(pts: THREE.Vector3[], loop: LoopDef, dir: 1 | -1) {
  const steps = 40;
  for (let i = 0; i < steps; i++) {
    const theta = -Math.PI / 2 + dir * (i / steps) * Math.PI * 2;
    pts.push(v(loop.x + Math.cos(theta) * loop.r, loop.y + Math.sin(theta) * loop.r, loop.z));
  }
}

function coursePoints() {
  const pts: THREE.Vector3[] = [
    // Flat start on the open floor, just west of the toy.
    v(0.95, y0, 0.22),
    v(0.55, y0, -0.02),
    // Bridge over the card table. Spread the crest so the camera doesn't snap.
    v(0.5, 0.08, -0.02),
    v(0.22, 0.24, -0.14),
    v(0.0, 0.5, -0.22),
    v(-0.22, 0.74, -0.28),
    v(-0.48, 0.46, -0.36),
    v(-0.7, 0.16, -0.5),
    v(-0.82, 0.06, -0.68),
    // High ramp over the boombox and the floor toys.
    v(-0.48, y0, -0.85),
    v(-0.55, 0.28, -1.05),
    v(-0.7, 0.58, -1.18),
    v(-0.92, 0.9, -1.24),
    v(-1.15, 1.05, -1.18),
    v(-1.38, 0.72, -1.08),
    v(-1.55, 0.32, -1.05),
    v(-1.7, 0.1, -1.12),
    // North mouth of the bed cave, then out the south side.
    v(-2.02, 0.08, -1.2),
    v(-2.16, 0.065, -0.85),
    v(-2.2, 0.06, -0.4),
    v(-2.18, 0.06, 0.05),
    v(-2.08, 0.065, 0.28),
    v(-1.62, 0.07, 0.36),
    v(-1.05, y0, 0.62),
    v(-0.45, y0, 0.8),
    v(0.0, 0.08, LOOP_BIG.z),
  ];
  pushLoop(pts, LOOP_BIG, 1);
  pts.push(
    v(LOOP_BIG.x + LOOP_BIG.r + 0.22, y0, LOOP_BIG.z),
    v(1.45, y0, 0.7),
    v(1.62, y0, 0.2),
    v(1.55, y0, -0.35),
    v(1.2, y0, -0.7),
    v(LOOP_SMALL.x + LOOP_SMALL.r + 0.28, 0.08, LOOP_SMALL.z),
  );
  // Arrive from the east, so the circle climbs toward the west.
  pushLoop(pts, LOOP_SMALL, -1);
  pts.push(
    v(LOOP_SMALL.x - LOOP_SMALL.r - 0.2, y0, LOOP_SMALL.z),
    v(0.15, y0, -0.72),
    v(0.35, y0, -0.28),
    v(0.7, y0, 0.05),
  );
  return pts;
}

const _UP = new THREE.Vector3(0, 1, 0);

function loopUp(p: THREE.Vector3) {
  let best: THREE.Vector3 | null = null;
  let bestErr = 0.18;
  for (const loop of LOOPS) {
    if (Math.abs(p.z - loop.z) > 0.2) continue;
    const dx = p.x - loop.x;
    const dy = p.y - loop.y;
    const radial = Math.hypot(dx, dy);
    const err = Math.abs(radial - loop.r);
    if (err < bestErr && p.y > 0.1) {
      bestErr = err;
      const up = new THREE.Vector3(loop.x - p.x, loop.y - p.y, 0);
      if (up.lengthSq() > 1e-6) best = up.normalize();
    }
  }
  return best;
}

function buildFrames(): TrackFrame[] {
  const curve = new THREE.CatmullRomCurve3(coursePoints(), true, 'centripetal');
  const n = 420;
  const frames: TrackFrame[] = [];
  let prevUp = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const p = curve.getPointAt(u);
    const tangent = curve.getTangentAt(u);
    if (tangent.lengthSq() < 1e-8) tangent.set(0, 0, 1);
    tangent.normalize();
    const cave = p.x < -1.9 && p.z > -1.35 && p.z < 0.4;
    const forced = loopUp(p);
    // Parallel-transport the roof so a crest doesn't spin the camera, then
    // pin loops so the roof aims at the center (upside down at the top).
    const up = prevUp.clone().addScaledVector(tangent, -prevUp.dot(tangent));
    if (up.lengthSq() < 1e-8) up.copy(prevUp);
    up.normalize();
    if (forced) {
      const toward = forced.clone().addScaledVector(tangent, -forced.dot(tangent));
      if (toward.lengthSq() > 1e-8) up.copy(toward.normalize());
    } else if (Math.abs(tangent.y) < 0.4) {
      const flat = _UP.clone().addScaledVector(tangent, -tangent.y);
      if (flat.lengthSq() > 1e-6) up.lerp(flat.normalize(), 0.45).normalize();
    }
    if (!forced && up.y < 0) {
      const repaired = _UP.clone().addScaledVector(tangent, -tangent.y);
      if (repaired.lengthSq() > 1e-6) up.copy(repaired.normalize());
    }
    const right = new THREE.Vector3().crossVectors(up, tangent);
    if (right.lengthSq() < 1e-4) {
      right.crossVectors(prevUp, tangent);
      if (right.lengthSq() < 1e-4) right.set(1, 0, 0);
    }
    right.normalize();
    up.crossVectors(tangent, right).normalize();
    if (!forced && up.y < 0) {
      right.negate();
      up.crossVectors(tangent, right).normalize();
    }
    if (!forced) {
      const clamped = Math.min(1, Math.max(-1, prevUp.dot(up)));
      const angle = Math.acos(clamped);
      const max = 0.22;
      if (angle > max) {
        up.lerpVectors(prevUp, up, max / angle);
        up.addScaledVector(tangent, -up.dot(tangent));
        if (up.lengthSq() > 1e-8) up.normalize();
        right.crossVectors(up, tangent);
        if (right.lengthSq() > 1e-8) right.normalize();
      }
    }
    prevUp = up;
    frames.push({ p, tangent, up, right, u, loop: Boolean(forced), cave });
  }
  return frames;
}

export const TRACK_FRAMES = buildFrames();

export const TRACK_LENGTH = TRACK_FRAMES.reduce((sum, frame, i) => {
  const next = TRACK_FRAMES[(i + 1) % TRACK_FRAMES.length];
  return sum + frame.p.distanceTo(next.p);
}, 0);

function closestTo(x: number, y: number, z: number) {
  const target = new THREE.Vector3(x, y, z);
  let best = TRACK_FRAMES[0];
  let bestD = Infinity;
  for (const frame of TRACK_FRAMES) {
    const d = frame.p.distanceToSquared(target);
    if (d < bestD) {
      bestD = d;
      best = frame;
    }
  }
  return best;
}

export const TRACK_MARKS = {
  start: closestTo(0.95, y0, 0.22),
  /** Flat approach, with the table bridge rising ahead. */
  ramp: closestTo(0.55, y0, -0.02),
  /** Crest of the high ramp, for a nitro can. */
  crest: closestTo(-1.12, 1.08, -1.22),
  cave: closestTo(-2.2, 0.06, -0.4),
  caveMouth: closestTo(-2.02, 0.08, -1.2),
  loopTop: closestTo(LOOP_BIG.x, LOOP_BIG.y + LOOP_BIG.r, LOOP_BIG.z),
  loopSmall: closestTo(LOOP_SMALL.x, LOOP_SMALL.y + LOOP_SMALL.r, LOOP_SMALL.z),
};

export const NITRO_SPOTS = [TRACK_MARKS.crest, TRACK_MARKS.caveMouth, TRACK_MARKS.loopTop, TRACK_MARKS.loopSmall];

function ribbon(half: number, lift: number, shift: number) {
  const geo = new THREE.BufferGeometry();
  const n = TRACK_FRAMES.length;
  const pos = new Float32Array(n * 2 * 3);
  const nrm = new Float32Array(n * 2 * 3);
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const f = TRACK_FRAMES[i];
    const l = f.p.clone().addScaledVector(f.right, -half + shift).addScaledVector(f.up, lift);
    const r = f.p.clone().addScaledVector(f.right, half + shift).addScaledVector(f.up, lift);
    pos.set([l.x, l.y, l.z, r.x, r.y, r.z], i * 6);
    nrm.set([f.up.x, f.up.y, f.up.z, f.up.x, f.up.y, f.up.z], i * 6);
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    const b = ((i + 1) % n) * 2;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setIndex(idx);
  return geo;
}

export const LANE_HALF = 0.09;

export function deckGeometry() {
  return ribbon(LANE_HALF, 0.018, 0);
}

export function deckUnderside() {
  return ribbon(LANE_HALF, 0.004, 0);
}

export function railGeometry(side: -1 | 1) {
  return ribbon(0.012, 0.05, side * (LANE_HALF + 0.004));
}

export function caveGeometry() {
  const pts = TRACK_FRAMES.filter(f => f.cave).map(f => f.p.clone());
  if (pts.length < 8) return null;
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.16, 14, false);
}

export function frameAt(u: number) {
  const n = TRACK_FRAMES.length;
  const wrapped = ((u % 1) + 1) % 1;
  const x = wrapped * n;
  const i = Math.floor(x) % n;
  const j = (i + 1) % n;
  const t = x - Math.floor(x);
  const a = TRACK_FRAMES[i];
  const b = TRACK_FRAMES[j];
  return {
    p: a.p.clone().lerp(b.p, t),
    tangent: a.tangent.clone().lerp(b.tangent, t).normalize(),
    up: a.up.clone().lerp(b.up, t).normalize(),
    right: a.right.clone().lerp(b.right, t).normalize(),
    loop: a.loop || b.loop,
    cave: a.cave || b.cave,
  };
}
