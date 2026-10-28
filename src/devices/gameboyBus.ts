/**
 * Buttons pressed on the 3D Game Boy, or on the touch-screen pad, go to
 * whichever emulator frame is running: the Game Boy's or the TV's NES.
 */
let frame: HTMLIFrameElement | null = null;

export function setPadFrame(el: HTMLIFrameElement | null) {
  frame = el;
}

/** The Game Boy's screen registers here too. */
export const setGameBoyFrame = setPadFrame;

export function sendPad(index: number, down: boolean) {
  frame?.contentWindow?.postMessage({ source: 'room', type: 'input', index, value: down }, location.origin);
  frame?.focus();
}

/**
 * The game has the keyboard while you play, so the room never hears Escape or
 * V. public/emu/play.html posts them over instead (the way Windows does on the
 * PC, see setPcEscape) and the room acts on them here.
 */
export type CartridgeKey = 'escape' | 'big';

export function cartridgeKey(data: unknown, origin: string, ours: string): CartridgeKey | null {
  if (origin !== ours || !data || typeof data !== 'object') return null;
  const d = data as { source?: unknown; type?: unknown };
  if (d.source !== 'cartridge') return null;
  return d.type === 'escape' || d.type === 'big' ? d.type : null;
}

let onCartridgeKey: ((key: CartridgeKey) => void) | null = null;

export function setCartridgeKeys(fn: ((key: CartridgeKey) => void) | null) {
  onCartridgeKey = fn;
}

if (typeof window !== 'undefined') {
  window.addEventListener('message', e => {
    const key = cartridgeKey(e.data, e.origin, location.origin);
    if (key) onCartridgeKey?.(key);
  });
}
