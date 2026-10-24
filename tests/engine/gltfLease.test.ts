import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { leaseResource, resetCacheForTests, resourceLeased, unleaseResource } from '../../src/engine/cache.ts';
import { collectGpuResources, disposeCachedGltf } from '../../src/engine/gltfCache.ts';

test('a cloned scene shares GPU resources and a lease blocks dispose', () => {
  resetCacheForTests();
  const geometry = new THREE.BufferGeometry();
  const texture = new THREE.Texture();
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const mesh = new THREE.Mesh(geometry, material);
  const scene = new THREE.Group();
  scene.add(mesh);

  const clone = scene.clone(true);
  const cloneMesh = clone.children[0] as THREE.Mesh;
  assert.equal(cloneMesh.geometry, geometry);
  assert.equal(cloneMesh.material, material);

  const shared = collectGpuResources(clone);
  assert.ok(shared.includes(geometry));
  assert.ok(shared.includes(material));
  assert.ok(shared.includes(texture));

  const disposed: string[] = [];
  geometry.dispose = () => {
    disposed.push('geometry');
  };
  material.dispose = () => {
    disposed.push('material');
  };
  texture.dispose = () => {
    disposed.push('texture');
  };

  leaseResource(geometry);
  leaseResource(geometry);
  unleaseResource(geometry);
  assert.equal(resourceLeased(geometry), true);
  for (const resource of shared) leaseResource(resource);
  assert.equal(disposeCachedGltf({ scene }), false);
  assert.deepEqual(disposed, []);

  for (const resource of shared) unleaseResource(resource);
  unleaseResource(geometry);
  assert.equal(resourceLeased(geometry), false);
  assert.equal(disposeCachedGltf({ scene }), true);
  assert.deepEqual(disposed.sort(), ['geometry', 'material', 'texture']);
});
