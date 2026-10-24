import { clear, peek } from 'suspend-react';
import { GLTFLoader } from 'three-stdlib';
import * as THREE from 'three';
import { attachResourceCache } from './cache';

const MAPS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap'] as const;

function disposeGltf(value: unknown) {
  const scene = (value as { scene?: THREE.Object3D } | null)?.scene;
  if (!scene) return;
  const seen = new Set<THREE.BufferGeometry | THREE.Material | THREE.Texture>();
  scene.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.geometry && !seen.has(mesh.geometry)) {
      seen.add(mesh.geometry);
      mesh.geometry.dispose();
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) {
      if (!material || seen.has(material)) continue;
      seen.add(material);
      const mat = material as THREE.MeshStandardMaterial;
      for (const key of MAPS) {
        const tex = mat[key] as THREE.Texture | null | undefined;
        if (tex && !seen.has(tex)) {
          seen.add(tex);
          tex.dispose();
        }
      }
      material.dispose();
    }
  });
}

let attached = false;

/** Point the resource guard at the cache useGLTF already fills. */
export function attachGltfCache() {
  if (attached) return;
  attached = true;
  attachResourceCache({
    lookup: url => peek([GLTFLoader, url]),
    drop: url => {
      clear([GLTFLoader, url]);
    },
    dispose: disposeGltf,
  });
}
