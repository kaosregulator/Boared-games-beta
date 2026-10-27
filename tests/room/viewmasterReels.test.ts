import assert from 'node:assert/strict';
import { test } from 'node:test';
import { REELS } from '../../src/room/viewmasterReels.ts';

const TITLES = [
  'Jurassic Park',
  'The Lost World',
  'The Lion King',
  'Aladdin',
  'Beauty and the Beast',
  'The Little Mermaid',
  'Pocahontas',
  'Toy Story',
  "A Bug's Life",
  'Batman Forever',
  'Mighty Morphin Power Rangers',
  'TMNT',
  'Casper',
  'Space Jam',
  'Star Wars Episode I',
];

test('fifteen original reels, seven scenes, no borrowed scans', () => {
  assert.deepEqual(
    REELS.map(reel => reel.title),
    TITLES,
  );
  for (const reel of REELS) {
    assert.equal(reel.scenes.length, 7, reel.title);
    assert.equal(new Set(reel.scenes.map(scene => scene.caption)).size, 7, reel.title);
  }
  const blob = JSON.stringify(REELS);
  assert.doesNotMatch(blob, /https?:|vmdatabase|serial/i);
  assert.doesNotMatch(blob, /REEL\s+[A-Z0-9]/);
});
