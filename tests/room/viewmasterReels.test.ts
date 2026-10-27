import assert from 'node:assert/strict';
import { test } from 'node:test';
import { REELS, databasePage } from '../../src/room/viewmasterReels.ts';

test('fifteen packets that the public database lists, no painted scans', () => {
  assert.equal(REELS.length, 15);
  assert.equal(new Set(REELS.map(reel => reel.title)).size, 15);
  for (const reel of REELS) {
    assert.equal(databasePage(reel.title).startsWith('https://vm.vmdatabase.com/index.html?go='), true);
    assert.equal(decodeURIComponent(databasePage(reel.title).split('go=')[1]), reel.title);
  }
  const blob = JSON.stringify(REELS);
  assert.doesNotMatch(blob, /ANIMALS|SUPERCARS|SCENERY|motif|data:image/i);
  assert.doesNotMatch(blob, /REEL\s+[A-Z0-9]/);
});
