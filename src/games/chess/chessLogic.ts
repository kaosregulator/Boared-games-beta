import { ChessBoard, ChessMove, ChessPiece, ChessPieceColor, ChessPieceType, ChessState } from '../../types';

export function createInitialBoard(): ChessBoard {
  const board: ChessBoard = Array.from({ length: 8 }, () => Array(8).fill(null));

  // Pawns
  for (let c = 0; c < 8; c++) {
    board[1][c] = { type: 'p', color: 'b' };
    board[6][c] = { type: 'p', color: 'w' };
  }

  // Major pieces
  const pieces: ChessPieceType[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: pieces[c], color: 'b' };
    board[7][c] = { type: pieces[c], color: 'w' };
  }

  return board;
}

export function initializeChess(): ChessState {
  return {
    board: createInitialBoard(),
    turn: 'w',
    selectedSquare: null,
    validMoves: [],
    capturedWhite: [],
    capturedBlack: [],
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    lastMove: null,
    moveHistory: []
  };
}

export function findKing(board: ChessBoard, color: ChessPieceColor): { r: number; c: number } | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type === 'k' && p.color === color) {
        return { r, c };
      }
    }
  }
  return null;
}

export function isSquareUnderAttack(
  board: ChessBoard,
  r: number,
  c: number,
  attackerColor: ChessPieceColor
): boolean {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const p = board[row][col];
      if (p && p.color === attackerColor) {
        const rawMoves = getRawMoves(board, row, col, p, false);
        if (rawMoves.some(m => m.r === r && m.c === c)) {
          return true;
        }
      }
    }
  }
  return false;
}

export function getRawMoves(
  board: ChessBoard,
  r: number,
  c: number,
  piece: ChessPiece,
  includeCastling: boolean = true
): { r: number; c: number; isCastle?: boolean; isEnPassant?: boolean }[] {
  const moves: { r: number; c: number; isCastle?: boolean; isEnPassant?: boolean }[] = [];
  const dir = piece.color === 'w' ? -1 : 1;
  const oppColor: ChessPieceColor = piece.color === 'w' ? 'b' : 'w';

  switch (piece.type) {
    case 'p': {
      // Forward 1
      const f1 = r + dir;
      if (f1 >= 0 && f1 < 8 && !board[f1][c]) {
        moves.push({ r: f1, c });
        // Forward 2
        const startRow = piece.color === 'w' ? 6 : 1;
        const f2 = r + dir * 2;
        if (r === startRow && !board[f2][c]) {
          moves.push({ r: f2, c });
        }
      }
      // Diagonal captures, including en passant on the square behind a pawn that just stepped two.
      [-1, 1].forEach(dc => {
        const nc = c + dc;
        if (nc >= 0 && nc < 8 && f1 >= 0 && f1 < 8) {
          const target = board[f1][nc];
          if (target && target.color === oppColor) {
            moves.push({ r: f1, c: nc });
          } else if (!target) {
            const side = board[r][nc];
            if (side?.type === 'p' && side.color === oppColor && side.ep) {
              moves.push({ r: f1, c: nc, isEnPassant: true });
            }
          }
        }
      });
      break;
    }

    case 'n': {
      const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, dc] of knightOffsets) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = board[nr][nc];
          if (!target || target.color === oppColor) {
            moves.push({ r: nr, c: nc });
          }
        }
      }
      break;
    }

    case 'b': {
      const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of diagDirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = board[nr][nc];
          if (!target) {
            moves.push({ r: nr, c: nc });
          } else {
            if (target.color === oppColor) moves.push({ r: nr, c: nc });
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    }

    case 'r': {
      const orthDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of orthDirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = board[nr][nc];
          if (!target) {
            moves.push({ r: nr, c: nc });
          } else {
            if (target.color === oppColor) moves.push({ r: nr, c: nc });
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    }

    case 'q': {
      const allDirs = [
        [-1, -1], [-1, 1], [1, -1], [1, 1],
        [-1, 0], [1, 0], [0, -1], [0, 1]
      ];
      for (const [dr, dc] of allDirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = board[nr][nc];
          if (!target) {
            moves.push({ r: nr, c: nc });
          } else {
            if (target.color === oppColor) moves.push({ r: nr, c: nc });
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    }

    case 'k': {
      const kingDirs = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];
      for (const [dr, dc] of kingDirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          const target = board[nr][nc];
          if (!target || target.color === oppColor) {
            moves.push({ r: nr, c: nc });
          }
        }
      }

      // Castling. The rook has to be this side's own rook, still on its corner.
      if (includeCastling && !piece.hasMoved) {
        const kingside = board[r][c + 3];
        if (
          !board[r][c + 1] &&
          !board[r][c + 2] &&
          kingside?.type === 'r' &&
          kingside.color === piece.color &&
          !kingside.hasMoved
        ) {
          if (!isSquareUnderAttack(board, r, c, oppColor) && !isSquareUnderAttack(board, r, c + 1, oppColor)) {
            moves.push({ r, c: c + 2, isCastle: true });
          }
        }
        const queenside = board[r][c - 4];
        if (
          !board[r][c - 1] &&
          !board[r][c - 2] &&
          !board[r][c - 3] &&
          queenside?.type === 'r' &&
          queenside.color === piece.color &&
          !queenside.hasMoved
        ) {
          if (!isSquareUnderAttack(board, r, c, oppColor) && !isSquareUnderAttack(board, r, c - 1, oppColor)) {
            moves.push({ r, c: c - 2, isCastle: true });
          }
        }
      }
      break;
    }
  }

  return moves;
}

export interface AppliedChessMove {
  board: ChessBoard;
  captured: ChessPiece | null;
  /** Where the captured piece stood. En passant takes the pawn beside the mover, not the landing square. */
  capturedAt: { r: number; c: number } | null;
  castle: 'k' | 'q' | null;
  enPassant: boolean;
  promoted: ChessPieceType | null;
}

/**
 * Play one move on a copy of the board: captures, castling's rook, promotion,
 * and the en-passant flag. A pawn that is not promoting ignores `promoteTo`.
 */
export function applyChessMove(
  board: ChessBoard,
  from: { r: number; c: number },
  to: { r: number; c: number },
  promoteTo: ChessPieceType = 'q',
): AppliedChessMove {
  const next: ChessBoard = board.map(row =>
    row.map(p => (p ? { type: p.type, color: p.color, ...(p.hasMoved ? { hasMoved: true as const } : {}) } : null)),
  );
  const piece = next[from.r]?.[from.c];
  if (!piece) {
    return { board: next, captured: null, capturedAt: null, castle: null, enPassant: false, promoted: null };
  }

  let captured = next[to.r][to.c];
  let capturedAt = captured ? { r: to.r, c: to.c } : null;
  let enPassant = false;
  if (piece.type === 'p' && from.c !== to.c && !captured) {
    const victim = board[from.r][to.c];
    if (victim?.type === 'p' && victim.color !== piece.color && victim.ep) {
      captured = victim;
      capturedAt = { r: from.r, c: to.c };
      next[from.r][to.c] = null;
      enPassant = true;
    }
  }

  const promoting = piece.type === 'p' && (to.r === 0 || to.r === 7);
  const placed: ChessPiece = {
    type: promoting ? promoteTo : piece.type,
    color: piece.color,
    hasMoved: true,
  };
  next[from.r][from.c] = null;
  next[to.r][to.c] = placed;

  let castle: 'k' | 'q' | null = null;
  if (piece.type === 'k' && Math.abs(to.c - from.c) === 2) {
    castle = to.c > from.c ? 'k' : 'q';
    const fromC = castle === 'k' ? 7 : 0;
    const toC = castle === 'k' ? 5 : 3;
    const rook = next[to.r][fromC];
    if (rook?.type === 'r' && rook.color === piece.color) {
      next[to.r][toC] = { ...rook, hasMoved: true };
      next[to.r][fromC] = null;
    }
  }

  if (piece.type === 'p' && Math.abs(to.r - from.r) === 2) {
    next[to.r][to.c] = { ...placed, ep: true };
  }

  return {
    board: next,
    captured,
    capturedAt,
    castle,
    enPassant,
    promoted: promoting ? placed.type : null,
  };
}

export function getLegalMoves(board: ChessBoard, r: number, c: number): { r: number; c: number }[] {
  const piece = board[r][c];
  if (!piece) return [];

  const rawMoves = getRawMoves(board, r, c, piece, true);
  const legalMoves: { r: number; c: number }[] = [];
  const oppColor = piece.color === 'w' ? 'b' : 'w';

  for (const move of rawMoves) {
    const played = applyChessMove(board, { r, c }, move);
    const kingPos = findKing(played.board, piece.color);
    if (kingPos && !isSquareUnderAttack(played.board, kingPos.r, kingPos.c, oppColor)) {
      legalMoves.push({ r: move.r, c: move.c });
    }
  }

  return legalMoves;
}

/** Check, checkmate, and stalemate for the side about to move. */
export function sideStatus(board: ChessBoard, toMove: ChessPieceColor) {
  const king = findKing(board, toMove);
  const opp = toMove === 'w' ? 'b' : 'w';
  const inCheck = king ? isSquareUnderAttack(board, king.r, king.c, opp) : false;
  let any = false;
  for (let r = 0; r < 8 && !any; r++) {
    for (let c = 0; c < 8 && !any; c++) {
      if (board[r][c]?.color === toMove && getLegalMoves(board, r, c).length > 0) any = true;
    }
  }
  return { inCheck, mate: inCheck && !any, stalemate: !inCheck && !any };
}

export function evaluateBoardScore(board: ChessBoard): number {
  const values: Record<ChessPieceType, number> = {
    p: 10,
    n: 30,
    b: 30,
    r: 50,
    q: 90,
    k: 900
  };

  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        const val = values[p.type];
        // Center control bonus
        const centerBonus = (r >= 2 && r <= 5 && c >= 2 && c <= 5) ? 2 : 0;
        if (p.color === 'b') {
          score += val + centerBonus;
        } else {
          score -= val + centerBonus;
        }
      }
    }
  }
  return score;
}

export function getBestChessMove(
  board: ChessBoard,
  color: ChessPieceColor = 'b',
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): { from: { r: number; c: number }; to: { r: number; c: number } } | null {
  const allMoves: { from: { r: number; c: number }; to: { r: number; c: number }; score: number }[] = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color) {
        const legals = getLegalMoves(board, r, c);
        for (const to of legals) {
          const played = applyChessMove(board, { r, c }, to);
          let moveScore = evaluateBoardScore(played.board);
          if (played.captured) {
            moveScore += color === 'b' ? 15 : -15;
          }

          allMoves.push({ from: { r, c }, to, score: moveScore });
        }
      }
    }
  }

  if (allMoves.length === 0) return null;

  if (difficulty === 'easy') {
    return allMoves[Math.floor(Math.random() * allMoves.length)];
  }

  // Sort best for black
  allMoves.sort((a, b) => b.score - a.score);
  return allMoves[0];
}
