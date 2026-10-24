import * as THREE from 'three';
import { BLOCKS, ROOM } from './world';
import { BOOSTERS, LOOPS, NITRO_SPOTS, trackUnder, type Loop, type Piece } from './course';

/**
 * Arcade toy-car driving, written for this room. Ideas borrowed from
 * DyanGao/Car-Mini-Game (low "toy" gravity, chase camera behind the car,
 * R to reset), none of its code: that game runs on cannon.js and this
 * room needs a car that can be 2cm tall under a bed and still feel solid.
 *
 * Units are metres and seconds. A 1:64 car is about 12cm long.
 */

export const CAR = {
  length: 0.12,
  radius: 0.042,
  height: 0.04,
};

export const TUNING = {
  /** Toy gravity, so jumps hang long enough to enjoy. */
  gravity: 3.2,
  topSpeed: 0.85,
  reverseSpeed: 0.3,
  accel: 1.15,
  brake: 2.6,
  coast: 0.55,
  nitroSpeed: 1.3,
  nitroAccel: 2.4,
  nitroTime: 1.6,
  boostSpeed: 1.3,
  boostTime: 0.7,
  turnRate: 3.1,
  /** Tallest lip the wheels roll up without a ramp. */
  step: 0.036,
  /** Loops always carry the car round at least this fast. */
  loopSpeed: 0.95,
};

export interface DriveInput {
  throttle: number;
  steer: number;
  nitro: boolean;
}

export type CarMode = 'ground' | 'air' | 'loop';

export interface CarState {
  pos: THREE.Vector3;
  heading: number;
  speed: number;
  vel: THREE.Vector3;
  mode: CarMode;
  airTime: number;
  normal: THREE.Vector3;
  piece: Piece | null;
  loop: Loop | null;
  loopS: number;
  nitroLeft: number;
  nitroCans: number;
  boostLeft: number;
  taken: boolean[];
  boosterCool: number[];
  /** Smoothed car orientation for drawing and the hood camera. */
  quat: THREE.Quaternion;
}

export type SimEvent = 'boost' | 'loop' | 'land' | 'bump' | 'nitro-pickup' | 'nitro' | 'launch';

export function newCar(p: THREE.Vector3, heading: number): CarState {
  const car: CarState = {
    pos: p.clone(),
    heading,
    speed: 0,
    vel: new THREE.Vector3(),
    mode: 'ground',
    airTime: 0,
    normal: new THREE.Vector3(0, 1, 0),
    piece: null,
    loop: null,
    loopS: 0,
    nitroLeft: 0,
    nitroCans: 0,
    boostLeft: 0,
    taken: NITRO_SPOTS.map(() => false),
    boosterCool: BOOSTERS.map(() => 0),
    quat: new THREE.Quaternion(),
  };
  orient(car, 1);
  return car;
}

export function placeCar(car: CarState, p: THREE.Vector3, heading: number) {
  car.pos.copy(p);
  car.heading = heading;
  car.speed = 0;
  car.vel.set(0, 0, 0);
  car.mode = 'ground';
  car.loop = null;
  car.airTime = 0;
  car.boostLeft = 0;
  car.nitroLeft = 0;
  orient(car, 1);
}

interface Ground {
  y: number;
  piece: Piece | null;
}

/** Highest surface under (x, z) that is not above `maxY`. */
export function groundAt(x: number, z: number, maxY: number): Ground {
  let y = 0;
  let piece: Piece | null = null;
  for (const b of BLOCKS) {
    if (b.top === false) continue;
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
    if (b.maxY <= maxY && b.maxY > y) y = b.maxY;
  }
  const hit = trackUnder(x, z, maxY);
  if (hit && hit.y >= y - 0.002) {
    y = hit.y;
    piece = hit.piece;
  }
  return { y, piece };
}

/** What blocks the car's head from above at (x, z): for low cameras and the dark. */
export function ceilingAt(x: number, z: number, fromY: number) {
  let c = Infinity;
  for (const b of BLOCKS) {
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
    if (b.minY > fromY && b.minY < c) c = b.minY;
  }
  return c;
}

const _fwd = new THREE.Vector3();
const _v = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _r = new THREE.Vector3();
const _u = new THREE.Vector3();

function forward(heading: number, out = _fwd) {
  return out.set(Math.cos(heading), 0, Math.sin(heading));
}

/** One-sided slopes, so the lip of a ramp still reads as a ramp. */
function slopeAlong(x: number, y: number, z: number, dx: number, dz: number) {
  const d = 0.025;
  const top = y + TUNING.step;
  const a = groundAt(x - dx * d, z - dz * d, top).y;
  const c = groundAt(x, z, top).y;
  const b = groundAt(x + dx * d, z + dz * d, top).y;
  const back = (c - a) / d;
  const ahead = (b - c) / d;
  const okBack = Math.abs(back) < 1.6;
  const okAhead = Math.abs(ahead) < 1.6;
  if (okBack && okAhead) return (back + ahead) / 2;
  if (okBack) return back;
  if (okAhead) return ahead;
  return 0;
}

/** Slope along the heading, as a unit direction with a y part. */
function surfaceDir(x: number, y: number, z: number, heading: number, out: THREE.Vector3) {
  const f = forward(heading, out);
  const slope = slopeAlong(x, y, z, f.x, f.z);
  return out.set(f.x, slope, f.z).normalize();
}

function surfaceNormal(x: number, y: number, z: number, heading: number, out: THREE.Vector3) {
  const f = forward(heading, _r);
  const sf = slopeAlong(x, y, z, f.x, f.z);
  // Right of travel is (-f.z, f.x).
  const ss = slopeAlong(x, y, z, -f.z, f.x);
  // Gradient in world XZ from the forward and right slopes.
  const gx = f.x * sf - f.z * ss;
  const gz = f.z * sf + f.x * ss;
  return out.set(-gx, 1, -gz).normalize();
}

/** Push the car out of furniture and walls. Returns the wall normal hit, if any. */
function collide(car: CarState): THREE.Vector3 | null {
  const p = car.pos;
  const r = CAR.radius;
  let hit: THREE.Vector3 | null = null;
  for (const b of BLOCKS) {
    if (b.minY >= p.y + CAR.height) continue;
    if (b.maxY <= p.y + TUNING.step) continue;
    const x0 = b.minX - r;
    const x1 = b.maxX + r;
    const z0 = b.minZ - r;
    const z1 = b.maxZ + r;
    if (p.x <= x0 || p.x >= x1 || p.z <= z0 || p.z >= z1) continue;
    const pens = [p.x - x0, x1 - p.x, p.z - z0, z1 - p.z];
    const i = pens.indexOf(Math.min(...pens));
    if (i === 0) {
      p.x = x0;
      hit = new THREE.Vector3(-1, 0, 0);
    } else if (i === 1) {
      p.x = x1;
      hit = new THREE.Vector3(1, 0, 0);
    } else if (i === 2) {
      p.z = z0;
      hit = new THREE.Vector3(0, 0, -1);
    } else {
      p.z = z1;
      hit = new THREE.Vector3(0, 0, 1);
    }
  }
  if (p.x < ROOM.minX + r) {
    p.x = ROOM.minX + r;
    hit = new THREE.Vector3(1, 0, 0);
  }
  if (p.x > ROOM.maxX - r) {
    p.x = ROOM.maxX - r;
    hit = new THREE.Vector3(-1, 0, 0);
  }
  if (p.z < ROOM.minZ + r) {
    p.z = ROOM.minZ + r;
    hit = new THREE.Vector3(0, 0, 1);
  }
  if (p.z > ROOM.maxZ - r) {
    p.z = ROOM.maxZ - r;
    hit = new THREE.Vector3(0, 0, -1);
  }
  return hit;
}

function loopFrameAt(loop: Loop, s: number) {
  const lens = loopLengths(loop);
  const total = lens[lens.length - 1];
  const t = Math.min(total, Math.max(0, s));
  let i = 1;
  while (i < lens.length - 1 && lens[i] < t) i++;
  const a = loop.frames[i - 1];
  const b = loop.frames[i];
  const k = (t - lens[i - 1]) / Math.max(1e-6, lens[i] - lens[i - 1]);
  return {
    p: a.p.clone().lerp(b.p, k),
    tangent: a.tangent.clone().lerp(b.tangent, k).normalize(),
    up: a.up.clone().lerp(b.up, k).normalize(),
    total,
  };
}

const lengthCache = new Map<Loop, number[]>();
function loopLengths(loop: Loop) {
  let lens = lengthCache.get(loop);
  if (lens) return lens;
  lens = [0];
  for (let i = 1; i < loop.frames.length; i++) lens.push(lens[i - 1] + loop.frames[i].p.distanceTo(loop.frames[i - 1].p));
  lengthCache.set(loop, lens);
  return lens;
}

function tryEnterLoop(car: CarState): Loop | null {
  if (car.mode !== 'ground' || car.speed < 0.05) return null;
  const f = forward(car.heading, _v);
  for (const loop of LOOPS) {
    const rel = car.pos.clone().sub(loop.base);
    if (Math.abs(rel.y) > 0.04) continue;
    const along = rel.dot(loop.dir);
    const side = Math.abs(rel.x * loop.dir.z - rel.z * loop.dir.x);
    if (along < -0.035 || along > 0.03 || side > 0.075) continue;
    if (f.dot(loop.dir) < 0.6) continue;
    return loop;
  }
  return null;
}

/** Car orientation: yaw from heading, tilt from the ground (or the loop). */
function orient(car: CarState, blend: number, up?: THREE.Vector3, tangent?: THREE.Vector3) {
  const t = tangent ?? (car.mode === 'air' && car.vel.lengthSq() > 1e-4
    ? _v.copy(car.vel).normalize()
    : surfaceDir(car.pos.x, car.pos.y, car.pos.z, car.heading, _v));
  const n = up ?? (car.mode === 'air' ? _u.set(0, 1, 0) : car.normal);
  _r.crossVectors(n, t).normalize();
  if (_r.lengthSq() < 1e-6) return;
  const fwd = t.clone();
  const upv = new THREE.Vector3().crossVectors(fwd, _r).normalize();
  // Model faces +Z with +Y up and +X to its left.
  _m.makeBasis(_r, upv, fwd);
  _q.setFromRotationMatrix(_m);
  car.quat.slerp(_q, blend);
}

/**
 * Advance the car. Returns events for sound and the HUD.
 */
export function stepCar(car: CarState, input: DriveInput, dtFull: number): SimEvent[] {
  const events: SimEvent[] = [];
  const steps = Math.max(1, Math.ceil(dtFull / (1 / 120)));
  const dt = dtFull / steps;
  for (let i = 0; i < steps; i++) step(car, input, dt, events);
  return events;
}

function step(car: CarState, input: DriveInput, dt: number, events: SimEvent[]) {
  const T = TUNING;
  for (let i = 0; i < car.boosterCool.length; i++) car.boosterCool[i] = Math.max(0, car.boosterCool[i] - dt);
  if (input.nitro && car.nitroCans > 0 && car.nitroLeft <= 0) {
    car.nitroCans -= 1;
    car.nitroLeft = T.nitroTime;
    events.push('nitro');
  }
  car.nitroLeft = Math.max(0, car.nitroLeft - dt);
  car.boostLeft = Math.max(0, car.boostLeft - dt);

  if (car.mode === 'loop' && car.loop) {
    const loop = car.loop;
    const fr0 = loopFrameAt(loop, car.loopS);
    const lift = (fr0.p.y - loop.base.y) / (2 * loop.r);
    const v = Math.max(car.speed, T.loopSpeed) * (1 - 0.22 * lift);
    car.loopS += v * dt;
    const fr = loopFrameAt(loop, car.loopS);
    car.pos.copy(fr.p);
    car.vel.copy(fr.tangent).multiplyScalar(v);
    if (car.loopS >= fr.total) {
      car.mode = 'ground';
      car.loop = null;
      car.heading = Math.atan2(loop.dir.z, loop.dir.x);
      car.speed = Math.max(car.speed, T.loopSpeed);
      car.pos.copy(loop.base).addScaledVector(loop.side, loop.shift).addScaledVector(loop.dir, 0.04);
      car.normal.set(0, 1, 0);
      orient(car, 1);
    } else {
      orient(car, 1, fr.up, fr.tangent);
    }
    return;
  }

  const f = forward(car.heading);
  const grounded = car.mode === 'ground';
  const canDrive = grounded || car.airTime < 0.1;

  if (canDrive) {
    const cap = car.nitroLeft > 0 ? T.nitroSpeed : car.boostLeft > 0 ? T.boostSpeed : T.topSpeed;
    const thr = input.throttle;
    if (thr > 0.05) {
      if (car.speed < 0) car.speed = Math.min(0, car.speed + T.brake * dt);
      else if (car.speed < cap) car.speed = Math.min(cap, car.speed + (car.nitroLeft > 0 ? T.nitroAccel : T.accel) * thr * dt);
    } else if (thr < -0.05) {
      if (car.speed > 0) car.speed = Math.max(0, car.speed - T.brake * -thr * dt);
      else car.speed = Math.max(-T.reverseSpeed, car.speed - T.accel * 0.6 * -thr * dt);
    } else {
      const s = Math.sign(car.speed);
      car.speed = s * Math.max(0, Math.abs(car.speed) - T.coast * dt);
    }
    // Over the cap (downhill, after a booster) you bleed it off, harder the faster.
    if (car.speed > cap) car.speed = Math.max(cap, car.speed - (0.9 + 2.5 * (car.speed - cap)) * dt);
    // A stopped toy can still pivot. Grip used to be zero at rest, so a car
    // scrubbing a wall or sitting at the start could not turn its nose.
    const crawl = 0.45;
    const speedGrip = crawl + (1 - crawl) * Math.min(1, Math.abs(car.speed) / 0.22);
    const grip = speedGrip * (1 - 0.25 * Math.min(1, Math.abs(car.speed) / 1.3));
    car.heading += input.steer * T.turnRate * grip * Math.sign(car.speed || 1) * dt;
  }

  if (grounded) {
    const dir = surfaceDir(car.pos.x, car.pos.y, car.pos.z, car.heading, _v).clone();
    const lift = car.piece?.lift ?? 0;
    if (lift > 0) {
      if (car.speed < lift) car.speed = Math.min(lift, car.speed + 3.5 * dt);
    } else {
      car.speed -= T.gravity * dir.y * dt;
    }
    car.vel.copy(dir).multiplyScalar(car.speed);
    const predictedY = car.pos.y + car.vel.y * dt;
    car.pos.x += car.vel.x * dt;
    car.pos.z += car.vel.z * dt;
    const g = groundAt(car.pos.x, car.pos.z, Math.max(car.pos.y, predictedY) + T.step);
    // Rolling off a strip's edge is a bump; a lip at speed is a launch.
    const drop = predictedY - g.y;
    if (drop > 0.004 && (drop > 0.02 || car.vel.y > 0.08)) {
      // The plastic ran out from under us: fly.
      car.mode = 'air';
      car.airTime = 0;
      car.pos.y = predictedY;
      if (car.vel.y > 0.12) events.push('launch');
    } else {
      car.pos.y = g.y;
      car.piece = g.piece;
      surfaceNormal(car.pos.x, car.pos.y, car.pos.z, car.heading, car.normal);
    }
    railKeep(car);
  } else {
    car.airTime += dt;
    car.vel.y -= T.gravity * dt;
    car.pos.addScaledVector(car.vel, dt);
    const g = groundAt(car.pos.x, car.pos.z, car.pos.y + T.step);
    if (car.pos.y <= g.y && car.vel.y <= 0) {
      car.pos.y = g.y;
      car.piece = g.piece;
      car.mode = 'ground';
      surfaceNormal(car.pos.x, car.pos.y, car.pos.z, car.heading, car.normal);
      const dir = surfaceDir(car.pos.x, car.pos.y, car.pos.z, car.heading, _u);
      const hard = -car.vel.y;
      // Keep the run-up: a landing on a down slope even adds a little.
      const level = car.vel.x * f.x + car.vel.z * f.z;
      const along = car.vel.dot(dir);
      car.speed = (level >= 0 ? Math.max(level, along) : along) * (hard > 0.9 ? 0.85 : 0.95);
      if (car.airTime > 0.15) events.push('land');
      car.airTime = 0;
    }
  }

  const wall = collide(car);
  if (wall) {
    const into = f.x * wall.x + f.z * wall.z;
    if (car.mode === 'air') {
      const vn = car.vel.x * wall.x + car.vel.z * wall.z;
      if (vn < 0) {
        car.vel.x -= 1.4 * vn * wall.x;
        car.vel.z -= 1.4 * vn * wall.z;
      }
    } else if (into * Math.sign(car.speed) < -0.15) {
      if (Math.abs(car.speed) > 0.35) events.push('bump');
      // Head-on stops you; a glancing hit lets you slide along.
      car.speed *= Math.max(0, 1 - Math.abs(into)) * 0.85;
      if (Math.abs(into) > 0.85) car.speed = -0.08 * Math.sign(car.speed || 1);
    }
  }

  if (car.mode === 'ground') {
    const loop = tryEnterLoop(car);
    if (loop) {
      car.mode = 'loop';
      car.loop = loop;
      car.loopS = 0;
      car.speed = Math.max(car.speed, T.loopSpeed);
      events.push('loop');
    }
  }

  for (let i = 0; i < BOOSTERS.length; i++) {
    const b = BOOSTERS[i];
    if (car.boosterCool[i] > 0 || car.mode !== 'ground') continue;
    const dx = car.pos.x - b.p.x;
    const dz = car.pos.z - b.p.z;
    if (dx * dx + dz * dz > 0.075 * 0.075 || Math.abs(car.pos.y - b.p.y) > 0.05) continue;
    if (forward(car.heading, _v).dot(b.tangent) < 0.2) continue;
    car.speed = Math.max(car.speed, T.boostSpeed);
    car.boostLeft = T.boostTime;
    car.boosterCool[i] = 0.6;
    events.push('boost');
  }

  for (let i = 0; i < NITRO_SPOTS.length; i++) {
    if (car.taken[i]) continue;
    const n = NITRO_SPOTS[i];
    if (Math.abs(car.pos.x - n.x) < 0.07 && Math.abs(car.pos.z - n.z) < 0.07 && Math.abs(car.pos.y - n.y) < 0.12) {
      car.taken[i] = true;
      car.nitroCans = Math.min(3, car.nitroCans + 1);
      events.push('nitro-pickup');
    }
  }

  orient(car, Math.min(1, dt * 14));
}

/** Raised plastic has walls: lean on them and you slide along. */
function railKeep(car: CarState) {
  const piece = car.piece;
  if (!piece || !piece.railed || car.mode !== 'ground') return;
  const hit = trackUnder(car.pos.x, car.pos.z, car.pos.y + 0.01, 0.05);
  // Only where it's raised: on the floor you can always drive off.
  if (!hit || hit.piece !== piece || hit.y < 0.05) return;
  const limit = piece.half - CAR.radius * 0.6;
  if (Math.abs(hit.lateral) <= limit) return;
  const push = Math.sign(hit.lateral) * limit - hit.lateral;
  car.pos.x += hit.right.x * push;
  car.pos.z += hit.right.z * push;
  // Turn the nose back along the rail.
  const want = Math.atan2(hit.tangent.z, hit.tangent.x) + (car.speed < 0 ? Math.PI : 0);
  let d = want - car.heading;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  if (Math.abs(d) < Math.PI / 2) car.heading += d * 0.25;
  car.speed *= 0.995;
}

/** Re-take all nitro cans for a fresh lap. */
export function refillNitro(car: CarState) {
  car.taken = NITRO_SPOTS.map(() => false);
}
