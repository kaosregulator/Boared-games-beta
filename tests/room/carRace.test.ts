import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { CAR, newCar, stepCar, type CarState } from '../../src/room/hotwheels/carSim.ts';
import { BOOSTERS, FINISH, startPose } from '../../src/room/hotwheels/course.ts';
import { BLOCKS, blockHas, zoneAt } from '../../src/room/hotwheels/world.ts';

const DT = 1 / 60;

function crossedFinish(from: THREE.Vector3, to: THREE.Vector3) {
  const t = FINISH.tangent;
  const a = (from.x - FINISH.p.x) * t.x + (from.z - FINISH.p.z) * t.z;
  const b = (to.x - FINISH.p.x) * t.x + (to.z - FINISH.p.z) * t.z;
  const lat = (to.x - FINISH.p.x) * FINISH.right.x + (to.z - FINISH.p.z) * FINISH.right.z;
  return a < 0 && b >= 0 && Math.abs(lat) < FINISH.half && to.y < 0.2;
}

/** Drive a race lap from the start with the given steering, gas held the whole way. */
function lap(steerAt: (t: number) => number) {
  const s = startPose();
  const car: CarState = newCar(s.p, s.heading);
  const zones = new Set<string>();
  let boosts = 0;
  const prev = new THREE.Vector3();
  for (let t = 0; t < 40; t += DT) {
    prev.copy(car.pos);
    for (const e of stepCar(car, { throttle: 1, steer: steerAt(t), nitro: false }, DT, { assist: true })) {
      if (e === 'boost') boosts += 1;
    }
    const z = car.mode === 'loop' ? null : zoneAt(car.pos.x, car.pos.y, car.pos.z);
    if (z) zones.add(z.id);
    if (t > 5 && crossedFinish(prev, car.pos)) return { done: true, t, zones, boosts };
  }
  return { done: false, t: 40, zones, boosts, at: car.pos.toArray().map(v => v.toFixed(2)).join(',') };
}

test('in a race, holding the gas follows the whole lap: bed tunnel, ramp jump, the desk, every booster', () => {
  const r = lap(() => 0);
  assert.ok(r.done, `lap not finished, car at ${'at' in r ? r.at : ''}`);
  assert.ok(r.zones.has('bed') && r.zones.has('desk-top'), `checkpoints ${[...r.zones]}`);
  assert.equal(r.boosts, BOOSTERS.length);
});

test('in a race, wobbling the steering still keeps you on the track', () => {
  const r = lap(t => (Math.sin(t * 1.3) > 0.6 ? 1 : Math.sin(t * 1.7 + 1) > 0.7 ? -1 : 0));
  assert.ok(r.done, `lap not finished, car at ${'at' in r ? r.at : ''}`);
  assert.ok(r.zones.has('bed') && r.zones.has('desk-top'), `checkpoints ${[...r.zones]}`);
});

test('free roam is still free: no assist, the car goes where it is pointed, even across the track', () => {
  // Square across the north run, near the start line.
  const s = startPose();
  const car = newCar(s.p, s.heading + Math.PI / 2);
  for (let i = 0; i < 45; i++) stepCar(car, { throttle: 1, steer: 0, nitro: false }, DT);
  assert.ok(Math.abs(car.heading - (s.heading + Math.PI / 2)) < 0.05, `heading moved to ${car.heading}`);
});

/** Gas held, steer one way for a second, then straighten up: how far did the car get? */
function escape(x: number, z: number, heading: number, steer: number) {
  const car = newCar(new THREE.Vector3(x, 0, z), heading);
  const from = car.pos.clone();
  for (let i = 0; i < 60 * 3; i++) stepCar(car, { throttle: 1, steer: i < 60 ? steer : 0, nitro: false }, DT);
  return car.pos.distanceTo(from);
}

test('nosed into a corner, steering out with the gas held gets you free', () => {
  // The slot between the dresser and the door, against the north wall.
  for (const steer of [-1, 1]) assert.ok(escape(-0.15, -2.55, -Math.PI / 2, steer) > 0.4, `steer ${steer}`);
  // Against the side of the bed's leg at the foot.
  const leg = BLOCKS.find(b => b.id === 'bed-post' && b.minX > -2)!;
  for (const steer of [-1, 1]) assert.ok(escape(leg.maxX + 0.06, (leg.minZ + leg.maxZ) / 2, Math.PI, steer) > 0.4, `steer ${steer}`);
});

test('the plate of pizza rolls is a bump you drive over, not a wall', () => {
  const plate = BLOCKS.find(b => b.id === 'hotpockets')!;
  const cz = (plate.minZ + plate.maxZ) / 2;
  const car = newCar(new THREE.Vector3(plate.minX - 0.2, 0, cz), 0);
  for (let i = 0; i < 60 * 2; i++) stepCar(car, { throttle: 1, steer: 0, nitro: false }, DT);
  assert.ok(car.pos.x > plate.maxX + 0.05, `stopped at x ${car.pos.x.toFixed(3)}`);
});

test("a turned prop's box doesn't reach past its corners", () => {
  // The bounds of the turned Hot Wheels set stick out past the mesh; driving
  // through that empty corner used to stop the car dead.
  const set = BLOCKS.find(b => b.id === 'hotwheels')!;
  assert.ok(set.shape?.kind === 'box');
  assert.equal(blockHas(set, set.maxX - 0.02, set.minZ + 0.02, CAR.radius), false);
  // Driving south past where the old bounds ended, along the set's slanted side.
  const car = newCar(new THREE.Vector3(1.62, 0, set.minZ - 0.2), Math.PI / 2);
  for (let i = 0; i < 40; i++) stepCar(car, { throttle: 1, steer: 0, nitro: false }, DT);
  assert.ok(car.pos.z > set.minZ + 0.05, `stopped at z ${car.pos.z.toFixed(3)}`);
});
