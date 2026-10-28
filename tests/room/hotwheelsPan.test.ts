import assert from 'node:assert/strict';
import { test } from 'node:test';
import { screenPan } from '../../src/room/hotwheels/screenPan.ts';

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test("bird's-eye Up slides the view up the screen whichever way the car faces", () => {
  for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 3, 2.4]) {
    const fx = Math.cos(heading);
    const fz = Math.sin(heading);
    const up = screenPan(fx * 3, fz * 3, 1, 0);
    assert.ok(close(up.x, fx) && close(up.z, fz), `up at heading ${heading}`);
    const down = screenPan(fx, fz, -1, 0);
    assert.ok(close(down.x, -fx) && close(down.z, -fz), `down at heading ${heading}`);
    // Right is a quarter turn clockwise from up, seen from above (forward × world up).
    const right = screenPan(fx, fz, 0, 1);
    assert.ok(close(right.x * fx + right.z * fz, 0), 'right is across the screen');
    assert.ok(close(right.x, -fz) && close(right.z, fx));
    const left = screenPan(fx, fz, 0, -1);
    assert.ok(close(left.x, fz) && close(left.z, -fx));
  }
});

test('a camera facing -Z (three.js default) pans like a map: Up is -Z, Right is +X', () => {
  const up = screenPan(0, -1, 1, 0);
  assert.ok(close(up.x, 0) && close(up.z, -1));
  const right = screenPan(0, -1, 0, 1);
  assert.ok(close(right.x, 1) && close(right.z, 0));
});

test('looking straight down falls back to the given heading; no keys, no move', () => {
  const up = screenPan(0, 0, 1, 0, { x: 1, z: 0 });
  assert.ok(close(up.x, 1) && close(up.z, 0));
  const still = screenPan(0.3, 0.8, 0, 0);
  assert.ok(close(still.x, 0) && close(still.z, 0));
});
