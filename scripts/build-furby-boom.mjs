/**
 * The dancing Furby Boom for the back of the table (a Sketchfab rig with its
 * own box and one dance clip, uploaded by the user). Drops the wooden ground
 * plane it came standing on, simplifies, and squeezes textures to WebP.
 *
 *   node scripts/build-furby-boom.mjs furby_boom.glb public/models/furby-boom.glb
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, simplify, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [input, output] = process.argv.slice(2);
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});
const doc = await io.read(input);
const drop = node => {
  node.listChildren().forEach(drop);
  node.dispose();
};
doc.getRoot().listNodes().filter(n => n.getName() === 'ground_60').forEach(drop);
await doc.transform(
  weld({ tolerance: 0.0001 }),
  simplify({ simplifier: MeshoptSimplifier, ratio: 0.5, error: 0.004 }),
  dedup(),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(output, doc);
