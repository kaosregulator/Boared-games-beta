import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TOY_CHEST } from './roomLayout';
import type { HoverTarget } from './Interactable';

/** WalkRoom flips the door. The chest owns whether it is open. */
export const toyChestBus = {
  toggle: () => {},
};

const TARGET: HoverTarget = {
  id: 'toy-chest',
  kind: 'prop',
  label: 'Toy chest',
  hint: 'Open',
};

function paint(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const BOXES: { title: string; bg: string; x: number }[] = [
  { title: 'SORRY', bg: '#e11d48', x: -0.24 },
  { title: 'GUESS\nWHO', bg: '#2563eb', x: -0.08 },
  { title: 'MOUSE\nTRAP', bg: '#15803d', x: 0.08 },
  { title: 'VIEWER', bg: '#b91c1c', x: 0.24 },
];

/**
 * The beige lift-and-hide chest from the room's own toy set.
 * Royal-blue door, three recessed panels, red badge. No reel box.
 * The front faces into the room, under the neon game wall.
 */
export function ToyChest({ hovered }: { hovered: boolean }) {
  const door = useRef<THREE.Group>(null);
  const boxes = useRef<(THREE.Mesh | null)[]>([]);
  const progress = useRef(0);
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('chest');
  });
  const openRef = useRef(open);
  const hoverRef = useRef(hovered);
  openRef.current = open;
  hoverRef.current = hovered;

  const mats = useMemo(() => {
    const beige = new THREE.MeshPhysicalMaterial({
      color: 0xc8c2b4,
      roughness: 0.38,
      metalness: 0.02,
      clearcoat: 0.28,
      clearcoatRoughness: 0.35,
    });
    const blue = new THREE.MeshPhysicalMaterial({
      color: 0x0058d6,
      roughness: 0.26,
      metalness: 0.04,
      clearcoat: 0.65,
      clearcoatRoughness: 0.18,
    });
    const recess = new THREE.MeshPhysicalMaterial({
      color: 0x0046ad,
      roughness: 0.32,
      metalness: 0.04,
      clearcoat: 0.5,
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x181512, roughness: 0.85 });
    const badgeMap = paint(ctx => {
      ctx.fillStyle = '#e11d2e';
      ctx.beginPath();
      ctx.roundRect(8, 8, 112, 112, 18);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(36, 62, 56, 32);
      ctx.beginPath();
      ctx.moveTo(32, 64);
      ctx.lineTo(64, 40);
      ctx.lineTo(96, 64);
      ctx.closePath();
      ctx.fill();
    }, 128);
    const badge = new THREE.MeshStandardMaterial({
      map: badgeMap ?? undefined,
      color: '#ffffff',
      roughness: 0.4,
      emissive: '#e11d2e',
      emissiveIntensity: 0.05,
    });
    const labels = BOXES.map(box =>
      paint(ctx => {
        ctx.fillStyle = box.bg;
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 12;
        ctx.strokeRect(16, 16, 224, 224);
        ctx.fillStyle = '#fff';
        ctx.font = '800 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lines = box.title.split('\n');
        lines.forEach((line, i) => ctx.fillText(line, 128, 128 + (i - (lines.length - 1) / 2) * 52));
      }),
    );
    return { beige, blue, recess, dark, badge, labels };
  }, []);

  useEffect(() => {
    toyChestBus.toggle = () => setOpen(value => !value);
    return () => {
      toyChestBus.toggle = () => {};
    };
  }, []);

  useFrame((_, dt) => {
    const target = openRef.current ? 1 : 0;
    let p = THREE.MathUtils.damp(progress.current, target, 8, dt);
    if (Math.abs(target - p) < 0.012) p = target;
    progress.current = p;
    const hinge = door.current;
    if (hinge) {
      const lift = THREE.MathUtils.smoothstep(p, 0, 0.48);
      const retract = THREE.MathUtils.smoothstep(p, 0.22, 1);
      hinge.position.set(0, THREE.MathUtils.lerp(0.55, 0.75, lift), THREE.MathUtils.lerp(0.195, -0.18, retract));
      hinge.rotation.x = THREE.MathUtils.lerp(-0.32, -Math.PI * 0.48, lift);
      hinge.scale.set(1, THREE.MathUtils.lerp(1, 0.28, retract), 1);
    }
    boxes.current.forEach((mesh, i) => {
      if (!mesh) return;
      mesh.visible = p > 0.08;
      mesh.position.set(BOXES[i].x, 0.44 + p * 0.1, THREE.MathUtils.lerp(-0.06, 0.08, p));
    });
    const badge = mats.badge;
    badge.emissiveIntensity = THREE.MathUtils.damp(badge.emissiveIntensity, hoverRef.current ? 0.55 : 0.05, 8, dt);
  });

  return (
    <group
      position={[TOY_CHEST.x, 0, TOY_CHEST.z]}
      rotation={[0, -Math.PI / 2, 0]}
      userData={{ interactable: TARGET, volume: 0.05 }}
    >
      <mesh position={[0, 0.16, 0]} material={mats.beige} castShadow receiveShadow>
        <boxGeometry args={[0.88, 0.32, 0.54]} />
      </mesh>
      <mesh position={[0, 0.33, 0]} material={mats.beige} castShadow>
        <boxGeometry args={[0.9, 0.09, 0.56]} />
      </mesh>
      <mesh position={[0, 0.285, 0.286]} material={mats.badge}>
        <planeGeometry args={[0.088, 0.088]} />
      </mesh>
      <mesh position={[0, 0.45, -0.07]} material={mats.dark}>
        <boxGeometry args={[0.72, 0.34, 0.34]} />
      </mesh>
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 0.395, 0.54, -0.01]} rotation={[-0.14, 0, 0]} material={mats.beige} castShadow>
          <boxGeometry args={[0.095, 0.44, 0.52]} />
        </mesh>
      ))}
      <mesh position={[0, 0.55, -0.24]} material={mats.beige} castShadow>
        <boxGeometry args={[0.88, 0.46, 0.08]} />
      </mesh>
      <mesh position={[0, 0.77, -0.03]} material={mats.beige} castShadow receiveShadow>
        <boxGeometry args={[0.86, 0.045, 0.48]} />
      </mesh>
      <mesh position={[0, 0.805, -0.25]} material={mats.beige}>
        <boxGeometry args={[0.86, 0.045, 0.045]} />
      </mesh>
      {[-1, 1].map(side => (
        <mesh key={`rim${side}`} position={[side * 0.41, 0.805, -0.03]} material={mats.beige}>
          <boxGeometry args={[0.045, 0.045, 0.48]} />
        </mesh>
      ))}

      <group ref={door} position={[0, 0.55, 0.195]} rotation={[-0.32, 0, 0]}>
        <mesh material={mats.blue} castShadow receiveShadow>
          <boxGeometry args={[0.71, 0.36, 0.032]} />
        </mesh>
        {[-0.21, 0, 0.21].map(x => (
          <mesh key={x} position={[x, 0.02, 0.014]} material={mats.recess}>
            <boxGeometry args={[0.165, 0.24, 0.012]} />
          </mesh>
        ))}
        <mesh position={[0, -0.135, 0.016]} rotation={[0, 0, Math.PI / 2]} material={mats.recess}>
          <cylinderGeometry args={[0.024, 0.024, 0.075, 14]} />
        </mesh>
      </group>

      {BOXES.map((box, i) => (
        <mesh
          key={box.title}
          ref={el => {
            boxes.current[i] = el;
          }}
          position={[box.x, 0.44, -0.06]}
          rotation={[-0.25, 0, 0]}
          visible={false}
          castShadow
        >
          <boxGeometry args={[0.14, 0.22, 0.16]} />
          <meshStandardMaterial map={mats.labels[i] ?? undefined} color="#ffffff" roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}
