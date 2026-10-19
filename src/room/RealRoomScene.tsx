import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  EAST_X,
  NORTH_Z,
  PALETTE,
  ROOM_PROPS,
  SOUTH_Z,
  WALL,
  WEST_X,
  type ShelfSlot,
} from './videoRoom';
import { useTexture } from '@react-three/drei';
import { ceilingTexture, floorTexture, rugTexture, wallTexture } from './procTextures';
import type { HoverTarget } from './Interactable';
import { SafeRoomModel } from './RoomModel';
import type { GameMetadata } from '../types';
import { LAYOUT, SOUTH_WINDOW, WALL_SHELF } from './roomLayout';
import { ANCHORS, type Anchor } from './anchors';
import { DynamicModel } from './UserProps';
import { MOODS, type RoomMood } from './moods';
import type { SavedPlacement } from './userPlacements';

function MoodFog({ color }: { color: string }) {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.Fog(color, 8, 22);
  }, [scene, color]);
  return null;
}

function Solid({ color, rough = 0.85 }: { color: string; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={0.05} />;
}

/** Walls, floor, ceiling. Architecture only — every object in the room is a Tripo mesh. */
function Shell() {
  const floor = floorTexture();
  const plaster = wallTexture();
  const wallMat = (
    <meshStandardMaterial map={plaster} color="#b9a0b4" roughness={0.96} metalness={0} />
  );
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[WALL.halfWidth * 2, WALL.halfDepth * 2]} />
        <meshStandardMaterial map={floor} color="#c4a090" roughness={0.82} />
      </mesh>
      <mesh position={[0, WALL.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[WALL.halfWidth * 2, WALL.halfDepth * 2]} />
        <meshStandardMaterial map={ceilingTexture()} roughness={0.92} />
      </mesh>
      <mesh position={[0, WALL.height / 2, NORTH_Z]}>
        <planeGeometry args={[WALL.halfWidth * 2, WALL.height]} />
        {wallMat}
      </mesh>
      <mesh position={[0, WALL.height / 2, SOUTH_Z]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[WALL.halfWidth * 2, WALL.height]} />
        {wallMat}
      </mesh>
      <mesh position={[WEST_X, WALL.height / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[WALL.halfDepth * 2, WALL.height]} />
        {wallMat}
      </mesh>
      <mesh position={[EAST_X, WALL.height / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[WALL.halfDepth * 2, WALL.height]} />
        {wallMat}
      </mesh>
      {/* Baseboards — gapped so the door meets the floor */}
      <Baseboards />
    </group>
  );
}

function Baseboards() {
  const door = LAYOUT.door;
  const west = -WALL.halfWidth;
  const east = WALL.halfWidth;
  const gapL = door.x - door.sx / 2 - 0.06;
  const gapR = door.x + door.sx / 2 + 0.06;
  const leftW = Math.max(0.2, gapL - west);
  const rightW = Math.max(0.2, east - gapR);
  const bars: [number, number, number, number][] = [
    [(west + gapL) / 2, NORTH_Z + 0.02, leftW, 0.04],
    [(gapR + east) / 2, NORTH_Z + 0.02, rightW, 0.04],
    [0, SOUTH_Z - 0.02, WALL.halfWidth * 2, 0.04],
  ];
  return (
    <>
      {bars.map((b, i) => (
        <mesh key={i} position={[b[0], 0.04, b[1]]}>
          <boxGeometry args={[b[2], 0.08, b[3]]} />
          <Solid color={PALETTE.trim} />
        </mesh>
      ))}
    </>
  );
}

/** Houses and a few interior lights, seen through the window. */
function paintNightCity(ctx: CanvasRenderingContext2D, time: number) {
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#14122e');
  g.addColorStop(0.45, '#3a2a58');
  g.addColorStop(0.72, '#6a4060');
  g.addColorStop(1, '#1a1020');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i += 1) {
    const sx = (i * 97) % 512;
    const sy = (i * 53) % 220;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + ((i * 17) % 10) / 20})`;
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }
  const houses = [
    { x: 18, w: 78, h: 150 },
    { x: 108, w: 96, h: 210 },
    { x: 214, w: 70, h: 130 },
    { x: 300, w: 110, h: 240 },
    { x: 420, w: 74, h: 170 },
  ];
  houses.forEach((house, hi) => {
    ctx.fillStyle = '#120e1c';
    ctx.fillRect(house.x, 512 - house.h, house.w, house.h);
    const cols = house.w > 90 ? 3 : 2;
    const rows = 4;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const wx = house.x + 12 + col * ((house.w - 20) / cols);
        const wy = 512 - house.h + 22 + row * 36;
        const phase = Math.sin(time * (1.4 + hi * 0.35) + row * 2.1 + col + hi);
        const lit = (hi + row + col) % 3 !== 0 || phase > 0.2;
        const flicker = lit ? 0.55 + phase * 0.2 : 0.05;
        ctx.fillStyle = `rgba(255, ${190 + hi * 8}, 120, ${Math.max(0.04, flicker)})`;
        ctx.fillRect(wx, wy, 8, 12);
      }
    }
  });
}

function NightCity() {
  const tex = useRef<THREE.CanvasTexture | null>(null);
  if (!tex.current) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    if (ctx) paintNightCity(ctx, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    tex.current = t;
  }
  const redraw = useRef(0);
  useFrame(({ clock }, delta) => {
    redraw.current += delta;
    if (redraw.current < 0.45) return;
    redraw.current = 0;
    const t = tex.current;
    const c = t?.image as HTMLCanvasElement | undefined;
    const ctx = c?.getContext('2d');
    if (!t || !ctx) return;
    paintNightCity(ctx, clock.elapsedTime);
    t.needsUpdate = true;
  });
  const w = LAYOUT.window;
  return (
    <mesh position={[w.x, w.y + w.sy * 0.46, NORTH_Z - 0.05]}>
      <planeGeometry args={[w.sx * 0.78, w.sy * 0.72]} />
      <meshBasicMaterial map={tex.current ?? undefined} />
    </mesh>
  );
}

function WindowGlare() {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (!mat.current) return;
    mat.current.opacity = 0.035 + Math.sin(clock.elapsedTime * 0.65) * 0.012;
  });
  const w = LAYOUT.window;
  return (
    <mesh position={[w.x - w.sx * 0.12, w.y + w.sy * 0.58, w.z + w.sz * 0.62]}>
      <planeGeometry args={[w.sx * 0.22, w.sy * 0.06]} />
      <meshBasicMaterial
        ref={mat}
        color="#e7f0ff"
        transparent
        opacity={0.045}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function BulbFlicker({
  position,
  color,
  base,
  seed,
}: {
  position: [number, number, number];
  color: string;
  base: number;
  seed: number;
}) {
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const bulb = light.current;
    if (!bulb) return;
    const t = clock.elapsedTime;
    const twinkle = Math.sin(t * (8 + seed) + seed * 4) * 0.08;
    const dip = Math.sin(t * 29 + seed * 9) > 0.97 ? -0.28 : 0;
    bulb.intensity = Math.max(0.04, base + twinkle + dip);
  });
  return <pointLight ref={light} position={position} color={color} intensity={base} distance={1.05} decay={2} />;
}

function MountedShelf({
  shelf,
}: {
  shelf: { x: number; y: number; z: number; w: number; d: number; h: number };
}) {
  const s = shelf;
  return (
    <group position={[s.x, s.y + s.h / 2, s.z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[s.w, s.h, s.d]} />
        <meshStandardMaterial color="#8d5c36" roughness={0.74} />
      </mesh>
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * (s.w * 0.36), -0.07, s.d * 0.08]} castShadow>
          <boxGeometry args={[0.1, 0.12, s.d * 0.55]} />
          <meshStandardMaterial color="#6b4328" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function CeilingDome() {
  return (
    <group position={[0.05, WALL.height - 0.02, 0.15]}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#fff1dc" emissive="#ffd7a4" emissiveIntensity={0.85} roughness={0.4} />
      </mesh>
      <pointLight position={[0, -0.18, 0]} color="#ffe2c2" intensity={2.1} distance={8.5} decay={2} />
    </group>
  );
}

function WallArt() {
  const maps = useTexture({
    pokemon: '/room/posters/pokemon.webp',
    giant: '/room/posters/iron-giant.jpg',
    babe: '/room/posters/babe.webp',
    mummy: '/room/posters/mummy.jpg',
  });
  useEffect(() => {
    Object.values(maps).forEach(tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
    });
  }, [maps]);
  const posters: {
    key: string;
    map: THREE.Texture;
    position: [number, number, number];
    rotation: [number, number, number];
    w: number;
    h: number;
  }[] = [
    {
      key: 'pokemon',
      map: maps.pokemon,
      position: [(LAYOUT.window.x + LAYOUT.window.sx / 2 + LAYOUT.dresser.x - LAYOUT.dresser.sx / 2) / 2, 1.7, NORTH_Z + 0.02],
      rotation: [0, 0, 0],
      w: 0.32,
      h: 0.46,
    },
    {
      key: 'mummy',
      map: maps.mummy,
      position: [WEST_X + 0.02, 1.72, LAYOUT.bed.z + 0.55],
      rotation: [0, Math.PI / 2, 0],
      w: 0.3,
      h: 0.44,
    },
    {
      key: 'giant',
      map: maps.giant,
      position: [WEST_X + 0.025, 1.88, LAYOUT.bed.z - 0.35],
      rotation: [0, Math.PI / 2, 0],
      w: 0.3,
      h: 0.44,
    },
    {
      key: 'babe',
      map: maps.babe,
      position: [EAST_X - 0.025, 1.82, 1.05],
      rotation: [0, -Math.PI / 2, 0],
      w: 0.32,
      h: 0.46,
    },
  ];
  return (
    <>
      {posters.map(p => (
        <group key={p.key} position={p.position} rotation={p.rotation}>
          <mesh position={[0, 0, -0.01]}>
            <boxGeometry args={[p.w + 0.04, p.h + 0.04, 0.018]} />
            <meshStandardMaterial color="#4a342c" roughness={0.72} />
          </mesh>
          <mesh position={[0, 0, 0.002]}>
            <planeGeometry args={[p.w, p.h]} />
            <meshStandardMaterial map={p.map} roughness={0.62} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/**
 * Invisible hit on a shelf row so aiming still opens the glass card.
 * The boxes themselves are the Tripo shelf mesh — nothing is drawn here.
 */
const SPINE_COLOR: Record<string, { color: string; accent: string }> = {
  monopoly: { color: '#c0282d', accent: '#f7e9c9' },
  battleship: { color: '#17365d', accent: '#8fd3ff' },
  pawnrush: { color: '#c4262c', accent: '#ffe08a' },
  clue: { color: '#13120f', accent: '#e8dcae' },
  life: { color: '#e4d6ad', accent: '#2f7bb5' },
  yahtzee: { color: '#b81f28', accent: '#f6ead0' },
  chess: { color: '#2b2622', accent: '#d8cfc2' },
  connect4: { color: '#1d4fa3', accent: '#ffd23f' },
  checkers: { color: '#8c1c1c', accent: '#f0d9a7' },
  poker: { color: '#1f5134', accent: '#ffd98a' },
  blackjack: { color: '#14402a', accent: '#9ff0b8' },
  gofish: { color: '#1b5f7a', accent: '#bdf0ff' },
  liarsdice: { color: '#6d4414', accent: '#f5d985' },
  trivia: { color: '#3d2a6e', accent: '#e6d4ff' },
  casino: { color: '#0e3b32', accent: '#d4ffe8' },
};

/** Painted shelf order, then whatever else is in the catalog. */
const SHELF_ORDER = [
  'monopoly',
  'battleship',
  'pawnrush',
  'clue',
  'life',
  'yahtzee',
  'chess',
  'connect4',
  'checkers',
  'poker',
  'blackjack',
  'gofish',
  'liarsdice',
  'trivia',
  'casino',
];

const spineTextures = new Map<string, THREE.CanvasTexture>();

function spineTexture(title: string, color: string, accent: string) {
  const key = `${title}:${color}`;
  const cached = spineTextures.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const blank = new THREE.CanvasTexture(canvas);
    spineTextures.set(key, blank);
    return blank;
  }
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = accent;
  ctx.fillRect(16, 10, 480, 8);
  ctx.fillRect(16, 110, 480, 8);
  ctx.fillStyle = accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = 54;
  ctx.font = `700 ${size}px sans-serif`;
  while (ctx.measureText(title).width > 470 && size > 22) {
    size -= 2;
    ctx.font = `700 ${size}px sans-serif`;
  }
  ctx.fillText(title, 256, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  spineTextures.set(key, tex);
  return tex;
}

function ShelfBox({
  slot,
  position,
  size,
  hovered,
  pulled,
}: {
  slot: ShelfSlot;
  position: [number, number, number];
  size: [number, number, number];
  hovered: boolean;
  pulled: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const target: HoverTarget = {
    id: `game:${slot.id}`,
    kind: 'game',
    gameId: slot.id,
    label: slot.title,
    hint: 'Inspect · pull to play',
  };
  const map = useMemo(() => spineTexture(slot.title, slot.color, slot.accent), [slot.title, slot.color, slot.accent]);
  useFrame((_, delta) => {
    if (!group.current) return;
    const want = pulled ? 0.08 : hovered ? 0.04 : 0;
    group.current.position.z += (position[2] + want - group.current.position.z) * Math.min(1, delta * 10);
  });
  return (
    <group ref={group} position={position} userData={{ interactable: target }}>
      <mesh castShadow={false} receiveShadow={false}>
        <boxGeometry args={size} />
        <meshStandardMaterial color={slot.color} roughness={0.7} metalness={0} />
      </mesh>
      <mesh position={[0, 0, size[2] / 2 + 0.004]}>
        <planeGeometry args={[size[0] * 0.9, size[1] * 0.9]} />
        <meshBasicMaterial map={map} />
      </mesh>
    </group>
  );
}

function GameShelf({
  hoveredId,
  pulledId,
  games,
}: {
  hoveredId: string | null;
  pulledId: string | null;
  games: GameMetadata[];
}) {
  const { shelf } = LAYOUT;
  const slots = useMemo(() => {
    const byId = new Map(games.map(game => [game.id, game]));
    const ordered = [
      ...SHELF_ORDER.filter(id => byId.has(id as GameMetadata['id'])).map(id => byId.get(id as GameMetadata['id'])!),
      ...games.filter(game => !SHELF_ORDER.includes(game.id)),
    ];
    return ordered.map(game => {
      const paint = SPINE_COLOR[game.id] ?? { color: '#5c3d2e', accent: '#f6ead0' };
      return {
        id: game.id,
        spine: null,
        title: game.title,
        row: 0,
        boxHeight: 0.16,
        color: paint.color,
        accent: paint.accent,
      } satisfies ShelfSlot;
    });
  }, [games]);
  const columns = 2;
  const rows = Math.max(1, Math.ceil(slots.length / columns));
  const colW = (shelf.sx * 0.9) / columns;
  const rowH = (shelf.sy * 0.88) / rows;
  const faceZ = shelf.sz * 0.5 + 0.06;
  return (
    <group position={[shelf.x, 0, shelf.z]}>
      <SafeRoomModel id="shelf" position={[0, 0, 0]} axis="y" meters={shelf.meters} tintAmount={0} />
      {slots.map((slot, index) => {
        const column = Math.floor(index / rows);
        const row = index % rows;
        const width = Math.max(0.12, colW * 0.86);
        const height = Math.max(0.1, rowH * 0.78);
        return (
          <ShelfBox
            key={slot.id}
            slot={slot}
            position={[
              -shelf.sx * 0.45 + colW * (column + 0.5),
              shelf.sy * 0.94 - rowH * (row + 0.5),
              faceZ,
            ]}
            size={[width, height, 0.08]}
            hovered={hoveredId === `game:${slot.id}`}
            pulled={pulledId === slot.id}
          />
        );
      })}
      <pointLight position={[0, shelf.sy * 0.92, 0.55]} color="#ffdf6e" intensity={1.6} distance={3.2} decay={2} />
    </group>
  );
}

function PlacedModel({
  id,
  hoveredId,
  interactable,
}: {
  id: keyof typeof LAYOUT;
  hoveredId: string | null;
  interactable?: HoverTarget;
}) {
  const p = LAYOUT[id];
  return (
    <SafeRoomModel
      id={id}
      position={[p.x, p.y, p.z]}
      rotation={[0, p.rotY, 0]}
      axis={p.axis}
      meters={p.meters}
      tintAmount={0}
      interactable={interactable}
      hovered={hoveredId === interactable?.id}
    />
  );
}

export interface LiveProp {
  placement: SavedPlacement;
  url: string;
}

export interface RealRoomSceneProps {
  hoveredId: string | null;
  pulledGameId: string | null;
  tapeOn: boolean;
  lampsWarm: boolean;
  mood?: RoomMood;
  placed?: LiveProp[];
  /** While the studio is placing, show snap pads and a ghost. */
  showAnchors?: boolean;
  ghost?: { url: string; anchor: Anchor; height: number; lift: number; shadow: boolean } | null;
  onPickAnchor?: (anchor: Anchor) => void;
  games: GameMetadata[];
}

/**
 * Bedroom built only from the Tripo GLBs. Walls and lights are the room;
 * nothing else is invented geometry.
 */
export function RealRoomScene({
  hoveredId,
  pulledGameId,
  tapeOn,
  mood = 'warm-night',
  placed = [],
  showAnchors = false,
  ghost = null,
  onPickAnchor,
  games,
}: RealRoomSceneProps) {
  const lights = MOODS[mood];
  return (
    <group>
      <MoodFog color={lights.fog} />
      <ambientLight intensity={lights.ambient} color={lights.ambColor} />
      <hemisphereLight args={[lights.hemiSky, lights.hemiGround, lights.hemi]} />
      <Shell />
      <NightCity />
      <WindowGlare />
      <Suspense fallback={null}>
        <WallArt />
      </Suspense>
      <MountedShelf shelf={WALL_SHELF} />
      <pointLight
        position={[LAYOUT.teddy.x + 0.2, LAYOUT.teddy.y + 0.35, LAYOUT.teddy.z - 1.35]}
        color="#ffd0a8"
        intensity={2.3}
        distance={6.8}
        decay={2}
      />
      <pointLight
        position={[LAYOUT.army.x, 0.9, LAYOUT.army.z - 0.7]}
        color="#ffc090"
        intensity={0.7}
        distance={3.4}
        decay={2}
      />
      <CeilingDome />

      <PlacedModel id="window" hoveredId={hoveredId} />
      <pointLight
        position={[LAYOUT.window.x, LAYOUT.window.y + 0.35, LAYOUT.window.z + 0.7]}
        color={lights.windowC}
        intensity={lights.windowI}
        distance={3.6}
        decay={2}
      />
      {/* Same window mesh, cloned under the south wall shelf. */}
      <SafeRoomModel
        id="window"
        position={[SOUTH_WINDOW.x, SOUTH_WINDOW.y, SOUTH_WINDOW.z]}
        rotation={[0, SOUTH_WINDOW.rotY, 0]}
        axis={SOUTH_WINDOW.axis}
        meters={SOUTH_WINDOW.meters}
        tintAmount={0}
      />
      <mesh
        position={[SOUTH_WINDOW.x, SOUTH_WINDOW.y + SOUTH_WINDOW.sy * 0.48, SOUTH_Z - 0.04]}
        rotation={[0, Math.PI, 0]}
      >
        <planeGeometry args={[SOUTH_WINDOW.sx * 0.7, SOUTH_WINDOW.sy * 0.58]} />
        <meshBasicMaterial color="#1a2744" />
      </mesh>
      <pointLight
        position={[SOUTH_WINDOW.x, SOUTH_WINDOW.y + SOUTH_WINDOW.sy * 0.4, SOUTH_WINDOW.z - 0.55]}
        color="#9eb6d8"
        intensity={0.55}
        distance={2.4}
        decay={2}
      />

      <PlacedModel
        id="bed"
        hoveredId={hoveredId}
        interactable={{ id: 'bed', kind: 'prop', label: 'Bed', hint: 'Open memory card' }}
      />
      <PlacedModel
        id="backpack"
        hoveredId={hoveredId}
        interactable={{ id: 'backpack', kind: 'prop', label: 'Backpack', hint: 'Open memory card' }}
      />
      <PlacedModel
        id="teddy"
        hoveredId={hoveredId}
        interactable={{ id: 'teddy', kind: 'prop', label: 'Teddy bear', hint: 'Open memory card' }}
      />
      <PlacedModel id="nightstand" hoveredId={hoveredId} />
      <PlacedModel
        id="gushers"
        hoveredId={hoveredId}
        interactable={{ id: 'gushers', kind: 'prop', label: 'Fruit snacks', hint: 'Open memory card' }}
      />
      <PlacedModel
        id="cards"
        hoveredId={hoveredId}
        interactable={{ id: 'cards', kind: 'prop', label: 'Trading cards', hint: 'Open memory card' }}
      />
      <PlacedModel
        id="gameboy"
        hoveredId={hoveredId}
        interactable={{ id: 'gameboy', kind: 'prop', label: 'Game Boy', hint: 'Open memory card' }}
      />

      <PlacedModel id="dresser" hoveredId={hoveredId} />
      <PlacedModel
        id="crt"
        hoveredId={hoveredId}
        interactable={{ id: 'crt-tv', kind: 'prop', label: 'CRT television', hint: 'Lean in' }}
      />
      <PlacedModel
        id="door"
        hoveredId={hoveredId}
        interactable={{ id: 'door', kind: 'prop', label: 'Bedroom door', hint: 'Open memory card' }}
      />
      <PlacedModel id="toyshelf" hoveredId={hoveredId} />
      <PlacedModel
        id="nes"
        hoveredId={hoveredId}
        interactable={{ id: 'nes', kind: 'prop', label: 'NES', hint: 'Lean in' }}
      />
      <PlacedModel
        id="armor"
        hoveredId={hoveredId}
        interactable={{ id: 'armor', kind: 'prop', label: 'Mini figure', hint: 'Open memory card' }}
      />
      <PlacedModel
        id="rubik"
        hoveredId={hoveredId}
        interactable={{ id: 'rubik', kind: 'prop', label: "Rubik's cube", hint: 'Open memory card' }}
      />
      <pointLight
        position={[LAYOUT.dresser.x, LAYOUT.dresser.sy + 0.35, LAYOUT.dresser.z + 0.55]}
        color="#7ec8ff"
        intensity={0.45}
        distance={1.6}
        decay={2}
      />

      <GameShelf hoveredId={hoveredId} pulledId={pulledGameId} games={games} />
      <BulbFlicker position={[LAYOUT.shelf.x + 0.55, 1.85, LAYOUT.shelf.z + 0.28]} color="#ffd27a" base={0.42} seed={1.2} />
      <BulbFlicker position={[LAYOUT.shelf.x + 0.58, 1.35, LAYOUT.shelf.z + 0.3]} color="#ffb45a" base={0.34} seed={2.4} />
      <BulbFlicker position={[LAYOUT.shelf.x + 0.52, 0.85, LAYOUT.shelf.z + 0.26]} color="#ffe08a" base={0.3} seed={3.1} />
      <BulbFlicker position={[LAYOUT.shelf.x - 0.5, 1.7, LAYOUT.shelf.z + 0.24]} color="#ffcc77" base={0.28} seed={4.2} />

      <PlacedModel id="desk" hoveredId={hoveredId} />
      <PlacedModel
        id="clue"
        hoveredId={hoveredId}
        interactable={{ id: 'box-clue', kind: 'game', gameId: 'clue', label: 'Clue', hint: 'Inspect · play' }}
      />
      <PlacedModel
        id="army"
        hoveredId={hoveredId}
        interactable={{ id: 'army', kind: 'prop', label: 'Army men', hint: 'Open memory card' }}
      />
      <PlacedModel id="clutterdesk" hoveredId={hoveredId} />
      <PlacedModel id="books" hoveredId={hoveredId} />
      <PlacedModel
        id="board"
        hoveredId={hoveredId}
        interactable={{ id: 'box-monopoly', kind: 'game', gameId: 'monopoly', label: 'Monopoly', hint: 'Inspect · play' }}
      />
      <PlacedModel
        id="battleship"
        hoveredId={hoveredId}
        interactable={{
          id: 'box-battleship',
          kind: 'game',
          gameId: 'battleship',
          label: 'Battleship',
          hint: 'Inspect · play',
        }}
      />
      <PlacedModel
        id="life"
        hoveredId={hoveredId}
        interactable={{ id: 'box-life', kind: 'game', gameId: 'life', label: 'The Game of Life', hint: 'Inspect · play' }}
      />
      <PlacedModel
        id="yahtzee"
        hoveredId={hoveredId}
        interactable={{ id: 'box-yahtzee', kind: 'game', gameId: 'yahtzee', label: 'Yahtzee', hint: 'Inspect · play' }}
      />
      <PlacedModel
        id="hotpockets"
        hoveredId={hoveredId}
        interactable={{ id: 'hotpockets', kind: 'prop', label: 'Hot pockets', hint: 'Open memory card' }}
      />
      <PlacedModel
        id="jordans"
        hoveredId={hoveredId}
        interactable={{ id: 'jordans', kind: 'prop', label: 'High-tops', hint: 'Open memory card' }}
      />
      <PlacedModel
        id="car"
        hoveredId={hoveredId}
        interactable={{ id: 'car', kind: 'prop', label: 'Toy car', hint: 'Open memory card' }}
      />

      <PlacedModel
        id="boombox"
        hoveredId={hoveredId}
        interactable={{
          id: 'boombox',
          kind: 'prop',
          label: 'Boombox',
          hint: tapeOn ? 'Radio on · lean in' : 'Lean in',
        }}
      />
      {tapeOn && (
        <pointLight
          position={[LAYOUT.boombox.x, 0.25, LAYOUT.boombox.z]}
          color="#ff7ad8"
          intensity={1.1}
          distance={1.3}
          decay={2}
        />
      )}
      <PlacedModel
        id="vhs_stack"
        hoveredId={hoveredId}
        interactable={{ id: 'vhs-stack', kind: 'prop', label: 'VHS stack', hint: 'Open memory card' }}
      />
      <PlacedModel id="vhs_loose" hoveredId={hoveredId} />

      <mesh position={[0.15, 0.004, -0.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.28, 48]} />
        <meshStandardMaterial map={rugTexture()} transparent roughness={1} />
      </mesh>

      <pointLight position={[0.1, WALL.height - 0.45, 0.2]} color={lights.ceil} intensity={lights.ceilI * 0.45} distance={8} decay={2} />
      <pointLight position={[-1.6, 1.9, -0.2]} color="#e7b08a" intensity={mood === 'afternoon' ? 0.35 : 0.5} distance={4} decay={2} />

      {placed.map(item => (
        <Suspense key={item.placement.id} fallback={null}>
          <DynamicModel
            url={item.url}
            position={[
              item.placement.position[0],
              item.placement.position[1] + item.placement.lift,
              item.placement.position[2],
            ]}
            rotY={item.placement.rotY}
            height={item.placement.height}
            shadow={false}
          />
        </Suspense>
      ))}

      {showAnchors &&
        ANCHORS.map(anchor => (
          <mesh
            key={anchor.id}
            position={anchor.position}
            rotation={anchor.kind === 'wall' ? [0, anchor.rotY, 0] : [-Math.PI / 2, 0, 0]}
            onClick={event => {
              event.stopPropagation();
              onPickAnchor?.(anchor);
            }}
          >
            <circleGeometry args={[anchor.kind === 'floor' ? 0.16 : 0.1, 20]} />
            <meshBasicMaterial color="#ffd59a" transparent opacity={0.85} depthWrite={false} />
          </mesh>
        ))}

      {ghost && (
        <Suspense fallback={null}>
          <DynamicModel
            url={ghost.url}
            position={[ghost.anchor.position[0], ghost.anchor.position[1] + ghost.lift, ghost.anchor.position[2]]}
            rotY={ghost.anchor.rotY}
            height={ghost.height}
            shadow={false}
          />
        </Suspense>
      )}
    </group>
  );
}

export { ROOM_PROPS };
