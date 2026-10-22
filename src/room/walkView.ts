import { useEffect, useState } from 'react';

/**
 * The walking camera's lens. `fov` is the player's setting (how wide the
 * room looks, kept between visits); `zoom` is a pinch, a trackpad pinch or
 * +/- held on top of it, like squinting at something across the room.
 */
export const FOV_PRESETS = [60, 72, 85, 100] as const;
export const FOV_MIN = 50;
export const FOV_MAX = 110;
export const ZOOM_MAX = 3;

function savedFov() {
  try {
    const v = Number(window.localStorage.getItem('room-fov'));
    if (v >= FOV_MIN && v <= FOV_MAX) return v;
  } catch {
    // no storage
  }
  return 72;
}

export const walkView = {
  fov: typeof window === 'undefined' ? 72 : savedFov(),
  zoom: 1,
  listeners: new Set<() => void>(),
};

function emit() {
  walkView.listeners.forEach(fn => fn());
}

export function setWalkFov(fov: number) {
  walkView.fov = Math.round(Math.min(FOV_MAX, Math.max(FOV_MIN, fov)));
  try {
    window.localStorage.setItem('room-fov', String(walkView.fov));
  } catch {
    // not kept, still applied
  }
  emit();
}

/** Step to the next preset (the quick FOV button). */
export function cycleWalkFov() {
  const next = FOV_PRESETS.find(p => p > walkView.fov) ?? FOV_PRESETS[0];
  setWalkFov(next);
}

export function setWalkZoom(zoom: number) {
  const z = Math.min(ZOOM_MAX, Math.max(1, zoom));
  if (Math.abs(z - walkView.zoom) < 0.001) return;
  walkView.zoom = z;
  emit();
}

export function useWalkView() {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump(n => n + 1);
    walkView.listeners.add(fn);
    return () => {
      walkView.listeners.delete(fn);
    };
  }, []);
  return walkView;
}
