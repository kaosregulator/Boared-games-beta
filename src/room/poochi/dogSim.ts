import { WALL } from '../videoRoom';
import { LAYOUT } from '../roomLayout';
import { BLOCKS, ROOM, blockHas, pushOutOf } from '../hotwheels/world';

/**
 * Poo-Chi on the loose, shrunk down with you inside him. He walks the
 * floor, steps up onto anything low, and with the propeller up he can fly
 * to the tops of the furniture. Same solid room as the Hot Wheels car
 * (hotwheels/world.ts), without the track: no rails, no assist.
 */

export const DOG = {
  /** He's about 21 cm nose to tail and 14 cm across: a round footprint of this. */
  radius: 0.075,
  height: 0.16,
  /** Anything this low he just walks up onto (a plate, a card, a rug edge). */
  step: 0.04,
  walk: 0.55,
  jet: 2.1,
  turn: 2.6,
  /** Climb with the propeller, and the slow sink with it spinning down. */
  climb: 0.95,
  sink: -0.32,
  gravity: 5.5,
};

export interface DogInput {
  /** -1..1, forward is +. */
  move: number;
  /** -1..1, + turns left. */
  turn: number;
  fly: boolean;
  jet: boolean;
}

export interface DogState {
  x: number;
  y: number;
  z: number;
  /** Radians; 0 faces +z (his snout's own direction), + turns toward +x. */
  heading: number;
  speed: number;
  vy: number;
  grounded: boolean;
  /** Add-ons: 0 tucked away, 1 all the way out. */
  prop: number;
  jet: number;
  /** Seconds since he last touched down or since the jet was last fired. */
  landedFor: number;
  jetIdle: number;
  /** How much the jet is firing right now, for the flames. */
  thrust: number;
  turnRate: number;
}

export function newDog(x: number, z: number, heading: number): DogState {
  return {
    x,
    y: 0,
    z,
    heading,
    speed: 0,
    vy: 0,
    grounded: true,
    prop: 0,
    jet: 0,
    landedFor: 1,
    jetIdle: 1,
    thrust: 0,
    turnRate: 0,
  };
}

/** The highest surface he can stand on at (x, z) that isn't above `maxY`. */
export function floorUnder(x: number, z: number, maxY: number) {
  let y = 0;
  for (const b of BLOCKS) {
    if (b.top === false) continue;
    // A little give at the edges, so he doesn't drop off a top he's half on.
    if (!blockHas(b, x, z, DOG.radius * 0.35)) continue;
    if (b.maxY <= maxY && b.maxY > y) y = b.maxY;
  }
  return y;
}

/** The underside of whatever is over him (the desk top, the bed). */
export function roofOver(x: number, z: number, fromY: number) {
  let c = WALL.height - 0.05;
  for (const b of BLOCKS) {
    if (!blockHas(b, x, z, DOG.radius * 0.6)) continue;
    if (b.minY > fromY && b.minY < c) c = b.minY;
  }
  return c;
}

/** Push him out of anything he overlaps at his height. Returns true if something was in the way. */
function collide(d: DogState) {
  let hit = false;
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const b of BLOCKS) {
      if (d.y + DOG.height <= b.minY + 0.005) continue;
      // Low enough to step up on (or already on top): not a wall.
      if (b.top !== false && b.maxY - d.y <= DOG.step) continue;
      if (b.maxY <= d.y + 0.001) continue;
      const push = pushOutOf(b, d.x, d.z, DOG.radius);
      if (!push) continue;
      d.x = push.x;
      d.z = push.z;
      moved = true;
      hit = true;
    }
    if (!moved) break;
  }
  d.x = Math.min(ROOM.maxX - DOG.radius, Math.max(ROOM.minX + DOG.radius, d.x));
  d.z = Math.min(ROOM.maxZ - DOG.radius, Math.max(ROOM.minZ + DOG.radius, d.z));
  return hit;
}

export type DogEvent = 'takeoff' | 'land' | 'prop-out' | 'prop-in' | 'jet-out' | 'jet-in' | 'bump';

export function stepDog(d: DogState, input: DogInput, dtFull: number): DogEvent[] {
  const events: DogEvent[] = [];
  // Small steps so a fast jet run can't pass through a thin bed post.
  const steps = Math.max(1, Math.ceil(dtFull / (1 / 120)));
  const dt = dtFull / steps;
  const wasProp = d.prop > 0.5;
  const wasJet = d.jet > 0.5;
  for (let i = 0; i < steps; i++) {
    // The add-ons: the propeller is out whenever he's flying, and goes back
    // in once he's been on the ground a moment. The jet pack the same, after
    // the jet has been idle.
    const propWant = input.fly || !d.grounded || d.landedFor < 0.6 ? 1 : 0;
    d.prop += Math.sign(propWant - d.prop) * Math.min(Math.abs(propWant - d.prop), dt / 0.35);
    d.jetIdle = input.jet ? 0 : d.jetIdle + dt;
    const jetWant = d.jetIdle < 1.2 ? 1 : 0;
    d.jet += Math.sign(jetWant - d.jet) * Math.min(Math.abs(jetWant - d.jet), dt / 0.3);
    const firing = input.jet && d.jet > 0.9;
    d.thrust += ((firing ? 1 : 0) - d.thrust) * Math.min(1, dt * 10);

    // Turning, and speed along his heading.
    const turnWant = input.turn * DOG.turn * (firing ? 0.7 : 1);
    d.turnRate += (turnWant - d.turnRate) * Math.min(1, dt * 12);
    d.heading += d.turnRate * dt;
    const top = firing ? DOG.jet : DOG.walk;
    const want = input.move * (input.move < 0 ? DOG.walk * 0.6 : top) + (firing && input.move === 0 ? DOG.jet * 0.8 : 0);
    const accel = firing ? 3.2 : d.grounded ? 4 : 2.5;
    d.speed += Math.sign(want - d.speed) * Math.min(Math.abs(want - d.speed), accel * dt);
    d.x += Math.sin(d.heading) * d.speed * dt;
    d.z += Math.cos(d.heading) * d.speed * dt;
    if (collide(d)) {
      d.speed *= 0.6;
      if (!events.includes('bump') && Math.abs(d.speed) > 0.3) events.push('bump');
    }

    // Up and down.
    const flying = input.fly && d.prop > 0.6;
    if (flying) d.vy += (DOG.climb - d.vy) * Math.min(1, dt * 4);
    else if (d.prop > 0.6 && !d.grounded) d.vy += (DOG.sink - d.vy) * Math.min(1, dt * 3);
    else d.vy -= DOG.gravity * dt;
    d.y += d.vy * dt;
    const roof = roofOver(d.x, d.z, d.y + 0.02);
    if (d.y + DOG.height > roof) {
      d.y = roof - DOG.height;
      d.vy = Math.min(0, d.vy);
    }
    const floor = floorUnder(d.x, d.z, d.y + DOG.step);
    if (d.y <= floor) {
      if (!d.grounded && d.vy < -0.15) events.push('land');
      d.y = floor;
      d.vy = Math.max(0, d.vy);
      if (!d.grounded) d.landedFor = 0;
      d.grounded = !flying;
    } else if (d.y > floor + 0.004) {
      if (d.grounded && flying) events.push('takeoff');
      d.grounded = false;
    } else if (d.grounded) {
      // Walking down a little step: stick to it.
      d.y = floor;
    }
    if (d.grounded) d.landedFor += dt;
  }
  if (!wasProp && d.prop > 0.5) events.push('prop-out');
  if (wasProp && d.prop <= 0.5) events.push('prop-in');
  if (!wasJet && d.jet > 0.5) events.push('jet-out');
  if (wasJet && d.jet <= 0.5) events.push('jet-in');
  return events;
}

export interface BoneSpot {
  id: number;
  label: string;
  x: number;
  z: number;
  y: number;
  /** Turn on the spot, so they don't all lie the same way. */
  yaw: number;
}

/** Where his bones got to. Each one sits on whatever is under it. */
const SPOTS: { label: string; x: number; z: number; under?: number }[] = [
  { label: 'on the bed, by the pillow', x: LAYOUT.bed.x - 0.3, z: LAYOUT.bed.z - 0.35 },
  { label: 'under the desk', x: LAYOUT.desk.x + 0.05, z: LAYOUT.desk.z, under: 0.1 },
  { label: 'on the desk, by the printer', x: LAYOUT.desk.x - 0.31, z: LAYOUT.desk.z + 0.55 },
  { label: 'on top of the TV', x: LAYOUT.crt.x, z: LAYOUT.crt.z + 0.02 },
  { label: 'in the bean bag', x: LAYOUT.beanbag.x + 0.1, z: LAYOUT.beanbag.z - 0.1 },
  { label: 'on the nightstand', x: LAYOUT.nightstand.x + 0.15, z: LAYOUT.nightstand.z + 0.08 },
  { label: 'on top of the toy shelf', x: LAYOUT.toyshelf.x, z: LAYOUT.toyshelf.z + 0.55 },
  { label: 'way up on the game shelf', x: LAYOUT.shelf.x - 0.1, z: LAYOUT.shelf.z + 0.05 },
  { label: 'on the clutter desk', x: LAYOUT.clutterdesk.x + 0.05, z: LAYOUT.clutterdesk.z - 0.45 },
  { label: 'behind the boombox', x: LAYOUT.boombox.x - 0.05, z: LAYOUT.boombox.z - 0.32 },
];

export const BONE_SPOTS: BoneSpot[] = SPOTS.map((s, i) => ({
  id: i,
  label: s.label,
  x: s.x,
  z: s.z,
  y: floorUnder(s.x, s.z, s.under ?? 9),
  yaw: (i * 2.39) % (Math.PI * 2),
}));

/** Close enough to grab it: his nose over the bone. */
export const FETCH_REACH = 0.13;

export function nearestBone(d: DogState, found: Set<number>) {
  let best: BoneSpot | null = null;
  let dist = Infinity;
  for (const b of BONE_SPOTS) {
    if (found.has(b.id)) continue;
    const dd = Math.hypot(b.x - d.x, b.y - d.y, b.z - d.z);
    if (dd < dist) {
      dist = dd;
      best = b;
    }
  }
  return best ? { bone: best, dist } : null;
}
