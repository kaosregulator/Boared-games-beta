import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adPool, makeBreak, withBreaks } from '../../src/tv/lineups/breaks.ts';
import { blockOnAir } from '../../src/tv/lineups/archiveBlocks.ts';
import { CHANNELS } from '../../src/tv/channels.ts';

test("kids' channels only get kids' spots: no beer, cars, pills or grown-up tapes", () => {
  const { spots, aired } = adPool('kids');
  assert.ok(spots.length > 50 && aired.length > 50);
  for (const ad of spots) assert.ok(['Kids', 'Toys & Games', 'Food & Drink', 'Movies'].includes(ad.genre), `${ad.title} (${ad.genre})`);
  for (const ad of [...spots, ...aired]) assert.doesNotMatch(ad.title, /beer|NYPD|NBC|slim ?fast|coffee/i);
  assert.ok(adPool('adult').spots.some(ad => ad.genre === 'Beer'));
  assert.ok(!adPool('teen').spots.some(ad => ad.genre === 'Beer'));
});

test('a break runs two to three minutes, one brand once, the same on every screen', () => {
  for (let seed = 0; seed < 40; seed += 1) {
    const spots = makeBreak(seed, 'kids');
    assert.deepEqual(makeBreak(seed, 'kids'), spots);
    const total = spots.reduce((s, a) => s + a.seconds, 0);
    if (spots.length > 1) {
      assert.ok(total >= 110 && total < 260, `break ${seed} runs ${total}s`);
      assert.equal(new Set(spots.map(a => a.brand)).size, spots.length);
    }
  }
});

test('breaks go after episodes, not after taped broadcasts that have their own', () => {
  const ep = { file: 'ep.mp4', seconds: 1300, title: 'Show · Ep 1' };
  const tape = { file: 'tape.mp4', seconds: 7200, title: 'Taped block' };
  const parts = withBreaks([tape, ep], 'kids', 1, p => p === ep);
  assert.deepEqual(parts.map(p => (p.spots ? 'break' : p.title)), ['Taped block', 'Show · Ep 1', 'break']);
  assert.match(parts[2].title, /up next: Taped block/);
});

test('every show channel has a picture to play at any hour', () => {
  for (const ch of CHANNELS) {
    if (ch.kind !== 'block') continue;
    for (let h = 0; h < 48; h += 1) {
      const air = blockOnAir(ch.block, Date.UTC(2026, 9, 30, h, 17) / 1000);
      assert.ok(air.part.spots?.length || air.part.file, `${ch.call} at hour ${h}`);
      assert.ok(air.offset >= 0 && air.offset < air.part.seconds);
    }
  }
});
