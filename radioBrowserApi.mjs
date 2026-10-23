import dns from 'dns/promises';

/**
 * Radio Browser (https://docs.radio-browser.info), used as the radio's backup
 * when a station's own stream will not play. Done on the server, as the API
 * asks of its clients:
 *  - find the API servers with a DNS lookup of all.api.radio-browser.info
 *    (and a reverse lookup of each address), pick one at random, and move on
 *    to another if it fails;
 *  - send a descriptive User-Agent (a browser is not allowed to set one);
 *  - list only stations that passed their last check (hidebroken);
 *  - count a click (/json/url/{uuid}) every time a listener starts a stream.
 */

const USER_AGENT = 'BoaredGames/1.0 (+https://github.com/kaosregulator/Boared-games-beta)';
const FALLBACK_HOSTS = ['de1.api.radio-browser.info', 'nl1.api.radio-browser.info', 'at1.api.radio-browser.info', 'de2.api.radio-browser.info', 'fi1.api.radio-browser.info'];
const HOSTS_TTL = 30 * 60 * 1000;
const SEARCH_TTL = 10 * 60 * 1000;

let hosts = null;
let hostsAt = 0;
const searchCache = new Map();

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The API servers, by DNS as the docs ask, in random order. */
async function apiHosts() {
  if (hosts && Date.now() - hostsAt < HOSTS_TTL) return shuffle(hosts);
  try {
    const addrs = [
      ...(await dns.resolve4('all.api.radio-browser.info').catch(() => [])),
      ...(await dns.resolve6('all.api.radio-browser.info').catch(() => [])),
    ];
    const names = new Set();
    await Promise.all(
      addrs.map(async ip => {
        const rev = await dns.reverse(ip).catch(() => []);
        rev.filter(n => n.endsWith('.api.radio-browser.info')).forEach(n => names.add(n));
      }),
    );
    hosts = names.size ? [...names] : FALLBACK_HOSTS;
  } catch {
    hosts = FALLBACK_HOSTS;
  }
  hostsAt = Date.now();
  return shuffle(hosts);
}

/** GET a path from the first server that answers. */
async function rbGet(pathAndQuery) {
  let lastError = null;
  for (const host of (await apiHosts()).slice(0, 3)) {
    try {
      const res = await fetch(`https://${host}${pathAndQuery}`, {
        headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/json; charset=utf-8' },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) return await res.json();
      lastError = new Error(`${host} ${res.status}`);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('no radio-browser server answered');
}

const PLAYABLE = new Set(['MP3', 'AAC', 'AAC+']);

/**
 * Stations for a name or a tag, best first: working at the last check,
 * https (the page is https), a codec every browser plays, most listened.
 */
export async function searchStations({ name, tag }) {
  const key = `${name ?? ''}|${tag ?? ''}`;
  const hit = searchCache.get(key);
  if (hit && Date.now() - hit.at < SEARCH_TTL) return hit.list;
  const q = new URLSearchParams({ hidebroken: 'true', is_https: 'true', order: 'clickcount', reverse: 'true', limit: '25' });
  if (name) q.set('name', name);
  if (tag) {
    q.set('tag', tag);
    q.set('tagExact', 'true');
  }
  const rows = await rbGet(`/json/stations/search?${q}`);
  const list = rows
    .filter(s => s.lastcheckok === 1 && PLAYABLE.has(String(s.codec).toUpperCase()) && /^https:/.test(s.url_resolved || '') && !s.hls)
    .filter(s => !s.bitrate || s.bitrate >= 64)
    .slice(0, 10)
    .map(s => ({ uuid: s.stationuuid, name: s.name, url: s.url_resolved, codec: s.codec, bitrate: s.bitrate, clicks: s.clickcount, votes: s.votes }));
  searchCache.set(key, { at: Date.now(), list });
  return list;
}

/** Count a listen, as the API asks every time a stream starts. */
export async function countClick(uuid) {
  if (!/^[0-9a-f-]{36}$/i.test(uuid)) return { ok: false };
  const out = await rbGet(`/json/url/${uuid}`);
  return { ok: out?.ok === true || out?.ok === 'true' };
}

/** Express-style handlers, shared by server.mjs and the Vite dev server. */
export async function handleRadioRequest(url, send) {
  const u = new URL(url, 'http://local');
  try {
    if (u.pathname === '/api/radio/search') {
      const name = u.searchParams.get('name') || undefined;
      const tag = u.searchParams.get('tag') || undefined;
      if (!name && !tag) return send(400, { error: 'name or tag' });
      return send(200, { stations: await searchStations({ name, tag }) });
    }
    const click = u.pathname.match(/^\/api\/radio\/click\/([0-9a-fA-F-]{36})$/);
    if (click) return send(200, await countClick(click[1]));
    return send(404, { error: 'not found' });
  } catch (err) {
    return send(502, { error: String(err?.message || err) });
  }
}
