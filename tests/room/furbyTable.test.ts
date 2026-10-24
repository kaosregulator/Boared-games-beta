import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scriptedStep } from '../../src/room/furby/scriptClock.ts';
import { clearFurbyRelease, furbyReleasePending, onFurbyGesture, requestFurbyPutdown } from '../../src/room/furby/furbyStore.ts';

test('a scripted open follows real time and refuses a huge gap', () => {
  assert.deepEqual(scriptedStep(null, 1000), { dt: 0, at: 1000 });
  assert.deepEqual(scriptedStep(1000, 1600, 1), { dt: 0.6, at: 1600 });
  assert.deepEqual(scriptedStep(1000, 9000, 1), { dt: 1, at: 9000 });
  assert.deepEqual(scriptedStep(2000, 1000, 1), { dt: 0, at: 1000 });
});

test('asking to open the table records a put-down the hands can see', () => {
  clearFurbyRelease();
  const seen: string[] = [];
  const stop = onFurbyGesture(gesture => seen.push(gesture));
  requestFurbyPutdown();
  assert.equal(furbyReleasePending(), true);
  assert.deepEqual(seen, ['putdown']);
  clearFurbyRelease();
  assert.equal(furbyReleasePending(), false);
  stop();
});
