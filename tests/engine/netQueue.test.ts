import assert from 'node:assert/strict';
import test from 'node:test';

// A page-like global for the queue: same origin, a fetch that records what it was asked for.
const calls: string[] = [];
let inFlight = 0;
let peak = 0;
let failNext = 0;
const release: (() => void)[] = [];
const native = async (input: RequestInfo | URL) => {
  const url = new URL(input instanceof Request ? input.url : String(input), 'http://room.test/');
  if (input instanceof Request && input.cache === 'only-if-cached') return new Response('', { status: 504 });
  calls.push(url.pathname + url.search);
  if (url.pathname === '/asset-manifest.json') {
    return new Response(JSON.stringify({ '/models/a.glb': { h: 'aaa111', s: 4 } }), { status: 200 });
  }
  if (!url.pathname.endsWith('.glb')) return new Response('{}', { status: 200 });
  if (url.pathname === '/models/missing.glb') return new Response('', { status: 404 });
  if (failNext > 0) {
    failNext -= 1;
    return new Response('', { status: 503 });
  }
  inFlight += 1;
  peak = Math.max(peak, inFlight);
  await new Promise<void>(resolve => release.push(resolve));
  inFlight -= 1;
  return new Response(new Uint8Array([1, 2, 3, 4]), { status: 200 });
};
const g = globalThis as unknown as Record<string, unknown>;
g.location = new URL('http://room.test/');
g.window = { fetch: native, setTimeout: () => 0, location: g.location };

const flush = () => new Promise(resolve => setTimeout(resolve, 5));
const drain = async () => {
  for (let i = 0; i < 40; i += 1) {
    while (release.length) release.shift()!();
    await flush();
  }
};

test('models wait for the title song, go six at a time, by content hash, and retry a 503', async () => {
  const { openNetQueue, netProgress } = await import('../../src/engine/netQueue.ts');
  const page = g.window as { fetch: typeof fetch };
  assert.notEqual(page.fetch, native, 'installed over fetch');

  // not a model: straight through
  await page.fetch('http://room.test/api/health');
  assert.deepEqual(calls, ['/api/health']);

  const got = ['a', 'b', 'c', 'd', 'e', 'f', 'h'].map(n => page.fetch(`http://room.test/models/${n}.glb`));
  await flush();
  assert.ok(!calls.some(c => c.includes('.glb')), 'nothing downloads before the line opens');

  openNetQueue();
  await flush();
  await flush();
  assert.equal(calls.filter(c => c.includes('.glb')).length, 6, 'six at a time');
  assert.ok(calls.includes('/models/b.glb'), 'no hash in the manifest: plain URL');

  // Reading the body is what frees a slot (the loader does this). The seventh
  // file starts once one of the first six has been read.
  const bodies = Promise.all(got.map(async p => (await p).arrayBuffer()));
  await drain();
  const res = await bodies;
  assert.ok(calls.includes('/models/a.glb?v=aaa111'), 'asked for by hash');
  for (const r of res) assert.equal(r.byteLength, 4);
  assert.equal(peak, 6);
  await drain();
  const p = netProgress();
  assert.equal(p.files, 7);
  assert.equal(p.done, 7);
  assert.equal(p.idle, true);

  // a Railway restart: 503, then fine
  failNext = 1;
  const retried = page.fetch('http://room.test/models/g.glb');
  await drain();
  await new Promise(resolve => setTimeout(resolve, 1100));
  await drain();
  assert.equal((await retried).status, 200);
  assert.equal(calls.filter(c => c === '/models/g.glb').length, 2);

  // a missing file is a failure the room waits on; one the page called off is not
  const before = netProgress().failed;
  const missing = await page.fetch('http://room.test/models/missing.glb');
  assert.equal(missing.status, 404);
  const ctl = new AbortController();
  ctl.abort();
  await assert.rejects(page.fetch('http://room.test/models/gone.glb', { signal: ctl.signal }));
  await drain();
  assert.equal(netProgress().failed, before + 1);
});
