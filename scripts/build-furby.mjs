/**
 * Builds public/models/furby.glb from the two Furby meshes the user made in
 * Tripo: the textured plush (one 1.9M-triangle mesh) and the same Furby split
 * into blank parts (body, face, two ears, two feet).
 *
 *  - The plush is simplified with meshopt's Permissive mode, with every
 *    texture-atlas seam vertex protected so no triangle ends up spanning two
 *    UV islands (that smears stripes of the atlas across the fur). Tripo's
 *    atlas has hundreds of islands, so this bottoms out near 130k triangles.
 *  - Every kept vertex is tagged with the part it sits on (nearest vertex of
 *    the parts mesh) as a custom `_PART` attribute. The runtime rig
 *    (src/room/furby/furbyRig.ts) skins ears, beak and tuft from it.
 *  - Colour map 2048 px (it is held right up to the camera), normal 1024,
 *    roughness 512, all WebP, geometry meshopt-compressed.
 *
 *   node scripts/build-furby.mjs plush.glb pieces.glb public/models/furby.glb [triangles]
 */
import { Accessor, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { compactPrimitive, dedup, meshopt, prune, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [input, piecesIn, output, budget = '50000'] = process.argv.slice(2);
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});

const doc = await io.read(input);
await doc.transform(weld({ tolerance: 0.0001 }));
const prim = doc.getRoot().listMeshes()[0].listPrimitives()[0];
const pos = prim.getAttribute('POSITION').getArray();
const idx = Uint32Array.from(prim.getIndices().getArray());
const before = idx.length / 3;
const uv = prim.getAttribute('TEXCOORD_0').getArray();
const remap = MeshoptSimplifier.generatePositionRemap(pos, 3);
const shared = new Uint32Array(pos.length / 3);
for (let v = 0; v < remap.length; v++) shared[remap[v]]++;
// 2 = meshopt_SimplifyVertex_Protect: never collapsed across an attribute seam.
const lock = new Uint8Array(pos.length / 3).map((_, v) => (shared[remap[v]] > 1 ? 2 : 0));
const target = Math.floor(Number(budget)) * 3;
const [kept, err] = MeshoptSimplifier.simplifyWithAttributes(idx, pos, 3, uv, 2, [1, 1], lock, target, 0.05, ['Permissive']);
prim.getIndices().setArray(kept);
compactPrimitive(prim);
console.log(`plush: ${before} → ${kept.length / 3} triangles (error ${err.toFixed(4)})`);

// Part labels from the split mesh, ordered as Tripo exported them.
const pieces = await io.read(piecesIn);
const PART_NAMES = ['body', 'earL', 'footL', 'face', 'earR', 'footR'];
const cell = 0.02;
const grid = new Map();
const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
pieces.getRoot().listNodes().forEach(node => {
  const mesh = node.getMesh();
  if (!mesh) return;
  const part = Number(node.getName().replace('tripo_part_', ''));
  const m = node.getWorldMatrix();
  const arr = mesh.listPrimitives()[0].getAttribute('POSITION').getArray();
  for (let i = 0; i < arr.length; i += 3 * 7) {
    const x = arr[i], y = arr[i + 1], z = arr[i + 2];
    const wx = m[0] * x + m[4] * y + m[8] * z + m[12];
    const wy = m[1] * x + m[5] * y + m[9] * z + m[13];
    const wz = m[2] * x + m[6] * y + m[10] * z + m[14];
    const k = key(wx, wy, wz);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(wx, wy, wz, part);
  }
});
const p2 = prim.getAttribute('POSITION').getArray();
const labels = new Float32Array(p2.length / 3);
const counts = new Array(PART_NAMES.length).fill(0);
for (let v = 0; v < labels.length; v++) {
  const x = p2[v * 3], y = p2[v * 3 + 1], z = p2[v * 3 + 2];
  let best = Infinity, part = 0;
  const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
  for (let r = 1; r <= 4 && best === Infinity; r++)
    for (let i = -r; i <= r; i++)
      for (let j = -r; j <= r; j++)
        for (let k = -r; k <= r; k++) {
          const list = grid.get(`${cx + i},${cy + j},${cz + k}`);
          if (!list) continue;
          for (let n = 0; n < list.length; n += 4) {
            const d = (list[n] - x) ** 2 + (list[n + 1] - y) ** 2 + (list[n + 2] - z) ** 2;
            if (d < best) { best = d; part = list[n + 3]; }
          }
        }
  labels[v] = part;
  counts[part]++;
}
prim.setAttribute('_PART', doc.createAccessor('part').setType(Accessor.Type.SCALAR).setArray(labels).setBuffer(doc.getRoot().listBuffers()[0]));
console.log('vertices per part', Object.fromEntries(PART_NAMES.map((n, i) => [n, counts[i]])));

await doc.transform(
  dedup(),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048], quality: 84, slots: /^baseColor/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82, slots: /^normal/ }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 80, slots: /^metallicRoughness/ }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(output, doc);
