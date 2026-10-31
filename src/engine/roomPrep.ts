/**
 * The steps between "the file is here" and "the room can draw it without a
 * hitch", for the loading bar. The download line (netQueue.ts) knows when a
 * model's bytes are in. After that the model still has to be parsed (GLTF,
 * KTX2 transcoding, image decode), placed in the scene, have its shaders
 * compiled and its textures sent to the GPU. Before this, "Room ready" meant
 * only the downloads: on a fast or cached load you could step in while the
 * last models were still parsing and compiling, and the first frames in the
 * room did that work on the spot.
 *
 *  - parsing: GLTF loads started but not finished (gltfCache.ts counts them);
 *  - warming: SceneWarmup is compiling / uploading, or has seen new materials
 *    it hasn't warmed yet;
 *  - a scan after the last model finished found nothing new: placed and warm.
 *
 * Nothing here holds GPU memory or loads anything; it only reports.
 */

interface PrepState {
  /** GLTF loads (fetch + parse) in flight. */
  parsing: number;
  /** When the last one finished. */
  lastParsedAt: number;
  /** SceneWarmup instances running (0: no warm-up to wait for, e.g. a page without the room). */
  warmers: number;
  /** A warm-up is compiling or uploading right now. */
  warming: boolean;
  /** When SceneWarmup last looked and found nothing new and nothing in progress. */
  quietAt: number;
}

const state: PrepState = { parsing: 0, lastParsedAt: 0, warmers: 0, warming: false, quietAt: 0 };
const listeners = new Set<() => void>();

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * React needs a moment after a parse finishes to place the model in the
 * scene (Suspense resolves, the clone mounts). A quiet scan must come at
 * least this long after the last parse to count.
 */
const MOUNT_GRACE_MS = 250;

function emit() {
  for (const fn of listeners) fn();
}

export function onRoomPrep(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function noteParseStart() {
  state.parsing += 1;
  emit();
}

export function noteParseEnd() {
  state.parsing = Math.max(0, state.parsing - 1);
  state.lastParsedAt = now();
  emit();
}

export function noteWarmerMounted() {
  state.warmers += 1;
  return () => {
    state.warmers = Math.max(0, state.warmers - 1);
    emit();
  };
}

export function noteWarming(on: boolean) {
  if (state.warming === on) return;
  state.warming = on;
  emit();
}

/** SceneWarmup looked: nothing new to compile and nothing in progress. */
export function noteQuietScan() {
  if (state.warming) return;
  const was = roomPrepared();
  state.quietAt = now();
  if (!was && roomPrepared()) emit();
}

/** Every model asked for so far is parsed, placed, compiled and uploaded (or there is no warm-up to wait for). */
export function roomPrepared(): boolean {
  if (state.parsing > 0) return false;
  if (state.warmers === 0) return true;
  return !state.warming && state.quietAt > 0 && state.quietAt >= state.lastParsedAt + MOUNT_GRACE_MS;
}

export function resetRoomPrepForTests() {
  state.parsing = 0;
  state.lastParsedAt = 0;
  state.warmers = 0;
  state.warming = false;
  state.quietAt = 0;
  listeners.clear();
}
