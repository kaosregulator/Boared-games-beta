import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TOY_CHEST } from './roomLayout';
import type { HoverTarget } from './Interactable';

/** WalkRoom flips the lid. The chest owns whether it is open. */
export const toyChestBus = {
  toggle: () => {},
};

const TARGET: HoverTarget = {
  id: 'toy-chest',
  kind: 'prop',
  label: 'Toy chest',
  hint: 'Open',
};

/**
 * A wooden chest under the neon game wall. Blocks, a ball, and a yo-yo.
 * No reels. The lid swings up on its hinge.
 */
export function ToyChest({ hovered }: { hovered: boolean }) {
  const lid = useRef<THREE.Group>(null);
  const latch = useRef<THREE.MeshStandardMaterial>(null);
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('chest');
  });
  const openRef = useRef(open);
  const hoverRef = useRef(hovered);
  openRef.current = open;
  hoverRef.current = hovered;

  useEffect(() => {
    toyChestBus.toggle = () => setOpen(value => !value);
    return () => {
      toyChestBus.toggle = () => {};
    };
  }, []);

  useFrame((_, dt) => {
    const hinge = lid.current;
    if (hinge) {
      const goal = openRef.current ? -1.2 : 0;
      hinge.rotation.z = THREE.MathUtils.damp(hinge.rotation.z, goal, 7, dt);
    }
    const mat = latch.current;
    if (mat) {
      const goal = hoverRef.current ? 0.85 : 0.2;
      mat.emissiveIntensity = THREE.MathUtils.damp(mat.emissiveIntensity, goal, 8, dt);
    }
  });

  return (
    <group position={[TOY_CHEST.x, 0, TOY_CHEST.z]} userData={{ interactable: TARGET, volume: 0.05 }}>
      {/* feet */}
      {(
        [
          [-0.26, -0.15],
          [0.26, -0.15],
          [-0.26, 0.15],
          [0.26, 0.15],
        ] as [number, number][]
      ).map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.012, z]} castShadow>
          <boxGeometry args={[0.06, 0.024, 0.06]} />
          <meshStandardMaterial color="#3a2414" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 0.128, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.2, 0.38]} />
        <meshStandardMaterial color="#8b5a32" roughness={0.72} metalness={0.04} />
      </mesh>
      {/* bands */}
      {[-0.12, 0.12].map(z => (
        <mesh key={z} position={[0, 0.128, z]}>
          <boxGeometry args={[0.632, 0.045, 0.028]} />
          <meshStandardMaterial color="#c6a15a" metalness={0.65} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[-0.3, 0.128, 0]}>
        <boxGeometry args={[0.02, 0.16, 0.3]} />
        <meshStandardMaterial color="#6b3e22" roughness={0.8} />
      </mesh>
      {/* felt and the toys you actually kept */}
      <mesh position={[0, 0.232, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.54, 0.3]} />
        <meshStandardMaterial color="#7f1d1d" roughness={0.9} />
      </mesh>
      <mesh position={[-0.14, 0.26, -0.04]} castShadow>
        <boxGeometry args={[0.08, 0.08, 0.08]} />
        <meshStandardMaterial color="#dc2626" roughness={0.45} />
      </mesh>
      <mesh position={[-0.05, 0.255, 0.05]} castShadow>
        <boxGeometry args={[0.07, 0.07, 0.07]} />
        <meshStandardMaterial color="#2563eb" roughness={0.45} />
      </mesh>
      <mesh position={[-0.14, 0.34, -0.02]} castShadow>
        <boxGeometry args={[0.06, 0.06, 0.06]} />
        <meshStandardMaterial color="#facc15" roughness={0.45} />
      </mesh>
      <mesh position={[0.12, 0.28, 0.02]} castShadow>
        <sphereGeometry args={[0.055, 20, 16]} />
        <meshStandardMaterial color="#f4f4f5" roughness={0.4} />
      </mesh>
      <mesh position={[0.12, 0.28, 0.02]} rotation={[0.4, 0.2, 0.6]}>
        <torusGeometry args={[0.056, 0.012, 8, 18]} />
        <meshStandardMaterial color="#ef4444" roughness={0.45} />
      </mesh>
      <group position={[0.16, 0.27, -0.1]} rotation={[0.2, 0.4, 0]}>
        <mesh>
          <cylinderGeometry args={[0.04, 0.04, 0.018, 16]} />
          <meshStandardMaterial color="#d6b48a" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.018, 16]} />
          <meshStandardMaterial color="#c49a6c" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.03, 8]} />
          <meshStandardMaterial color="#e8d5b5" roughness={0.4} />
        </mesh>
      </group>
      {/* hinge on the wall side, lid swings up and back */}
      <group ref={lid} position={[0.31, 0.228, 0]}>
        <mesh position={[-0.32, 0.028, 0]} castShadow>
          <boxGeometry args={[0.64, 0.05, 0.4]} />
          <meshStandardMaterial color="#a56b3c" roughness={0.68} />
        </mesh>
        <mesh position={[-0.32, 0.056, 0]}>
          <boxGeometry args={[0.5, 0.012, 0.28]} />
          <meshStandardMaterial color="#6b3a22" roughness={0.8} />
        </mesh>
        <mesh position={[-0.62, 0.02, 0]}>
          <boxGeometry args={[0.04, 0.04, 0.08]} />
          <meshStandardMaterial ref={latch} color="#e6c36a" emissive="#e6c36a" emissiveIntensity={0.2} metalness={0.7} roughness={0.28} />
        </mesh>
      </group>
    </group>
  );
}
