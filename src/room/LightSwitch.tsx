import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HoverTarget } from './Interactable';

/**
 * The wall switch by the door: a cream plate with a toggle that flips up or
 * down. WalkRoom handles the click (target id 'light-switch').
 */
export function LightSwitch({
  position,
  on,
  hovered,
}: {
  position: [number, number, number];
  on: boolean;
  hovered: boolean;
}) {
  const target = useMemo<HoverTarget>(
    () => ({ id: 'light-switch', kind: 'prop', label: 'Light switch', hint: on ? 'Click · lights off' : 'Click · lights on' }),
    [on],
  );
  return (
    <group position={position}>
      {/* a generous hit box so it's easy to aim at */}
      <mesh position={[0, 0, 0.04]} userData={{ interactable: target, volume: 0.001 }}>
        <boxGeometry args={[0.16, 0.22, 0.08]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <boxGeometry args={[0.075, 0.12, 0.01]} />
        <meshStandardMaterial color={hovered ? '#fff8e6' : '#efe6d2'} roughness={0.45} emissive="#3a2c18" emissiveIntensity={hovered ? 0.35 : 0.08} />
      </mesh>
      <mesh position={[0, on ? 0.012 : -0.012, 0.014]} rotation={[on ? -0.45 : 0.45, 0, 0]}>
        <boxGeometry args={[0.018, 0.03, 0.012]} />
        <meshStandardMaterial color="#f6efe0" roughness={0.35} />
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} position={[0, s * 0.045, 0.011]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.003, 10]} />
          <meshStandardMaterial color="#b8ab90" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** With the room lights out and the TV on, the set throws a flickering blue-white glow. */
export function TvGlow({ position }: { position: [number, number, number] }) {
  const light = useRef<THREE.PointLight>(null);
  const target = useRef(0.9);
  useEffect(() => {
    const id = window.setInterval(() => {
      target.current = 0.55 + Math.random() * 0.7;
    }, 380);
    return () => window.clearInterval(id);
  }, []);
  useFrame((_, delta) => {
    const l = light.current;
    if (!l) return;
    l.intensity += (target.current - l.intensity) * Math.min(1, delta * 9);
  });
  return <pointLight ref={light} position={position} color="#a8c8ff" intensity={0.9} distance={3.2} decay={2} />;
}
