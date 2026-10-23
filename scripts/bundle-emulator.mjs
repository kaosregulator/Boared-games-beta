/**
 * Build EmulatorJS's single-file bundle (data/emulator.min.js + .min.css) from
 * the vendored sources in public/emu/data/src, the same way upstream's minify
 * step does: the scripts in loader order, concatenated and minified. One file
 * instead of eight loaded one after another is most of the cartridge's load
 * time. Run again after editing anything in data/src.
 *
 *   node scripts/bundle-emulator.mjs
 */
import { transform } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const data = join(import.meta.dirname, '..', 'public', 'emu', 'data');
// the order data/loader.js loads them in
const SCRIPTS = ['emulator.js', 'nipplejs.js', 'shaders.js', 'storage.js', 'gamepad.js', 'GameManager.js', 'socket.io.min.js', 'compression.js'];

const source = SCRIPTS.map(f => `${readFileSync(join(data, 'src', f), 'utf8')}\n;`).join('\n');
const js = await transform(source, { loader: 'js', minify: true, legalComments: 'inline' });
writeFileSync(join(data, 'emulator.min.js'), js.code);
const css = await transform(readFileSync(join(data, 'emulator.css'), 'utf8'), { loader: 'css', minify: true });
writeFileSync(join(data, 'emulator.min.css'), css.code);
console.log(`emulator.min.js ${(js.code.length / 1024).toFixed(0)} KB, emulator.min.css ${(css.code.length / 1024).toFixed(0)} KB`);
