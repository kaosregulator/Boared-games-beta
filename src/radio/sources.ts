import { resolveArchive } from '../tv/archive';
import { streamUrls, type Station } from './stations';

/**
 * Where a station's sound can come from, best first. The dial never changes:
 * if a station's own stream will not play, the radio quietly plays a stand-in
 * and still shows the same call letters.
 *
 * 1. the station's own source (SomaFM's Icecast hosts, or the Internet
 *    Archive tape);
 * 2. Radio Browser (looked up by our server, which follows that API's rules):
 *    the same channel listed under another address, then the most-played
 *    English station of the same style that passed its last check;
 * 3. junguler/m3u-radio-music-playlists on GitHub, a genre list rebuilt every
 *    day, as the last resort.
 *
 * Whatever actually plays is remembered per station, so a source that keeps
 * working becomes that station's default next time.
 */

export interface Source {
  /** Stable id for the reliability record. */
  key: string;
  /** Resolved lazily: archive files and directory entries need a lookup first. */
  url: () => Promise<string | null>;
  /** Archive tapes start where they would be "live" right now. */
  seekLive?: boolean;
  /** Radio Browser station, for the click count. */
  uuid?: string;
}

/** Same-style stand-ins for each station. */
const STAND_IN: Record<string, { name?: string; tag: string; list: string }> = {
  seventies: { name: 'Left Coast 70s', tag: '70s', list: '70s' },
  u80s: { name: 'Underground 80s', tag: 'new wave', list: '80s' },
  '7soul': { name: 'Seven Inch Soul', tag: 'soul', list: 'soul' },
  poptron: { name: 'PopTron', tag: 'synthpop', list: 'pop' },
  secretagent: { name: 'Secret Agent', tag: 'lounge', list: 'lounge' },
  groovesalad: { name: 'Groove Salad', tag: 'chillout', list: 'chillout' },
  'z100-88': { tag: '80s', list: '80s' },
  'wplj-89': { tag: '80s', list: '80s' },
  'kmel-84': { tag: '80s', list: '80s' },
  'foxkids-97': { tag: '90s', list: '90s' },
  'kfrc-86': { tag: '80s', list: '80s' },
  'whtz-87': { tag: '80s', list: '80s' },
};

/* ------------------------------ reliability ------------------------------ */

interface Health {
  ok: number;
  fail: number;
  at: number;
  /** The address that worked, for directory stand-ins. */
  url?: string;
  uuid?: string;
}
type HealthBook = Record<string, Record<string, Health>>;
const BOOK_KEY = 'radio-health-v1';

function readBook(): HealthBook {
  try {
    return JSON.parse(window.localStorage.getItem(BOOK_KEY) || '{}') as HealthBook;
  } catch {
    return {};
  }
}

export function record(stationId: string, src: Source, ok: boolean, url?: string) {
  const book = readBook();
  const row = (book[stationId] ??= {});
  // a stand-in that never worked here isn't worth remembering
  if (!ok && src.key !== 'own' && !row[src.key]) return;
  const h = (row[src.key] ??= { ok: 0, fail: 0, at: 0 });
  // older results fade so a station that recovers gets its place back
  const age = (Date.now() - h.at) / (7 * 24 * 3600 * 1000);
  const keep = Math.max(0.25, 1 - age);
  h.ok = h.ok * keep + (ok ? 1 : 0);
  h.fail = h.fail * keep + (ok ? 0 : 1);
  h.at = Date.now();
  if (ok && url) h.url = url;
  if (src.uuid) h.uuid = src.uuid;
  try {
    window.localStorage.setItem(BOOK_KEY, JSON.stringify(book));
  } catch {
    // not remembered; still plays
  }
}

const score = (h?: Health) => (h ? h.ok - h.fail * 2 : 0);

/* --------------------------------- lookups --------------------------------- */

interface RbStation {
  uuid: string;
  name: string;
  url: string;
}

async function radioBrowser(params: Record<string, string>): Promise<RbStation[]> {
  try {
    const res = await fetch(`/api/radio/search?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { stations?: RbStation[] };
    return data.stations ?? [];
  } catch {
    return [];
  }
}

const PLAYLIST_BASE = 'https://raw.githubusercontent.com/junguler/m3u-radio-music-playlists/main/';
const playlistCache = new Map<string, Promise<string[]>>();

/** The https streams in one of junguler's genre lists, shuffled. */
function playlist(genre: string): Promise<string[]> {
  let hit = playlistCache.get(genre);
  if (!hit) {
    hit = fetch(`${PLAYLIST_BASE}${encodeURIComponent(genre)}.m3u`, { signal: AbortSignal.timeout(8000) })
      .then(r => (r.ok ? r.text() : ''))
      .then(text => {
        const urls = text
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.startsWith('https://') && !/\.m3u8(\?|$)/.test(l));
        for (let i = urls.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [urls[i], urls[j]] = [urls[j], urls[i]];
        }
        return urls;
      })
      .catch(() => []);
    playlistCache.set(genre, hit);
  }
  return hit;
}

/** Tell Radio Browser a listener started one of its streams (it counts one a day per listener). */
export function countClick(uuid: string) {
  void fetch(`/api/radio/click/${uuid}`).catch(() => {});
}

/* ------------------------------ the whole chain ----------------------------- */

function own(station: Station): Source[] {
  if (station.source.kind === 'stream') {
    return streamUrls(station.source.mount).map(u => ({ key: 'own', url: async () => u }));
  }
  const id = station.source.id;
  return [{ key: 'own', seekLive: true, url: async () => (await resolveArchive(id, 'audio'))?.url ?? null }];
}

/**
 * Every source to try for a station, best first. The station's own source
 * leads unless a stand-in has a better record here.
 */
export async function* sourcesFor(station: Station): AsyncGenerator<Source> {
  const stand = STAND_IN[station.id];
  const health = readBook()[station.id] ?? {};
  const tried = new Set<string>();
  const give = (s: Source) => {
    tried.add(s.key);
    return s;
  };

  // A stand-in that has proven better than the station's own feed goes
  // first, except once a day, when the own feed gets the chance to win back
  // its place.
  const best = Object.entries(health)
    .filter(([key, h]) => key !== 'own' && h.url && score(h) > score(health.own) && score(h) > 0)
    .sort((a, b) => score(b[1]) - score(a[1]))[0];
  const ownDue = !health.own || Date.now() - health.own.at > 24 * 3600 * 1000;
  if (best && !ownDue) yield give({ key: best[0], uuid: best[1].uuid, url: async () => best[1].url ?? null });

  for (const s of own(station)) yield s;
  tried.add('own');
  if (best && !tried.has(best[0])) yield give({ key: best[0], uuid: best[1].uuid, url: async () => best[1].url ?? null });
  if (!stand) return;

  // Radio Browser: the very same channel first, then its style.
  const rb = [
    ...(stand.name ? (await radioBrowser({ name: stand.name })).filter(s => /soma/i.test(s.name)) : []),
    ...(await radioBrowser({ tag: stand.tag, language: 'english' })),
  ];
  for (const s of rb.slice(0, 5)) {
    const key = `rb:${s.uuid}`;
    if (tried.has(key)) continue;
    yield give({ key, uuid: s.uuid, url: async () => s.url });
  }

  // GitHub's daily genre lists, last.
  for (const url of (await playlist(stand.list)).slice(0, 5)) {
    const key = `m3u:${url}`;
    if (tried.has(key)) continue;
    yield give({ key, url: async () => url });
  }
}
