/**
 * Renders each restored model next to the version on main and saves the
 * pair to docs/model-previews/<model>.png, so the difference can be checked
 * by eye in the pull request.
 *
 *   node scripts/preview/render-previews.mjs window.glb toyshelf.glb ...
 *
 * Needs playwright with Chromium (CI installs it) and three from node_modules.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('.');
const before = path.resolve('.preview-before');
fs.mkdirSync(before, { recursive: true });
fs.mkdirSync('docs/model-previews', { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary' };
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = p.startsWith('/before/') ? path.join(before, p.slice(8)) : path.join(root, p);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 520 } });
for (const file of process.argv.slice(2)) {
  fs.writeFileSync(path.join(before, file), execFileSync('git', ['show', `origin/main:public/models/${file}`], { maxBuffer: 1 << 28 }));
  const url = `${base}/scripts/preview/viewer.html?a=/before/${file}&la=${encodeURIComponent(`before (main): ${file}`)}&b=/public/models/${file}&lb=${encodeURIComponent(`after: ${file}`)}`;
  await page.goto(url);
  await page.waitForFunction(() => document.body.dataset.done, null, { timeout: 120_000 });
  const state = await page.evaluate(() => [document.body.dataset.done, document.body.dataset.error]);
  if (state[0] !== '1') {
    console.log(`::error::preview ${file}: ${state[1]}`);
    continue;
  }
  await page.screenshot({ path: `docs/model-previews/${file.replace('.glb', '.png')}` });
  console.log(`preview ${file}`);
}
await browser.close();
server.close();
fs.rmSync(before, { recursive: true, force: true });
