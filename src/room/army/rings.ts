import * as THREE from 'three';
import { HELIPAD } from './town';

/**
 * The ring course: out of town, up past the door, over the TV, round the
 * window, over the bed, low past the bean bag, up by the desk, a climb to
 * the ceiling and back down onto the helipad. Each ring faces the way
 * you fly through it.
 */
export interface Ring {
  p: THREE.Vector3;
  /** Unit normal: the direction you fly through it. */
  n: THREE.Vector3;
  r: number;
  label: string;
}

function ring(x: number, y: number, z: number, nx: number, ny: number, nz: number, r: number, label: string): Ring {
  return { p: new THREE.Vector3(x, y, z), n: new THREE.Vector3(nx, ny, nz).normalize(), r, label };
}

export const RINGS: Ring[] = [
  ring(HELIPAD.x - 0.05, 0.32, -0.3, 0, 0.25, -1, 0.17, 'Out of town'),
  ring(0.35, 0.95, -1.75, -0.3, 0.3, -1, 0.2, 'Past the door'),
  ring(-0.78, 1.7, -2.02, -1, 0, -0.1, 0.19, 'Over the TV'),
  ring(-1.85, 1.35, -1.75, -0.45, -0.2, 0.9, 0.2, 'The window'),
  ring(-2.05, 0.95, -0.4, 0.05, -0.25, 1, 0.2, 'Over the bed'),
  ring(-1.15, 0.38, 0.75, 0.75, -0.1, 0.65, 0.17, 'Low pass'),
  ring(0.05, 0.85, 1.25, 1, 0.1, 0, 0.18, 'Over the bean bag'),
  ring(1.45, 1.05, 1.1, 0.45, 0.2, -0.9, 0.18, 'By the desk'),
  ring(1.55, 2.25, -0.55, -0.6, 0.35, -0.75, 0.22, 'Up by the ceiling'),
  ring(HELIPAD.x + 0.02, 0.42, -0.1, 0.1, -0.6, 0.8, 0.19, 'Home to the pad'),
];

/** Did the segment from a to b go through the ring (forwards)? */
export function throughRing(ring: Ring, a: THREE.Vector3, b: THREE.Vector3) {
  const da = _d.subVectors(a, ring.p).dot(ring.n);
  const db = _e.subVectors(b, ring.p).dot(ring.n);
  if (!(da < 0 && db >= 0)) return false;
  const t = da / (da - db);
  _hit.lerpVectors(a, b, t);
  return _hit.distanceTo(ring.p) <= ring.r * 1.05;
}

const _d = new THREE.Vector3();
const _e = new THREE.Vector3();
const _hit = new THREE.Vector3();
