import { MAN_HEIGHT, MAN_RADIUS } from './town';

/**
 * Where a shot from the player's soldier goes.
 * The camera angles stay where they are. This only decides the streak and the knockdown.
 */

export const SHOT_RANGE = 1.15;

/** A body this far off the barrel line is the one you are pointing at. Wider than that is a miss. */
export const SHOT_RADIUS = MAN_RADIUS * 1.6;

export interface AimPoint {
  x: number;
  y: number;
  z: number;
}

export function muzzlePoint(pos: AimPoint, heading: number): AimPoint {
  return {
    x: pos.x + Math.sin(heading) * 0.016,
    y: pos.y + MAN_HEIGHT * 0.62,
    z: pos.z + Math.cos(heading) * 0.016,
  };
}

export function chestPoint(pos: AimPoint): AimPoint {
  return { x: pos.x, y: pos.y + MAN_HEIGHT * 0.55, z: pos.z };
}

/** End of a shot that hits nothing: straight along the facing, at chest height. */
export function shotPoint(from: AimPoint, heading: number, distance: number): AimPoint {
  return {
    x: from.x + Math.sin(heading) * distance,
    y: from.y + MAN_HEIGHT * 0.55,
    z: from.z + Math.cos(heading) * distance,
  };
}

export interface ShotPick {
  index: number;
  along: number;
  gap: number;
}

/**
 * The first body the barrel line crosses.
 * A 0.45 rad cone out to 0.75 m used to count a soldier 16° off to the side,
 * and the streak bent over to them. A soldier dead ahead at 0.8 m did not count,
 * and the streak stopped at 0.5 m.
 */
export function pickAlongBarrel(
  from: AimPoint,
  heading: number,
  bodies: AimPoint[],
  range = SHOT_RANGE,
  radius = SHOT_RADIUS,
): ShotPick | null {
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  let best: ShotPick | null = null;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const dx = b.x - from.x;
    const dz = b.z - from.z;
    const along = dx * fx + dz * fz;
    if (along < 0.02 || along > range) continue;
    const gap = Math.hypot(dx - fx * along, dz - fz * along);
    if (gap > radius) continue;
    if (!best || along < best.along) best = { index: i, along, gap };
  }
  return best;
}
