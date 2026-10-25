import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOOK_MAX, LOOK_MIN, readArmyKeys, stepLook } from '../../src/room/army/armyKeys.ts';

test('WASD moves and the arrows only look, like the main room', () => {
  assert.deepEqual(readArmyKeys({ KeyW: true }), { forward: 1, strafe: 0, turn: 0, look: 0 });
  assert.deepEqual(readArmyKeys({ KeyS: true, KeyD: true }), { forward: -1, strafe: 1, turn: 0, look: 0 });
  assert.deepEqual(readArmyKeys({ KeyA: true }), { forward: 0, strafe: -1, turn: 0, look: 0 });
  // Arrows never move you.
  assert.deepEqual(readArmyKeys({ ArrowUp: true }), { forward: 0, strafe: 0, turn: 0, look: 1 });
  assert.deepEqual(readArmyKeys({ ArrowDown: true }), { forward: 0, strafe: 0, turn: 0, look: -1 });
  assert.deepEqual(readArmyKeys({ ArrowRight: true }), { forward: 0, strafe: 0, turn: 1, look: 0 });
  assert.equal(readArmyKeys({ KeyQ: true }).turn, -1);
});

test('the phone pad still walks and turns', () => {
  const pad = { fwd: true, back: false, left: true, right: false };
  assert.deepEqual(readArmyKeys({}, pad), { forward: 1, strafe: 0, turn: -1, look: 0 });
});

test('looking up and down stops at the ceiling and the boots', () => {
  let p = 0;
  for (let i = 0; i < 100; i++) p = stepLook(p, 1, 0.05);
  assert.equal(p, LOOK_MAX);
  for (let i = 0; i < 100; i++) p = stepLook(p, -1, 0.05);
  assert.equal(p, LOOK_MIN);
});
