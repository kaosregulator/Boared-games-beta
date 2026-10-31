// CPU profile of the first two seconds after pressing Play at "Room ready" (repeat visit).
const { chromium } = require('playwright');
const fs = require('fs'); const os = require('os'); const path = require('path');
const wait = ms => new Promise(r => setTimeout(r, ms));
const port = process.argv[2] || 3000;
(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-'));
  const ctx = await chromium.launchPersistentContext(dir, { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'], viewport: { width: 160, height: 90 } });
  for (const pass of [0, 1]) {
    const p = await ctx.newPage();
    await p.goto(`http://localhost:${port}/`);
    await p.waitForFunction(() => /room ready/i.test(document.body.innerText), null, { timeout: 300000, polling: 100 });
    if (pass === 0) { await p.close(); continue; }
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 100 }); await cdp.send('Profiler.start');
    await p.evaluate(() => [...document.querySelectorAll('button')].find(b => /step through time/i.test(b.innerText)).click());
    await wait(2500);
    const { profile } = await cdp.send('Profiler.stop');
    const dt = profile.timeDeltas; const self = new Map(); const byId = new Map(profile.nodes.map(n => [n.id, n]));
    profile.samples.forEach((id, i) => { const f = byId.get(id).callFrame; const k = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}:${f.columnNumber}`; self.set(k, (self.get(k) || 0) + (dt[i] || 0)); });
    console.log([...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18).map(([k, v]) => `${(v / 1000).toFixed(0).padStart(6)} ms  ${k}`).join('\n'));
  }
  await ctx.close();
})();
