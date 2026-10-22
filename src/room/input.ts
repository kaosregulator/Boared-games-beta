/**
 * Input shared by the walking body, the aim ray, and the on-screen controls.
 *
 * One scheme for every device:
 * - Phone / tablet: left thumb stick walks, drag anywhere else to look, tap a
 *   thing to use it.
 * - Laptop: WASD or arrows walk and turn, two-finger swipe on the trackpad
 *   looks around, click a thing to use it.
 * - Mouse: same keys, click-and-drag to look, the cursor is the aim.
 */

export const pad = {
  /** Thumb stick, -1..1. y is forward. */
  x: 0,
  y: 0,
  /** Crouch toggled from the on-screen button. */
  crouch: false,
};

export type AimMode = 'cursor' | 'center';

/** Where the aim ray goes: the mouse cursor, or the middle of the screen. */
export const aim = {
  mode: 'center' as AimMode,
  /** Normalised device coords of the cursor. */
  ndc: { x: 0, y: 0 },
  /** Cursor in CSS pixels, for the label that follows it. */
  px: { x: 0, y: 0 },
  /** Set while a drag-to-look is in progress, so the aim holds still. */
  dragging: false,
};

type TapFn = (clientX: number, clientY: number) => void;
const tapFns = new Set<TapFn>();

/** A click or tap on the room that was not a drag. */
export function onRoomTap(fn: TapFn) {
  tapFns.add(fn);
  return () => {
    tapFns.delete(fn);
  };
}

export function emitRoomTap(clientX: number, clientY: number) {
  tapFns.forEach(fn => fn(clientX, clientY));
}

export function isTouchDevice() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

/**
 * Vertical field of view that keeps the scene as wide as it was designed on a
 * landscape screen. Portrait phones get a taller fov instead of a cropped room.
 */
export function fitFov(designFov: number, aspect: number, designAspect = 1.5, max = 104) {
  if (aspect >= designAspect) return designFov;
  const half = (designFov * Math.PI) / 360;
  const wide = 2 * Math.atan((Math.tan(half) * designAspect) / Math.max(0.3, aspect));
  return Math.min(max, (wide * 180) / Math.PI);
}

/**
 * Phones get fewer real-time lights: every point light costs every pixel of
 * every mesh, and a phone GPU notices around twenty of them.
 */
export const LOW_POWER =
  typeof window !== 'undefined' && isTouchDevice() && Math.min(window.screen.width, window.screen.height) < 820;
