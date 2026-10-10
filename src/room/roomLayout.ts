import { EAST_X, NORTH_Z, WEST_X } from './videoRoom';

/**
 * Real-world placement for the Tripo meshes.
 *
 * Each GLB is normalized (about 1 unit), so we scale on ONE axis and let the
 * other two follow. Scaling width and height independently is what squashed
 * the bed and shrank the shelf. Sizes below are the fitted bounding boxes.
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
const cardSize = fit(N.cards, 'x', 0.18);

/** After +90° Y, local Z becomes world X and local X becomes world Z. */
const bedIntoRoom = bedSize.sz;

export const LAYOUT = {
  bed: {
    id: 'bed',
    x: WEST_X + bedIntoRoom / 2 + 0.1,
    y: 0,
    z: -0.15,
    rotY: Math.PI / 2,
    axis: 'y' as const,
    meters: 0.95,
    ...bedSize,
  },
  nightstand: {
    id: 'nightstand',
    x: WEST_X + nightSize.sx / 2 + 0.12,
    y: 0,
    z: -1.28,
    rotY: 0,
    axis: 'y' as const,
    meters: 0.58,
    ...nightSize,
  },
  window: {
    id: 'window',
    x: -1.65,
    y: 1.02,
    z: NORTH_Z + 0.1,
    rotY: 0,
    axis: 'y' as const,
    meters: 1.15,
    ...windowSize,
  },
  dresser: {
    id: 'dresser',
    x: -0.05,
    y: 0,
    z: NORTH_Z + dresserSize.sz / 2 + 0.05,
    rotY: 0,
    axis: 'y' as const,
    meters: 0.84,
    ...dresserSize,
  },
  crt: {
    id: 'crt',
    // Centered on the dresser. 0.62m wide is a real bedroom CRT; nothing else shares the top.
    x: -0.05,
    y: 0.84,
    z: NORTH_Z + dresserSize.sz / 2 + 0.05,
    rotY: 0,
    axis: 'x' as const,
    meters: 0.62,
    ...crtSize,
  },
  toyshelf: {
    id: 'toyshelf',
    // Big floor shelf. The name is what sits on it, not its size.
    x: EAST_X - toySize.sz / 2 - 0.06,
    y: 0,
    z: -0.35,
    rotY: -Math.PI / 2,
    axis: 'y' as const,
    meters: 1.35,
    ...toySize,
  },
  shelf: {
    id: 'shelf',
    x: 1.72,
    y: 0,
    z: NORTH_Z + shelfSize.sz / 2 + 0.04,
    rotY: 0,
    axis: 'y' as const,
    meters: 2.02,
    ...shelfSize,
  },
  desk: {
    id: 'desk',
    // East wall, chair facing into the room.
    x: EAST_X - deskSize.sz / 2 - 0.08,
    y: 0,
    z: 1.55,
    rotY: -Math.PI / 2,
    axis: 'y' as const,
    meters: 0.75,
    ...deskSize,
  },
  boombox: {
    id: 'boombox',
    x: 0.72,
    y: 0,
    z: -1.45,
    rotY: -0.4,
    axis: 'x' as const,
    meters: 0.42,
    ...boomSize,
  },
  vhs_stack: {
    id: 'vhs_stack',
    x: 0.42,
    y: 0,
    z: -1.28,
    rotY: 0.4,
    axis: 'y' as const,
    meters: 0.22,
    ...vhsSize,
  },
  vhs_loose: {
    id: 'vhs_loose',
    x: 1.05,
    y: 0,
    z: -1.15,
    rotY: 0.5,
    axis: 'x' as const,
    meters: 0.34,
    ...looseSize,
  },
  gameboy: {
    id: 'gameboy',
    x: -1.55,
    y: 0.5,
    z: 0.15,
    rotY: 0.4,
    axis: 'y' as const,
    meters: 0.15,
    ...gbSize,
  },
  cards: {
    id: 'cards',
    // A real handful of cards on the nightstand, not a floor mat.
    x: WEST_X + 0.42,
    y: 0.58,
    z: -1.12,
    rotY: 0.4,
    axis: 'x' as const,
    meters: 0.18,
    ...cardSize,
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
];

/** Game-box rows up the real shelf, helmet stays above the top row. */
export const SHELF_ROW_Y = [1.52, 1.3, 1.08, 0.86, 0.64, 0.44, 0.3, 0.18, 0.08];
