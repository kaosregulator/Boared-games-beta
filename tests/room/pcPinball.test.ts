import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TH, TW, newGame, release, step } from '../../src/pc/apps/pinball/engine.ts';

const quiet = () => {};

/** Play one ball for a while with the flippers flapping, checking it never leaves the cabinet. */
function playBall(power: number, seconds: number, flap: boolean) {
  const g = newGame();
  g.plunger = power;
  release(g, quiet);
  let escaped = 0;
  for (let t = 0; t < seconds * 120; t += 1) {
    if (flap) {
      const held = t % 90 < 12;
      g.flippers[0].held = held;
      g.flippers[1].held = held;
    }
    step(g, 1 / 120, quiet);
    const b = g.ball;
    if (b.x < -2 || b.x > TW + 2 || b.y < -2 || b.y > TH + 40) escaped += 1;
  }
  return { g, escaped };
}

test('a launched ball stays inside the cabinet at every plunger strength', () => {
  for (const power of [0.2, 0.5, 0.8, 1]) {
    for (const flap of [false, true]) {
      const { escaped } = playBall(power, 20, flap);
      assert.equal(escaped, 0, `power ${power} flap ${flap}`);
    }
  }
});

test('a full launch gets the ball out of the shooter lane and scores', () => {
  const { g } = playBall(1, 12, true);
  assert.ok(g.score > 0, 'scored something');
});
