/**
 * The grey Furby's 1998 display box (a Tripo mesh the user made, ~2M
 * triangles with 4K maps). Simplified with every texture-atlas seam vertex
 * protected, like build-furby.mjs, so the printed art stays crisp; maps go
 * to 1024 px WebP and the geometry is meshopt-compressed. The clear plastic
 * window is added at runtime (FurbyBox.tsx), not baked in here.
 *
 *   node scripts/build-furby-box.mjs box.glb public/models/furby-box.glb [triangles]
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { compactPrimitive, dedup, meshopt, prune, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [input, output, budget = '30000'] = process.argv.slice(2);
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});

const doc = await io.read(input);
await doc.transform(weld({ tolerance: 0.0001 }));
for (const mesh of doc.getRoot().listMeshes())
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION').getArray();
    const idx = Uint32Array.from(prim.getIndices().getArray());
    const uv = prim.getAttribute('TEXCOORD_0').getArray();
    const remap = MeshoptSimplifier.generatePositionRemap(pos, 3);
    const shared = new Uint32Array(pos.length / 3);
    for (let v = 0; v < remap.length; v++) shared[remap[v]]++;
    const lock = new Uint8Array(pos.length / 3).map((_, v) => (shared[remap[v]] > 1 ? 2 : 0));
    const [kept, err] = MeshoptSimplifier.simplifyWithAttributes(idx, pos, 3, uv, 2, [4, 4], null, Math.floor(Number(budget)) * 3, 0.05, ['Permissive']);
    console.log(`box: ${idx.length / 3} → ${kept.length / 3} triangles (error ${err.toFixed(4)})`);
    prim.getIndices().setArray(kept);
    compactPrimitive(prim);
  }
await doc.transform(
  dedup(),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(output, doc);
