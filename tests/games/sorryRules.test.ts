import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyMoveToState,
  createInitialGameState,
  createStandardDeck,
  drawNextCard,
} from '../../src/games/sorry/sorryRules.ts';

test('a Sorry deck has the classic 45 cards', () => {
  const deck = createStandardDeck(() => 0.5);
  assert.equal(deck.length, 45);
  assert.equal(deck.filter(c => c === '1').length, 5);
  assert.equal(deck.filter(c => c === 'SORRY!').length, 4);
});

test('a 1 brings a pawn out of start', () => {
  const start = createInitialGameState(() => 0.2);
  start.deck.push('1');
  start.currentTurn = 'yellow';
  const drawn = drawNextCard(start, () => 0);
  assert.equal(drawn.currentCard, '1');
  const move = drawn.legalMoves.find(m => m.leavesStart);
  assert.ok(move);
  const next = applyMoveToState(drawn, move!);
  assert.equal(
    next.pawns.some(p => p.color === 'yellow' && p.zone === 'track'),
    true,
  );
  assert.equal(next.turnPhase, 'draw');
});
