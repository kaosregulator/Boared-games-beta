/**
 * Squeezes a raw Tripo/Meshy GLB into a room prop: meshopt-simplified to a
 * triangle budget, textures cut to 1024px WebP, geometry meshopt-compressed.
 *
 *   node scripts/compress-prop.mjs in.glb public/models/out.glb [triangles]
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';

const [input, output, budget = '14000'] = process.argv.slice(2);
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});

const doc = await io.read(input);
const count = () => {
  let n = 0;
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) n += (p.getIndices()?.getCount() ?? 0) / 3;
  return n;
};
await doc.transform(weld({ tolerance: 0.0001 }));
const before = count();
await doc.transform(
  simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, Number(budget) / before), error: 0.01 }),
  dedup(),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(output, doc);
console.log(`${input}: ${before} → ${count()} triangles`);
