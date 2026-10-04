import { BattleshipState, CellState, Ship, ShipType } from '../../types';

export const GRID_SIZE = 10;

export const SHIP_DEFINITIONS: { type: ShipType; name: string; size: number; color: string }[] = [
  { type: 'carrier', name: 'Aircraft Carrier', size: 5, color: '#38bdf8' },
  { type: 'battleship', name: 'Battleship', size: 4, color: '#818cf8' },
  { type: 'cruiser', name: 'Cruiser', size: 3, color: '#34d399' },
  { type: 'submarine', name: 'Submarine', size: 3, color: '#fbbf24' },
  { type: 'destroyer', name: 'Destroyer', size: 2, color: '#f87171' }
];

export function createEmptyGrid(): CellState[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('empty'));
}

export function isValidPlacement(
  grid: CellState[][],
  x: number,
  y: number,
  size: number,
  orientation: 'horizontal' | 'vertical'
): boolean {
  if (orientation === 'horizontal') {
    if (x + size > GRID_SIZE) return false;
    for (let i = 0; i < size; i++) {
      if (grid[y][x + i] !== 'empty') return false;
    }
  } else {
    if (y + size > GRID_SIZE) return false;
    for (let i = 0; i < size; i++) {
      if (grid[y + i][x] !== 'empty') return false;
    }
  }
  return true;
}

export function generateRandomFleet(): { grid: CellState[][]; ships: Ship[] } {
  const grid = createEmptyGrid();
  const ships: Ship[] = [];

  for (const def of SHIP_DEFINITIONS) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 200) {
      attempts++;
      const orientation: 'horizontal' | 'vertical' = Math.random() > 0.5 ? 'horizontal' : 'vertical';
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);

      if (isValidPlacement(grid, x, y, def.size, orientation)) {
        const positions: { x: number; y: number }[] = [];
        for (let i = 0; i < def.size; i++) {
          const px = orientation === 'horizontal' ? x + i : x;
          const py = orientation === 'horizontal' ? y : y + i;
          grid[py][px] = 'ship';
          positions.push({ x: px, y: py });
        }
        ships.push({
          id: `${def.type}_${Date.now()}_${Math.random()}`,
          type: def.type,
          name: def.name,
          size: def.size,
          positions,
          hits: 0,
          sunk: false,
          color: def.color
        });
        placed = true;
      }
    }
  }

  return { grid, ships };
}

export function initializeBattleshipGame(): BattleshipState {
  const enemy = generateRandomFleet();
  return {
    playerBoard: createEmptyGrid(),
    enemyBoard: createEmptyGrid(),
    playerShips: [],
    enemyShips: enemy.ships,
    placementPhase: true,
    currentTurn: 'player',
    selectedShip: 'carrier',
    shipOrientation: 'horizontal',
    lastMove: null,
    winner: null,
    shotsFired: { player: 0, enemy: 0 },
    hitsLanded: { player: 0, enemy: 0 }
  };
}

/**
 * Smart AI firing logic with Search & Destroy (Hunting)
 */
export function getSmartAIMove(
  playerBoard: CellState[][],
  playerShips: Ship[],
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): { x: number; y: number } {
  const availableMoves: { x: number; y: number }[] = [];
  const hitDamagedCells: { x: number; y: number }[] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (playerBoard[y][x] === 'empty' || playerBoard[y][x] === 'ship') {
        availableMoves.push({ x, y });
      } else if (playerBoard[y][x] === 'hit') {
        // Check if part of an unsunk ship
        const hitShip = playerShips.find(s => !s.sunk && s.positions.some(p => p.x === x && p.y === y));
        if (hitShip) {
          hitDamagedCells.push({ x, y });
        }
      }
    }
  }

  if (availableMoves.length === 0) return { x: 0, y: 0 };

  // If hunting mode (Medium or Hard)
  if (difficulty !== 'easy' && hitDamagedCells.length > 0) {
    const adjacentTargets: { x: number; y: number }[] = [];
    const deltas = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    for (const cell of hitDamagedCells) {
      for (const d of deltas) {
        const nx = cell.x + d.dx;
        const ny = cell.y + d.dy;
        if (
          nx >= 0 &&
          nx < GRID_SIZE &&
          ny >= 0 &&
          ny < GRID_SIZE &&
          (playerBoard[ny][nx] === 'empty' || playerBoard[ny][nx] === 'ship')
        ) {
          if (!adjacentTargets.some(t => t.x === nx && t.y === ny)) {
            adjacentTargets.push({ x: nx, y: ny });
          }
        }
      }
    }

    if (adjacentTargets.length > 0) {
      return adjacentTargets[Math.floor(Math.random() * adjacentTargets.length)];
    }
  }

  // Hard difficulty parity checkerboard search
  if (difficulty === 'hard') {
    const parityMoves = availableMoves.filter(m => (m.x + m.y) % 2 === 0);
    if (parityMoves.length > 0) {
      return parityMoves[Math.floor(Math.random() * parityMoves.length)];
    }
  }

  // Default random from available
  return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}
