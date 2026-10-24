import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SHOT_RADIUS, pickAlongBarrel, shotPoint } from '../../src/room/army/aim.ts';

const from = { x: 0, y: 0, z: 0 };
const heading = 0;

/** The check the player used to fire with: nearest body inside 0.45 rad and 0.75 m. */
function oldCone(body: { x: number; z: number }, range = 0.75, cone = 0.45) {
  const dx = body.x - from.x;
  const dz = body.z - from.z;
  const d = Math.hypot(dx, dz);
  if (d >= range) return false;
  const ang = Math.atan2(Math.sin(Math.atan2(dx, dz) - heading), Math.cos(Math.atan2(dx, dz) - heading));
  return Math.abs(ang) <= cone;
}

test('a soldier off to the side is a miss, and one straight ahead at 0.8 m is a hit', () => {
  const wide = { x: 0.15, y: 0, z: 0.5 };
  const far = { x: 0, y: 0, z: 0.8 };
  assert.equal(oldCone(wide), true);
  assert.equal(oldCone(far), false);
  assert.equal(pickAlongBarrel(from, heading, [wide]), null);
  const hit = pickAlongBarrel(from, heading, [wide, far]);
  assert.ok(hit);
  assert.equal(hit.index, 1);
  assert.ok(hit.gap < SHOT_RADIUS);
  const end = shotPoint(from, heading, hit.along);
  assert.ok(end.z > 0.75);
  assert.ok(Math.abs(end.x) < 0.001);
});

test('the closer soldier on the barrel line is the one that falls', () => {
  const near = { x: 0.01, y: 0, z: 0.3 };
  const behind = { x: 0, y: 0, z: -0.4 };
  const farther = { x: -0.005, y: 0, z: 0.9 };
  const hit = pickAlongBarrel(from, heading, [farther, behind, near]);
  assert.ok(hit);
  assert.equal(hit.index, 2);
});
