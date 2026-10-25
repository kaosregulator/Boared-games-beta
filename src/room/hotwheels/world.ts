import { EAST_X, NORTH_Z, SOUTH_Z, WEST_X } from '../videoRoom';
import { LAYOUT, PC_DESK_TOP, type Placed } from '../roomLayout';

/**
 * The bedroom as a 1:64 car sees it: solid boxes it bumps into, flat tops it
 * can land on, and the two hiding places (under the bed, under the desk).
 * Every number comes from the same fitted layout the room meshes use.
 */

export interface Block {
  id: string;
  /** Axis-aligned bounds: the whole footprint, used to skip far blocks fast. */
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** A car below this height drives underneath. */
  minY: number;
  maxY: number;
  /** False for parts you can't land on (a chair back, a lamp). */
  top?: boolean;
  /**
   * The real footprint when it isn't the plain bounds: a box turned with its
   * prop, or a circle for round things (a plate, the bean bag). Without one
   * a turned prop's bounds stick out past its corners, and that empty air is
   * what the car used to get caught on.
   */
  shape?: TurnedBox | Round;
}

interface TurnedBox {
  kind: 'box';
  cx: number;
  cz: number;
  hx: number;
  hz: number;
  /** cos and sin of the prop's turn (three.js Y rotation). */
  c: number;
  s: number;
}

interface Round {
  kind: 'round';
  cx: number;
  cz: number;
  r: number;
}

/** Is (x, z) on the block's footprint, grown by `pad`? */
export function blockHas(b: Block, x: number, z: number, pad = 0) {
  if (x < b.minX - pad || x > b.maxX + pad || z < b.minZ - pad || z > b.maxZ + pad) return false;
  const sh = b.shape;
  if (!sh) return true;
  const dx = x - sh.cx;
  const dz = z - sh.cz;
  if (sh.kind === 'round') return dx * dx + dz * dz <= (sh.r + pad) * (sh.r + pad);
  const lx = dx * sh.c - dz * sh.s;
  const lz = dx * sh.s + dz * sh.c;
  return Math.abs(lx) <= sh.hx + pad && Math.abs(lz) <= sh.hz + pad;
}

export interface Push {
  x: number;
  z: number;
  /** Outward normal on the floor plane. */
  nx: number;
  nz: number;
}

/**
 * Push a circle of radius r at (x, z) out of the block's footprint. Corners
 * are rounded, so leaning on one slides you past it instead of pinning you.
 */
export function pushOutOf(b: Block, x: number, z: number, r: number): Push | null {
  if (x <= b.minX - r || x >= b.maxX + r || z <= b.minZ - r || z >= b.maxZ + r) return null;
  const sh = b.shape;
  if (sh?.kind === 'round') {
    const dx = x - sh.cx;
    const dz = z - sh.cz;
    const d = Math.hypot(dx, dz);
    const reach = sh.r + r;
    if (d >= reach) return null;
    const nx = d > 1e-6 ? dx / d : 1;
    const nz = d > 1e-6 ? dz / d : 0;
    return { x: sh.cx + nx * reach, z: sh.cz + nz * reach, nx, nz };
  }
  // A box: in its own frame (identity for the plain bounds).
  const cx = sh ? sh.cx : (b.minX + b.maxX) / 2;
  const cz = sh ? sh.cz : (b.minZ + b.maxZ) / 2;
  const hx = sh ? sh.hx : (b.maxX - b.minX) / 2;
  const hz = sh ? sh.hz : (b.maxZ - b.minZ) / 2;
  const c = sh ? sh.c : 1;
  const s = sh ? sh.s : 0;
  const dx = x - cx;
  const dz = z - cz;
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;
  const qx = Math.max(-hx, Math.min(hx, lx));
  const qz = Math.max(-hz, Math.min(hz, lz));
  let ox = lx - qx;
  let oz = lz - qz;
  const d = Math.hypot(ox, oz);
  let px: number;
  let pz: number;
  if (d > 1e-6) {
    if (d >= r) return null;
    ox /= d;
    oz /= d;
    px = qx + ox * r;
    pz = qz + oz * r;
  } else {
    // Centre inside: leave by the nearest side.
    const pens = [hx + lx, hx - lx, hz + lz, hz - lz];
    const i = pens.indexOf(Math.min(...pens));
    ox = i === 0 ? -1 : i === 1 ? 1 : 0;
    oz = i === 2 ? -1 : i === 3 ? 1 : 0;
    px = ox ? ox * (hx + r) : lx;
    pz = oz ? oz * (hz + r) : lz;
  }
  // Back to the room: the inverse of the turn above.
  return {
    x: cx + px * c + pz * s,
    z: cz - px * s + pz * c,
    nx: ox * c + oz * s,
    nz: -ox * s + oz * c,
  };
}

/** A placed mesh's footprint after its turn on the floor: the turned box itself. */
function bounds(p: Placed, id = p.id, shrink = 0): Block {
  const ac = Math.abs(Math.cos(p.rotY));
  const as = Math.abs(Math.sin(p.rotY));
  const hx = ac * p.sx / 2 + as * p.sz / 2 - shrink;
  const hz = as * p.sx / 2 + ac * p.sz / 2 - shrink;
  const block: Block = { id, minX: p.x - hx, maxX: p.x + hx, minZ: p.z - hz, maxZ: p.z + hz, minY: p.y, maxY: p.y + p.sy };
  // Quarter turns are already exact.
  const quarter = Math.abs(Math.sin(2 * p.rotY)) < 1e-3;
  if (!quarter) {
    block.shape = { kind: 'box', cx: p.x, cz: p.z, hx: p.sx / 2 - shrink, hz: p.sz / 2 - shrink, c: Math.cos(p.rotY), s: Math.sin(p.rotY) };
  }
  return block;
}

/** Something round on the floor: a circle of radius r around the prop's centre. */
function round(p: Placed, r: number, maxY = p.y + p.sy, top = true): Block {
  return { id: p.id, minX: p.x - r, maxX: p.x + r, minZ: p.z - r, maxZ: p.z + r, minY: p.y, maxY, top, shape: { kind: 'round', cx: p.x, cz: p.z, r } };
}

function box(id: string, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, top = true): Block {
  return { id, minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), minY: y0, maxY: y1, top };
}

const bed = bounds(LAYOUT.bed);
/** Bottom of the side rail. The quilt stops about here too. */
export const BED_CLEAR = 0.078;
/** The mattress, roughly level, where a jump could land. */
const MATTRESS = 0.5;

/**
 * The retro PC desk in the south-east corner, back to the east wall. Its
 * knee hole faces the room (west). Boxes are read off the mesh in its own
 * units (x along the desk, z out of its front) and turned into the room.
 */
const desk = LAYOUT.desk;
const deskScale = desk.sx / 0.98;
export const DESK_TOP = PC_DESK_TOP;
const KNEE_TOP = 0.3 * deskScale;
const deskFront = desk.x - desk.sz / 2;
const deskBack = desk.x + desk.sz / 2;
const deskNorth = desk.z - desk.sx / 2;
const deskSouth = desk.z + desk.sx / 2;
const kneeNorth = desk.z - 0.22 * deskScale;
const kneeSouth = desk.z + 0.22 * deskScale;

export const DESK = { front: deskFront, back: deskBack, north: deskNorth, south: deskSouth, kneeNorth, kneeSouth, top: DESK_TOP };

/** A box on the desk, in the mesh's own units (x along it, z toward its front, y up). */
function onDesk(id: string, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, top = false): Block {
  return box(id, desk.x - z0 * deskScale, desk.x - z1 * deskScale, desk.z + x0 * deskScale, desk.z + x1 * deskScale, y0 * deskScale, y1 * deskScale, top);
}

const plainIds = [
  'nightstand', 'dresser', 'crt', 'door', 'shelf', 'toyshelf', 'clutterdesk', 'army',
  'boombox', 'vhs_stack', 'vhs_loose', 'jordans', 'car', 'cards', 'hotwheels',
] as const;

/**
 * The bed's legs, read off the mesh: in from the quilt's corners, not at the
 * edge of its bounds. The old posts sat out where the quilt hangs, so the car
 * hit thin air there and drove straight through the real legs.
 */
const BED_LEG = 0.06;
const bedLegs = (() => {
  const p = LAYOUT.bed;
  // Metres per unit of the mesh's own frame, where it spans x = ±1.
  const unit = p.sx / 2;
  // Legs at x = ±0.66 across the bed and z = -0.86 (head), +0.72 (foot) along it.
  // The bed is turned a quarter: mesh z runs along world x, mesh x along world -z.
  const out: Block[] = [];
  for (const across of [-0.66, 0.66]) {
    for (const along of [-0.86, 0.72]) {
      const x = p.x + along * unit;
      const z = p.z - across * unit;
      out.push(box('bed-post', x - BED_LEG / 2, x + BED_LEG / 2, z - BED_LEG / 2, z + BED_LEG / 2, 0, BED_CLEAR + 0.01, false));
    }
  }
  return out;
})();

export const BLOCKS: Block[] = [
  ...plainIds.map(id => bounds(LAYOUT[id], id, id === 'hotwheels' ? 0.08 : 0)),
  // The bean bag is a round blob, not the box around it.
  round(LAYOUT.beanbag, 0.6),
  // The plate of pizza rolls: low enough to bump right over, like a speed bump.
  round(LAYOUT.hotpockets, LAYOUT.hotpockets.sx / 2, 0.03),
  // Bed: four legs to the floor, the frame and mattress above the gap.
  box('bed', bed.minX, bed.maxX, bed.minZ, bed.maxZ, BED_CLEAR, MATTRESS),
  box('bed-head', bed.minX, bed.minX + 0.08, bed.minZ, bed.maxZ, 0, 0.95, false),
  ...bedLegs,
  // Desk: two drawer pedestals, the top across them, the modesty panel at the back.
  box('desk', deskFront, deskBack, deskNorth, deskSouth, KNEE_TOP, DESK_TOP),
  box('desk-drawers', deskFront, deskBack, deskNorth, kneeNorth, 0, KNEE_TOP, false),
  box('desk-drawers', deskFront, deskBack, kneeSouth, deskSouth, 0, KNEE_TOP, false),
  box('desk-panel', deskBack - 0.06, deskBack, kneeNorth, kneeSouth, 0, KNEE_TOP, false),
  // The hand-width slot between the toy shelf and the desk: a car fits in
  // but can't turn round, so it's walled off.
  box('desk-gap', deskFront, EAST_X, bounds(LAYOUT.toyshelf).maxZ, deskNorth, 0, KNEE_TOP, false),
  // The computer and its things. The front strip stays clear for the track.
  onDesk('desk-monitor', -0.235, 0.055, -0.227, 0.03, 0.37, 0.63),
  onDesk('desk-tower', 0.07, 0.22, -0.2, 0.0, 0.37, 0.62),
  onDesk('desk-printer', 0.22, 0.49, -0.21, 0.06, 0.37, 0.55),
  onDesk('desk-keyboard', -0.245, 0.1, 0.03, 0.17, 0.37, 0.4, true),
  onDesk('desk-mouse', 0.135, 0.215, 0.06, 0.17, 0.37, 0.4, true),
  onDesk('desk-cds', -0.465, -0.245, -0.08, 0.17, 0.37, 0.49),
];

export const ROOM = {
  minX: WEST_X + 0.03,
  maxX: EAST_X - 0.03,
  minZ: NORTH_Z + 0.03,
  maxZ: SOUTH_Z - 0.03,
};

export type ZoneId = 'bed' | 'desk-under' | 'desk-top';

export interface Zone {
  id: ZoneId;
  label: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

export const ZONES: Zone[] = [
  { id: 'bed', label: 'Under the bed', minX: bed.minX, maxX: bed.maxX, minZ: bed.minZ, maxZ: bed.maxZ, minY: -1, maxY: BED_CLEAR },
  { id: 'desk-under', label: 'Under the desk', minX: deskFront - 0.02, maxX: deskBack, minZ: kneeNorth, maxZ: kneeSouth, minY: -1, maxY: KNEE_TOP - 0.05 },
  // The track runs along the desk's front lip, so the zone reaches a little past it.
  { id: 'desk-top', label: 'On the desk', minX: deskFront - 0.12, maxX: deskBack, minZ: deskNorth, maxZ: deskSouth, minY: DESK_TOP - 0.03, maxY: DESK_TOP + 0.4 },
];

export function zoneAt(x: number, y: number, z: number): Zone | null {
  for (const zone of ZONES) {
    if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ && y >= zone.minY && y <= zone.maxY) return zone;
  }
  return null;
}

export const BED_BOUNDS = bed;
