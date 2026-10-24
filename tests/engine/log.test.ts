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
