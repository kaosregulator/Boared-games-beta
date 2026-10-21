/** Buttons pressed on the 3D Game Boy go to whichever emulator frame is on its screen. */
let frame: HTMLIFrameElement | null = null;

export function setGameBoyFrame(el: HTMLIFrameElement | null) {
  frame = el;
}

export function sendPad(index: number, down: boolean) {
  frame?.contentWindow?.postMessage({ source: 'room', type: 'input', index, value: down }, location.origin);
  frame?.focus();
}
