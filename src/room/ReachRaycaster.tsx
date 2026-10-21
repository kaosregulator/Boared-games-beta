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
}

/**
 * Picks what you point at, with a reach limit so you walk up to things.
 * The mouse cursor aims on a computer; the middle of the screen aims on a
 * touch screen. A click or tap uses whatever is under it; E or Enter uses
 * what is aimed at.
 */
export function ReachRaycaster({ enabled, onAim, onSelect, onTooFar }: ReachRaycasterProps) {
  const { camera, scene, gl } = useThree();
  const current = useRef<Aimed | null>(null);
  const lastKey = useRef<string | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const handlers = useRef({ onSelect, onTooFar });
  handlers.current = { onSelect, onTooFar };

  const pick = (ndc: THREE.Vector2): Aimed | null => {
    raycaster.setFromCamera(ndc, camera);
    raycaster.far = PLAYER.reach + 4;
    const hits = raycaster.intersectObjects(scene.children, true);
    let best: { target: HoverTarget; volume: number; distance: number } | null = null;
    let first = Infinity;
    for (const hit of hits) {
      const found = readTarget(hit.object);
      if (!found) continue;
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
