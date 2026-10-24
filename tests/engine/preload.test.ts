import assert from 'node:assert/strict';
import test from 'node:test';
import { defineAsset, resetAssetsForTests } from '../../src/engine/assets.ts';
import { resetLogForTests } from '../../src/engine/log.ts';
import { cancelPreloads, enqueuePreload, preloadSnapshot, resetPreloadForTests, retryFailed } from '../../src/engine/preload.ts';

function reset() {
  resetLogForTests();
  resetPreloadForTests();
  resetAssetsForTests();
}

test('preload runs a job once and can retry a failure', async () => {
  reset();
  defineAsset({ id: 'job', url: 'module:job', kind: 'optional', priority: 1, optional: true });
  let runs = 0;
  const first = enqueuePreload('job', 'optional', async () => {
    runs += 1;
  });
  const second = enqueuePreload('job', 'optional', async () => {
    runs += 1;
  });
  await Promise.all([first, second]);
  assert.equal(runs, 1);
  assert.equal(preloadSnapshot().done, 1);

  reset();
  defineAsset({ id: 'flaky', url: 'module:flaky', kind: 'optional', priority: 1, optional: true });
  let tries = 0;
  await enqueuePreload('flaky', 'optional', async () => {
    tries += 1;
    if (tries < 3) throw new Error('not yet');
  });
  assert.equal(tries, 3);
  assert.equal(preloadSnapshot().jobs[0]?.state, 'ready');
});

test('preload cancels an in-flight job and retries a failed one', async () => {
  reset();
  defineAsset({ id: 'slow', url: 'module:slow', kind: 'optional', priority: 1, optional: true });
  const pending = enqueuePreload(
    'slow',
    'optional',
    signal =>
      new Promise<void>((_resolve, reject) => {
        const onAbort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort, { once: true });
      }),
  );
  cancelPreloads();
  await pending;
  assert.equal(preloadSnapshot().jobs.find(job => job.id === 'slow')?.state, 'cancelled');

  reset();
  defineAsset({ id: 'needs-retry', url: 'module:needs-retry', kind: 'optional', priority: 1, optional: true });
  let allow = false;
  await enqueuePreload('needs-retry', 'optional', async () => {
    if (!allow) throw new Error('no');
  });
  assert.equal(preloadSnapshot().failed, 1);
  allow = true;
  await retryFailed();
  assert.equal(preloadSnapshot().jobs.find(job => job.id === 'needs-retry')?.state, 'ready');
});
