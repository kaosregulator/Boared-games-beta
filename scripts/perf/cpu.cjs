// CPU cost of each frame (the rAF callbacks: useFrame work + three's render), and how many
// shaders were built inside a frame (each one holds that frame on any GPU).
// node cpu.cjs <out.json> [cpuThrottle] [width height]
const { chromium } = require('playwright');
const fs = require('fs');
const wait = ms => new Promise(r => setTimeout(r, ms));
const out = process.argv[2];
const thr = Number(process.argv[3] || 1);
const W = Number(process.argv[4] || 160), H = Number(process.argv[5] || 90);
const clip = fs.readFileSync(process.env.TV_CLIP || __dirname + '/tvclip.mp4');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H } });
  await ctx.route('**/api/archive/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'x', files: [{ name: 'clip.mp4', format: 'h.264', length: '60' }] }) }));
  await ctx.route('https://archive.org/**', r => r.fulfill({ status: 200, body: clip, headers: { 'content-type': 'video/mp4', 'access-control-allow-origin': '*' } }));
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    const w = window; w.__cb = []; w.__rec = false; w.__inFrame = false; w.__frameBuilds = 0;
    const raf = w.requestAnimationFrame.bind(w);
    w.requestAnimationFrame = fn => raf(t => { const s = performance.now(); w.__inFrame = true; try { fn(t); } finally { w.__inFrame = false; if (w.__rec) w.__cb.push(performance.now() - s); } });
    // count program links that happen inside a frame
    const patch = proto => { const o = proto.getProgramParameter; proto.getProgramParameter = function (prog, pname) { if (pname === 0x8b82 && w.__inFrame && w.__rec && !(prog.__seen)) { prog.__seen = 1; w.__frameBuilds++; } return o.call(this, prog, pname); }; };
    patch(WebGL2RenderingContext.prototype); patch(WebGLRenderingContext.prototype);
  });
  const cdp = await ctx.newCDPSession(p);
  await p.goto('http://localhost:3000/?diag=1');
  await p.waitForFunction(() => /room ready/i.test(document.body.innerText), null, { timeout: 180000 });
  await p.evaluate(() => [...document.querySelectorAll('button')].find(b => /step through time/i.test(b.innerText)).click());
  await wait(30000);
  if (thr > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: thr });
  const hold = async (keys, ms) => { for (const k of keys) await p.keyboard.down(k); await wait(ms); for (const k of keys) await p.keyboard.up(k); };
  const res = [];
  async function moment(name, fn, ms) {
    await p.evaluate(() => { window.__cb = []; window.__frameBuilds = 0; window.__rec = true; });
    const t = Date.now(); await fn(); const left = ms - (Date.now() - t); if (left > 0) await wait(left);
    const r = await p.evaluate(() => { window.__rec = false; const c = [...window.__cb].sort((a, b) => a - b); const q = x => c.length ? +c[Math.min(c.length - 1, Math.floor(x * c.length))].toFixed(2) : 0; return { frames: c.length, cpuP50: q(0.5), cpuP95: q(0.95), cpuMax: q(1), builtInFrame: window.__frameBuilds, heapMb: Math.round(performance.memory.usedJSHeapSize / 1e6) }; });
    r.name = name; console.log(JSON.stringify(r)); res.push(r);
  }
  await moment('walk+turn', async () => { await hold(['KeyW'], 4000); await hold(['ArrowLeft'], 4000); await hold(['KeyW', 'ArrowRight'], 4000); }, 12000);
  await moment('tv on', () => p.evaluate(() => window.__tvMode('on')), 12000);
  await moment('tv on walk+turn', async () => { await hold(['KeyW'], 4000); await hold(['ArrowLeft'], 4000); await hold(['KeyW', 'ArrowRight'], 4000); }, 12000);
  await moment('hotwheels (tv on)', () => p.evaluate(() => window.__cardAction('hotwheels')), 20000);
  await moment('hotwheels drive', async () => { await hold(['KeyW'], 4000); await hold(['KeyW', 'KeyA'], 3000); }, 8000);
  await p.keyboard.press('Escape'); await wait(8000);
  await moment('army men (tv on)', () => p.evaluate(() => window.__cardAction('army')), 30000);
  fs.writeFileSync(out, JSON.stringify({ throttle: thr, res, errs: errs.slice(0, 8) }, null, 1));
  await b.close();
})();
