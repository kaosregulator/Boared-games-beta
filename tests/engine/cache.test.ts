import assert from 'node:assert/strict';
import test from 'node:test';
import {
  attachResourceCache,
  cacheSnapshot,
  disposeIfUnshared,
  noteCacheLookup,
  pinAsset,
  refcount,
  release,
  resetCacheForTests,
  retain,
} from '../../src/engine/cache.ts';

test('pinned and shared resources are not disposed', () => {
  resetCacheForTests();
  let disposed = 0;
  const dropped: string[] = [];
  attachResourceCache({
    lookup: url => (url === 'blob:toy' || url === '/models/teddy.glb' ? { dispose: () => { disposed += 1; } } : undefined),
    drop: url => {
      dropped.push(url);
    },
    dispose: value => {
      (value as { dispose: () => void }).dispose();
    },
  });
  pinAsset('/models/teddy.glb');
  noteCacheLookup('/models/teddy.glb');
  noteCacheLookup('/models/teddy.glb');
  noteCacheLookup('/models/desk.glb');
  assert.equal(cacheSnapshot().hits, 1);
  assert.equal(cacheSnapshot().misses, 1);
  assert.equal(disposeIfUnshared('/models/teddy.glb'), false);
  assert.equal(disposeIfUnshared('/models/desk.glb'), false);
  retain('blob:toy');
  assert.equal(refcount('blob:toy'), 1);
  assert.equal(disposeIfUnshared('blob:toy'), false);
  release('blob:toy');
  assert.equal(disposeIfUnshared('blob:toy'), true);
  assert.equal(disposed, 1);
  assert.deepEqual(dropped, ['blob:toy']);
});
