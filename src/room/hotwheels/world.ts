import { EAST_X, NORTH_Z, SOUTH_Z, WEST_X } from '../videoRoom';
import { LAYOUT, type Placed } from '../roomLayout';

/**
 * The bedroom as a 1:64 car sees it: solid boxes it bumps into, flat tops it
 * can land on, and the two hiding places (under the bed, under the desk).
 * Every number comes from the same fitted layout the room meshes use.
 */

export interface Block {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** A car below this height drives underneath. */
  minY: number;
  maxY: number;
  /** False for parts you can't land on (a chair back, a lamp). */
  top?: boolean;
}

/** Axis-aligned bounds of a placed mesh after its turn on the floor. */
function bounds(p: Placed, id = p.id, shrink = 0): Block {
  const c = Math.abs(Math.cos(p.rotY));
  const s = Math.abs(Math.sin(p.rotY));
  const hx = c * p.sx / 2 + s * p.sz / 2 - shrink;
  const hz = s * p.sx / 2 + c * p.sz / 2 - shrink;
  return { id, minX: p.x - hx, maxX: p.x + hx, minZ: p.z - hz, maxZ: p.z + hz, minY: p.y, maxY: p.y + p.sy };
}

function box(id: string, x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, top = true): Block {
  return { id, minX: Math.min(x0, x1), maxX: Math.max(x0, x1), minZ: Math.min(z0, z1), maxZ: Math.max(z0, z1), minY: y0, maxY: y1, top };
}

const bed = bounds(LAYOUT.bed);
/** Bottom of the side rail. The quilt stops about here too. */
export const BED_CLEAR = 0.078;
/** The mattress, roughly level, where a jump could land. */
const MATTRESS = 0.5;

/** The study desk on the east wall. Its knee hole faces the room (west). */
const desk = LAYOUT.desk;
export const DESK_TOP = 0.655;
const deskFront = desk.x - 0.2;
const deskBack = EAST_X - 0.02;
const deskNorth = desk.z - 0.77;
const deskSouth = desk.z + 0.77;
const kneeNorth = desk.z - 0.36;
const kneeSouth = desk.z + 0.36;

export const DESK = { front: deskFront, back: deskBack, north: deskNorth, south: deskSouth, kneeNorth, kneeSouth, top: DESK_TOP };

/** Rolling chair parked at the knee hole. Its seat is high enough to pass under. */
const chair = { x0: desk.x - 0.56, x1: deskFront + 0.02, z0: desk.z - 0.27, z1: desk.z + 0.3 };

const plainIds = [
  'nightstand', 'dresser', 'crt', 'door', 'shelf', 'toyshelf', 'clutterdesk', 'beanbag', 'army',
  'boombox', 'vhs_stack', 'vhs_loose', 'jordans', 'car', 'cards', 'hotpockets', 'hotwheels',
] as const;

export const BLOCKS: Block[] = [
  ...plainIds.map(id => bounds(LAYOUT[id], id, id === 'hotwheels' ? 0.08 : 0)),
  // Bed: four posts to the floor, the frame and mattress above the gap.
  box('bed', bed.minX, bed.maxX, bed.minZ, bed.maxZ, BED_CLEAR, MATTRESS),
  box('bed-head', bed.minX, bed.minX + 0.08, bed.minZ, bed.maxZ, 0, 0.95, false),
  box('bed-post', bed.maxX - 0.06, bed.maxX, bed.minZ, bed.minZ + 0.06, 0, BED_CLEAR + 0.01, false),
  box('bed-post', bed.maxX - 0.06, bed.maxX, bed.maxZ - 0.06, bed.maxZ, 0, BED_CLEAR + 0.01, false),
  // Desk: two drawer pedestals, the top across them, the modesty panel at the back.
  box('desk', deskFront, deskBack, deskNorth, deskSouth, DESK_TOP - 0.05, DESK_TOP),
  box('desk-drawers', deskFront, deskBack, deskNorth, kneeNorth, 0, DESK_TOP - 0.05, false),
  box('desk-drawers', deskFront, deskBack, kneeSouth, deskSouth, 0, DESK_TOP - 0.05, false),
  box('desk-panel', deskBack - 0.04, deskBack, kneeNorth, kneeSouth, 0, DESK_TOP - 0.05, false),
  // Things on the desk top.
  box('desk-binder', deskFront + 0.25, deskFront + 0.58, desk.z - 0.69, desk.z - 0.34, DESK_TOP, DESK_TOP + 0.03),
  box('desk-books', deskFront + 0.5, deskBack, desk.z - 0.48, desk.z - 0.08, DESK_TOP, DESK_TOP + 0.3, false),
  box('desk-cups', deskFront + 0.62, deskBack, desk.z + 0.12, desk.z + 0.3, DESK_TOP, DESK_TOP + 0.2, false),
  box('desk-lamp', deskFront + 0.38, deskFront + 0.58, desk.z + 0.52, desk.z + 0.74, DESK_TOP, DESK_TOP + 0.45, false),
  // Chair: centre post and wheel star at the floor, seat and back up high.
  box('chair-post', (chair.x0 + chair.x1) / 2 - 0.035, (chair.x0 + chair.x1) / 2 + 0.035, desk.z - 0.035, desk.z + 0.035, 0, 0.5, false),
  box('chair-seat', chair.x0, chair.x1, chair.z0, chair.z1, 0.28, 0.5),
  box('chair-back', chair.x0, chair.x0 + 0.12, chair.z0 + 0.04, chair.z1 - 0.04, 0.5, 0.78, false),
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
  { id: 'desk-under', label: 'Under the desk', minX: deskFront - 0.02, maxX: deskBack, minZ: kneeNorth, maxZ: kneeSouth, minY: -1, maxY: DESK_TOP - 0.1 },
  { id: 'desk-top', label: 'On the desk', minX: deskFront, maxX: deskBack, minZ: deskNorth, maxZ: deskSouth, minY: DESK_TOP - 0.03, maxY: DESK_TOP + 0.4 },
];

export function zoneAt(x: number, y: number, z: number): Zone | null {
  for (const zone of ZONES) {
    if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ && y >= zone.minY && y <= zone.maxY) return zone;
  }
  return null;
}

export const BED_BOUNDS = bed;
