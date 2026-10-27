import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AUDIO_ACCEPT, AUDIO_HINT, AUDIO_LIMIT, AUDIO_WARN, audioFileProblem, audioFileVerdict } from '../../src/pc/apps/MediaPlayer.tsx';

test('the player takes audio and refuses a huge file', () => {
  assert.equal(audioFileProblem({ name: 'song.mp3', type: 'audio/mpeg', size: 1000 }), null);
  assert.equal(audioFileProblem({ name: 'notes.txt', type: 'text/plain', size: 20 })?.includes('not a file'), true);
  assert.equal(audioFileProblem({ name: 'album.wav', type: 'audio/wav', size: AUDIO_LIMIT + 1 })?.includes('over the 40 MB limit'), true);
});

test('a big file is played only after a warning; the limit is a refusal that says why', () => {
  assert.equal(AUDIO_WARN, 25 * 1024 * 1024);
  assert.equal(audioFileVerdict({ name: 'a.flac', type: '', size: AUDIO_WARN }).kind, 'ok');
  const warn = audioFileVerdict({ name: 'mix.wav', type: 'audio/wav', size: 30 * 1024 * 1024 });
  assert.equal(warn.kind, 'warn');
  assert.match(warn.kind === 'warn' ? warn.text : '', /30\.0 MB.*Play it anyway\?/s);
  const refuse = audioFileVerdict({ name: 'live.wav', type: 'audio/wav', size: 52 * 1024 * 1024 });
  assert.equal(refuse.kind, 'refuse');
  assert.match(refuse.kind === 'refuse' ? refuse.text : '', /52\.0 MB, over the 40 MB limit/);
  const wrong = audioFileVerdict({ name: 'clip.mov', type: 'video/quicktime', size: 10 });
  assert.match(wrong.kind === 'refuse' ? wrong.text : '', /MP3, WAV, OGG, M4A, AAC, FLAC, WEBM/);
});

test('the player names the file types and the limit, and that nothing is kept', () => {
  assert.match(AUDIO_HINT, /MP3, WAV, OGG, M4A, AAC, FLAC, WEBM/);
  assert.match(AUDIO_HINT, /40 MB/);
  assert.match(AUDIO_HINT, /never saved/);
  for (const ext of ['.mp3', '.wav', '.ogg', '.m4a', '.flac']) assert.ok(AUDIO_ACCEPT.includes(ext), ext);
  // extension alone is enough when the browser gives no type
  assert.equal(audioFileVerdict({ name: 'tape.M4A', type: '', size: 100 }).kind, 'ok');
});
