import assert from 'node:assert/strict';
import test from 'node:test';
import { CARPET, KINDS, RULES, START, makePuzzle, matchesFor, riddleText, type Difficulty } from '../../src/room/ispy/puzzle.ts';

const LEVELS: Difficulty[] = ['easy', 'medium', 'hard'];

test('the same seed makes the same page', () => {
  const a = makePuzzle(1234, 'medium');
  const b = makePuzzle(1234, 'medium');
  assert.deepEqual(a, b);
  assert.notEqual(riddleText(makePuzzle(1235, 'medium')), riddleText(a));
});

test('every riddle line points at exactly one toy', () => {
  for (const level of LEVELS) {
    for (let seed = 1; seed <= 150; seed++) {
      const p = makePuzzle(seed * 7919, level);
      assert.equal(p.targets.length, RULES[level].targets);
      p.phrases.forEach((phrase, i) => {
        assert.equal(matchesFor(p, i), 1, `${level} seed ${seed * 7919}: "${phrase}" fits ${matchesFor(p, i)} toys`);
      });
      assert.equal(p.items[p.targets[p.targets.length - 1]].kind, 'libraryBook');
    }
  }
});

test('pages fill up with the difficulty and stay on the carpet', () => {
  for (const level of LEVELS) {
    const p = makePuzzle(42, level);
    assert.equal(p.theme.difficulty, level);
    assert.equal(p.items.length, RULES[level].items);
    for (const item of p.items) {
      assert.ok(Math.abs(item.x - CARPET.x) < CARPET.w / 2, `${item.kind} off the carpet in x`);
      assert.ok(Math.abs(item.z - CARPET.z) < CARPET.d / 2, `${item.kind} off the carpet in z`);
      assert.ok(Math.hypot(item.x - START.x, item.z - START.z) > 0.2, 'nothing dropped where you stand');
      assert.ok(KINDS[item.kind].colors.includes(item.color) || item.kind === 'block' || item.kind === 'number');
    }
  }
  assert.ok(makePuzzle(42, 'hard').items.length > makePuzzle(42, 'easy').items.length);
});

test('all the themes come up', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 200; seed++) for (const level of LEVELS) seen.add(makePuzzle(seed, level).theme.id);
  assert.equal(seen.size, 7);
});
