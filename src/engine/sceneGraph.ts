import * as THREE from 'three';

/**
 * Tells the room's per-frame systems when the scene graph actually changed,
 * so they don't have to walk the whole scene every frame to find out.
 *
 * FirstDrawGate and LightBudget used to traverse every object before every
 * frame just to notice the rare frame where something mounted. Here three's
 * own `add` / `remove` are wrapped once: an add or remove anywhere under a
 * tracked scene bumps that scene's version, and (while someone is collecting)
 * remembers the object that was added, so only that new subtree is looked at.
 *
 * Work outside a tracked scene (a GLTF being parsed, a clone being built
 * before it's placed) costs one short walk up its parents and nothing else.
 */

interface Track {
  version: number;
  /** Objects added since the last takeAdded(), while `collectors` > 0. */
  added: THREE.Object3D[];
  collectors: number;
  /** More was added than is worth listing (a whole room mounting at once): look at everything once. */
  overflow: boolean;
}

/** Past this many adds between two frames, a full look is cheaper than the list. */
const MAX_LISTED = 4000;

const tracks = new WeakMap<THREE.Object3D, Track>();
let tracked = 0;

function rootOf(obj: THREE.Object3D) {
  let root = obj;
  while (root.parent) root = root.parent;
  return root;
}

function install() {
  const proto = THREE.Object3D.prototype as THREE.Object3D & { __graphWatch?: boolean };
  if (proto.__graphWatch) return;
  proto.__graphWatch = true;
  const add = proto.add;
  const remove = proto.remove;
  proto.add = function (this: THREE.Object3D, ...objects: THREE.Object3D[]) {
    const out = add.apply(this, objects);
    // three calls add once per object when given several, so one object is the case to count.
    if (tracked > 0 && objects.length === 1) {
      const t = tracks.get(rootOf(this));
      if (t) {
        t.version += 1;
        const obj = objects[0];
        if (t.collectors > 0 && obj.parent === this) {
          if (t.added.length < MAX_LISTED) t.added.push(obj);
          else t.overflow = true;
        }
      }
    }
    return out;
  } as typeof proto.add;
  proto.remove = function (this: THREE.Object3D, ...objects: THREE.Object3D[]) {
    const t = tracked > 0 ? tracks.get(rootOf(this)) : undefined;
    const out = remove.apply(this, objects);
    if (t) t.version += 1;
    return out;
  } as typeof proto.remove;
}

function trackFor(scene: THREE.Object3D): Track {
  let t = tracks.get(scene);
  if (!t) {
    install();
    t = { version: 0, added: [], collectors: 0, overflow: false };
    tracks.set(scene, t);
    tracked += 1;
  }
  return t;
}

/** Changes whenever something is added to or removed from anywhere under `scene`. */
export function sceneVersion(scene: THREE.Object3D): number {
  return trackFor(scene).version;
}

/**
 * Start remembering what gets added under `scene`. Returns the stop function.
 * Collected objects are handed out (and forgotten) by takeAdded().
 */
export function collectAdds(scene: THREE.Object3D): () => void {
  const t = trackFor(scene);
  t.collectors += 1;
  return () => {
    t.collectors = Math.max(0, t.collectors - 1);
    if (t.collectors === 0) {
      t.added.length = 0;
      t.overflow = false;
    }
  };
}

const NONE: THREE.Object3D[] = [];

/**
 * What was added under `scene` since the last call (each new subtree's root;
 * some may since have been removed again). `null` means too much changed to
 * list and the caller should look at the whole scene once.
 */
export function takeAdded(scene: THREE.Object3D): THREE.Object3D[] | null {
  const t = tracks.get(scene);
  if (!t) return NONE;
  if (t.overflow) {
    t.overflow = false;
    t.added.length = 0;
    return null;
  }
  if (!t.added.length) return NONE;
  const out = t.added;
  t.added = [];
  return out;
}

/** Whether `obj` is still somewhere under `scene`. */
export function isUnder(obj: THREE.Object3D, scene: THREE.Object3D) {
  return rootOf(obj) === scene;
}
