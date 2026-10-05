import { CheckerBoard, CheckerPiece, CheckerPieceColor, CheckerMove, CheckersState } from '../../types';

export const createInitialCheckersBoard = (): CheckerBoard => {
  const board: CheckerBoard = Array(8).fill(null).map(() => Array(8).fill(null));

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) {
          board[r][c] = { id: `b_${r}_${c}`, color: 'black', isKing: false };
        } else if (r > 4) {
          board[r][c] = { id: `r_${r}_${c}`, color: 'red', isKing: false };
        }
      }
    }
  }
  return board;
};

export const getLegalMovesForPiece = (
  board: CheckerBoard,
  r: number,
  c: number,
  piece: CheckerPiece
): CheckerMove[] => {
  const moves: CheckerMove[] = [];
  const forwardDirs = piece.color === 'red' ? [-1] : [1];
  const rowDirs = piece.isKing ? [-1, 1] : forwardDirs;
  const colDirs = [-1, 1];

  // 1. Regular 1-step diagonal moves
  for (const dr of rowDirs) {
    for (const dc of colDirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (!board[nr][nc]) {
          const becomesKing = !piece.isKing && ((piece.color === 'red' && nr === 0) || (piece.color === 'black' && nr === 7));
          moves.push({
            from: { r, c },
            to: { r: nr, c: nc },
            becomesKing
          });
        }
      }
    }
  }

  // 2. Jump captures (2-step over opponent piece)
  for (const dr of rowDirs) {
    for (const dc of colDirs) {
      const midR = r + dr;
      const midC = c + dc;
      const jumpR = r + dr * 2;
      const jumpC = c + dc * 2;

      if (jumpR >= 0 && jumpR < 8 && jumpC >= 0 && jumpC < 8) {
        const midPiece = board[midR][midC];
        if (midPiece && midPiece.color !== piece.color && !board[jumpR][jumpC]) {
          const becomesKing = !piece.isKing && ((piece.color === 'red' && jumpR === 0) || (piece.color === 'black' && jumpR === 7));
          moves.push({
            from: { r, c },
            to: { r: jumpR, c: jumpC },
            captured: { r: midR, c: midC },
            becomesKing
          });
        }
      }
    }
  }

  return moves;
};

export const getAllLegalMovesForColor = (
  board: CheckerBoard,
  color: CheckerPieceColor
): CheckerMove[] => {
  const allMoves: CheckerMove[] = [];
  const jumpMoves: CheckerMove[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const moves = getLegalMovesForPiece(board, r, c, piece);
        for (const m of moves) {
          if (m.captured) {
            jumpMoves.push(m);
          } else {
            allMoves.push(m);
          }
        }
      }
    }
  }

  // In official tournament checkers, jumps take priority if available!
  return jumpMoves.length > 0 ? jumpMoves : allMoves;
};

/**
 * Jumps the piece that just captured is still able to make. Official play forces
 * the chain to be completed with the same piece, except that crowning ends the
 * move immediately.
 */
export const getContinuationJumps = (board: CheckerBoard, r: number, c: number): CheckerMove[] => {
  const piece = board[r][c];
  if (!piece) return [];
  return getLegalMovesForPiece(board, r, c, piece).filter(m => !!m.captured);
};

export const executeCheckerMove = (board: CheckerBoard, move: CheckerMove): CheckerBoard => {
  const newBoard = board.map(row => [...row]);
  const piece = newBoard[move.from.r][move.from.c];
  if (!piece) return newBoard;

  newBoard[move.from.r][move.from.c] = null;

  // Capture
  if (move.captured) {
    newBoard[move.captured.r][move.captured.c] = null;
  }

  const isKing = piece.isKing || !!move.becomesKing;
  newBoard[move.to.r][move.to.c] = {
    ...piece,
    isKing
  };

  return newBoard;
};

export const getAIMove = (board: CheckerBoard, color: CheckerPieceColor): CheckerMove | null => {
  const legalMoves = getAllLegalMovesForColor(board, color);
  if (legalMoves.length === 0) return null;

  // Score moves: jumps = high, kinging = high, center control = bonus
  let bestScore = -9999;
  let bestMoves: CheckerMove[] = [];

  for (const move of legalMoves) {
    let score = 0;
    if (move.captured) score += 50;
    if (move.becomesKing) score += 40;
    // Prefer advancing
    score += color === 'black' ? move.to.r * 2 : (7 - move.to.r) * 2;
    // Avoid edges if possible
    if (move.to.c > 1 && move.to.c < 6) score += 5;

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
};
