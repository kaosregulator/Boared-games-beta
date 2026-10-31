// A wave of visitors opening the room at once: each one loads the page, its
// bundles, the asset manifest, the title song, every room model (as ?v=hash, brotli),
// asks the archive lookup for a few TV items and posts a page-loaded log line.
//   node load.mjs <base> <visitors> <concurrentVisitors>
import { setTimeout as sleep } from 'node:timers/promises';
const base = process.argv[2] ?? 'http://localhost:3000';
const visitors = Number(process.argv[3] ?? 200);
const conc = Number(process.argv[4] ?? 100);
const html = await (await fetch(base + '/')).text();
const bundles = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m => m[1]);
const manifest = await (await fetch(base + '/asset-manifest.json')).json();
const models = Object.entries(manifest).filter(([p]) => p.startsWith('/models/')).map(([p, v]) => `${p}?v=${v.h}`);
const lat = { page: [], bundle: [], model: [], api: [] };
let errors = 0, bytes = 0, status = {};
const ids = ['tv-item-a', 'tv-item-b', 'tv-item-c', 'tv-item-d'];
async function get(kind, path, init) {
  const t = performance.now();
  try {
    const res = await fetch(base + path, { headers: { 'accept-encoding': 'br, gzip', 'x-forwarded-for': `10.0.${(Math.random() * 250) | 0}.${(Math.random() * 250) | 0}` }, ...init });
    const buf = await res.arrayBuffer();
    bytes += buf.byteLength;
    status[res.status] = (status[res.status] ?? 0) + 1;
    if (res.status >= 500 && kind !== 'api') errors++;
  } catch (e) {
    errors++;
    status.err = (status.err ?? 0) + 1;
  }
  lat[kind].push(performance.now() - t);
}
async function visitor() {
  await get('page', '/');
  await Promise.all(bundles.map(b => get('bundle', b)));
  await get('api', '/asset-manifest.json');
  await Promise.all(ids.map(id => get('api', `/api/archive/${id}`)));
  await get('api', '/api/client-log', { method: 'POST', body: JSON.stringify({ level: 'info', message: 'page loaded', page: 'room' }), headers: { 'content-type': 'application/json' } });
  // six models at a time, like the room's download line
  for (let i = 0; i < models.length; i += 6) await Promise.all(models.slice(i, i + 6).map(m => get('model', m)));
}
const t0 = performance.now();
let next = 0;
await Promise.all(Array.from({ length: conc }, async () => { while (next < visitors) { next++; await visitor(); } }));
const wall = (performance.now() - t0) / 1000;
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))]) : 0; };
const out = { visitors, conc, wallSec: +wall.toFixed(1), gbSent: +(bytes / 1e9).toFixed(2), mbPerSec: Math.round(bytes / 1e6 / wall), errors, status };
for (const k of Object.keys(lat)) out[k] = { n: lat[k].length, p50: q(lat[k], 0.5), p95: q(lat[k], 0.95), p99: q(lat[k], 0.99), max: q(lat[k], 1) };
console.log(JSON.stringify(out));
