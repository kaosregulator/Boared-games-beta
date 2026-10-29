import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { capTier, deviceCeiling, resolveModelUrl, tierForPreset, type AssetTier } from '../../src/engine/assetTiers.ts';

const desktop = { touch: false, shortSide: 1080, memoryGb: 8, maxTexture: 16384 };
const phone = { touch: true, shortSide: 390, memoryGb: null, maxTexture: 4096 };

test('each graphics preset maps to its own model tier', () => {
  assert.equal(tierForPreset('low'), 'low');
  assert.equal(tierForPreset('balanced'), 'medium');
  assert.equal(tierForPreset('high'), 'high');
});

test('the device caps the tier so phones and weak GPUs never load 4K furniture', () => {
  assert.equal(deviceCeiling(desktop), 'high');
  assert.equal(deviceCeiling(phone), 'medium');
  assert.equal(deviceCeiling({ ...phone, memoryGb: 3 }), 'low');
  assert.equal(deviceCeiling({ ...desktop, memoryGb: 4 }), 'medium');
  assert.equal(deviceCeiling({ ...desktop, memoryGb: 2 }), 'low');
  assert.equal(deviceCeiling({ ...desktop, maxTexture: 2048 }), 'medium');
  assert.equal(deviceCeiling({ ...desktop, maxTexture: 1024 }), 'low');
  assert.equal(deviceCeiling({ ...desktop, memoryGb: null, maxTexture: null }), 'high');
  assert.equal(capTier('high', 'medium'), 'medium');
  assert.equal(capTier('low', 'high'), 'low');
});

test('model URLs fall back to the original until a tier is built', () => {
  const models = {
    'window.glb': { low: { triangles: 1, kb: 1, colorPx: 1024 }, high: { triangles: 1, kb: 1, colorPx: 4096 } },
  } as Record<string, Partial<Record<AssetTier, { triangles: number; kb: number; colorPx: number }>>>;
  assert.equal(resolveModelUrl('/models/window.glb', 'high', models), '/models/high/window.glb');
  assert.equal(resolveModelUrl('/models/window.glb', 'low', models), '/models/low/window.glb');
  // No medium build: the next lower build is used, never something heavier than asked.
  assert.equal(resolveModelUrl('/models/window.glb', 'medium', models), '/models/low/window.glb');
  assert.equal(resolveModelUrl('/models/door.glb', 'high', models), '/models/door.glb');
  assert.equal(resolveModelUrl('/models/hands/left.glb', 'high', models), '/models/hands/left.glb');
  assert.equal(resolveModelUrl('/games/connect4/board.glb', 'high', models), '/games/connect4/board.glb');
});

test('only lower-or-missing builds are substituted; a higher one is used only when nothing lower exists', () => {
  const models = { 'crt.glb': { high: { triangles: 1, kb: 1, colorPx: 4096 } } } as Record<
    string,
    Partial<Record<AssetTier, { triangles: number; kb: number; colorPx: number }>>
  >;
  assert.equal(resolveModelUrl('/models/crt.glb', 'low', models), '/models/high/crt.glb');
});

test('budgets climb from low to high and every source points at a real room model', () => {
  const tiers = JSON.parse(readFileSync('scripts/assets/tiers.json', 'utf8')).tiers;
  const sources = JSON.parse(readFileSync('scripts/assets/sources.json', 'utf8')).models;
  for (const cls of ['hero', 'closeup', 'prop']) {
    const [l, m, h] = ['low', 'medium', 'high'].map(t => tiers[t][cls]);
    assert.ok(l.triangles < m.triangles && m.triangles < h.triangles, `${cls} triangles climb`);
    assert.ok(l.colorPx <= m.colorPx && m.colorPx <= h.colorPx, `${cls} colour maps climb`);
    assert.ok(l.error >= m.error && m.error >= h.error, `${cls} tolerance tightens`);
    // The old script used 0.02, which flattened the furniture.
    for (const t of [l, m, h]) assert.ok(t.error <= 0.003, `${cls} tolerance stays tight`);
  }
  for (const [file, spec] of Object.entries(sources) as [string, { class: string; driveId: string }][]) {
    assert.ok(['hero', 'closeup', 'prop'].includes(spec.class), `${file} class`);
    assert.match(spec.driveId, /^[\w-]{20,}$/, `${file} drive id`);
    assert.ok(existsSync(`public/models/${file}`), `${file} exists in public/models`);
  }
});
