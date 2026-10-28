import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, clampZoom, pinchZoom, wheelZoom } from '../../src/room/ispy/ISpyReader.tsx';

test('the wheel zooms both ways and stops at the ends', () => {
  const closer = wheelZoom(ZOOM_MIN, -100);
  assert.ok(Math.abs(closer - ZOOM_STEP) < 1e-9);
  assert.ok(Math.abs(wheelZoom(closer, 100) - ZOOM_MIN) < 1e-9, 'a notch down undoes a notch up');
  assert.equal(wheelZoom(ZOOM_MIN, 100), ZOOM_MIN);
  assert.equal(wheelZoom(ZOOM_MAX, -100), ZOOM_MAX);
  assert.equal(wheelZoom(1.7, 0), 1.7);
});

test('pinching apart zooms in, pinching together zooms out, within the limits', () => {
  assert.ok(Math.abs(pinchZoom(1, 100, 150) - 1.5) < 1e-9);
  assert.ok(Math.abs(pinchZoom(2, 200, 150) - 1.5) < 1e-9);
  assert.equal(pinchZoom(2, 200, 20), ZOOM_MIN);
  assert.equal(pinchZoom(2, 100, 900), ZOOM_MAX);
  assert.equal(pinchZoom(1.4, 0, 50), 1.4, 'fingers on one spot change nothing');
});

test('zoom is always a usable number', () => {
  assert.equal(clampZoom(Number.NaN), ZOOM_MIN);
  assert.equal(clampZoom(0.2), ZOOM_MIN);
  assert.equal(clampZoom(99), ZOOM_MAX);
});
