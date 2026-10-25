import { EAST_X, NORTH_Z, SOUTH_Z, WEST_X } from './videoRoom';

/**
 * Real-world placement for the Tripo meshes.
 *
 * Each GLB is normalized (about 1 unit), so we scale on ONE axis and let the
 * other two follow. Scaling width and height independently is what squashed
 * the bed and shrank the shelf. Sizes below are the fitted bounding boxes.
 *
 * North wall, west to east: window, nightstand under it, bed along the
 * west wall, dresser with the CRT, door, tall game shelf. A short wood
 * shelf stays above the television. The teddy diorama is the other
 * floating shelf, enlarged on the south wall behind the player.
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
  desk: [0.98, 0.626, 0.454] as [number, number, number],
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
  beanbag: [0.98, 0.376, 0.978] as [number, number, number],
  crate: [0.98, 0.959, 0.646] as [number, number, number],
  hotwheels: [0.98, 0.881, 0.874] as [number, number, number],
};

const bedSize = fit(N.bed, 'y', 0.95);
const shelfSize = fit(N.shelf, 'y', 2.05);
const dresserSize = fit(N.dresser, 'y', 0.84);
const crtSize = fit(N.crt, 'x', 0.62);
const toySize = fit(N.toyshelf, 'y', 1.32);
/** The retro PC desk: 1.65m long, so the top lands at about 62cm. */
const deskSize = fit(N.desk, 'x', 1.65);
const nightSize = fit(N.nightstand, 'y', 0.9);
const windowSize = fit(N.window, 'y', 1.12);
const boomSize = fit(N.boombox, 'x', 0.52);
const gbSize = fit(N.gameboy, 'y', 0.16);
const vhsSize = fit(N.vhs_stack, 'y', 0.27);
const looseSize = fit(N.vhs_loose, 'x', 0.38);
const cardSize = fit(N.cards, 'x', 0.46);
const doorSize = fit(N.door, 'y', 2.2);
const packSize = fit(N.backpack, 'y', 0.46);
const pocketSize = fit(N.hotpockets, 'x', 0.3);
const nesSize = fit(N.nes, 'x', 0.36);
const rubikSize = fit(N.rubik, 'y', 0.14);
const figureSize = fit(N.armor, 'y', 0.22);
const armySize = fit(N.army, 'x', 0.72);
const gusherSize = fit(N.gushers, 'y', 0.16);
const teddySize = fit(N.teddy, 'x', 1.5);
const shoeSize = fit(N.jordans, 'x', 0.5);
const carSize = fit(N.car, 'x', 0.32);
const bookSize = fit(N.books, 'y', 0.26);
const clutterSize = fit(N.clutterdesk, 'y', 1.16);
const boardSize = fit(N.board, 'x', 0.44);
const shipSize = fit(N.battleship, 'x', 0.4);
const clueSize = fit(N.clue, 'x', 0.36);
const lifeSize = fit(N.life, 'x', 0.4);
const yahtzeeSize = fit(N.yahtzee, 'x', 0.38);
const beanSize = fit(N.beanbag, 'x', 1.38);
const beanX = -0.15;
const beanZ = SOUTH_Z - beanSize.sz / 2 - 0.06;
const crateSize = fit(N.crate, 'x', 1.08);
const trackSize = fit(N.hotwheels, 'x', 0.62);

/** Push the frame into the plaster so the visible wood meets the wall. */
const flushNorth = (sz: number) => NORTH_Z + sz * 0.18;

/** After +90° Y, local Z becomes world X and local X becomes world Z. */
const bedIntoRoom = bedSize.sz;
const bedX = WEST_X + bedIntoRoom / 2 + 0.08;
const bedZ = -0.55;

const windowX = WEST_X + windowSize.sx / 2 + 0.08;
const windowY = 0.96;
const windowZ = flushNorth(windowSize.sz);

const nightX = windowX;
const nightZ = NORTH_Z + nightSize.sz / 2 - 0.015;

const shelfX = EAST_X - shelfSize.sx / 2 - 0.05;
const shelfZ = flushNorth(shelfSize.sz);

const dresserX = -0.78;
const dresserZ = flushNorth(dresserSize.sz);

const doorX = 0.58;
const doorZ = flushNorth(doorSize.sz);

const toyX = EAST_X - toySize.sz / 2 - 0.05;
const toyZ = 0.05;

/** Height of the PC desk's top, under the computer: 37% of the mesh's height. */
export const PC_DESK_TOP = (deskSize.sx / N.desk[0]) * 0.37;

/** Slid all the way into the south-east corner, back to the wall. */
const deskX = EAST_X - deskSize.sz / 2 - 0.03;
const deskZ = SOUTH_Z - deskSize.sx / 2 - 0.03;

const clutterX = WEST_X + clutterSize.sz / 2 + 0.06;
const clutterZ = 1.45;

/** Wood shelf above the television. This one stays on the north wall. */
export const WALL_SHELF = {
  x: dresserX + 0.02,
  y: 1.94,
  z: NORTH_Z + 0.18,
  w: 1.68,
  d: 0.36,
  h: 0.055,
};
const shelfTopY = WALL_SHELF.y + WALL_SHELF.h;
const dresserRight = dresserX + dresserSize.sx / 2;

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
    meters: 0.9,
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
    meters: 1.32,
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
    axis: 'x' as const,
    meters: 1.65,
    ...deskSize,
  },
  clutterdesk: {
    id: 'clutterdesk',
    x: clutterX,
    y: 0,
    z: clutterZ,
    rotY: Math.PI / 2,
    axis: 'y' as const,
    meters: 1.16,
    ...clutterSize,
  },
  boombox: {
    id: 'boombox',
    x: -0.45,
    y: 0,
    z: -1.35,
    rotY: -0.25,
    axis: 'x' as const,
    meters: 0.52,
    ...boomSize,
  },
  vhs_stack: {
    id: 'vhs_stack',
    x: -1.2,
    y: 0,
    z: -1.7,
    rotY: 0.2,
    axis: 'y' as const,
    meters: 0.27,
    ...vhsSize,
  },
  vhs_loose: {
    id: 'vhs_loose',
    x: 0.42,
    y: 0,
    z: -1.48,
    rotY: 0.45,
    axis: 'x' as const,
    meters: 0.38,
    ...looseSize,
  },
  // Left on the bean bag, screen toward the room, where you sit to play it.
  gameboy: {
    id: 'gameboy',
    x: beanX + 0.12,
    y: beanSize.sy * 0.86,
    z: beanZ - 0.18,
    rotY: Math.PI - 0.25,
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
    meters: 0.46,
    ...packSize,
  },
  teddy: {
    id: 'teddy',
    x: -0.15,
    y: 2.22,
    z: SOUTH_Z - teddySize.sz / 2 + 0.02,
    rotY: Math.PI,
    axis: 'x' as const,
    meters: 1.5,
    ...teddySize,
  },
  cards: {
    id: 'cards',
    x: -0.35,
    y: 0,
    z: 0.72,
    rotY: 0.35,
    axis: 'x' as const,
    meters: 0.46,
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
    x: 1.12,
    y: 0,
    z: -1.38,
    rotY: 0.8,
    axis: 'x' as const,
    meters: 0.5,
    ...shoeSize,
  },
  car: {
    id: 'car',
    x: 1.0,
    y: 0,
    z: 0.55,
    rotY: 0.7,
    axis: 'x' as const,
    meters: 0.32,
    ...carSize,
  },
  nes: {
    id: 'nes',
    x: WALL_SHELF.x + 0.54,
    y: shelfTopY,
    z: WALL_SHELF.z + 0.02,
    rotY: 0.15,
    axis: 'x' as const,
    meters: 0.36,
    ...nesSize,
  },
  armor: {
    id: 'armor',
    x: WALL_SHELF.x - 0.16,
    y: shelfTopY,
    z: WALL_SHELF.z,
    rotY: -0.2,
    axis: 'y' as const,
    meters: 0.22,
    ...figureSize,
  },
  rubik: {
    id: 'rubik',
    x: WALL_SHELF.x + 0.1,
    y: shelfTopY,
    z: WALL_SHELF.z - 0.01,
    rotY: 0.45,
    axis: 'y' as const,
    meters: 0.14,
    ...rubikSize,
  },
  army: {
    id: 'army',
    x: 1.05,
    y: 0,
    z: SOUTH_Z - armySize.sz / 2 - 0.35,
    rotY: Math.PI - 0.2,
    axis: 'x' as const,
    meters: 0.72,
    ...armySize,
  },
  gushers: {
    id: 'gushers',
    x: dresserRight - gusherSize.sx / 2 - 0.03,
    y: 0.84,
    z: dresserZ + crtSize.sz / 2 + gusherSize.sz / 2 + 0.015,
    rotY: -0.35,
    axis: 'y' as const,
    meters: 0.16,
    ...gusherSize,
  },
  books: {
    id: 'books',
    x: WALL_SHELF.x - 0.56,
    y: shelfTopY,
    z: WALL_SHELF.z,
    rotY: 0.1,
    axis: 'y' as const,
    meters: 0.26,
    ...bookSize,
  },
  board: {
    id: 'board',
    x: shelfX - 0.15,
    y: 0,
    z: shelfZ + shelfSize.sz / 2 + 0.38,
    rotY: 0.1,
    axis: 'x' as const,
    meters: 0.44,
    ...boardSize,
  },
  battleship: {
    id: 'battleship',
    x: toyX - toySize.sz / 2 - 0.32,
    y: 0,
    z: toyZ - 0.35,
    rotY: -Math.PI / 2,
    axis: 'x' as const,
    meters: 0.4,
    ...shipSize,
  },
  clue: {
    id: 'clue',
    x: deskX - 0.16,
    y: deskSize.sy,
    z: deskZ + 0.28,
    rotY: -Math.PI / 2,
    axis: 'x' as const,
    meters: 0.36,
    ...clueSize,
  },
  life: {
    id: 'life',
    x: 0.12,
    y: 0,
    z: -1.98,
    rotY: 0.15,
    axis: 'x' as const,
    meters: 0.4,
    ...lifeSize,
  },
  yahtzee: {
    id: 'yahtzee',
    x: -1.05,
    y: 0,
    z: -1.12,
    rotY: -0.15,
    axis: 'x' as const,
    meters: 0.38,
    ...yahtzeeSize,
  },
  beanbag: {
    id: 'beanbag',
    x: beanX,
    y: 0,
    z: beanZ,
    rotY: Math.PI,
    axis: 'x' as const,
    meters: 1.38,
    ...beanSize,
  },
  crate: {
    id: 'crate',
    x: EAST_X - crateSize.sz / 2 - 0.05,
    y: 0,
    z: -1.42,
    rotY: Math.PI / 2,
    axis: 'x' as const,
    meters: 1.08,
    ...crateSize,
  },
  /** Built on the floor in front of the toy shelf, loop facing the room. */
  hotwheels: {
    id: 'hotwheels',
    x: toyX - toySize.sz / 2 - 0.5,
    y: 0,
    z: toyZ - 0.3,
    rotY: -Math.PI / 2 + 0.35,
    axis: 'x' as const,
    meters: 0.62,
    ...trackSize,
  },
} satisfies Record<string, Placed>;

/**
 * Same window as the north wall, same sill height, centred under the
 * teddy shelf. The shelf is raised above the head of the frame.
 */
export const SOUTH_WINDOW = {
  x: -0.15,
  y: 0.96,
  // Same flush as the north window: frame pushed into the plaster.
  z: SOUTH_Z - windowSize.sz * 0.18,
  rotY: Math.PI,
  axis: 'y' as const,
  meters: 1.12,
  ...windowSize,
};

/** Half-extents on the floor after rotation, for walking collision. */
function footprint(p: Placed, quarterTurns: boolean) {
  const hx = (quarterTurns ? p.sz : p.sx) / 2;
  const hz = (quarterTurns ? p.sx : p.sz) / 2;
  return { x: p.x, z: p.z, hx, hz, top: p.y + p.sy };
}

/**
 * Card table the games are played on. It is not in the room until a game is
 * picked; then it spawns here on the rug and the player is set down crouched
 * at its south edge.
 */
export const PLAY_TABLE = {
  x: 0.12,
  z: -0.28,
  w: 1.14,
  d: 0.74,
  h: 0.62,
};

/** Where the player crouches at the table: eye position and the point looked at. */
export const TABLE_SEAT = {
  at: [PLAY_TABLE.x, 1.0, PLAY_TABLE.z + PLAY_TABLE.d / 2 + 0.31] as [number, number, number],
  look: [PLAY_TABLE.x, PLAY_TABLE.h, PLAY_TABLE.z - 0.04] as [number, number, number],
};

/**
 * Where a game's own box stands on the floor while it is being played: by
 * the table's left front leg, turned toward the player's seat.
 */
export const TABLE_SIDE_BOX = {
  x: PLAY_TABLE.x - PLAY_TABLE.w / 2 - 0.2,
  z: PLAY_TABLE.z + 0.12,
  rotY: 0.55,
};

export const TABLE_COLLIDER = {
  x: PLAY_TABLE.x,
  z: PLAY_TABLE.z,
  hx: PLAY_TABLE.w / 2,
  hz: PLAY_TABLE.d / 2,
  top: PLAY_TABLE.h,
};

/** Sitting in the bean bag with the Game Boy. */
export const BEANBAG_SEAT = {
  at: [beanX, 0.86, beanZ + 0.12] as [number, number, number],
  look: [beanX, 0.62, beanZ - 1.2] as [number, number, number],
};

/**
 * Neon game buttons on the east wall, one row exactly where the boxes stood
 * on top of the old crate (crate gone, boxes kept at the same height).
 */
export const NEON_WALL = {
  x: EAST_X - 0.012,
  z: -1.45,
  y: 1.04,
  cols: 10,
  w: 0.1,
  h: 0.14,
  gap: 0.012,
};

export const ROOM_COLLIDERS = [
  footprint(LAYOUT.bed, true),
  footprint(LAYOUT.nightstand, false),
  footprint(LAYOUT.dresser, false),
  footprint(LAYOUT.shelf, false),
  footprint(LAYOUT.desk, true),
  footprint(LAYOUT.toyshelf, true),
  footprint(LAYOUT.door, false),
  footprint(LAYOUT.clutterdesk, true),
  footprint(LAYOUT.teddy, false),
  footprint(LAYOUT.army, false),
  footprint(LAYOUT.beanbag, false),
];

/** Game-box rows up the real shelf, helmet stays above the top row. */
export const SHELF_ROW_Y = [1.52, 1.3, 1.08, 0.86, 0.64, 0.44, 0.3, 0.18, 0.08];
