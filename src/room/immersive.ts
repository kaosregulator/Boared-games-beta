import { useEffect, useState } from 'react';

/**
 * Real browser full screen where the platform allows it (desktop, Android,
 * iPad). iPhone Safari only lets videos go full screen, so there the app
 * hides its own chrome instead, and "Add to Home Screen" gives a true full
 * screen app (see the web manifest).
 */
type FsDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

export function canFullscreen() {
  const el = document.documentElement as FsEl;
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function isFullscreen() {
  const d = document as FsDoc;
  return Boolean(d.fullscreenElement || d.webkitFullscreenElement);
}

export async function enterFullscreen(landscape = false) {
  const el = document.documentElement as FsEl;
  try {
    if (!isFullscreen()) {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else await el.webkitRequestFullscreen?.();
    }
    if (landscape) {
      const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      await orientation.lock?.('landscape').catch(() => {});
    }
  } catch {
    // Refused (no gesture, not supported): the in-app immersive view still works.
  }
}

export async function exitFullscreen() {
  const d = document as FsDoc;
  try {
    (screen.orientation as ScreenOrientation & { unlock?: () => void }).unlock?.();
    if (d.fullscreenElement) await d.exitFullscreen();
    else if (d.webkitFullscreenElement) await d.webkitExitFullscreen?.();
  } catch {
    // Already out.
  }
}

export function useFullscreen() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(isFullscreen());
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    sync();
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);
  return on;
}
