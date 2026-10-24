import assert from 'node:assert/strict';
import test from 'node:test';
import { exportLogReport, getLogHistory, log, resetLogForTests } from '../../src/engine/log.ts';

test('logger redacts secrets and keeps a bounded history', () => {
  resetLogForTests();
  log.info('boot', { source: 'test', token: 'super-secret', detail: 'bearer abc123' });
  log.error('broke', { source: 'test', asset: '/models/teddy.glb', stack: 'Error: api_key=abcd at boot' });
  const entries = getLogHistory();
  assert.equal(entries.length, 2);
  assert.equal(String(entries[0].fields.token), '[redacted]');
  assert.equal(String(entries[0].fields.detail), 'bearer [redacted]');
  assert.match(String(entries[1].stack ?? ''), /api_key=\[redacted\]/);
  assert.equal(entries[1].asset, '/models/teddy.glb');
  const report = exportLogReport();
  assert.equal(report.correlationId, 'test-correlation');
  assert.equal(JSON.stringify(report).includes('super-secret'), false);
  assert.equal(JSON.stringify(report).includes('abcd'), false);
});

test('logger redacts a secret in the message, the error, the stack, and nested fields', () => {
  resetLogForTests();
  const secret = 'sk_test_FurbyMute99';
  log.error(`boot failed token=${secret}`, {
    source: 'preload',
    asset: '/models/teddy.glb',
    gameId: 'room',
    err: new Error(`bearer ${secret} rejected`),
    nested: { authorization: secret, note: `password=${secret}`, ok: 'teddy anisotropy 16' },
  });
  const entry = getLogHistory()[0];
  const nested = entry.fields.nested as { authorization: string; note: string; ok: string };
  const dumped = JSON.stringify(exportLogReport());
  assert.equal(dumped.includes(secret), false);
  assert.match(entry.message, /token=\[redacted\]/);
  assert.match(String(entry.stack), /bearer \[redacted\]/);
  assert.equal(nested.authorization, '[redacted]');
  assert.match(nested.note, /password=\[redacted\]/);
  assert.equal(nested.ok, 'teddy anisotropy 16');
  assert.equal(entry.asset, '/models/teddy.glb');
  assert.equal(entry.gameId, 'room');
  assert.equal(entry.source, 'preload');
});

test('ordinary diagnostic lines stay readable', () => {
  resetLogForTests();
  log.info('model ready', { source: 'room', asset: '/models/teddy.glb', gameId: 'room', detail: 'anisotropy 16' });
  const entry = getLogHistory()[0];
  assert.equal(entry.message, 'model ready');
  assert.equal(entry.source, 'room');
  assert.equal(entry.asset, '/models/teddy.glb');
  assert.equal(entry.gameId, 'room');
  assert.equal(entry.fields.detail, 'anisotropy 16');
  const dumped = JSON.stringify(exportLogReport());
  assert.match(dumped, /model ready/);
  assert.match(dumped, /\/models\/teddy\.glb/);
  assert.match(dumped, /anisotropy 16/);
});
