import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ADS, adAfter, adsOnAir, broadcastDay, daySchedule, inSeason, slotAfter } from '../../src/tv/lineups/ads90s.ts';

const day = broadcastDay(Date.UTC(2026, 9, 26, 18) / 1000).day;
const slots = daySchedule(day);

test('the library is 1990s commercials only, each one playable from archive.org', () => {
  assert.ok(ADS.length > 500);
  for (const ad of ADS) {
    assert.ok(ad.year >= 1990 && ad.year <= 1999, `${ad.title} is from ${ad.year}`);
    assert.ok(ad.seconds > 5, `${ad.title} has a length`);
    assert.match(ad.url, /^https:\/\/archive\.org\/download\/[^/]+\/.+\.mp4$/);
    assert.doesNotMatch(ad.title, /\bpromo\b|hotline|\bpsa\b/i);
  }
});

test('a day fills 24 hours with breaks, black between them, and no gaps in the clock', () => {
  assert.equal(slots[0].at, 0);
  for (let i = 1; i < slots.length; i += 1) assert.ok(Math.abs(slots[i].at - (slots[i - 1].at + slots[i - 1].seconds)) < 1e-6);
  const last = slots[slots.length - 1];
  assert.ok(last.at + last.seconds >= 86400);
  assert.ok(slots.some(s => s.ad === null));
});

test('everyone sees the same schedule, and the next day is different', () => {
  const again = daySchedule(day, ADS.slice());
  assert.deepEqual(again.slice(0, 50).map(s => s.ad?.index ?? -1), slots.slice(0, 50).map(s => s.ad?.index ?? -1));
  const tomorrow = daySchedule(day + 1);
  assert.notDeepEqual(tomorrow.slice(0, 20).map(s => s.ad?.index ?? -1), slots.slice(0, 20).map(s => s.ad?.index ?? -1));
});

test('a brand never runs twice in one break of spots', () => {
  let brands = new Set<string>();
  for (const s of slots) {
    if (!s.ad || s.ad.isBreak) {
      brands = new Set();
      continue;
    }
    assert.ok(!brands.has(s.ad.brand), `${s.ad.brand} twice in one break`);
    brands.add(s.ad.brand);
  }
});

test('spots do not repeat until the whole rotation has played', () => {
  const firstHours = slots.filter(s => s.ad && !s.ad.isBreak && s.at < 3 * 3600).map(s => s.ad!.index);
  assert.equal(new Set(firstHours).size, firstHours.length);
});

test('afternoons lean on kids, prime time on cars and movies, and beer stays out of the day', () => {
  const share = (from: number, to: number, genres: string[]) => {
    const window = slots.filter(s => s.ad && s.at >= from && s.at < to);
    const time = (list: typeof window) => list.reduce((a, s) => a + s.seconds, 0);
    return time(window.filter(s => genres.includes(s.ad!.genre))) / time(window);
  };
  // the day starts at 6 AM: 12-18 is 6..12 h in, 18-23 is 12..17 h in
  assert.ok(share(6 * 3600, 12 * 3600, ['Kids', 'Toys & Games']) > share(12 * 3600, 17 * 3600, ['Kids', 'Toys & Games']));
  assert.ok(share(12 * 3600, 17 * 3600, ['Cars', 'Movies']) > share(0, 6 * 3600, ['Cars', 'Movies']));
  assert.equal(share(0, 12 * 3600, ['Beer']), 0);
});

test('tuning in lands mid-spot on the shared clock, and the guide knows what is next', () => {
  const at = Date.UTC(2026, 9, 26, 18, 7, 13) / 1000;
  const air = adsOnAir(at);
  assert.ok(air);
  assert.ok(air.offset >= 0 && air.offset < air.slot.seconds);
  const next = slotAfter(air);
  assert.ok(next);
  const after = adAfter(air);
  assert.ok(after && after.inSeconds > 0 && after.inSeconds <= air.slot.seconds - air.offset + 1 + 1e-6);
  // one second later is the same spot or the very next slot
  const later = adsOnAir(at + 1);
  assert.ok(later && (later.index === air.index || later.index === air.index + 1));
});

test('seasonal spots only air in season', () => {
  const xmas = { ...ADS[0], season: 'xmas' as const };
  const spooky = { ...ADS[0], season: 'halloween' as const };
  assert.equal(inSeason(xmas, new Date(2026, 6, 4)), false);
  assert.equal(inSeason(xmas, new Date(2026, 11, 20)), true);
  assert.equal(inSeason(spooky, new Date(2026, 9, 26)), true);
  assert.equal(inSeason(spooky, new Date(2026, 10, 2)), false);
  const library = [...ADS, xmas];
  xmas.index = library.length - 1;
  const july = daySchedule(broadcastDay(Date.UTC(2026, 6, 4, 18) / 1000).day, library);
  assert.ok(!july.some(s => s.ad === xmas));
});
