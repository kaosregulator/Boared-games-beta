import { LAYOUT, WALL_SHELF } from '../../roomLayout';

/**
 * The shelf sniper and the duck range on the far side of the room. Two green
 * army men stand on the wall shelf over the TV, between the books and the
 * blue figure: a sniper lying on his base and a radio man next to him. You
 * only get up there by landing the toy helicopter on the shelf. Across the
 * room, between the rug and the beanbag, a pop-up duck range folds up out of
 * the carpet: grass, a tree, a sky board, and ducks that come in waves.
 *
 * Everything here is plain numbers so the rules can be tested in Node.
 */

export interface V3 {
  x: number;
  y: number;
  z: number;
}

const SHELF_TOP = WALL_SHELF.y + WALL_SHELF.h;
const SHELF_FRONT = WALL_SHELF.z + WALL_SHELF.d / 2;

/** Gap between the books and the blue figure, at the front of the shelf. */
export const SQUAD = {
  top: SHELF_TOP,
  sniper: { x: -1.115, z: SHELF_FRONT - 0.03 },
  radio: { x: -1.035, z: SHELF_FRONT - 0.06 },
  /** Land anywhere this close (on the shelf) and the radio man calls you over. */
  reach: 0.75,
};

/** The pop-up range. Faces north, toward the shelf. */
export const FIELD = {
  x: -0.4,
  w: 1.5,
  /** The sky board stands up at this z; grass rows are in front of it. */
  backZ: 1.28,
  skyH: 1.45,
  grassZ: [0.93, 1.05, 1.17] as const,
  grassH: [0.15, 0.2, 0.25] as const,
  tree: { x: -0.92, z: 1.2, h: 0.95 },
  /** Where the ducks fly. */
  fly: { x0: -1.08, x1: 0.28, y0: 0.24, y1: 1.3, z0: 1.0, z1: 1.2 },
};

export const FIELD_MIN_X = FIELD.x - FIELD.w / 2;
export const FIELD_MAX_X = FIELD.x + FIELD.w / 2;

// ---------------------------------------------------------------------------
// The rifle

/** Pivot of the rifle: the sniper's shoulder, just off the base. */
export const RIFLE_PIVOT: V3 = { x: SQUAD.sniper.x, y: SHELF_TOP + 0.018, z: SQUAD.sniper.z };
export const BARREL = 0.075;
/** The scope rides this far over the barrel. */
export const SCOPE_UP = 0.011;

const FIELD_AIM: V3 = { x: FIELD.x, y: 0.62, z: (FIELD.fly.z0 + FIELD.fly.z1) / 2 };

export function aimAt(from: V3, to: V3) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  return { yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

/** Straight at the middle of the range. The scope starts here. */
export const AIM_HOME = aimAt(RIFLE_PIVOT, FIELD_AIM);
/** How far you can swing the rifle off the middle. */
export const AIM_LIMIT = { yaw: 0.34, up: 0.2, down: 0.2 };

export function clampAim(yaw: number, pitch: number) {
  return {
    yaw: Math.max(AIM_HOME.yaw - AIM_LIMIT.yaw, Math.min(AIM_HOME.yaw + AIM_LIMIT.yaw, yaw)),
    pitch: Math.max(AIM_HOME.pitch - AIM_LIMIT.down, Math.min(AIM_HOME.pitch + AIM_LIMIT.up, pitch)),
  };
}

export function aimDir(yaw: number, pitch: number): V3 {
  const c = Math.cos(pitch);
  return { x: Math.sin(yaw) * c, y: Math.sin(pitch), z: Math.cos(yaw) * c };
}

export function muzzle(yaw: number, pitch: number): V3 {
  const d = aimDir(yaw, pitch);
  return { x: RIFLE_PIVOT.x + d.x * BARREL, y: RIFLE_PIVOT.y + d.y * BARREL, z: RIFLE_PIVOT.z + d.z * BARREL };
}

/** Where your eye sits behind the scope. */
export function scopeEye(yaw: number, pitch: number): V3 {
  const d = aimDir(yaw, pitch);
  return { x: RIFLE_PIVOT.x - d.x * 0.012, y: RIFLE_PIVOT.y + SCOPE_UP - d.y * 0.012, z: RIFLE_PIVOT.z - d.z * 0.012 };
}

/** Distance along the ray to the closest pass of a sphere, or null if it misses. */
export function rayHit(origin: V3, dir: V3, centre: V3, radius: number): number | null {
  const ox = centre.x - origin.x;
  const oy = centre.y - origin.y;
  const oz = centre.z - origin.z;
  const t = ox * dir.x + oy * dir.y + oz * dir.z;
  if (t <= 0) return null;
  const px = ox - dir.x * t;
  const py = oy - dir.y * t;
  const pz = oz - dir.z * t;
  return px * px + py * py + pz * pz <= radius * radius ? t : null;
}

/** Where a missed shot lands: the sky board, the grass, or the floor. */
export function missPoint(origin: V3, dir: V3): V3 {
  let t = 8;
  if (dir.z > 1e-4) t = Math.min(t, (FIELD.backZ - origin.z) / dir.z);
  if (dir.y < -1e-4) t = Math.min(t, -origin.y / dir.y);
  return { x: origin.x + dir.x * t, y: origin.y + dir.y * t, z: origin.z + dir.z * t };
}

// ---------------------------------------------------------------------------
// Ducks

export type DuckKind = 'mallard' | 'blue' | 'red';
export type DuckState = 'fly' | 'hit' | 'fall' | 'away' | 'gone';

export interface Duck {
  id: number;
  kind: DuckKind;
  pos: V3;
  vel: V3;
  state: DuckState;
  /** Seconds in the air. */
  age: number;
  /** Time left before the next change of direction. */
  turn: number;
  /** Seconds in the current state (hit or fall). */
  t: number;
  speed: number;
  /** Was the hit this wave (for the counter). */
  hit: boolean;
}

export const DUCK_RADIUS = 0.062;
/** Kinder than the drawing: a near miss on the wingtip still counts. */
export const HIT_RADIUS = 0.075;

export const KIND_SPEED: Record<DuckKind, number> = { mallard: 0.34, blue: 0.44, red: 0.56 };
export const KIND_POINTS: Record<DuckKind, number> = { mallard: 500, blue: 1000, red: 1500 };

export type Rand = () => number;

export const WAVES_PER_ROUND = 5;
export const DUCKS_PER_WAVE = 2;
export const SHELLS = 3;

/** Ducks you need out of ten to keep going. */
export function quota(round: number) {
  return Math.min(9, 6 + Math.floor((round - 1) / 2));
}

/** A bit quicker every round, then it levels off. */
export function roundSpeed(round: number) {
  return 1 + Math.min(1.1, (round - 1) * 0.14);
}

/** Seconds a duck hangs around before it flies off. */
export function escapeAfter(round: number) {
  return Math.max(4.2, 8.5 - (round - 1) * 0.6);
}

export function pickKind(round: number, rand: Rand): DuckKind {
  const r = rand();
  const red = Math.min(0.35, 0.05 + round * 0.04);
  const blue = Math.min(0.4, 0.2 + round * 0.03);
  if (r < red) return 'red';
  if (r < red + blue) return 'blue';
  return 'mallard';
}

export function launchDuck(id: number, round: number, slot: number, rand: Rand): Duck {
  const f = FIELD.fly;
  const kind = pickKind(round, rand);
  const x = f.x0 + 0.12 + rand() * (f.x1 - f.x0 - 0.24);
  const speed = KIND_SPEED[kind] * roundSpeed(round);
  // Straight up out of the grass, leaning one way.
  const lean = (rand() < 0.5 ? -1 : 1) * (0.35 + rand() * 0.5);
  const d = norm(lean, 1, 0);
  return {
    id,
    kind,
    pos: { x, y: f.y0 - 0.06 - slot * 0.03, z: f.z0 + 0.04 + rand() * (f.z1 - f.z0 - 0.08) },
    vel: { x: d.x * speed, y: d.y * speed, z: 0 },
    state: 'fly',
    age: 0,
    turn: 0.7 + rand() * 0.6,
    t: 0,
    speed,
    hit: false,
  };
}

function norm(x: number, y: number, z: number) {
  const n = Math.hypot(x, y, z) || 1;
  return { x: x / n, y: y / n, z: z / n };
}

export type DuckEvent = 'flap' | 'quack' | 'away' | 'land';

/** Step one duck. Returns the noises it made. */
export function stepDuck(d: Duck, dt: number, round: number, rand: Rand): DuckEvent[] {
  const ev: DuckEvent[] = [];
  const f = FIELD.fly;
  d.t += dt;
  if (d.state === 'gone') return ev;
  if (d.state === 'hit') {
    // The cartoon hang in the air before it drops.
    if (d.t > 0.45) {
      d.state = 'fall';
      d.t = 0;
      d.vel = { x: 0, y: -0.2, z: 0 };
    }
    return ev;
  }
  if (d.state === 'fall') {
    d.vel.y -= 2.6 * dt;
    d.pos.y += d.vel.y * dt;
    if (d.pos.y < FIELD.grassH[1] * 0.5) {
      d.state = 'gone';
      ev.push('land');
    }
    return ev;
  }
  if (d.state === 'away') {
    d.vel.y += (d.speed * 2.2 - d.vel.y) * Math.min(1, dt * 3);
    d.vel.x *= 1 - Math.min(1, dt * 2);
    d.pos.x += d.vel.x * dt;
    d.pos.y += d.vel.y * dt;
    if (d.pos.y > FIELD.skyH + 0.5) d.state = 'gone';
    return ev;
  }
  d.age += dt;
  d.turn -= dt;
  if (d.age > escapeAfter(round)) {
    d.state = 'away';
    d.t = 0;
    ev.push('away');
    return ev;
  }
  if (d.turn <= 0 && d.pos.y > f.y0) {
    // A new heading: mostly sideways, a little up or down, never straight back down.
    const sx = rand() < 0.5 ? -1 : 1;
    const dir = norm(sx * (0.5 + rand()), rand() * 1.2 - 0.45, 0);
    d.vel.x = dir.x * d.speed;
    d.vel.y = dir.y * d.speed;
    d.vel.z = (rand() - 0.5) * 0.08;
    d.turn = 0.6 + rand() * 0.9;
    if (rand() < 0.35) ev.push('quack');
  }
  d.pos.x += d.vel.x * dt;
  d.pos.y += d.vel.y * dt;
  d.pos.z += d.vel.z * dt;
  // Bounce off the edges of the range (the bottom only once it is out of the grass).
  if (d.pos.x < f.x0) {
    d.pos.x = f.x0;
    d.vel.x = Math.abs(d.vel.x);
  } else if (d.pos.x > f.x1) {
    d.pos.x = f.x1;
    d.vel.x = -Math.abs(d.vel.x);
  }
  if (d.pos.y > f.y1) {
    d.pos.y = f.y1;
    d.vel.y = -Math.abs(d.vel.y);
  } else if (d.pos.y < f.y0 && d.age > 0.8) {
    d.pos.y = f.y0;
    d.vel.y = Math.abs(d.vel.y);
  }
  if (d.pos.z < f.z0) {
    d.pos.z = f.z0;
    d.vel.z = Math.abs(d.vel.z);
  } else if (d.pos.z > f.z1) {
    d.pos.z = f.z1;
    d.vel.z = -Math.abs(d.vel.z);
  }
  return ev;
}

export function shoot(d: Duck) {
  if (d.state !== 'fly') return false;
  d.state = 'hit';
  d.t = 0;
  d.hit = true;
  d.vel = { x: 0, y: 0, z: 0 };
  return true;
}

/** Start every duck still up there flying off (out of shells). */
export function scatter(ducks: Duck[]) {
  for (const d of ducks) {
    if (d.state === 'fly') {
      d.state = 'away';
      d.t = 0;
    }
  }
}

export function waveOver(ducks: Duck[]) {
  return ducks.every(d => d.state === 'gone');
}

/** Points for a duck, a bit more each round. */
export function duckPoints(kind: DuckKind, round: number) {
  return KIND_POINTS[kind] + (round - 1) * 100;
}

export const PERFECT_BONUS = 5000;

/** After the round's last wave: on to the next one, or the ducks win. */
export function roundResult(hits: number, round: number): 'next' | 'perfect' | 'over' {
  if (hits >= WAVES_PER_ROUND * DUCKS_PER_WAVE) return 'perfect';
  return hits >= quota(round) ? 'next' : 'over';
}

/** The other props on the shelf, so the helicopter lands around them. */
export function shelfProps() {
  return (['books', 'armor', 'rubik', 'nes'] as const).map(id => {
    const p = LAYOUT[id];
    const half = Math.max(p.sx, p.sz) / 2;
    return { id, x: p.x, z: p.z, half, top: p.y + p.sy };
  });
}
