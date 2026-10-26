import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { dealLine, setSargeClips, type SargeClip, type SargeTag } from '../../src/room/army/sargeVoice.ts';

const index = JSON.parse(readFileSync('public/audio/sarge/sarge.json', 'utf8')) as { clips: SargeClip[] };
const TAGS: SargeTag[] = ['lesson', 'wave', 'start', 'end', 'combat', 'hurt', 'explore', 'fall', 'bail', 'land'];

test('every moment has Sarge lines, and every line has a moment', () => {
  for (const tag of TAGS) assert.ok(index.clips.some(c => c.tags.includes(tag)), `no lines for ${tag}`);
  for (const c of index.clips) {
    assert.ok(c.tags.length > 0, c.id);
    for (const t of c.tags) assert.ok(TAGS.includes(t), `${c.id}: ${t}`);
  }
});

test('the clips sit in order inside the sprite, without overlapping', () => {
  // 64 kbit/s mono: bytes / 8000 is about the length in seconds.
  const seconds = statSync('public/audio/sarge/sarge.mp3').size / 8000;
  let end = 0;
  for (const c of index.clips) {
    assert.ok(c.start >= end - 1e-6, `${c.id} overlaps the one before`);
    assert.ok(c.dur > 0.1 && c.dur < 12, `${c.id} is ${c.dur} s`);
    end = c.start + c.dur;
  }
  assert.ok(end <= seconds + 1, `last clip ends at ${end} s, sprite is ~${seconds} s`);
});

test('only the grunts go without words', () => {
  for (const c of index.clips) {
    if (c.text === '') assert.deepEqual(c.tags, ['hurt'], c.id);
  }
});

test('a moment deals every line once before any line twice', () => {
  setSargeClips(index.clips);
  const lines = index.clips.filter(c => c.tags.includes('hurt'));
  const seen = new Set<string>();
  for (let i = 0; i < lines.length; i++) seen.add(dealLine('hurt')!.id);
  assert.equal(seen.size, lines.length);
});
