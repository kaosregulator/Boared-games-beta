import * as THREE from 'three';
import { MAN_HEIGHT, MAT } from './town';

/**
 * The shrink-down film. You land, the camera holds a wide from the corner of
 * the room while the town pops up out of the rug, sweeps down onto Sergeant
 * Green, and then each of his five intro lines gets its own shot:
 *
 *   freak-out   close on Sarge
 *   deployed    a low orbit across the town, the men going about their work
 *   sound-off   over his shoulder as the men run in and line up on the road
 *   roll-call   a dolly down the line while they salute and sound off
 *   good-luck   back on Sarge, who salutes you; then the camera is yours
 */

/** Where Sarge gives the speech: on the main road, east of the HQ. */
export const FILM_SPOT = { x: 0.3, z: -0.03 };
/** The line the men form up on, across the road from him. */
export const ROW_Z = -0.155;
export const ROW_GAP = 0.045;
export const ROW_MAX = 11;

/** Seconds: hold the corner after the town is up, then the sweep down to Sarge. */
export const FILM = { hold: 1.1, push: 2.8 };

/** The wide from the corner of the room, high enough to see the whole rug. */
export const CORNER = {
  at: new THREE.Vector3(MAT.x - 1.75, 1.2, MAT.z + 1.85),
  look: new THREE.Vector3(MAT.x, 0.02, MAT.z - 0.05),
};

/** Slot i of n along the line, west to east. */
export function rowSlot(i: number, n: number) {
  return { x: FILM_SPOT.x + (i - (n - 1) / 2) * ROW_GAP, z: ROW_Z };
}

/** The speech is the five intro lines, in this order. */
export type Shot = 'close' | 'orbit' | 'shoulder' | 'dolly' | 'farewell';
const SHOTS: Shot[] = ['close', 'orbit', 'shoulder', 'dolly', 'farewell'];
export function shotFor(line: number): Shot {
  return SHOTS[line] ?? 'close';
}

/** The men are in the line from "Sound off!" until he says good luck. */
export function lineUp(line: number) {
  const s = shotFor(line);
  return s === 'shoulder' || s === 'dolly';
}

const smooth = (u: number) => {
  const t = Math.min(1, Math.max(0, u));
  return t * t * (3 - 2 * t);
};

/**
 * Camera for one line of the speech. `t` is seconds into the line and `span`
 * how long the line stays up. Writes into want / look.
 */
export function speechShot(
  shot: Shot,
  t: number,
  span: number,
  sarge: { x: number; y: number; z: number; heading: number },
  rowN: number,
  want: THREE.Vector3,
  look: THREE.Vector3,
) {
  const u = smooth(t / Math.max(0.1, span));
  switch (shot) {
    case 'orbit': {
      // Low over the east side of the rug, where the roads are open, swinging round
      // towards the wall of books the tan army hides behind.
      const cx = MAT.x;
      const cz = MAT.z - 0.05;
      const a = 1.0 + u * 1.1;
      const r = 0.55;
      want.set(cx + Math.sin(a) * r, 0.12 + Math.sin(u * Math.PI) * 0.06, cz + Math.cos(a) * r);
      look.set(cx - 0.05, 0.03, cz - 0.25 * u);
      return;
    }
    case 'shoulder': {
      // Behind him and a touch to his right: the road, and the men running in.
      const fx = Math.sin(sarge.heading);
      const fz = Math.cos(sarge.heading);
      want.set(sarge.x - fx * 0.15 - fz * 0.05, sarge.y + MAN_HEIGHT * 1.15, sarge.z - fz * 0.15 + fx * 0.05);
      look.set(FILM_SPOT.x, sarge.y + MAN_HEIGHT * 0.55, ROW_Z);
      return;
    }
    case 'dolly': {
      // Down the line at chest height, between them and Sarge.
      const first = rowSlot(0, Math.max(1, rowN));
      const last = rowSlot(Math.max(1, rowN) - 1, Math.max(1, rowN));
      const x = first.x - 0.04 + (last.x - first.x + 0.08) * u;
      want.set(x - 0.03, sarge.y + MAN_HEIGHT * 0.95, ROW_Z + 0.1);
      look.set(x + 0.015, sarge.y + MAN_HEIGHT * 0.62, ROW_Z);
      return;
    }
    default: {
      // Three-quarters from in front, easing in as he talks.
      const side = sarge.heading + (shot === 'farewell' ? -0.5 : 0.55);
      const d = 0.16 - u * 0.045;
      want.set(sarge.x + Math.sin(side) * d, sarge.y + MAN_HEIGHT * 0.95, sarge.z + Math.cos(side) * d);
      look.set(sarge.x, sarge.y + MAN_HEIGHT * 0.78, sarge.z);
    }
  }
}

// ---------------------------------------------------------------------------
// The salute. The soldier's clips are Idle / Walk / Run, so the arm is posed
// on top of whatever the mixer left: upper arm out to the side and forward,
// forearm up to the brim of the helmet, hand flat.

export interface Arm {
  upper: THREE.Bone;
  fore: THREE.Bone;
  hand: THREE.Bone;
  tip: THREE.Object3D;
}

const plain = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** The right arm's chain on a Mixamo rig, or null on anything else. */
export function findArm(model: THREE.Object3D): Arm | null {
  const bones = new Map<string, THREE.Bone>();
  model.traverse(o => {
    if ((o as THREE.Bone).isBone) bones.set(plain(o.name), o as THREE.Bone);
  });
  const get = (n: string) => bones.get(`mixamorig${n}`) ?? null;
  const upper = get('rightarm');
  const fore = get('rightforearm');
  const hand = get('righthand');
  const tip = get('righthandmiddle1') ?? get('righthandindex1');
  if (!upper || !fore || !hand || !tip) return null;
  return { upper, fore, hand, tip };
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qw = new THREE.Quaternion();
const _qp = new THREE.Quaternion();
const _want = new THREE.Vector3();

/** Turn `bone` so the line from it to `child` points along `dir` (world), by weight w. */
function aim(bone: THREE.Bone, child: THREE.Object3D, dir: THREE.Vector3, w: number) {
  if (!bone.parent) return;
  bone.getWorldPosition(_a);
  child.getWorldPosition(_b);
  _b.sub(_a);
  if (_b.lengthSq() < 1e-12) return;
  _b.normalize();
  _q.setFromUnitVectors(_b, _want.copy(dir).normalize());
  bone.getWorldQuaternion(_qw).premultiply(_q);
  bone.parent.getWorldQuaternion(_qp).invert();
  _qw.premultiply(_qp);
  bone.quaternion.slerp(_qw, w);
  bone.updateMatrixWorld(true);
}

const _f = new THREE.Vector3();
const _r = new THREE.Vector3();
const _d = new THREE.Vector3();

/** Salute, `w` from 0 (arms as the clip has them) to 1 (hand at the brim). */
export function salute(arm: Arm, root: THREE.Object3D, heading: number, w: number) {
  if (w <= 0.001) return;
  root.updateMatrixWorld(true);
  _f.set(Math.sin(heading), 0, Math.cos(heading));
  // A soldier facing +f has his right hand on f × up.
  _r.set(-_f.z, 0, _f.x);
  _d.set(0, 0, 0).addScaledVector(_r, 0.78).addScaledVector(_f, 0.5).add(_a.set(0, 0.12, 0));
  aim(arm.upper, arm.fore, _d, w);
  _d.set(0, 0, 0).addScaledVector(_r, -0.62).addScaledVector(_f, 0.2).add(_a.set(0, 0.76, 0));
  aim(arm.fore, arm.hand, _d, w);
  _d.set(0, 0, 0).addScaledVector(_r, -0.8).addScaledVector(_f, 0.12).add(_a.set(0, 0.3, 0));
  aim(arm.hand, arm.tip, _d, w);
}
