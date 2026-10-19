/**
 * Tripo exports in public/models are Draco meshes of 300k–700k triangles each.
 * Loading all of them (~14 million triangles) exhausts the tab: the canvas
 * stays black while they decode, then the page crashes. This rewrites every
 * GLB down to a room-scale mesh the browser can actually draw.
 *
 *   node scripts/simplify-room-models.mjs
 */
import { readdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { EXTTextureWebP, KHRDracoMeshCompression, KHRMaterialsVolume } from '@gltf-transform/extensions';
import { dedup, prune, simplify, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';

const DIR = path.resolve('public/models');

function triangles(doc) {
  let count = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const index = prim.getIndices();
      if (index) count += index.getCount() / 3;
      else count += (prim.getAttribute('POSITION')?.getCount() ?? 0) / 3;
    }
  }
  return Math.round(count);
}

const readIO = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression, EXTTextureWebP, KHRMaterialsVolume])
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
  });
// Write plain geometry. Registering Draco here makes the writer demand an encoder
// and would put the 14-million-triangle problem back in the browser.
const writeIO = new NodeIO().registerExtensions([EXTTextureWebP, KHRMaterialsVolume]);

await MeshoptSimplifier.ready;

const files = (await readdir(DIR)).filter(name => name.endsWith('.glb')).sort();
for (const name of files) {
  const file = path.join(DIR, name);
  const beforeBytes = (await stat(file)).size;
  const doc = await readIO.read(file);
  const before = triangles(doc);
  await doc.transform(
    weld({ tolerance: 0.0001 }),
    simplify({ simplifier: MeshoptSimplifier, ratio: 0.02, error: 0.02 }),
    dedup(),
    prune(),
  );
  const tmp = `${file}.tmp.glb`;
  await writeIO.write(tmp, doc);
  await rename(tmp, file);
  const afterBytes = (await stat(file)).size;
  console.log(
    `${name}: ${before.toLocaleString()} → ${triangles(doc).toLocaleString()} tris, ${(beforeBytes / 1e6).toFixed(1)}MB → ${(afterBytes / 1e6).toFixed(1)}MB`,
  );
}
