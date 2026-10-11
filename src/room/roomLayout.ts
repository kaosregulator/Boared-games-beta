import { EAST_X, NORTH_Z, WEST_X } from './videoRoom';

/**
 * Real-world placement for the Tripo meshes.
 *
 * Each GLB is normalized (about 1 unit), so we scale on ONE axis and let the
 * other two follow. Scaling width and height independently is what squashed
 * the bed and shrank the shelf. Sizes below are the fitted bounding boxes.
 *
 * North wall, west to east: game shelf, dresser + TV, door, window.
 * The nightstand sits in the north-east corner under that window.
 */

export interface Placed {
  id: string;
  /** Floor contact (or surface contact) centre. */
  x: number;
  y: number;
  z: number;
  rotY: number;
  /** Model-space axis that `meters` applies to. */
  axis: 'x' | 'y' | 'z';
  meters: number;
  /** Fitted size, model X/Y/Z before rotY. */
  sx: number;
  sy: number;
  sz: number;
}

function fit(native: [number, number, number], axis: 'x' | 'y' | 'z', meters: number) {
  const i = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
  const s = meters / native[i];
  return { sx: native[0] * s, sy: native[1] * s, sz: native[2] * s };
}

/** Native bbox of the compressed GLBs (x, y, z). */
const N = {
  bed: [0.98, 0.652, 0.915] as [number, number, number],
  shelf: [0.702, 0.98, 0.314] as [number, number, number],
  dresser: [0.981, 0.836, 0.688] as [number, number, number],
  crt: [0.956, 0.98, 0.767] as [number, number, number],
  desk: [0.98, 0.661, 0.707] as [number, number, number],
  nightstand: [0.894, 0.977, 0.644] as [number, number, number],
  window: [0.979, 0.845, 0.26] as [number, number, number],
  boombox: [0.981, 0.662, 0.477] as [number, number, number],
  gameboy: [0.62, 0.98, 0.661] as [number, number, number],
  vhs_stack: [0.712, 0.979, 0.321] as [number, number, number],
  toyshelf: [0.98, 0.697, 0.522] as [number, number, number],
  vhs_loose: [0.813, 0.202, 0.98] as [number, number, number],
  cards: [0.959, 0.152, 0.769] as [number, number, number],
  door: [0.508, 0.981, 0.199] as [number, number, number],
  backpack: [0.98, 0.862, 0.831] as [number, number, number],
  hotpockets: [0.98, 0.136, 0.978] as [number, number, number],
  nes: [0.98, 0.316, 0.727] as [number, number, number],
  rubik: [0.917, 0.916, 0.98] as [number, number, number],
  armor: [0.542, 0.98, 0.272] as [number, number, number],
  army: [0.98, 0.451, 0.883] as [number, number, number],
  gushers: [0.8, 0.98, 0.393] as [number, number, number],
  teddy: [0.981, 0.426, 0.263] as [number, number, number],
  jordans: [0.98, 0.453, 0.867] as [number, number, number],
  car: [1.118, 0.372, 1.129] as [number, number, number],
  books: [0.98, 0.872, 0.784] as [number, number, number],
  clutterdesk: [0.98, 0.575, 0.602] as [number, number, number],
  board: [0.982, 0.776, 0.302] as [number, number, number],
  battleship: [0.979, 0.802, 0.253] as [number, number, number],
  clue: [0.979, 0.974, 0.364] as [number, number, number],
  life: [0.981, 0.802, 0.348] as [number, number, number],
  yahtzee: [0.98, 0.846, 0.478] as [number, number, number],
};

const bedSize = fit(N.bed, 'y', 0.95);
const shelfSize = fit(N.shelf, 'y', 2.05);
const dresserSize = fit(N.dresser, 'y', 0.84);
const crtSize = fit(N.crt, 'x', 0.62);
const toySize = fit(N.toyshelf, 'y', 1.22);
const deskSize = fit(N.desk, 'y', 0.75);
const nightSize = fit(N.nightstand, 'y', 0.58);
const windowSize = fit(N.window, 'y', 1.12);
const boomSize = fit(N.boombox, 'x', 0.46);
const gbSize = fit(N.gameboy, 'y', 0.16);
const vhsSize = fit(N.vhs_stack, 'y', 0.24);
const looseSize = fit(N.vhs_loose, 'x', 0.36);
const cardSize = fit(N.cards, 'x', 0.4);
const doorSize = fit(N.door, 'y', 2.2);
const packSize = fit(N.backpack, 'y', 0.38);
const pocketSize = fit(N.hotpockets, 'x', 0.3);
const nesSize = fit(N.nes, 'x', 0.36);
const rubikSize = fit(N.rubik, 'y', 0.13);
const figureSize = fit(N.armor, 'y', 0.18);
const armySize = fit(N.army, 'x', 0.2);
const gusherSize = fit(N.gushers, 'y', 0.18);
const teddySize = fit(N.teddy, 'x', 0.28);
const shoeSize = fit(N.jordans, 'x', 0.46);
const carSize = fit(N.car, 'x', 0.26);
const bookSize = fit(N.books, 'y', 0.22);
const clutterSize = fit(N.clutterdesk, 'y', 0.74);
const boardSize = fit(N.board, 'x', 0.38);
const shipSize = fit(N.battleship, 'x', 0.34);
const clueSize = fit(N.clue, 'x', 0.32);
const lifeSize = fit(N.life, 'x', 0.36);
const yahtzeeSize = fit(N.yahtzee, 'x', 0.34);

/** Push the frame into the plaster so the visible wood meets the wall. */
const flushNorth = (sz: number) => NORTH_Z + sz * 0.18;

/** After +90° Y, local Z becomes world X and local X becomes world Z. */
const bedIntoRoom = bedSize.sz;
const bedX = WEST_X + bedIntoRoom / 2 + 0.08;
const bedZ = -0.55;

const windowX = WEST_X + windowSize.sx / 2 + 0.08;
const windowY = 0.96;
const windowZ = flushNorth(windowSize.sz);

const nightX = windowX - windowSize.sx * 0.12;
const nightZ = flushNorth(nightSize.sz) + 0.06;

const shelfX = EAST_X - shelfSize.sx / 2 - 0.05;
const shelfZ = flushNorth(shelfSize.sz);

const dresserX = -0.78;
const dresserZ = flushNorth(dresserSize.sz);

const doorX = 0.58;
const doorZ = flushNorth(doorSize.sz);

const toyX = EAST_X - toySize.sz / 2 - 0.05;
const toyZ = 0.05;

const deskX = EAST_X - deskSize.sz / 2 - 0.06;
const deskZ = 1.7;

const clutterX = WEST_X + clutterSize.sz / 2 + 0.06;
const clutterZ = 1.2;

/** Short shelf mounted on the wall above the television. */
export const WALL_SHELF = {
  x: dresserX + 0.05,
  y: 1.96,
  z: NORTH_Z + 0.15,
  w: 1.42,
  d: 0.3,
  h: 0.05,
};
const shelfTopY = WALL_SHELF.y + WALL_SHELF.h;

export const LAYOUT = {
  bed: {
    id: 'bed',
    x: bedX,
    y: 0,
    z: bedZ,
    rotY: Math.PI / 2,
    axis: 'y' as const,
    meters: 0.95,
    ...bedSize,
  },
  nightstand: {
    id: 'nightstand',
    x: nightX,
    y: 0,
    z: nightZ,
    rotY: 0,
    axis: 'y' as const,
    meters: 0.58,
    ...nightSize,
  },
  window: {
    id: 'window',
    x: windowX,
    y: windowY,
    z: windowZ,
    rotY: 0,
    axis: 'y' as const,
    meters: 1.12,
    ...windowSize,
  },
  door: {
    id: 'door',
    x: doorX,
    y: 0,
    z: doorZ,
    rotY: 0,
    axis: 'y' as const,
    meters: 2.2,
    ...doorSize,
  },
  dresser: {
    id: 'dresser',
    x: dresserX,
    y: 0,
    z: dresserZ,
    rotY: 0,
    axis: 'y' as const,
    meters: 0.84,
    ...dresserSize,
  },
  crt: {
    id: 'crt',
    x: dresserX,
    y: 0.84,
    z: dresserZ,
    rotY: 0,
    axis: 'x' as const,
    meters: 0.62,
    ...crtSize,
  },
  toyshelf: {
    id: 'toyshelf',
    x: toyX,
    y: 0,
    z: toyZ,
    rotY: -Math.PI / 2,
    axis: 'y' as const,
    meters: 1.22,
    ...toySize,
  },
  shelf: {
    id: 'shelf',
    x: shelfX,
    y: 0,
    z: shelfZ,
    rotY: 0,
    axis: 'y' as const,
    meters: 2.05,
    ...shelfSize,
  },
  desk: {
    id: 'desk',
    x: deskX,
    y: 0,
    z: deskZ,
    rotY: -Math.PI / 2,
    axis: 'y' as const,
    meters: 0.75,
    ...deskSize,
  },
  clutterdesk: {
    id: 'clutterdesk',
    x: clutterX,
    y: 0,
    z: clutterZ,
    rotY: Math.PI / 2,
    axis: 'y' as const,
    meters: 0.74,
    ...clutterSize,
  },
  boombox: {
    id: 'boombox',
    x: dresserX + 0.72,
    y: 0,
    z: dresserZ + dresserSize.sz / 2 + 0.42,
    rotY: -0.25,
    axis: 'x' as const,
    meters: 0.46,
    ...boomSize,
  },
  vhs_stack: {
    id: 'vhs_stack',
    x: dresserX + 0.15,
    y: 0,
    z: dresserZ + dresserSize.sz / 2 + 0.58,
    rotY: 0.2,
    axis: 'y' as const,
    meters: 0.24,
    ...vhsSize,
  },
  vhs_loose: {
    id: 'vhs_loose',
    x: dresserX + 0.95,
    y: 0,
    z: dresserZ + dresserSize.sz / 2 + 0.7,
    rotY: 0.45,
    axis: 'x' as const,
    meters: 0.36,
    ...looseSize,
  },
  gameboy: {
    id: 'gameboy',
    x: bedX + 0.2,
    y: 0.5,
    z: bedZ + 0.28,
    rotY: 0.4,
    axis: 'y' as const,
    meters: 0.16,
    ...gbSize,
  },
  backpack: {
    id: 'backpack',
    x: bedX + 0.02,
    y: 0.4,
    z: bedZ - 0.22,
    rotY: -0.35,
    axis: 'y' as const,
    meters: 0.38,
    ...packSize,
  },
  teddy: {
    id: 'teddy',
    x: WALL_SHELF.x - 0.22,
    y: shelfTopY,
    z: WALL_SHELF.z,
    rotY: 0.2,
    axis: 'x' as const,
    meters: 0.28,
    ...teddySize,
  },
  cards: {
    id: 'cards',
    x: -0.35,
    y: 0,
    z: 0.72,
    rotY: 0.35,
    axis: 'x' as const,
    meters: 0.4,
    ...cardSize,
  },
  hotpockets: {
    id: 'hotpockets',
    x: 0.55,
    y: 0,
    z: 0.85,
    rotY: -0.4,
    axis: 'x' as const,
    meters: 0.3,
    ...pocketSize,
  },
  jordans: {
    id: 'jordans',
    x: doorX + 0.15,
    y: 0,
    z: doorZ + doorSize.sz / 2 + 0.7,
    rotY: 0.8,
    axis: 'x' as const,
    meters: 0.46,
    ...shoeSize,
  },
  car: {
    id: 'car',
    x: 0.35,
    y: 0,
    z: 0.15,
    rotY: 0.7,
    axis: 'x' as const,
    meters: 0.26,
    ...carSize,
  },
  nes: {
    id: 'nes',
    x: WALL_SHELF.x + 0.52,
    y: shelfTopY,
    z: WALL_SHELF.z + 0.02,
    rotY: 0.15,
    axis: 'x' as const,
    meters: 0.36,
    ...nesSize,
  },
  armor: {
    id: 'armor',
    x: WALL_SHELF.x + 0.05,
    y: shelfTopY,
    z: WALL_SHELF.z,
    rotY: -0.3,
    axis: 'y' as const,
    meters: 0.18,
    ...figureSize,
  },
  rubik: {
    id: 'rubik',
    x: WALL_SHELF.x + 0.16,
    y: shelfTopY,
    z: WALL_SHELF.z - 0.02,
    rotY: 0.4,
    axis: 'y' as const,
    meters: 0.13,
    ...rubikSize,
  },
  army: {
    id: 'army',
    x: deskX - 0.18,
    y: 0.75,
    z: deskZ - 0.22,
    rotY: -0.5,
    axis: 'x' as const,
    meters: 0.2,
    ...armySize,
  },
  gushers: {
    id: 'gushers',
    x: nightX,
    y: 0.46,
    z: nightZ,
    rotY: 0.2,
    axis: 'y' as const,
    meters: 0.18,
    ...gusherSize,
  },
  books: {
    id: 'books',
    x: WALL_SHELF.x - 0.52,
    y: shelfTopY,
    z: WALL_SHELF.z,
    rotY: 0.1,
    axis: 'y' as const,
    meters: 0.22,
    ...bookSize,
  },
  board: {
    id: 'board',
    x: shelfX - 0.15,
    y: 0,
    z: shelfZ + shelfSize.sz / 2 + 0.38,
    rotY: 0.1,
    axis: 'x' as const,
    meters: 0.38,
    ...boardSize,
  },
  battleship: {
    id: 'battleship',
    x: toyX - toySize.sz / 2 - 0.32,
    y: 0,
    z: toyZ - 0.35,
    rotY: -Math.PI / 2,
    axis: 'x' as const,
    meters: 0.34,
    ...shipSize,
  },
  clue: {
    id: 'clue',
    x: deskX - 0.16,
    y: 0.75,
    z: deskZ + 0.28,
    rotY: -Math.PI / 2,
    axis: 'x' as const,
    meters: 0.32,
    ...clueSize,
  },
  life: {
    id: 'life',
    x: doorX - 0.55,
    y: 0,
    z: doorZ + doorSize.sz / 2 + 0.55,
    rotY: 0.15,
    axis: 'x' as const,
    meters: 0.36,
    ...lifeSize,
  },
  yahtzee: {
    id: 'yahtzee',
    x: dresserX + 1.05,
    y: 0,
    z: dresserZ + dresserSize.sz / 2 + 0.85,
    rotY: -0.15,
    axis: 'x' as const,
    meters: 0.34,
    ...yahtzeeSize,
  },
} satisfies Record<string, Placed>;

/** Half-extents on the floor after rotation, for walking collision. */
function footprint(p: Placed, quarterTurns: boolean) {
  const hx = (quarterTurns ? p.sz : p.sx) / 2;
  const hz = (quarterTurns ? p.sx : p.sz) / 2;
  return { x: p.x, z: p.z, hx, hz, top: p.y + p.sy };
}

export const ROOM_COLLIDERS = [
  footprint(LAYOUT.bed, true),
  footprint(LAYOUT.nightstand, false),
  footprint(LAYOUT.dresser, false),
  footprint(LAYOUT.shelf, false),
  footprint(LAYOUT.desk, true),
  footprint(LAYOUT.toyshelf, true),
  footprint(LAYOUT.door, false),
  footprint(LAYOUT.clutterdesk, true),
];

/** Game-box rows up the real shelf, helmet stays above the top row. */
export const SHELF_ROW_Y = [1.52, 1.3, 1.08, 0.86, 0.64, 0.44, 0.3, 0.18, 0.08];
