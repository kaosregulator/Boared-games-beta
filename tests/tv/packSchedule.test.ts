import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CARTOONS, CHANNELS, cartoonPack, type PackId } from '../../src/tv/channels.ts';
import { PACK_SLOT, packOnAir, packOrder } from '../../src/tv/packSchedule.ts';

const PACKS: PackId[] = ['toon', 'heroes', 'felix', 'betty', 'woody', 'ubi'];

test('every cartoon sits on exactly one station, and each station has a film', () => {
  const counts = Object.fromEntries(PACKS.map(id => [id, 0])) as Record<PackId, number>;
  for (const film of CARTOONS) counts[cartoonPack(film)] += 1;
  for (const id of PACKS) assert.ok(counts[id] > 0, `${id} is empty`);
  assert.equal(PACKS.reduce((n, id) => n + counts[id], 0), CARTOONS.length);
  assert.equal(counts.felix, CARTOONS.filter(c => c.title.startsWith('Felix')).length);
  assert.ok(CARTOONS.filter(c => /popeye/i.test(c.title) || c.title.startsWith('Superman')).every(c => cartoonPack(c) === 'heroes'));
  assert.ok(CARTOONS.filter(c => c.title.startsWith('Betty')).every(c => cartoonPack(c) === 'betty'));
  assert.ok(CARTOONS.filter(c => c.studio.startsWith('Ub') || c.title.startsWith('Flip')).every(c => cartoonPack(c) === 'ubi'));
});

test('the dial lists six cartoon stations instead of one channel per short', () => {
  const packs = CHANNELS.filter(c => c.kind === 'pack');
  assert.deepEqual(packs.map(c => c.number), [9, 10, 11, 12, 13, 14]);
  assert.equal(packs.length, 6);
  assert.ok(CHANNELS.some(c => c.kind === 'snick' && c.number === 2));
  assert.ok(CHANNELS.some(c => c.kind === 'ads' && c.number === 90));
});

test('a cycle plays every film once, and the next cycle is a different order', () => {
  const films = CARTOONS.filter(c => cartoonPack(c) === 'toon');
  const seen = new Set<string>();
  for (let i = 0; i < films.length; i += 1) {
    const air = packOnAir(films, 'toon', i * PACK_SLOT + 10);
    seen.add(air.film.id);
    assert.ok(air.offset >= 10 && air.offset < PACK_SLOT);
  }
  assert.equal(seen.size, films.length);
  const first = packOrder('toon', films.length, 0);
  const second = packOrder('toon', films.length, 1);
  assert.notDeepEqual(first, second);
  assert.deepEqual(packOrder('felix', 7, 3), packOrder('felix', 7, 3));
});

test('the Woody and UBI stations carry more than a couple of shorts, with no repeats', () => {
  const ids = CARTOONS.map(c => c.id);
  assert.equal(new Set(ids).size, ids.length, 'a film is listed twice');
  const woody = CARTOONS.filter(c => cartoonPack(c) === 'woody');
  const ubi = CARTOONS.filter(c => cartoonPack(c) === 'ubi');
  assert.ok(woody.length >= 8, `woody has ${woody.length}`);
  assert.ok(ubi.length >= 12, `ubi has ${ubi.length}`);
  assert.ok(woody.some(c => c.title.startsWith('Woody Woodpecker')));
  assert.ok(woody.every(c => c.studio === 'Walter Lantz'));
});
