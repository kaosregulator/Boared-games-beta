import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PLAYER } from './videoRoom';
import type { HoverTarget } from './Interactable';
import { aim, onRoomTap } from './input';

export interface Aimed extends HoverTarget {
  distance: number;
  inReach: boolean;
}

const raycaster = new THREE.Raycaster();
const CENTRE = new THREE.Vector2(0, 0);
const POINT = new THREE.Vector2();

function readTarget(object: THREE.Object3D | null): { target: HoverTarget; volume: number } | null {
  let node: THREE.Object3D | null = object;
  while (node) {
    const data = node.userData?.interactable as HoverTarget | undefined;
    if (data?.id) return { target: data, volume: (node.userData.volume as number | undefined) ?? 0.001 };
    node = node.parent;
  }
  return null;
}

/**
 * How far behind the first box a smaller box can be and still win. A desk's
 * own box wraps the lamp on top of it, so the lamp is "behind" the desk's
 * front face; pointing at the lamp should still pick the lamp.
 */
const NESTED_DEPTH = 0.8;

interface ReachRaycasterProps {
  enabled: boolean;
  onAim: (aimed: Aimed | null) => void;
  onSelect: (aimed: Aimed) => void;
  /** A click or tap that reached something too far away. */
  onTooFar?: (aimed: Aimed) => void;
  /** Only these targets can be picked; anything else is looked straight through. */
  accept?: (target: HoverTarget) => boolean;
}

/**
 * Picks what you point at, with a reach limit so you walk up to things.
 * The mouse cursor aims on a computer; the middle of the screen aims on a
 * touch screen. A click or tap uses whatever is under it; E or Enter uses
 * what is aimed at.
 */
export function ReachRaycaster({ enabled, onAim, onSelect, onTooFar, accept }: ReachRaycasterProps) {
  const { camera, scene, gl } = useThree();
  const current = useRef<Aimed | null>(null);
  const lastKey = useRef<string | null>(null);
  const lastPose = useRef({ pose: '', at: 0 });
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const acceptRef = useRef(accept);
  acceptRef.current = accept;
  const handlers = useRef({ onSelect, onTooFar });
  handlers.current = { onSelect, onTooFar };

  // Only the things you can use, not every triangle in the room: walls and
  // plain props never stop the aim anyway. Re-listed once a second, since
  // games and props come and go.
  const usable = useRef<{ list: THREE.Object3D[]; at: number }>({ list: [], at: -Infinity });
  const usableNow = () => {
    const now = performance.now();
    if (now - usable.current.at > 1000) {
      const list: THREE.Object3D[] = [];
      scene.traverse(o => {
        if ((o as THREE.Mesh).isMesh && readTarget(o)) list.push(o);
      });
      usable.current = { list, at: now };
    }
    return usable.current.list;
  };

  const pick = (ndc: THREE.Vector2): Aimed | null => {
    raycaster.setFromCamera(ndc, camera);
    raycaster.far = PLAYER.reach + 4;
    const hits = raycaster.intersectObjects(usableNow(), false);
    let best: { target: HoverTarget; volume: number; distance: number } | null = null;
    let first = Infinity;
    for (const hit of hits) {
      const found = readTarget(hit.object);
      if (!found || (acceptRef.current && !acceptRef.current(found.target))) continue;
      if (first === Infinity) first = hit.distance;
      if (hit.distance > first + NESTED_DEPTH) break;
      if (!best || found.volume < best.volume) best = { ...found, distance: hit.distance };
    }
    if (!best) return null;
    return { ...best.target, distance: best.distance, inReach: best.distance <= PLAYER.reach };
  };

  useEffect(() => {
    const off = onRoomTap((clientX, clientY) => {
      if (!enabledRef.current) return;
      const rect = gl.domElement.getBoundingClientRect();
      POINT.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      const hit = pick(POINT);
      if (!hit) return;
      if (hit.inReach) handlers.current.onSelect(hit);
      else handlers.current.onTooFar?.(hit);
    });
    const key = (e: KeyboardEvent) => {
      if (!enabledRef.current || (e.code !== 'KeyE' && e.code !== 'Enter' && e.code !== 'NumpadEnter')) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('button, a, input, select, textarea, iframe')) return;
      const aimed = current.current;
      if (aimed?.inReach) {
        e.preventDefault();
        handlers.current.onSelect(aimed);
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      off();
      window.removeEventListener('keydown', key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, scene, gl]);

  useFrame(() => {
    if (!enabled) {
      if (lastKey.current !== null) {
        lastKey.current = null;
        current.current = null;
        onAim(null);
      }
      gl.domElement.style.cursor = '';
      return;
    }

    // Hold the last aim while dragging the view so labels don't flicker.
    if (aim.dragging) return;
    // Nothing moved since the last look: the answer can't have changed
    // (a fresh look at least twice a second for things that move by themselves).
    const e = camera.matrixWorld.elements;
    const now = performance.now();
    const pose = `${aim.mode}:${aim.ndc.x.toFixed(4)}:${aim.ndc.y.toFixed(4)}:${e[12].toFixed(4)}:${e[13].toFixed(4)}:${e[14].toFixed(4)}:${e[8].toFixed(4)}:${e[9].toFixed(4)}:${e[10].toFixed(4)}`;
    if (pose === lastPose.current.pose && now - lastPose.current.at < 500) return;
    lastPose.current = { pose, at: now };
    const next = pick(aim.mode === 'cursor' ? POINT.set(aim.ndc.x, aim.ndc.y) : CENTRE);
    current.current = next;
    gl.domElement.style.cursor = aim.mode === 'cursor' && next?.inReach ? 'pointer' : '';
    const key = next ? `${next.id}:${next.inReach}` : null;
    if (key !== lastKey.current) {
      lastKey.current = key;
      onAim(next);
    }
  });

  return null;
}
