import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GameMetadata } from '../types';
import type { HoverTarget } from './Interactable';
import { NEON_WALL } from './roomLayout';

/**
 * The games that used to sit on the crate, hung on the east wall as little
 * neon signs. Each is a printed spine in a glowing tube frame; aim and press E
 * (or click Play on its card) to start it.
 */

const SPINE_COLOR: Record<string, { color: string; accent: string }> = {
  pawnrush: { color: '#c4262c', accent: '#ffe08a' },
  chess: { color: '#2b2622', accent: '#d8cfc2' },
  connect4: { color: '#1d4fa3', accent: '#ffd23f' },
  checkers: { color: '#8c1c1c', accent: '#f0d9a7' },
  poker: { color: '#1f5134', accent: '#ffd98a' },
  blackjack: { color: '#14402a', accent: '#9ff0b8' },
  gofish: { color: '#1b5f7a', accent: '#bdf0ff' },
  liarsdice: { color: '#6d4414', accent: '#f5d985' },
  trivia: { color: '#3b2148', accent: '#ffd27a' },
  casino: { color: '#0e3b32', accent: '#d4ffe8' },
};

/** These already have a real box on the floor or desk. */
const FLOOR_BOX_GAMES = new Set(['monopoly', 'battleship', 'clue', 'life', 'yahtzee']);

const ORDER = ['connect4', 'chess', 'checkers', 'pawnrush', 'trivia', 'poker', 'blackjack', 'casino', 'gofish', 'liarsdice'];

const faceCache = new Map<string, THREE.CanvasTexture>();

function faceTexture(title: string, color: string, accent: string) {
  const key = `${title}:${color}`;
  const hit = faceCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  // Portrait, like a game box standing on its end.
  const W = 240;
  const H = 336;
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = color;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = accent;
  g.lineWidth = 8;
  g.strokeRect(10, 10, W - 20, H - 20);
  g.fillStyle = accent;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const words = title.split(/\s+/);
  const lines: string[] = [];
  let size = 54;
  const fits = () => {
    g.font = `800 ${size}px "Bricolage Grotesque", Arial, sans-serif`;
    lines.length = 0;
    let line = '';
    for (const w of words) {
      const probe = line ? `${line} ${w}` : w;
      if (g.measureText(probe).width > W - 40 && line) {
        lines.push(line);
        line = w;
      } else line = probe;
    }
    lines.push(line);
    return lines.length <= 4 && lines.every(l => g.measureText(l).width <= W - 40);
  };
  while (!fits() && size > 18) size -= 2;
  lines.forEach((l, i) => g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.08));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  faceCache.set(key, t);
  return t;
}

export function neonGames(games: GameMetadata[]) {
  const byId = new Map(games.map(g => [g.id as string, g]));
  return [
    ...ORDER.filter(id => byId.has(id)).map(id => byId.get(id)!),
    ...games.filter(g => !FLOOR_BOX_GAMES.has(g.id) && !ORDER.includes(g.id)),
  ];
}

function NeonButton({
  game,
  position,
  hovered,
  pulled,
  seed,
}: {
  game: GameMetadata;
  position: [number, number, number];
  hovered: boolean;
  pulled: boolean;
  seed: number;
}) {
  const paint = SPINE_COLOR[game.id] ?? { color: '#5c3d2e', accent: '#f6ead0' };
  const map = useMemo(() => faceTexture(game.title, paint.color, paint.accent), [game.title, paint.color, paint.accent]);
  const tube = useMemo(() => new THREE.MeshBasicMaterial({ color: paint.accent, toneMapped: false }), [paint.accent]);
  const body = useRef<THREE.Group>(null);
  const target: HoverTarget = { id: `game:${game.id}`, kind: 'game', gameId: game.id, label: game.title, hint: 'Play' };
  const { w, h } = NEON_WALL;
  const t = 0.008;

  useFrame(({ clock }, dt) => {
    // Neon hum: a steady glow with the odd stutter, brighter when aimed at.
    const time = clock.elapsedTime;
    const stutter = Math.sin(time * 37 + seed * 11) > 0.985 ? 0.35 : 1;
    const base = hovered || pulled ? 1.6 : 1;
    tube.color.set(paint.accent).multiplyScalar(base * stutter * (0.92 + Math.sin(time * 3 + seed) * 0.08));
    if (body.current) {
      // Local +Z faces the room; aiming or pressing pops the sign off the wall.
      const want = pulled ? 0.05 : hovered ? 0.02 : 0;
      body.current.position.z += (want - body.current.position.z) * Math.min(1, dt * 10);
    }
  });

  return (
    <group position={position}>
      <group ref={body} userData={{ interactable: target }}>
        <mesh position={[0, 0, 0.012]}>
          <boxGeometry args={[w, h, 0.024]} />
          <meshStandardMaterial color={paint.color} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.0245]}>
          <planeGeometry args={[w * 0.94, h * 0.9]} />
          <meshBasicMaterial map={map} toneMapped={false} />
        </mesh>
        {/* glass tube frame */}
        {(
          [
            [0, h / 2 + t / 2, w + t * 2, t],
            [0, -h / 2 - t / 2, w + t * 2, t],
            [-w / 2 - t / 2, 0, t, h],
            [w / 2 + t / 2, 0, t, h],
          ] as [number, number, number, number][]
        ).map(([x, y, sx, sy], i) => (
          <mesh key={i} position={[x, y, 0.026]} material={tube}>
            <boxGeometry args={[sx, sy, t]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function NeonGameWall({
  games,
  hoveredId,
  pulledId,
}: {
  games: GameMetadata[];
  hoveredId: string | null;
  pulledId: string | null;
}) {
  const list = useMemo(() => neonGames(games), [games]);
  const { cols, w, h, gap } = NEON_WALL;
  const rows = Math.ceil(list.length / cols);
  return (
    // Hung on the east wall, facing west into the room.
    <group position={[NEON_WALL.x, NEON_WALL.y, NEON_WALL.z]} rotation={[0, -Math.PI / 2, 0]}>
      {list.map((game, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = (col - (cols - 1) / 2) * (w + gap);
        const y = ((rows - 1) / 2 - row) * (h + gap);
        return (
          <NeonButton
            key={game.id}
            game={game}
            position={[x, y, 0]}
            hovered={hoveredId === `game:${game.id}`}
            pulled={pulledId === game.id}
            seed={i * 1.7}
          />
        );
      })}
      <pointLight position={[0, 0.05, 0.45]} color="#ff7ad8" intensity={0.8} distance={2} decay={2} />
    </group>
  );
}
