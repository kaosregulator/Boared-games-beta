/**
 * Turns three.js's MIT Soldier.glb (examples/models/gltf/Soldier.glb) into a
 * plastic army man: textures and spare UV sets dropped (the game paints it one
 * colour), T-pose clip removed, mesh simplified, meshopt-compressed.
 *
 *   node scripts/slim-soldier.mjs Soldier.glb public/models/army-man.glb [triangles]
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, quantize, resample, simplify, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const [input, output, budget = '4200'] = process.argv.slice(2);
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});

const doc = await io.read(input);
const root = doc.getRoot();
for (const anim of root.listAnimations()) if (anim.getName() === 'TPose') anim.dispose();
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    for (const sem of prim.listSemantics()) if (sem.startsWith('TEXCOORD_')) prim.getAttribute(sem)?.dispose();
  }
}
for (const mat of root.listMaterials()) {
  mat.setBaseColorTexture(null).setNormalTexture(null).setMetallicRoughnessTexture(null).setEmissiveTexture(null).setOcclusionTexture(null);
}
for (const tex of root.listTextures()) tex.dispose();

const count = () => {
  let n = 0;
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) n += (p.getIndices()?.getCount() ?? 0) / 3;
  return n;
};
await doc.transform(weld({ tolerance: 0.0001 }));
const before = count();
await doc.transform(
  simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, Number(budget) / before), error: 0.02 }),
  resample(),
  dedup(),
  prune(),
  quantize(),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(output, doc);
console.log(`${input}: ${before} → ${count()} triangles`);
