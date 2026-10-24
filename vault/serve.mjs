import fs from 'fs';
import http from 'http';
import path from 'path';
import { episodesFromDb } from './db.mjs';
import { SHOWS, VAULT_DIR, humanBytes, readSidecars } from './lib.mjs';

/**
 * The vault's server: plain Node, no framework. It plays the episodes in a
 * browser on its own page, and gives the game's TV a channel feed it can
 * tune to. Video goes out with byte ranges, so seeking to "what's on now"
 * jumps straight there.
 *
 *   GET /                          the player
 *   GET /vault/health              { ok, episodes, bytes }
 *   GET /vault/channels/<show>     the episodes in air order, with their URLs
 *   GET /vault/media/<show>/<file> one episode's .webm, .vtt or .jpg
 */

const port = Number(process.env.VAULT_PORT ?? 8088);
const host = process.env.VAULT_HOST ?? '0.0.0.0';

const TYPES = { '.webm': 'video/webm', '.vtt': 'text/vtt; charset=utf-8', '.jpg': 'image/jpeg', '.json': 'application/json' };

/** Catalog from Postgres when it's up, else from the files on disk; refreshed every minute. */
const catalogs = new Map();
async function catalog(show) {
  const hit = catalogs.get(show);
  if (hit && Date.now() - hit.at < 60_000) return hit.rows;
  let rows = null;
  try {
    const fromDb = await episodesFromDb(show);
    if (fromDb?.length) {
      rows = fromDb.map(r => ({ key: r.key, season: r.season, from: r.ep_from, to: r.ep_to, title: r.title, label: r.label, seconds: r.seconds, file: r.file, bytes: Number(r.bytes), subtitles: r.subtitles, thumb: r.thumb }));
    }
  } catch {
    // fall back to the sidecars
  }
  rows ??= readSidecars(show);
  catalogs.set(show, { at: Date.now(), rows });
  return rows;
}

/**
 * Which other sites may read the vault: the game on localhost (any port) and
 * whatever VAULT_ORIGINS lists, e.g. "https://my-game.example,http://192.168.1.20:3000".
 * Any other page gets no CORS headers, so it can't read the episode list.
 */
const ALLOWED = new Set((process.env.VAULT_ORIGINS ?? '').split(',').map(o => o.trim().replace(/\/+$/, '')).filter(Boolean));
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function cors(req, res) {
  const origin = req.headers.origin;
  if (!origin || !(LOCAL.test(origin) || ALLOWED.has(origin))) return;
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  // Chrome asks before a public page reaches a server on your own network.
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

function json(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
  res.end(JSON.stringify(body));
}

function sendFile(req, res, file) {
  const stat = fs.statSync(file);
  const type = TYPES[path.extname(file)] ?? 'application/octet-stream';
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=86400' };
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : stat.size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : stat.size - 1;
    start = Math.max(0, start);
    end = Math.min(end, stat.size - 1);
    if (start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      res.end();
      return;
    }
    res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }
  res.writeHead(200, { ...headers, 'Content-Length': stat.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

const mediaUrl = (show, rel) => (rel ? `/vault/media/${show}/${path.basename(rel)}` : null);

async function handle(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end();
    return;
  }
  const url = new URL(req.url, 'http://vault');
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);

  if (url.pathname === '/vault/health') {
    let episodes = 0;
    let bytes = 0;
    for (const show of Object.keys(SHOWS)) {
      const rows = await catalog(show);
      episodes += rows.length;
      bytes += rows.reduce((a, r) => a + (r.bytes ?? 0), 0);
    }
    return json(res, { ok: true, episodes, bytes, size: humanBytes(bytes) });
  }

  if (parts[0] === 'vault' && parts[1] === 'channels' && parts[2] && SHOWS[parts[2]]) {
    const show = parts[2];
    const rows = await catalog(show);
    return json(res, {
      show,
      name: SHOWS[show].show,
      episodes: rows.map(r => ({
        key: r.key,
        season: r.season,
        title: r.title,
        label: r.label,
        seconds: r.seconds,
        url: mediaUrl(show, r.file),
        subtitles: mediaUrl(show, r.subtitles),
        thumb: mediaUrl(show, r.thumb),
      })),
    });
  }

  if (parts[0] === 'vault' && parts[1] === 'media' && parts.length === 4 && SHOWS[parts[2]]) {
    // Only files the catalog names are served: nothing else on the drive is reachable.
    const show = parts[2];
    const name = parts[3];
    const rows = await catalog(show);
    const row = rows.find(r => [r.file, r.subtitles, r.thumb].some(rel => rel && path.basename(rel) === name));
    const rel = row && [row.file, row.subtitles, row.thumb].find(p => p && path.basename(p) === name);
    const file = rel && path.join(VAULT_DIR, rel);
    if (!file || !fs.existsSync(file)) return json(res, { error: 'not in the vault' }, 404);
    return sendFile(req, res, file);
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(fs.readFileSync(new URL('./player.html', import.meta.url)));
    return;
  }

  json(res, { error: 'not found' }, 404);
}

http
  .createServer((req, res) => {
    handle(req, res).catch(err => {
      console.error(err);
      if (!res.headersSent) json(res, { error: 'server error' }, 500);
      else res.end();
    });
  })
  .listen(port, host, () => {
    console.log(`Vault serving ${VAULT_DIR} on http://localhost:${port}`);
  });
