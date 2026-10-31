// Per-frame cost of FirstDrawGate + LightBudget on a scene shaped like the room
// (the loaded room measures ~553 objects, 331 meshes, 44 lights incl. 22 dark spares).
// "old" is the code as shipped in PR #87 (a full scene walk for each, every frame);
// "new" is what runs now when nothing was added and no light changed.
//   npx tsx scripts/perf/framecost.ts
import * as THREE from 'three';
import { collectAdds, takeAdded } from '../../src/engine/sceneGraph.ts';
import { balanceLights, syncLights } from '../../src/engine/warmup.ts';

function room() {
  const scene = new THREE.Scene();
  const mat = () => new THREE.MeshStandardMaterial();
  // 30 furniture models: a few groups deep, ~10 meshes each, no lights inside.
  for (let m = 0; m < 30; m++) {
    const model = new THREE.Group();
    model.userData.noPointLights = true;
    const inner = new THREE.Group();
    model.add(inner);
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BufferGeometry(), mat()));
      inner.add(g);
    }
    scene.add(model);
  }
  // Props, games and lamps outside the models.
  for (let i = 0; i < 61; i++) scene.add(new THREE.Mesh(new THREE.BufferGeometry(), mat()));
  for (let i = 0; i < 20; i++) {
    const holder = new THREE.Group();
    const l = new THREE.PointLight();
    if (i < 3) l.userData.expendable = i + 1;
    holder.add(l);
    scene.add(holder);
  }
  const group = new THREE.Group();
  const spares: THREE.PointLight[] = [];
  for (let i = 0; i < 21; i++) {
    const l = new THREE.PointLight(0, 0);
    group.add(l);
    spares.push(l);
  }
  const spot = new THREE.SpotLight(0, 0);
  group.add(spot);
  scene.add(group);
  scene.userData.lightBudget = { budget: 21, spares, spotSpares: [spot], group };
  return scene;
}

// FirstDrawGate's walk as shipped in PR #87.
function oldGateWalk(scene: THREE.Scene, ready: WeakMap<THREE.Material, number>, fresh: THREE.Object3D[]) {
  fresh.length = 0;
  const seen = (m: THREE.Material) => ready.get(m) === m.version;
  const walk = (obj: THREE.Object3D) => {
    if (!obj.visible) return;
    const mat = (obj as THREE.Mesh).material;
    if (mat && (obj as THREE.Mesh).isMesh) {
      if (Array.isArray(mat)) {
        for (let i = 0; i < mat.length; i++) if (!seen(mat[i])) { fresh.push(obj); break; }
      } else if (!seen(mat)) fresh.push(obj);
    }
    const kids = obj.children;
    for (let i = 0; i < kids.length; i++) walk(kids[i]);
  };
  walk(scene);
}

function bench(name: string, fn: () => void, frames = 20000) {
  for (let i = 0; i < 2000; i++) fn();
  const t = performance.now();
  for (let i = 0; i < frames; i++) fn();
  const us = ((performance.now() - t) / frames) * 1000;
  console.log(`${name.padEnd(44)} ${us.toFixed(2).padStart(8)} µs/frame`);
  return us;
}

const scene = room();
let n = 0;
scene.traverse(() => (n += 1));
console.log(`scene: ${n} objects`);

const ready = new WeakMap<THREE.Material, number>();
scene.traverse(o => {
  const m = (o as THREE.Mesh).material as THREE.Material | undefined;
  if (m) ready.set(m, m.version);
});
const fresh: THREE.Object3D[] = [];
const oldUs = bench('old: gate walk + balanceLights every frame', () => {
  oldGateWalk(scene, ready, fresh);
  balanceLights(scene);
});

collectAdds(scene);
syncLights(scene);
const newUs = bench('new: takeAdded + syncLights (nothing changed)', () => {
  takeAdded(scene);
  syncLights(scene);
});
console.log(`per-frame JS for these two systems: ${(oldUs / newUs).toFixed(0)}x less`);
