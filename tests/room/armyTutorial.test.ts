import assert from 'node:assert/strict';
import { test } from 'node:test';
import { coachLesson, lineSeconds, nextLine } from '../../src/room/army/tutorial.ts';

test('the sergeant covers moving, looking and shooting, then sends the wave', () => {
  const keys = coachLesson(false);
  assert.match(keys.join(' '), /WASD/);
  assert.match(keys.join(' '), /arrow keys look/);
  assert.match(keys.join(' '), /Space fires/);
  assert.match(keys[keys.length - 1], /Here they come/);
  const pad = coachLesson(true);
  assert.equal(pad.length, keys.length);
  assert.match(pad.join(' '), /Fire is the big button/);
  assert.doesNotMatch(pad.join(' '), /WASD/);
});

test('lines advance one at a time and give you time to read', () => {
  const lines = coachLesson(false);
  assert.equal(nextLine(0, lines), 1);
  assert.equal(nextLine(lines.length - 1, lines), null);
  assert.ok(lineSeconds('Hi') >= 1.8);
  assert.ok(lineSeconds(lines[1]) > lineSeconds('Hi'));
  assert.ok(lineSeconds('x'.repeat(500)) <= 7);
});
