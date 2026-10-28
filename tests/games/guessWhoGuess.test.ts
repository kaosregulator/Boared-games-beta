import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GUESS_WHO_CHARACTERS, createInitialGuessWhoState, makeDirectCharacterGuess } from '../../src/games/guesswho/guessWhoRules.ts';

test('you can guess a face that is still standing, without flipping it first', () => {
  const start = createInitialGuessWhoState(() => 0.4);
  assert.deepEqual(start.playerFoldedIds, []);
  const out = makeDirectCharacterGuess(start, start.aiSecret.id, () => 0.1);
  assert.equal(out.winner, 'player');
  // every other face drops for the reveal; theirs stays up
  assert.equal(out.playerFoldedIds.includes(start.aiSecret.id), false);
  assert.equal(out.playerFoldedIds.length, GUESS_WHO_CHARACTERS.length - 1);
});

test('a wrong guess flips that face down and hands Blue the turn', () => {
  const start = createInitialGuessWhoState(() => 0.4);
  const wrong = GUESS_WHO_CHARACTERS.find(c => c.id !== start.aiSecret.id)!;
  const out = makeDirectCharacterGuess(start, wrong.id, () => 0.1);
  assert.equal(out.winner, null);
  assert.equal(out.turn, 'ai');
  assert.deepEqual(out.playerFoldedIds, [wrong.id]);
});

test('a face already flipped down can still be guessed', () => {
  const start = createInitialGuessWhoState(() => 0.4);
  const folded = { ...start, playerFoldedIds: [start.aiSecret.id] };
  assert.equal(makeDirectCharacterGuess(folded, start.aiSecret.id, () => 0.1).winner, 'player');
});
