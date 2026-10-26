import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CHUTE,
  CHUTE_LINES,
  CINE,
  canopyOpen,
  chopperSpot,
  cineTimeScale,
  chuteDrift,
  needsChute,
  pickLine,
  stepFall,
} from '../../src/room/army/parachute.ts';

test('only real drops need the chute: a block is a hop, the shelf is a jump', () => {
  assert.equal(needsChute(0.045), false);
  assert.equal(needsChute(0.15), false);
  assert.equal(needsChute(1.94), true);
});

test('the movie shot is quick: slow-mo for the yank, full speed again before it ends', () => {
  assert.ok(CINE.end <= 2.5, 'the shot stays short');
  assert.ok(CINE.pull < CINE.wide && CINE.wide < CINE.back && CINE.back < CINE.end);
  assert.equal(cineTimeScale(0), 1);
  assert.equal(cineTimeScale(CINE.pull), CINE.slow);
  assert.equal(cineTimeScale(CINE.back), 1);
  for (let t = 0; t < CINE.end; t += 0.05) {
    const s = cineTimeScale(t);
    assert.ok(s >= CINE.slow - 1e-9 && s <= 1, `scale ${s} at ${t}`);
  }
});

test('the canopy bangs open past full and settles', () => {
  assert.equal(canopyOpen(-0.1), 0);
  assert.equal(canopyOpen(CINE.deploy), 1);
  let peak = 0;
  for (let t = 0; t < CINE.deploy; t += 0.01) peak = Math.max(peak, canopyOpen(t));
  assert.ok(peak > 1.02, 'overshoots');
});

test('falling: terminal speed shut, the sink rate open, faster with Shift', () => {
  let vy = 0;
  for (let i = 0; i < 120; i++) vy = stepFall(vy, 1 / 60, 0, false);
  assert.equal(vy, -CHUTE.terminal);
  for (let i = 0; i < 120; i++) vy = stepFall(vy, 1 / 60, 1, false);
  assert.ok(Math.abs(vy + CHUTE.sink) < 0.01);
  for (let i = 0; i < 120; i++) vy = stepFall(vy, 1 / 60, 1, true);
  assert.ok(Math.abs(vy + CHUTE.sinkFast) < 0.01);
  // Off the shelf under the canopy takes a few seconds, not a minute.
  assert.ok(1.94 / CHUTE.sink < 7);
});

test('under the canopy you go where you push: forward, back, sideways, or nowhere', () => {
  assert.deepEqual(chuteDrift(0, 0, 0), { x: 0, z: 0 });
  const fwd = chuteDrift(1, 0, 0);
  assert.ok(fwd.z > 0.1 && Math.abs(fwd.x) < 1e-9);
  assert.ok(chuteDrift(-1, 0, 0).z < 0);
  // Same sideways sense as walking: D (strafe +1) at heading 0 goes to -x.
  assert.ok(chuteDrift(0, 1, 0).x < 0);
  const turned = chuteDrift(1, 0, Math.PI / 2);
  assert.ok(turned.x > 0.1 && Math.abs(turned.z) < 1e-9);
});

test('lines never repeat twice running', () => {
  let last: string | null = null;
  for (let i = 0; i < 50; i++) {
    const line = pickLine(CHUTE_LINES, last, () => 0);
    assert.notEqual(line, last);
    last = line;
  }
  assert.equal(CHUTE_LINES[0], "We're going down! We're going down!");
});

test('the called chopper lands on your floor, clear of what is blocked, or not at all', () => {
  const shelf = (x: number, z: number) => (x > 0 && x < 1 && z > 0 && z < 0.4 ? 1.94 : 0);
  const floorAt = (x: number, z: number, maxY: number) => (shelf(x, z) <= maxY ? shelf(x, z) : 0);
  const spot = chopperSpot(0.5, 1.94, 0.2, 0, floorAt, () => false);
  assert.ok(spot);
  assert.equal(spot.y, 1.94);
  assert.ok(Math.hypot(spot.x - 0.5, spot.z - 0.2) >= 0.15);
  assert.equal(chopperSpot(0.5, 1.94, 0.2, 0, floorAt, () => true), null);
});
