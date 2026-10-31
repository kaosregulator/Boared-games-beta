// What each moment costs: new shader programs compiled, the longest main-thread task, frames, triangles.
// node events.cjs <out.json>
const { chromium } = require('playwright');
const fs = require('fs');
const wait = ms => new Promise(r => setTimeout(r, ms));
const out = process.argv[2];
const clip = fs.readFileSync(process.env.TV_CLIP || __dirname + '/tvclip.mp4');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 160, height: 90 } });
  await ctx.route('**/api/archive/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'x', files: [{ name: 'clip.mp4', format: 'h.264', length: '60' }] }) }));
  await ctx.route('https://archive.org/**', r => r.fulfill({ status: 200, body: clip, headers: { 'content-type': 'video/mp4', 'access-control-allow-origin': '*' } }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { window.__long = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask' }); } catch {} });
  await p.goto('http://localhost:3000/?diag=1');
  await p.waitForFunction(() => /room ready/i.test(document.body.innerText), null, { timeout: 180000 });
  await p.evaluate(() => [...document.querySelectorAll('button')].find(b => /step through time/i.test(b.innerText)).click());
  await wait(30000);
  const res = [];
  async function moment(name, fn, ms) {
    const before = await p.evaluate(() => ({ prog: window.__three.gl.info.programs.length, t: performance.now(), keys: window.__three.gl.info.programs.map(x => x.cacheKey) }));
    await fn();
    await wait(ms);
    const after = await p.evaluate(b => { const g = window.__three.gl; const l = window.__long.filter(x => x[0] >= b.t); return { prog: g.info.programs.length, newKeys: g.info.programs.filter(x => !b.keys.includes(x.cacheKey)).map(x => x.name || x.cacheKey.slice(0, 40)), worst: Math.max(0, ...l.map(x => x[1])), longMs: l.reduce((a, x) => a + x[1], 0), longN: l.length, calls: g.info.render.calls, tris: g.info.render.triangles }; }, before);
    const r = { name, newPrograms: after.prog - before.prog, worstTaskMs: after.worst, longTaskMs: after.longMs, longTasks: after.longN, calls: after.calls, tris: after.tris, programs: after.newKeys.slice(0, 12) };
    console.log(JSON.stringify(r)); res.push(r);
  }
  const hold = async (keys, ms) => { for (const k of keys) await p.keyboard.down(k); await wait(ms); for (const k of keys) await p.keyboard.up(k); };
  await moment('walk+turn', () => hold(['KeyW', 'ArrowLeft'], 6000), 2000);
  await moment('tv on', () => p.evaluate(() => window.__tvMode('on')), 10000);
  await moment('hotwheels', () => p.evaluate(() => window.__cardAction('hotwheels')), 20000);
  await moment('hotwheels drive', () => hold(['KeyW'], 5000), 2000);
  await p.keyboard.press('Escape'); await wait(6000);
  await moment('army men', () => p.evaluate(() => window.__cardAction('army')), 25000);
  await p.keyboard.press('Escape'); await wait(6000);
  fs.writeFileSync(out, JSON.stringify({ res, errs: errs.slice(0, 8) }, null, 1));
  await b.close();
})();
