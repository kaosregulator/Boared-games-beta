import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tvMusicLevel } from '../../src/tv/tvDuck.ts';

test('the bedroom tape is muted all the way while the TV is on', () => {
  for (const mode of ['tv', 'guide', 'menu', 'emulator', 'gaming', 'link'] as const) {
    assert.equal(tvMusicLevel(mode), 0, mode);
  }
});

test('switching the set off gives the tape straight back', () => {
  assert.equal(tvMusicLevel('off'), 1);
});
