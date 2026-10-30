/**
 * The room's download line. Every 3D model the page fetches (three's loaders
 * all go through fetch) waits its turn here instead of all ~40 starting at
 * once, so:
 *
 *  - the title song gets the connection to itself first. With everything at
 *    once it sat behind ~90 MB of models and only started after the room had
 *    loaded, which on a cleared cache meant never before you pressed Play;
 *  - models arrive whole, one after another (room furniture first), so the
 *    loading bar means something and a refresh mid-load keeps every file that
 *    already finished in the browser cache instead of throwing away 40 halves;
 *  - a dropped connection or a Railway restart (502/503/504) is retried
 *    instead of leaving a hole in the room;
 *  - each file is asked for by its content hash (`?v=` from
 *    /asset-manifest.json, written by scripts/precompress.mjs). The server
 *    keeps hashed copies for a year, so a repeat visit downloads nothing and
 *    a file changed in a deploy is a new URL, never a stale copy. A file
 *    already in the browser cache under its hash skips the line altogether.
 *
 * Installed as the first import of main.tsx, before any module asks for a
 * model. Anything that isn't a same-origin model download passes straight
 * through.
 */

const HEAVY = /\.(glb|gltf|bin|ktx2)$/i;
/** Files downloading at once: enough to fill the pipe, few enough to finish in order (and the most a browser opens to one host over HTTP/1.1). */
const PARALLEL = 6;
/** The title song gets this long on its own before the room starts downloading anyway. */
const SONG_HEAD_START_MS = 6000;
const RETRIES = 3;

interface Manifest {
  [path: string]: { h: string; s: number };
}

interface Waiting {
  path: string;
  priority: number;
  order: number;
  start: () => void;
}

export interface NetProgress {
  /** Model files asked for so far, and how many are in. */
  files: number;
  done: number;
  /** Gave up on (after retries), not counting downloads the page itself called off. */
  failed: number;
  /** Bytes in, and the bytes expected (from the manifest; 0 when it isn't there). */
  loaded: number;
  total: number;
  /** Nothing queued or downloading. */
  idle: boolean;
  /** The line is open (the title song had its head start). */
  open: boolean;
}

const waiting: Waiting[] = [];
let running = 0;
/** Asked for, still looking in the browser cache. */
let checking = 0;
let order = 0;
let open = false;
let manifest: Manifest | null = null;
let manifestReady: Promise<void> | null = null;
const expected = new Map<string, number>();
const got = new Map<string, number>();
let files = 0;
let done = 0;
let failed = 0;
/** Called off by the page (a loader aborted it): not a failure. */
let cancelled = 0;
let snapshot: NetProgress = { files: 0, done: 0, failed: 0, loaded: 0, total: 0, idle: true, open: false };
const listeners = new Set<() => void>();
let notifyQueued = false;

function publish() {
  if (notifyQueued) return;
  notifyQueued = true;
  // Progress ticks on every chunk; tell React at most once a frame.
  const flush = () => {
    notifyQueued = false;
    let loaded = 0;
    let total = 0;
    for (const [path, size] of expected) {
      total += size;
      loaded += Math.min(size, got.get(path) ?? 0);
    }
    snapshot = { files, done, failed, loaded, total, idle: running === 0 && waiting.length === 0 && checking === 0, open };
    for (const fn of listeners) fn();
  };
  if (typeof requestAnimationFrame === 'function' && typeof document !== 'undefined' && !document.hidden) requestAnimationFrame(flush);
  else setTimeout(flush, 50);
}

export function netProgress(): NetProgress {
  return snapshot;
}

export function onNetProgress(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Room furniture first, then the toys and games the room starts with. */
function priorityOf(path: string) {
  return path.startsWith('/models/') ? 0 : 1;
}

function pump() {
  if (!open) return;
  while (running < PARALLEL && waiting.length) {
    waiting.sort((a, b) => a.priority - b.priority || a.order - b.order);
    const next = waiting.shift()!;
    running += 1;
    next.start();
  }
  publish();
}

/** Let the models start downloading. Called once the title song can play, or on a timer. */
export function openNetQueue() {
  if (open) return;
  open = true;
  pump();
}

let headStarts = 0;
/** This much of a head-start file in, and the models may start: the rest streams in beside them. */
const HEAD_START_BYTES = 1_500_000;

/**
 * Download `url` before any model (the title song) into the browser cache,
 * where the <audio> element picks it up, then open the line: once its first
 * HEAD_START_BYTES are in (about a minute of the song), so the room isn't
 * kept waiting for the whole file. The line opens anyway after
 * SONG_HEAD_START_MS.
 */
export function headStart(url: string) {
  if (open || typeof window === 'undefined') return;
  headStarts += 1;
  let counted = false;
  const release = () => {
    if (counted) return;
    counted = true;
    headStarts -= 1;
    if (headStarts === 0) openNetQueue();
  };
  const native = (window as unknown as { __netNative?: typeof fetch }).__netNative ?? window.fetch.bind(window);
  void native(url)
    .then(async res => {
      const reader = res.body?.getReader();
      if (!reader) return;
      let seen = 0;
      for (;;) {
        const { done: end, value } = await reader.read();
        if (end) break;
        seen += value.byteLength;
        if (seen >= HEAD_START_BYTES) release();
      }
    })
    .catch(() => undefined)
    .finally(release);
}

function loadManifest(fetcher: typeof fetch) {
  if (!manifestReady) {
    manifestReady = fetcher('/asset-manifest.json', { cache: 'no-cache' })
      .then(res => (res.ok ? (res.json() as Promise<Manifest>) : null))
      .then(body => {
        manifest = body && typeof body === 'object' ? body : null;
      })
      .catch(() => {
        manifest = null;
      });
  }
  return manifestReady;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const retryable = (status: number) => status === 502 || status === 503 || status === 504;

/** Counts the bytes of a response body as they arrive. */
function counted(res: Response, path: string): Response {
  if (!res.body || typeof TransformStream === 'undefined') return res;
  let seen = 0;
  const body = res.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctl) {
        seen += chunk.byteLength;
        got.set(path, seen);
        publish();
        ctl.enqueue(chunk);
      },
    }),
  );
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

export function installNetQueue() {
  if (typeof window === 'undefined' || (window as unknown as { __netQueue?: boolean }).__netQueue) return;
  (window as unknown as { __netQueue?: boolean }).__netQueue = true;
  const native = window.fetch.bind(window);
  (window as unknown as { __netNative?: typeof fetch }).__netNative = native;
  window.setTimeout(openNetQueue, SONG_HEAD_START_MS);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    const url = new URL(req.url, location.href);
    if (req.method !== 'GET' || url.origin !== location.origin || !HEAVY.test(url.pathname) || url.searchParams.has('v')) {
      return native(input, init);
    }
    const path = decodeURIComponent(url.pathname);
    const signal = req.signal;
    const abortedErr = () => new DOMException('Aborted', 'AbortError');
    files += 1;
    checking += 1;
    publish();
    return (async () => {
      await loadManifest(native);
      const entry = manifest?.[path];
      if (entry) {
        url.searchParams.set('v', entry.h);
        // Its size goes into the bar as soon as it's asked for, so the bar never runs backwards.
        if (!expected.has(path)) expected.set(path, entry.s);
        // Already in the browser cache under this hash: no network, so no waiting in line.
        try {
          const hit = await native(new Request(url.href, { cache: 'only-if-cached', mode: 'same-origin', signal }));
          if (hit.ok) {
            checking -= 1;
            done += 1;
            got.set(path, entry.s);
            publish();
            return hit;
          }
        } catch {
          // Not cached (or a browser without only-if-cached): download it.
        }
      }
      checking -= 1;
      if (signal.aborted) {
        cancelled += 1;
        publish();
        throw abortedErr();
      }
      return new Promise<Response>((resolve, reject) => {
        let finished = false;
        const settle = (ok: boolean) => {
          if (finished) return;
          finished = true;
          running -= 1;
          if (ok) done += 1;
          else if (signal.aborted) cancelled += 1;
          else failed += 1;
          pump();
        };
        const item: Waiting = {
          path,
          priority: priorityOf(path),
          order: order++,
          start: () => {
            void (async () => {
              try {
                let res: Response | null = null;
                for (let attempt = 0; ; attempt += 1) {
                  if (signal.aborted) throw abortedErr();
                  try {
                    res = await native(new Request(url.href, req));
                    if (!retryable(res.status) || attempt >= RETRIES) break;
                  } catch (err) {
                    if (signal.aborted || (err instanceof DOMException && err.name === 'AbortError') || attempt >= RETRIES) throw err;
                  }
                  await sleep(1000 * 2 ** attempt);
                }
                if (!res.ok) {
                  settle(false);
                  resolve(res);
                  return;
                }
                // Done counts once the body is all in, not when the headers land.
                const tracked = counted(res, path);
                const [forLoader, forCount] = tracked.body ? tracked.body.tee() : [null, null];
                if (forCount) {
                  const reader = forCount.getReader();
                  void (async () => {
                    try {
                      for (;;) if ((await reader.read()).done) break;
                      if (!expected.has(path)) expected.set(path, got.get(path) ?? 0);
                      settle(true);
                    } catch {
                      settle(false);
                    }
                  })();
                } else settle(true);
                resolve(forLoader ? new Response(forLoader, { status: res.status, statusText: res.statusText, headers: res.headers }) : tracked);
              } catch (err) {
                settle(false);
                reject(err);
              }
            })();
          },
        };
        signal.addEventListener(
          'abort',
          () => {
            const i = waiting.indexOf(item);
            if (i < 0) return;
            waiting.splice(i, 1);
            cancelled += 1;
            publish();
            reject(abortedErr());
          },
          { once: true },
        );
        waiting.push(item);
        pump();
      });
    })();
  };
}

installNetQueue();
