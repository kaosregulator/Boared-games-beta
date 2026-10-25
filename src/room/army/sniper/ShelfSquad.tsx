import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GREEN, plastic } from '../ArmyProps';
import { AIM_HOME, BARREL, RIFLE_PIVOT, SCOPE_UP, SQUAD } from './range';
import { sniper } from './state';

/**
 * Two green plastic army men on the shelf over the TV, the kind that come
 * stuck to a little base: a sniper lying flat behind a long rifle with a
 * scope and a bipod, and a radio man standing next to him with the handset
 * at his ear. Built from a few primitives, always in the room. The sniper's
 * rifle follows the aim while you are looking through it.
 */

const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 3, 8);

function Helmet({ mat, y, z = 0, tilt = 0 }: { mat: THREE.Material; y: number; z?: number; tilt?: number }) {
  return (
    <group position={[0, y, z]} rotation={[tilt, 0, 0]}>
      <mesh material={mat}>
        <sphereGeometry args={[0.0056, 12, 8]} />
      </mesh>
      <mesh material={mat} position={[0, 0.0022, 0]}>
        <sphereGeometry args={[0.0072, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={mat} position={[0, 0.0022, 0]}>
        <cylinderGeometry args={[0.0084, 0.0084, 0.0009, 14]} />
      </mesh>
    </group>
  );
}

function RadioMan({ mat }: { mat: THREE.Material }) {
  const ref = useRef<THREE.Group>(null);
  const geo = useMemo(() => ({ leg: capsule(0.0036, 0.026), arm: capsule(0.0026, 0.016), torso: capsule(0.0078, 0.012) }), []);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    // Hopping about the way you'd bounce a toy that's talking.
    const h = sniper.hop;
    g.position.y = Math.abs(Math.sin(h * Math.PI)) * 0.012;
    g.rotation.z = Math.sin(h * Math.PI * 2) * 0.12;
  });
  return (
    <group position={[SQUAD.radio.x, SQUAD.top, SQUAD.radio.z]} rotation={[0, -0.35, 0]}>
      {/* The base stays put, the man bounces on it. */}
      <mesh material={mat} position={[0, 0.002, 0]} scale={[1, 1, 0.8]}>
        <cylinderGeometry args={[0.017, 0.018, 0.004, 9]} />
      </mesh>
      <group ref={ref}>
        <mesh material={mat} geometry={geo.leg} position={[-0.0045, 0.019, 0.003]} rotation={[0.18, 0, 0.04]} />
        <mesh material={mat} geometry={geo.leg} position={[0.0045, 0.019, -0.003]} rotation={[-0.14, 0, -0.04]} />
        <mesh material={mat} geometry={geo.torso} position={[0, 0.047, 0]} scale={[1, 1, 0.72]} />
        {/* Radio on his back, with the whip antenna. */}
        <mesh material={mat} position={[0, 0.05, -0.0085]}>
          <boxGeometry args={[0.013, 0.017, 0.007]} />
        </mesh>
        <mesh material={mat} position={[0.004, 0.08, -0.012]} rotation={[-0.12, 0, 0]}>
          <cylinderGeometry args={[0.0005, 0.0008, 0.046, 5]} />
        </mesh>
        <mesh material={mat} position={[0.0044, 0.103, -0.0148]}>
          <sphereGeometry args={[0.0011, 6, 4]} />
        </mesh>
        {/* Left hand up at the ear with the handset; right hand on the rifle. */}
        <mesh material={mat} geometry={geo.arm} position={[-0.0098, 0.06, 0.001]} rotation={[0, 0, -2.5]} />
        <mesh material={mat} position={[-0.0078, 0.07, 0.003]} rotation={[0.2, 0, 0.3]}>
          <boxGeometry args={[0.003, 0.011, 0.0035]} />
        </mesh>
        <mesh material={mat} geometry={geo.arm} position={[0.0102, 0.046, 0.004]} rotation={[0.6, 0, 0.2]} />
        <mesh material={mat} position={[0.0118, 0.04, 0.009]} rotation={[0.9, 0, 0]}>
          <cylinderGeometry args={[0.0013, 0.0016, 0.04, 6]} />
        </mesh>
        <mesh material={mat} position={[0, 0.0625, 0]}>
          <cylinderGeometry args={[0.0028, 0.0034, 0.004, 8]} />
        </mesh>
        <Helmet mat={mat} y={0.07} />
      </group>
    </group>
  );
}

function Sniper({ mat }: { mat: THREE.Material }) {
  const body = useRef<THREE.Group>(null);
  const rifle = useRef<THREE.Group>(null);
  const geo = useMemo(() => ({ leg: capsule(0.0036, 0.03), arm: capsule(0.0025, 0.017), torso: capsule(0.0072, 0.024) }), []);
  useFrame(() => {
    if (body.current) {
      body.current.rotation.y = sniper.yaw - AIM_HOME.yaw;
      body.current.visible = !sniper.scoped;
    }
    if (rifle.current) rifle.current.rotation.x = -sniper.pitch;
  });
  const rise = RIFLE_PIVOT.y - SQUAD.top;
  return (
    <group position={[SQUAD.sniper.x, SQUAD.top, SQUAD.sniper.z]} rotation={[0, AIM_HOME.yaw, 0]}>
      {/* The long base plastic snipers come on. */}
      <mesh material={mat} position={[0, 0.002, -0.022]}>
        <boxGeometry args={[0.034, 0.004, 0.1]} />
      </mesh>
      <group ref={body}>
        {/* Lying flat, legs spread behind. */}
        <mesh material={mat} geometry={geo.torso} position={[0, 0.0105, -0.022]} rotation={[Math.PI / 2 - 0.1, 0, 0]} scale={[1, 1, 0.7]} />
        <mesh material={mat} geometry={geo.leg} position={[-0.0062, 0.0075, -0.058]} rotation={[Math.PI / 2, 0, -0.22]} />
        <mesh material={mat} geometry={geo.leg} position={[0.0062, 0.0075, -0.058]} rotation={[Math.PI / 2, 0, 0.22]} />
        {/* Elbows down, hands up on the rifle. */}
        <mesh material={mat} geometry={geo.arm} position={[-0.0092, 0.012, 0.002]} rotation={[1.2, 0, 0.35]} />
        <mesh material={mat} geometry={geo.arm} position={[0.0092, 0.012, 0.004]} rotation={[1.2, 0, -0.35]} />
        <Helmet mat={mat} y={0.0185} z={-0.0015} tilt={0.35} />
        <group ref={rifle} position={[0, rise, 0]}>
          {/* Stock against the shoulder, barrel out over the shelf edge. */}
          <mesh material={mat} position={[0, -0.0012, -0.006]}>
            <boxGeometry args={[0.0042, 0.0062, 0.026]} />
          </mesh>
          <mesh material={mat} position={[0, 0, BARREL / 2 + 0.004]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0011, 0.0014, BARREL - 0.008, 6]} />
          </mesh>
          <mesh material={mat} position={[0, 0, BARREL - 0.002]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0017, 0.0017, 0.006, 6]} />
          </mesh>
          {/* The scope. */}
          <mesh material={mat} position={[0, SCOPE_UP, 0.012]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0026, 0.0026, 0.026, 10]} />
          </mesh>
          {[-1, 1].map(s => (
            <mesh key={s} material={mat} position={[0, SCOPE_UP, 0.012 + s * 0.014]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.0034, 0.0034, 0.004, 10]} />
            </mesh>
          ))}
          <mesh material={mat} position={[0, SCOPE_UP * 0.55, 0.012]}>
            <boxGeometry args={[0.002, SCOPE_UP * 0.6, 0.008]} />
          </mesh>
          {/* Bipod. */}
          {[-1, 1].map(s => (
            <mesh key={s} material={mat} position={[s * 0.004, -0.0075, 0.042]} rotation={[0.25, 0, s * 0.35]}>
              <cylinderGeometry args={[0.0007, 0.0007, 0.016, 4]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

export function ShelfSquad() {
  const mat = useMemo(() => plastic(GREEN), []);
  return (
    <group>
      <Sniper mat={mat} />
      <RadioMan mat={mat} />
    </group>
  );
}
