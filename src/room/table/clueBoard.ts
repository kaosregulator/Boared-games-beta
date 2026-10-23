import * as THREE from 'three';
import { GRID, ROOM_RECTS, type RoomName, type RoomRect } from '../../games/clue/clueData';

/**
 * Where things are on the Clue board once it lies open on the card table:
 * grid tiles to table-local metres, each room's walls and doorway, and the
 * free floor spots people and weapons stand on inside a room.
 */

/** The opened board is 0.5 m square (layoutFor in BoxUnfold). */
export const SIDE = 0.5;
export const TILE = SIDE / GRID;
/** Top of the printed board above the table top. */
export const BOARD_Y = 0.0042;
/** Pop-up walls: about 2 m to a 4 cm person. */
export const WALL_H = 0.05;
/** Game metres per real metre: a 1.7 m person is a 4 cm figure. */
export const SCALE = 0.04 / 1.7;

export function tileXZ(x: number, y: number): [number, number] {
  return [((x + 0.5) / GRID - 0.5) * SIDE, ((y + 0.5) / GRID - 0.5) * SIDE];
}

export function tilePos(x: number, y: number, out = new THREE.Vector3()) {
  const [px, pz] = tileXZ(x, y);
  return out.set(px, BOARD_Y, pz);
}

/** A point given in tile units from a room's top-left corner. */
export function roomPoint(r: RoomRect, u: number, v: number, out = new THREE.Vector3()) {
  return out.set(((r.x + u) / GRID - 0.5) * SIDE, BOARD_Y, ((r.y + v) / GRID - 0.5) * SIDE);
}

export function rectOf(room: RoomName) {
  return ROOM_RECTS.find(r => r.name === room)!;
}

export function roomCentre(room: RoomName) {
  const r = rectOf(room);
  return roomPoint(r, r.w / 2, r.h / 2);
}

export type Side = 'N' | 'S' | 'E' | 'W';

/** Which wall the doorway is in, and the tile inside the room by the door. */
export function doorway(room: RoomName) {
  const r = rectOf(room);
  const [dx, dy] = r.doors[0];
  let side: Side = 'N';
  let inside: [number, number] = [dx, r.y];
  if (dx === r.x + r.w) {
    side = 'E';
    inside = [r.x + r.w - 1, dy];
  } else if (dx === r.x - 1) {
    side = 'W';
    inside = [r.x, dy];
  } else if (dy === r.y + r.h) {
    side = 'S';
    inside = [dx, r.y + r.h - 1];
  }
  return { side, door: [dx, dy] as [number, number], inside };
}

/** Corner of the room where its secret passage trapdoor sits, in room tiles. */
export const PASSAGE_CORNER: Partial<Record<RoomName, [number, number]>> = {
  Study: [0.45, 0.45],
  Kitchen: [2.55, 2.55],
  Lounge: [3.55, 0.45],
  Conservatory: [0.45, 0.5],
};

/* -------------------------------- furniture -------------------------------- */

export type FurnitureKind =
  | 'desk'
  | 'chair'
  | 'armchair'
  | 'sofa'
  | 'bookcase'
  | 'billiard'
  | 'dining'
  | 'piano'
  | 'stove'
  | 'counter'
  | 'kitchenTable'
  | 'clock'
  | 'stairs'
  | 'sideboard'
  | 'globe'
  | 'roundTable'
  | 'coffeeTable'
  | 'standee:palm'
  | 'standee:fern'
  | 'standee:armour'
  | 'standee:lamp'
  | 'standee:vase'
  | 'standee:harp';

export interface Furniture {
  kind: FurnitureKind;
  /** Centre, in tiles from the room's top-left corner. */
  u: number;
  v: number;
  /** Turn: 0 faces south (+z), PI/2 faces east. */
  rot: number;
  /** Floor footprint in real metres, before turning. */
  w: number;
  d: number;
}

const f = (kind: FurnitureKind, u: number, v: number, rot: number, w: number, d: number): Furniture => ({ kind, u, v, rot, w, d });
const E = Math.PI / 2;
const W = -Math.PI / 2;
const N = Math.PI;

/**
 * Each room furnished like its Clue room, pushed back against the walls so the
 * middle of the floor stays free to walk about in.
 */
export const FURNITURE: Record<RoomName, Furniture[]> = {
  Study: [
    f('bookcase', 2.0, 0.17, 0, 1.8, 0.4),
    f('desk', 1.5, 1.05, N, 1.6, 0.8),
    f('chair', 1.5, 0.62, 0, 0.5, 0.5),
    f('armchair', 0.45, 2.45, -2.4, 0.9, 0.9),
    f('globe', 3.55, 0.45, 0, 0.5, 0.5),
    f('standee:lamp', 0.3, 1.5, E, 0.6, 0.3),
  ],
  Hall: [
    f('clock', 0.25, 0.3, 0, 0.5, 0.35),
    f('stairs', 2.35, 1.1, 0, 1.2, 2.4),
    f('standee:armour', 0.22, 2.2, E, 0.8, 0.3),
    f('standee:vase', 2.75, 3.6, W, 0.6, 0.3),
  ],
  Lounge: [
    f('sofa', 2.0, 0.35, 0, 2.0, 0.9),
    f('coffeeTable', 2.0, 1.2, 0, 1.1, 0.6),
    f('armchair', 3.55, 1.5, W, 0.9, 0.9),
    f('armchair', 0.5, 0.6, 0.6, 0.9, 0.9),
    f('standee:fern', 3.6, 2.6, W, 0.8, 0.3),
  ],
  Library: [
    f('bookcase', 1.2, 0.17, 0, 1.8, 0.4),
    f('bookcase', 0.17, 1.6, E, 1.8, 0.4),
    f('armchair', 1.4, 2.4, N + 0.5, 0.9, 0.9),
    f('roundTable', 2.3, 2.5, 0, 0.6, 0.6),
    f('standee:lamp', 0.3, 2.7, E, 0.6, 0.3),
  ],
  'Billiard Room': [
    f('billiard', 1.75, 1.45, 0, 2.6, 1.4),
    f('armchair', 0.45, 0.45, 0.7, 0.9, 0.9),
    f('roundTable', 3.5, 0.4, 0, 0.6, 0.6),
  ],
  'Dining Room': [
    f('dining', 1.7, 2.1, 0, 1.0, 2.4),
    f('sideboard', 1.5, 0.2, 0, 1.8, 0.5),
    f('standee:palm', 2.7, 3.7, W, 1.0, 0.3),
  ],
  Conservatory: [
    f('standee:palm', 1.3, 0.22, 0, 1.0, 0.3),
    f('standee:fern', 2.4, 0.22, 0, 0.8, 0.3),
    f('roundTable', 3.5, 0.5, 0, 0.5, 0.5),
  ],
  Ballroom: [
    f('piano', 3.1, 3.0, -2.6, 1.5, 1.9),
    f('standee:harp', 0.35, 3.55, 0.6, 0.6, 0.3),
    f('chair', 0.25, 1.4, E, 0.5, 0.5),
    f('chair', 0.25, 2.2, E, 0.5, 0.5),
    f('chair', 3.75, 0.8, W, 0.5, 0.5),
  ],
  Kitchen: [
    f('stove', 1.5, 0.27, 0, 1.2, 0.7),
    f('counter', 2.75, 1.7, W, 2.0, 0.6),
    f('kitchenTable', 1.2, 2.0, 0, 1.2, 0.8),
  ],
};

/** Open floor in a room, in tiles from its corner, away from walls and furniture. */
const SPOT_CACHE = new Map<RoomName, [number, number][]>();

export function roomSpots(room: RoomName): [number, number][] {
  const hit = SPOT_CACHE.get(room);
  if (hit) return hit;
  const r = rectOf(room);
  const k = SCALE / TILE;
  const blocks = FURNITURE[room].map(it => {
    const c = Math.abs(Math.cos(it.rot));
    const s = Math.abs(Math.sin(it.rot));
    const hw = ((it.w * c + it.d * s) * k) / 2 + 0.22;
    const hd = ((it.w * s + it.d * c) * k) / 2 + 0.22;
    return { u: it.u, v: it.v, hw, hd };
  });
  const free = (u: number, v: number) => !blocks.some(b => Math.abs(u - b.u) < b.hw && Math.abs(v - b.v) < b.hd);
  const out: [number, number][] = [];
  const m = r.h === 1 ? 0.5 : 0.42;
  const step = 0.55;
  for (let v = m; v <= r.h - m + 1e-6; v += step) {
    for (let u = 0.42; u <= r.w - 0.42 + 1e-6; u += step) {
      if (free(u, v)) out.push([u, v]);
    }
  }
  // Rooms are never too full to stand in: fall back to anywhere inside.
  if (out.length < 8) {
    for (let v = m; v <= r.h - m + 1e-6; v += 0.5) for (let u = 0.45; u <= r.w - 0.45 + 1e-6; u += 0.45) out.push([u, v]);
  }
  // Nearest the middle first, so the first few people gather together.
  out.sort((a, b) => Math.hypot(a[0] - r.w / 2, a[1] - r.h / 2) - Math.hypot(b[0] - r.w / 2, b[1] - r.h / 2));
  SPOT_CACHE.set(room, out);
  return out;
}
