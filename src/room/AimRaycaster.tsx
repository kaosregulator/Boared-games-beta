import { useCallback, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HoverTarget } from './Interactable';

interface AimRaycasterProps {
  enabled: boolean;
  onHover: (target: HoverTarget | null) => void;
  onSelect: (target: HoverTarget) => void;
}

const _raycaster = new THREE.Raycaster();
const _center = new THREE.Vector2(0, 0);

// The crosshair raycast walks the whole room every time it runs, which is the
// single most expensive thing on the walking frame. The hover highlight doesn't
// need 60 Hz: while you're moving or looking it refreshes at 20 Hz (one frame's
// lag you can't see), and when you hold still it idles at 5 Hz to still catch a
// prop that pops in. No change to what's drawn — only how often we re-test.
const MOVING_INTERVAL = 0.05;
const IDLE_INTERVAL = 0.2;

function readTarget(object: THREE.Object3D | null): HoverTarget | null {
  let current: THREE.Object3D | null = object;
  while (current) {
    const data = current.userData?.interactable as HoverTarget | undefined;
    if (data?.id) return data;
    current = current.parent;
  }
  return null;
}

export function AimRaycaster({ enabled, onHover, onSelect }: AimRaycasterProps) {
  const { camera, scene } = useThree();
  const lastId = useRef<string | null>(null);
  const hoverRef = useRef<HoverTarget | null>(null);
  const since = useRef(0);
  const lastMatrix = useRef(new THREE.Matrix4());

  /** The interactable under the crosshair right now, from a fresh ray. */
  const castNow = useCallback((): HoverTarget | null => {
    _raycaster.setFromCamera(_center, camera);
    const hits = _raycaster.intersectObjects(scene.children, true);
    for (const hit of hits) {
      const target = readTarget(hit.object);
      if (target) return target;
    }
    return null;
  }, [camera, scene]);

  useEffect(() => {
    // The hover test is throttled, so a click right after a fast turn re-casts
    // here and acts on what's actually aimed at, never a stale target.
    const onClick = () => {
      if (!enabled) return;
      const target = castNow();
      if (target) onSelect(target);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [enabled, onSelect, castNow]);

  useFrame((_, dt) => {
    if (!enabled) {
      if (lastId.current) {
        lastId.current = null;
        hoverRef.current = null;
        onHover(null);
      }
      return;
    }

    // Re-test at 20 Hz while the view is moving, 5 Hz when it's still.
    since.current += dt;
    const moved = !lastMatrix.current.equals(camera.matrixWorld);
    if (since.current < (moved ? MOVING_INTERVAL : IDLE_INTERVAL)) return;
    since.current = 0;
    lastMatrix.current.copy(camera.matrixWorld);

    const next = castNow();
    hoverRef.current = next;
    const nextId = next?.id ?? null;
    if (nextId !== lastId.current) {
      lastId.current = nextId;
      onHover(next);
    }
  });

  return null;
}
