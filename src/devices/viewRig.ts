import { useEffect, useState } from 'react';
import * as THREE from 'three';

/**
 * How a close-up (TV, Game Boy, boombox) is framed.
 *
 * The camera fits the device into the part of the screen the on-screen
 * controls leave free. The remote sits under the TV in portrait and down the
 * right side in landscape, so the free area moves when the phone turns and
 * the framing follows it. On top of that fit the player can pinch (or
 * scroll) to zoom and drag to pan, and switch to a flat "big screen" where
 * the picture fills the display.
 */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type ViewKind = 'tv' | 'gameboy' | 'radio';

export const viewRig = {
  zoom: 1,
  /** Where the subject sits, as a fraction of the free area (-1..1). */
  panX: 0,
  panY: 0,
  /** Flat full-screen picture instead of the 3D close-up. */
  big: false,
  insets: { top: 0, right: 0, bottom: 0, left: 0 } as Insets,
  listeners: new Set<() => void>(),
};

export const MAX_ZOOM = 4;

function emit() {
  viewRig.listeners.forEach(fn => fn());
}

export function resetView() {
  viewRig.zoom = 1;
  viewRig.panX = 0;
  viewRig.panY = 0;
  emit();
}

export function setZoom(zoom: number) {
  viewRig.zoom = THREE.MathUtils.clamp(zoom, 1, MAX_ZOOM);
  clampPan();
  emit();
}

export function panBy(dx: number, dy: number) {
  viewRig.panX += dx;
  viewRig.panY += dy;
  clampPan();
  emit();
}

/** At zoom 1 the subject is centred; zoomed in you can roam to its edges. */
function clampPan() {
  const room = Math.max(0, viewRig.zoom - 1) * 2;
  viewRig.panX = THREE.MathUtils.clamp(viewRig.panX, -room, room);
  viewRig.panY = THREE.MathUtils.clamp(viewRig.panY, -room, room);
}

export function setBig(on: boolean) {
  if (viewRig.big === on) return;
  viewRig.big = on;
  emit();
}

export function setInsets(next: Insets) {
  const cur = viewRig.insets;
  if (cur.top === next.top && cur.right === next.right && cur.bottom === next.bottom && cur.left === next.left) return;
  viewRig.insets = next;
  emit();
}

export function useViewRig() {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump(n => n + 1);
    viewRig.listeners.add(fn);
    return () => {
      viewRig.listeners.delete(fn);
    };
  }, []);
  return viewRig;
}

/** Window size and orientation, re-read on resize and on rotation. */
export function useViewport() {
  const read = () => ({
    w: window.innerWidth,
    h: window.innerHeight,
    landscape: window.innerWidth > window.innerHeight,
  });
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const on = () => setVp(read());
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    window.visualViewport?.addEventListener('resize', on);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
      window.visualViewport?.removeEventListener('resize', on);
    };
  }, []);
  return vp;
}

/**
 * The screen space the controls take, per device and orientation. The DOM
 * controls use the same numbers (see TvRemote / TouchGamepad), so what the
 * camera avoids is exactly what the buttons cover.
 */
export const LAYOUT = {
  header: 60,
  /** TV remote: bottom sheet in portrait, side rail in landscape. */
  remotePortrait: 236,
  remoteRail: 214,
  /** Thumb pad: bottom in portrait, both sides in landscape. */
  padPortrait: 196,
  padSide: 168,
  padStartSelect: 44,
  /** Desktop hint line at the bottom. */
  hint: 44,
  /** The seated Game Boy's Big Screen / Stand Up bar on a keyboard: 64 tall, 16 off the bottom, 16 clear above. */
  gbBar: 96,
};

export function insetsFor(kind: ViewKind, touch: boolean, vp: { w: number; h: number; landscape: boolean }, big: boolean, controlsShown = true): Insets {
  const top = big && !controlsShown ? 0 : LAYOUT.header;
  // The Game Boy comes first: on a keyboard its Big Screen / Stand Up bar
  // stays along the bottom (in big screen too), so the picture never goes under it.
  if (kind === 'gameboy') {
    if (!touch) return { top: big ? 0 : 12, right: 0, bottom: LAYOUT.gbBar, left: 0 };
    return vp.landscape
      ? { top: 12, right: LAYOUT.padSide, bottom: 72, left: LAYOUT.padSide }
      : { top: 12, right: 0, bottom: LAYOUT.padPortrait + 56, left: 0 };
  }
  if (!touch) return { top, right: 0, bottom: big ? 0 : LAYOUT.hint, left: 0 };
  if (kind === 'tv') {
    if (big && !controlsShown) return { top: 0, right: 0, bottom: 0, left: 0 };
    return vp.landscape
      ? { top: big ? 0 : 52, right: LAYOUT.remoteRail, bottom: 0, left: 0 }
      : { top, right: 0, bottom: LAYOUT.remotePortrait, left: 0 };
  }
  return { top, right: 0, bottom: 40, left: 0 };
}

/**
 * The free part of the screen in normalised device coordinates
 * (-1..1, y up): its centre and its size as a fraction of the full view.
 */
export function freeArea(insets: Insets, w: number, h: number) {
  const fw = Math.max(0.2, (w - insets.left - insets.right) / w);
  const fh = Math.max(0.2, (h - insets.top - insets.bottom) / h);
  const cx = ((insets.left + (w - insets.right)) / 2 / w) * 2 - 1;
  const cy = -(((insets.top + (h - insets.bottom)) / 2 / h) * 2 - 1);
  return { cx, cy, fw, fh };
}

const Q0 = new THREE.Quaternion();
const R = new THREE.Quaternion();
const V = new THREE.Vector3();
const FWD = new THREE.Vector3(0, 0, -1);
const M = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);

/**
 * Point `cam` (already placed) at a subject so it fills the free area, then
 * apply the player's zoom and pan. Only the camera's rotation and field of
 * view change, so CSS-3D glass (the TV picture) stays glued to the set.
 *
 * `centre` is the subject's middle in world space, `half` its half width and
 * height as seen from the camera, in metres.
 */
export function frameSubject(
  cam: THREE.PerspectiveCamera,
  centre: THREE.Vector3,
  half: { w: number; h: number },
  insets: Insets,
  size: { width: number; height: number },
  margin = 1.08,
) {
  const d = Math.max(0.05, cam.position.distanceTo(centre));
  const aspect = size.width / Math.max(1, size.height);
  const free = freeArea(insets, size.width, size.height);
  // tan of the half vertical fov that just fits the subject in the free area.
  const byH = half.h / d / free.fh;
  const byW = half.w / d / (free.fw * aspect);
  const tanV = (Math.max(byH, byW) * margin) / viewRig.zoom;
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(tanV));
  if (Math.abs(cam.fov - fov) > 0.001 || cam.aspect !== aspect) {
    cam.fov = fov;
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
  }
  // Where the subject's centre should land on screen.
  const tx = free.cx - viewRig.panX * free.fw * 0.5;
  const ty = free.cy - viewRig.panY * free.fh * 0.5;
  const tanH = tanV * aspect;
  M.lookAt(cam.position, centre, UP);
  Q0.setFromRotationMatrix(M);
  V.set(tx * tanH, ty * tanV, -1).normalize();
  R.setFromUnitVectors(V, FWD);
  cam.quaternion.copy(Q0).multiply(R);
}
