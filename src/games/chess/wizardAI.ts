import type { ChessBoard, ChessPieceColor, ChessPieceType } from '../../types';
import { applyChessMove, findKing, getLegalMoves, getRawMoves, isSquareUnderAttack, sideStatus } from './chessLogic';

/**
 * The opponent from the owner's wizards-chess engine (`chooseSmartAIMove` in
 * wizardChessEngine.js), ported onto this room's board and move rules, so it
 * castles, takes en passant and promotes like everything else at the table.
 *
 * Each legal move is scored the way the source scores it: what it takes,
 * how central it lands, how far a pawn gets, a bonus for giving check, and a
 * penalty when the piece can simply be taken back. A little noise keeps the
 * openings from repeating, and any move within a point of the best is a
 * candidate.
 *
 * Difficulty only changes how much the opponent looks ahead:
 *   easy   — the source's scoring under heavy noise: it grabs a free queen but
 *            wanders and blunders.
 *   medium — the source's opponent as written.
 *   hard   — the source's scoring, plus it reads the reply: it plays mate in
 *            one, will not walk into one, and counts every piece it would
 *            leave hanging rather than only the one it moved.
 */

export type WizardDifficulty = 'easy' | 'medium' | 'hard';

export interface WizardMove {
  from: { r: number; c: number };
  to: { r: number; c: number };
}

/** The source's piece values. */
export const PIECE_VALUES: Record<ChessPieceType, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const NOISE: Record<WizardDifficulty, number> = { easy: 260, medium: 14, hard: 6 };

const other = (c: ChessPieceColor): ChessPieceColor => (c === 'w' ? 'b' : 'w');

export function allLegalMoves(board: ChessBoard, color: ChessPieceColor): WizardMove[] {
  const out: WizardMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color !== color) continue;
      for (const to of getLegalMoves(board, r, c)) out.push({ from: { r, c }, to });
    }
  }
  return out;
}

/** Can any piece of `by` reach (r, c) on this board? (The source's pseudo-move test.) */
function attacked(board: ChessBoard, r: number, c: number, by: ChessPieceColor) {
  for (let rr = 0; rr < 8; rr++) {
    for (let cc = 0; cc < 8; cc++) {
      const p = board[rr][cc];
      if (p?.color !== by) continue;
      if (getRawMoves(board, rr, cc, p, false).some(m => m.r === r && m.c === c)) return true;
    }
  }
  return false;
}

/** The most valuable piece of `color` that the other side can take right now. */
function worstHanging(board: ChessBoard, color: ChessPieceColor) {
  let worst = 0;
  const opp = other(color);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p?.color !== color || p.type === 'k') continue;
      if (attacked(board, r, c, opp)) worst = Math.max(worst, PIECE_VALUES[p.type]);
    }
  }
  return worst;
}

/** Does the side to move have a reply that mates `color`? Only replies that give check are tried. */
function hasMateReply(board: ChessBoard, color: ChessPieceColor) {
  const opp = other(color);
  for (const m of allLegalMoves(board, opp)) {
    const next = applyChessMove(board, m.from, m.to).board;
    const king = findKing(next, color);
    if (!king || !isSquareUnderAttack(next, king.r, king.c, opp)) continue;
    if (sideStatus(next, color).mate) return true;
  }
  return false;
}

/** The source's score for one move, before noise. `hard` adds the look at the reply. */
export function scoreMove(board: ChessBoard, color: ChessPieceColor, m: WizardMove, hard = false): number {
  const piece = board[m.from.r][m.from.c];
  if (!piece) return -Infinity;
  const played = applyChessMove(board, m.from, m.to);
  let score = 0;

  // Material gain on capture
  if (played.captured) score += PIECE_VALUES[played.captured.type] * 1.15 - PIECE_VALUES[piece.type] * 0.08;

  // Center control bonus
  const centerDist = Math.abs(3.5 - m.to.r) + Math.abs(3.5 - m.to.c);
  score += (7 - centerDist) * 8;

  // Pawn advancement bonus
  if (piece.type === 'p') score += (color === 'w' ? 6 - m.to.r : m.to.r - 1) * 12;

  const next = played.board;
  const opp = other(color);
  const oppKing = findKing(next, opp);
  const check = Boolean(oppKing && isSquareUnderAttack(next, oppKing.r, oppKing.c, color));
  if (check) score += 45;

  if (!hard) {
    // Can the opponent recapture on the destination square?
    if (attacked(next, m.to.r, m.to.c, opp)) score -= PIECE_VALUES[piece.type] * 0.75;
    return score;
  }

  const status = sideStatus(next, opp);
  if (status.mate) return score + 100000;
  if (status.stalemate) return score - 2000;
  // Everything left en prise, not just the piece that moved.
  score -= worstHanging(next, color) * 0.75;
  if (hasMateReply(next, color)) score -= 50000;
  return score;
}

/**
 * The opponent's move for `color`, or null when it has none. `random` is
 * injectable so tests can pin the noise.
 */
export function chooseSmartAIMove(
  board: ChessBoard,
  color: ChessPieceColor,
  difficulty: WizardDifficulty = 'medium',
  random: () => number = Math.random,
): WizardMove | null {
  const legal = allLegalMoves(board, color);
  if (legal.length === 0) return null;
  const noise = NOISE[difficulty];
  const hard = difficulty === 'hard';

  let best = -Infinity;
  let candidates: WizardMove[] = [];
  for (const m of legal) {
    // Small jitter so the AI varies openings
    const score = scoreMove(board, color, m, hard) + (random() - 0.5) * noise;
    if (score > best + 1) {
      best = score;
      candidates = [m];
    } else if (Math.abs(score - best) <= 1) {
      candidates.push(m);
    }
  }
  return candidates[Math.floor(random() * candidates.length)] ?? legal[0];
}
