import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CLIMB_SECONDS, STOOL_STEP, STOOL_TOP, climbBoost, stepForward } from '../../src/room/stoolClimb.ts';

function series(dir: 'up' | 'down') {
  const out: number[] = [];
  for (let t = 0; t <= CLIMB_SECONDS + 1e-9; t += 0.01) out.push(climbBoost(dir, t));
  return out;
}

/** Count direction reversals: a smooth lift has none, a two-step climb has several. */
function reversals(v: number[]) {
  let n = 0;
  let last = 0;
  for (let i = 1; i < v.length; i++) {
    const d = v[i] - v[i - 1];
    if (Math.abs(d) < 1e-6) continue;
    const s = Math.sign(d);
    if (last && s !== last) n++;
    last = s;
  }
  return n;
}

test('the climb up starts on the floor, ends on the stool, and bobs on the way (two real steps)', () => {
  const up = series('up');
  assert.equal(up[0], 0);
  assert.ok(Math.abs(up[up.length - 1] - STOOL_TOP) < 1e-6);
  // each foot overshoots then settles: the head goes up, down, up, down
  assert.ok(reversals(up) >= 2, `reversals ${reversals(up)}`);
  assert.ok(Math.max(...up) > STOOL_TOP, 'the second push goes above where you settle');
  // it holds the first step's height before the second foot
  assert.ok(Math.abs(climbBoost('up', 0.45) - STOOL_STEP) < 0.01);
});

test('coming down steps too, and ends on the floor', () => {
  const down = series('down');
  assert.ok(Math.abs(down[0] - STOOL_TOP) < 1e-6);
  assert.equal(down[down.length - 1], 0);
  assert.ok(reversals(down) >= 2);
  assert.ok(Math.abs(climbBoost('down', 0.52) - STOOL_STEP) < 0.01);
});

test('the step forward onto the stool finishes before the second landing', () => {
  assert.equal(stepForward(0), 0);
  assert.equal(stepForward(0.9), 1);
  assert.ok(stepForward(0.36) > 0.3 && stepForward(0.36) < 0.7);
});
