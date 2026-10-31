// How often the room redraws while a cartridge plays. node emuroom.cjs <gameboy|nes>
const { chromium } = require('playwright');
const wait = ms => new Promise(r => setTimeout(r, ms));
const kind = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 320, height: 180 } });
  await p.addInitScript(() => { window.__msgs = []; window.addEventListener('message', e => { if (e.data && e.data.source === 'cartridge') window.__msgs.push(e.data.type); }); });
  await p.goto('http://localhost:3000/?diag=1');
  await p.waitForFunction(() => /room ready/i.test(document.body.innerText), null, { timeout: 180000 });
  await p.evaluate(() => [...document.querySelectorAll('button')].find(b => /step through time/i.test(b.innerText)).click());
  await wait(25000);
  await p.evaluate(() => { const g = window.__three.gl; const o = g.render.bind(g); window.__renders = 0; g.render = (s, c) => { window.__renders++; o(s, c); }; });
  await p.evaluate(k => window.__cardAction(k), kind);
  await wait(3000); await p.keyboard.press('Enter');
  await p.waitForFunction(() => window.__msgs.includes('start'), null, { timeout: 120000 });
  await wait(3000);
  const r0 = await p.evaluate(() => window.__renders); await wait(10000); const r1 = await p.evaluate(() => window.__renders);
  console.log(kind, 'room renders in 10 s while playing:', r1 - r0, 'frameloop:', await p.evaluate(() => document.querySelector('[data-room]')?.dataset.frameloop), 'graphics:', await p.evaluate(() => document.querySelector('[data-room]')?.dataset.graphics));
  await b.close();
})();
