import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AUDIO_LIMIT, audioFileProblem } from '../../src/pc/apps/MediaPlayer.tsx';

test('the player takes audio and refuses a huge file', () => {
  assert.equal(audioFileProblem({ name: 'song.mp3', type: 'audio/mpeg', size: 1000 }), null);
  assert.equal(audioFileProblem({ name: 'notes.txt', type: 'text/plain', size: 20 })?.includes('not an audio'), true);
  assert.equal(audioFileProblem({ name: 'album.wav', type: 'audio/wav', size: AUDIO_LIMIT + 1 })?.includes('too large'), true);
});
