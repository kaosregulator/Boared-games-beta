/**
 * Counts and refcounts resources that drei's useGLTF already caches via
 * suspend-react. THREE.Cache stays disabled so file bytes are not stored a
 * second time beside the parsed GLTF.
 *
 * disposeIfUnshared refuses anything that is not a blob: URL, anything pinned,
 * and anything still retained. A disposer that returns false keeps the entry,
 * which is how a leased geometry shared with a mounted clone stays alive.
 * Room models are pinned and are not blob URLs.
 */

export interface CacheSnapshot {
  hits: number;
  misses: number;
  pins: number;
  retained: number;
}

type Lookup = (url: string) => unknown;
type Drop = (url: string) => void;
/** Return false when a mounted clone still uses a shared GPU resource. */
type Disposer = (value: unknown) => boolean | void;

let lookup: Lookup = () => undefined;
let drop: Drop = () => {};
let disposeValue: Disposer = () => {};
const pins = new Set<string>();
const refs = new Map<string, number>();
const noted = new Set<string>();
/** How many mounted clones still use each geometry, material, or texture. */
const leases = new Map<object, number>();
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

/** A mounted clone is using this shared geometry, material, or texture. */
export function leaseResource(resource: object) {
  leases.set(resource, (leases.get(resource) ?? 0) + 1);
}

export function unleaseResource(resource: object) {
  const next = (leases.get(resource) ?? 0) - 1;
  if (next <= 0) leases.delete(resource);
  else leases.set(resource, next);
}

export function resourceLeased(resource: object) {
  return (leases.get(resource) ?? 0) > 0;
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
  if (value != null && disposeValue(value) === false) return false;
  drop(url);
  return true;
}

export function resetCacheForTests() {
  pins.clear();
  refs.clear();
  noted.clear();
  leases.clear();
  hits = 0;
  misses = 0;
  lookup = () => undefined;
  drop = () => {};
  disposeValue = () => {};
}
