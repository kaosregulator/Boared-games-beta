import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { FRAMES_PER_REEL, REELS, depthUrl, frameUrl } from '../../src/room/viewmasterReels.ts';

test('fifteen real 1990s packets, no painted stand-ins', () => {
  assert.equal(REELS.length, 15);
  assert.equal(new Set(REELS.map(reel => reel.id)).size, 15);
  for (const reel of REELS) {
    assert.ok(reel.year >= 1990 && reel.year <= 1999, `${reel.title} ${reel.year}`);
    assert.ok(reel.code.length > 4);
  }
  assert.doesNotMatch(JSON.stringify(REELS), /ANIMALS|SUPERCARS|SCENERY|motif|data:image/i);
});

test('every reel has seven scanned scenes, each with its depth map', () => {
  assert.equal(FRAMES_PER_REEL, 7);
  for (const reel of REELS) {
    for (let n = 0; n < FRAMES_PER_REEL; n++) {
      for (const url of [frameUrl(reel, n), depthUrl(reel, n)]) {
        const file = `public${url}`;
        assert.ok(existsSync(file), file);
        assert.ok(statSync(file).size > 2000, `${file} is too small to be a scan`);
      }
    }
  }
});
