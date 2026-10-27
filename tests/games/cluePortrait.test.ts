import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CLUE_CARD, CLUE_PLAQUE_TOP, CLUE_PORTRAIT } from '../../src/room/table/clueArt.ts';

test('the clue portrait window stays inside the frame and above the name', () => {
  const top = CLUE_PORTRAIT.y + CLUE_PORTRAIT.h / 2;
  const bottom = CLUE_PORTRAIT.y - CLUE_PORTRAIT.h / 2;
  assert.ok(top < CLUE_CARD.h / 2 - 0.001, 'window clears the top border');
  assert.ok(CLUE_PORTRAIT.w < CLUE_CARD.w - 0.004, 'window clears the side border');
  const plaqueTop = -CLUE_CARD.h / 2 + CLUE_CARD.h * ((360 - CLUE_PLAQUE_TOP) / 360);
  assert.ok(bottom > plaqueTop, 'window sits above the name plaque');
  assert.ok(CLUE_PORTRAIT.z > 0, 'the figure stands out of the face');
});
