/**
 * Squeezes a raw Tripo/Meshy GLB into a room prop: meshopt-simplified to a
 * triangle budget, textures cut to WebP (1024px, or a bigger colour map when
 * the prop is meant to be looked at up close), geometry meshopt-compressed.
 *
 *   node scripts/compress-prop.mjs in.glb public/models/out.glb [triangles] [colour px] [max error]
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { compactPrimitive, dedup, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';

const [input, output, budget = '14000', colourPx = '1024', maxError = '0.01'] = process.argv.slice(2);
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
const px = Number(colourPx);
await doc.transform(
  simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, Number(budget) / before), error: Number(maxError) }),
  dedup(),
  prune(),
);
// Tripo atlases cut the mesh into hundreds of UV islands and the careful pass
// won't collapse across their seams, so it stalls far above the budget. A
// permissive pass lets the seams move a little to get there.
if (count() > Number(budget) * 1.3) {
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      if (!idx) continue;
      const pos = prim.getAttribute('POSITION').getArray();
      const positions = pos instanceof Float32Array ? pos : new Float32Array(pos);
      const target = Math.floor((Number(budget) / count()) * idx.getCount() / 3) * 3;
      const [out] = MeshoptSimplifier.simplify(new Uint32Array(idx.getArray()), positions, 3, target, Number(maxError), ['Permissive']);
      idx.setArray(out);
      compactPrimitive(prim);
    }
  }
}
await doc.transform(
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [px, px], quality: 85, slots: /^baseColor/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82, slots: /^(?!baseColor)/ }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(output, doc);
console.log(`${input}: ${before} → ${count()} triangles`);
