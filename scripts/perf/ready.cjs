// Press Play the moment the title says "Room ready", then count the GPU work that lands inside
// frames in the next 10 s: shader programs linked, textures uploaded, and the longest frame.
// node ready.cjs <port> [mbps|0] [repeat:0|1]
const { chromium } = require('playwright');
const fs = require('fs'); const os = require('os'); const path = require('path');
const wait = ms => new Promise(r => setTimeout(r, ms));
const port = process.argv[2] || 3000; const mbps = Number(process.argv[3] || 0); const repeat = process.argv[4] === '1';
const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'];
const init = () => {
  const w = window; w.__rec = false; w.__inFrame = false; w.__links = 0; w.__uploads = 0; w.__frames = []; w.__uploadMs = 0; w.__buf = 0; w.__frameBuf = [];
  const raf = w.requestAnimationFrame.bind(w);
  w.requestAnimationFrame = fn => raf(t => { const s = performance.now(); const b0 = w.__buf; w.__inFrame = true; try { fn(t); } finally { w.__inFrame = false; if (w.__rec) { w.__frames.push(performance.now() - s); w.__frameBuf.push([+(performance.now() - s).toFixed(0), +((w.__buf - b0) / 1e6).toFixed(1)]); } } });
  const patch = proto => {
    const o = proto.getProgramParameter;
    proto.getProgramParameter = function (prog, pname) { if (pname === 0x8b82 && w.__inFrame && w.__rec && !prog.__seen) { prog.__seen = 1; w.__links++; } return o.call(this, prog, pname); };
    const bd = proto.bufferData; proto.bufferData = function (t, d, u) { if (w.__inFrame && w.__rec && d && d.byteLength) w.__buf += d.byteLength; return bd.apply(this, arguments); };
    for (const name of ['texImage2D', 'compressedTexImage2D', 'texStorage2D']) {
      const f = proto[name]; if (!f) continue;
      proto[name] = function (...a) { if (w.__inFrame && w.__rec) { const s = performance.now(); try { return f.apply(this, a); } finally { w.__uploads++; w.__uploadMs += performance.now() - s; } } return f.apply(this, a); };
    }
  };
  patch(WebGL2RenderingContext.prototype); patch(WebGLRenderingContext.prototype);
};
async function visit(ctx, label) {
  const p = await ctx.newPage();
  await p.addInitScript(init);
  if (mbps) { const cdp = await ctx.newCDPSession(p); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 20, downloadThroughput: (mbps * 1e6) / 8, uploadThroughput: 2.5e6 }); }
  const t0 = Date.now();
  await p.goto(`http://localhost:${port}/`);
  await p.waitForFunction(() => /room ready/i.test(document.body.innerText), null, { timeout: 300000, polling: 100 });
  const readyAt = Date.now() - t0;
  await p.evaluate(() => { window.__rec = true; [...document.querySelectorAll('button')].find(b => /step through time/i.test(b.innerText)).click(); });
  await wait(10000);
  const r = await p.evaluate(() => { window.__rec = false; const f = [...window.__frames].sort((a, b) => a - b); const top = [...window.__frameBuf].map((x, i) => [i, ...x]).sort((a, b) => b[1] - a[1]).slice(0, 4); return { top, bufMbInFrame: +(window.__buf / 1e6).toFixed(1), frames: f.length, worstFrameMs: +(f[f.length - 1] || 0).toFixed(1), framesOver50ms: f.filter(x => x > 50).length, linksInFrame: window.__links, uploadsInFrame: window.__uploads, uploadMsInFrame: +window.__uploadMs.toFixed(1) }; });
  const out = { label, port, mbps, readyAt, ...r };
  console.log(JSON.stringify(out));
  await p.close();
  return out;
}
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-'));
  const ctx = await chromium.launchPersistentContext(dir, { args, viewport: { width: 160, height: 90 } });
  await visit(ctx, 'cold');
  if (repeat) await visit(ctx, 'repeat');
  await ctx.close();
})();
