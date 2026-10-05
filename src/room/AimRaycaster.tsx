import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    const onClick = () => {
      if (!enabled || !hoverRef.current) return;
      onSelect(hoverRef.current);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [enabled, onSelect]);

  useFrame(() => {
    if (!enabled) {
      if (lastId.current) {
        lastId.current = null;
        hoverRef.current = null;
        onHover(null);
      }
      return;
    }

    _raycaster.setFromCamera(_center, camera);
    const hits = _raycaster.intersectObjects(scene.children, true);
    let next: HoverTarget | null = null;
    for (const hit of hits) {
      const target = readTarget(hit.object);
      if (target) {
        next = target;
        break;
      }
    }

    hoverRef.current = next;
    const nextId = next?.id ?? null;
    if (nextId !== lastId.current) {
      lastId.current = nextId;
      onHover(next);
    }
  });

  return null;
}
