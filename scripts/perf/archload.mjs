// 300 viewers tune in at once right after a deploy, across 40 channel items.
// archive.org answers each lookup in 600-1200 ms. Before: empty cache. After: restored from the saved snapshot.
import { createArchiveMeta } from '../../server/archiveMeta.mjs';
const ITEM = { files: [{ name: 'a.mp4', format: 'h.264' }] };
const fetchImpl = async () => { await new Promise(r => setTimeout(r, 600 + Math.random() * 600)); return new Response(JSON.stringify(ITEM), { status: 200 }); };
const ids = Array.from({ length: 40 }, (_, i) => `item-${i}`);
async function wave(meta) {
  const lat = [];
  await Promise.all(Array.from({ length: 300 }, async (_, i) => {
    const t = performance.now();
    await new Promise(res => meta.handle(ids[i % ids.length], (status) => res(status)));
    lat.push(performance.now() - t);
  }));
  lat.sort((a, b) => a - b);
  const q = p => Math.round(lat[Math.floor(p * (lat.length - 1))]);
  return { p50: q(0.5), p95: q(0.95), max: q(1) };
}
const log = () => {};
// a server that ran yesterday: everything looked up, now past its 6 h
const old = createArchiveMeta({ fetchImpl, log, ttlMs: 1 });
for (const id of ids) await old.lookup(id);
const snap = JSON.parse(JSON.stringify(old.snapshot()));
await new Promise(r => setTimeout(r, 10));
console.log('before (fresh process, empty cache):', JSON.stringify(await wave(createArchiveMeta({ fetchImpl, log, serveStaleMs: 0 }))));
const after = createArchiveMeta({ fetchImpl, log });
after.restore(snap);
console.log('after (restored, expired, refreshed behind):', JSON.stringify(await wave(after)));
process.exit(0);
