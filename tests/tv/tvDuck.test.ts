import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DUCK_FAR, DUCK_NEAR, tvMusicLevel } from '../../src/tv/tvDuck.ts';

test('the bedroom tape is silent while the TV plays at the set or near it', () => {
  for (const mode of ['tv', 'guide', 'menu', 'emulator', 'gaming', 'link'] as const) {
    assert.equal(tvMusicLevel(mode, 0.5, true), 0, mode);
    assert.equal(tvMusicLevel(mode, 9, true), 0, `${mode} at the set`);
    assert.equal(tvMusicLevel(mode, DUCK_NEAR - 0.1, false), 0, mode);
    assert.equal(tvMusicLevel(mode, null, false), 0, `${mode} before the speaker has a position`);
  }
});

test('walking away from the TV brings the tape back, and switching it off gives it straight back', () => {
  const mid = tvMusicLevel('tv', (DUCK_NEAR + DUCK_FAR) / 2, false);
  assert.ok(mid > 0.4 && mid < 0.6, `halfway across is about half: ${mid}`);
  assert.equal(tvMusicLevel('tv', DUCK_FAR + 0.5, false), 1);
  let last = -1;
  for (let d = 0; d <= DUCK_FAR + 1; d += 0.25) {
    const level = tvMusicLevel('tv', d, false);
    assert.ok(level >= last, 'louder the farther you go');
    last = level;
  }
  assert.equal(tvMusicLevel('off', 0.3, true), 1);
  assert.equal(tvMusicLevel('off', null, false), 1);
});
