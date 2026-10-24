import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { plastic } from './ArmyProps';

/**
 * A green plastic toy helicopter, Huey-ish, about 18 cm nose to tail.
 * Built from primitives (no download). The nose points +z. The two rotors
 * are exposed so the world can spin them.
 */
export interface HeliParts {
  main: THREE.Group | null;
  tail: THREE.Group | null;
}

export const ToyHelicopter = forwardRef<THREE.Group, { parts: React.MutableRefObject<HeliParts> }>(function ToyHelicopter({ parts }, ref) {
  const body = useMemo(() => plastic('#557f2e'), []);
  const dark = useMemo(() => plastic('#35511d'), []);
  const glass = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1d2b33', roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85 }),
    [],
  );
  const blade = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2b2f2a', roughness: 0.5, transparent: true, opacity: 0.92 }), []);
  return (
    <group ref={ref}>
      {/* Cabin. */}
      <mesh material={body} position={[0, 0.034, 0.012]} scale={[0.032, 0.026, 0.05]} castShadow>
        <sphereGeometry args={[1, 18, 12]} />
      </mesh>
      {/* Windscreen bubble. */}
      <mesh material={glass} position={[0, 0.038, 0.042]} scale={[0.026, 0.02, 0.024]}>
        <sphereGeometry args={[1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
      </mesh>
      {/* Tail boom, tapering backward. */}
      <mesh material={body} position={[0, 0.04, -0.062]} rotation={[Math.PI / 2 - 0.06, 0, 0]} castShadow>
        <cylinderGeometry args={[0.006, 0.011, 0.09, 10]} />
      </mesh>
      {/* Tail fin and stabiliser. */}
      <mesh material={body} position={[0, 0.056, -0.104]} rotation={[0.35, 0, 0]}>
        <boxGeometry args={[0.003, 0.03, 0.018]} />
      </mesh>
      <mesh material={body} position={[0, 0.044, -0.095]}>
        <boxGeometry args={[0.032, 0.0025, 0.012]} />
      </mesh>
      {/* Engine hump and mast. */}
      <mesh material={dark} position={[0, 0.058, -0.004]} scale={[0.014, 0.008, 0.026]}>
        <sphereGeometry args={[1, 12, 8]} />
      </mesh>
      <mesh material={dark} position={[0, 0.066, 0]}>
        <cylinderGeometry args={[0.0025, 0.0025, 0.012, 8]} />
      </mesh>
      {/* Main rotor. */}
      <group ref={g => (parts.current.main = g)} position={[0, 0.073, 0]}>
        <mesh material={dark}>
          <cylinderGeometry args={[0.005, 0.005, 0.004, 10]} />
        </mesh>
        {[0, Math.PI / 2].map(r => (
          <mesh key={r} material={blade} rotation={[0, r, 0]} castShadow>
            <boxGeometry args={[0.2, 0.0016, 0.011]} />
          </mesh>
        ))}
      </group>
      {/* Tail rotor. */}
      <group ref={g => (parts.current.tail = g)} position={[0.006, 0.058, -0.108]}>
        {[0, Math.PI / 2].map(r => (
          <mesh key={r} material={blade} rotation={[r, 0, 0]}>
            <boxGeometry args={[0.0015, 0.036, 0.005]} />
          </mesh>
        ))}
      </group>
      {/* Skids. */}
      {[-1, 1].map(s => (
        <group key={s}>
          <mesh material={dark} position={[s * 0.024, 0.003, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.0022, 0.0022, 0.09, 6]} />
          </mesh>
          {[-0.015, 0.03].map(z => (
            <mesh key={z} material={dark} position={[s * 0.021, 0.012, z]} rotation={[0, 0, s * 0.35]}>
              <cylinderGeometry args={[0.0018, 0.0018, 0.02, 6]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* A white star on each side. */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * 0.0322, 0.034, 0.004]} rotation={[0, (s * Math.PI) / 2, 0]}>
          <circleGeometry args={[0.009, 5]} />
          <meshStandardMaterial color="#f1efe6" />
        </mesh>
      ))}
    </group>
  );
});
