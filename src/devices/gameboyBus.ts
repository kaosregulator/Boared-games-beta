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
