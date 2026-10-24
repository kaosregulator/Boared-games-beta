import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { app } from '../../server.mjs';

test('health route answers', async () => {
  const server = createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(res.status, 200);
    assert.equal(typeof res.headers.get('x-correlation-id'), 'string');
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.name, 'Game Room Beta');
    assert.equal(body.version, '0.1.0-beta');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
