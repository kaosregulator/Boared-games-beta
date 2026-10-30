import { useSyncExternalStore } from 'react';

/**
 * Between a time capsule card (DOM) and the room (WebGL): which hotspot's
 * piece to cut out of the room, the window on the card it should turn in, and
 * where on screen the thing itself is, for the beam up to the card.
 */
export type CapsuleMode = 'holo' | 'real' | 'off';

export const capsule = {
  /** Hotspot id of the open card, or null. */
  id: null as string | null,
  /** The card's glass window the piece is drawn inside. Null hides it. */
  stage: null as HTMLElement | null,
  /** The piece was cut out (null while looking, false when there's nothing to show). */
  piece: null as boolean | null,
  /** Where the real thing is on screen, in CSS pixels (null when off screen). */
  source: null as null | { x: number; y: number },
  /**
   * How the piece is drawn: 'holo' is the blue hologram, 'real' is the real
   * thing in its own colours (the Images tab), 'off' hides it (a video is up).
   */
  mode: 'holo' as CapsuleMode,
  listeners: new Set<() => void>(),
};

function emit() {
  for (const fn of capsule.listeners) fn();
}

export function openCapsule(id: string | null) {
  if (capsule.id === id) return;
  capsule.id = id;
  capsule.piece = null;
  capsule.source = null;
  capsule.mode = 'holo';
  emit();
}

export function setCapsuleMode(mode: CapsuleMode) {
  if (capsule.mode === mode) return;
  capsule.mode = mode;
  emit();
}

export function setCapsuleStage(el: HTMLElement | null) {
  if (capsule.stage === el) return;
  capsule.stage = el;
  emit();
}

export function setCapsulePiece(found: boolean) {
  if (capsule.piece === found) return;
  capsule.piece = found;
  emit();
}

const subscribe = (fn: () => void) => {
  capsule.listeners.add(fn);
  return () => {
    capsule.listeners.delete(fn);
  };
};

/** True / false once the room has (or hasn't) got a piece for the open card. */
export function useCapsulePiece() {
  return useSyncExternalStore(subscribe, () => capsule.piece, () => null);
}
