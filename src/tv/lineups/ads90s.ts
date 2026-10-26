import { AD_ITEMS, AD_ROWS } from './ads90sLibrary';

/**
 * Channel 90: nothing but 1990s commercial breaks, around the clock.
 *
 * Built on Geek Guilt's Retro Viewer (geekguilt.com/blogs/news/retro-viewer-wip-release),
 * a Python + VLC player that loops vintage ads on a CRT. The ideas carried
 * over: a library tagged by title, year and genre, playlists by time of day,
 * seasonal tags, seamless playback, 4:3 pictures, levelled audio. What
 * changed: nothing to install or hand-edit, the time-of-day and seasonal
 * rotations run on their own, the library is read off the Internet Archive by
 * scripts/tv-ads.mjs instead of a MetaEditor, and the channel is "live" on the
 * shared clock like every other channel, so tuning in drops you mid-break.
 *
 * A day's schedule is drawn fresh each morning at 6 AM, the same for everyone:
 * breaks of four to six spots, or a whole break as it aired off a kids' TV
 * tape, with a beat of black between them. Every spot plays once before any
 * repeats, the same brand never runs twice in one break, mornings lean on
 * cereal and kitchen ads, afternoons on toys and kids' breaks, prime time on
 * cars, movies and beer, and late night takes whatever is left.
 */

export interface Ad {
  index: number;
  item: string;
  file: string;
  /** How long it runs on the channel (a window, for long tapes). */
  seconds: number;
  /** Where in the file it starts. */
  from: number;
  title: string;
  year: number;
  genre: string;
  /** A stretch of real broadcast with several spots, rather than one spot. */
  isBreak: boolean;
  season?: 'xmas' | 'halloween';
  url: string;
  /** First word of the title: two spots for the same brand never share a break. */
  brand: string;
}

export const ADS_NUMBER = 90;

const downloadUrl = (item: string, file: string) =>
  `https://archive.org/download/${encodeURIComponent(item)}/${file.split('/').map(encodeURIComponent).join('/')}`;

export const ADS: Ad[] = AD_ROWS.map(([item, file, seconds, title, year, genre, isBreak, from, season], index) => ({
  index,
  item: AD_ITEMS[item],
  file,
  seconds,
  from: from ?? 0,
  title,
  year,
  genre,
  isBreak: isBreak === 1,
  season,
  url: downloadUrl(AD_ITEMS[item], file),
  brand: isBreak === 1 ? title : title.split(/[\s']/)[0].toLowerCase(),
}));

type Daypart = 'morning' | 'afternoon' | 'prime' | 'late';

/** What airs when, as relative weights per genre. */
const WEIGHTS: Record<Daypart, Record<string, number>> = {
  morning: { 'Food & Drink': 4, Home: 3, 'Health & Beauty': 3, Kids: 2, 'Toys & Games': 2, 'Stores & Services': 2, 'Phones & Tech': 1, Cars: 1, Movies: 1, Network: 1, Beer: 0 },
  afternoon: { Kids: 5, 'Toys & Games': 5, 'Food & Drink': 3, Movies: 2, 'Stores & Services': 1, Home: 1, 'Health & Beauty': 1, 'Phones & Tech': 1, Cars: 1, Network: 1, Beer: 0 },
  prime: { Cars: 4, Movies: 4, 'Phones & Tech': 3, 'Food & Drink': 2, Beer: 2, Network: 2, 'Health & Beauty': 2, 'Stores & Services': 2, Home: 1, Kids: 1, 'Toys & Games': 1 },
  late: { 'Stores & Services': 3, Beer: 2, Network: 2, 'Health & Beauty': 2, Cars: 2, 'Phones & Tech': 2, Movies: 2, Home: 2, 'Food & Drink': 2, Kids: 0.5, 'Toys & Games': 0.5 },
};

/** How often a break is a real aired one instead of single spots. */
const AIRED_BREAK_ODDS: Record<Daypart, number> = { morning: 0.3, afternoon: 0.5, prime: 0.2, late: 0.25 };

/** Black between breaks, like a station cutting back to the show and out again. */
export const GAP_SECONDS = 1;

const SIGN_ON_HOUR = 6;
const DAY = 86400;

function daypart(hour: number): Daypart {
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 23) return 'prime';
  return 'late';
}

/** Christmas spots from mid-November, Halloween spots in October; neither out of season. */
export function inSeason(ad: Ad, date: Date): boolean {
  if (!ad.season) return true;
  const m = date.getMonth();
  if (ad.season === 'halloween') return m === 9;
  return m === 11 || (m === 10 && date.getDate() >= 15);
}

/** Small seeded PRNG, so a day's schedule is the same on every screen. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Slot {
  /** Seconds after the 6 AM sign-on. */
  at: number;
  seconds: number;
  /** null is the beat of black between breaks. */
  ad: Ad | null;
}

/** The broadcast day `at` falls in (from 6 AM local), and how far into it. */
export function broadcastDay(at: number): { day: number; into: number } {
  const local = at - new Date(at * 1000).getTimezoneOffset() * 60 - SIGN_ON_HOUR * 3600;
  const day = Math.floor(local / DAY);
  return { day, into: local - day * DAY };
}

const days = new Map<number, Slot[]>();

/** One broadcast day's run of breaks, built the same way on every screen. */
export function daySchedule(day: number, library: Ad[] = ADS): Slot[] {
  const hit = library === ADS ? days.get(day) : undefined;
  if (hit) return hit;
  const random = rng(day * 2654435761 + 90);
  // a moment on this broadcast day, for the seasonal rules
  const date = new Date((day * DAY + 6 * 3600) * 1000);
  const onAir = library.filter(ad => inSeason(ad, date));
  const used = new Set<number>();
  const slots: Slot[] = [];
  let at = 0;

  const pick = (pool: Ad[], part: Daypart, avoid: Set<string>) => {
    let fresh = pool.filter(ad => !used.has(ad.index) && !avoid.has(ad.brand) && (WEIGHTS[part][ad.genre] ?? 1) > 0);
    if (!fresh.length) {
      // everything has had its turn today: start the rotation over
      for (const ad of pool) used.delete(ad.index);
      fresh = pool.filter(ad => !avoid.has(ad.brand) && (WEIGHTS[part][ad.genre] ?? 1) > 0);
    }
    if (!fresh.length) return null;
    const total = fresh.reduce((sum, ad) => sum + (WEIGHTS[part][ad.genre] ?? 1), 0);
    let r = random() * total;
    for (const ad of fresh) {
      r -= WEIGHTS[part][ad.genre] ?? 1;
      if (r <= 0) return ad;
    }
    return fresh[fresh.length - 1];
  };

  const spots = onAir.filter(ad => !ad.isBreak);
  const aired = onAir.filter(ad => ad.isBreak);
  while (at < DAY) {
    const part = daypart((SIGN_ON_HOUR + Math.floor(at / 3600)) % 24);
    const pod: Ad[] = [];
    if (aired.length && random() < AIRED_BREAK_ODDS[part]) {
      const ad = pick(aired, part, new Set());
      if (ad) pod.push(ad);
    }
    if (!pod.length) {
      const count = 4 + Math.floor(random() * 3);
      const brands = new Set<string>();
      for (let i = 0; i < count; i += 1) {
        const ad = pick(spots, part, brands);
        if (!ad) break;
        pod.push(ad);
        brands.add(ad.brand);
      }
    }
    if (!pod.length) break;
    for (const ad of pod) {
      used.add(ad.index);
      slots.push({ at, seconds: ad.seconds, ad });
      at += ad.seconds;
    }
    slots.push({ at, seconds: GAP_SECONDS, ad: null });
    at += GAP_SECONDS;
  }
  if (library === ADS) {
    days.set(day, slots);
    // keep yesterday and tomorrow at most
    for (const k of days.keys()) if (Math.abs(k - day) > 1) days.delete(k);
  }
  return slots;
}

export interface AdAir {
  slot: Slot;
  index: number;
  /** Seconds into the slot. */
  offset: number;
  day: number;
}

/** What is on channel 90 at `at` (seconds on the shared clock). */
export function adsOnAir(at: number, library: Ad[] = ADS): AdAir | null {
  const { day, into } = broadcastDay(at);
  const slots = daySchedule(day, library);
  if (!slots.length) return null;
  let lo = 0;
  let hi = slots.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (slots[mid].at <= into) lo = mid;
    else hi = mid - 1;
  }
  const slot = slots[lo];
  return { slot, index: lo, offset: Math.max(0, into - slot.at), day };
}

/** The next spot or break after the one at `air`, and how many seconds until it starts. */
export function adAfter(air: AdAir, library: Ad[] = ADS): { ad: Ad; inSeconds: number } | null {
  let slots = daySchedule(air.day, library);
  let wait = air.slot.seconds - air.offset;
  let i = air.index + 1;
  let day = air.day;
  for (let guard = 0; guard < 8; guard += 1) {
    if (i >= slots.length) {
      day += 1;
      slots = daySchedule(day, library);
      i = 0;
      if (!slots.length) return null;
    }
    const slot = slots[i];
    if (slot.ad) return { ad: slot.ad, inSeconds: wait };
    wait += slot.seconds;
    i += 1;
  }
  return null;
}

/** The caption and guide text for an ad. */
export function adLabel(ad: Ad): string {
  return ad.isBreak ? ad.title : `${ad.title} · ${ad.year}`;
}

/** Guide row for channel 90. */
export function adsGuide(at: number): { now: string; next: string } {
  const air = adsOnAir(at);
  if (!air) return { now: '90s commercial breaks', next: '' };
  const now = air.slot.ad ? adLabel(air.slot.ad) : 'Station break';
  const after = adAfter(air);
  if (!after) return { now, next: '' };
  const when = new Date((at + after.inSeconds) * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return { now, next: `${when} ${adLabel(after.ad)}` };
}

/** The slot right after `air` (a spot, a break, or the black between), from its start. */
export function slotAfter(air: AdAir, library: Ad[] = ADS): AdAir | null {
  const slots = daySchedule(air.day, library);
  if (air.index + 1 < slots.length) return { slot: slots[air.index + 1], index: air.index + 1, offset: 0, day: air.day };
  const next = daySchedule(air.day + 1, library);
  return next.length ? { slot: next[0], index: 0, offset: 0, day: air.day + 1 } : null;
}
