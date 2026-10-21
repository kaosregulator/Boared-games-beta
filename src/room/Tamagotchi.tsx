import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { HoverTarget } from './Interactable';

const H = 0.072;
const W = 0.062;
const DEPTH = 0.032;

/** Egg outline, the same silhouette as the Dammagotchi shell. */
function eggPoints() {
  const pts: THREE.Vector2[] = [];
  const n = 28;
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const y = t * H;
    // Wider low, narrower high: an egg, not an ellipse.
    const r = (W / 2) * Math.sqrt(Math.sin(Math.PI * t)) * (1 - 0.18 * t);
    pts.push(new THREE.Vector2(Math.max(r, 0.0001), y));
  }
  return pts;
}

// Two frames of a tiny pixel blob, 16 x 16, so the LCD looks alive from across the room.
const FRAMES = [
  [
    '................',
    '................',
    '......####......',
    '....##....##....',
    '...#........#...',
    '...#..#..#..#...',
    '..#..........#..',
    '..#...####...#..',
    '..#..........#..',
    '...#........#...',
    '....########....',
    '.....#....#.....',
    '................',
    '................',
    '................',
    '################',
  ],
  [
    '................',
    '................',
    '................',
    '......####......',
    '....##....##....',
    '...#........#...',
    '...#..#..#..#...',
    '..#..........#..',
    '..#...####...#..',
    '..#..........#..',
    '...##########...',
    '....#......#....',
    '................',
    '................',
    '................',
    '################',
  ],
];

function useLcd() {
  const canvas = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    return c;
  }, []);
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.magFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [canvas]);
  const draw = (frame: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#b9c7a2';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#2b3324';
    FRAMES[frame].forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell === '#') ctx.fillRect(x * 4, y * 4, 4, 4);
      });
    });
    texture.needsUpdate = true;
  };
  useEffect(() => {
    draw(0);
    return () => texture.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { texture, draw };
}

/**
 * A little egg-shaped virtual pet lying on the quilt, keychain and all. Its
 * screen ticks between two frames so you can tell it's alive. Clicking it
 * opens its card; the card's "Play with it" picks up the real Dammagotchi.
 */
export function Tamagotchi({
  position,
  rotation,
  active,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  active: boolean;
}) {
  const lathe = useMemo(() => {
    const geo = new THREE.LatheGeometry(eggPoints(), 40);
    // Squash front to back: it's a flat-ish egg you hold in your palm.
    geo.scale(1, 1, DEPTH / W);
    return geo;
  }, []);
  const { texture, draw } = useLcd();
  const frame = useRef(0);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const target = useMemo<HoverTarget>(() => ({ id: 'tamagotchi', kind: 'prop', label: 'Tamagotchi', hint: 'Play with it' }), []);

  useFrame(({ clock }) => {
    const next = Math.floor(clock.elapsedTime * 1.6) % 2;
    if (next !== frame.current) {
      frame.current = next;
      draw(next);
    }
    if (glow.current) glow.current.opacity = active ? 0.22 : Math.max(0, Math.sin(clock.elapsedTime * 1.5)) * 0.045;
  });

  return (
    <group position={position} rotation={rotation} scale={1.3}>
      <mesh geometry={lathe} castShadow>
        <meshPhysicalMaterial color="#8b45d6" roughness={0.28} clearcoat={1} clearcoatRoughness={0.15} sheen={0.4} sheenColor="#ffb3f0" />
      </mesh>
      {/* bezel and LCD */}
      <mesh position={[0, H * 0.53, DEPTH / 2 - 0.001]}>
        <circleGeometry args={[0.019, 32]} />
        <meshStandardMaterial color="#f4e9ff" roughness={0.5} />
      </mesh>
      <mesh position={[0, H * 0.53, DEPTH / 2 + 0.0004]}>
        <planeGeometry args={[0.022, 0.022]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* three buttons */}
      {[-0.013, 0, 0.013].map((x, i) => (
        <mesh key={x} position={[x, H * 0.2 - (i === 1 ? 0.003 : 0), DEPTH / 2 - 0.004]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0042, 0.0042, 0.006, 16]} />
          <meshStandardMaterial color="#ffd23f" roughness={0.4} />
        </mesh>
      ))}
      {/* keychain loop and ring */}
      <mesh position={[0, H + 0.004, 0]}>
        <torusGeometry args={[0.005, 0.0016, 8, 20]} />
        <meshStandardMaterial color="#c9c9d1" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, H + 0.016, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.011, 0.0012, 8, 28]} />
        <meshStandardMaterial color="#c9c9d1" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* soft halo so it can be found on the quilt */}
      <mesh position={[0, H * 0.5, 0]}>
        <sphereGeometry args={[0.055, 16, 12]} />
        <meshBasicMaterial ref={glow} color="#ffd27a" transparent opacity={0.1} depthWrite={false} />
      </mesh>
      {/* pick box: a little bigger than the toy so it's easy to tap */}
      <mesh position={[0, H * 0.5, 0]} userData={{ interactable: target, volume: 0.0002 }}>
        <boxGeometry args={[0.12, 0.12, 0.08]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
