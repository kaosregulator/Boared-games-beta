import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * The TV picture and the Game Boy screen are DOM laid over the canvas, so
 * gestures are read at the window and kept to the room, minus its buttons.
 */
function inRoom(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el?.closest) return false;
  if (!el.closest('[data-room]')) return false;
  return !el.closest('button, a, input, select, textarea, [data-ui="remote"], [data-ui="gamepad"], [data-ui="card"], [data-ui="studio"]');
}
import { freeArea, panBy, resetView, setZoom, viewRig } from './viewRig';

/**
 * Pinch to zoom, drag to pan, double-tap to reset, for the TV, Game Boy and
 * boombox close-ups. On a computer: scroll or trackpad-pinch to zoom, drag to
 * pan once zoomed, double-click to reset.
 *
 * Presses on the device's own buttons still go through; a drag only pans
 * after it has moved far enough that it can't have been a tap.
 */
export function DeviceGestures({ active }: { active: boolean }) {
  const { size } = useThree();

  useEffect(() => {
    if (!active) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch: null | { dist: number; zoom: number; mx: number; my: number } = null;
    let drag: null | { id: number; x: number; y: number; moved: boolean } = null;
    let lastTap = 0;

    const free = () => freeArea(viewRig.insets, size.width, size.height);
    const panPixels = (dx: number, dy: number) => {
      const f = free();
      // Content follows the finger.
      panBy((-dx * 4) / (f.fw * size.width), (dy * 4) / (f.fh * size.height));
    };
    const spread = () => {
      const [a, b] = [...pointers.values()];
      return { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    };

    const down = (e: PointerEvent) => {
      if (!inRoom(e.target)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const s = spread();
        pinch = { dist: s.dist, zoom: viewRig.zoom, mx: s.mx, my: s.my };
        drag = null;
      } else if (pointers.size === 1) {
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
        const now = performance.now();
        if (now - lastTap < 300 && e.pointerType !== 'mouse') resetView();
        lastTap = now;
      }
    };
    const move = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size >= 2) {
        const s = spread();
        setZoom(pinch.zoom * (s.dist / Math.max(1, pinch.dist)));
        panPixels(s.mx - pinch.mx, s.my - pinch.my);
        pinch.mx = s.mx;
        pinch.my = s.my;
        return;
      }
      if (drag && drag.id === e.pointerId && viewRig.zoom > 1.01) {
        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 12) return;
        drag.moved = true;
        panPixels(dx, dy);
        drag.x = e.clientX;
        drag.y = e.clientY;
      }
    };
    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (drag?.id === e.pointerId) drag = null;
    };
    const wheel = (e: WheelEvent) => {
      if (!inRoom(e.target)) return;
      e.preventDefault();
      // Trackpad pinch arrives as ctrl+wheel with small deltas; a mouse wheel
      // as plain wheel with big ones. Both zoom here.
      const k = e.ctrlKey ? 0.012 : 0.0016;
      setZoom(viewRig.zoom * Math.exp(-e.deltaY * k));
    };
    const dbl = (e: MouseEvent) => {
      if (inRoom(e.target)) resetView();
    };

    window.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('dblclick', dbl);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('dblclick', dbl);
    };
  }, [active, size.width, size.height]);

  return null;
}
