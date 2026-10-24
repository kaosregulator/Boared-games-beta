import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceTip, tutorialLine } from '../../src/room/army/tutorial.ts';

const idle = { moved: false, turned: false, shot: false };

test('the tutorial waits for the action it just asked for', () => {
  assert.equal(advanceTip('move', idle), 'move');
  assert.equal(advanceTip('move', { ...idle, shot: true }), 'move');
  assert.equal(advanceTip('move', { ...idle, moved: true }), 'aim');
  assert.equal(advanceTip('aim', { ...idle, turned: true }), 'shoot');
  assert.equal(advanceTip('shoot', { ...idle, shot: true }), 'done');
  assert.equal(advanceTip('done', { moved: true, turned: true, shot: true }), 'done');
});

test('keyboard and touch each get a line they can follow', () => {
  assert.match(tutorialLine('move', false), /W and S/);
  assert.match(tutorialLine('move', true), /arrows/i);
  assert.match(tutorialLine('shoot', false), /Space/);
  assert.match(tutorialLine('shoot', true), /Fire/);
  assert.equal(tutorialLine('done', false), '');
});
