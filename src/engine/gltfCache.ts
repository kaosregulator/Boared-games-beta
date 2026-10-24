import { clear, peek } from 'suspend-react';
import { GLTFLoader } from 'three-stdlib';
import * as THREE from 'three';
import { attachResourceCache, resourceLeased } from './cache';

const MAPS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap'] as const;

/** Geometries, materials, and textures a scene uses. A clone shares these objects. */
export function collectGpuResources(root: THREE.Object3D): object[] {
  const seen = new Set<object>();
  const out: object[] = [];
  const add = (value: object | null | undefined) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  };
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    add(mesh.geometry);
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) {
      add(material);
      const mat = material as THREE.MeshStandardMaterial;
      for (const key of MAPS) add(mat[key] ?? undefined);
    }
  });
  return out;
}

/**
 * Disposes a cached GLTF. Returns false, and disposes nothing, when a mounted
 * clone still leases any of its shared GPU resources.
 */
export function disposeCachedGltf(value: unknown): boolean {
  const scene = (value as { scene?: THREE.Object3D } | null)?.scene;
  if (!scene) return true;
  const resources = collectGpuResources(scene);
  if (resources.some(resource => resourceLeased(resource))) return false;
  for (const resource of resources) {
    (resource as { dispose?: () => void }).dispose?.();
  }
  return true;
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
    dispose: disposeCachedGltf,
  });
}
