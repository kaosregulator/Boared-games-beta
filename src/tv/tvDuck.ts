import type { TvMode } from './TvScreen';

/**
 * The bedroom tape and the TV don't talk over each other. While the set is on
 * the tape is turned all the way down near it, and it comes back as you walk
 * off across the room; switching the set off gives it straight back.
 */

/** Closer than this to the TV (metres), the tape is silent. */
export const DUCK_NEAR = 2.6;
/** Farther than this, the tape is back at full. */
export const DUCK_FAR = 5.2;

/**
 * How loud the bedroom tape may be (0..1) with the TV in `mode`, the listener
 * `distance` metres from its speaker, and `atSet` true while sat at the set.
 * An unknown distance with the set on counts as close.
 */
export function tvMusicLevel(mode: TvMode, distance: number | null, atSet: boolean): number {
  if (mode === 'off') return 1;
  if (atSet || distance === null) return 0;
  if (distance <= DUCK_NEAR) return 0;
  if (distance >= DUCK_FAR) return 1;
  return (distance - DUCK_NEAR) / (DUCK_FAR - DUCK_NEAR);
}
