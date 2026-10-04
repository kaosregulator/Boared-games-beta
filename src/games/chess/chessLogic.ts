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
      // Diagonal Captures
      [-1, 1].forEach(dc => {
        const nc = c + dc;
        if (nc >= 0 && nc < 8 && f1 >= 0 && f1 < 8) {
          const target = board[f1][nc];
          if (target && target.color === oppColor) {
            moves.push({ r: f1, c: nc });
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

      // Castling
      if (includeCastling && !piece.hasMoved) {
        // Kingside
        if (!board[r][c + 1] && !board[r][c + 2] && board[r][c + 3]?.type === 'r' && !board[r][c + 3]?.hasMoved) {
          if (!isSquareUnderAttack(board, r, c, oppColor) && !isSquareUnderAttack(board, r, c + 1, oppColor)) {
            moves.push({ r, c: c + 2, isCastle: true });
          }
        }
        // Queenside
        if (!board[r][c - 1] && !board[r][c - 2] && !board[r][c - 3] && board[r][c - 4]?.type === 'r' && !board[r][c - 4]?.hasMoved) {
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

export function getLegalMoves(board: ChessBoard, r: number, c: number): { r: number; c: number }[] {
  const piece = board[r][c];
  if (!piece) return [];

  const rawMoves = getRawMoves(board, r, c, piece, true);
  const legalMoves: { r: number; c: number }[] = [];
  const oppColor = piece.color === 'w' ? 'b' : 'w';

  for (const move of rawMoves) {
    // Simulate move
    const cloneBoard = board.map(row => [...row]);
    cloneBoard[move.r][move.c] = piece;
    cloneBoard[r][c] = null;

    const kingPos = findKing(cloneBoard, piece.color);
    if (kingPos && !isSquareUnderAttack(cloneBoard, kingPos.r, kingPos.c, oppColor)) {
      legalMoves.push({ r: move.r, c: move.c });
    }
  }

  return legalMoves;
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
          // Simulate
          const clone = board.map(row => [...row]);
          const captured = clone[to.r][to.c];
          clone[to.r][to.c] = p;
          clone[r][c] = null;

          let moveScore = evaluateBoardScore(clone);
          if (captured) {
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
