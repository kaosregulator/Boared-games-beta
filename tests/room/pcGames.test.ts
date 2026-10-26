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
  // The deal is built by taking free pairs off a full board, so playing them in
  // that order always works. (A blind search here used to run out of budget on some deals.)
  for (let round = 0; round < 20; round += 1) {
    const moves: [number, number][] = [];
    const faces = deal(moves);
    assert.equal(moves.length, 72);
    const present = SLOTS.map(() => true);
    for (const [a, b] of moves) {
      assert.ok(isFree(a, present) && isFree(b, present), `round ${round}: ${a},${b} free`);
      assert.ok(matches(faces[a], faces[b]), `round ${round}: ${a},${b} match`);
      present[a] = present[b] = false;
    }
    assert.ok(present.every(p => !p));
  }
});

test('Pegged starts the classic board with the middle empty', () => {
  const pegs = setup('Solitaire');
  assert.equal(pegs.filter(Boolean).length, 32);
  assert.equal(pegs[3 * 7 + 3], false);
  // Only the four pegs two away from the middle can move first.
  const movers = pegs.map((p, i) => (p && jumpsFrom(pegs, i).length ? i : -1)).filter(i => i >= 0);
  assert.deepEqual(movers.sort((a, b) => a - b), [1 * 7 + 3, 3 * 7 + 1, 3 * 7 + 5, 5 * 7 + 3]);
});
