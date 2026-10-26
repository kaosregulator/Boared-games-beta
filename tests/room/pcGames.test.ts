import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deal, isFree, matches, SLOTS } from '../../src/pc/apps/TaiPei';
import { jumpsFrom, setup } from '../../src/pc/apps/Pegged';

test('TaiPei turtle has 144 distinct spots', () => {
  assert.equal(SLOTS.length, 144);
  assert.equal(new Set(SLOTS.map(s => `${s.x},${s.y},${s.z}`)).size, 144);
});

test('TaiPei deals every face the right number of times', () => {
  const faces = deal();
  const count = new Map<number, number>();
  faces.forEach(f => count.set(f, (count.get(f) ?? 0) + 1));
  for (let f = 0; f < 34; f += 1) assert.equal(count.get(f), 4, `face ${f}`);
  for (let f = 34; f < 42; f += 1) assert.equal(count.get(f), 1, `bonus ${f}`);
});

test('TaiPei deals can be cleared by playing the pairs it was built from', () => {
  // A depth-first solve with a small budget: the backwards-built deal always has a way out.
  const faces = deal();
  const present = SLOTS.map(() => true);
  let budget = 200000;
  const solve = (left: number): boolean => {
    if (left === 0) return true;
    if ((budget -= 1) < 0) return false;
    const free = SLOTS.map((_, i) => i).filter(i => present[i] && isFree(i, present));
    for (let a = 0; a < free.length; a += 1)
      for (let b = a + 1; b < free.length; b += 1) {
        if (!matches(faces[free[a]], faces[free[b]])) continue;
        present[free[a]] = present[free[b]] = false;
        if (solve(left - 2)) return true;
        present[free[a]] = present[free[b]] = true;
      }
    return false;
  };
  assert.ok(solve(144));
});

test('Pegged starts the classic board with the middle empty', () => {
  const pegs = setup('Solitaire');
  assert.equal(pegs.filter(Boolean).length, 32);
  assert.equal(pegs[3 * 7 + 3], false);
  // Only the four pegs two away from the middle can move first.
  const movers = pegs.map((p, i) => (p && jumpsFrom(pegs, i).length ? i : -1)).filter(i => i >= 0);
  assert.deepEqual(movers.sort((a, b) => a - b), [1 * 7 + 3, 3 * 7 + 1, 3 * 7 + 5, 5 * 7 + 3]);
});
