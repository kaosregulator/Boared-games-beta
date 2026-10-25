import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HARD_ZOOM_FOV, ZOOM_FOV, zoomFov, zoomLabel } from '../../src/room/army/sniper/state.ts';

test('normal play zooms in gently and hard mode keeps the tight scope', () => {
  for (const z of [1, 2, 3] as const) {
    assert.ok(ZOOM_FOV[z] > HARD_ZOOM_FOV[z], `zoom ${z} is wider in normal play`);
    assert.equal(zoomFov(z, false), ZOOM_FOV[z]);
    assert.equal(zoomFov(z, true), HARD_ZOOM_FOV[z]);
  }
  // Even fully zoomed, the normal scope still shows a good slice of the range.
  assert.ok(ZOOM_FOV[3] >= 12);
  assert.equal(zoomLabel(3, true), '6x');
  assert.equal(zoomLabel(3, false), '3x');
});
