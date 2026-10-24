import assert from 'node:assert/strict';
import test from 'node:test';
import { crouchKeyAction } from '../../src/room/crouch.ts';
import {
  detectControlPreset,
  lookTurn,
  PRESET_SENSITIVITY,
  resetControlSettingsForTests,
  setControlPreset,
  setInvertLook,
  setLookSensitivity,
  controlSettings,
} from '../../src/room/controls.ts';

test('crouch toggles on C and space only stands', () => {
  assert.equal(crouchKeyAction(false, 'KeyC', false), 'toggle');
  assert.equal(crouchKeyAction(true, 'KeyC', false), 'toggle');
  assert.equal(crouchKeyAction(false, 'KeyC', true), 'ignore');
  assert.equal(crouchKeyAction(true, 'Space', false), 'stand');
  assert.equal(crouchKeyAction(false, 'Space', false), 'ignore');
  assert.equal(crouchKeyAction(false, 'ControlLeft', false), 'ignore');
  assert.equal(crouchKeyAction(true, 'KeyW', false), 'ignore');
});

test('look settings scale and invert without changing a zero drag', () => {
  const plain = lookTurn(10, 4, 0.0032, { preset: 'desktop', sensitivity: 1, invertX: false, invertY: false });
  assert.equal(plain.yaw, 0.032);
  assert.equal(plain.pitch, 0.0128);
  const flipped = lookTurn(10, 4, 0.0032, { preset: 'custom', sensitivity: 2, invertX: true, invertY: true });
  assert.equal(flipped.yaw, -0.064);
  assert.equal(flipped.pitch, -0.0256);
  const still = lookTurn(0, 0, 0.0032, { preset: 'phone', sensitivity: 1.25, invertX: true, invertY: true });
  assert.equal(Math.abs(still.yaw) + Math.abs(still.pitch), 0);
});

test('a device preset sets look speed and a manual change becomes custom', () => {
  resetControlSettingsForTests();
  const memory = new Map<string, string>();
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
  setControlPreset('laptop');
  assert.equal(controlSettings.preset, 'laptop');
  assert.equal(controlSettings.sensitivity, PRESET_SENSITIVITY.laptop);
  setLookSensitivity(1.4);
  assert.equal(controlSettings.preset, 'custom');
  assert.equal(controlSettings.sensitivity, 1.4);
  setInvertLook('y', true);
  assert.equal(controlSettings.invertY, true);
  assert.equal(controlSettings.preset, 'custom');
  const saved = JSON.parse(memory.get('room-controls') ?? '{}') as { sensitivity: number; invertY: boolean };
  assert.equal(saved.sensitivity, 1.4);
  assert.equal(saved.invertY, true);
});

test('device detection follows touch and width', () => {
  assert.equal(detectControlPreset({ touch: false, width: 1440 }), 'desktop');
  assert.equal(detectControlPreset({ touch: false, width: 1100 }), 'laptop');
  assert.equal(detectControlPreset({ touch: true, width: 1024 }), 'tablet');
  assert.equal(detectControlPreset({ touch: true, width: 390 }), 'phone');
});
