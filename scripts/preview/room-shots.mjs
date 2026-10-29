/**
 * Screenshots of the real room, pointed at chosen hotspots, with the mouse on
 * them so the hover glow and name card show. For checking visual changes in a
 * pull request without a GPU: headless Chromium on SwiftShader.
 *
 *   node --import tsx scripts/preview/room-shots.mjs [base url]
 *
 * Reads the hotspot ids from scripts/preview/room-shots.json and writes
 * docs/room-shots/<id>.png. The server must already be running (npm run build
 * && node server.mjs).
 */
import fs from 'node:fs';
import { chromium } from 'playwright';
import { LAYOUT } from '../../src/room/roomLayout.ts';
import { HOTSPOTS } from '../../src/room/hotspots.ts';

const base = process.argv[2] ?? 'http://127.0.0.1:3000';
const { ids, cards = [], extra = '' } = JSON.parse(fs.readFileSync('scripts/preview/room-shots.json', 'utf8'));
fs.mkdirSync('docs/room-shots', { recursive: true });

/** World centre of a hotspot and the direction its prop faces. */
function locate(id) {
  for (const [prop, spots] of Object.entries(HOTSPOTS)) {
    const spot = spots?.find(s => s.id === id);
    if (!spot) continue;
    const p = LAYOUT[prop];
    const ry = p.rotY ?? 0;
    const [x, y, zf] = spot.at;
    const z = zf - spot.size[2] / 2;
    const cx = p.x + x * Math.cos(ry) + z * Math.sin(ry);
    const cz = p.z - x * Math.sin(ry) + z * Math.cos(ry);
    return { centre: [cx, y, cz], front: [Math.sin(ry), 0, Math.cos(ry)] };
  }
  return null;
}

const logLines = [];
const log = line => {
  console.log(line);
  logLines.push(line);
  fs.writeFileSync('docs/room-shots/log.txt', logLines.join('\n') + '\n');
};
process.on('uncaughtException', e => {
  log(`[fatal] ${e.stack ?? e}`);
  process.exit(1);
});

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
/** One shot in a fresh page, with generous timeouts: software WebGL is slow. */
async function shoot(name, query, hover) {
  const page = await browser.newPage({ viewport: { width: 1024, height: 640 } });
  page.setDefaultTimeout(240_000);
  page.on('pageerror', e => log(`[page] ${e.message}`));
  page.on('console', m => m.type() === 'error' && log(`[console] ${m.text().slice(0, 300)}`));
  try {
    await page.goto(`${base}/${query}${extra}`, { waitUntil: 'domcontentloaded' });
    // Models stream in; software rendering is slow. Wait for the room to settle.
    await page.waitForTimeout(40_000);
    if (hover) {
      await page.mouse.move(512, 320);
      await page.mouse.move(513, 321);
      await page.waitForTimeout(4_000);
    }
    await page.screenshot({ path: `docs/room-shots/${name}.png`, timeout: 240_000 });
    log(`shot ${name}`);
  } catch (e) {
    log(`[shot ${name}] ${e.message.split('\n')[0]}`);
  } finally {
    await page.close().catch(() => {});
  }
}

function camFor(id) {
  const spot = locate(id);
  if (!spot) return null;
  const [cx, cy, cz] = spot.centre;
  const [fx, , fz] = spot.front;
  const at = [cx + fx * 0.75, cy + 0.32, cz + fz * 0.75].map(n => n.toFixed(3));
  const look = [cx, cy, cz].map(n => n.toFixed(3));
  return [...at, ...look].join(',');
}

for (const id of ids) {
  const cam = camFor(id);
  if (!cam) log(`no hotspot ${id}`);
  else await shoot(id, `?cam=${cam}`, true);
}
// Open time capsules: ?card= opens the card for that hotspot.
for (const id of cards) {
  const cam = camFor(id);
  await shoot(`${id}-card`, `?${cam ? `cam=${cam}&` : ''}card=${encodeURIComponent(id)}`, false);
}
await browser.close();
