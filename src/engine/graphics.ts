import { log } from './log';
import { readEnginePref, writeEnginePref } from './persist';

export type GraphicsPreset = 'low' | 'balanced' | 'high';

export interface GraphicsSnapshot {
  /** The player's choice. This is what gets saved. */
  preset: GraphicsPreset;
  /** When false, the room stays on `preset` no matter the frame rate. */
  adaptive: boolean;
  /** What is actually rendering. Equals `preset` unless adaptive has stepped. */
  effective: GraphicsPreset;
  /** Renderer pixel ratio for `effective`. Never a texture-quality setting. */
  dpr: number;
}

const ORDER: GraphicsPreset[] = ['low', 'balanced', 'high'];
const STEP_DOWN_FPS = 40;
const STEP_UP_FPS = 55;
const DOWN_HOLD_MS = 3000;
const UP_HOLD_MS = 12000;
const COOLDOWN_MS = 8000;
/** Shader compiles and first uploads stall the opening seconds; a dip then is not remembered. */
const WARMUP_MS = 10000;

let userPreset: GraphicsPreset = 'high';
// Off by default: every phone, laptop and PC gets the same sharp High picture.
// Stepping the pixel ratio down on a slow device made its picture softer than
// everyone else's (and the resize itself was a hitch). The smoothness comes
// from the room doing less work instead (docs/performance.md). A player can
// still turn it on in the Engine panel.
let adaptiveOn = false;
let effective: GraphicsPreset = 'high';
/** Highest preset adaptive may climb back to. A level that could not hold 40 fps is not retried. */
let ceiling: GraphicsPreset = 'high';
let measuredDpr: number | null = null;
let lowSince: number | null = null;
let highSince: number | null = null;
let cooldownUntil = 0;
let firstSample: number | null = null;
let persistWrites = true;
let hydrated = false;
const listeners = new Set<(snap: GraphicsSnapshot) => void>();

export function dprForPreset(preset: GraphicsPreset, devicePixelRatio: number): number {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  if (preset === 'low') return 1;
  if (preset === 'balanced') return Math.min(1.5, Math.max(1, dpr));
  // 3x phones stay at 2. That caps fill-rate; it does not downsample textures.
  return Math.min(2, Math.max(1, dpr));
}

function deviceDpr() {
  if (measuredDpr !== null) return measuredDpr;
  if (typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0) {
    return window.devicePixelRatio;
  }
  return 1;
}

export function currentGraphics(): GraphicsSnapshot {
  return {
    preset: userPreset,
    adaptive: adaptiveOn,
    effective,
    dpr: dprForPreset(effective, deviceDpr()),
  };
}

function emit() {
  const snap = currentGraphics();
  for (const fn of listeners) fn(snap);
}

export function subscribeGraphics(fn: (snap: GraphicsSnapshot) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setMeasuredDevicePixelRatio(n: number | null) {
  measuredDpr = n;
  emit();
}

export function hydrateGraphicsFromStorage() {
  if (hydrated) return;
  hydrated = true;
  const preset = readEnginePref('graphics-preset');
  const adaptive = readEnginePref('graphics-adaptive');
  if (preset === 'low' || preset === 'balanced' || preset === 'high') userPreset = preset;
  if (adaptive === '1') adaptiveOn = true;
  if (adaptive === '0') adaptiveOn = false;
  effective = userPreset;
  ceiling = userPreset;
  lowSince = null;
  highSince = null;
  cooldownUntil = 0;
}

export function setGraphicsPreset(preset: GraphicsPreset) {
  userPreset = preset;
  effective = preset;
  ceiling = preset;
  lowSince = null;
  highSince = null;
  cooldownUntil = 0;
  if (persistWrites) writeEnginePref('graphics-preset', preset);
  emit();
}

export function setAdaptive(on: boolean) {
  adaptiveOn = on;
  if (!on) {
    effective = userPreset;
    ceiling = userPreset;
    lowSince = null;
    highSince = null;
    cooldownUntil = 0;
  }
  if (persistWrites) writeEnginePref('graphics-adaptive', on ? '1' : '0');
  emit();
}

function step(dir: -1 | 1, now: number) {
  const idx = ORDER.indexOf(effective);
  const top = ORDER.indexOf(ceiling);
  const next = ORDER[Math.min(top, Math.max(0, idx + dir))];
  // Stepping down remembers the level that failed, so the room does not bounce
  // High -> Balanced -> High every 20 seconds and reallocate the canvas each time.
  if (dir < 0 && idx > 0 && firstSample !== null && now - firstSample >= WARMUP_MS) ceiling = ORDER[idx - 1];
  lowSince = null;
  highSince = null;
  cooldownUntil = now + COOLDOWN_MS;
  if (next === effective) return;
  effective = next;
  log.info('graphics stepped from sustained frame rate', {
    source: 'graphics',
    from: userPreset,
    to: effective,
  });
  emit();
}

/**
 * Adaptive changes pixel ratio only, and only after the frame rate stays
 * low or high. It is off unless the player turns it on. Calling this with
 * adaptive off does not move quality.
 */
export function noteFrameRate(fps: number, at?: number) {
  // Not a default parameter: the minifier rewrote `performance?.now?.()` there into
  // code that referenced an out-of-scope variable and threw every sample in production.
  const now = at ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (!adaptiveOn || !Number.isFinite(fps) || !Number.isFinite(now)) return;
  if (firstSample === null) firstSample = now;
  if (now < cooldownUntil) return;
  if (fps < STEP_DOWN_FPS) {
    highSince = null;
    if (lowSince === null) lowSince = now;
    else if (now - lowSince >= DOWN_HOLD_MS) step(-1, now);
    return;
  }
  if (fps > STEP_UP_FPS) {
    lowSince = null;
    if (highSince === null) highSince = now;
    else if (now - highSince >= UP_HOLD_MS) step(1, now);
    return;
  }
  lowSince = null;
  highSince = null;
}

export function resetGraphicsForTests() {
  userPreset = 'high';
  adaptiveOn = false;
  effective = 'high';
  ceiling = 'high';
  firstSample = null;
  measuredDpr = null;
  lowSince = null;
  highSince = null;
  cooldownUntil = 0;
  persistWrites = false;
  hydrated = false;
  listeners.clear();
}
