import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import { COMBOS, DUCK_STORY, INTRO, dealLine, sargeEntries, setSargeClips, type SargeClip, type SargeTag } from '../../src/room/army/sargeVoice.ts';
import { coachCards } from '../../src/room/army/tutorial.ts';
import { DUCK_STORY_TAIL, RADIO_BRIEF } from '../../src/room/army/sniper/state.ts';

const index = JSON.parse(readFileSync('public/audio/sarge/sarge.json', 'utf8')) as { clips: SargeClip[] };
const TAGS: SargeTag[] = [
  'intro',
  'start',
  'again',
  'wave',
  'combat',
  'miss',
  'shot',
  'good',
  'cleared',
  'win',
  'buddy',
  'grunt',
  'oof',
  'fall',
  'hardland',
  'bail',
  'chute',
  'land',
  'heli',
  'explore',
  'duck-story',
  'duck-start',
  'duck-hit',
  'duck-miss',
  'duck-perfect',
  'duck-over',
];
const ids = new Set(index.clips.map(c => c.id));

test('every moment has Sarge lines, and every line has a moment', () => {
  for (const tag of TAGS) assert.ok(index.clips.some(c => c.tags.includes(tag)), `no lines for ${tag}`);
  for (const c of index.clips) {
    assert.ok(c.tags.length > 0, c.id);
    for (const t of c.tags) assert.ok(TAGS.includes(t), `${c.id}: ${t}`);
  }
});

test('the lines the user cut are gone', () => {
  const words = index.clips.map(c => c.text).join(' ');
  assert.doesNotMatch(words, /last present/i);
  assert.doesNotMatch(words, /Lotso|incarcerated/);
  assert.doesNotMatch(words, /zerg/i);
  assert.match(words, /It's a big one\.\.\. It's a\.\.\. It's a board game! Repeat: Battleship!/);
});

test('the intro, the duck story and the pairs name real clips', () => {
  for (const id of [...INTRO, ...DUCK_STORY, ...Object.values(COMBOS).flat(2)]) assert.ok(ids.has(id), id);
  // One step card under each intro line, one bit of story under each line of the duck briefing.
  assert.equal(coachCards(false).length, INTRO.length);
  assert.equal(coachCards(true).length, INTRO.length);
  assert.equal(DUCK_STORY_TAIL.length, DUCK_STORY.length);
  assert.equal(RADIO_BRIEF.length, DUCK_STORY.length);
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

test('only the grunts and oofs go without words', () => {
  for (const c of index.clips) {
    if (c.text === '') assert.ok(c.tags.length === 1 && (c.tags[0] === 'grunt' || c.tags[0] === 'oof'), c.id);
    else assert.ok(!c.tags.includes('grunt') && !c.tags.includes('oof'), c.id);
  }
});

test('a moment deals every entry once before any twice, pairs together', () => {
  setSargeClips(index.clips);
  for (const tag of ['shot', 'explore', 'bail'] as SargeTag[]) {
    const entries = sargeEntries(tag);
    const seen = new Set<string>();
    for (let i = 0; i < entries.length; i++) seen.add(dealLine(tag)!.map(c => c.id).join('+'));
    assert.equal(seen.size, entries.length, tag);
  }
  // "...Yes, sir!" only ever comes with the Code Red order after it.
  const bail = sargeEntries('bail').map(e => e.map(c => c.id).join('+'));
  assert.ok(bail.includes('yes-sir+code-red'));
  assert.ok(!bail.includes('yes-sir'));
});

test('an urgent line waits for a nearly finished one instead of cutting it off', async () => {
  const { lineStart, QUEUE_WITHIN } = await import('../../src/room/army/sargeVoice.ts');
  assert.ok(QUEUE_WITHIN >= 2);
  // Not busy: straight away.
  assert.ok(Math.abs(lineStart(10, null, false) - 10.02) < 1e-9);
  // Queued behind a line ending at 11.5: starts just after it.
  assert.ok(lineStart(10, 11.5, true) > 11.5);
  // A cut (not queued) starts now even mid-line.
  assert.ok(lineStart(10, 11.5, false) < 10.1);
});
