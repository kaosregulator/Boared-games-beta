import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isPrivateAddress, judgeStreamAnswer, probeStream } from '../../radioBrowserApi.mjs';
import { checkedStream, plausibleStream } from '../../src/radio/sources.ts';

const head = (h: Record<string, string>) => new Headers(h);

test('only a 200 with an audio content type counts as a station', () => {
  assert.equal(judgeStreamAnswer(200, head({ 'content-type': 'audio/mpeg' })).ok, true);
  assert.equal(judgeStreamAnswer(200, head({ 'content-type': 'audio/aacp' })).ok, true);
  assert.equal(judgeStreamAnswer(200, head({ 'content-type': 'application/ogg' })).ok, true);
  assert.equal(judgeStreamAnswer(206, head({ 'content-type': 'audio/ogg; codecs=opus' })).ok, true);
  for (const status of [401, 403, 407]) {
    assert.equal(judgeStreamAnswer(status, head({ 'content-type': 'audio/mpeg' })).ok, false, `${status}`);
  }
  assert.equal(judgeStreamAnswer(200, head({ 'content-type': 'audio/mpeg', 'www-authenticate': 'Basic realm="SomaFM Premium"' })).ok, false);
  assert.equal(judgeStreamAnswer(200, head({ 'content-type': 'text/html; charset=utf-8' })).ok, false);
  assert.equal(judgeStreamAnswer(200, head({ 'content-type': 'application/octet-stream' })).ok, false);
  assert.equal(judgeStreamAnswer(200, head({})).ok, false);
  assert.equal(judgeStreamAnswer(404, head({ 'content-type': 'audio/mpeg' })).ok, false);
});

function fakeFetch(routes: Record<string, { status: number; headers: Record<string, string> }>) {
  const asked: string[] = [];
  const impl = async (url: string) => {
    asked.push(url);
    const r = routes[url];
    if (!r) throw new Error('offline');
    return new Response(null, { status: r.status, headers: r.headers });
  };
  return { impl, asked };
}
const anyHost = async () => true;

test('the probe follows redirects to audio and refuses ones that end on a sign-in page', async () => {
  const ok = fakeFetch({
    'https://a.example/live': { status: 302, headers: { location: 'https://b.example/live.mp3' } },
    'https://b.example/live.mp3': { status: 200, headers: { 'content-type': 'audio/mpeg' } },
  });
  assert.deepEqual(await probeStream('https://a.example/live', ok.impl, anyHost), {
    ok: true,
    url: 'https://b.example/live.mp3',
    type: 'audio/mpeg',
  });

  const login = fakeFetch({
    'https://a.example/live': { status: 302, headers: { location: '/login' } },
    'https://a.example/login': { status: 200, headers: { 'content-type': 'text/html' } },
  });
  assert.equal((await probeStream('https://a.example/live', login.impl, anyHost)).ok, false);

  const auth = fakeFetch({ 'https://ice1.example/premium': { status: 401, headers: { 'www-authenticate': 'Basic' } } });
  assert.equal((await probeStream('https://ice1.example/premium', auth.impl, anyHost)).ok, false);

  const loop = fakeFetch({
    'https://a.example/1': { status: 301, headers: { location: 'https://a.example/2' } },
    'https://a.example/2': { status: 301, headers: { location: 'https://a.example/1' } },
  });
  assert.equal((await probeStream('https://a.example/1', loop.impl, anyHost)).ok, false);

  const downgrade = fakeFetch({ 'https://a.example/x': { status: 302, headers: { location: 'http://a.example/x' } } });
  assert.equal((await probeStream('https://a.example/x', downgrade.impl, anyHost)).ok, false);

  const offline = fakeFetch({});
  assert.equal((await probeStream('https://gone.example/x', offline.impl, anyHost)).ok, false);
});

test('the probe never asks a private or loopback address', async () => {
  const { impl, asked } = fakeFetch({});
  const res = await probeStream('https://10.0.0.5/stream', impl, async (h: string) => !isPrivateAddress(h));
  assert.equal(res.ok, false);
  assert.equal(asked.length, 0);
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.9', '172.20.1.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:127.0.0.1']) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ['8.8.8.8', '104.16.1.1', '2606:4700::1111']) assert.equal(isPrivateAddress(ip), false, ip);
});

test('addresses that cannot be a station are dropped before anyone asks', () => {
  assert.equal(plausibleStream('https://ice2.somafm.com/u80s-128-mp3'), true);
  assert.equal(plausibleStream('https://stream.example.com/80s.mp3'), true);
  assert.equal(plausibleStream('https://somafm.com/u80s/'), false);
  assert.equal(plausibleStream('https://somafm.com/login'), false);
  assert.equal(plausibleStream('https://ice4.somafm.com/premium/u80s'), false);
  assert.equal(plausibleStream('http://stream.example.com/80s.mp3'), false);
  assert.equal(plausibleStream('https://user:pw@stream.example.com/80s'), false);
  assert.equal(plausibleStream('https://example.com/listen.html'), false);
  assert.equal(plausibleStream('https://example.com/tune.pls'), false);
  assert.equal(plausibleStream('not a url'), false);
});

test('a stand-in plays only when the server vouches for it', async () => {
  const answer = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
  assert.equal(await checkedStream('https://s.example/a', answer({ ok: true, url: 'https://s2.example/a.mp3' })), 'https://s2.example/a.mp3');
  assert.equal(await checkedStream('https://s.example/b', answer({ ok: false, why: 'asks for a sign-in' })), null);
  assert.equal(await checkedStream('https://s.example/c', answer({ error: 'nope' }, 404)), null);
  // a redirect the server followed to somewhere implausible is still refused
  assert.equal(await checkedStream('https://s.example/d', answer({ ok: true, url: 'https://somafm.com/signin' })), null);
  const down = (async () => {
    throw new Error('offline');
  }) as unknown as typeof fetch;
  assert.equal(await checkedStream('https://s.example/e', down), null);
});
