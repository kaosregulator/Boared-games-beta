/**
 * Builds public/models/poochi-statue.glb, the Poo-Chi that sits on the
 * dresser, from the user's unrigged mesh (base.glb: about 1M triangles, no
 * bones, and no colour at all, just grey).
 *
 * That mesh is put together from 35,000 separate pieces (each panel, joint
 * cap and ear is its own closed shell), so it is painted piece by piece to
 * match the rigged toy's materials: silver metallic plastic for the body,
 * the see-through teal plastic for the ears and the shoulder and hip caps,
 * the dark red visor over the eyes and a black nose. Each piece is sorted by
 * where its bounds sit on the dog (see `paint`).
 *
 * Then the whole thing is meshopt-simplified to the triangle budget and
 * compressed.
 *
 *   node scripts/build-poochi-statue.mjs base.glb public/models/poochi-statue.glb [triangles]
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, simplify, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const [input, output, budget = '90000'] = process.argv.slice(2);
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});

const doc = await io.read(input);
await doc.transform(weld({ tolerance: 0.00001 }));
const root = doc.getRoot();
const mesh = root.listMeshes()[0];
const prim = mesh.listPrimitives()[0];
const pos = prim.getAttribute('POSITION').getArray();
const idx = prim.getIndices().getArray();
const nv = pos.length / 3;

// Pieces: connected components over the triangles.
const parent = new Int32Array(nv).map((_, i) => i);
const find = a => {
  while (parent[a] !== a) a = parent[a] = parent[parent[a]];
  return a;
};
for (let t = 0; t < idx.length; t += 3) {
  const a = find(idx[t]);
  parent[find(idx[t + 1])] = a;
  parent[find(idx[t + 2])] = a;
}
const pieces = new Map();
for (let v = 0; v < nv; v++) {
  const r = find(v);
  let b = pieces.get(r);
  if (!b) pieces.set(r, (b = { n: 0, min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }));
  b.n++;
  for (let i = 0; i < 3; i++) {
    b.min[i] = Math.min(b.min[i], pos[v * 3 + i]);
    b.max[i] = Math.max(b.max[i], pos[v * 3 + i]);
  }
}

/**
 * Which plastic a piece is. Axes: x across the dog, up = glTF y (0 at the
 * feet, 1.71 at the top of the head), back = -glTF z (the snout is at -0.94,
 * the tail end at +0.85).
 */
function paint(b) {
  const x0 = b.min[0];
  const x1 = b.max[0];
  const up0 = b.min[1];
  const up1 = b.max[1];
  const bk0 = -b.max[2];
  const bk1 = -b.min[2];
  const cx = (x0 + x1) / 2;
  const cup = (up0 + up1) / 2;
  const cbk = (bk0 + bk1) / 2;
  const dx = x1 - x0;
  const dup = up1 - up0;
  const dbk = bk1 - bk0;
  // The ears: the big flaps hanging either side of the head.
  if (up0 > 0.98 && (x0 > 0.22 || x1 < -0.22) && cbk > -0.6) return 'teal';
  // The visor: the plate across the front of the head, over the eyes.
  if (up0 > 1.3 && bk1 < -0.4 && bk0 > -0.65 && Math.abs(cx) < 0.1 && dx > 0.3) return 'visor';
  // The nose, at the tip of the snout.
  if (bk0 < -0.86 && up0 > 1.12 && dx < 0.2 && dup < 0.12) return 'black';
  // The round caps over the shoulders and hips.
  if (cup > 0.28 && cup < 0.92 && Math.abs(cx) > 0.28 && dup > 0.12 && Math.abs(dbk - dup) < 0.15 && b.n > 1500) return 'teal';
  return 'silver';
}

const LOOK = {
  silver: { color: [0.55, 0.55, 0.56, 1], metal: 1, rough: 0.38 },
  teal: { color: [0.03, 0.34, 0.48, 1], metal: 0, rough: 0.22 },
  visor: { color: [0.08, 0.0, 0.0, 1], metal: 0, rough: 0.05 },
  black: { color: [0.015, 0.015, 0.015, 1], metal: 0, rough: 0.25 },
};
const tris = { silver: [], teal: [], visor: [], black: [] };
const kinds = new Map([...pieces].map(([r, b]) => [r, paint(b)]));
for (let t = 0; t < idx.length; t += 3) tris[kinds.get(find(idx[t]))].push(idx[t], idx[t + 1], idx[t + 2]);

const total = idx.length / 3;
const buffer = root.listBuffers()[0];
for (const [kind, list] of Object.entries(tris)) {
  if (!list.length) continue;
  const p = prim.clone();
  p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(list)).setBuffer(buffer));
  const L = LOOK[kind];
  p.setMaterial(doc.createMaterial(`Poochi_${kind}`).setBaseColorFactor(L.color).setMetallicFactor(L.metal).setRoughnessFactor(L.rough));
  mesh.addPrimitive(p);
  console.log(kind, list.length / 3, 'triangles in', [...kinds.values()].filter(k => k === kind).length, 'pieces');
}
mesh.removePrimitive(prim);
prim.dispose();
await doc.transform(
  simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, Number(budget) / total), error: 0.002 }),
  dedup(),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
let after = 0;
for (const p of mesh.listPrimitives()) after += p.getIndices().getCount() / 3;
await io.write(output, doc);
console.log(`${total} → ${after} triangles`);
