// Triangles and draws per frame looking in each direction, plus what is drawn while out of view.
const { chromium } = require('playwright');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 160, height: 90 } });
  await p.goto('http://localhost:3000/?diag=1');
  await p.waitForFunction(() => /room ready/i.test(document.body.innerText), null, { timeout: 180000 });
  await p.evaluate(() => [...document.querySelectorAll('button')].find(b => /step through time/i.test(b.innerText)).click());
  await wait(25000);
  await p.evaluate(() => { const g = window.__three.gl; const o = g.render.bind(g); g.render = (s, c) => { window.__cam = c; o(s, c); }; });
  await p.waitForFunction(() => window.__cam, null, { timeout: 60000 });
  const r = await p.evaluate(async () => {
    const { gl, scene } = window.__three;
    let cam; scene.traverse(o => { if (o.isCamera && !cam) cam = o; });
    // r3f's default camera is not in the scene; take it off the renderer's last render
    const out = [];
    const THREEcam = window.__cam;
    const c = THREEcam || cam;
    if (!c) return 'no camera';
    const q0 = c.quaternion.clone();
    for (const [name, yaw, pitch] of [['spawn', 0, 0], ['left', Math.PI / 2, 0], ['back', Math.PI, 0], ['right', -Math.PI / 2, 0], ['ceiling', 0, 1.5], ['floor', 0, -1.5]]) {
      c.quaternion.copy(q0); c.rotateY(yaw); c.rotateX(pitch); c.updateMatrixWorld();
      gl.info.autoReset = false; gl.info.reset(); gl.render(scene, c);
      out.push([name, gl.info.render.calls, gl.info.render.triangles]);
      gl.info.autoReset = true;
    }
    c.quaternion.copy(q0);
    // what is drawn when looking at the ceiling
    c.rotateX(1.5); c.updateMatrixWorld();
    const f = new (Object.getPrototypeOf(c.projectionMatrix).constructor)();
    const list = [];
    scene.traverse(o => { if (!o.isMesh) return; let v = true, q = o; while (q) { if (!q.visible) { v = false; break; } q = q.parent; } if (!v || !o.layers.test(c.layers)) return; if (!o.frustumCulled) { const g = o.geometry; list.push(['nocull', o.name || o.parent?.name, Math.round((g.index ? g.index.count : g.attributes.position.count) / 3)]); } });
    c.quaternion.copy(q0);
    return { out, list: list.sort((a, b) => b[2] - a[2]).slice(0, 20) };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
