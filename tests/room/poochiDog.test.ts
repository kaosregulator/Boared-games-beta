import assert from 'node:assert/strict';
import test from 'node:test';
import { BONE_SPOTS, DOG, newDog, stepDog, type DogInput } from '../../src/room/poochi/dogSim.ts';
import { ROOM } from '../../src/room/hotwheels/world.ts';

const IDLE: DogInput = { move: 0, turn: 0, fly: false, jet: false };

function run(d: ReturnType<typeof newDog>, input: DogInput, seconds: number) {
  const events: string[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) events.push(...stepDog(d, input, 1 / 60));
  return events;
}

test('Poo-Chi walks forward along his heading on the floor', () => {
  const d = newDog(0, 0, 0);
  run(d, { ...IDLE, move: 1 }, 0.5);
  assert.ok(d.z > 0.1, `z ${d.z}`);
  assert.ok(Math.abs(d.x) < 0.01);
  assert.equal(d.y, 0);
  assert.ok(d.grounded);
});

test('the jet pack comes out and makes him faster than walking', () => {
  const walk = newDog(0, -0.5, 0);
  const jet = newDog(0, -0.5, 0);
  run(walk, { ...IDLE, move: 1 }, 0.6);
  const events = run(jet, { ...IDLE, move: 1, jet: true }, 0.6);
  assert.ok(events.includes('jet-out'));
  assert.ok(jet.z - -0.5 > (walk.z - -0.5) * 1.3, `jet ${jet.z} walk ${walk.z}`);
});

test('the propeller pops out, he flies up, and lands back down when let go', () => {
  const d = newDog(0, 0, 0);
  const up = run(d, { ...IDLE, fly: true }, 1.2);
  assert.ok(up.includes('prop-out'));
  assert.ok(d.y > 0.4, `y ${d.y}`);
  const down = run(d, IDLE, 6);
  assert.ok(d.grounded && d.y === 0, `y ${d.y}`);
  assert.ok(down.includes('prop-in'));
});

test('he stays inside the room walls', () => {
  const d = newDog(0, 0, Math.PI / 2);
  run(d, { ...IDLE, move: 1, jet: true }, 8);
  assert.ok(d.x <= ROOM.maxX - DOG.radius + 1e-6);
});

test('every bone is somewhere he can get to', () => {
  assert.equal(BONE_SPOTS.length, 10);
  for (const b of BONE_SPOTS) {
    assert.ok(b.x > ROOM.minX && b.x < ROOM.maxX && b.z > ROOM.minZ && b.z < ROOM.maxZ, b.label);
    assert.ok(b.y >= 0 && b.y < 2.4, `${b.label} y ${b.y}`);
  }
  // At least one on the floor and several up high, so the propeller matters.
  assert.ok(BONE_SPOTS.some(b => b.y < 0.05));
  assert.ok(BONE_SPOTS.filter(b => b.y > 0.5).length >= 4);
});
