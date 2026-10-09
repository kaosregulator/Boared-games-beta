/**
 * Screenshot the walkable room at each tour waypoint, or record the whole
 * scripted walkthrough as a frame sequence.
 *
 *   node scripts/shoot.mjs shots  [outDir]
 *   node scripts/shoot.mjs frames [outDir] [seconds] [fps]
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.SHOOT_BASE ?? 'http://localhost:3000';
const mode = process.argv[2] ?? 'shots';
const outDir = process.argv[3] ?? '/tmp/shots';
const seconds = Number(process.argv[4] ?? 30);
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
    '--window-size=1440,900',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
page.on('console', m => {
  if (m.type() === 'error') console.log('[page error]', m.text());
});
page.on('pageerror', e => console.log('[page exception]', e.message));

async function settle(ms) {
  await new Promise(r => setTimeout(r, ms));
}

if (mode === 'shots') {
  const count = Number(process.env.SHOOT_COUNT ?? 8);
  const list = process.env.SHOOT_LIST
    ? process.env.SHOOT_LIST.split(',').map(Number)
    : Array.from({ length: count }, (_, i) => i);
  for (const i of list) {
    await page.goto(`${BASE}/?shot=${i}`, { waitUntil: 'networkidle2' });
    await settle(3500);
    const file = join(outDir, `shot${String(i).padStart(2, '0')}.png`);
    await page.screenshot({ path: file });
    console.log('wrote', file);
  }
} else {
  await page.goto(`${BASE}/?tour=1`, { waitUntil: 'networkidle2' });
  await settle(4000);
  const frames = Math.round(seconds * fps);
  for (let i = 0; i < frames; i += 1) {
    await page.screenshot({ path: join(outDir, `f${String(i).padStart(4, '0')}.png`) });
  }
  console.log('wrote', frames, 'frames to', outDir);
}

await browser.close();
