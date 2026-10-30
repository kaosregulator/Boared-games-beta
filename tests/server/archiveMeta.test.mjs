import assert from 'node:assert/strict';
import test from 'node:test';
import { createArchiveMeta, parseRetryAfter, USER_AGENT } from '../../server/archiveMeta.mjs';

const ITEM = {
  files: [
    { name: 'show.mp4', format: 'h.264', length: '1320.5', source: 'derivative', md5: 'x' },
    { name: 'show_thumb.jpg', format: 'JPEG' },
    { name: 'show.mp3', format: 'VBR MP3', length: '1320.5' },
  ],
};

function json(body, status = 200, headers = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}

/** A fake archive.org: answers from a list, one per request, and records each call. */
function fakeArchive(answers) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, at: Date.now() });
    const next = answers.length > 1 ? answers.shift() : answers[0];
    if (next instanceof Error) throw next;
    return typeof next === 'function' ? next() : next;
  };
  return { calls, fetchImpl };
}

const quick = { spacingMs: 0, baseDelayMs: 5, maxDelayMs: 40, timeoutMs: 500, random: () => 1, log: () => {} };

test('sends the User-Agent and keeps only the media files', async () => {
  const { calls, fetchImpl } = fakeArchive([json(ITEM)]);
  const meta = createArchiveMeta({ ...quick, fetchImpl });
  const got = await meta.lookup('some-item');
  assert.equal(calls[0].url, 'https://archive.org/metadata/some-item');
  assert.equal(calls[0].init.headers['User-Agent'], USER_AGENT);
  assert.match(USER_AGENT, /^BoaredGamesRoom\/1\.0 \(\+https:\/\/boared-games-beta-production\.up\.railway\.app\)$/);
  assert.deepEqual(got.files.map(f => f.name), ['show.mp4', 'show.mp3']);
  assert.equal(got.files[0].md5, undefined);
});

test('one cache for every visitor: ten at once make one request, later ones none', async () => {
  const { calls, fetchImpl } = fakeArchive([json(ITEM)]);
  const meta = createArchiveMeta({ ...quick, fetchImpl });
  const all = await Promise.all(Array.from({ length: 10 }, () => meta.lookup('popular')));
  assert.equal(calls.length, 1);
  assert.ok(all.every(r => r.files.length === 2));
  await meta.lookup('popular');
  assert.equal(calls.length, 1);
  assert.equal(meta.status().hits, 1);
  assert.equal(meta.status().shared, 9);
});

test('the queue runs at most two requests at once', async () => {
  let open = 0;
  let most = 0;
  const fetchImpl = async () => {
    open++;
    most = Math.max(most, open);
    await new Promise(r => setTimeout(r, 10));
    open--;
    return json(ITEM);
  };
  const meta = createArchiveMeta({ ...quick, fetchImpl });
  await Promise.all(['a', 'b', 'c', 'd', 'e', 'f'].map(id => meta.lookup(id)));
  assert.equal(most, 2);
});

test('429 with Retry-After pauses the whole queue, then succeeds', async () => {
  const { calls, fetchImpl } = fakeArchive([json({}, 429, { 'retry-after': '0.1' }), json(ITEM)]);
  const meta = createArchiveMeta({ ...quick, fetchImpl });
  const got = await meta.lookup('busy');
  assert.equal(got.files.length, 2);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].at - calls[0].at >= 95, `waited ${calls[1].at - calls[0].at} ms`);
  assert.equal(meta.status().rateLimited, 1);
});

test('a long Retry-After answers 503 at once instead of holding the visitor', async () => {
  const { fetchImpl } = fakeArchive([json({}, 429, { 'retry-after': '120' })]);
  const meta = createArchiveMeta({ ...quick, fetchImpl });
  const sent = [];
  await meta.handle('busy', (status, body, headers) => sent.push({ status, body, headers }));
  assert.equal(sent[0].status, 503);
  assert.equal(sent[0].headers['Retry-After'], '120');
  assert.ok(meta.status().pausedForMs > 100_000);
});

test('during a long pause, other lookups answer 503 at once instead of queueing', async () => {
  const { calls, fetchImpl } = fakeArchive([json({}, 429, { 'retry-after': '120' }), json(ITEM)]);
  const meta = createArchiveMeta({ ...quick, fetchImpl });
  await assert.rejects(meta.lookup('first'));
  const sent = [];
  const started = Date.now();
  await meta.handle('second', (status, body, headers) => sent.push({ status, headers }));
  assert.ok(Date.now() - started < 100);
  assert.equal(sent[0].status, 503);
  assert.ok(Number(sent[0].headers['Retry-After']) >= 119);
  assert.equal(calls.length, 1);
  assert.equal(meta.status().queued, 0);
});

test('a lookup still queued at its deadline gives up without using a request', async () => {
  const fetchImpl = async () => {
    await new Promise(r => setTimeout(r, 60));
    return json(ITEM);
  };
  let calls = 0;
  const meta = createArchiveMeta({ ...quick, concurrency: 1, deadlineMs: 30, fetchImpl: (...a) => (calls++, fetchImpl(...a)) });
  const first = meta.lookup('slow');
  // rejected at its 30 ms deadline, while 'slow' still holds the only slot
  const started = Date.now();
  await assert.rejects(meta.lookup('stuck'), /waited too long/);
  assert.ok(Date.now() - started < 55, `took ${Date.now() - started} ms`);
  assert.equal((await first).files.length, 2);
  assert.equal(calls, 1);
});

test('an attempt already past its deadline is never sent, even with a slot free', async () => {
  const { calls, fetchImpl } = fakeArchive([json({}, 502), json(ITEM)]);
  // the retry wait (40 ms) ends after the 20 ms deadline; the deadline check is
  // made loose so the retry still gets queued
  const meta = createArchiveMeta({ ...quick, baseDelayMs: 40, maxDelayMs: 40, timeoutMs: -1000, deadlineMs: 20, fetchImpl });
  await assert.rejects(meta.lookup('late'), /waited too long/);
  assert.equal(calls.length, 1);
});

test('errors retry with growing waits, then give up', async () => {
  const { calls, fetchImpl } = fakeArchive([json({}, 502)]);
  const meta = createArchiveMeta({ ...quick, fetchImpl, maxAttempts: 4 });
  await assert.rejects(meta.lookup('down'), /502/);
  assert.equal(calls.length, 4);
  const gaps = calls.slice(1).map((c, i) => c.at - calls[i].at);
  assert.ok(gaps[0] >= 4 && gaps[1] >= 9 && gaps[2] >= 19, `gaps ${gaps}`);
  // A failure isn't cached: the next visitor tries again.
  await assert.rejects(meta.lookup('down'));
  assert.equal(calls.length, 8);
});

test('network errors and timeouts retry too', async () => {
  const { calls, fetchImpl } = fakeArchive([new TypeError('fetch failed'), json(ITEM)]);
  const meta = createArchiveMeta({ ...quick, fetchImpl });
  assert.equal((await meta.lookup('flaky')).files.length, 2);
  assert.equal(calls.length, 2);
});

test('a missing item is a 404, cached briefly, and not retried', async () => {
  const { calls, fetchImpl } = fakeArchive([json({})]);
  const meta = createArchiveMeta({ ...quick, fetchImpl });
  const sent = [];
  const send = (status, body, headers) => sent.push({ status, body, headers });
  await meta.handle('gone', send);
  await meta.handle('gone', send);
  assert.deepEqual(sent.map(s => s.status), [404, 404]);
  assert.equal(calls.length, 1);
});

test('when archive.org is down, an item looked up before keeps its old answer', async () => {
  const answers = [json(ITEM), json({}, 503)];
  const { fetchImpl } = fakeArchive(answers);
  const meta = createArchiveMeta({ ...quick, fetchImpl, ttlMs: 1, maxAttempts: 2 });
  await meta.lookup('known');
  await new Promise(r => setTimeout(r, 5));
  const got = await meta.lookup('known');
  assert.equal(got.files.length, 2);
  assert.equal(meta.status().stale, 1);
});

test('rejects anything that is not an archive.org identifier', async () => {
  const { calls, fetchImpl } = fakeArchive([json(ITEM)]);
  const meta = createArchiveMeta({ ...quick, fetchImpl });
  const sent = [];
  for (const id of ['../etc', 'a/b', '', 'x'.repeat(200)]) await meta.handle(id, s => sent.push(s));
  assert.deepEqual(sent, [400, 400, 400, 400]);
  assert.equal(calls.length, 0);
});

test('Retry-After as seconds or a date', () => {
  assert.equal(parseRetryAfter('3'), 3000);
  assert.equal(parseRetryAfter(new Date(10_000).toUTCString(), 4_000), 6000);
  assert.equal(parseRetryAfter('soon'), 0);
  assert.equal(parseRetryAfter(null), 0);
});
