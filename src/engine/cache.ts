/**
 * Counts and refcounts resources that drei's useGLTF already caches via
 * suspend-react. THREE.Cache stays disabled so file bytes are not stored a
 * second time beside the parsed GLTF.
 *
 * disposeIfUnshared refuses anything that is not a blob: URL, anything pinned,
 * and anything still retained. Room models are pinned and are not blob URLs.
 */

export interface CacheSnapshot {
  hits: number;
  misses: number;
  pins: number;
  retained: number;
}

type Lookup = (url: string) => unknown;
type Drop = (url: string) => void;
type Disposer = (value: unknown) => void;

let lookup: Lookup = () => undefined;
let drop: Drop = () => {};
let disposeValue: Disposer = () => {};
const pins = new Set<string>();
const refs = new Map<string, number>();
const noted = new Set<string>();
let hits = 0;
let misses = 0;

export function attachResourceCache(impl: { lookup: Lookup; drop: Drop; dispose: Disposer }) {
  lookup = impl.lookup;
  drop = impl.drop;
  disposeValue = impl.dispose;
}

export function pinAsset(url: string) {
  pins.add(url);
}

export function retain(url: string) {
  refs.set(url, (refs.get(url) ?? 0) + 1);
}

export function release(url: string) {
  const next = (refs.get(url) ?? 0) - 1;
  if (next <= 0) refs.delete(url);
  else refs.set(url, next);
}

export function refcount(url: string) {
  return refs.get(url) ?? 0;
}

/** First time a URL is asked for. Later calls do not move the counters. */
export function noteCacheLookup(url: string) {
  if (noted.has(url)) return;
  noted.add(url);
  if (lookup(url) != null) hits += 1;
  else misses += 1;
}

export function cacheSnapshot(): CacheSnapshot {
  return { hits, misses, pins: pins.size, retained: refs.size };
}

/**
 * Drops a user upload from the shared loader cache when nothing still holds it.
 * Returns false when the resource must stay.
 */
export function disposeIfUnshared(url: string): boolean {
  if (pins.has(url)) return false;
  if ((refs.get(url) ?? 0) > 0) return false;
  if (!url.startsWith('blob:')) return false;
  const value = lookup(url);
  if (value != null) disposeValue(value);
  drop(url);
  return true;
}

export function resetCacheForTests() {
  pins.clear();
  refs.clear();
  noted.clear();
  hits = 0;
  misses = 0;
  lookup = () => undefined;
  drop = () => {};
  disposeValue = () => {};
}
