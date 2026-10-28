import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Ship } from '../../src/room/table/battleshipFleet.ts';
import { MARKER_KINDS, MARKER_LABEL, markerKind, markersFor } from '../../src/room/table/battleshipMarkers.ts';

const fleet: Ship[] = [
  { id: 0, size: 2, x: 1, y: 1, horizontal: true, hits: 1 },
  { id: 1, size: 1, x: 5, y: 5, horizontal: true, hits: 1 },
];

test('a miss is a white peg, a hit a red one, a sunk ship shows the skull', () => {
  assert.equal(markerKind('miss', fleet, 0, 0), 'miss');
  assert.equal(markerKind('hit', fleet, 1, 1), 'hit');
  assert.equal(markerKind('hit', fleet, 5, 5), 'sunk');
});

test('every hit on a ship turns to the sunk marker once the ship goes down', () => {
  const sunkFleet = fleet.map(s => (s.id === 0 ? { ...s, hits: 2 } : s));
  const kinds = markersFor({ '1,1': 'hit', '2,1': 'hit', '3,3': 'miss' }, sunkFleet).map(m => m.kind);
  assert.deepEqual(kinds, ['sunk', 'sunk', 'miss']);
});

test('the corner key lists every marker the sea can show', () => {
  for (const kind of ['hit', 'miss', 'sunk'] as const) assert.ok(MARKER_KINDS.includes(kind));
  assert.deepEqual(
    MARKER_KINDS.map(k => MARKER_LABEL[k]),
    ['Ship', 'Hit', 'Miss', 'Sunk'],
  );
});
