import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { FurbyBrain } from './furbyBrain';

/**
 * The room's Furbies, shared between the bed, your hands and the card
 * table. There's one grey 1998 Furby (it lives on the bed, comes with you
 * when you pick it up, and has a boxed twin for the table) and the dancing
 * Furby Boom that only comes out on the table.
 */

export type HeldFrom = 'bed' | 'table';

interface FurbyState {
  /** Where the Furby in your hands came from, or null if nothing is held. */
  held: HeldFrom | null;
  /** World pose it was picked up from, to fly it into your hands and back. */
  from: { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: number } | null;
}

/** Things your hands can do to the Furby you're holding. */
export type Gesture = 'pet' | 'tickle' | 'feed' | 'hug' | 'flip' | 'shake' | 'sing' | 'bedtime' | 'putdown';

const gestureSubs = new Set<(g: Gesture) => void>();
/** The table button asked for a put-down. The hands take it on their next frame, even if the click landed before they were listening. */
let release = false;

/** From the HUD's buttons and keys to the hands in the scene. */
export function furbyGesture(g: Gesture) {
  gestureSubs.forEach(fn => fn(g));
}

/** Put the Furby down so the new ones can come out at the table. */
export function requestFurbyPutdown() {
  release = true;
  furbyGesture('putdown');
}

export function furbyReleasePending() {
  return release;
}

export function clearFurbyRelease() {
  release = false;
}
export function onFurbyGesture(fn: (g: Gesture) => void) {
  gestureSubs.add(fn);
  return () => {
    gestureSubs.delete(fn);
  };
}

let state: FurbyState = { held: null, from: null };
const subs = new Set<(s: FurbyState) => void>();

export function getFurby() {
  return state;
}

export function setFurby(patch: Partial<FurbyState>) {
  state = { ...state, ...patch };
  subs.forEach(fn => fn(state));
}

export function useFurby() {
  const [s, set] = useState(state);
  useEffect(() => {
    subs.add(set);
    set(state);
    return () => {
      subs.delete(set);
    };
  }, []);
  return s;
}

/** The bed Furby's brain: the same toy you pick up, so it remembers being fed. */
export const bedBrain = new FurbyBrain('Furby');
/** The boxed one on the table: a new toy, a little higher-pitched. */
export const tableBrain = new FurbyBrain('New Furby', { pitch: 1.06 });

export function brainFor(from: HeldFrom) {
  return from === 'bed' ? bedBrain : tableBrain;
}

/** Where each Furby sits in the room, so picking one up can fly it from there. */
export const furbyAnchors: Partial<Record<HeldFrom, THREE.Object3D>> = {};

export function anchorPose(from: HeldFrom) {
  const a = furbyAnchors[from];
  if (!a) return null;
  a.updateWorldMatrix(true, false);
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  a.matrixWorld.decompose(position, quaternion, scale);
  return { position, quaternion, scale: scale.x };
}
