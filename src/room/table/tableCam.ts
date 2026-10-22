import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { PLAY_TABLE } from '../roomLayout';

/**
 * The camera at the card table, after Tabletop Club's: it orbits a point on
 * the table (yaw round it, pitch above it, distance from it), and every move
 * glides. A game sets a view for each phase of play (where to look while you
 * place ships, while you aim, at your side of the chessboard) and can run a
 * short "follow the action" shot: track a cannonball, a token walking the
 * board, a piece the opponent is moving. The player can orbit and zoom on top
 * of the game's view, step through preset views, or turn following off.
 *
 * All positions are table-local: x right, z towards the player's seat, y up,
 * origin at the centre of the table top.
 */

export interface Shot {
  target: [number, number, number];
  /** Radians round the table; 0 is the player's seat (+z), positive turns towards +x. */
  yaw: number;
  /** Radians above the table plane. */
  pitch: number;
  dist: number;
}

export type Preset = 'game' | 'overhead' | 'side' | 'seat';
export const PRESETS: Preset[] = ['game', 'overhead', 'side', 'seat'];
export const PRESET_LABEL: Record<Preset, string> = {
  game: 'Game view',
  overhead: 'Overhead',
  side: 'Side',
  seat: 'Your seat',
};

interface Action {
  shot: Shot;
  /** Live target, read every frame (a flying cannonball, a walking token). */
  track?: () => THREE.Vector3 | null;
  until: number;
}

const SEAT: Shot = {
  target: [0, 0, -0.04],
  yaw: 0,
  pitch: Math.atan2(1.0 - PLAY_TABLE.h, PLAY_TABLE.d / 2 + 0.31 + 0.04),
  dist: Math.hypot(1.0 - PLAY_TABLE.h, PLAY_TABLE.d / 2 + 0.35),
};

function savedFollow() {
  try {
    return window.localStorage.getItem('table-follow') !== 'off';
  } catch {
    return true;
  }
}

export const tableCam = {
  /** The rig owns the camera (crouched at a table game that uses it). */
  active: false,
  base: SEAT as Shot,
  action: null as Action | null,
  preset: 'game' as Preset,
  follow: typeof window === 'undefined' ? true : savedFollow(),
  /** The player's own orbit and zoom on top of the view. */
  user: { yaw: 0, pitch: 0, zoom: 1 },
  /** A piece is in hand: drags move it instead of the camera. */
  grabbing: false,
  /** performance.now() of the last drag that moved the camera, so the release isn't a click. */
  draggedAt: 0,
  /** Capture scripts on a slow software renderer stretch follow shots with this. */
  slow: 1,
  listeners: new Set<() => void>(),
};

// Capture scripts can hold a shot with window.__tableCam (dev server only).
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __tableCam: typeof tableCam }).__tableCam = tableCam;

function emit() {
  tableCam.listeners.forEach(fn => fn());
}

/** The game's view for this phase of play. Clears the player's orbit unless asked not to. */
export function setTableView(shot: Shot, keepUser = false) {
  tableCam.base = shot;
  if (!keepUser) tableCam.user = { yaw: 0, pitch: 0, zoom: 1 };
  emit();
}

/** A short camera move that shows what just happened. Skipped when following is off. */
export function followAction(shot: Shot, ms: number, track?: () => THREE.Vector3 | null) {
  if (!tableCam.follow) return;
  tableCam.action = { shot, track, until: performance.now() + ms * tableCam.slow };
}

export function endAction() {
  tableCam.action = null;
}

export function setFollow(on: boolean) {
  tableCam.follow = on;
  if (!on) tableCam.action = null;
  try {
    window.localStorage.setItem('table-follow', on ? 'on' : 'off');
  } catch {
    // still applies for this visit
  }
  emit();
}

export function cyclePreset() {
  const i = PRESETS.indexOf(tableCam.preset);
  tableCam.preset = PRESETS[(i + 1) % PRESETS.length];
  tableCam.user = { yaw: 0, pitch: 0, zoom: 1 };
  tableCam.action = null;
  emit();
}

export function orbitBy(dYaw: number, dPitch: number) {
  tableCam.action = null;
  tableCam.user.yaw += dYaw;
  tableCam.user.pitch = THREE.MathUtils.clamp(tableCam.user.pitch + dPitch, -1.2, 1.2);
}

export function zoomBy(factor: number) {
  tableCam.action = null;
  tableCam.user.zoom = THREE.MathUtils.clamp(tableCam.user.zoom * factor, 0.35, 2.2);
}

export function resetUserView() {
  tableCam.user = { yaw: 0, pitch: 0, zoom: 1 };
  tableCam.action = null;
  emit();
}

/** The shot the camera is heading for right now. */
export function goalShot(now: number, out: Shot) {
  const a = tableCam.action;
  if (a && now < a.until) {
    const live = a.track?.();
    out.target = live ? [live.x, live.y, live.z] : a.shot.target;
    out.yaw = a.shot.yaw;
    out.pitch = a.shot.pitch;
    out.dist = a.shot.dist;
    return out;
  }
  if (a) tableCam.action = null;
  const base =
    tableCam.preset === 'overhead'
      ? { target: [0, 0, 0] as [number, number, number], yaw: 0, pitch: 1.12, dist: 1.0 }
      : tableCam.preset === 'side'
        ? { target: [0, 0, 0] as [number, number, number], yaw: Math.PI / 2, pitch: 0.42, dist: 0.85 }
        : tableCam.preset === 'seat'
          ? SEAT
          : tableCam.base;
  out.target = base.target;
  out.yaw = base.yaw + tableCam.user.yaw;
  out.pitch = THREE.MathUtils.clamp(base.pitch + tableCam.user.pitch, 0.12, 1.5);
  out.dist = base.dist * tableCam.user.zoom;
  return out;
}

export function useTableCam() {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump(n => n + 1);
    tableCam.listeners.add(fn);
    return () => {
      tableCam.listeners.delete(fn);
    };
  }, []);
  return tableCam;
}

/** World position of a table-local point. */
export function tableToWorld(x: number, y: number, z: number, out = new THREE.Vector3()) {
  return out.set(PLAY_TABLE.x + x, PLAY_TABLE.h + y, PLAY_TABLE.z + z);
}

/** A click that ends a camera drag is not a click. */
export function wasDrag() {
  return performance.now() - tableCam.draggedAt < 250;
}
