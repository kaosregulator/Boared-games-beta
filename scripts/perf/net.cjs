// Cold first visit on a throttled link: bytes per second to the title reel vs the room models, and when the room is ready.
// node net.cjs <out.json> [mbps] [port] [clickAtMs]
const { chromium } = require('playwright');
const fs = require('fs');
const wait = ms => new Promise(r => setTimeout(r, ms));
const out = process.argv[2];
const mbps = Number(process.argv[3] || 50);
const port = process.argv[4] || 3000;
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 160, height: 90 } });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 20, downloadThroughput: (mbps * 1e6) / 8, uploadThroughput: (20 * 1e6) / 8 });
  const t0 = Date.now();
  const urls = new Map();
  const timeline = [];
  cdp.on('Network.requestWillBeSent', e => urls.set(e.requestId, { url: e.request.url, at: Date.now() - t0, prio: e.request.initialPriority }));
  cdp.on('Network.dataReceived', e => { const u = urls.get(e.requestId); if (!u) return; const kind = /reel\.mp4/.test(u.url) ? 'reel' : /\.(glb|gltf|bin|ktx2)/.test(u.url) ? 'model' : 'other'; timeline.push([Date.now() - t0, kind, e.encodedDataLength || e.dataLength]); });
  const reqLog = [];
  cdp.on('Network.loadingFinished', e => { const u = urls.get(e.requestId); if (u && /reel|toyshelf/.test(u.url)) reqLog.push({ url: u.url.split('/').pop().slice(0, 40), start: u.at, end: Date.now() - t0, mb: +(e.encodedDataLength / 1e6).toFixed(1), prio: u.prio }); });
  await p.goto(`http://localhost:${port}/`);
  const readyAt = await p.waitForFunction(() => /room ready/i.test(document.body.innerText), null, { timeout: 300000, polling: 200 }).then(() => Date.now() - t0);
  await wait(1500);
  const reelStalls = await p.evaluate(() => { const v = document.querySelector('video'); return v ? { t: v.currentTime, buffered: v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0 } : null; });
  const bucket = new Map();
  for (const [t, kind, n] of timeline) { const s = Math.floor(t / 5000) * 5; const r = bucket.get(s) || { reel: 0, model: 0, other: 0 }; r[kind] += n / 1e6; bucket.set(s, r); }
  const sum = k => +(timeline.filter(x => x[1] === k).reduce((a, x) => a + x[2], 0) / 1e6).toFixed(1);
  const res = { mbps, readyAt, reelMbByReady: sum('reel'), modelMbByReady: sum('model'), reelStalls, reqLog, buckets: [...bucket.entries()].map(([s, r]) => [s, +r.reel.toFixed(1), +r.model.toFixed(1)]) };
  console.log(JSON.stringify({ readyAt, reel: res.reelMbByReady, model: res.modelMbByReady, reqLog }));
  fs.writeFileSync(out, JSON.stringify(res, null, 1));
  await b.close();
})();
