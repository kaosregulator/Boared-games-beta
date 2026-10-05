/** Suspects, weapons and the mansion, laid out on a walkable grid. */

export type Suspect =
  | 'Scarlett'
  | 'Mustard'
  | 'White'
  | 'Green'
  | 'Peacock'
  | 'Plum';

export type Weapon =
  | 'Candlestick'
  | 'Knife'
  | 'Lead Pipe'
  | 'Revolver'
  | 'Rope'
  | 'Wrench';

export type RoomName =
  | 'Study'
  | 'Hall'
  | 'Lounge'
  | 'Library'
  | 'Billiard Room'
  | 'Dining Room'
  | 'Conservatory'
  | 'Ballroom'
  | 'Kitchen';

export const SUSPECTS: { id: Suspect; full: string; colour: string }[] = [
  { id: 'Scarlett', full: 'Miss Scarlett', colour: '#d7263d' },
  { id: 'Mustard', full: 'Colonel Mustard', colour: '#d9a21b' },
  { id: 'White', full: 'Mrs. White', colour: '#e8e4dc' },
  { id: 'Green', full: 'Mr. Green', colour: '#2f9e52' },
  { id: 'Peacock', full: 'Mrs. Peacock', colour: '#2a6fd4' },
  { id: 'Plum', full: 'Professor Plum', colour: '#8a4bd1' },
];

export const WEAPONS: { id: Weapon; glyph: string }[] = [
  { id: 'Candlestick', glyph: '🕯️' },
  { id: 'Knife', glyph: '🔪' },
  { id: 'Lead Pipe', glyph: '🪈' },
  { id: 'Revolver', glyph: '🔫' },
  { id: 'Rope', glyph: '🪢' },
  { id: 'Wrench', glyph: '🔧' },
];

export const ROOMS: RoomName[] = [
  'Study',
  'Hall',
  'Lounge',
  'Library',
  'Billiard Room',
  'Dining Room',
  'Conservatory',
  'Ballroom',
  'Kitchen',
];

export const GRID = 15;

export interface RoomRect {
  name: RoomName;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Corridor tiles the room can be entered from. */
  doors: [number, number][];
}

/**
 * The mansion on a 15x15 grid: nine rooms around a central cellar, connected by
 * corridors, with the two diagonal secret passages from the real board.
 */
export const ROOM_RECTS: RoomRect[] = [
  { name: 'Study', x: 0, y: 0, w: 4, h: 3, doors: [[4, 2]] },
  { name: 'Hall', x: 6, y: 0, w: 3, h: 4, doors: [[7, 4]] },
  { name: 'Lounge', x: 11, y: 0, w: 4, h: 3, doors: [[10, 2]] },
  { name: 'Library', x: 0, y: 5, w: 3, h: 3, doors: [[3, 6]] },
  { name: 'Billiard Room', x: 0, y: 10, w: 4, h: 3, doors: [[4, 11]] },
  { name: 'Dining Room', x: 12, y: 5, w: 3, h: 4, doors: [[11, 6]] },
  { name: 'Conservatory', x: 0, y: 14, w: 4, h: 1, doors: [[4, 14]] },
  { name: 'Ballroom', x: 6, y: 11, w: 4, h: 4, doors: [[7, 10]] },
  { name: 'Kitchen', x: 12, y: 12, w: 3, h: 3, doors: [[11, 13]] },
];

export const SECRET_PASSAGES: Partial<Record<RoomName, RoomName>> = {
  Study: 'Kitchen',
  Kitchen: 'Study',
  Lounge: 'Conservatory',
  Conservatory: 'Lounge',
};

/** The cellar in the middle of the board holds the case file. */
export const CELLAR = { x: 6, y: 6, w: 3, h: 3 };

export function roomAt(x: number, y: number): RoomName | null {
  for (const r of ROOM_RECTS) {
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r.name;
  }
  return null;
}

function inCellar(x: number, y: number) {
  return x >= CELLAR.x && x < CELLAR.x + CELLAR.w && y >= CELLAR.y && y < CELLAR.y + CELLAR.h;
}

/** Corridor tiles are everything that is neither a room nor the cellar. */
export function isCorridor(x: number, y: number) {
  if (x < 0 || y < 0 || x >= GRID || y >= GRID) return false;
  return roomAt(x, y) === null && !inCellar(x, y);
}

export function doorsOf(room: RoomName) {
  return ROOM_RECTS.find(r => r.name === room)!.doors;
}

/** Shortest corridor step count between two tiles, or null if unreachable. */
export function corridorDistance(from: [number, number], to: [number, number]): number | null {
  if (from[0] === to[0] && from[1] === to[1]) return 0;
  const seen = new Set<string>([`${from[0]},${from[1]}`]);
  let frontier: [number, number][] = [from];
  let steps = 0;
  while (frontier.length > 0 && steps < 80) {
    steps += 1;
    const next: [number, number][] = [];
    for (const [x, y] of frontier) {
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;
        if (seen.has(key) || !isCorridor(nx, ny)) continue;
        if (nx === to[0] && ny === to[1]) return steps;
        seen.add(key);
        next.push([nx, ny]);
      }
    }
    frontier = next;
  }
  return null;
}

/** Starting corridor tiles for the six suspects, as printed on the board. */
export const START_TILES: Record<Suspect, [number, number]> = {
  Scarlett: [10, 4],
  Mustard: [14, 4],
  White: [10, 10],
  Green: [5, 14],
  Peacock: [4, 9],
  Plum: [4, 4],
};

export type Card =
  | { kind: 'suspect'; value: Suspect }
  | { kind: 'weapon'; value: Weapon }
  | { kind: 'room'; value: RoomName };

export function allCards(): Card[] {
  return [
    ...SUSPECTS.map(s => ({ kind: 'suspect' as const, value: s.id })),
    ...WEAPONS.map(w => ({ kind: 'weapon' as const, value: w.id })),
    ...ROOMS.map(r => ({ kind: 'room' as const, value: r })),
  ];
}

export const cardKey = (c: Card) => `${c.kind}:${c.value}`;
