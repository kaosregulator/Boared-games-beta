import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { app, cacheFor } from '../../server.mjs';
import { configureLog } from '../../logCore.mjs';

configureLog({ console: 'silent' });

test('pages are always rechecked, hashed bundles kept', () => {
  // pc.html once had a day's cache, which kept old Windows on screen after a deploy
  for (const page of ['/', '/index.html', '/pc.html', '/pc/spacecadet/index.html', '/pc/stillplay/play.html', '/build.json', '/manifest.webmanifest']) {
    assert.equal(cacheFor(page), 'no-cache', page);
  }
  assert.match(cacheFor('/assets/pc-abc123.js'), /immutable/);
  assert.match(cacheFor('/models/room.glb'), /max-age=86400/);
});

test('client log takes a beacon and health names the build', async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/client-log`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ level: 'error', message: 'boom', page: 'pc', buildId: 'old' }),
    });
    assert.equal(res.status, 204);
    assert.equal(typeof res.headers.get('x-build-id'), 'string');
    const bad = await fetch(`http://127.0.0.1:${port}/api/client-log`, { method: 'POST', body: 'not json' });
    assert.equal(bad.status, 400);
    const health = await (await fetch(`http://127.0.0.1:${port}/api/health`)).json();
    assert.equal(typeof health.build.id, 'string');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
