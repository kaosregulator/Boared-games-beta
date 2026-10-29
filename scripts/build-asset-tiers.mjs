/**
 * Builds Low / Medium / High versions of every room model from the original
 * Tripo/Meshy exports, so the Graphics setting changes how the room looks and
 * not only the pixel ratio.
 *
 *   node scripts/build-asset-tiers.mjs [--src assets-src] [--tiers low,medium,high]
 *                                      [--only window.glb,toyshelf.glb] [--force]
 *
 * Reads   assets-src/<model>.glb            (originals; see scripts/assets/sources.json)
 * Writes  public/models/<tier>/<model>.glb
 *         src/engine/assetTiers.json        (what the game may load per tier)
 *
 * Needs the glTF Transform CLI and KTX-Software's `toktx` on PATH for KTX2:
 *   npm i --no-save @gltf-transform/cli@4 sharp
 *   (toktx: https://github.com/KhronosGroup/KTX-Software/releases)
 * The GitHub workflow .github/workflows/asset-tiers.yml installs all of it.
 *
 * Why this replaces simplify-room-models.mjs: that script kept 2% of every
 * mesh with a 2% error tolerance, and the textures had been re-encoded as
 * ETC1S at 1536 px. Shelves lost their edges, printed art (the skateboard,
 * VHS labels, the window's street) smeared, and every preset loaded the same
 * files. Here each tier has its own budget (scripts/assets/tiers.json), the
 * error tolerance is 20 to 40 times tighter, and colour maps are UASTC.
 */
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { compactPrimitive, dedup, getBounds, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SOURCES = JSON.parse(await readFile(path.join(ROOT, 'scripts/assets/sources.json'), 'utf8')).models;
const TIERS = JSON.parse(await readFile(path.join(ROOT, 'scripts/assets/tiers.json'), 'utf8')).tiers;
const MANIFEST = path.join(ROOT, 'src/engine/assetTiers.json');
const MODELS = path.join(ROOT, 'public/models');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}
const srcDir = path.resolve(ROOT, arg('src', 'assets-src'));
const tierNames = arg('tiers', 'low,medium,high').split(',').filter(Boolean);
const only = arg('only', '') ? new Set(arg('only', '').split(',')) : null;
const force = process.argv.includes('--force');
const cli = process.env.GLTF_TRANSFORM_BIN || path.join(ROOT, 'node_modules/.bin/gltf-transform');
const tmpDir = path.join(ROOT, '.asset-tmp');

for (const t of tierNames) if (!TIERS[t]) throw new Error(`Unknown tier "${t}". Known: ${Object.keys(TIERS).join(', ')}`);

async function preflight() {
  const missing = [];
  if (!existsSync(cli)) missing.push(`glTF Transform CLI (${cli}): npm i --no-save @gltf-transform/cli@4`);
  try { await run('toktx', ['--version']); } catch { missing.push('toktx (KTX-Software) on PATH'); }
  try { await import('sharp'); } catch { missing.push('sharp: npm i --no-save sharp'); }
  if (missing.length) {
    console.error(`Missing tools:\n  - ${missing.join('\n  - ')}`);
    process.exit(1);
  }
}

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});

function triangles(doc) {
  let n = 0;
  for (const m of doc.getRoot().listMeshes()) {
    for (const p of m.listPrimitives()) {
      if (p.getMode() !== 4) continue;
      n += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION')?.getCount() ?? 0) / 3;
    }
  }
  return Math.round(n);
}

/** Box proportions, largest side = 1. Placement in the room fits one axis, so proportions are what must match. */
function proportions(doc) {
  const { min, max } = getBounds(doc.getRoot().listScenes()[0]);
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const top = Math.max(...size) || 1;
  return size.map(s => s / top);
}

/**
 * An original that isn't the same object as the model it replaces (wrong
 * Drive file, different export) would sit in the room at the wrong size. The
 * build refuses it instead. 0.12 allows for the old simplifier nibbling edges.
 */
export function sameShape(a, b, tolerance = 0.12) {
  return a.every((v, i) => Math.abs(v - b[i]) <= tolerance);
}

/** meshopt's careful pass stalls on Tripo UV seams; a permissive pass at the same tolerance finishes the job. */
function permissive(doc, budget, error) {
  const total = triangles(doc);
  if (total <= budget * 1.25) return;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      if (!idx || prim.getMode() !== 4) continue;
      const pos = prim.getAttribute('POSITION').getArray();
      const positions = pos instanceof Float32Array ? pos : new Float32Array(pos);
      const target = Math.max(3, Math.floor(((budget / total) * idx.getCount()) / 3) * 3);
      const [out] = MeshoptSimplifier.simplify(new Uint32Array(idx.getArray()), positions, 3, target, error, ['Permissive']);
      idx.setArray(out);
      compactPrimitive(prim);
    }
  }
}

async function buildOne(name, cls, tier) {
  const spec = TIERS[tier][cls];
  const source = path.join(srcDir, name);
  const doc = await io.read(source);
  await doc.transform(weld({ tolerance: 0.00005 }));
  const before = triangles(doc);
  const ratio = Math.min(1, spec.triangles / Math.max(1, before));
  if (ratio < 1) {
    await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: spec.error }));
    permissive(doc, spec.triangles, spec.error);
  }
  const sharp = (await import('sharp')).default;
  await doc.transform(
    dedup(),
    prune(),
    // Lossless PNG here; the KTX2 pass below does the real compression.
    textureCompress({ encoder: sharp, targetFormat: 'png', resize: [spec.colorPx, spec.colorPx], slots: /^baseColor/ }),
    textureCompress({ encoder: sharp, targetFormat: 'png', resize: [spec.otherPx, spec.otherPx], slots: /^(?!baseColor)/ }),
  );
  await mkdir(tmpDir, { recursive: true });
  const stage1 = path.join(tmpDir, `${tier}-${name}`);
  const stage2 = path.join(tmpDir, `${tier}-ktx-${name}`);
  await io.write(stage1, doc);

  // UASTC for every map. RDO lambda trades a little quality for a lot of file
  // size; colour maps get the gentler setting so text and art stay crisp.
  await run(cli, ['uastc', stage1, stage2, '--level', '2', '--rdo', '--rdo-lambda', tier === 'high' ? '1' : '2', '--zstd', '18']);
  const out = path.join(MODELS, tier, name);
  await mkdir(path.dirname(out), { recursive: true });
  await run(cli, ['meshopt', stage2, out, '--level', 'medium']);
  await rm(stage1, { force: true });
  await rm(stage2, { force: true });
  const after = triangles(await io.read(out));
  const kb = Math.round((await stat(out)).size / 1024);
  return { before, triangles: after, kb, colorPx: spec.colorPx };
}

async function main() {
  await preflight();
  const manifest = existsSync(MANIFEST) ? JSON.parse(await readFile(MANIFEST, 'utf8')) : { version: 1, models: {} };
  manifest.models ??= {};
  const report = [];
  for (const [name, { class: cls }] of Object.entries(SOURCES)) {
    if (only && !only.has(name)) continue;
    const source = path.join(srcDir, name);
    if (!existsSync(source)) {
      report.push(`${name}: no original at ${path.relative(ROOT, source)}, skipped`);
      continue;
    }
    const legacy = path.join(MODELS, name);
    if (existsSync(legacy) && !force) {
      const a = proportions(await io.read(source));
      const b = proportions(await io.read(legacy));
      if (!sameShape(a, b)) {
        report.push(`${name}: original's proportions ${a.map(n => n.toFixed(2))} differ from the room model's ${b.map(n => n.toFixed(2))}. Wrong Drive file? Skipped (use --force to override).`);
        continue;
      }
    }
    manifest.models[name] ??= {};
    for (const tier of tierNames) {
      try {
        const s = await buildOne(name, cls, tier);
        manifest.models[name][tier] = { triangles: s.triangles, kb: s.kb, colorPx: s.colorPx };
        report.push(`${name} ${tier}: ${s.before.toLocaleString()} → ${s.triangles.toLocaleString()} tris, ${s.colorPx}px, ${(s.kb / 1024).toFixed(1)} MB`);
      } catch (err) {
        report.push(`${name} ${tier}: FAILED ${err.message}`);
        delete manifest.models[name][tier];
      }
    }
    if (!Object.keys(manifest.models[name]).length) delete manifest.models[name];
  }
  manifest.version = 1;
  manifest.builtAt = new Date().toISOString();
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  await rm(tmpDir, { recursive: true, force: true });
  console.log(report.join('\n'));
  if (report.some(l => l.includes('FAILED'))) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  await main();
}
