import { ADS, type Ad } from './ads90s';
import type { ArchivePart } from './archiveBlocks';

/**
 * Commercial breaks for the channels built from episodes and clean uploads,
 * which have no ads of their own. The spots come from channel 90's library
 * (the Internet Archive's 90s commercial collections, scripts/tv-ads.mjs), so
 * every break is a real 90s break; which spots a channel may run depends on
 * who watched it. Kids' channels get the breaks cut from kids' TV tapes, toy,
 * cereal and snack spots and family movies; teen channels add movies, games,
 * phones and stores; grown-up channels take everything, beer included.
 * Spots repeat across channels, the way the same ads ran everywhere.
 */

export type Audience = 'kids' | 'teen' | 'family' | 'adult';

/** Food spots that weren't aimed at kids: diet aids, coffee, the dinner-party stuff. */
const GROWN_UP_FOOD = /diet|slim|ensure|boost|coffee|cafe|lactaid|equal sweet|maxwell|olive garden|red lobster|brass anchor|budget gourmet|healthy choice|mayo|dressing|salsa|cream cheese|crisco|mrs\.? ?dash|v8|tea\b|teas\b|evian|whiskas|pedigree|flea/i;

/** Movie spots a kids' channel would run. */
const FAMILY_MOVIES = /disney|flin[st]|baby|doubtfire|small soldiers|beauty and the beast|spiceworld/i;

/** Tapes with grown-up shows in them (NYPD Blue, NBC prime time) stay off kids' channels. */
const GROWN_UP_TAPES = /NYPD|NBC|Commercial break · 1991/;

function allowed(ad: Ad, audience: Audience): boolean {
  if (audience === 'adult') return true;
  if (ad.genre === 'Beer') return false;
  if (ad.isBreak) return audience === 'family' || audience === 'teen' || !GROWN_UP_TAPES.test(ad.title);
  switch (ad.genre) {
    case 'Kids':
    case 'Toys & Games':
      return true;
    case 'Food & Drink':
      return audience !== 'kids' || !GROWN_UP_FOOD.test(ad.title);
    case 'Movies':
      return audience !== 'kids' || FAMILY_MOVIES.test(ad.title);
    case 'Phones & Tech':
    case 'Stores & Services':
      return audience !== 'kids';
    case 'Home':
    case 'Health & Beauty':
    case 'Cars':
    case 'Network':
      return audience === 'family';
    default:
      return false;
  }
}

const pools = new Map<Audience, { spots: Ad[]; aired: Ad[] }>();

/** The spots and aired breaks a channel for `audience` may run. */
export function adPool(audience: Audience): { spots: Ad[]; aired: Ad[] } {
  let pool = pools.get(audience);
  if (!pool) {
    // grown-up channels run every spot; out-of-season Christmas ads are rare enough to leave in
    const ok = ADS.filter(ad => allowed(ad, audience) && !ad.season);
    pool = { spots: ok.filter(ad => !ad.isBreak), aired: ok.filter(ad => ad.isBreak) };
    pools.set(audience, pool);
  }
  return pool;
}

/** Small seeded PRNG, so every screen builds the same breaks. */
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

/** About how long a break runs: two to three minutes, like the real ones. */
const BREAK_MIN = 110;
const BREAK_MAX = 180;

/**
 * One break for `audience`: single spots of different brands until it fills
 * two to three minutes, or now and then a stretch of a real aired break.
 */
export function makeBreak(seed: number, audience: Audience): Ad[] {
  const random = rng(seed * 2654435761 + 7);
  const { spots, aired } = adPool(audience);
  if (aired.length && (!spots.length || random() < 0.35)) return [aired[Math.floor(random() * aired.length)]];
  const target = BREAK_MIN + random() * (BREAK_MAX - BREAK_MIN);
  const brands = new Set<string>();
  const out: Ad[] = [];
  let total = 0;
  for (let guard = 0; total < target && guard < 60; guard += 1) {
    const ad = spots[Math.floor(random() * spots.length)];
    if (!ad || brands.has(ad.brand)) continue;
    brands.add(ad.brand);
    out.push(ad);
    total += ad.seconds;
  }
  return out;
}

const breakSeconds = (spots: Ad[]) => spots.reduce((sum, ad) => sum + ad.seconds, 0);

/**
 * A channel's parts with a commercial break after each episode, so the show
 * "goes to commercial" and comes back. Taped broadcasts already have their
 * own breaks, so `breakAfter` leaves them alone. `seed` keeps channels from
 * running the same breaks in step.
 */
export function withBreaks(parts: ArchivePart[], audience: Audience, seed: number, breakAfter: (part: ArchivePart) => boolean = () => true): ArchivePart[] {
  const out: ArchivePart[] = [];
  parts.forEach((part, i) => {
    out.push(part);
    if (!breakAfter(part)) return;
    const spots = makeBreak(seed * 1000 + i, audience);
    if (!spots.length) return;
    const next = parts[(i + 1) % parts.length];
    out.push({ file: '', seconds: Math.round(breakSeconds(spots) * 100) / 100, title: `Commercials · up next: ${next.title}`, spots });
  });
  return out;
}
