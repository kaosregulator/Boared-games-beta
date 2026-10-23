/** Prints triangles, textures and the bounding box of a GLB:  node scripts/inspect-glb.mjs file.glb */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule(), 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
let tris = 0;
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
console.log('meshes', root.listMeshes().length, 'tris', tris, 'materials', root.listMaterials().length);
for (const t of root.listTextures()) console.log('tex', t.getMimeType(), t.getSize(), t.getImage()?.byteLength);
console.log('ext', root.listExtensionsUsed().map(e => e.extensionName));
console.log('bounds', JSON.stringify(getBounds(root.listScenes()[0])));
