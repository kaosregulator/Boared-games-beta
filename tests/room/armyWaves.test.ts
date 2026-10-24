import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  TAN_POOL,
  betweenWaves,
  invaderAim,
  invaderMarch,
  invaderRange,
  storyOver,
  waveSize,
} from '../../src/room/army/waves.ts';

test('the story is still five, then seven, then nine, and then it is over', () => {
  assert.deepEqual([waveSize('story', 1), waveSize('story', 2), waveSize('story', 3)], [5, 7, 9]);
  assert.equal(waveSize('story', 4), null);
  assert.equal(storyOver('story', 3), true);
  assert.equal(storyOver('story', 2), false);
  assert.equal(betweenWaves('story', 2), 5);
  assert.equal(betweenWaves('story', 3), 1.2);
  assert.equal(invaderMarch('story', 3), 0.08);
  assert.equal(invaderAim('story', 1), 0.24);
  assert.equal(invaderRange('story', 9), 0.42);
});

test('endless waves grow and then fill the pool instead of ending', () => {
  assert.equal(waveSize('easy', 1), 4);
  assert.equal(waveSize('easy', 2), 5);
  assert.equal(waveSize('medium', 3), 10);
  assert.equal(waveSize('hard', 1), 8);
  assert.equal(waveSize('hard', 8), TAN_POOL);
  assert.equal(storyOver('hard', 20), false);
  assert.ok(betweenWaves('hard', 4) < betweenWaves('easy', 4));
  assert.ok(invaderMarch('hard', 6) > invaderMarch('story', 1));
  assert.ok(invaderAim('easy', 4) < invaderAim('story', 1));
  assert.ok(invaderRange('hard', 6) > invaderRange('medium', 6));
});
