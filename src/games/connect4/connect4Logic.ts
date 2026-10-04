import { Connect4State, DiscColor, Connect4Mode, Connect4RuleConfig } from '../../types';

export const DEFAULT_CONFIGS: Record<Connect4Mode, Connect4RuleConfig> = {
  classic: {
    mode: 'classic',
    rows: 6,
    cols: 7,
    winLength: 4,
    turnTimerSeconds: 0,
    allowPopOut: false,
    allowSpin: false
  },
  blackout: {
    mode: 'blackout',
    rows: 6,
    cols: 7,
    winLength: 4,
    turnTimerSeconds: 0,
    allowPopOut: false,
    allowSpin: false
  },
  connect5: {
    mode: 'connect5',
    rows: 8,
    cols: 8,
    winLength: 5,
    turnTimerSeconds: 0,
    allowPopOut: false,
    allowSpin: false
  },
  pop_out: {
    mode: 'pop_out',
    rows: 6,
    cols: 7,
    winLength: 4,
    turnTimerSeconds: 0,
    allowPopOut: true,
    allowSpin: false
  },
  blitz: {
    mode: 'blitz',
    rows: 6,
    cols: 7,
    winLength: 4,
    turnTimerSeconds: 10,
    allowPopOut: false,
    allowSpin: false
  },
  gravity_spin: {
    mode: 'gravity_spin',
    rows: 7,
    cols: 7,
    winLength: 4,
    turnTimerSeconds: 0,
    allowPopOut: false,
    allowSpin: true
  }
};

export const ROWS = 6;
export const COLS = 7;

export function createEmptyConnect4Board(rows = 6, cols = 7): DiscColor[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

export function initializeConnect4(mode: Connect4Mode = 'classic'): Connect4State {
  const config = DEFAULT_CONFIGS[mode] || DEFAULT_CONFIGS.classic;
  return {
    board: createEmptyConnect4Board(config.rows, config.cols),
    rows: config.rows,
    cols: config.cols,
    currentTurn: 'red',
    winner: null,
    winningLine: null,
    droppingDisc: null,
    moveHistory: [],
    mode: config.mode,
    scores: { red: 0, yellow: 0 },
    turnTimeLeft: config.turnTimerSeconds || 10,
    spinAngle: 0
  };
}

export function getLowestEmptyRow(board: DiscColor[][], col: number): number {
  const rows = board.length;
  for (let r = rows - 1; r >= 0; r--) {
    if (board[r][col] === null) {
      return r;
    }
  }
  return -1;
}

export function popOutBottomDisc(
  board: DiscColor[][],
  col: number
): { nextBoard: DiscColor[][]; poppedColor: DiscColor } {
  const rows = board.length;
  const poppedColor = board[rows - 1][col];
  if (!poppedColor) return { nextBoard: board, poppedColor: null };

  const nextBoard = board.map(r => [...r]);
  for (let r = rows - 1; r > 0; r--) {
    nextBoard[r][col] = nextBoard[r - 1][col];
  }
  nextBoard[0][col] = null;

  return { nextBoard, poppedColor };
}

export function rotateBoardGravity(board: DiscColor[][]): DiscColor[][] {
  const rows = board.length;
  const cols = board[0].length;
  // Transpose and reverse rows for 90deg clockwise
  const rotated: DiscColor[][] = Array.from({ length: cols }, () => Array(rows).fill(null));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = board[r][c];
    }
  }

  // Apply gravity downward
  const rRows = rotated.length;
  const rCols = rotated[0].length;
  const settled: DiscColor[][] = Array.from({ length: rRows }, () => Array(rCols).fill(null));

  for (let c = 0; c < rCols; c++) {
    const pieces: DiscColor[] = [];
    for (let r = 0; r < rRows; r++) {
      if (rotated[r][c] !== null) {
        pieces.push(rotated[r][c]);
      }
    }
    let targetRow = rRows - 1;
    for (let i = pieces.length - 1; i >= 0; i--) {
      settled[targetRow][c] = pieces[i];
      targetRow--;
    }
  }

  return settled;
}

export function countAllConnections(
  board: DiscColor[][],
  winLength = 4
): { red: number; yellow: number; winningLines: { row: number; col: number }[][] } {
  const rows = board.length;
  const cols = board[0].length;
  let red = 0;
  let yellow = 0;
  const winningLines: { row: number; col: number }[][] = [];

  // Horizontal
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols - winLength; c++) {
      const color = board[r][c];
      if (color) {
        let match = true;
        for (let i = 1; i < winLength; i++) {
          if (board[r][c + i] !== color) {
            match = false;
            break;
          }
        }
        if (match) {
          if (color === 'red') red++;
          if (color === 'yellow') yellow++;
          const line = Array.from({ length: winLength }, (_, i) => ({ row: r, col: c + i }));
          winningLines.push(line);
        }
      }
    }
  }

  // Vertical
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r <= rows - winLength; r++) {
      const color = board[r][c];
      if (color) {
        let match = true;
        for (let i = 1; i < winLength; i++) {
          if (board[r + i][c] !== color) {
            match = false;
            break;
          }
        }
        if (match) {
          if (color === 'red') red++;
          if (color === 'yellow') yellow++;
          const line = Array.from({ length: winLength }, (_, i) => ({ row: r + i, col: c }));
          winningLines.push(line);
        }
      }
    }
  }

  // Diagonal Down-Right (\)
  for (let r = 0; r <= rows - winLength; r++) {
    for (let c = 0; c <= cols - winLength; c++) {
      const color = board[r][c];
      if (color) {
        let match = true;
        for (let i = 1; i < winLength; i++) {
          if (board[r + i][c + i] !== color) {
            match = false;
            break;
          }
        }
        if (match) {
          if (color === 'red') red++;
          if (color === 'yellow') yellow++;
          const line = Array.from({ length: winLength }, (_, i) => ({ row: r + i, col: c + i }));
          winningLines.push(line);
        }
      }
    }
  }

  // Diagonal Up-Right (/)
  for (let r = winLength - 1; r < rows; r++) {
    for (let c = 0; c <= cols - winLength; c++) {
      const color = board[r][c];
      if (color) {
        let match = true;
        for (let i = 1; i < winLength; i++) {
          if (board[r - i][c + i] !== color) {
            match = false;
            break;
          }
        }
        if (match) {
          if (color === 'red') red++;
          if (color === 'yellow') yellow++;
          const line = Array.from({ length: winLength }, (_, i) => ({ row: r - i, col: c + i }));
          winningLines.push(line);
        }
      }
    }
  }

  return { red, yellow, winningLines };
}

export function checkConnect4Win(
  board: DiscColor[][],
  winLength = 4,
  mode: Connect4Mode = 'classic'
): {
  winner: 'red' | 'yellow' | 'draw' | null;
  line: { row: number; col: number }[] | null;
  scores?: { red: number; yellow: number };
} {
  const rows = board.length;
  const cols = board[0].length;

  if (mode === 'blackout') {
    const counts = countAllConnections(board, winLength);
    const isFull = board[0].every(cell => cell !== null);
    if (isFull) {
      if (counts.red > counts.yellow) {
        return { winner: 'red', line: counts.winningLines[0] || null, scores: { red: counts.red, yellow: counts.yellow } };
      } else if (counts.yellow > counts.red) {
        return { winner: 'yellow', line: counts.winningLines[0] || null, scores: { red: counts.red, yellow: counts.yellow } };
      } else {
        return { winner: 'draw', line: null, scores: { red: counts.red, yellow: counts.yellow } };
      }
    }
    return { winner: null, line: null, scores: { red: counts.red, yellow: counts.yellow } };
  }

  // Check Horizontal
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols - winLength; c++) {
      const color = board[r][c];
      if (color) {
        let match = true;
        for (let i = 1; i < winLength; i++) {
          if (board[r][c + i] !== color) {
            match = false;
            break;
          }
        }
        if (match) {
          return {
            winner: color,
            line: Array.from({ length: winLength }, (_, i) => ({ row: r, col: c + i }))
          };
        }
      }
    }
  }

  // Check Vertical
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r <= rows - winLength; r++) {
      const color = board[r][c];
      if (color) {
        let match = true;
        for (let i = 1; i < winLength; i++) {
          if (board[r + i][c] !== color) {
            match = false;
            break;
          }
        }
        if (match) {
          return {
            winner: color,
            line: Array.from({ length: winLength }, (_, i) => ({ row: r + i, col: c }))
          };
        }
      }
    }
  }

  // Check Diagonal Down-Right (\)
  for (let r = 0; r <= rows - winLength; r++) {
    for (let c = 0; c <= cols - winLength; c++) {
      const color = board[r][c];
      if (color) {
        let match = true;
        for (let i = 1; i < winLength; i++) {
          if (board[r + i][c + i] !== color) {
            match = false;
            break;
          }
        }
        if (match) {
          return {
            winner: color,
            line: Array.from({ length: winLength }, (_, i) => ({ row: r + i, col: c + i }))
          };
        }
      }
    }
  }

  // Check Diagonal Up-Right (/)
  for (let r = winLength - 1; r < rows; r++) {
    for (let c = 0; c <= cols - winLength; c++) {
      const color = board[r][c];
      if (color) {
        let match = true;
        for (let i = 1; i < winLength; i++) {
          if (board[r - i][c + i] !== color) {
            match = false;
            break;
          }
        }
        if (match) {
          return {
            winner: color,
            line: Array.from({ length: winLength }, (_, i) => ({ row: r - i, col: c + i }))
          };
        }
      }
    }
  }

  // Check Draw
  const isFull = board[0].every(cell => cell !== null);
  if (isFull) {
    return { winner: 'draw', line: null };
  }

  return { winner: null, line: null };
}

/**
 * Minimax AI for Connect 4
 */
function evaluateWindow(window: DiscColor[], aiColor: 'yellow', humanColor: 'red', winLength = 4): number {
  let score = 0;
  const aiCount = window.filter(c => c === aiColor).length;
  const humanCount = window.filter(c => c === humanColor).length;
  const emptyCount = window.filter(c => c === null).length;

  if (aiCount === winLength) score += 10000;
  else if (aiCount === winLength - 1 && emptyCount === 1) score += 120;
  else if (aiCount === winLength - 2 && emptyCount === 2) score += 20;

  if (humanCount === winLength - 1 && emptyCount === 1) score -= 450;
  else if (humanCount === winLength - 2 && emptyCount === 2) score -= 40;

  return score;
}

function scoreBoard(board: DiscColor[][], aiColor: 'yellow', humanColor: 'red', winLength = 4): number {
  let score = 0;
  const rows = board.length;
  const cols = board[0].length;

  // Center column preference
  const centerCol = Math.floor(cols / 2);
  const centerCount = board.map(r => r[centerCol]).filter(c => c === aiColor).length;
  score += centerCount * 8;

  // Horizontal windows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols - winLength; c++) {
      const window = Array.from({ length: winLength }, (_, i) => board[r][c + i]);
      score += evaluateWindow(window, aiColor, humanColor, winLength);
    }
  }

  // Vertical windows
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r <= rows - winLength; r++) {
      const window = Array.from({ length: winLength }, (_, i) => board[r + i][c]);
      score += evaluateWindow(window, aiColor, humanColor, winLength);
    }
  }

  // Diagonals
  for (let r = 0; r <= rows - winLength; r++) {
    for (let c = 0; c <= cols - winLength; c++) {
      const window = Array.from({ length: winLength }, (_, i) => board[r + i][c + i]);
      score += evaluateWindow(window, aiColor, humanColor, winLength);
    }
  }

  for (let r = winLength - 1; r < rows; r++) {
    for (let c = 0; c <= cols - winLength; c++) {
      const window = Array.from({ length: winLength }, (_, i) => board[r - i][c + i]);
      score += evaluateWindow(window, aiColor, humanColor, winLength);
    }
  }

  return score;
}

export function getBestConnect4Move(
  board: DiscColor[][],
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  winLength = 4,
  mode: Connect4Mode = 'classic'
): number {
  const cols = board[0].length;
  const validCols: number[] = [];

  for (let c = 0; c < cols; c++) {
    if (board[0][c] === null) {
      validCols.push(c);
    }
  }

  if (validCols.length === 0) return 0;

  // Easy: mostly random
  if (difficulty === 'easy') {
    // 30% chance smart, 70% random
    if (Math.random() < 0.7) {
      return validCols[Math.floor(Math.random() * validCols.length)];
    }
  }

  // Check immediate winning move for AI
  for (const c of validCols) {
    const row = getLowestEmptyRow(board, c);
    const testBoard = board.map(r => [...r]);
    testBoard[row][c] = 'yellow';
    const win = checkConnect4Win(testBoard, winLength, mode);
    if (win.winner === 'yellow') {
      return c;
    }
  }

  // Check immediate winning block for Human
  for (const c of validCols) {
    const row = getLowestEmptyRow(board, c);
    const testBoard = board.map(r => [...r]);
    testBoard[row][c] = 'red';
    const win = checkConnect4Win(testBoard, winLength, mode);
    if (win.winner === 'red') {
      return c;
    }
  }

  if (difficulty === 'medium') {
    // Evaluate based on 1-ply window score
    let bestScore = -Infinity;
    let bestCol = validCols[Math.floor(Math.random() * validCols.length)];

    for (const c of validCols) {
      const row = getLowestEmptyRow(board, c);
      const testBoard = board.map(r => [...r]);
      testBoard[row][c] = 'yellow';
      const score = scoreBoard(testBoard, 'yellow', 'red', winLength);

      if (score > bestScore) {
        bestScore = score;
        bestCol = c;
      }
    }
    return bestCol;
  }

  // Hard: 2-ply Minimax Lookahead
  let bestScore = -Infinity;
  let bestCol = validCols[0];

  for (const c of validCols) {
    const row = getLowestEmptyRow(board, c);
    const testBoard = board.map(r => [...r]);
    testBoard[row][c] = 'yellow';

    let minHumanScore = Infinity;
    const nextValidCols: number[] = [];
    for (let nc = 0; nc < cols; nc++) {
      if (testBoard[0][nc] === null) nextValidCols.push(nc);
    }

    if (nextValidCols.length === 0) {
      minHumanScore = scoreBoard(testBoard, 'yellow', 'red', winLength);
    } else {
      for (const hc of nextValidCols) {
        const hRow = getLowestEmptyRow(testBoard, hc);
        const humanTest = testBoard.map(r => [...r]);
        humanTest[hRow][hc] = 'red';
        const humanWin = checkConnect4Win(humanTest, winLength, mode);
        if (humanWin.winner === 'red') {
          minHumanScore = -99999;
          break;
        }
        const s = scoreBoard(humanTest, 'yellow', 'red', winLength);
        if (s < minHumanScore) {
          minHumanScore = s;
        }
      }
    }

    if (minHumanScore > bestScore) {
      bestScore = minHumanScore;
      bestCol = c;
    }
  }

  return bestCol;
}
