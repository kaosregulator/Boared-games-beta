import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CARD_RISE_S, FAN_CARD_GAP, fanCardDelay, typeCharMs, typedCount } from '../../src/room/table/cluePace.ts';

test('clue cards arrive one after another and a full fan stays under two seconds', () => {
  assert.equal(fanCardDelay(0), 0);
  assert.equal(fanCardDelay(1), FAN_CARD_GAP);
  assert.ok(fanCardDelay(8) + CARD_RISE_S < 2);
  assert.ok(FAN_CARD_GAP > 0.05);
});

test('the typewriter finishes a line quickly and does not crawl on a short one', () => {
  assert.equal(typeCharMs(0), 0);
  assert.equal(typeCharMs(1), 0);
  const short = typeCharMs(8);
  const long = typeCharMs(80);
  assert.ok(short <= 28);
  assert.ok(long >= 12);
  assert.ok(long * 80 <= 1200);
  assert.ok(short * 8 <= 280);
});

test('a typed line catches up to the clock instead of falling a letter behind', () => {
  const line = 'Pick the three cards in the case file. A wrong accusation puts you out.';
  assert.equal(typedCount(0, line.length), 0);
  assert.ok(typedCount(120, line.length) > 1);
  assert.equal(typedCount(900, line.length), line.length);
});
