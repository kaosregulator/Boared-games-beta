import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chooseSorryAiMove, pawnProgress } from '../../src/games/sorry/sorryAi.ts';
import { createInitialGameState, getLegalMovesForCard, type PawnState, type SorryGameState } from '../../src/games/sorry/sorryRules.ts';
import { movePaths } from '../../src/room/table/sorryMotion.ts';

function setup(overrides: Record<string, Partial<PawnState>>, card: NonNullable<SorryGameState['currentCard']>, color: SorryGameState['currentTurn'] = 'yellow') {
  const s = createInitialGameState(() => 0.2);
  s.pawns = s.pawns.map(p => ({ ...p, ...(overrides[p.id] ?? {}) }));
  s.currentTurn = color;
  s.currentCard = card;
  s.turnPhase = 'move';
  s.legalMoves = getLegalMovesForCard(s.pawns, color, card);
  return s;
}

const onTrack = (trackIndex: number): Partial<PawnState> => ({ zone: 'track', trackIndex, safetyIndex: -1 });

test('a pawn walks the track square by square', () => {
  const s = setup({ 'yellow-0': onTrack(40) }, '5');
  const move = s.legalMoves.find(m => m.primaryPawnId === 'yellow-0')!;
  const path = movePaths(s, move).get('yellow-0')!;
  assert.equal(path.length, 5);
  assert.notDeepEqual(path[0], path[1]);
});

test('a bumped pawn gets a hop back to start', () => {
  const s = setup({ 'yellow-0': onTrack(40), 'red-0': onTrack(43) }, '3');
  const move = s.legalMoves.find(m => m.bumpedPawns.some(b => b.pawnId === 'red-0'))!;
  assert.ok(move);
  assert.equal(movePaths(s, move).get('red-0')!.length, 1);
});

test('the computer takes the bump over a quiet step', () => {
  const s = setup({ 'blue-0': onTrack(30), 'blue-1': onTrack(5), 'red-0': onTrack(33) }, '3', 'blue');
  assert.ok(s.legalMoves.length >= 2);
  for (const r of [0, 0.5, 0.99]) {
    const pick = chooseSorryAiMove(s, () => r)!;
    assert.ok(pick.bumpedPawns.some(b => b.pawnId === 'red-0'), 'bumps the rival');
  }
});

test('the computer gets a pawn home when it can, and passes with no moves', () => {
  const s = setup({ 'green-0': { zone: 'safety', trackIndex: -1, safetyIndex: 2 }, 'green-1': onTrack(10) }, '3', 'green');
  assert.equal(chooseSorryAiMove(s, () => 0)!.entersHome, true);
  assert.equal(chooseSorryAiMove({ ...s, legalMoves: [] }), null);
  const p = s.pawns[0];
  assert.ok(pawnProgress({ ...p, zone: 'home' }) > pawnProgress({ ...p, zone: 'safety', safetyIndex: 4 }));
});

test('the computer does not always play the first listed move', () => {
  const s = setup({ 'blue-0': onTrack(20), 'blue-1': onTrack(26) }, '3', 'blue');
  const picks = new Set<string>();
  for (let i = 0; i < 20; i++) picks.add(chooseSorryAiMove(s, () => i / 20)!.id);
  assert.ok(picks.size >= 1);
  const best = chooseSorryAiMove(s, () => 0.5)!;
  assert.ok(s.legalMoves.includes(best));
});
