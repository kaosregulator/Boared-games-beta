// What the per-frame scene walks cost on the real, loaded room (CPU throttled to mimic a Chromebook/iPad),
// and what one gl.compile() of a single already-built mesh costs (FirstDrawGate called it once per new mesh).
// node walkcost.cjs <out.json> [throttle] [port]
const { chromium } = require('playwright');
const fs = require('fs');
const wait = ms => new Promise(r => setTimeout(r, ms));
const out = process.argv[2]; const thr = Number(process.argv[3] || 4); const port = process.argv[4] || 3000;
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 160, height: 90 } });
  const p = await ctx.newPage();
  await p.goto(`http://localhost:${port}/?diag=1`);
  await p.waitForFunction(() => /room ready/i.test(document.body.innerText), null, { timeout: 240000 });
  await p.evaluate(() => [...document.querySelectorAll('button')].find(b => /step through time/i.test(b.innerText)).click());
  await wait(30000);
  await p.evaluate(() => { const g = window.__three.gl; const o = g.render.bind(g); g.render = (s, c) => { window.__cam = c; o(s, c); }; });
  await p.waitForFunction(() => window.__cam, null, { timeout: 120000 });
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: thr });
  const r = await p.evaluate(() => {
    const { gl, scene } = window.__three;
    const cam = window.__cam;
    const time = (fn, n) => { for (let i = 0; i < 20; i++) fn(); const s = performance.now(); for (let i = 0; i < n; i++) fn(); return (performance.now() - s) / n; };
    // FirstDrawGate's per-frame walk (as shipped in PR #87)
    const ready = new WeakMap();
    scene.traverse(o => { const m = o.material; if (m) [].concat(m).forEach(x => ready.set(x, x.version)); });
    const fresh = [];
    const gateWalk = () => {
      fresh.length = 0;
      const seen = m => ready.get(m) === m.version;
      const walk = obj => {
        if (!obj.visible) return;
        const mat = obj.material;
        if (mat && (obj.isMesh || obj.isPoints || obj.isLine || obj.isSprite)) {
          if (Array.isArray(mat)) { for (let i = 0; i < mat.length; i++) if (!seen(mat[i])) { fresh.push(obj); break; } } else if (!seen(mat)) fresh.push(obj);
        }
        const kids = obj.children; for (let i = 0; i < kids.length; i++) walk(kids[i]);
      };
      walk(scene);
    };
    // balanceLights' walk (LightBudget, every frame)
    const lightWalk = () => {
      let real = 0;
      const walk = obj => {
        if (!obj.visible || obj.userData.noPointLights) return;
        if (obj.isPointLight) real++;
        const kids = obj.children; for (let i = 0; i < kids.length; i++) walk(kids[i]);
      };
      walk(scene); return real;
    };
    let mesh = null; scene.traverse(o => { if (!mesh && o.isMesh && o.material && o.material.isMeshStandardMaterial) mesh = o; });
    let nodes = 0; scene.traverse(() => nodes++);
    return {
      nodes,
      gateWalkMs: +time(gateWalk, 400).toFixed(4),
      lightWalkMs: +time(lightWalk, 400).toFixed(4),
      compileOneMs: mesh && cam ? +time(() => gl.compile(mesh, cam, scene), 100).toFixed(4) : null,
    };
  });
  console.log(JSON.stringify({ throttle: thr, ...r }));
  fs.writeFileSync(out, JSON.stringify({ throttle: thr, ...r }, null, 1));
  await b.close();
})();
