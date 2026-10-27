/**
 * One cartoon station, not one channel per short. A pack plays every film
 * once, each in its own slot spread across the clock, then the next cycle
 * is a new order. The order is a pure function of the cycle, so the guide
 * and the set agree without storing anything.
 */

export interface PackFilm {
  id: string;
  title: string;
}

/** How long each short owns the channel before the next one. */
export const PACK_SLOT = 8 * 60;

export function packHash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A permutation of 0..count-1. Same seed, same order. */
export function packOrder(packId: string, count: number, cycle: number) {
  const rng = mulberry32(packHash(`${packId}:${cycle}`));
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = order[i];
    order[i] = order[j];
    order[j] = swap;
  }
  return order;
}

export interface PackAir<T extends PackFilm> {
  film: T;
  next: T;
  /** Seconds into this film's slot. */
  offset: number;
  cycle: number;
  /** Index in the shuffled order, 0..count-1. */
  slot: number;
  /** Seconds until the next film. */
  remain: number;
}

export function packOnAir<T extends PackFilm>(films: readonly T[], packId: string, at: number): PackAir<T> {
  const n = films.length;
  if (n === 0) throw new Error(`pack ${packId} is empty`);
  const cycleLen = n * PACK_SLOT;
  const t = ((at % cycleLen) + cycleLen) % cycleLen;
  const cycle = Math.floor(at / cycleLen);
  const order = packOrder(packId, n, cycle);
  const slot = Math.min(n - 1, Math.floor(t / PACK_SLOT));
  const offset = t - slot * PACK_SLOT;
  return {
    film: films[order[slot]],
    next: films[order[(slot + 1) % n]],
    offset,
    cycle,
    slot,
    remain: PACK_SLOT - offset,
  };
}
