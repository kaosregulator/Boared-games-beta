/**
 * Screenshot one URL after a settle delay.
 *
 *   node scripts/shootUrl.mjs "<query>" <outFile> [waitMs]
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const BASE = process.env.SHOOT_BASE ?? 'http://localhost:3000';
const query = process.argv[2] ?? '';
const out = process.argv[3] ?? '/tmp/shot.png';
const waitMs = Number(process.argv[4] ?? 5000);

mkdirSync(dirname(out), { recursive: true });

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
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
page.on('pageerror', e => console.log('[page exception]', e.message));
await page.goto(`${BASE}/${query}`, { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, waitMs));
await page.screenshot({ path: out });
console.log('wrote', out);
await browser.close();
