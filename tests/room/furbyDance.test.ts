import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BOOM_FROM, BOOM_SPOT, SHOTS, TALK_AFTER, TALK_BEFORE, boomWalk, strobeAt } from '../../src/room/furby/furbyDance.ts';

test('the Boom walks from the back corner to its spot, facing where it is going', () => {
  const start = boomWalk(BOOM_FROM, BOOM_SPOT, 0, 0);
  assert.equal(start.x, BOOM_FROM[0]);
  assert.equal(start.z, BOOM_FROM[2]);
  const mid = boomWalk(BOOM_FROM, BOOM_SPOT, 0.5, 1);
  assert.ok(mid.x < BOOM_FROM[0] && mid.x > BOOM_SPOT[0]);
  assert.notEqual(mid.yaw, 0);
  assert.notEqual(mid.sway, 0);
  const end = boomWalk(BOOM_FROM, BOOM_SPOT, 1, 3);
  assert.ok(Math.abs(end.x - BOOM_SPOT[0]) < 1e-9);
  assert.ok(Math.abs(end.z - BOOM_SPOT[2]) < 1e-9);
  assert.equal(end.yaw, 0, 'squares up to the table once it arrives');
  assert.equal(end.sway, 0);
});

test('the strobe flashes red and blue and is dark in between', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 120; i++) seen.add(String(strobeAt(i / 60)));
  assert.deepEqual([...seen].sort(), ['blue', 'null', 'red']);
  assert.equal(strobeAt(0), 'red');
  assert.equal(strobeAt(1 / 3), 'blue');
  assert.equal(strobeAt(1 / 6), null);
});

test('the talk beats come in order and every camera move is a known shot', () => {
  for (const talk of [TALK_BEFORE, TALK_AFTER]) {
    let last = -1;
    for (const b of talk.beats) {
      assert.ok(b.at > last, `beat at ${b.at} comes after ${last}`);
      assert.ok(b.at < talk.dur, `beat at ${b.at} fits inside the ${talk.dur}s talk`);
      assert.ok(b.cam in SHOTS, `${b.cam} is a shot`);
      last = b.at;
    }
  }
  const lastBefore = TALK_BEFORE.beats[TALK_BEFORE.beats.length - 1];
  assert.match(lastBefore.english, /dance/i, 'the talk before the dance ends on the ask');
});
