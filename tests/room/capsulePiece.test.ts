import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { MIN_TRIANGLES, extractPiece } from '../../src/room/capsule/extractPiece.ts';
import { capsuleLine } from '../../src/room/capsule/capsuleLine.ts';

/** A "desk" scan: one finely cut slab, as a Tripo prop is one mesh. */
function desk() {
  const scene = new THREE.Scene();
  const mat = new THREE.MeshStandardMaterial({ color: '#8a5a32' });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1, 40, 2, 20), mat);
  slab.position.set(1, 0.75, 0);
  scene.add(slab);
  // The invisible hotspot box over one end of it, as RoomModel draws them.
  const spot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
  spot.position.set(1.7, 0.8, 0);
  spot.userData.interactable = { id: 'cd-lamp' };
  scene.add(spot);
  scene.updateMatrixWorld(true);
  return { scene, mat, spot };
}

test('cuts only the triangles inside the hotspot box, with the room material, centred', () => {
  const { scene, mat, spot } = desk();
  const box = new THREE.Box3().setFromObject(spot);
  const piece = extractPiece(scene, box);
  assert.ok(piece, 'expected a piece');
  assert.ok(piece.triangles >= MIN_TRIANGLES);
  // Far fewer triangles than the whole slab: only the end under the box.
  const whole = (scene.children[0] as THREE.Mesh).geometry.index!.count / 3;
  assert.ok(piece.triangles < whole / 3, `${piece.triangles} of ${whole}`);
  const mesh = piece.group.children[0] as THREE.Mesh;
  assert.equal(mesh.material, mat, 'shares the room material');
  const bounds = new THREE.Box3().setFromObject(piece.group);
  const centre = bounds.getCenter(new THREE.Vector3());
  assert.ok(centre.length() < 1e-6, 'centred on the origin');
  // Every cut vertex came from inside the box (padded by one triangle's reach).
  assert.ok(bounds.getSize(new THREE.Vector3()).x <= 0.4 + 0.11);
});

test('a box over empty space gives no piece, and hotspot boxes are never cut', () => {
  const { scene } = desk();
  assert.equal(extractPiece(scene, new THREE.Box3(new THREE.Vector3(5, 5, 5), new THREE.Vector3(6, 6, 6))), null);
  // A box around only the hotspot's own mesh (above the slab): nothing solid there.
  assert.equal(extractPiece(scene, new THREE.Box3(new THREE.Vector3(1.55, 0.86, -0.15), new THREE.Vector3(1.85, 0.95, 0.15))), null);
});

test('the capsule lid shouts the console or brand, short', () => {
  assert.deepEqual(capsuleLine('cd-snes', 'Donkey Kong Country cartridge', 'Super Nintendo · 1994'), { line: 'SNES', movie: false, bananas: true });
  assert.equal(capsuleLine('cd-vhs', 'VHS tapes').movie, true);
  assert.equal(capsuleLine('cd-walkman', 'Sony Walkman', 'Sony · 1989').line, 'Sony');
  assert.equal(capsuleLine('x', 'Lava lamp', '1990s · bedroom').line, 'Lava lamp');
});
