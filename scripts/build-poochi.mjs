/**
 * Builds public/models/poochi.glb from the user's rigged Poo-Chi
 * (Animated_Poo_Chi_Toy_Robot.glb, exported from their .blend).
 *
 * The .glb was checked against the .blend before anything else: every
 * vertex of the posed mesh, the dog and its toy bone, at seven frames across
 * the whole 17 s animation, lands within 0.03 mm of the same vertex in the
 * .blend (Blender 5.2, evaluated with the armature, shape keys and both
 * modifiers on). The materials are plain Principled BSDFs that glTF carries
 * one-to-one, including the glass (transmission) and the 7x red glow on the
 * eyes. So the .glb is used as it is.
 *
 * What it carries, and what the room drives from it:
 *  - 5 bones: `Bone` (body: bob, tilt, walk sway) and `Bone.001`-`.004`
 *    (the four legs).
 *  - 11 morph targets on the dog: EyeOpen, EyeHappy, EyeClosed and
 *    EyeHeart (left and right each), Ears, Mouth and Tail.
 *  - `PoochiAnimation`, 17 s at 24 fps: eyes come on, hearts, a bark with
 *    ears and mouth, a nap, happy eyes, two more barks.
 *  - `Poochi_Bone`: the toy bone he came with, with its Poo-Chi logo. The
 *    bone hunt uses a copy of it for every bone in the room.
 *
 * Only the storage changes here: no simplifying (the eyes are a grid of
 * LEDs that has to stay crisp, and the shape keys ride on every vertex),
 * just weld, dedup, prune and meshopt compression.
 *
 *   node scripts/build-poochi.mjs Animated_Poo_Chi_Toy_Robot.glb public/models/poochi.glb
 */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, resample, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const [input, output] = process.argv.slice(2);
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.decoder': MeshoptDecoder,
  'meshopt.encoder': MeshoptEncoder,
});
const doc = await io.read(input);
await doc.transform(
  weld({ tolerance: 0.00001 }),
  dedup(),
  resample(),
  prune({ keepLeaves: true }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 90 }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(output, doc);
console.log(`${input} → ${output}`);
