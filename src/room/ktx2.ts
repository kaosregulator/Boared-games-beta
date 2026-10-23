import * as THREE from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

/**
 * The room's models carry KTX2 (Basis UASTC) textures. Those stay compressed
 * on the GPU, so a 1536px texture costs ~3 MB of graphics memory instead of
 * ~12 MB as a plain image. Uncompressed, the room needed close to a gigabyte,
 * which is what made phones (and some laptops) kill the tab.
 *
 * The transcoder is self-hosted in /basis. Detecting which GPU formats this
 * device supports needs a renderer; a throwaway one is made once, so models
 * can start loading before (or outside) the main canvas.
 */
let loader: KTX2Loader | null = null;

function ktx2(): KTX2Loader {
  if (loader) return loader;
  loader = new KTX2Loader().setTranscoderPath('/basis/');
  const probe = new THREE.WebGLRenderer({ canvas: document.createElement('canvas'), antialias: false, alpha: false });
  loader.detectSupport(probe);
  probe.dispose();
  probe.forceContextLoss();
  return loader;
}

/** Pass as the 4th argument to drei's useGLTF / useGLTF.preload. */
// Typed structurally: drei hands over three-stdlib's GLTFLoader, not three's.
export function withKtx2(gltf: { setKTX2Loader(loader: unknown): unknown }) {
  gltf.setKTX2Loader(ktx2());
}
