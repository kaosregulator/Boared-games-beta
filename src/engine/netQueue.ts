/**
 * The room's download line. Every 3D model the page fetches (three's loaders
 * all go through fetch) waits its turn here instead of all ~40 starting at
 * once, so:
 *
 *  - the title video and the title song start on their own elements. Models
 *    wait until that first paint has asked for them, then download at a low
 *    priority so they don't sit in front of the picture or the song. They do
 *    not wait for the song file to finish;
 *  - models arrive whole, a few at a time (room furniture first), so the
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
/**
 * If nothing opens the line (no title screen), models start this soon anyway.
 * The title screen opens it on the next turn, after the video element exists.
 */
const QUEUE_FALLBACK_MS = 400;
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
let lastNotify = 0;

function publish() {
  if (notifyQueued) return;
  notifyQueued = true;
  // Progress ticks on every chunk. Tell React a few times a second, not once
  // a frame: a subscriber re-rendering the title screen that often stalls the
  // video decoder on the same thread.
  const flush = () => {
    notifyQueued = false;
    lastNotify = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let loaded = 0;
    let total = 0;
    for (const [path, size] of expected) {
      total += size;
      loaded += Math.min(size, got.get(path) ?? 0);
    }
    snapshot = { files, done, failed, loaded, total, idle: running === 0 && waiting.length === 0 && checking === 0, open };
    for (const fn of listeners) fn();
  };
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const wait = Math.max(0, 100 - (now - lastNotify));
  if (typeof requestAnimationFrame === 'function' && typeof document !== 'undefined' && !document.hidden) {
    setTimeout(() => requestAnimationFrame(flush), wait);
  } else setTimeout(flush, Math.max(50, wait));
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

const openWaiters: (() => void)[] = [];

/** Let the models start downloading. The title screen calls this once its video element is in the page. */
export function openNetQueue() {
  if (open) return;
  open = true;
  const pending = openWaiters.splice(0);
  for (const fn of pending) fn();
  pump();
}

function untilOpen(signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  if (open) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const go = () => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    };
    const onAbort = () => {
      const i = openWaiters.indexOf(go);
      if (i >= 0) openWaiters.splice(i, 1);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    openWaiters.push(go);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * The title song used to be downloaded here, whole, and the room waited until
 * the first 1.5 MB had been thrown away. That second copy of the song fought
 * the title video, and the audio element then downloaded it again. The song
 * now plays from its own element, which can start on the first bytes. This
 * only opens the model line, on the next turn, so the video's request is
 * already in.
 */
export function headStart(_url: string) {
  if (open || typeof window === 'undefined') return;
  window.setTimeout(openNetQueue, 0);
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

/**
 * Counts the bytes of a response body as they arrive, and says when the
 * loader has read them all. One stream: splitting the body in two (`tee`)
 * buffered a second copy of every model while the loader caught up, and that
 * showed up as a hitch while you walked.
 */
function counted(res: Response, path: string, onDone: (ok: boolean) => void): Response {
  if (!res.body || typeof TransformStream === 'undefined') {
    onDone(true);
    return res;
  }
  let settled = false;
  const finish = (ok: boolean) => {
    if (settled) return;
    settled = true;
    if (!expected.has(path)) expected.set(path, got.get(path) ?? 0);
    onDone(ok);
  };
  let seen = 0;
  const decoded = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctl) {
      seen += chunk.byteLength;
      got.set(path, seen);
      publish();
      ctl.enqueue(chunk);
    },
    flush() {
      finish(true);
    },
  });
  void res.body.pipeTo(decoded.writable).catch(() => finish(false));
  return new Response(decoded.readable, { status: res.status, statusText: res.statusText, headers: res.headers });
}

export function installNetQueue() {
  if (typeof window === 'undefined' || (window as unknown as { __netQueue?: boolean }).__netQueue) return;
  (window as unknown as { __netQueue?: boolean }).__netQueue = true;
  const native = window.fetch.bind(window);
  (window as unknown as { __netNative?: typeof fetch }).__netNative = native;
  window.setTimeout(openNetQueue, QUEUE_FALLBACK_MS);

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
      // No network at all until the title video has had a chance to start.
      // A cache probe per file used to fire here, dozens at once, ahead of the video.
      try {
        await untilOpen(signal);
      } catch (err) {
        checking -= 1;
        cancelled += 1;
        publish();
        throw err;
      }
      await loadManifest(native);
      const entry = manifest?.[path];
      if (entry) {
        url.searchParams.set('v', entry.h);
        // Its size goes into the bar as soon as it's asked for, so the bar never runs backwards.
        if (!expected.has(path)) expected.set(path, entry.s);
        // In the browser cache under this hash: no network, and no slot in the line.
        // This runs only after the title video has started, so a cold visit's misses
        // don't land ahead of the picture.
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
                    // Low priority: the title video and the song keep the fast lane.
                    res = await native(new Request(url.href, req), { priority: 'low' });
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
                // Done counts once the loader has read the body, not when the headers land.
                resolve(counted(res, path, settle));
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
