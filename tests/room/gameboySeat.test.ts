import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { LAYOUT, insetsFor } from '../../src/devices/viewRig.ts';
import { cartridgeKey } from '../../src/devices/gameboyBus.ts';

const desk = { w: 1280, h: 720, landscape: true };

test('the seated Game Boy keeps clear of its button bar on a keyboard (the inset used to be skipped)', () => {
  const inset = insetsFor('gameboy', false, desk, false);
  assert.equal(inset.bottom, LAYOUT.gbBar);
  assert.equal(inset.top, 12);
  // and in big screen the bar is still there, so the picture stays above it
  assert.equal(insetsFor('gameboy', false, desk, true).bottom, LAYOUT.gbBar);
  // the TV on a keyboard keeps its own hint-line inset
  assert.equal(insetsFor('tv', false, desk, false).bottom, LAYOUT.hint);
});

test('touch insets for the Game Boy are unchanged', () => {
  assert.deepEqual(insetsFor('gameboy', true, { w: 390, h: 844, landscape: false }, false), {
    top: 12,
    right: 0,
    bottom: LAYOUT.padPortrait + 56,
    left: 0,
  });
  assert.deepEqual(insetsFor('gameboy', true, { w: 844, h: 390, landscape: true }, false), {
    top: 12,
    right: LAYOUT.padSide,
    bottom: 72,
    left: LAYOUT.padSide,
  });
});

test('Escape and V come over from the emulator frame, nothing else does', () => {
  const o = 'http://localhost:3000';
  assert.equal(cartridgeKey({ source: 'cartridge', type: 'escape' }, o, o), 'escape');
  assert.equal(cartridgeKey({ source: 'cartridge', type: 'big' }, o, o), 'big');
  assert.equal(cartridgeKey({ source: 'cartridge', type: 'start' }, o, o), null);
  assert.equal(cartridgeKey({ source: 'pc98', type: 'escape' }, o, o), null);
  assert.equal(cartridgeKey({ source: 'cartridge', type: 'escape' }, 'https://evil.example', o), null);
  assert.equal(cartridgeKey(null, o, o), null);
});

test('play.html forwards the keys and moves the Game Boy Select off V', () => {
  const html = readFileSync('public/emu/play.html', 'utf8');
  assert.match(html, /tell\('escape'\)/);
  assert.match(html, /tell\('big'\)/);
  assert.match(html, /KeyV/);
  // Select (libretro slot 2) goes to Shift (16) on the Game Boy
  assert.match(html, /SELECT_SLOT = 2/);
  assert.match(html, /SHIFT = 16/);
});
