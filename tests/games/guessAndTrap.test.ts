import assert from 'node:assert/strict';
import { test } from 'node:test';
import { askGuessWhoQuestion, createInitialGuessWhoState } from '../../src/games/guesswho/guessWhoRules.ts';
import { createInitialMouseTrapState, rollMouseTrapTurn } from '../../src/games/mousetrap/mouseTrapRules.ts';

test('a Guess Who question folds faces and hands the turn over', () => {
  const start = createInitialGuessWhoState(() => 0.4);
  const next = askGuessWhoQuestion(start, 'glasses', () => 0.2);
  assert.equal(next.turn, 'ai');
  assert.ok(next.playerFoldedIds.length > 0);
  assert.equal(next.askedQuestionIds.includes('glasses'), true);
});

test('a Mouse Trap roll of 3 writes a new log', () => {
  const start = createInitialMouseTrapState('mode1_classic');
  const out = rollMouseTrapTurn(start, 3);
  assert.equal(out.dice, 3);
  assert.notEqual(out.nextState.lastActionLog, start.lastActionLog);
  assert.equal(out.nextState.currentTurn !== 'red' || out.nextState.turnCount !== start.turnCount, true);
});
