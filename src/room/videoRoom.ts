import { GameId } from '../types';

/**
 * Room layout traced from the reference clip.
 *
 * Measurements were read off the wide establishing frame: the north wall spans
 * image x 114..885 and runs image y 95..395 from floor to ceiling. That span is
 * mapped onto a 5.2m wall so the props land at believable real-world sizes --
 * the door comes out at 0.82m wide, the dresser at 1.47m, the CRT at 0.69m --
 * while keeping the painting's proportions. Every position below comes from the
 * same mapping, so the walkable geometry lines up with the frames used as its
 * textures.
 */

export const WALL = {
  halfWidth: 2.6,
  halfDepth: 2.5,
  height: 2.6,
};

export const NORTH_Z = -WALL.halfDepth;
export const SOUTH_Z = WALL.halfDepth;
export const WEST_X = -WALL.halfWidth;
export const EAST_X = WALL.halfWidth;

const WALL_PX_MIN = 114;
const WALL_PX_MAX = 885;
const PX_PER_M = (WALL_PX_MAX - WALL_PX_MIN) / (WALL.halfWidth * 2);

/** Pixel -> world helpers for the establishing frame (1168x660). */
export const pxX = (px: number) => -WALL.halfWidth + (px - WALL_PX_MIN) / PX_PER_M;
export const pxW = (pw: number) => pw / PX_PER_M;

export const PLAYER = {
  height: 1.58,
  crouchHeight: 1.0,
  radius: 0.3,
  walkSpeed: 2.2,
  sprintSpeed: 3.6,
  crouchSpeed: 1.05,
  accel: 13,
  reach: 2.3,
  spawn: [0.0, 1.58, 1.85] as [number, number, number],
  spawnLook: [1.4, 1.3, -2.2] as [number, number, number],
};

export const DRESSER = { x: pxX(509), z: NORTH_Z + 0.275, width: pxW(218), height: 0.78, depth: 0.55 };
export const CRT = { x: pxX(469), width: pxW(102), height: 0.6, depth: 0.52 };
export const DOOR = { x: pxX(659), width: pxW(122), height: 2.05 };
export const WINDOW_NORTH = { x: pxX(225), y: 1.62, width: pxW(90), height: 1.35 };
export const LAVA = { x: pxX(568), y: DRESSER.height + 0.21 };
export const SATURN = { x: pxX(581), y: 1.74 };
export const TOY_SHELF = { x: pxX(540), y: 1.86, width: pxW(160) };

export const SHELF = {
  x: pxX(810),
  z: NORTH_Z + 0.21,
  width: pxW(140),
  height: 2.0,
  depth: 0.42,
  /** Board heights for each row, top row first. */
  rowY: [1.78, 1.58, 1.38, 1.18, 0.98, 0.78, 0.56, 0.34, 0.12],
};

export const BED = { x: WEST_X + 0.54, z: -0.95, width: 1.05, length: 2.1, top: 0.56 };
export const EAST_DESK = { x: EAST_X - 0.35, z: -1.2, depth: 0.68, length: 1.6, top: 0.76 };
export const EAST_TV = { x: EAST_X - 0.32, z: 0.8, width: 0.58, depth: 0.5, top: 0.55 };
export const NIGHTSTAND = { x: WEST_X + 0.26, z: 0.68, width: 0.44, depth: 0.4, top: 0.6 };
export const CORNER_DESK = { x: -1.9, z: NORTH_Z + 0.24, width: 0.9, depth: 0.45, top: 0.74 };
export const RUG = { x: 0.35, z: -1.0, radius: 0.88 };
export const BOOMBOX = { x: pxX(617), z: NORTH_Z + 0.3 };
export const FAN = { x: 0, y: WALL.height - 0.18, z: -0.9 };

/**
 * Low table in front of the shelf where a board gets unfolded. `top` is the
 * centre of the table slab and `surface` is the height things actually rest on.
 */
export const PLAY_TABLE = {
  x: 1.42,
  z: -1.34,
  top: 0.72,
  thickness: 0.05,
  surface: 0.745,
  width: 1.08,
  depth: 0.78,
};

export interface Decal {
  id: string;
  texture: string;
  wall: 'north' | 'south' | 'east' | 'west';
  /** Along-wall coordinate: x for north/south walls, z for east/west walls. */
  along: number;
  y: number;
  width: number;
  height: number;
}

/** Flat art pinned to the walls, cut straight out of the reference frames. */
export const DECALS: Decal[] = [
  { id: 'sharks', texture: 'poster_sharks', wall: 'north', along: pxX(146), y: 1.85, width: 0.5, height: 0.78 },
  { id: 'rundmc', texture: 'poster_rundmc', wall: 'north', along: pxX(307), y: 1.9, width: 0.4, height: 0.62 },
  { id: 'spacejam', texture: 'poster_spacejam', wall: 'north', along: pxX(386), y: 1.84, width: 0.65, height: 0.8 },
  { id: 'west-frames', texture: 'frames_west', wall: 'west', along: 0.95, y: 1.72, width: 1.5, height: 1.2 },
  { id: 'west-frames-2', texture: 'frames_west', wall: 'west', along: -1.85, y: 1.78, width: 1.1, height: 0.9 },
  { id: 'east-ufo', texture: 'ufo_poster', wall: 'east', along: -2.15, y: 1.78, width: 0.46, height: 0.6 },
  { id: 'south-sharks', texture: 'poster_sharks', wall: 'south', along: 1.2, y: 1.8, width: 0.56, height: 0.9 },
  { id: 'south-jam', texture: 'poster_spacejam', wall: 'south', along: -1.1, y: 1.8, width: 0.68, height: 0.84 },
];

export interface Collider {
  x: number;
  z: number;
  /** Half extents on x and z. */
  hx: number;
  hz: number;
  /** Top height; the player slides along anything taller than their step height. */
  top: number;
}

/** Axis-aligned furniture blockers used for player collision. */
export const COLLIDERS: Collider[] = [
  { x: BED.x, z: BED.z, hx: BED.width / 2, hz: BED.length / 2, top: BED.top },
  { x: NIGHTSTAND.x, z: NIGHTSTAND.z, hx: NIGHTSTAND.width / 2, hz: NIGHTSTAND.depth / 2, top: NIGHTSTAND.top },
  { x: DRESSER.x, z: DRESSER.z, hx: DRESSER.width / 2, hz: DRESSER.depth / 2, top: DRESSER.height },
  { x: SHELF.x, z: SHELF.z, hx: SHELF.width / 2, hz: SHELF.depth / 2, top: SHELF.height },
  { x: EAST_DESK.x, z: EAST_DESK.z, hx: EAST_DESK.depth / 2, hz: EAST_DESK.length / 2, top: EAST_DESK.top },
  { x: EAST_TV.x, z: EAST_TV.z, hx: EAST_TV.width / 2, hz: EAST_TV.depth / 2, top: EAST_TV.top },
  { x: 1.75, z: -1.1, hx: 0.28, hz: 0.28, top: 0.52 },
  { x: PLAY_TABLE.x, z: PLAY_TABLE.z, hx: PLAY_TABLE.width / 2, hz: PLAY_TABLE.depth / 2, top: PLAY_TABLE.top },
  { x: CORNER_DESK.x, z: CORNER_DESK.z, hx: CORNER_DESK.width / 2, hz: CORNER_DESK.depth / 2, top: CORNER_DESK.top },
];

export interface ShelfSlot {
  id: GameId;
  /** Spine art cut from the clip, or null to draw one procedurally. */
  spine: string | null;
  title: string;
  row: number;
  boxHeight: number;
  color: string;
  accent: string;
}

/** The six boxes legible on the shelf in the clip, top to bottom. */
export const SHELF_SLOTS: ShelfSlot[] = [
  { id: 'monopoly', spine: 'spine_monopoly', title: 'Monopoly', row: 0, boxHeight: 0.1, color: '#c0282d', accent: '#f7e9c9' },
  { id: 'battleship', spine: 'spine_battleship', title: 'Battleship', row: 1, boxHeight: 0.095, color: '#17365d', accent: '#8fd3ff' },
  { id: 'pawnrush', spine: 'spine_sorry', title: 'Sorry!', row: 2, boxHeight: 0.095, color: '#c4262c', accent: '#ffe08a' },
  { id: 'clue', spine: 'spine_clue', title: 'Clue', row: 3, boxHeight: 0.1, color: '#13120f', accent: '#e8dcae' },
  { id: 'life', spine: null, title: 'The Game of Life', row: 4, boxHeight: 0.095, color: '#e4d6ad', accent: '#2f7bb5' },
  { id: 'yahtzee', spine: 'spine_yahtzee', title: 'Yahtzee', row: 5, boxHeight: 0.095, color: '#b81f28', accent: '#f6ead0' },
];

/** The rest of the library, stacked on the shelf's lower rows. */
export const SHELF_SLOTS_LOWER: ShelfSlot[] = [
  { id: 'chess', spine: null, title: 'Chess', row: 6, boxHeight: 0.085, color: '#2b2622', accent: '#d8cfc2' },
  { id: 'connect4', spine: null, title: 'Connect 4', row: 7, boxHeight: 0.085, color: '#1d4fa3', accent: '#ffd23f' },
  { id: 'checkers', spine: null, title: 'Checkers', row: 8, boxHeight: 0.085, color: '#8c1c1c', accent: '#f0d9a7' },
];

/** Card and dice titles that live on the desk instead of the shelf. */
export const DESK_SLOTS: ShelfSlot[] = [
  { id: 'poker', spine: null, title: "Hold'em", row: 0, boxHeight: 0.07, color: '#1f5134', accent: '#ffd98a' },
  { id: 'blackjack', spine: null, title: 'Blackjack', row: 1, boxHeight: 0.07, color: '#14402a', accent: '#9ff0b8' },
  { id: 'liarsdice', spine: null, title: "Liar's Dice", row: 2, boxHeight: 0.07, color: '#6d4414', accent: '#f5d985' },
  { id: 'gofish', spine: null, title: 'Go Fish', row: 3, boxHeight: 0.07, color: '#1b5f7a', accent: '#bdf0ff' },
];

export interface RoomProp {
  id: string;
  label: string;
  hint: string;
  position: [number, number, number];
  radius: number;
}

/** Non-game things the player can look at and interact with. */
export const ROOM_PROPS: RoomProp[] = [
  { id: 'crt-tv', label: 'CRT television', hint: 'Open the flat game list', position: [CRT.x, DRESSER.height + CRT.height / 2, NORTH_Z + 0.34], radius: 0.42 },
  { id: 'boombox', label: 'Boombox', hint: 'Flip the room tape', position: [BOOMBOX.x, 0.14, BOOMBOX.z], radius: 0.26 },
  { id: 'lava-lamp', label: 'Lava lamp', hint: 'Warm the room light up', position: [LAVA.x, LAVA.y, NORTH_Z + 0.3], radius: 0.2 },
  { id: 'door', label: 'Bedroom door', hint: 'Locked in this build', position: [DOOR.x, 1.0, NORTH_Z + 0.05], radius: 0.5 },
  { id: 'east-tv', label: 'Spare TV', hint: 'Season standings', position: [EAST_TV.x, EAST_TV.top + 0.26, EAST_TV.z], radius: 0.36 },
  { id: 'bed', label: 'Bed', hint: 'Trivia night is on the quilt', position: [BED.x, BED.top, BED.z], radius: 0.7 },
];

export const PALETTE = {
  floor: '#30201d',
  floorDark: '#1f1312',
  wall: '#382739',
  wallWarm: '#40293c',
  ceiling: '#2a1a19',
  wood: '#4d3024',
  trim: '#3a2219',
  neonPink: '#e05bdd',
  lampWarm: '#ffc489',
  nightSky: '#2b2552',
  rugPurple: '#52306a',
};
