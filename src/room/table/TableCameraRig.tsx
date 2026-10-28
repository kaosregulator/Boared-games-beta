import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TABLE_SEAT } from '../roomLayout';
import { fitFov } from '../input';
import { walkRig } from '../WalkController';
import { cyclePreset, goalShot, orbitBy, tableCam, tableToWorld, zoomBy, type Shot } from './tableCam';

const GOAL: Shot = { target: [0, 0, 0], yaw: 0, pitch: 0.5, dist: 0.8 };
const TMP = new THREE.Vector3();
const AT = new THREE.Vector3();

/** Shortest signed turn from a to b. */
function angleDelta(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function inRoom(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el?.closest?.('[data-room]')) return false;
  return !el.closest('button, a, input, select, textarea, [data-ui]');
}

/**
 * Drives the camera while a table game has it: eases towards the goal shot
 * every frame, and turns drags, pinches, the wheel and the keys into orbit
 * and zoom (right or left drag on the table, two fingers on a phone).
 */
export function TableCameraRig({ active }: { active: boolean }) {
  const { camera } = useThree();
  const cur = useRef<Shot>({ target: [0, 0, 0], yaw: 0, pitch: 0.5, dist: 0.8 });
  const wasActive = useRef(false);
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    tableCam.active = active;
    if (!active) tableCam.action = null;
    return () => {
      tableCam.active = false;
    };
  }, [active]);

  // Keys: arrows or Q/E orbit, +/- zoom, V steps the preset views.
  useEffect(() => {
    if (!active) return;
    const typing = (e: KeyboardEvent) => Boolean((e.target as HTMLElement | null)?.closest?.('input, textarea, select, iframe'));
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      if (e.code === 'KeyV' && !e.repeat) cyclePreset();
      if (/^(Arrow|KeyQ|KeyE|Equal|Minus|Numpad)/.test(e.code)) {
        keys.current[e.code] = true;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const blur = () => {
      keys.current = {};
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      keys.current = {};
    };
  }, [active]);

  // Drag to orbit, pinch or wheel to zoom.
  useEffect(() => {
    if (!active) return;
    const pts = new Map<number, { x: number; y: number }>();
    let drag: null | { id: number; x: number; y: number; moved: boolean; button: number } = null;
    let pinch: null | { dist: number; cx: number; cy: number } = null;
    const spread = () => {
      const [a, b] = [...pts.values()];
      return { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
    };
    const down = (e: PointerEvent) => {
      if (!inRoom(e.target)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        drag = null;
        pinch = spread();
        return;
      }
      if (tableCam.grabbing) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, button: e.button };
    };
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size >= 2) {
        const next = spread();
        if (next.dist > 0 && pinch.dist > 0) zoomBy(pinch.dist / next.dist);
        orbitBy(-(next.cx - pinch.cx) * 0.006, (next.cy - pinch.cy) * 0.005);
        pinch = next;
        tableCam.draggedAt = performance.now();
        return;
      }
      if (!drag || drag.id !== e.pointerId || tableCam.grabbing) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      const slop = e.pointerType === 'touch' ? 12 : 6;
      if (!drag.moved && Math.hypot(dx, dy) < slop) return;
      drag.moved = true;
      orbitBy(-dx * 0.006, dy * 0.005);
      drag.x = e.clientX;
      drag.y = e.clientY;
      tableCam.draggedAt = performance.now();
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (drag?.id === e.pointerId) drag = null;
    };
    const wheel = (e: WheelEvent) => {
      if (!inRoom(e.target)) return;
      e.preventDefault();
      zoomBy(Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    };
    const menu = (e: MouseEvent) => {
      if (inRoom(e.target)) e.preventDefault();
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    window.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('contextmenu', menu);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('contextmenu', menu);
    };
  }, [active]);

  useFrame((_, rawDt) => {
    // capture scripts on a software renderer (a frame every few seconds) stretch the frame cap with `slow`
    const dt = Math.min(rawDt, 0.05 * tableCam.slow);
    if (!active) {
      if (wasActive.current) {
        // Hand the camera back to the walking body, at the table's edge.
        wasActive.current = false;
        walkRig.teleport = { at: TABLE_SEAT.at, look: TABLE_SEAT.look };
      }
      return;
    }
    const c = cur.current;
    if (!wasActive.current) {
      // Start from wherever the camera already is, so the first move glides.
      wasActive.current = true;
      goalShot(performance.now(), GOAL);
      tableToWorld(...GOAL.target, AT);
      TMP.copy(camera.position).sub(AT);
      c.target = [...GOAL.target];
      c.dist = Math.max(0.1, TMP.length());
      c.pitch = Math.asin(THREE.MathUtils.clamp(TMP.y / c.dist, -1, 1));
      c.yaw = Math.atan2(TMP.x, TMP.z);
    }

    const k = keys.current;
    const yawKey = (k.ArrowLeft || k.KeyQ ? 1 : 0) - (k.ArrowRight || k.KeyE ? 1 : 0);
    const pitchKey = (k.ArrowUp ? 1 : 0) - (k.ArrowDown ? 1 : 0);
    if (yawKey || pitchKey) orbitBy(yawKey * 1.6 * dt, pitchKey * 1.1 * dt);
    const zoomKey = (k.Equal || k.NumpadAdd ? 1 : 0) - (k.Minus || k.NumpadSubtract ? 1 : 0);
    if (zoomKey) zoomBy(Math.exp(-zoomKey * 1.4 * dt));

    goalShot(performance.now(), GOAL);
    const tracking = Boolean(tableCam.action?.track);
    const ease = 1 - Math.exp(-dt * 4.2);
    const easeTarget = 1 - Math.exp(-dt * (tracking ? 9 : 4.2));
    for (let i = 0; i < 3; i++) c.target[i] += (GOAL.target[i] - c.target[i]) * easeTarget;
    c.yaw += angleDelta(c.yaw, GOAL.yaw) * ease;
    c.pitch += (GOAL.pitch - c.pitch) * ease;
    c.dist += (GOAL.dist - c.dist) * ease;

    tableToWorld(c.target[0], c.target[1], c.target[2], AT);
    const flat = Math.cos(c.pitch) * c.dist;
    camera.position.set(AT.x + Math.sin(c.yaw) * flat, AT.y + Math.sin(c.pitch) * c.dist, AT.z + Math.cos(c.yaw) * flat);
    camera.up.set(0, 1, 0);
    camera.lookAt(AT);

    const cam = camera as THREE.PerspectiveCamera;
    const fov = fitFov(50, cam.aspect, 1.5, 96);
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov += (fov - cam.fov) * Math.min(1, dt * 8);
      cam.updateProjectionMatrix();
    }
  });

  return null;
}
