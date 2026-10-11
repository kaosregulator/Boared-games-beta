import { LAYOUT } from './roomLayout';
import { EAST_X, NORTH_Z, WEST_X } from './videoRoom';

export interface Anchor {
  id: string;
  label: string;
  /** Where the object's floor (or back, for a wall) sits. */
  position: [number, number, number];
  /** Wall anchors face into the room. */
  rotY: number;
  kind: 'floor' | 'surface' | 'wall';
}

const dresserTop = LAYOUT.dresser.y + LAYOUT.dresser.sy;
const nightTop = LAYOUT.nightstand.sy;
const deskTop = LAYOUT.desk.sy;
const shelfTop = LAYOUT.shelf.sy;

/** Snap points on the room that already works. New uploads land on these. */
export const ANCHORS: Anchor[] = [
  { id: 'floor-center', label: 'Rug', position: [0.2, 0, 0.15], rotY: 0, kind: 'floor' },
  { id: 'floor-bed', label: 'Floor by the bed', position: [LAYOUT.bed.x + 0.9, 0, LAYOUT.bed.z + 0.7], rotY: 0.4, kind: 'floor' },
  { id: 'floor-tv', label: 'Floor by the TV', position: [LAYOUT.dresser.x + 0.2, 0, LAYOUT.dresser.z + 0.9], rotY: -0.3, kind: 'floor' },
  { id: 'floor-shelf', label: 'Floor by the shelf', position: [LAYOUT.shelf.x + 0.2, 0, LAYOUT.shelf.z + 0.9], rotY: 0, kind: 'floor' },
  {
    id: 'dresser-top',
    label: 'On the dresser',
    position: [LAYOUT.dresser.x + 0.28, dresserTop, LAYOUT.dresser.z],
    rotY: 0,
    kind: 'surface',
  },
  {
    id: 'nightstand',
    label: 'On the nightstand',
    position: [LAYOUT.nightstand.x, nightTop, LAYOUT.nightstand.z],
    rotY: 0.2,
    kind: 'surface',
  },
  {
    id: 'bed',
    label: 'On the bed',
    position: [LAYOUT.bed.x + 0.15, 0.52, LAYOUT.bed.z + 0.2],
    rotY: 0.3,
    kind: 'surface',
  },
  {
    id: 'shelf-top',
    label: 'On top of the game shelf',
    position: [LAYOUT.shelf.x, shelfTop, LAYOUT.shelf.z],
    rotY: 0,
    kind: 'surface',
  },
  {
    id: 'desk',
    label: 'On the desk',
    position: [LAYOUT.desk.x - 0.15, deskTop, LAYOUT.desk.z],
    rotY: -Math.PI / 2,
    kind: 'surface',
  },
  {
    id: 'toyshelf',
    label: 'On the toy shelf',
    position: [LAYOUT.toyshelf.x - 0.15, LAYOUT.toyshelf.sy, LAYOUT.toyshelf.z],
    rotY: LAYOUT.toyshelf.rotY,
    kind: 'surface',
  },
  {
    id: 'wall-north',
    label: 'North wall (poster height)',
    position: [LAYOUT.dresser.x - 0.7, 1.7, NORTH_Z + 0.04],
    rotY: 0,
    kind: 'wall',
  },
  {
    id: 'wall-east',
    label: 'East wall (poster height)',
    position: [EAST_X - 0.04, 1.55, -0.4],
    rotY: -Math.PI / 2,
    kind: 'wall',
  },
  {
    id: 'wall-west',
    label: 'West wall (poster height)',
    position: [WEST_X + 0.04, 1.6, 0.4],
    rotY: Math.PI / 2,
    kind: 'wall',
  },
];

export function anchorById(id: string | null): Anchor | undefined {
  return ANCHORS.find(a => a.id === id);
}
