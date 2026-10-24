import { useEffect, useState } from 'react';

export type ControlPreset = 'desktop' | 'laptop' | 'tablet' | 'phone' | 'custom';

export interface ControlSettings {
  preset: ControlPreset;
  /** Multiplier on the room's look speed. 1 is the original feel. */
  sensitivity: number;
  invertX: boolean;
  invertY: boolean;
}

export const PRESET_SENSITIVITY: Record<Exclude<ControlPreset, 'custom'>, number> = {
  desktop: 1,
  laptop: 0.75,
  tablet: 1.1,
  phone: 1.25,
};

const PRESETS: ControlPreset[] = ['desktop', 'laptop', 'tablet', 'phone', 'custom'];
const KEY = 'room-controls';
const SENS_MIN = 0.4;
const SENS_MAX = 2;

export function detectControlPreset(input: { touch: boolean; width: number }): Exclude<ControlPreset, 'custom'> {
  if (!input.touch && input.width >= 1200) return 'desktop';
  if (!input.touch) return 'laptop';
  if (input.width >= 768) return 'tablet';
  return 'phone';
}

export function lookTurn(dx: number, dy: number, base: number, settings: ControlSettings) {
  const scale = base * settings.sensitivity;
  return {
    yaw: dx * scale * (settings.invertX ? -1 : 1),
    pitch: dy * scale * (settings.invertY ? -1 : 1),
  };
}

function clampSens(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.round(Math.min(SENS_MAX, Math.max(SENS_MIN, n)) * 100) / 100;
}

function fallback(): ControlSettings {
  const preset =
    typeof window === 'undefined'
      ? 'desktop'
      : detectControlPreset({
          touch: typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0,
          width: window.innerWidth,
        });
  return { preset, sensitivity: PRESET_SENSITIVITY[preset], invertX: false, invertY: false };
}

function sanitize(raw: unknown, base: ControlSettings): ControlSettings {
  if (!raw || typeof raw !== 'object') return base;
  const value = raw as Partial<ControlSettings>;
  const preset = PRESETS.includes(value.preset as ControlPreset) ? (value.preset as ControlPreset) : base.preset;
  return {
    preset,
    sensitivity: clampSens(typeof value.sensitivity === 'number' ? value.sensitivity : base.sensitivity),
    invertX: Boolean(value.invertX),
    invertY: Boolean(value.invertY),
  };
}

function storage() {
  try {
    return (globalThis as { localStorage?: Storage }).localStorage ?? null;
  } catch {
    return null;
  }
}

function readStored(base: ControlSettings): ControlSettings {
  const store = storage();
  if (!store) return base;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return base;
    return sanitize(JSON.parse(raw), base);
  } catch {
    return base;
  }
}

export const controlSettings: ControlSettings = readStored(fallback());
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(fn => fn());
}

function save() {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(KEY, JSON.stringify(controlSettings));
  } catch {
    // The setting is still applied for this visit.
  }
}

function assign(next: ControlSettings) {
  controlSettings.preset = next.preset;
  controlSettings.sensitivity = next.sensitivity;
  controlSettings.invertX = next.invertX;
  controlSettings.invertY = next.invertY;
  save();
  emit();
}

export function setControlPreset(preset: Exclude<ControlPreset, 'custom'>) {
  assign({ ...controlSettings, preset, sensitivity: PRESET_SENSITIVITY[preset] });
}

export function setLookSensitivity(sensitivity: number) {
  assign({ ...controlSettings, preset: 'custom', sensitivity: clampSens(sensitivity) });
}

export function setInvertLook(axis: 'x' | 'y', on: boolean) {
  if (axis === 'x') assign({ ...controlSettings, invertX: on });
  else assign({ ...controlSettings, invertY: on });
}

export function useControlSettings() {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump(n => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return controlSettings;
}

export function resetControlSettingsForTests(next?: Partial<ControlSettings>) {
  controlSettings.preset = next?.preset ?? 'desktop';
  controlSettings.sensitivity = next?.sensitivity ?? 1;
  controlSettings.invertX = next?.invertX ?? false;
  controlSettings.invertY = next?.invertY ?? false;
  listeners.clear();
}
