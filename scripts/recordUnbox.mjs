/**
 * Record the box opening on the table, driving the sequence frame by frame so
 * the result is smooth under software rendering.
 *
 *   node scripts/recordUnbox.mjs <gameId> <outDir> [seconds] [fps]
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.SHOOT_BASE ?? 'http://localhost:3000';
const game = process.argv[2] ?? 'monopoly';
const outDir = process.argv[3] ?? '/tmp/unbox';
const seconds = Number(process.argv[4] ?? 6);
const fps = Number(process.argv[5] ?? 20);

mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'shell',
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--hide-scrollbars',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('[page exception]', e.message));

await page.evaluateOnNewDocument(() => {
  window.__unboxTime = 0;
});
await page.goto(`${BASE}/?room=1&game=${game}&unbox=1`, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 6000));

const frames = Math.round(seconds * fps);
for (let i = 0; i < frames; i += 1) {
  await page.evaluate(time => {
    window.__unboxTime = time;
  }, i / fps);
  await page.evaluate(
    () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await page.screenshot({ path: join(outDir, `f${String(i).padStart(4, '0')}.png`) });
  if (i % 20 === 0) console.log(`frame ${i}/${frames}`);
}

console.log('wrote', frames, 'frames to', outDir);
await browser.close();
