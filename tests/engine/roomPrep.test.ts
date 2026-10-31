import assert from 'node:assert/strict';
import test from 'node:test';
import { noteParseEnd, noteParseStart, noteQuietScan, noteWarmerMounted, noteWarming, onRoomPrep, resetRoomPrepForTests, roomPrepared } from '../../src/engine/roomPrep.ts';

const later = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test('without a warm-up running, the room is prepared once nothing is parsing', () => {
  resetRoomPrepForTests();
  assert.equal(roomPrepared(), true);
  noteParseStart();
  assert.equal(roomPrepared(), false);
  noteParseEnd();
  assert.equal(roomPrepared(), true);
});

test('with the warm-up running, prepared waits for a quiet scan that comes after the last parse', async () => {
  resetRoomPrepForTests();
  const unmount = noteWarmerMounted();
  let calls = 0;
  const off = onRoomPrep(() => (calls += 1));
  assert.equal(roomPrepared(), false, 'no scan yet');
  noteParseStart();
  noteQuietScan();
  assert.equal(roomPrepared(), false, 'still parsing');
  noteParseEnd();
  // A scan right after the parse could miss the model, which React has not placed yet.
  noteQuietScan();
  assert.equal(roomPrepared(), false);
  await later(300);
  noteWarming(true);
  noteQuietScan();
  assert.equal(roomPrepared(), false, 'compiling');
  noteWarming(false);
  const before = calls;
  noteQuietScan();
  assert.equal(roomPrepared(), true);
  assert.ok(calls > before, 'listeners hear about it');
  off();
  unmount();
  resetRoomPrepForTests();
});
