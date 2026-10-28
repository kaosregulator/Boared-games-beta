import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CHEESE_WHEEL_SPACE_INDEX,
  buildNextContraptionStage,
  completeContraptionChainReaction,
  createInitialMouseTrapState,
} from '../../src/games/mousetrap/mouseTrapRules.ts';

test('the trap starts with one piece up and builds a piece at a time', () => {
  let s = createInitialMouseTrapState('mode1_classic');
  assert.equal(s.builtStages, 1);
  for (let n = 2; n <= 5; n++) {
    s = buildNextContraptionStage(s);
    assert.equal(s.builtStages, n);
  }
  assert.equal(buildNextContraptionStage(s).builtStages, 5);
});

test('turning the crank drops the cage on the mouse on the cheese wheel', () => {
  let s = createInitialMouseTrapState('mode1_classic');
  s = buildNextContraptionStage(s, true);
  s = { ...s, currentTurn: 'red', mice: { ...s.mice, blue: { ...s.mice.blue, trackIndex: CHEESE_WHEEL_SPACE_INDEX } } };
  const after = completeContraptionChainReaction(s, 'blue');
  assert.equal(after.cageDropped, true);
  assert.equal(after.trappedMouse, 'blue');
  assert.equal(after.mice.blue.isTrapped, true);
  assert.ok(after.mice.red.cheeseCount > s.mice.red.cheeseCount);
});
