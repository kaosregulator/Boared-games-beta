// Game Boy / NES: time from sitting down to the game running, and the game's frame pacing.
// node emu.cjs <gameboy|nes> <out.json> [second]   (second: open it twice, the second time warm)
const { chromium } = require('playwright');
const fs = require('fs');
const wait = ms => new Promise(r => setTimeout(r, ms));
const kind = process.argv[2]; const out = process.argv[3];
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 640, height: 360 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const reqs = [];
  p.on('requestfinished', async r => { if (/\/emu\/|\/roms\//.test(r.url())) { const t = r.timing(); reqs.push([r.url().replace(/.*\/\/[^/]+/, ''), Math.round(t.responseEnd)]); } });
  await p.addInitScript(() => {
    if (window.top !== window) {
      // inside the cartridge frame: the game's frame pacing
      window.__f = []; let last = 0;
      const tick = t => { if (last) window.__f.push(t - last); last = t; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      window.__long = [];
      try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ type: 'longtask' }); } catch {}
      return;
    }
    window.__msgs = [];
    window.addEventListener('message', e => { if (e.data && e.data.source === 'cartridge') window.__msgs.push([e.data.type, Math.round(performance.now())]); });
  });
  await p.goto('http://localhost:3000/?diag=1');
  await p.waitForFunction(() => /room ready/i.test(document.body.innerText), null, { timeout: 180000 });
  await p.evaluate(() => [...document.querySelectorAll('button')].find(b => /step through time/i.test(b.innerText)).click());
  await wait(25000);
  const runs = [];
  for (let round = 0; round < (process.argv[4] ? 2 : 1); round++) {
    const t0 = await p.evaluate(k => { window.__msgs = []; window.__cardAction(k); return performance.now(); }, kind);
    await wait(3000);
    const tPick = await p.evaluate(() => performance.now());
    await p.keyboard.press('Enter');
    let started = null;
    for (let i = 0; i < 120 && !started; i++) { await wait(500); started = await p.evaluate(() => (window.__msgs.find(m => m[0] === 'start') || [])[1] || null); }
    const ready = await p.evaluate(() => (window.__msgs.find(m => m[0] === 'ready') || [])[1] || null);
    const frame = p.frames().find(f => /emu\/play\.html/.test(f.url()));
    let pace = null;
    if (frame && started) {
      await frame.evaluate(() => { window.__f = []; window.__long = []; });
      // play: hold left/right, rotate
      for (let i = 0; i < 8; i++) { await p.keyboard.down(i % 2 ? 'ArrowLeft' : 'ArrowRight'); await wait(500); await p.keyboard.up(i % 2 ? 'ArrowLeft' : 'ArrowRight'); await p.keyboard.press('KeyZ'); await wait(250); }
      pace = await frame.evaluate(() => { const f = [...window.__f].sort((a, b) => a - b); const q = x => +f[Math.min(f.length - 1, Math.floor(x * f.length))].toFixed(1); return { frames: f.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), worst: q(1), over33: f.filter(x => x > 33.5).length, long: window.__long.length, longMs: window.__long.reduce((a, x) => a + x, 0) }; });
    }
    const r = { round, pickToStartMs: started ? Math.round(started - tPick) : null, pickToReadyMs: ready ? Math.round(ready - tPick) : null, pace };
    console.log(JSON.stringify(r)); runs.push(r);
    await p.keyboard.press('Escape'); await wait(1500); await p.keyboard.press('Escape'); await wait(4000);
  }
  fs.writeFileSync(out, JSON.stringify({ kind, runs, reqs, errs: errs.slice(0, 8) }, null, 1));
  console.log(JSON.stringify(reqs));
  await b.close();
})();
