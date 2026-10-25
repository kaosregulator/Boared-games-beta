import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LAYOUT } from '../../src/room/roomLayout.ts';
import { BED_BOUNDS } from '../../src/room/hotwheels/world.ts';
import { QUIP_SPOTS, Quipper, quipSeconds } from '../../src/room/roomQuips.ts';

const bed = { x: (BED_BOUNDS.minX + BED_BOUNDS.maxX) / 2, z: (BED_BOUNDS.minZ + BED_BOUNDS.maxZ) / 2 };

function lcg(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

test('walking under the bed gets a line about under the bed', () => {
  const q = new Quipper({ gap: 1, cooldown: 5, chance: 1, random: lcg() });
  // Out in the open first, past the opening quiet.
  for (let i = 0; i < 10; i++) assert.equal(q.tick(0.1, 'walk', 0, 0, 0), null);
  const line = q.tick(0.1, 'walk', bed.x, 0, bed.z);
  assert.ok(line, 'says something on the way in');
  assert.equal(line.spot, 'under-bed');
});

test('the Hot Pockets plate gets the pizza roll joke sooner or later', () => {
  const spot = QUIP_SPOTS.find(s => s.id === 'hot-pockets')!;
  assert.ok(spot.lines.some(l => (Array.isArray(l) ? l.join(' ') : l).includes('pizza roll')));
  const q = new Quipper({ gap: 0.5, cooldown: 0, chance: 10, random: lcg(3) });
  const seen = new Set<string>();
  for (let i = 0; i < 4000; i++) {
    const l = q.tick(0.05, 'walk', LAYOUT.hotpockets.x, 0, LAYOUT.hotpockets.z);
    if (l) seen.add(l.text + (l.then ?? ''));
  }
  assert.equal(seen.size, spot.lines.length, 'every line comes up');
  assert.ok([...seen].some(t => t.includes('pizza roll')));
});

test('never the same line twice in a row, and never back to back too fast', () => {
  const q = new Quipper({ gap: 3, cooldown: 0, chance: 10, random: lcg(11) });
  let last = '';
  let lastAt = -Infinity;
  let t = 0;
  let count = 0;
  for (let i = 0; i < 20000; i++) {
    t += 0.05;
    const l = q.tick(0.05, 'fly', 0, 1, 0);
    if (!l) continue;
    count++;
    assert.notEqual(l.text, last, 'no repeat');
    assert.ok(t - lastAt >= 3 - 1e-6, 'respects the gap');
    last = l.text;
    lastAt = t;
  }
  assert.ok(count > 50);
});

test('the closet joke has its catch', () => {
  const fly = QUIP_SPOTS.find(s => s.id === 'flying')!;
  const closet = fly.lines.find(l => Array.isArray(l) && l[0].includes('closet'));
  assert.ok(Array.isArray(closet));
  assert.match(closet[1], /don't have a closet/);
  assert.ok(quipSeconds(closet[0]) > quipSeconds('Hi'));
});

test('a car only says car things and floor things', () => {
  const q = new Quipper({ gap: 0, cooldown: 0, chance: 100, random: lcg(5) });
  for (let i = 0; i < 400; i++) {
    const l = q.tick(0.05, 'car', 2, 0, 2);
    if (l) assert.equal(l.spot, 'car');
  }
});
