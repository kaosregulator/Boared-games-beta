import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { balanceLights, pendingTextures } from '../../src/engine/warmup.ts';

function budgetScene(budget: number) {
  const scene = new THREE.Scene();
  const group = new THREE.Group();
  const spares: THREE.PointLight[] = [];
  for (let i = 0; i < budget; i++) {
    const light = new THREE.PointLight(0x000000, 0);
    light.visible = false;
    group.add(light);
    spares.push(light);
  }
  scene.add(group);
  scene.userData.lightBudget = { budget, spares, group };
  return { scene, spares };
}

/** What three's renderer lights the scene with: visible, and on the camera's layer 0. */
function visiblePointLights(scene: THREE.Scene) {
  const cam = new THREE.Layers();
  let n = 0;
  scene.traverseVisible(obj => {
    if ((obj as THREE.PointLight).isPointLight && obj.layers.test(cam)) n += 1;
  });
  return n;
}

test('balanceLights keeps the point-light count steady as lights come and go', () => {
  const { scene } = budgetScene(6);
  const room = [new THREE.PointLight(), new THREE.PointLight(), new THREE.PointLight()];
  room.forEach(l => scene.add(l));
  balanceLights(scene);
  assert.equal(visiblePointLights(scene), 6);

  // A game drops in with two lamps of its own.
  const game = new THREE.Group();
  game.add(new THREE.PointLight(), new THREE.PointLight());
  scene.add(game);
  balanceLights(scene);
  assert.equal(visiblePointLights(scene), 6);

  // Hidden lights (the game still loading) don't count.
  game.visible = false;
  balanceLights(scene);
  assert.equal(visiblePointLights(scene), 6);

  // Over budget with nothing to give back: every spare stays dark.
  game.visible = true;
  game.add(new THREE.PointLight(), new THREE.PointLight());
  balanceLights(scene);
  assert.equal(visiblePointLights(scene), 7);
});

test('pendingTextures finds each unsent picture once and skips video', () => {
  const root = new THREE.Group();
  const img = { width: 4, height: 4 } as unknown as HTMLImageElement;
  const shared = new THREE.Texture(img);
  const a = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: shared, normalMap: new THREE.Texture(img) }));
  const b = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ map: shared }));
  const video = Object.assign(new THREE.Texture(img), { isVideoTexture: true });
  const c = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ map: video }));
  root.add(a, b, c);
  assert.equal(pendingTextures(root).length, 2);
});

test('expendable glows step out for a game\'s lamps, lowest first, and come back', () => {
  const { scene } = budgetScene(4);
  const lamp = new THREE.PointLight();
  const bulb = Object.assign(new THREE.PointLight(), { userData: { expendable: 1 } });
  const lava = Object.assign(new THREE.PointLight(), { userData: { expendable: 2 } });
  scene.add(lamp, bulb, lava);
  balanceLights(scene);
  assert.equal(visiblePointLights(scene), 4);
  assert.ok(bulb.layers.isEnabled(0) && lava.layers.isEnabled(0));

  const game = new THREE.Group();
  game.add(new THREE.PointLight(), new THREE.PointLight());
  scene.add(game);
  balanceLights(scene);
  assert.equal(visiblePointLights(scene), 4);
  assert.equal(bulb.layers.isEnabled(0), false, 'the bulb goes first');
  assert.equal(lava.layers.isEnabled(0), true);

  scene.remove(game);
  balanceLights(scene);
  assert.equal(visiblePointLights(scene), 4);
  assert.ok(bulb.layers.isEnabled(0), 'back once the game is gone');
});
