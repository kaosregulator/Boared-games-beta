import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PLAYER } from './videoRoom';
import type { HoverTarget } from './Interactable';

export interface Aimed extends HoverTarget {
  distance: number;
  inReach: boolean;
}

const raycaster = new THREE.Raycaster();
const CENTRE = new THREE.Vector2(0, 0);

function readTarget(object: THREE.Object3D | null): HoverTarget | null {
  let node: THREE.Object3D | null = object;
  while (node) {
    const data = node.userData?.interactable as HoverTarget | undefined;
    if (data?.id) return data;
    node = node.parent;
  }
  return null;
}

interface ReachRaycasterProps {
  enabled: boolean;
  onAim: (aimed: Aimed | null) => void;
  onSelect: (aimed: Aimed) => void;
}

/**
 * Centre-screen pick with a reach limit, so you have to actually walk up to the
 * shelf before a box responds.
 */
export function ReachRaycaster({ enabled, onAim, onSelect }: ReachRaycasterProps) {
  const { camera, scene } = useThree();
  const current = useRef<Aimed | null>(null);
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    const click = () => {
      if (!enabled) return;
      const aimed = current.current;
      if (aimed?.inReach) onSelect(aimed);
    };
    const key = (e: KeyboardEvent) => {
      if (!enabled || (e.code !== 'KeyE' && e.code !== 'Space')) return;
      const aimed = current.current;
      if (aimed?.inReach) {
        e.preventDefault();
        onSelect(aimed);
      }
    };
    window.addEventListener('mousedown', click);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('mousedown', click);
      window.removeEventListener('keydown', key);
    };
  }, [enabled, onSelect]);

  useFrame(() => {
    if (!enabled) {
      if (lastKey.current !== null) {
        lastKey.current = null;
        current.current = null;
        onAim(null);
      }
      return;
    }

    raycaster.setFromCamera(CENTRE, camera);
    raycaster.far = PLAYER.reach + 4;
    const hits = raycaster.intersectObjects(scene.children, true);
    let next: Aimed | null = null;
    for (const hit of hits) {
      const target = readTarget(hit.object);
      if (!target) continue;
      next = { ...target, distance: hit.distance, inReach: hit.distance <= PLAYER.reach };
      break;
    }

    current.current = next;
    const key = next ? `${next.id}:${next.inReach}` : null;
    if (key !== lastKey.current) {
      lastKey.current = key;
      onAim(next);
    }
  });

  return null;
}
