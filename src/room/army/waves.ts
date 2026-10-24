/**
 * The three story waves stay 5, 7, then 9. Easy, Medium, and Hard do not end:
 * each clear sends a larger wave, up to the number of tan soldiers in the town.
 */

export const STORY_WAVES = [5, 7, 9] as const;

/** Hidden tan soldiers waiting off the rug. Story never uses more than 9. */
export const TAN_POOL = 16;

export type Siege = 'story' | 'easy' | 'medium' | 'hard';

/** How many tan soldiers step out. Null means the story is over. */
export function waveSize(siege: Siege, wave: number): number | null {
  if (siege === 'story') return STORY_WAVES[wave - 1] ?? null;
  const start = siege === 'easy' ? 4 : siege === 'medium' ? 6 : 8;
  const step = siege === 'easy' ? 1 : siege === 'medium' ? 2 : 3;
  return Math.min(TAN_POOL, start + Math.max(0, wave - 1) * step);
}

export function storyOver(siege: Siege, wave: number) {
  return siege === 'story' && wave >= STORY_WAVES.length;
}

/** Seconds after a clear before the next wave. The last story wave uses the short beat into the win. */
export function betweenWaves(siege: Siege, wave: number) {
  if (storyOver(siege, wave)) return 1.2;
  if (siege === 'story' || siege === 'easy') return siege === 'easy' ? 5.5 : 5;
  if (siege === 'medium') return 4.2;
  return 3.2;
}

/** Walk speed passed to the same walker the story uses. Story stays at 0.08. */
export function invaderMarch(siege: Siege, wave: number) {
  if (siege === 'story') return 0.08;
  if (siege === 'easy') return 0.06;
  if (siege === 'medium') return 0.08;
  return Math.min(0.14, 0.09 + Math.max(0, wave - 1) * 0.004);
}

/** Chance a tan shot knocks a green soldier down. Story stays at 0.24. */
export function invaderAim(siege: Siege, wave: number) {
  if (siege === 'story') return 0.24;
  if (siege === 'easy') return 0.16;
  if (siege === 'medium') return 0.24;
  return Math.min(0.48, 0.3 + Math.max(0, wave - 1) * 0.015);
}

/** How far a tan soldier will shoot. Story stays at 0.42. */
export function invaderRange(siege: Siege, wave: number) {
  if (siege !== 'hard') return 0.42;
  return Math.min(0.7, 0.48 + Math.max(0, wave - 1) * 0.02);
}
