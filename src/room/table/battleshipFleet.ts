/**
 * Fleet rules from Arrq54's Battleships: a 10x10 sea, one four-decker, two
 * three-deckers, three two-deckers and four single rafts. Ships may not touch,
 * not even at the corners, and a hit earns another shot.
 */

export const SIZE = 10;
export const FLEET = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

export interface Ship {
  id: number;
  size: number;
  x: number;
  y: number;
  horizontal: boolean;
  hits: number;
}

export type Shot = 'hit' | 'miss';
export type Shots = Record<string, Shot>;

export const key = (x: number, y: number) => `${x},${y}`;

export function cells(s: Pick<Ship, 'size' | 'x' | 'y' | 'horizontal'>) {
  return Array.from({ length: s.size }, (_, i) => (s.horizontal ? { x: s.x + i, y: s.y } : { x: s.x, y: s.y + i }));
}

export function canPlace(ships: Ship[], size: number, x: number, y: number, horizontal: boolean) {
  const want = cells({ size, x, y, horizontal });
  if (want.some(c => c.x < 0 || c.y < 0 || c.x >= SIZE || c.y >= SIZE)) return false;
  for (const s of ships) {
    for (const a of cells(s)) {
      for (const b of want) if (Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1) return false;
    }
  }
  return true;
}

export function randomFleet(sizes = FLEET, start: Ship[] = []): Ship[] {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const ships = [...start];
    let ok = true;
    for (const size of sizes) {
      let placed = false;
      for (let tries = 0; tries < 300 && !placed; tries += 1) {
        const horizontal = Math.random() < 0.5;
        const x = Math.floor(Math.random() * SIZE);
        const y = Math.floor(Math.random() * SIZE);
        if (canPlace(ships, size, x, y, horizontal)) {
          ships.push({ id: ships.length, size, x, y, horizontal, hits: 0 });
          placed = true;
        }
      }
      if (!placed) {
        ok = false;
        break;
      }
    }
    if (ok) return ships;
  }
  return start;
}

export function shipAt(ships: Ship[], x: number, y: number) {
  return ships.find(s => cells(s).some(c => c.x === x && c.y === y)) ?? null;
}

export const sunk = (s: Ship) => s.hits >= s.size;

/** Water around a sunk ship can't hold anything; mark it so nobody wastes a shot. */
export function ringAround(s: Ship) {
  const out: { x: number; y: number }[] = [];
  for (const c of cells(s)) {
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const x = c.x + dx;
        const y = c.y + dy;
        if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue;
        out.push({ x, y });
      }
    }
  }
  return out;
}

/** Hunt and target: finish a wounded ship along its line, otherwise search a checkerboard. */
export function aiPick(shots: Shots, ships: Ship[]): { x: number; y: number } {
  const open = (x: number, y: number) => x >= 0 && y >= 0 && x < SIZE && y < SIZE && !shots[key(x, y)];
  const wounded = ships.filter(s => s.hits > 0 && !sunk(s));
  if (wounded.length) {
    const hits = Object.entries(shots)
      .filter(([k, v]) => v === 'hit' && wounded.some(s => cells(s).some(c => key(c.x, c.y) === k)))
      .map(([k]) => k.split(',').map(Number) as [number, number]);
    const line =
      hits.length > 1 ? (hits[0][0] === hits[1][0] ? 'v' : 'h') : null;
    const candidates: [number, number][] = [];
    for (const [x, y] of hits) {
      const dirs: [number, number][] =
        line === 'h' ? [[1, 0], [-1, 0]] : line === 'v' ? [[0, 1], [0, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of dirs) if (open(x + dx, y + dy)) candidates.push([x + dx, y + dy]);
    }
    if (candidates.length) {
      const [x, y] = candidates[Math.floor(Math.random() * candidates.length)];
      return { x, y };
    }
  }
  const pool: [number, number][] = [];
  for (let x = 0; x < SIZE; x += 1) for (let y = 0; y < SIZE; y += 1) if (open(x, y) && (x + y) % 2 === 0) pool.push([x, y]);
  if (!pool.length) for (let x = 0; x < SIZE; x += 1) for (let y = 0; y < SIZE; y += 1) if (open(x, y)) pool.push([x, y]);
  const [x, y] = pool[Math.floor(Math.random() * pool.length)];
  return { x, y };
}
