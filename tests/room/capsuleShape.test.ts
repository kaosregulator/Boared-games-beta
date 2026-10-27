import assert from 'node:assert/strict';
import { test } from 'node:test';
import { capsuleShape } from '../../src/room/capsuleShape.ts';

test('the new games get their own sealed miniature', () => {
  assert.equal(capsuleShape('chess'), 'wizard');
  assert.equal(capsuleShape('guesswho'), 'face');
  assert.equal(capsuleShape('mousetrap'), 'mouse');
  assert.equal(capsuleShape('pawnrush'), 'sorry');
  assert.equal(capsuleShape('checkers'), 'pawn');
  assert.notEqual(capsuleShape('chess'), capsuleShape('checkers'));
});
