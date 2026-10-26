import { useSyncExternalStore } from 'react';

/**
 * Things the computer remembers between visits: wallpaper, screen saver,
 * volume, high scores. Kept in localStorage; every read survives it failing.
 */

export type Wallpaper = 'none' | 'clouds' | 'setup' | 'tiles' | 'bubbles' | 'carved' | 'sunset' | 'custom';
export type Saver = 'none' | 'pipes' | 'starfield' | 'mystify' | 'flags';

export interface Settings {
  wallpaper: Wallpaper;
  saver: Saver;
  /** Minutes before the screen saver starts. */
  saverWait: number;
  volume: number;
  user: string;
}

const KEY = 'pc98.settings';
const DEFAULTS: Settings = { wallpaper: 'clouds', saver: 'pipes', saverWait: 1, volume: 0.8, user: 'Player' };

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

let settings = load();
const listeners = new Set<() => void>();

export function getSettings() {
  return settings;
}

export function setSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* private mode: just this visit */
  }
  listeners.forEach(l => l());
}

export function useSettings() {
  return useSyncExternalStore(
    l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => settings,
  );
}

export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`pc98.${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore(key: string, value: unknown) {
  try {
    localStorage.setItem(`pc98.${key}`, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** Global hourglass: anything loading bumps this and drops it when done. */
let busy = 0;
const busyListeners = new Set<() => void>();
export function hourglass(ms: number) {
  busy += 1;
  busyListeners.forEach(l => l());
  window.setTimeout(() => {
    busy = Math.max(0, busy - 1);
    busyListeners.forEach(l => l());
  }, ms);
}
export function useBusy() {
  return useSyncExternalStore(
    l => {
      busyListeners.add(l);
      return () => busyListeners.delete(l);
    },
    () => busy > 0,
  );
}
