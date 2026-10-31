import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { collectAdds, isUnder, sceneVersion, takeAdded } from '../../src/engine/sceneGraph.ts';

test('adds and removes anywhere under a scene change its version', () => {
  const scene = new THREE.Scene();
  const v0 = sceneVersion(scene);
  const group = new THREE.Group();
  scene.add(group);
  const v1 = sceneVersion(scene);
  assert.ok(v1 > v0);
  const deep = new THREE.Mesh();
  group.add(deep);
  const v2 = sceneVersion(scene);
  assert.ok(v2 > v1);
  group.remove(deep);
  assert.ok(sceneVersion(scene) > v2);
});

test('nothing changes the version while the scene is left alone, and building off-scene does not count', () => {
  const scene = new THREE.Scene();
  scene.add(new THREE.Group());
  const v = sceneVersion(scene);
  // A model being built (a GLTF parse, a clone) before it is placed.
  const loose = new THREE.Group();
  for (let i = 0; i < 50; i++) loose.add(new THREE.Mesh());
  assert.equal(sceneVersion(scene), v);
  // Per-frame changes that are not structural.
  scene.children[0].position.x = 3;
  scene.children[0].visible = false;
  assert.equal(sceneVersion(scene), v);
});

test('takeAdded hands out each new subtree root once, only while collecting', () => {
  const scene = new THREE.Scene();
  sceneVersion(scene);
  scene.add(new THREE.Group());
  const stop = collectAdds(scene);
  assert.deepEqual(takeAdded(scene), []);
  const built = new THREE.Group();
  built.add(new THREE.Mesh(), new THREE.Mesh());
  scene.add(built);
  const added = takeAdded(scene);
  assert.deepEqual(added, [built]);
  assert.deepEqual(takeAdded(scene), []);
  // Several at once: three adds them one by one.
  const a = new THREE.Mesh();
  const b = new THREE.Mesh();
  built.add(a, b);
  assert.deepEqual(takeAdded(scene), [a, b]);
  // Removed again before the frame: still listed, but no longer under the scene.
  const gone = new THREE.Mesh();
  scene.add(gone);
  scene.remove(gone);
  const list = takeAdded(scene)!;
  assert.deepEqual(list, [gone]);
  assert.equal(isUnder(gone, scene), false);
  assert.equal(isUnder(a, scene), true);
  stop();
  scene.add(new THREE.Mesh());
  assert.deepEqual(takeAdded(scene), []);
});

test('a flood of adds between two frames asks for one full look instead of a huge list', () => {
  const scene = new THREE.Scene();
  const stop = collectAdds(scene);
  for (let i = 0; i < 4100; i++) scene.add(new THREE.Object3D());
  assert.equal(takeAdded(scene), null);
  assert.deepEqual(takeAdded(scene), []);
  stop();
});
