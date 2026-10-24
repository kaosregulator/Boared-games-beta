import assert from 'node:assert/strict';
import test from 'node:test';
import { cachedJsonGet, resetHttpCacheForTests } from '../../src/engine/httpCache.ts';

test('json get cache reuses a success and retries a failure', async () => {
  resetHttpCacheForTests();
  let calls = 0;
  const original = globalThis.fetch;
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    if (init?.signal?.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
    calls += 1;
    if (calls === 1) return new Response('no', { status: 500 });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  try {
    await assert.rejects(() => cachedJsonGet('https://example.test/item', { ttlMs: 1000, now: 10 }));
    const first = await cachedJsonGet('https://example.test/item', { ttlMs: 1000, now: 20 });
    const second = await cachedJsonGet('https://example.test/item', { ttlMs: 1000, now: 30 });
    assert.equal(calls, 2);
    assert.deepEqual(first, { ok: true });
    assert.deepEqual(second, { ok: true });
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(() => cachedJsonGet('https://example.test/other', { ttlMs: 1000, signal: controller.signal }));
  } finally {
    globalThis.fetch = original;
    resetHttpCacheForTests();
  }
});
