/**
 * Where you were in the room, kept in this tab's sessionStorage. If the page
 * reloads (a phone reclaiming memory, a context loss the browser couldn't
 * recover, an accidental pull-to-refresh), you come back standing where you
 * were instead of at the title card.
 */
export interface SavedPose {
  p: [number, number, number];
  q: [number, number, number, number];
}

interface Saved {
  engaged: boolean;
  pose?: SavedPose;
  at: number;
}

const KEY = 'room-session-v1';
const FRESH_MS = 45 * 60 * 1000;

function read(): Saved | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    return Date.now() - saved.at < FRESH_MS ? saved : null;
  } catch {
    return null;
  }
}

function write(next: Saved) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage off (private mode): resuming just won't happen.
  }
}

export function resumedSession() {
  if (typeof window === 'undefined') return null;
  return read();
}

export function saveEngaged() {
  write({ ...(read() ?? {}), engaged: true, at: Date.now() });
}

export function savePose(pose: SavedPose) {
  write({ engaged: true, pose, at: Date.now() });
}
