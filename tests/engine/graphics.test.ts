import assert from 'node:assert/strict';
import test from 'node:test';
import {
  currentGraphics,
  dprForPreset,
  hydrateGraphicsFromStorage,
  noteFrameRate,
  resetGraphicsForTests,
  setAdaptive,
  setGraphicsPreset,
  setMeasuredDevicePixelRatio,
} from '../../src/engine/graphics.ts';
import { noteContextLoss, noteContextRestored, resetRecoveryForTests } from '../../src/engine/recovery.ts';
import { resetLogForTests } from '../../src/engine/log.ts';

test('high preset caps pixel ratio at 2 and does not drop on its own', () => {
  resetLogForTests();
  resetGraphicsForTests();
  resetRecoveryForTests();
  setMeasuredDevicePixelRatio(3);
  assert.equal(dprForPreset('high', 3), 2);
  assert.equal(dprForPreset('balanced', 3), 1.5);
  assert.equal(dprForPreset('low', 3), 1);
  assert.equal(currentGraphics().preset, 'high');
  assert.equal(currentGraphics().adaptive, false);
  assert.equal(currentGraphics().dpr, 2);
  noteFrameRate(10, 0);
  noteFrameRate(10, 10_000);
  assert.equal(currentGraphics().effective, 'high');
  noteContextLoss();
  assert.equal(currentGraphics().effective, 'high');
  assert.equal(currentGraphics().dpr, 2);
});

test('adaptive steps only after a sustained frame rate, then restores on request', () => {
  resetLogForTests();
  resetGraphicsForTests();
  setMeasuredDevicePixelRatio(2);
  setAdaptive(true);
  noteFrameRate(30, 0);
  noteFrameRate(30, 2999);
  assert.equal(currentGraphics().effective, 'high');
  noteFrameRate(30, 3000);
  assert.equal(currentGraphics().effective, 'balanced');
  assert.equal(currentGraphics().dpr, 1.5);
  assert.equal(currentGraphics().preset, 'high');
  noteFrameRate(20, 10_999);
  assert.equal(currentGraphics().effective, 'balanced');
  noteFrameRate(20, 11_000);
  noteFrameRate(20, 14_000);
  assert.equal(currentGraphics().effective, 'low');
  setAdaptive(false);
  assert.equal(currentGraphics().effective, 'high');
  assert.equal(currentGraphics().dpr, 2);
});

test('frame-rate flicker does not change the preset', () => {
  resetLogForTests();
  resetGraphicsForTests();
  setMeasuredDevicePixelRatio(2);
  setAdaptive(true);
  for (let t = 0; t < 20_000; t += 500) {
    noteFrameRate(t % 1000 < 500 ? 30 : 70, t);
  }
  assert.equal(currentGraphics().effective, 'high');
});

test('a saved choice is explicit and a missing save stays high', () => {
  resetLogForTests();
  resetGraphicsForTests();
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    clear: () => memory.clear(),
    key: () => null,
    length: 0,
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  hydrateGraphicsFromStorage();
  assert.equal(currentGraphics().preset, 'high');
  assert.equal(currentGraphics().adaptive, false);
  resetGraphicsForTests();
  memory.set('engine:graphics-preset', 'balanced');
  memory.set('engine:graphics-adaptive', '0');
  hydrateGraphicsFromStorage();
  assert.equal(currentGraphics().preset, 'balanced');
  assert.equal(currentGraphics().effective, 'balanced');
  assert.equal(currentGraphics().adaptive, false);
  setGraphicsPreset('high');
});

test('a second hydrate leaves an adaptive step in place', () => {
  resetLogForTests();
  resetGraphicsForTests();
  setMeasuredDevicePixelRatio(2);
  const memory = new Map<string, string>([
    ['engine:graphics-preset', 'high'],
    ['engine:graphics-adaptive', '1'],
  ]);
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    },
    configurable: true,
  });
  hydrateGraphicsFromStorage();
  noteFrameRate(30, 0);
  noteFrameRate(30, 3000);
  assert.equal(currentGraphics().preset, 'high');
  assert.equal(currentGraphics().effective, 'balanced');
  assert.equal(currentGraphics().dpr, 1.5);
  hydrateGraphicsFromStorage();
  assert.equal(currentGraphics().effective, 'balanced');
  assert.equal(currentGraphics().dpr, 1.5);
  noteContextLoss();
  noteContextRestored();
  assert.equal(currentGraphics().effective, 'balanced');
  assert.equal(currentGraphics().preset, 'high');
  assert.equal(currentGraphics().dpr, 1.5);
});
