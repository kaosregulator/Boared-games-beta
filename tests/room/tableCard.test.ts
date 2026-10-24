import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bottomCardLimit, cardCrossesTable } from '../../src/room/table/tableCard.ts';

test('a narrow play card crosses the middle of the table', () => {
  assert.equal(cardCrossesTable(390), true);
  assert.equal(cardCrossesTable(430), true);
  assert.equal(cardCrossesTable(768), true);
  assert.equal(cardCrossesTable(1280), false);
});

test('the bottom card stays under the toy measured at phone height', () => {
  // The Furby card was 237px tall. At 844px it fits; at 667px it has to scroll.
  assert.equal(bottomCardLimit(844, 51), 270);
  assert.equal(bottomCardLimit(667, 51), 199);
  assert.ok(bottomCardLimit(844, 51) > 237);
  assert.ok(bottomCardLimit(667, 51) < 237);
});
