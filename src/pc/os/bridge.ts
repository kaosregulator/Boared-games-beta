import { useSyncExternalStore } from 'react';

/**
 * Talk to the room around the monitor. The room tells us whether you're
 * leaning in (keys and mouse are ours) or across the room (just a glowing
 * screen). We tell it when Escape should step back and when the power changes.
 */

export type RoomCmd = { source: 'pc98-room'; cmd: 'focus'; on: boolean } | { source: 'pc98-room'; cmd: 'power' };
export type PcEvent = { source: 'pc98'; evt: 'escape' } | { source: 'pc98'; evt: 'power'; on: boolean };

let focused = window.parent === window;
const listeners = new Set<() => void>();
const powerHandlers = new Set<() => void>();

window.addEventListener('message', e => {
  if (e.origin !== location.origin) return;
  const data = e.data as RoomCmd | undefined;
  if (!data || data.source !== 'pc98-room') return;
  if (data.cmd === 'focus') {
    focused = data.on;
    listeners.forEach(l => l());
  } else if (data.cmd === 'power') {
    powerHandlers.forEach(h => h());
  }
});

export function toRoom(evt: { evt: 'escape' } | { evt: 'power'; on: boolean }) {
  if (window.parent === window) return;
  window.parent.postMessage({ source: 'pc98', ...evt }, location.origin);
}

export function useRoomFocus() {
  return useSyncExternalStore(
    l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => focused,
  );
}

export function onPowerButton(handler: () => void) {
  powerHandlers.add(handler);
  return () => {
    powerHandlers.delete(handler);
  };
}

/** Standalone (pc.html opened by itself) there's no room to step back to. */
export const STANDALONE = window.parent === window;
