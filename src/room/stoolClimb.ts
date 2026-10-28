/**
 * Climbing onto the high-shelf stool, one foot at a time. The eye height is
 * not a smooth lift: each foot pushes the head up past where it settles and
 * it drops back a touch on the landing, so it reads as two real steps
 * (and coming down is the same two steps in reverse).
 */
export const STOOL_STEP = 0.2;
export const STOOL_TOP = 0.42;

/** [seconds, extra eye height in metres]; plateaus are exactly 0, STOOL_STEP and STOOL_TOP. */
const UP: [number, number][] = [
  [0, 0],
  [0.22, 0.25], // first foot up, the head pops past the step
  [0.38, STOOL_STEP], // lands
  [0.5, STOOL_STEP], // weight shifts
  [0.72, 0.47], // second foot up
  [0.9, STOOL_TOP], // lands
];
const DOWN: [number, number][] = [
  [0, STOOL_TOP],
  [0.14, 0.45], // a little rise as the weight comes off
  [0.34, 0.17], // first foot down, head dips below the step
  [0.46, STOOL_STEP],
  [0.58, STOOL_STEP],
  [0.78, -0.03], // second foot lands on the floor
  [0.9, 0],
];

export const CLIMB_SECONDS = 0.9;

function sample(keys: [number, number][], t: number): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const k = (t - t0) / (t1 - t0);
      const s = k * k * (3 - 2 * k);
      return v0 + (v1 - v0) * s;
    }
  }
  return keys[keys.length - 1][1];
}

export function climbBoost(dir: 'up' | 'down', seconds: number): number {
  return sample(dir === 'up' ? UP : DOWN, seconds);
}

/** How far through the walk onto the stool the player is (0 at the first foot, 1 once on top). */
export function stepForward(seconds: number): number {
  const k = Math.min(1, Math.max(0, seconds / 0.72));
  return k * k * (3 - 2 * k);
}
