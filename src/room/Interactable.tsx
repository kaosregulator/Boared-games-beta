import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface HoverTarget {
  id: string;
  label: string;
  hint?: string;
  kind: 'game' | 'prop';
  gameId?: string;
}

interface InteractableProps {
  id: string;
  label: string;
  hint?: string;
  kind: 'game' | 'prop';
  gameId?: string;
  position: [number, number, number];
  size?: [number, number, number];
  activeId: string | null;
  onHover: (target: HoverTarget | null) => void;
  onSelect: (target: HoverTarget) => void;
  children: ReactNode;
}

export function Interactable({
  id,
  label,
  hint,
  kind,
  gameId,
  position,
  size = [0.9, 0.9, 0.9],
  activeId,
  onHover,
  onSelect,
  children,
}: InteractableProps) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const target = useMemo(
    () => ({ id, label, hint, kind, gameId }),
    [id, label, hint, kind, gameId]
  );

  const isActive = activeId === id || hovered;

  useFrame((_, delta) => {
    if (!group.current) return;
    const matBoost = isActive ? 1 : 0;
    group.current.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach(m => {
        const mat = m as THREE.MeshStandardMaterial;
        if (!mat || !('emissiveIntensity' in mat)) return;
        const goal = matBoost ? 0.55 : 0.05;
        mat.emissiveIntensity = THREE.MathUtils.damp(mat.emissiveIntensity ?? 0, goal, 8, delta);
      });
    });
    const s = isActive ? 1.04 : 1;
    group.current.scale.x = THREE.MathUtils.damp(group.current.scale.x, s, 10, delta);
    group.current.scale.y = THREE.MathUtils.damp(group.current.scale.y, s, 10, delta);
    group.current.scale.z = THREE.MathUtils.damp(group.current.scale.z, s, 10, delta);
  });

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    onHover(target);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(false);
    onHover(null);
    document.body.style.cursor = 'default';
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(target);
  };

  return (
    <group
      ref={group}
      position={position}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      {children}
      {isActive && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[size[0] * 1.08, size[1] * 1.08, size[2] * 1.08]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
