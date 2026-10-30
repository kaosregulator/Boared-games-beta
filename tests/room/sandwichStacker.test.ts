import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createGame, gravityScale, type Kind, layerY, plateX, restart, startRound, step, topSurface, type Game } from '../../src/devices/sandwich/game';

/** A seeded random, so the spawner is the same every run. */
function seeded(seed = 7) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function run(g: Game, seconds: number, move = 0) {
  for (let t = 0; t < seconds; t += 1 / 60) step(g, 1 / 60, { move });
}

function dropOnPlate(g: Game, kind: Kind) {
  const surf = topSurface(g);
  g.falling.push({ id: g.nextId++, kind, x: surf.x, y: surf.y + 2, vy: 0, flip: false, age: 1, hidden: 0 });
}

test('the first ingredients wait for the level banner, then fall from the top', () => {
  const g = createGame(seeded());
  startRound(g);
  run(g, 1.9);
  assert.equal(g.falling.length, 0, 'nothing in the first two seconds');
  run(g, 0.3);
  assert.ok(g.falling.length >= 1);
  assert.ok(g.falling.every(f => f.y > 9));
});

test('625 walks and stops at the edges of the desk', () => {
  const g = createGame(seeded());
  startRound(g);
  run(g, 3, -1);
  assert.ok(g.x < -5 && g.x > -5.4, `left edge ${g.x}`);
  run(g, 3, 1);
  assert.ok(g.x > 6.4 && g.x < 6.7, `right edge ${g.x}`);
});

test('catching stacks layers on the plate and the stack follows the plate', () => {
  const g = createGame(seeded());
  startRound(g);
  g.spawning = false;
  dropOnPlate(g, 'cheese');
  run(g, 0.6);
  dropOnPlate(g, 'meat');
  run(g, 0.6);
  assert.deepEqual(
    g.stack.map(l => [l.kind, l.h]),
    [
      ['cheese', 1],
      ['meat', 2],
    ],
  );
  assert.equal(g.totalCaught, 2);
  run(g, 1, 1);
  run(g, 1);
  assert.ok(Math.abs(g.stack[0].x - plateX(g)) < 0.01, 'bottom layer sits on the plate');
  assert.ok(Math.abs(topSurface(g).y - (layerY(2) + 0.28)) < 1e-9);
});

test('missing an ingredient splats it on the desk', () => {
  const g = createGame(seeded());
  startRound(g);
  g.spawning = false;
  g.falling.push({ id: 500, kind: 'tomato', x: plateX(g) + 5, y: 8, vy: 0, flip: false, age: 1, hidden: 0 });
  run(g, 2);
  assert.equal(g.stack.length, 0);
  assert.equal(g.falling.length, 0);
  assert.ok(g.events.some(e => e.type === 'miss'));
});

test('four icky catches end the game, and play again starts over at level 1', () => {
  const g = createGame(seeded());
  startRound(g);
  g.spawning = false;
  for (let i = 0; i < 4; i += 1) {
    dropOnPlate(g, 'boot');
    run(g, 0.6);
  }
  assert.equal(g.ick, 4);
  assert.equal(g.phase, 'lost');
  restart(g);
  assert.equal(g.phase, 'play');
  assert.equal(g.round, 1);
  assert.equal(g.ick, 0);
  assert.equal(g.score, 0);
});

test('the top bread ends the round: 625 eats it from the top and scores it', () => {
  const g = createGame(seeded());
  startRound(g);
  g.spawning = false;
  for (const k of ['cheese', 'meat', 'lettuce'] as const) {
    dropOnPlate(g, k);
    run(g, 0.6);
  }
  dropOnPlate(g, 'bread');
  run(g, 0.6);
  assert.equal(g.round, 2);
  assert.ok(g.phase === 'eating' || g.phase === 'won');
  run(g, 3);
  assert.equal(g.phase, 'won');
  assert.equal(g.stack.length, 0);
  // Four bites at round 1's prices (5, 10, 15, 20) times (round - 1).
  assert.equal(g.score, 50);
  startRound(g);
  assert.equal(g.phase, 'play');
});

test('the toaster fires the top bread once the sandwich is tall enough', () => {
  const g = createGame(seeded(3));
  startRound(g);
  // Round 1 needs more than 4 layers before the bread can come.
  for (let h = 1; h <= 5; h += 1) g.stack.push({ id: 900 + h, kind: 'cheese', h, x: plateX(g), flip: false, punch: 0 });
  let fired = false;
  for (let i = 0; i < 60 * 12 && !fired; i += 1) {
    step(g, 1 / 60, { move: 0 });
    fired = g.events.some(e => e.type === 'toaster');
    // Keep anything that lands from changing the stack height under the test.
    g.falling = g.falling.filter(f => f.kind === 'bread' || f.y > 6);
  }
  assert.ok(fired);
  const bread = g.falling.find(f => f.kind === 'bread');
  assert.ok(bread && bread.hidden > 0, 'the bread waits while the toaster fires');
});

test('things fall faster each level', () => {
  assert.ok(gravityScale(1) < gravityScale(2));
  assert.ok(gravityScale(5) < gravityScale(10));
  assert.ok(gravityScale(1000) <= 2);
});
