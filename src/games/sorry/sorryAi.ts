import {
  PLAYER_COLORS,
  PLAYER_META,
  applyMoveToState,
  wrapTrackIndex,
  type LegalMove,
  type PawnState,
  type PlayerColor,
  type SorryGameState,
} from './sorryRules';

/**
 * How far a pawn has come: 0 in START, up to 58 round the perimeter from its
 * exit square, then the safety squares, with HOME worth the most.
 */
export function pawnProgress(pawn: PawnState): number {
  if (pawn.zone === 'start') return 0;
  if (pawn.zone === 'home') return 70;
  if (pawn.zone === 'safety') return 60 + pawn.safetyIndex;
  return 1 + wrapTrackIndex(pawn.trackIndex - PLAYER_META[pawn.color].startExitTrack);
}

/** How well `color` stands: its own progress against the rivals'. */
export function sorryPosition(pawns: PawnState[], color: PlayerColor): number {
  const total = (c: PlayerColor) => pawns.filter(p => p.color === c).reduce((sum, p) => sum + pawnProgress(p), 0);
  const rivals = PLAYER_COLORS.filter(c => c !== color).map(total);
  return total(color) - 0.5 * Math.max(...rivals) - 0.15 * rivals.reduce((a, b) => a + b, 0);
}

/**
 * The computer's pick: play each legal move out and keep the one that leaves
 * its side best placed (bumps, slides, getting home and leaving START all show
 * up as progress gained or rivals set back). Moves within a hair of the best
 * are chosen between at random, so the same card is not always played the
 * same way. Null when there is no legal move (the turn passes).
 */
export function chooseSorryAiMove(state: SorryGameState, rng: () => number = Math.random): LegalMove | null {
  if (state.legalMoves.length === 0) return null;
  const color = state.currentTurn;
  const scored = state.legalMoves.map(move => {
    const after = applyMoveToState(state, move);
    return { move, score: sorryPosition(after.pawns, color) + (after.winner === color ? 1000 : 0) + move.scoreWeight * 0.02 };
  });
  const best = Math.max(...scored.map(s => s.score));
  const close = scored.filter(s => s.score >= best - 3);
  return close[Math.floor(rng() * close.length)].move;
}
