import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * For a canvas on frameloop "demand": redraws at full rate while you zoom,
 * pan or resize, once for each press, and otherwise at a slow `idleFps`, so
 * whatever shares the main thread (the Game Boy emulator, Windows in its
 * iframe) gets the time instead of the room behind it.
 */
export function DemandTicker({ idleFps = 15 }: { idleFps?: number }) {
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let busyUntil = 0;
    const loop = (t: number) => {
      if (t < busyUntil || t - last >= 1000 / idleFps) {
        last = t;
        invalidate();
      }
      raf = requestAnimationFrame(loop);
    };
    const busy = () => {
      busyUntil = performance.now() + 700;
    };
    const once = () => invalidate();
    const moving = ['wheel', 'touchmove', 'resize'] as const;
    moving.forEach(e => window.addEventListener(e, busy, { passive: true }));
    const drag = (e: PointerEvent) => {
      if (e.buttons) busy();
    };
    window.addEventListener('pointermove', drag, { passive: true });
    window.addEventListener('pointerdown', once);
    window.addEventListener('pointerup', once);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      moving.forEach(e => window.removeEventListener(e, busy));
      window.removeEventListener('pointermove', drag);
      window.removeEventListener('pointerdown', once);
      window.removeEventListener('pointerup', once);
    };
  }, [invalidate, idleFps]);
  return null;
}
