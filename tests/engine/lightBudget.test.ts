import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { balanceLights, compileBatch, pendingTextures, pendingTexturesOf, syncLights, uploadTextures } from '../../src/engine/warmup.ts';

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

test('a spare spot light stands in until a game brings its own', () => {
  const { scene } = budgetScene(2);
  const spare = new THREE.SpotLight(0x000000, 0);
  spare.visible = false;
  scene.userData.lightBudget.group.add(spare);
  scene.userData.lightBudget.spotSpares = [spare];
  const spots = (s: THREE.Scene) => {
    let n = 0;
    s.traverseVisible(o => {
      if ((o as THREE.SpotLight).isSpotLight) n += 1;
    });
    return n;
  };
  balanceLights(scene);
  assert.equal(spots(scene), 1);
  // The Hot Wheels headlight comes in: still one spot, so no shader rebuilds.
  const head = new THREE.SpotLight();
  scene.add(head);
  balanceLights(scene);
  assert.equal(spots(scene), 1);
  assert.equal(spare.visible, false);
  scene.remove(head);
  balanceLights(scene);
  assert.equal(spots(scene), 1);
  assert.equal(spare.visible, true);
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

test('syncLights keeps the same lights on as balanceLights, and only rebalances when something changed', () => {
  const { scene } = budgetScene(6);
  const glow = new THREE.PointLight();
  glow.userData.expendable = 1;
  const room = [new THREE.PointLight(), new THREE.PointLight(), glow];
  room.forEach(l => scene.add(l));
  // Furniture without lights of its own is never looked into.
  const furniture = new THREE.Group();
  furniture.userData.noPointLights = true;
  for (let i = 0; i < 20; i++) furniture.add(new THREE.Mesh());
  scene.add(furniture);

  assert.equal(syncLights(scene), true);
  assert.equal(visiblePointLights(scene), 6);
  // Nothing changed: no work.
  assert.equal(syncLights(scene), false);
  furniture.position.x = 2;
  assert.equal(syncLights(scene), false);

  // A game with five lamps: the glow steps out, the count holds.
  const game = new THREE.Group();
  for (let i = 0; i < 5; i++) game.add(new THREE.PointLight());
  scene.add(game);
  assert.equal(syncLights(scene), true);
  assert.equal(visiblePointLights(scene), 7);
  assert.equal(glow.layers.isEnabled(0), false);

  // Its owner hides the game (no add or remove): noticed without a scene walk.
  game.visible = false;
  assert.equal(syncLights(scene), true);
  assert.equal(visiblePointLights(scene), 6);
  assert.equal(glow.layers.isEnabled(0), true);
  assert.equal(syncLights(scene), false);

  // A single lamp switched off by its owner.
  game.visible = true;
  game.children.slice(1).forEach(l => (l.visible = false));
  assert.equal(syncLights(scene), true);
  assert.equal(visiblePointLights(scene), 6);

  // The same answer as the full walk.
  const before = scene.userData.lightBudget.spares.map((l: THREE.Light) => l.visible).join();
  balanceLights(scene);
  assert.equal(scene.userData.lightBudget.spares.map((l: THREE.Light) => l.visible).join(), before);

  scene.remove(game);
  assert.equal(syncLights(scene), true);
  assert.equal(visiblePointLights(scene), 6);
});

test('compileBatch compiles just the listed things, in one compile() call against the scene', () => {
  const scene = new THREE.Scene();
  const parent = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial());
  const child = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  parent.add(child);
  scene.add(parent);
  const calls: { visited: THREE.Object3D[]; target: unknown }[] = [];
  const gl = {
    compile(root: THREE.Object3D, _camera: THREE.Camera, target: unknown) {
      const visited: THREE.Object3D[] = [];
      root.traverseVisible(o => visited.push(o));
      assert.equal(visited.length, 0, 'lights come from the scene, not the stand-in');
      root.traverse(o => visited.push(o));
      calls.push({ visited, target });
      return new Set(visited.map(o => (o as THREE.Mesh).material as THREE.Material));
    },
  } as unknown as THREE.WebGLRenderer;
  const mats = compileBatch(gl, [parent], new THREE.PerspectiveCamera(), scene);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].visited, [parent], 'not its children: they are listed on their own when new');
  assert.equal(calls[0].target, scene);
  assert.equal(mats.size, 1);
  compileBatch(gl, [parent, child], new THREE.PerspectiveCamera(), scene);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].visited, [parent, child]);
});

test('uploadTextures always sends one per task and yields when a task runs long', async () => {
  const make = () => {
    const t = new THREE.Texture({ width: 4, height: 4 } as unknown as HTMLImageElement);
    return t;
  };
  const textures = [make(), make(), make(), make()];
  const sent: THREE.Texture[] = [];
  let yields = 0;
  const gl = {
    initTexture(t: THREE.Texture) {
      sent.push(t);
      const until = performance.now() + 8;
      while (performance.now() < until) {
        // a slow upload
      }
    },
  } as unknown as THREE.WebGLRenderer;
  const tick = setInterval(() => (yields += 1), 0);
  await uploadTextures(gl, textures, undefined, 6);
  clearInterval(tick);
  assert.equal(sent.length, 4);
  assert.ok(yields >= 2, `gave the thread back between slow uploads (${yields})`);
  // Sent once: a second pass does nothing.
  await uploadTextures(gl, textures);
  assert.equal(sent.length, 4);
  assert.equal(pendingTexturesOf([new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ map: textures[0] }))]).length, 0);
});
