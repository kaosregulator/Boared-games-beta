/**
 * After `vite build`: write a .br and .gz copy next to every compressible file
 * in dist, at maximum compression. server.mjs hands these out as they are, so
 * every player gets small downloads and Railway spends no CPU compressing.
 *
 *   node scripts/precompress.mjs
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

const dist = join(import.meta.dirname, '..', 'dist');
// Media (mp4, jpg, webp, ktx2...) is already compressed; these are not.
const COMPRESSIBLE = new Set(['.js', '.mjs', '.css', '.html', '.json', '.svg', '.wasm', '.txt', '.md', '.glb', '.gltf', '.bin', '.webmanifest', '.xml', '.nes', '.gb', '.ttf', '.otf']);

let before = 0;
let after = 0;
let files = 0;
const walk = dir => {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    const st = statSync(file);
    if (st.isDirectory()) walk(file);
    else if (COMPRESSIBLE.has(extname(name).toLowerCase()) && st.size > 1024) {
      const raw = readFileSync(file);
      const br = brotliCompressSync(raw, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: raw.length },
      });
      // only keep it if it actually saves something
      if (br.length > raw.length * 0.92) continue;
      writeFileSync(`${file}.br`, br);
      writeFileSync(`${file}.gz`, gzipSync(raw, { level: 9 }));
      before += raw.length;
      after += br.length;
      files += 1;
    }
  }
};
walk(dist);
console.log(`precompressed ${files} files: ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB (brotli)`);
