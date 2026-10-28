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

/* ------------------------------ stream checks ------------------------------ */

/**
 * A stand-in stream is only handed to the radio once its address has been
 * asked here and answered like a radio station: 200 with an audio body. A
 * sign-in (401/403/407, or any WWW-Authenticate), a web page, or a redirect
 * that ends on one never reaches the player, so the browser never pops up a
 * login box over the room.
 */
const AUDIO_TYPE = /^(audio\/[a-z0-9.+-]+|application\/ogg)\s*(;|$)/i;
const MAX_HOPS = 3;
const PROBE_TTL = 10 * 60 * 1000;
const probeCache = new Map();

/** What a stream's answer means for the radio: `{ ok: true }` or `{ ok: false, why }`. */
export function judgeStreamAnswer(status, headers) {
  const get = name => (typeof headers.get === 'function' ? headers.get(name) : headers[name]) ?? '';
  if (get('www-authenticate')) return { ok: false, why: 'asks for a sign-in' };
  if (status === 401 || status === 403 || status === 407) return { ok: false, why: `refused (${status})` };
  if (status !== 200 && status !== 206) return { ok: false, why: `answered ${status}` };
  const type = String(get('content-type')).trim();
  if (!type) return { ok: false, why: 'no content type' };
  if (!AUDIO_TYPE.test(type)) return { ok: false, why: `not audio (${type.split(';')[0]})` };
  return { ok: true };
}

/** Loopback, private, link-local and other addresses a public stream never lives on. */
export function isPrivateAddress(ip) {
  const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) {
    const [a, b] = v4.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
}

async function publicHost(hostname) {
  const name = hostname.replace(/^\[|\]$/g, '');
  if (name === 'localhost' || name.endsWith('.localhost') || name.endsWith('.internal') || name.endsWith('.local')) return false;
  try {
    const addrs = await dns.lookup(name, { all: true });
    return addrs.length > 0 && addrs.every(a => !isPrivateAddress(a.address));
  } catch {
    return false;
  }
}

/** Ask a stream address what it is, following up to three redirects. */
export async function probeStream(raw, fetchImpl = fetch, hostOk = publicHost) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, why: 'bad address' };
  }
  for (let hop = 0; hop <= MAX_HOPS; hop += 1) {
    if (url.protocol !== 'https:') return { ok: false, why: 'not https' };
    if (!(await hostOk(url.hostname))) return { ok: false, why: 'not a public host' };
    let res;
    try {
      res = await fetchImpl(url.href, {
        redirect: 'manual',
        headers: { 'User-Agent': USER_AGENT, 'Icy-MetaData': '0' },
        signal: AbortSignal.timeout(6000),
      });
    } catch {
      return { ok: false, why: 'no answer' };
    }
    // headers are all we need; never pull the stream itself through the server
    void res.body?.cancel().catch(() => {});
    if (res.status >= 300 && res.status < 400) {
      const to = res.headers.get('location');
      if (!to) return { ok: false, why: `redirect ${res.status} to nowhere` };
      url = new URL(to, url);
      continue;
    }
    const verdict = judgeStreamAnswer(res.status, res.headers);
    return verdict.ok ? { ok: true, url: url.href, type: res.headers.get('content-type') } : verdict;
  }
  return { ok: false, why: 'too many redirects' };
}

async function probeCached(raw) {
  const hit = probeCache.get(raw);
  if (hit && Date.now() - hit.at < PROBE_TTL) return hit.result;
  const result = await probeStream(raw);
  probeCache.set(raw, { at: Date.now(), result });
  if (probeCache.size > 500) probeCache.delete(probeCache.keys().next().value);
  return result;
}

/** Express-style handlers, shared by server.mjs and the Vite dev server. */
export async function handleRadioRequest(url, send) {
  const u = new URL(url, 'http://local');
  try {
    if (u.pathname === '/api/radio/probe') {
      const target = u.searchParams.get('url');
      if (!target) return send(400, { error: 'url' });
      return send(200, await probeCached(target));
    }
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
