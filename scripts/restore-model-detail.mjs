/**
 * Puts the detail back into the room's furniture and props.
 *
 * On Oct 19 (commit 57cabf3) simplify-room-models.mjs cut every Tripo model
 * to 2% of its triangles with a 2% error tolerance, and a later pass stored
 * the colour maps as ETC1S. The full-detail versions are still in git history
 * (commits dfdf1ae and 403a29b, 300k-725k triangles each). This re-cuts those
 * versions gently and writes them over the current files:
 *
 *   - big furniture keeps up to 80k triangles, close-up props (Game Boy,
 *     cards, VHS, NES, boombox, army men) 50k, small props 25k, all at a
 *     0.1% error tolerance instead of 2%;
 *   - colour maps stay at the source's 1536 px but as KTX2 UASTC (sharp,
 *     still GPU-compressed, so graphics memory is the same as today);
 *   - geometry is meshopt-compressed, so downloads stay small.
 *
 *   node scripts/restore-model-detail.mjs [window.glb,toyshelf.glb]
 *
 * Needs full git history, the glTF Transform CLI and toktx (KTX-Software);
 * .github/workflows/restore-model-detail.yml provides all three.
 */
import { execFileSync, execFile } from 'node:child_process';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { compactPrimitive, dedup, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';

const run = promisify(execFile);
const CLI = path.resolve('node_modules/.bin/gltf-transform');
const TMP = path.resolve('.restore-tmp');

const BUDGET = { hero: 80_000, closeup: 50_000, prop: 25_000 };
const ERROR = 0.001;

/**
 * Room model -> [detail class, git blob of its full-detail version, overrides].
 * Overrides: drive (a public Google Drive file id of the original export, used
 * instead of the blob), triangles and colorPx.
 */
export const SOURCES = {
  'bed.glb': ['hero', '9114c7efe61040bdd108ce48feaed8971ecde986'],
  'shelf.glb': ['hero', '68ad1e44dd1b1d5241d91569211406b3a7de4d1f'],
  'crt.glb': ['hero', 'e81de2f1100e474f1b0680e8017acd27b3fa6697'],
  'dresser.glb': ['hero', '280bcedea718dfb5284086c3df9c2d360a471fb9'],
  'nightstand.glb': ['hero', 'a60698aa37e7badef0e6d958a0978594e23ca68b'],
  'window.glb': ['hero', 'b0a81e4972090d1666efacd3ac1ee36fe3a4e03d'],
  // The toy shelf is looked at up close (the bins by the skateboard), so it gets
  // the original export at 4096 px and more triangles than the rest.
  'toyshelf.glb': ['hero', '7b828bbfb89cbd06ead0b5ad042919c0bd804841', { drive: '1TdoaDHGeEtCGL5zB6gmEYvMsyhH9ERtO', triangles: 240_000, colorPx: 4096 }],
  'door.glb': ['hero', 'e174800cd86a24396d369f9d208c49122b454537'],
  'clutterdesk.glb': ['hero', '2501e3b54c6c590dbe6141eba7d81948cf984bad'],
  'gameboy.glb': ['closeup', 'c6edd2e43d7eb248ceee4b1240573ed6e8586d72'],
  'cards.glb': ['closeup', 'e75d09991da07b9d5772813e996daf04fb6d7158'],
  'vhs_stack.glb': ['closeup', 'efc21e0930c39a86fcc828c549c9b89f1a0421e8'],
  'vhs_loose.glb': ['closeup', 'a86e1655fabe192aaefe8a2967c3837d93090882'],
  'nes.glb': ['closeup', 'dd147f81364958ce1413df12bf4a7cf7e404c449'],
  'boombox.glb': ['closeup', 'ee0fcf7392d5dd7bf452415e5dc3c7f9eb2dec45'],
  'army.glb': ['closeup', 'c5becd7caedd80749a90b5c20347063242fbbe76'],
  'armor.glb': ['prop', 'ab94dcab038e5cbf45636d4e3e24d748d3a48029'],
  'backpack.glb': ['prop', '29bd49156f63bd7214902323a35eb1f74417f235'],
  'battleship.glb': ['prop', 'e1873be34f51a04fcd9d971309ff06cae9e3f492'],
  'board.glb': ['prop', '25fca40186a8f3d2e8aaa1c5a21f5e68296f189e'],
  'books.glb': ['prop', 'eaa4783f488bf1b44691680ae1e4a992fe686169'],
  'car.glb': ['prop', '010e686342acdd577985bebea0b9298fc894fe3c'],
  'clue.glb': ['prop', 'f3a93a7f8a2f935ca2eda72a63d3158d4be54e1d'],
  'gushers.glb': ['prop', '682f7bc79649555e228e17036c8e21076b6dc254'],
  'hotpockets.glb': ['prop', '3dc02f125a389d2ee6a46845b42ce114d31a454a'],
  'jordans.glb': ['prop', '589c825a1625b3dc55571db9c205452d0c38cd27'],
  'life.glb': ['prop', 'ec4e49be9f94a2df3c594da365533ea370d27754'],
  'rubik.glb': ['prop', 'bd6cf4eeee58cd07f428651ab6de1d689c375803'],
  'teddy.glb': ['prop', '7fdefbcf815753d307c28f0b8e8bd7974e19c370'],
  'yahtzee.glb': ['prop', 'f0e5f4642ec9d6071e38b7f34768b6aa6768bd4f'],
};

function triangles(doc) {
  let n = 0;
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) n += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
  return Math.round(n);
}

/** meshopt's careful pass stops at Tripo's UV seams; a permissive pass at the same tolerance reaches the budget. */
function permissive(doc, budget) {
  const total = triangles(doc);
  if (total <= budget * 1.2) return;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      if (!idx) continue;
      const pos = prim.getAttribute('POSITION').getArray();
      const target = Math.max(3, Math.floor(((budget / total) * idx.getCount()) / 3) * 3);
      const [out] = MeshoptSimplifier.simplify(new Uint32Array(idx.getArray()), new Float32Array(pos), 3, target, ERROR, ['Permissive']);
      idx.setArray(out);
      compactPrimitive(prim);
    }
  }
}

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});

const only = process.argv[2] ? new Set(process.argv[2].split(',')) : null;
await mkdir(TMP, { recursive: true });
let failed = 0;
for (const [file, [cls, blob, extra = {}]] of Object.entries(SOURCES)) {
  if (only && !only.has(file)) continue;
  const src = path.join(TMP, `src-${file}`);
  const stage1 = path.join(TMP, `s1-${file}`);
  const stage2 = path.join(TMP, `s2-${file}`);
  const out = path.join('public/models', file);
  try {
    if (extra.drive) {
      // Public file: Drive's direct download endpoint, confirm=t skips the large-file warning page.
      const url = `https://drive.usercontent.google.com/download?id=${extra.drive}&export=download&confirm=t`;
      execFileSync('curl', ['-sSL', '--fail', '-o', src, url]);
      const head = (await import('node:fs')).readFileSync(src).subarray(0, 4).toString();
      if (head !== 'glTF') throw new Error(`Drive returned something other than a GLB for ${file}`);
    } else {
      await writeFile(src, execFileSync('git', ['cat-file', 'blob', blob], { maxBuffer: 1 << 30 }));
    }
    const budget = extra.triangles ?? BUDGET[cls];
    const colorPx = extra.colorPx ?? 1536;
    const doc = await io.read(src);
    await doc.transform(weld({ tolerance: 0.00005 }));
    const before = triangles(doc);
    await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, budget / before), error: ERROR }));
    permissive(doc, budget);
    // Draco off: the room loads meshopt geometry. PNG here is only a lossless hand-off to the KTX2 pass.
    for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName === 'KHR_draco_mesh_compression') ext.dispose();
    await doc.transform(
      dedup(),
      prune(),
      textureCompress({ encoder: sharp, targetFormat: 'png', resize: [colorPx, colorPx], slots: /^baseColor/ }),
      textureCompress({ encoder: sharp, targetFormat: 'png', resize: [1024, 1024], slots: /^(?!baseColor)/ }),
    );
    await io.write(stage1, doc);
    await run(CLI, ['uastc', stage1, stage2, '--level', '2', '--rdo', '--rdo-lambda', '1', '--zstd', '18'], { maxBuffer: 1 << 26 });
    await run(CLI, ['meshopt', stage2, out, '--level', 'medium'], { maxBuffer: 1 << 26 });
    const after = triangles(await io.read(out));
    const line = `${file}: ${before.toLocaleString()} -> ${after.toLocaleString()} tris, ${((await stat(out)).size / 1e6).toFixed(1)} MB`;
    console.log(line);
    console.log(`::notice::${line}`);
  } catch (err) {
    failed += 1;
    console.log(`::error::${file}: ${String(err.message).split('\n')[0]}`);
  } finally {
    for (const f of [src, stage1, stage2]) await rm(f, { force: true });
  }
}
await rm(TMP, { recursive: true, force: true });
if (failed) process.exitCode = 1;
