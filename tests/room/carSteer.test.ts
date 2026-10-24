import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { newCar, stepCar } from '../../src/room/hotwheels/carSim.ts';
import { BLOCKS } from '../../src/room/hotwheels/world.ts';

const DRIVE = { throttle: 0, steer: 1, nitro: false };

test('a stopped toy car can turn its nose before it rolls', () => {
  const car = newCar(new THREE.Vector3(0, 0.02, 0.4), 0);
  stepCar(car, DRIVE, 0.5);
  assert.ok(Math.abs(car.heading) > 0.2, `heading ${car.heading}`);
  assert.ok(Math.abs(car.speed) < 0.05);
});

test('steering while pinned on a dresser still rotates the car', () => {
  const dresser = BLOCKS.find(block => block.id === 'dresser');
  assert.ok(dresser);
  const z = (dresser.minZ + dresser.maxZ) / 2;
  const car = newCar(new THREE.Vector3(dresser.minX - 0.02, 0.02, z), 0);
  for (let i = 0; i < 90; i++) stepCar(car, { throttle: 1, steer: 1, nitro: false }, 1 / 60);
  assert.ok(Number.isFinite(car.pos.x) && Number.isFinite(car.pos.z));
  assert.ok(Math.abs(car.heading) > 0.35, `heading ${car.heading} pos ${car.pos.x.toFixed(3)},${car.pos.z.toFixed(3)} speed ${car.speed}`);
});
