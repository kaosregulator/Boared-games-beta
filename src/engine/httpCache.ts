interface Entry {
  expires: number;
  body: unknown;
}

const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export interface CachedGetOptions {
  ttlMs: number;
  signal?: AbortSignal;
  now?: number;
}

/**
 * Short-lived JSON GET cache. Do not use this for the radio proxy, trivia
 * generation, ROM files, or the TV archive metadata cache — those already
 * have their own rules.
 */
export async function cachedJsonGet(url: string, opts: CachedGetOptions): Promise<unknown> {
  const now = opts.now ?? Date.now();
  const hit = store.get(url);
  if (hit && hit.expires > now) return hit.body;
  const pending = inflight.get(url);
  if (pending) return pending;
  const run = fetch(url, { signal: opts.signal, headers: { accept: 'application/json' } })
    .then(async res => {
      if (!res.ok) throw new Error(`GET ${res.status}`);
      const body: unknown = await res.json();
      store.set(url, { expires: (opts.now ?? Date.now()) + opts.ttlMs, body });
      return body;
    })
    .finally(() => {
      inflight.delete(url);
    });
  inflight.set(url, run);
  return run;
}

export function resetHttpCacheForTests() {
  store.clear();
  inflight.clear();
}
