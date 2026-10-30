import { log as defaultLog } from '../logCore.mjs';

/**
 * Internet Archive metadata lookups, done once for every visitor.
 *
 * The TV, radio and trivia clips ask which file of an archive.org item to
 * stream. Browsers used to ask archive.org themselves, each with its own cache;
 * now they ask GET /api/archive/<id> and the server asks archive.org, as the
 * Archive asks of API clients:
 *  - a descriptive User-Agent (a browser is not allowed to set one);
 *  - one cache shared by every visitor (6 h per item, 10 min for a missing one);
 *  - one request queue: at most 2 lookups at a time, spaced out;
 *  - 429 / 503 pause the whole queue for Retry-After;
 *  - failures retry with exponential backoff and jitter;
 *  - while archive.org is down, an item already looked up keeps its old answer.
 *
 * Only the media files are sent on, so the browser gets a few KB, not the
 * whole item record.
 */

export const USER_AGENT = 'BoaredGamesRoom/1.0 (+https://boared-games-beta-production.up.railway.app)';
const MEDIA = /\.(mp4|ogv|webm|mp3|ogg|m4a|wav)$/i;
/** archive.org identifiers: letters, digits, dot, dash, underscore. */
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

export class ArchiveUnavailable extends Error {
  constructor(message, retryAfterMs = 0) {
    super(message);
    this.retryAfterMs = retryAfterMs;
  }
}

/** Retry-After is seconds or an HTTP date. */
export function parseRetryAfter(raw, now = Date.now()) {
  if (!raw) return 0;
  const secs = Number(raw);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const at = Date.parse(raw);
  return Number.isFinite(at) ? Math.max(0, at - now) : 0;
}

export function createArchiveMeta({
  fetchImpl = globalThis.fetch,
  userAgent = USER_AGENT,
  concurrency = 2,
  spacingMs = 250,
  timeoutMs = 10_000,
  maxAttempts = 4,
  baseDelayMs = 1_000,
  maxDelayMs = 30_000,
  /** A visitor won't wait longer than this for a Retry-After; they get a 503 instead. */
  maxWaitMs = 20_000,
  /** Give up on one lookup after this long, so the browser (30 s) hears back first. */
  deadlineMs = 25_000,
  ttlMs = 6 * 60 * 60 * 1000,
  missTtlMs = 10 * 60 * 1000,
  staleGraceMs = 5 * 60 * 1000,
  maxEntries = 2_000,
  maxQueue = 200,
  random = Math.random,
  log = defaultLog,
} = {}) {
  /** id -> { files, missing, expires } */
  const cache = new Map();
  /** id -> promise, so many visitors asking at once share one lookup */
  const inflight = new Map();
  const waiting = [];
  let active = 0;
  let lastStart = 0;
  let pausedUntil = 0;
  let timer = null;
  const stats = { lookups: 0, hits: 0, shared: 0, upstream: 0, rateLimited: 0, retries: 0, stale: 0, failures: 0 };

  // ---- the shared queue ----------------------------------------------------

  /** Run task in the shared queue; give up if it hasn't started by expiresAt. */
  function enqueue(task, expiresAt = Infinity) {
    return new Promise((resolve, reject) => {
      if (waiting.length >= maxQueue) {
        reject(new ArchiveUnavailable('archive lookup queue is full', 5_000));
        return;
      }
      const job = { task, resolve, reject, expiry: null };
      if (Number.isFinite(expiresAt)) {
        // Its visitor gives up at the deadline: drop it then, even while every
        // slot is still busy, rather than spend a request on it later.
        job.expiry = setTimeout(() => {
          const at = waiting.indexOf(job);
          if (at === -1) return;
          waiting.splice(at, 1);
          reject(new ArchiveUnavailable('archive lookup waited too long in the queue', 5_000));
        }, Math.max(0, expiresAt - Date.now()));
      }
      waiting.push(job);
      pump();
    });
  }

  function pump() {
    // A long pause: tell everyone waiting to come back later instead of
    // holding them past the browser's timeout.
    const paused = pausedUntil - Date.now();
    if (paused > maxWaitMs) {
      for (const job of waiting.splice(0)) {
        clearTimeout(job.expiry);
        job.reject(new ArchiveUnavailable('archive.org asked us to wait', paused));
      }
      return;
    }
    if (timer) return;
    while (active < concurrency && waiting.length) {
      const wait = Math.max(pausedUntil, lastStart + spacingMs) - Date.now();
      if (wait > 0) {
        timer = setTimeout(() => {
          timer = null;
          pump();
        }, wait);
        return;
      }
      const job = waiting.shift();
      clearTimeout(job.expiry);
      active++;
      lastStart = Date.now();
      Promise.resolve()
        .then(job.task)
        .then(job.resolve, job.reject)
        .finally(() => {
          active--;
          pump();
        });
    }
  }

  // ---- one request ---------------------------------------------------------

  async function request(id) {
    stats.upstream++;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`https://archive.org/metadata/${encodeURIComponent(id)}`, {
        headers: { 'User-Agent': userAgent, Accept: 'application/json' },
        signal: ctrl.signal,
      });
      const retryAfterMs = parseRetryAfter(res.headers.get('retry-after'));
      if (!res.ok) return { status: res.status, retryAfterMs };
      return { status: res.status, retryAfterMs, body: await res.json() };
    } finally {
      clearTimeout(t);
    }
  }

  function backoff(attempt) {
    const ceiling = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
    return Math.round(ceiling / 2 + random() * (ceiling / 2));
  }

  /** The item's media files, [] when it has none, or ArchiveUnavailable. */
  async function fetchFiles(id) {
    const started = Date.now();
    let lastError = 'archive.org did not answer';
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let res = null;
      try {
        res = await enqueue(() => request(id), started + deadlineMs);
      } catch (err) {
        if (err instanceof ArchiveUnavailable) throw err;
        lastError = err?.name === 'AbortError' ? 'archive.org timed out' : 'archive.org could not be reached';
      }
      if (res && res.status >= 200 && res.status < 300) {
        const list = res.body?.files ?? res.body?.result ?? [];
        return (Array.isArray(list) ? list : [])
          .filter(f => f && typeof f.name === 'string' && MEDIA.test(f.name))
          .map(({ name, format, length, source }) => ({ name, format, length, source }));
      }
      // Any other 4xx means the item is gone or private: asking again won't help.
      if (res && res.status >= 400 && res.status < 500 && res.status !== 429 && res.status !== 408) return [];

      let delay = backoff(attempt);
      if (res) {
        lastError = `archive.org answered ${res.status}`;
        if (res.status === 429 || res.status === 503) {
          stats.rateLimited++;
          // Hold every lookup, not just this one: the limit is for the whole server.
          const hold = res.retryAfterMs || delay;
          pausedUntil = Math.max(pausedUntil, Date.now() + hold);
          delay = Math.max(delay, hold);
          log('warn', 'archive.org rate limited', { source: 'archive', item: id, status: res.status, retryAfterMs: res.retryAfterMs, attempt });
          if (hold > maxWaitMs) throw new ArchiveUnavailable(lastError, hold);
        }
      }
      if (attempt === maxAttempts - 1 || Date.now() - started + delay + timeoutMs > deadlineMs) break;
      stats.retries++;
      await new Promise(r => setTimeout(r, delay));
    }
    throw new ArchiveUnavailable(lastError, Math.max(0, pausedUntil - Date.now()) || baseDelayMs * 5);
  }

  // ---- the cache -----------------------------------------------------------

  function remember(id, entry) {
    cache.delete(id);
    cache.set(id, entry);
    while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
  }

  /**
   * { files, missing } for an archive.org item, from the shared cache when
   * it can. Throws ArchiveUnavailable when archive.org can't be reached and
   * nothing is cached.
   */
  function lookup(id) {
    stats.lookups++;
    const hit = cache.get(id);
    if (hit && hit.expires > Date.now()) {
      stats.hits++;
      remember(id, hit);
      return Promise.resolve({ files: hit.files, missing: hit.missing });
    }
    const pending = inflight.get(id);
    if (pending) {
      stats.shared++;
      return pending;
    }
    const job = fetchFiles(id)
      .then(files => {
        const missing = files.length === 0;
        remember(id, { files, missing, expires: Date.now() + (missing ? missTtlMs : ttlMs) });
        return { files, missing };
      })
      .catch(err => {
        stats.failures++;
        if (hit) {
          // Keep the old answer a little longer rather than ask again at once.
          stats.stale++;
          remember(id, { ...hit, expires: Date.now() + staleGraceMs });
          return { files: hit.files, missing: hit.missing };
        }
        log('warn', 'archive.org lookup failed', { source: 'archive', item: id, detail: err?.message });
        throw err;
      })
      .finally(() => inflight.delete(id));
    inflight.set(id, job);
    return job;
  }

  /** GET /api/archive/<id>: send(status, body, headers). */
  async function handle(id, send) {
    if (typeof id !== 'string' || !ID.test(id)) {
      send(400, { error: 'Not an archive.org identifier' }, { 'Cache-Control': 'no-store' });
      return;
    }
    try {
      const { files, missing } = await lookup(id);
      if (missing) send(404, { error: 'No playable files', id }, { 'Cache-Control': 'public, max-age=600' });
      else send(200, { id, files }, { 'Cache-Control': 'public, max-age=3600' });
    } catch (err) {
      const secs = Math.max(1, Math.ceil((err?.retryAfterMs || 5_000) / 1000));
      send(503, { error: 'archive.org is busy, try again soon' }, { 'Cache-Control': 'no-store', 'Retry-After': String(secs) });
    }
  }

  function status() {
    return {
      cached: cache.size,
      inflight: inflight.size,
      queued: waiting.length,
      active,
      pausedForMs: Math.max(0, pausedUntil - Date.now()),
      ...stats,
    };
  }

  return { lookup, handle, status };
}

/** The one instance the server (and the Vite dev server) shares. */
export const archiveMeta = createArchiveMeta();
