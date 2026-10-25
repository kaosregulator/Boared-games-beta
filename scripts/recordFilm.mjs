/**
 * Record the menu reel (?film): the camera walks the shots in
 * src/room/FilmCamera.tsx while this script steps the clock frame by frame,
 * so the video is smooth however slowly software rendering runs. Each shot
 * fades in from black and out to black, then they're joined and encoded.
 *
 *   node scripts/recordFilm.mjs sheet  <outDir>          contact sheet: 3 stills per shot
 *   node scripts/recordFilm.mjs frames <outDir> [fps]    every frame, then public/menu/reel.mp4
 *                                                        (rerun to resume: finished shots are kept)
 *
 * Needs the dev server (SHOOT_BASE, default http://localhost:3000), ffmpeg,
 * and Playwright (PLAYWRIGHT=path/to/playwright if it isn't installed here).
 */
import { existsSync, mkdirSync, renameSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const BASE = process.env.SHOOT_BASE ?? 'http://localhost:3000';
const mode = process.argv[2] ?? 'sheet';
const outDir = process.argv[3] ?? '/tmp/film';
const fps = Number(process.argv[4] ?? 24);
const W = Number(process.env.WIDTH ?? 1920);
const H = Number(process.env.HEIGHT ?? 1080);
/** The room renders at this pixel ratio and the screenshot keeps the page size: supersampled, so edges and textures stay clean. */
const DPR = Number(process.env.DPR ?? 1.5);
/** Seconds of fade at each end of every shot. */
const FADE_IN = 0.6;
const FADE_OUT = 0.7;

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'],
});
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', e => console.log('[page exception]', e.message));
await page.addInitScript(() => {
  window.__tourTime = 0;
  // High graphics, no stepping down because software rendering is slow.
  try {
    localStorage.setItem('engine:graphics-preset', 'high');
    localStorage.setItem('engine:graphics-adaptive', '0');
  } catch {}
});
await page.goto(`${BASE}/?film=1&capture=1&dpr=${DPR}`);
// just the room: hide every overlay
await page.addStyleTag({ content: '[data-room] > *:not(:first-child) { display: none !important; }' });
await page.waitForFunction(() => typeof window.__renderTour === 'function' && Array.isArray(window.__filmCuts), null, { timeout: 60000 });
// let every model and texture arrive
await page.waitForTimeout(Number(process.env.SETTLE ?? 25000));

const cuts = await page.evaluate(() => window.__filmCuts);
const frame = async (t, file) => {
  await page.waitForFunction(() => typeof window.__renderTour === 'function');
  await page.evaluate(time => window.__renderTour(time), t);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.screenshot({ path: file, type: 'jpeg', quality: 97 });
};

if (mode === 'sheet') {
  for (const [i, cut] of cuts.entries()) {
    for (const [j, f] of [0.08, 0.5, 0.95].entries()) {
      await frame(cut.start + (cut.end - cut.start) * f, join(outDir, `s${i}-${j}.jpg`));
    }
    console.log('shot', i, cut.label);
  }
  await browser.close();
  process.exit(0);
}

// every frame, shot by shot
const parts = [];
for (const [i, cut] of cuts.entries()) {
  const dir = join(outDir, `shot${i}`);
  const part = join(outDir, `shot${i}.mp4`);
  // a run that was interrupted picks up after the shots it already finished
  if (existsSync(part)) {
    parts.push(part);
    continue;
  }
  mkdirSync(dir, { recursive: true });
  const count = Math.round((cut.end - cut.start) * fps);
  for (let n = 0; n < count; n += 1) {
    await frame(cut.start + n / fps, join(dir, `f${String(n).padStart(4, '0')}.jpg`));
    if (n % 48 === 0) console.log(`shot ${i} ${cut.label}: ${n}/${count}`);
  }
  const dur = count / fps;
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(dir, 'f%04d.jpg'),
    '-vf', `fade=t=in:st=0:d=${FADE_IN},fade=t=out:st=${(dur - FADE_OUT).toFixed(3)}:d=${FADE_OUT}`,
    '-c:v', 'libx264', '-crf', '10', '-preset', 'medium', '-pix_fmt', 'yuv420p', `${part}.tmp.mp4`,
  ]);
  renameSync(`${part}.tmp.mp4`, part);
  parts.push(part);
}
await browser.close();

const list = join(outDir, 'parts.txt');
writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'));
const target = join(import.meta.dirname, '..', 'public', 'menu');
mkdirSync(target, { recursive: true });
// web copy: full HD at high quality (CRF 18 keeps the shelf's fine detail), and it starts
// playing before it's fully downloaded
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
  '-c:v', 'libx264', '-crf', process.env.CRF ?? '18', '-preset', 'slow', '-tune', 'film', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  '-movflags', '+faststart', '-an', join(target, 'reel.mp4'),
]);
// first frame after the opening fade, shown while the video loads
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1.2', '-i', join(target, 'reel.mp4'), '-frames:v', '1', '-q:v', '2', join(target, 'reel-poster.jpg')]);
if (!process.env.KEEP_FRAMES) for (let i = 0; i < cuts.length; i += 1) rmSync(join(outDir, `shot${i}`), { recursive: true, force: true });
console.log('wrote public/menu/reel.mp4 and reel-poster.jpg');
