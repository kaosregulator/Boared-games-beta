import * as THREE from 'three';
import { BLOCKS, ROOM, type Block } from '../hotwheels/world';
import { WALL } from '../videoRoom';
import { LAYOUT, WALL_SHELF } from '../roomLayout';

/**
 * The army town as it would be set up on the bedroom carpet: a road play mat
 * in the open middle of the floor, a shoebox HQ, block buildings, a popsicle
 * stick watchtower, sandbags along the north edge, and the tan army dug in
 * behind a wall of books by the door. Everything here is in room metres.
 */

/** The play mat. North (-z) faces the door, where the tan army comes from. */
export const MAT = { x: 0.2, z: -0.35, w: 1.8, d: 1.5 };
/** Top of the mat: just over the bedroom's round rug. Soldiers stand on this. */
export const MAT_TOP = 0.006;
export const MAT_MIN_X = MAT.x - MAT.w / 2;
export const MAT_MAX_X = MAT.x + MAT.w / 2;
export const MAT_MIN_Z = MAT.z - MAT.d / 2;
export const MAT_MAX_Z = MAT.z + MAT.d / 2;

/** A plastic army man, base to helmet. About 1:25. */
export const MAN_HEIGHT = 0.07;
export const MAN_RADIUS = 0.012;

export const HQ = { x: 0.02, z: 0.08, w: 0.34, h: 0.13, d: 0.2 };
export const HELIPAD = { x: 0.74, z: 0.17, r: 0.13 };
export const TOWER = { x: 0.88, z: -0.62, w: 0.1, h: 0.15 };
export const CABIN = { x: -0.5, z: -0.45, w: 0.17, h: 0.085, d: 0.12 };
/** The tan side's wall of books, past the north edge of the mat. */
export const FORT = { x: 0.22, z: -1.14, w: 0.78, h: 0.11, d: 0.12 };

/** Alphabet blocks stacked into buildings: [x, z, levels, letter seed]. */
export const BLOCK_STACKS: [number, number, number, number][] = [
  [-0.52, 0.02, 3, 0],
  [-0.38, 0.2, 2, 3],
  [-0.62, 0.22, 1, 6],
  [0.42, 0.02, 2, 1],
  [0.58, 0.02, 4, 4],
  [0.36, 0.22, 1, 7],
];
export const BLOCK = 0.045;

/** Green plastic tanks and jeeps: [x, z, heading]. Heading 0 points north. */
export const TANKS: [number, number, number][] = [
  [0.3, -0.42, 0.15],
  [-0.15, -0.44, -0.2],
];
export const JEEPS: [number, number, number][] = [
  [0.46, 0.34, 1.4],
  [-0.12, -0.25, -1.1],
];

/** Plastic trees round the edge of the mat. */
export const TREES: [number, number][] = [
  [-0.66, -0.62], [-0.68, 0.32], [-0.2, 0.33], [0.98, 0.12], [1.02, -0.3], [0.62, -0.68], [-0.05, -0.7],
];

/** Sandbag runs along the north edge, with gaps to walk through: [x0, x1, z]. */
export const SANDBAGS: [number, number, number][] = [
  [-0.62, -0.28, -0.8],
  [-0.14, 0.24, -0.82],
  [0.38, 0.78, -0.8],
];
const SAND_H = 0.028;

/** Where the green defenders dig in when the attack comes. */
export const FOXHOLES: [number, number][] = [
  [-0.55, -0.74], [-0.42, -0.75], [-0.33, -0.74], [-0.08, -0.76], [0.05, -0.77], [0.18, -0.76],
  [0.44, -0.74], [0.58, -0.75], [0.72, -0.74],
];

/** Footpaths the patrols walk while the town is quiet (loops). */
export const PATROLS: [number, number][][] = [
  // Round the HQ block.
  [[-0.24, -0.1], [0.28, -0.1], [0.28, 0.27], [-0.24, 0.27]],
  // Main road east to the helipad and back.
  [[-0.66, -0.17], [0.92, -0.17], [0.92, -0.12], [-0.66, -0.12]],
  // The north line, behind the sandbags.
  [[-0.6, -0.62], [0.8, -0.62], [0.8, -0.55], [-0.6, -0.55]],
];

/** The drill squad marches up and down the parade ground west of HQ. */
export const PARADE: [number, number][] = [
  [-0.62, -0.32], [-0.22, -0.32],
];

/** Guards that never move: [x, z, heading] (0 faces south, PI faces north). One stands on the tower. */
export const GUARDS: [number, number, number][] = [
  [HQ.x - 0.05, HQ.z + HQ.d / 2 + 0.03, 0],
  [HQ.x + 0.05, HQ.z + HQ.d / 2 + 0.03, 0],
  [HELIPAD.x - 0.16, HELIPAD.z + 0.02, Math.PI / 2],
  [CABIN.x + 0.12, CABIN.z + 0.05, Math.PI],
];
export const TOWER_GUARD: [number, number, number] = [TOWER.x, TOWER.z, 0];

/** The tan army steps out from behind the books here. */
export function invaderSpawn(i: number, n: number) {
  const t = n <= 1 ? 0.5 : i / (n - 1);
  return { x: FORT.x - FORT.w / 2 + 0.05 + t * (FORT.w - 0.1), z: FORT.z + FORT.d / 2 + 0.04 + (i % 2) * 0.03 };
}

/** Player start: by the HQ door. */
export const PLAYER_START = { x: HQ.x + 0.12, z: HQ.z + HQ.d / 2 + 0.07, heading: 0 };

// ---------------------------------------------------------------------------
// Solid bits, as the same axis-aligned boxes the Hot Wheels car uses.

function solid(id: string, x: number, z: number, w: number, d: number, h: number, top = true): Block {
  return { id, minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, minY: 0, maxY: h, top };
}

export const TOWN_BLOCKS: Block[] = [
  solid('hq', HQ.x, HQ.z, HQ.w, HQ.d, HQ.h),
  solid('cabin', CABIN.x, CABIN.z, CABIN.w, CABIN.d, CABIN.h),
  solid('fort', FORT.x, FORT.z, FORT.w, FORT.d, FORT.h),
  // The tower: only its platform is solid, so you can walk between the legs.
  { id: 'tower', minX: TOWER.x - TOWER.w / 2, maxX: TOWER.x + TOWER.w / 2, minZ: TOWER.z - TOWER.w / 2, maxZ: TOWER.z + TOWER.w / 2, minY: TOWER.h - 0.012, maxY: TOWER.h },
  ...BLOCK_STACKS.map(([x, z, n], i) => solid(`blocks-${i}`, x, z, BLOCK, BLOCK, BLOCK * n)),
  ...SANDBAGS.map(([x0, x1, z], i) => solid(`sandbags-${i}`, (x0 + x1) / 2, z, x1 - x0, 0.03, SAND_H)),
  ...TANKS.map(([x, z], i) => solid(`tank-${i}`, x, z, 0.09, 0.09, 0.05)),
  ...JEEPS.map(([x, z], i) => solid(`jeep-${i}`, x, z, 0.06, 0.06, 0.035)),
  ...TREES.map(([x, z], i) => solid(`tree-${i}`, x, z, 0.02, 0.02, 0.12, false)),
];

/** Up high, where only the helicopter goes: the shelf over the TV and the teddy shelf. */
const teddy = LAYOUT.teddy;
const HIGH_BLOCKS: Block[] = [
  { id: 'wall-shelf', minX: WALL_SHELF.x - WALL_SHELF.w / 2, maxX: WALL_SHELF.x + WALL_SHELF.w / 2, minZ: WALL_SHELF.z - WALL_SHELF.d / 2, maxZ: WALL_SHELF.z + WALL_SHELF.d / 2, minY: WALL_SHELF.y - 0.02, maxY: WALL_SHELF.y + 0.3 },
  { id: 'teddy-shelf', minX: teddy.x - teddy.sx / 2, maxX: teddy.x + teddy.sx / 2, minZ: teddy.z - teddy.sz / 2 - 0.05, maxZ: teddy.z + teddy.sz / 2, minY: teddy.y - 0.04, maxY: teddy.y + teddy.sy },
];

/** Everything a soldier or the helicopter can hit: the room plus the town. */
export const ALL_BLOCKS: Block[] = [...BLOCKS, ...TOWN_BLOCKS, ...HIGH_BLOCKS];

export const CEILING = WALL.height - 0.08;
export { ROOM };

/** Push a circle of radius r at height band [y0, y1] out of every box. */
export function pushOut(p: THREE.Vector3, r: number, y0: number, y1: number, blocks = ALL_BLOCKS) {
  let hit: Block | null = null;
  for (const b of blocks) {
    if (y1 <= b.minY || y0 >= b.maxY) continue;
    const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
    const dx = p.x - cx;
    const dz = p.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    hit = b;
    if (d2 > 1e-10) {
      const d = Math.sqrt(d2);
      p.x = cx + (dx / d) * r;
      p.z = cz + (dz / d) * r;
    } else {
      // Centre inside the box: leave by the nearest side.
      const left = p.x - b.minX;
      const right = b.maxX - p.x;
      const near = p.z - b.minZ;
      const far = b.maxZ - p.z;
      const m = Math.min(left, right, near, far);
      if (m === left) p.x = b.minX - r;
      else if (m === right) p.x = b.maxX + r;
      else if (m === near) p.z = b.minZ - r;
      else p.z = b.maxZ + r;
    }
  }
  p.x = Math.max(ROOM.minX + r, Math.min(ROOM.maxX - r, p.x));
  p.z = Math.max(ROOM.minZ + r, Math.min(ROOM.maxZ - r, p.z));
  return hit;
}

/** Highest landable top under (x, z) at or below maxY. */
export function floorAt(x: number, z: number, maxY: number, blocks = ALL_BLOCKS) {
  let y = 0;
  for (const b of blocks) {
    if (b.top === false) continue;
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
    if (b.maxY <= maxY && b.maxY > y) y = b.maxY;
  }
  return y;
}

/** Lowest underside above fromY at (x, z), capped by the ceiling. */
export function roofAt(x: number, z: number, fromY: number, blocks = ALL_BLOCKS) {
  let c = CEILING;
  for (const b of blocks) {
    if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
    if (b.minY >= fromY && b.minY < c) c = b.minY;
  }
  return c;
}

export function insideAny(p: THREE.Vector3, pad = 0, blocks = ALL_BLOCKS) {
  if (p.x < ROOM.minX || p.x > ROOM.maxX || p.z < ROOM.minZ || p.z > ROOM.maxZ || p.y < 0 || p.y > CEILING) return true;
  for (const b of blocks) {
    if (p.x > b.minX - pad && p.x < b.maxX + pad && p.z > b.minZ - pad && p.z < b.maxZ + pad && p.y > b.minY - pad && p.y < b.maxY + pad) return true;
  }
  return false;
}
