/**
 * Cuts the owner's chess altar out of the wizards-chess cathedral and packs it
 * for the card table.
 *
 * The cathedral (option8_cathedral.glb, stored in that repo as gzip + base64)
 * is a whole nave: floor, walls, vault, windows, braziers. The game is played
 * on its Obsidian Altar, a stepped plinth with a gold rune inlay round the
 * board. Only those two meshes come over; the room stays the room.
 *
 * The altar sits 0.65 m off the nave's centre line; the engine moved the whole
 * cathedral by z = -0.65 so the board is at the origin. That shift is baked in
 * here, so the board centre is (0, 0, 0) and the plinth stands on y = 0.
 * Units stay the source's metres (0.34 m squares); the table scales it.
 *
 * Solid-colour textures (the gold's colour, roughness and glow, the altar's
 * glow) become material factors (prune does that); the obsidian maps and the
 * rune normal map go to WebP. Vertex colours in the source are all white and
 * are dropped. Geometry is meshopt-compressed.
 *
 *   node scripts/build-wizard-board.mjs [path/to/option8_cathedral.glb.gz.b64] [public/games/wizard/altar.glb]
 */
import { readFile, stat } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, textureCompress, transformMesh, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const [input = '../kaosregulator/wizards-chess/public/assets/glb/option8_cathedral.glb.gz.b64', output = 'public/games/wizard/altar.glb'] =
  process.argv.slice(2);
const KEEP = new Set(['Opt8_Obsidian_Altar_Table', 'Opt8_Altar_Golden_Runes']);
const SHIFT_Z = -0.65;

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});

const raw = await readFile(input);
const glb = input.endsWith('.b64') ? gunzipSync(Buffer.from(raw.toString('utf8').trim(), 'base64')) : raw;
const doc = await io.readBinary(new Uint8Array(glb.buffer, glb.byteOffset, glb.byteLength));
const root = doc.getRoot();

for (const node of root.listNodes()) {
  if (!KEEP.has(node.getName())) {
    node.dispose();
    continue;
  }
  // column-major translation by (0, 0, SHIFT_Z)
  const shift = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, SHIFT_Z, 1];
  for (const prim of node.getMesh().listPrimitives()) {
    prim.setAttribute('COLOR_0', null);
  }
  transformMesh(node.getMesh(), shift);
}
for (const anim of root.listAnimations()) anim.dispose();

await doc.transform(
  prune(),
  dedup(),
  weld({ tolerance: 0.0001 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82, slots: /^baseColor/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 85, slots: /^(?!baseColor)/ }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);

await io.write(output, doc);
let tris = 0;
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? 0) / 3;
const { size } = await stat(output);
console.log(`${output}: ${root.listMeshes().length} meshes, ${tris} triangles, ${root.listTextures().length} textures, ${(size / 1024).toFixed(0)} KB`);
