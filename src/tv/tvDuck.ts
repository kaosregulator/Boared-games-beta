import type { TvMode } from './TvScreen';

/**
 * The TV takes over the room's sound. The moment the set comes on, the bedroom
 * tape is muted all the way — not ducked by distance — so the one thing you
 * hear is the TV, coming from the set through its HRTF speaker and tracking as
 * you move. Switch the set off and the tape comes straight back.
 *
 * (It used to only duck near the set and swell back across the room; the point
 * now is to clear the air for the TV's spatial sound, so it's a clean mute.)
 */
export function tvMusicLevel(mode: TvMode): number {
  return mode === 'off' ? 1 : 0;
}
