import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * A translucent "ghost" hand, the opponent's (or your own) hand at the table,
 * like the hands Tabletop Club draws for other players. Built from rounded
 * capsules so it costs next to nothing; the fingers curl to grip.
 *
 * `at` is read every frame: the point between the finger tips, table-local.
 */
export interface GhostHandProps {
  at: THREE.Vector3;
  /** 0 open, 1 closed round a piece. */
  grip: React.MutableRefObject<number>;
  visible: React.MutableRefObject<boolean>;
  /** Which way the hand reaches from (radians round the table). */
  from?: number;
  tint?: string;
  scale?: number;
}

const FINGERS = [
  { x: -0.0105, len: 0.026 },
  { x: -0.0035, len: 0.03 },
  { x: 0.0035, len: 0.029 },
  { x: 0.0105, len: 0.024 },
];

export function GhostHand({ at, grip, visible, from = Math.PI, tint = '#bfe3ff', scale = 1 }: GhostHandProps) {
  const root = useRef<THREE.Group>(null);
  const fingers = useRef<(THREE.Group | null)[]>([]);
  const thumb = useRef<THREE.Group>(null);
  const fade = useRef(0);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: tint,
        emissive: tint,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0,
        roughness: 0.4,
        depthWrite: false,
      }),
    [tint],
  );
  const fingerGeo = useMemo(() => FINGERS.map(f => new THREE.CapsuleGeometry(0.0034, f.len - 0.0068, 4, 10)), []);
  const thumbGeo = useMemo(() => new THREE.CapsuleGeometry(0.0038, 0.013, 4, 10), []);
  const palm = useMemo(() => new THREE.CapsuleGeometry(0.014, 0.012, 6, 14), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const g = root.current;
    if (!g) return;
    fade.current += ((visible.current ? 1 : 0) - fade.current) * Math.min(1, dt * 8);
    mat.opacity = 0.55 * fade.current;
    g.visible = fade.current > 0.02;
    g.position.copy(at);
    g.rotation.set(0, from, 0);
    const k = grip.current;
    fingers.current.forEach(f => {
      if (f) f.rotation.x = -0.35 - k * 0.9;
    });
    if (thumb.current) thumb.current.rotation.z = 0.9 - k * 0.7;
  });

  // Palm above the grip point, fingers hanging down towards it, reaching from +z.
  return (
    <group ref={root} scale={scale}>
      <group position={[0, 0.042, 0.022]} rotation={[0.5, 0, 0]}>
        <mesh geometry={palm} material={mat} rotation={[Math.PI / 2, 0, 0]} scale={[1.05, 1, 0.55]} />
        {FINGERS.map((f, i) => (
          <group
            key={i}
            ref={el => {
              fingers.current[i] = el;
            }}
            position={[f.x, 0, -0.018]}
          >
            <mesh geometry={fingerGeo[i]} material={mat} position={[0, 0, -f.len / 2]} rotation={[Math.PI / 2, 0, 0]} />
          </group>
        ))}
        <group ref={thumb} position={[0.015, -0.004, 0.004]}>
          <mesh geometry={thumbGeo} material={mat} position={[0.008, 0, -0.008]} rotation={[Math.PI / 2, 0, -0.8]} />
        </group>
        {/* the wrist trailing back to where the arm would be */}
        <mesh geometry={palm} material={mat} position={[0, 0.004, 0.03]} rotation={[Math.PI / 2, 0, 0]} scale={[0.7, 1.2, 0.5]} />
      </group>
    </group>
  );
}
