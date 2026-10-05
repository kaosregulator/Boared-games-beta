/**
 * Screenshot a game panel, optionally clicking through a few interactions.
 *
 *   node scripts/shootGame.mjs <gameId> <outDir> [clickSelectorText...]
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.SHOOT_BASE ?? 'http://localhost:3000';
const game = process.argv[2] ?? 'yahtzee';
const outDir = process.argv[3] ?? `/tmp/shots-${game}`;
const clicks = process.argv.slice(4);

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
await page.setViewport({ width: 1440, height: 980, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('[page exception]', e.message));
page.on('console', m => {
  if (m.type() === 'error') console.log('[page error]', m.text());
});

const wait = ms => new Promise(r => setTimeout(r, ms));

await page.goto(`${BASE}/?game=${game}`, { waitUntil: 'networkidle2' });
await wait(4000);
await page.screenshot({ path: join(outDir, 'a-open.png') });
console.log('wrote a-open.png');

let n = 0;
for (const text of clicks) {
  n += 1;
  const clicked = await page.evaluate(label => {
    const needle = label.toLowerCase();
    const nodes = Array.from(document.querySelectorAll('button'));
    const hit = nodes.find(
      b => !b.disabled && (b.textContent ?? '').toLowerCase().includes(needle),
    );
    if (hit) {
      hit.click();
      return hit.textContent?.trim().slice(0, 60) ?? 'clicked';
    }
    return null;
  }, text);
  console.log(`click "${text}" ->`, clicked ?? 'NOT FOUND');
  await wait(5200);
  await page.screenshot({ path: join(outDir, `b${n}-${text.replace(/\W+/g, '-')}.png`) });
}

await browser.close();
