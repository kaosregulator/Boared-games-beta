import assert from 'node:assert/strict';
import test from 'node:test';
import { cartridgeWarmList, cartridgesStillCold, resetCartridgeWarmForTests, warmCartridges } from '../../src/devices/cartridges.ts';
import { continueWarm, resetTableWarmForTests, warmTableGames } from '../../src/room/table/tableGames.ts';

test('continueWarm records a finished import and resumes after an abort', async () => {
  const calls: string[] = [];
  let releaseSecond: () => void = () => {};
  const gate = new Promise<void>(resolve => {
    releaseSecond = resolve;
  });
  const loads = [
    async () => {
      calls.push('a');
    },
    async () => {
      calls.push('b-start');
      await gate;
      calls.push('b-end');
    },
    async () => {
      calls.push('c');
    },
  ];
  const cursor = { index: 0 };
  const ac = new AbortController();
  const run = continueWarm(loads, cursor, ac.signal);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ['a', 'b-start']);
  ac.abort();
  releaseSecond();
  await assert.rejects(run, (err: unknown) => err instanceof DOMException && err.name === 'AbortError');
  assert.equal(cursor.index, 2);
  assert.deepEqual(calls, ['a', 'b-start', 'b-end']);
  await continueWarm(loads, cursor);
  assert.deepEqual(calls, ['a', 'b-start', 'b-end', 'c']);
  assert.equal(calls.filter(call => call === 'a').length, 1);
  assert.equal(calls.filter(call => call === 'c').length, 1);
});

test('warmTableGames shares one run and does not import after an aborted signal', async () => {
  resetTableWarmForTests();
  const signal = AbortSignal.abort();
  const first = warmTableGames(signal);
  const second = warmTableGames(signal);
  assert.equal(first, second);
  await assert.rejects(first, (err: unknown) => err instanceof DOMException && err.name === 'AbortError');
  resetTableWarmForTests();
});

test('cartridge warming skips files that already arrived and retries the rest', async () => {
  resetCartridgeWarmForTests();
  const fetched: string[] = [];
  const host = globalThis as unknown as {
    window: unknown;
    fetch: typeof fetch;
    WebGL2RenderingContext: unknown;
  };
  const previous = {
    window: host.window,
    fetch: host.fetch,
    WebGL2RenderingContext: host.WebGL2RenderingContext,
  };
  host.window = {};
  host.WebGL2RenderingContext = function WebGL2RenderingContext() {};
  try {
    assert.equal(cartridgesStillCold(['/a', '/b'], new Set(['/a'])).join(','), '/b');
    const pending = new Map<string, { resolve: (value: { ok: boolean }) => void }>();
    host.fetch = ((url: string, init?: RequestInit) => {
      fetched.push(String(url));
      if (init?.signal?.aborted) return Promise.reject(new DOMException('The operation was aborted.', 'AbortError'));
      return new Promise<{ ok: boolean }>((resolve, reject) => {
        pending.set(String(url), { resolve });
        const abort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
        if (init?.signal?.aborted) abort();
        else init?.signal?.addEventListener('abort', abort, { once: true });
      });
    }) as typeof fetch;

    const ac = new AbortController();
    const warm = warmCartridges(ac.signal);
    assert.equal(warmCartridges(ac.signal), warm);
    const loader = [...pending.keys()].find(url => url.endsWith('/emu/data/loader.js'));
    assert.ok(loader);
    pending.get(loader)?.resolve({ ok: true });
    await new Promise(resolve => setImmediate(resolve));
    const firstWave = fetched.length;
    ac.abort();
    await assert.rejects(warm);
    fetched.length = 0;
    host.fetch = (async (url: string) => {
      fetched.push(String(url));
      return { ok: String(url) !== '/emu/data/emulator.min.js' };
    }) as typeof fetch;
    await assert.rejects(() => warmCartridges(), /cartridge warm incomplete/);
    assert.equal(fetched.includes('/emu/data/loader.js'), false);
    assert.equal(fetched.length, firstWave - 1);
    const failed = [...fetched];
    fetched.length = 0;
    host.fetch = (async (url: string) => {
      fetched.push(String(url));
      return { ok: true };
    }) as typeof fetch;
    await warmCartridges();
    assert.deepEqual(fetched, ['/emu/data/emulator.min.js']);
    assert.equal(failed.includes('/emu/data/emulator.min.js'), true);
  } finally {
    resetCartridgeWarmForTests();
    host.window = previous.window;
    host.WebGL2RenderingContext = previous.WebGL2RenderingContext;
    host.fetch = previous.fetch;
  }
});

test('cartridge warming lists every player file once', () => {
  const host = globalThis as unknown as { WebGL2RenderingContext: unknown };
  const previous = host.WebGL2RenderingContext;
  host.WebGL2RenderingContext = function WebGL2RenderingContext() {};
  try {
    const files = cartridgeWarmList();
    assert.equal(new Set(files).size, files.length);
    assert.ok(files.includes('/emu/data/loader.js'));
    assert.ok(files.includes('/roms/tetris-gb.gb'));
  } finally {
    host.WebGL2RenderingContext = previous;
  }
});
