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
const shelfSize = fit(N.shelf, 'y', 2.02);
const dresserSize = fit(N.dresser, 'y', 0.84);
const crtSize = fit(N.crt, 'x', 0.62);
const toySize = fit(N.toyshelf, 'y', 1.35);
const deskSize = fit(N.desk, 'y', 0.75);
const nightSize = fit(N.nightstand, 'y', 0.58);
const windowSize = fit(N.window, 'y', 1.15);
const boomSize = fit(N.boombox, 'x', 0.42);
const gbSize = fit(N.gameboy, 'y', 0.15);
const vhsSize = fit(N.vhs_stack, 'y', 0.22);
const looseSize = fit(N.vhs_loose, 'x', 0.34);
const cardSize = fit(N.cards, 'x', 0.32);
const doorSize = fit(N.door, 'y', 2.05);
const packSize = fit(N.backpack, 'y', 0.42);
const pocketSize = fit(N.hotpockets, 'x', 0.36);
const nesSize = fit(N.nes, 'x', 0.34);
const rubikSize = fit(N.rubik, 'y', 0.11);
const figureSize = fit(N.armor, 'y', 0.2);
const armySize = fit(N.army, 'x', 0.18);
const gusherSize = fit(N.gushers, 'y', 0.17);
const teddySize = fit(N.teddy, 'x', 0.32);
const shoeSize = fit(N.jordans, 'x', 0.3);
const carSize = fit(N.car, 'x', 0.22);
const bookSize = fit(N.books, 'y', 0.26);
const clutterSize = fit(N.clutterdesk, 'y', 0.74);
const boardSize = fit(N.board, 'x', 0.34);
const shipSize = fit(N.battleship, 'x', 0.32);
const clueSize = fit(N.clue, 'x', 0.3);
const lifeSize = fit(N.life, 'x', 0.32);
const yahtzeeSize = fit(N.yahtzee, 'x', 0.28);

/** After +90° Y, local Z becomes world X and local X becomes world Z. */
const bedIntoRoom = bedSize.sz;
const bedX = WEST_X + bedIntoRoom / 2 + 0.1;
const bedZ = -0.22;

const shelfX = WEST_X + shelfSize.sx / 2 + 0.1;
const shelfZ = NORTH_Z + shelfSize.sz / 2 + 0.05;

const dresserX = -0.55;
const dresserZ = NORTH_Z + dresserSize.sz / 2 + 0.06;

const doorX = 0.78;
const doorZ = NORTH_Z + doorSize.sz / 2 + 0.02;

const windowX = EAST_X - windowSize.sx / 2 - 0.12;
const windowY = 1.2;
const windowZ = NORTH_Z + windowSize.sz / 2 + 0.02;

const toyX = EAST_X - toySize.sz / 2 - 0.08;
const toyZ = -0.2;

const deskX = EAST_X - deskSize.sz / 2 - 0.08;
const deskZ = 1.85;

const clutterX = WEST_X + clutterSize.sz / 2 + 0.1;
const clutterZ = 1.62;

const nightX = EAST_X - 0.62;
const nightZ = NORTH_Z + 0.4;

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
    rotY: 0.35,
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
    meters: 1.15,
    ...windowSize,
  },
  door: {
    id: 'door',
    x: doorX,
    y: 0,
    z: doorZ,
    rotY: 0,
    axis: 'y' as const,
    meters: 2.05,
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
    meters: 1.35,
    ...toySize,
  },
  shelf: {
    id: 'shelf',
    x: shelfX,
    y: 0,
    z: shelfZ,
    rotY: 0,
    axis: 'y' as const,
    meters: 2.02,
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
    x: 0.15,
    y: 0,
    z: dresserZ + dresserSize.sz / 2 + 0.38,
    rotY: -0.35,
    axis: 'x' as const,
    meters: 0.42,
    ...boomSize,
  },
  vhs_stack: {
    id: 'vhs_stack',
    x: -0.35,
    y: 0,
    z: dresserZ + dresserSize.sz / 2 + 0.55,
    rotY: 0.35,
    axis: 'y' as const,
    meters: 0.22,
    ...vhsSize,
  },
  vhs_loose: {
    id: 'vhs_loose',
    x: 0.55,
    y: 0,
    z: dresserZ + dresserSize.sz / 2 + 0.72,
    rotY: 0.6,
    axis: 'x' as const,
    meters: 0.34,
    ...looseSize,
  },
  gameboy: {
    id: 'gameboy',
    x: bedX + 0.12,
    y: 0.5,
    z: bedZ + 0.32,
    rotY: 0.35,
    axis: 'y' as const,
    meters: 0.15,
    ...gbSize,
  },
  backpack: {
    id: 'backpack',
    x: bedX + 0.04,
    y: 0.5,
    z: bedZ + 0.5,
    rotY: 0.55,
    axis: 'y' as const,
    meters: 0.42,
    ...packSize,
  },
  teddy: {
    id: 'teddy',
    x: bedX + 0.22,
    y: 0.58,
    z: bedZ - 0.18,
    rotY: 1.1,
    axis: 'x' as const,
    meters: 0.32,
    ...teddySize,
  },
  cards: {
    id: 'cards',
    x: -0.2,
    y: 0,
    z: 0.42,
    rotY: 0.4,
    axis: 'x' as const,
    meters: 0.32,
    ...cardSize,
  },
  hotpockets: {
    id: 'hotpockets',
    x: 0.95,
    y: 0,
    z: 1.05,
    rotY: -0.5,
    axis: 'x' as const,
    meters: 0.36,
    ...pocketSize,
  },
  jordans: {
    id: 'jordans',
    x: doorX + 0.35,
    y: 0,
    z: doorZ + doorSize.sz / 2 + 0.62,
    rotY: 1.05,
    axis: 'x' as const,
    meters: 0.3,
    ...shoeSize,
  },
  car: {
    id: 'car',
    x: 0.62,
    y: 0,
    z: -0.15,
    rotY: 0.9,
    axis: 'x' as const,
    meters: 0.22,
    ...carSize,
  },
  nes: {
    id: 'nes',
    x: toyX - 0.02,
    y: 0.74,
    z: toyZ + 0.32,
    rotY: -Math.PI / 2,
    axis: 'x' as const,
    meters: 0.34,
    ...nesSize,
  },
  armor: {
    id: 'armor',
    x: toyX - 0.18,
    y: 0.74,
    z: toyZ + 0.15,
    rotY: -0.8,
    axis: 'y' as const,
    meters: 0.2,
    ...figureSize,
  },
  rubik: {
    id: 'rubik',
    x: toyX - 0.2,
    y: 0.74,
    z: toyZ + 0.62,
    rotY: 0.5,
    axis: 'y' as const,
    meters: 0.11,
    ...rubikSize,
  },
  army: {
    id: 'army',
    x: deskX - 0.22,
    y: 0.75,
    z: deskZ - 0.28,
    rotY: -0.4,
    axis: 'x' as const,
    meters: 0.18,
    ...armySize,
  },
  gushers: {
    id: 'gushers',
    x: nightX - 0.06,
    y: 0.5,
    z: nightZ,
    rotY: -0.4,
    axis: 'y' as const,
    meters: 0.17,
    ...gusherSize,
  },
  books: {
    id: 'books',
    x: clutterX + 0.22,
    y: 0.74,
    z: clutterZ - 0.12,
    rotY: 0.4,
    axis: 'y' as const,
    meters: 0.26,
    ...bookSize,
  },
  board: {
    id: 'board',
    x: shelfX + shelfSize.sx / 2 + 0.28,
    y: 0,
    z: shelfZ + 0.15,
    rotY: 0.15,
    axis: 'x' as const,
    meters: 0.34,
    ...boardSize,
  },
  battleship: {
    id: 'battleship',
    x: toyX - toySize.sz / 2 - 0.28,
    y: 0,
    z: toyZ + 0.55,
    rotY: -Math.PI / 2,
    axis: 'x' as const,
    meters: 0.32,
    ...shipSize,
  },
  clue: {
    id: 'clue',
    x: deskX - 0.18,
    y: 0.75,
    z: deskZ + 0.22,
    rotY: -Math.PI / 2,
    axis: 'x' as const,
    meters: 0.3,
    ...clueSize,
  },
  life: {
    id: 'life',
    x: doorX - 0.15,
    y: 0,
    z: doorZ + doorSize.sz / 2 + 0.48,
    rotY: 0.2,
    axis: 'x' as const,
    meters: 0.32,
    ...lifeSize,
  },
  yahtzee: {
    id: 'yahtzee',
    x: 0.85,
    y: 0,
    z: dresserZ + dresserSize.sz / 2 + 0.95,
    rotY: -0.2,
    axis: 'x' as const,
    meters: 0.28,
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
  // Nightstand is yawed into the corner, so the box is a little fatter than the mesh.
  { x: LAYOUT.nightstand.x, z: LAYOUT.nightstand.z, hx: 0.36, hz: 0.36, top: LAYOUT.nightstand.sy },
  footprint(LAYOUT.dresser, false),
  footprint(LAYOUT.shelf, false),
  footprint(LAYOUT.desk, true),
  footprint(LAYOUT.toyshelf, true),
  footprint(LAYOUT.door, false),
  footprint(LAYOUT.clutterdesk, true),
];

/** Game-box rows up the real shelf, helmet stays above the top row. */
export const SHELF_ROW_Y = [1.52, 1.3, 1.08, 0.86, 0.64, 0.44, 0.3, 0.18, 0.08];
