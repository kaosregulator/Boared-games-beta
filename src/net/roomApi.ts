/**
 * The room's connection to the player API (server/api.mjs).
 *
 * Games call reportEvent / reportScore and move on: nothing here throws or
 * blocks play. Each result gets an idempotency key when it is made, so a retry
 * after a dropped connection can't count twice. Results made while the server
 * is unreachable wait in a small queue (kept in sessionStorage so a reload
 * doesn't lose them) and are sent when it is back.
 */
export interface PlayerProfile {
  player: {
    id: string;
    kind: 'guest' | 'discord';
    displayName: string;
    avatar: string | null;
    language: string | null;
    generation: string | null;
    firstSeen: number;
    lastSeen: number;
    visits: number;
  } | null;
  awards?: { key: string; awardedAt: number; source: string }[];
  bests?: { game: string; metric: string; mode: string; value: number }[];
  stats?: { launches: number; wins: number };
}

export interface LeaderboardRow {
  rank: number;
  name: string;
  guest: boolean;
  avatar: string | null;
  value: number;
  you: boolean;
}

export interface LeaderboardPage {
  game: string;
  metric: string;
  mode: string;
  better: 'higher' | 'lower';
  unit: string | null;
  selfReported: boolean;
  total: number;
  offset: number;
  rows: LeaderboardRow[];
  you: { rank: number; value: number } | null;
}

export interface BoardIndex {
  games: { id: string; label: string; modes: string[]; metrics: { id: string; label: string; better: 'higher' | 'lower'; unit: string | null }[] }[];
}

type Pending =
  | { kind: 'event'; body: { game: string; event: string; mode?: string; idem: string } }
  | { kind: 'score'; body: { game: string; metric: string; value: number; mode?: string; idem: string; meta?: Record<string, unknown> } };

const QUEUE_KEY = 'bgr.pending-results';
const MAX_QUEUE = 50;
const awardListeners = new Set<(keys: string[]) => void>();
const profileListeners = new Set<(p: PlayerProfile) => void>();
let session: Promise<PlayerProfile | null> | null = null;
let flushing = false;

function idem(): string {
  try {
    return crypto.randomUUID().replace(/-/g, '');
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

function readQueue(): Pending[] {
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as Pending[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(q: Pending[]) {
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE)));
  } catch {
    // Storage refused (private window): the in-flight attempt still happens.
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T | null }> {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

/** Starts or resumes this browser's guest session. Safe to call often; it runs once. */
export function ensureSession(): Promise<PlayerProfile | null> {
  if (!session) {
    session = call<PlayerProfile>('POST', '/session')
      .then(r => {
        if (r.status >= 400 || !r.data) return null;
        for (const fn of profileListeners) fn(r.data);
        void flush();
        return r.data;
      })
      .catch(() => {
        session = null;
        return null;
      });
  }
  return session;
}

export async function fetchProfile(): Promise<PlayerProfile | null> {
  try {
    const r = await call<PlayerProfile>('GET', '/me');
    if (r.data) for (const fn of profileListeners) fn(r.data);
    return r.data;
  } catch {
    return null;
  }
}

async function send(p: Pending): Promise<'done' | 'retry'> {
  try {
    const r = await call<{ awarded?: string[] }>('POST', p.kind === 'event' ? '/play/event' : '/scores', p.body);
    if (r.status === 401) {
      session = null;
      await ensureSession();
      return 'retry';
    }
    if (r.status === 429 || r.status >= 500) return 'retry';
    // 400 means the game sent something the server won't take; retrying won't change that.
    const awarded = r.data?.awarded ?? [];
    if (awarded.length) for (const fn of awardListeners) fn(awarded);
    return 'done';
  } catch {
    return 'retry';
  }
}

async function flush() {
  if (flushing) return;
  flushing = true;
  try {
    let queue = readQueue();
    while (queue.length) {
      const head = queue[0];
      if ((await send(head)) === 'retry') break;
      queue = readQueue().filter(p => p.body.idem !== head.body.idem);
      writeQueue(queue);
    }
  } finally {
    flushing = false;
  }
}

function enqueue(p: Pending) {
  writeQueue([...readQueue(), p]);
  void ensureSession().then(() => flush());
}

/** A game happened: launched, won, lost, or one of its special moments. */
export function reportEvent(game: string, event: string, mode?: string) {
  enqueue({ kind: 'event', body: { game, event, ...(mode ? { mode } : {}), idem: idem() } });
}

/** A measured result. Send every finished run; the server keeps the best. */
export function reportScore(game: string, metric: string, value: number, opts: { mode?: string; meta?: Record<string, unknown> } = {}) {
  if (!Number.isFinite(value)) return;
  enqueue({ kind: 'score', body: { game, metric, value, ...(opts.mode ? { mode: opts.mode } : {}), ...(opts.meta ? { meta: opts.meta } : {}), idem: idem() } });
}

export function onAwards(fn: (keys: string[]) => void) {
  awardListeners.add(fn);
  return () => awardListeners.delete(fn);
}

export function onProfile(fn: (p: PlayerProfile) => void) {
  profileListeners.add(fn);
  return () => profileListeners.delete(fn);
}

export async function fetchBoards(): Promise<BoardIndex | null> {
  try {
    return (await call<BoardIndex>('GET', '/leaderboards')).data;
  } catch {
    return null;
  }
}

export async function fetchLeaderboard(q: { game: string; metric: string; mode?: string; limit?: number; offset?: number }): Promise<LeaderboardPage | null> {
  const params = new URLSearchParams({ game: q.game, metric: q.metric, mode: q.mode ?? '', limit: String(q.limit ?? 20), offset: String(q.offset ?? 0) });
  try {
    const r = await call<LeaderboardPage>('GET', `/leaderboard?${params}`);
    return r.status === 200 ? r.data : null;
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flush());
}
