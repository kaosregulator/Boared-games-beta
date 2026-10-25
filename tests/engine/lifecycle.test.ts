import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { openMiniGame, resetLifecycleForTests, setMiniGamePhase } from '../../src/engine/lifecycle.ts';
import { resetLogForTests } from '../../src/engine/log.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('critical room models are on disk', () => {
  for (const name of ['teddy.glb', 'pcdesk.glb']) {
    const file = path.join(root, 'public/models', name);
    assert.equal(fs.existsSync(file), true, file);
    assert.equal(fs.statSync(file).size > 1000, true, name);
  }
});

test('mini-game unload runs its cleanups once', () => {
  resetLogForTests();
  resetLifecycleForTests();
  let cleaned = 0;
  const life = openMiniGame('chess');
  life.addCleanup(() => {
    cleaned += 1;
  });
  setMiniGamePhase('chess', 'pause');
  life.close();
  life.close();
  assert.equal(cleaned, 1);
});
