import { useSyncExternalStore } from 'react';
import type { IconName } from './icons';

/**
 * The window manager: which programs are open, where, which one is on top.
 * A tiny external store so the taskbar, the desktop and every window read
 * the same list.
 */

export type AppId =
  | 'minesweeper'
  | 'pinball'
  | 'paint'
  | 'wordpad'
  | 'media'
  | 'notepad'
  | 'explorer'
  | 'ie'
  | 'display'
  | 'run'
  | 'help'
  | 'solitaire'
  | 'y2k'
  | 'freecell'
  | 'hearts'
  | 'spider'
  | 'tetris'
  | 'taipei'
  | 'pegged'
  | 'arcade'
  | 'webgame'
  | 'popup'
  | 'antivirus'
  | 'dialog';

export interface DialogSpec {
  icon?: IconName;
  text: string;
  buttons?: string[];
  sound?: 'ding' | 'chord' | 'exclaim' | 'tada' | 'none';
  onButton?: (label: string) => void;
}

export interface WinState {
  id: number;
  app: AppId;
  title: string;
  icon: IconName;
  x: number;
  y: number;
  w: number;
  h: number;
  minimized: boolean;
  maximized: boolean;
  z: number;
  /** Per-app launch argument: a folder path, a file, a dialog. */
  arg?: unknown;
}

interface State {
  windows: WinState[];
  focused: number | null;
}

let state: State = { windows: [], focused: null };
let nextId = 1;
let topZ = 1;
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach(l => l());
}

export const SCREEN_W = 800;
export const SCREEN_H = 600;
export const TASKBAR_H = 28;

export function useWm() {
  return useSyncExternalStore(
    l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export function getWm() {
  return state;
}

let cascade = 0;

export function openWindow(spec: { app: AppId; title: string; icon: IconName; w: number; h: number; arg?: unknown; single?: boolean; x?: number; y?: number }) {
  if (spec.single) {
    const existing = state.windows.find(w => w.app === spec.app);
    if (existing) {
      focusWindow(existing.id);
      if (spec.arg !== undefined) updateWindow(existing.id, { arg: spec.arg, title: spec.title });
      return existing.id;
    }
  }
  const w = Math.min(spec.w, SCREEN_W);
  const h = Math.min(spec.h, SCREEN_H - TASKBAR_H);
  cascade = (cascade + 1) % 8;
  const x = spec.x ?? Math.max(0, Math.min(SCREEN_W - w, (SCREEN_W - w) / 2 - 80 + cascade * 22));
  const y = spec.y ?? Math.max(0, Math.min(SCREEN_H - TASKBAR_H - h, (SCREEN_H - TASKBAR_H - h) / 2 - 60 + cascade * 22));
  const id = nextId++;
  topZ += 1;
  set({
    windows: [...state.windows, { id, app: spec.app, title: spec.title, icon: spec.icon, x: Math.round(x), y: Math.round(y), w, h, minimized: false, maximized: false, z: topZ, arg: spec.arg }],
    focused: id,
  });
  return id;
}

export function closeWindow(id: number) {
  const windows = state.windows.filter(w => w.id !== id);
  const top = windows.filter(w => !w.minimized).sort((a, b) => b.z - a.z)[0];
  set({ windows, focused: state.focused === id ? top?.id ?? null : state.focused });
}

export function closeAll() {
  set({ windows: [], focused: null });
}

export function focusWindow(id: number | null) {
  if (id === null) {
    set({ ...state, focused: null });
    return;
  }
  topZ += 1;
  set({
    windows: state.windows.map(w => (w.id === id ? { ...w, z: topZ, minimized: false } : w)),
    focused: id,
  });
}

export function updateWindow(id: number, patch: Partial<WinState>) {
  set({ ...state, windows: state.windows.map(w => (w.id === id ? { ...w, ...patch } : w)) });
}

export function minimizeWindow(id: number) {
  const windows = state.windows.map(w => (w.id === id ? { ...w, minimized: true } : w));
  const top = windows.filter(w => !w.minimized).sort((a, b) => b.z - a.z)[0];
  set({ windows, focused: top?.id ?? null });
}

/** Taskbar button: focus it, or minimize it if it's already on top. */
export function toggleFromTaskbar(id: number) {
  const win = state.windows.find(w => w.id === id);
  if (!win) return;
  if (state.focused === id && !win.minimized) minimizeWindow(id);
  else focusWindow(id);
}

/** A message box, like MessageBox(): icon, text, buttons. */
export function messageBox(title: string, spec: DialogSpec) {
  const lines = Math.ceil(spec.text.length / 46) + (spec.text.split('\n').length - 1);
  return openWindow({ app: 'dialog', title, icon: spec.icon ?? 'info', w: 360, h: 112 + lines * 14, arg: spec });
}
