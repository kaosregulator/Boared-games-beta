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
import { HOTSPOTS } from './hotspots';
import { propCardFor } from './propCards';
import { Tamagotchi } from './Tamagotchi';
import { LAVA, LavaLamp } from './LavaLamp';
import { LOW_POWER } from './input';
import type { GameMetadata } from '../types';
import { LAYOUT, SOUTH_WINDOW, TABLE_SIDE_BOX, WALL_SHELF } from './roomLayout';
import { PlayTable, type TableSession } from './table/TablePlay';
import { NeonGameWall } from './NeonGameWall';
import { WallPosters } from './WallPosters';
import { ANCHORS, type Anchor } from './anchors';
import { DynamicModel } from './UserProps';
import { MOODS, type RoomMood } from './moods';
import type { SavedPlacement } from './userPlacements';
import { RoomTvGlass } from '../tv/TvSet';
import { LightSwitch, TvGlow } from './LightSwitch';
import { BedFurby, FURBY_CARD } from './furby/BedFurby';

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

/**
 * The desk lamps are lit: a warm bulb under the shade throwing a pool of
 * light on the desk top.
 */
function DeskLampGlow({ at }: { at: [number, number, number] }) {
  return (
    <group position={at}>
      <pointLight position={[0, -0.06, 0]} color="#ffd59a" intensity={0.9} distance={1.7} decay={2} />
    </group>
  );
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

function CeilingDome({ level = 1 }: { level?: number }) {
  return (
    <group position={[0.05, WALL.height - 0.02, 0.15]}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#fff1dc" emissive="#ffd7a4" emissiveIntensity={0.85 * level} roughness={0.4} />
      </mesh>
      <pointLight position={[0, -0.18, 0]} color="#ffe2c2" intensity={2.1 * level} distance={8.5} decay={2} />
    </group>
  );
}

function WallArt() {
  // Each poster has its own memory card (poster-pokemon, poster-mummy...).
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
          <mesh
            position={[0, 0, 0.01]}
            userData={{ interactable: cardTarget(`poster-${p.key}`), volume: p.w * p.h * 0.03 }}
          >
            <boxGeometry args={[p.w + 0.04, p.h + 0.04, 0.03]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
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

/** The original bookcase stays empty so the string lights around it stay visible. */
function GameShelf({ hoveredId }: { hoveredId: string | null }) {
  const { shelf } = LAYOUT;
  return (
    <group position={[shelf.x, 0, shelf.z]}>
      <SafeRoomModel
        id="shelf"
        position={[0, 0, 0]}
        axis="y"
        meters={shelf.meters}
        tintAmount={0}
        interactable={cardTarget('shelf')}
        hovered={hoveredId === 'shelf'}
        hotspots={HOTSPOTS.shelf}
        activeId={hoveredId}
      />
      <pointLight position={[0, shelf.sy * 0.92, 0.55]} color="#ffdf6e" intensity={1.6} distance={3.2} decay={2} />
    </group>
  );
}

/** Bed-local: the bed is turned a quarter, so local +z faces into the room. */
const BED_FURBY = { position: [-0.33, 0.56, -0.36] as [number, number, number], rotation: [0, -0.35, 0] as [number, number, number] };

/** Each game's real box model; it only comes out while that game is on the table. */
const GAME_BOX_MODEL: Partial<Record<string, keyof typeof LAYOUT>> = {
  monopoly: 'board',
  battleship: 'battleship',
  clue: 'clue',
  life: 'life',
  yahtzee: 'yahtzee',
};

/** Prefix for the box beside the table: its card opens, but it can't start a game. */
export const TABLE_BOX_PREFIX = 'tablebox:';

/**
 * The box of the game being played stands on the floor by the table and
 * goes away when the game is packed up. Its card shows the box's info, with
 * no Play button: the game is already out.
 */
function TableSideBox({ session, hoveredId }: { session: TableSession | null; hoveredId: string | null }) {
  if (!session || session.phase === 'pack') return null;
  const model = GAME_BOX_MODEL[session.game.id];
  if (!model) return null;
  return (
    <PlacedModel
      key={session.key}
      id={model}
      hoveredId={hoveredId}
      at={TABLE_SIDE_BOX}
      interactable={{
        id: `${TABLE_BOX_PREFIX}${session.game.id}`,
        kind: 'game',
        gameId: session.game.id,
        label: session.game.title,
        hint: 'Inspect · already playing',
      }}
    />
  );
}

/** A whole prop's own memory card, if it has one. */
function cardTarget(cardId: string, hint = 'Memory card'): HoverTarget | undefined {
  const card = propCardFor(cardId);
  return card ? { id: cardId, kind: 'prop', label: card.title, hint: card.action?.label ?? hint } : undefined;
}

function PlacedModel({
  id,
  hoveredId,
  interactable,
  card,
  at,
  children,
}: {
  id: keyof typeof LAYOUT;
  hoveredId: string | null;
  interactable?: HoverTarget;
  /** Card id for the whole prop. */
  card?: string;
  /** Stand it somewhere other than its spot in the layout (on the floor). */
  at?: { x: number; z: number; rotY: number };
  children?: React.ReactNode;
}) {
  const p = at ? { ...LAYOUT[id], ...at, y: 0 } : LAYOUT[id];
  const lava = id in LAVA ? [LAVA[id as keyof typeof LAVA]] : undefined;
  const target = interactable ?? (card ? cardTarget(card) : undefined);
  return (
    <SafeRoomModel
      id={id}
      position={[p.x, p.y, p.z]}
      rotation={[0, p.rotY, 0]}
      axis={p.axis}
      meters={p.meters}
      tintAmount={0}
      interactable={target}
      hovered={hoveredId !== null && hoveredId === target?.id}
      hotspots={HOTSPOTS[id]}
      activeId={hoveredId}
      lava={lava}
    >
      {children}
    </SafeRoomModel>
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
  session?: TableSession | null;
  onUnfolded?: () => void;
  onPacked?: () => void;
  onLeaveTable?: () => void;
  /** The Game Boy is in the player's hands while sitting in the bean bag. */
  hideGameboy?: boolean;
  /** The TV was left on: its picture plays on the room's CRT. */
  tvInRoom?: boolean;
  /** Wall switch off: only the TV, the lava lamps and the shelf's string lights glow. */
  lightsOut?: boolean;
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
  session = null,
  onUnfolded,
  onPacked,
  onLeaveTable,
  hideGameboy = false,
  tvInRoom = false,
  lightsOut = false,
}: RealRoomSceneProps) {
  const lights = MOODS[mood];
  /** Room lights (ceiling, lamps, fill) scaled by the wall switch. */
  const on = lightsOut ? 0 : 1;
  return (
    <group>
      <MoodFog color={lights.fog} />
      {/* lights out: just enough to make out shapes once your eyes adjust */}
      <ambientLight intensity={lightsOut ? 0.03 : lights.ambient} color={lights.ambColor} />
      <hemisphereLight args={[lights.hemiSky, lights.hemiGround, lightsOut ? 0.05 : lights.hemi]} />
      <Shell />
      <WindowGlare />
      <Suspense fallback={null}>
        <WallArt />
      </Suspense>
      <MountedShelf shelf={WALL_SHELF} />
      <pointLight
        position={[LAYOUT.teddy.x + 0.2, LAYOUT.teddy.y + 0.35, LAYOUT.teddy.z - 1.35]}
        color="#ffd0a8"
        intensity={2.3 * on}
        distance={6.8}
        decay={2}
      />
      <pointLight
        position={[LAYOUT.army.x, 0.9, LAYOUT.army.z - 0.7]}
        color="#ffc090"
        intensity={0.7 * on}
        distance={3.4}
        decay={2}
      />
      <CeilingDome level={Math.min(1, lights.ceilI / 2.4) * on} />

      <PlacedModel id="window" hoveredId={hoveredId} card="window" />
      <pointLight
        position={[LAYOUT.window.x, LAYOUT.window.y + 0.35, LAYOUT.window.z + 0.7]}
        color={lights.windowC}
        intensity={lights.windowI * (lightsOut ? 0.2 : 1)}
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
        interactable={cardTarget('window-south')}
        hovered={hoveredId === 'window-south'}
      />
      <pointLight
        position={[SOUTH_WINDOW.x, SOUTH_WINDOW.y + 0.35, SOUTH_WINDOW.z - 0.7]}
        color={lights.windowC}
        intensity={lights.windowI * 0.8 * (lightsOut ? 0.2 : 1)}
        distance={3.6}
        decay={2}
      />

<PlacedModel id="bed" hoveredId={hoveredId} card="bed">
        {/* Left on the quilt by the foot of the bed, screen up. */}
        <Tamagotchi position={[-0.25, 0.538, 0.3]} rotation={[-Math.PI / 2 + 0.1, 0, 0.55]} active={hoveredId === 'tamagotchi'} />
        {/* Sat up by the pillow, looking out at the room. */}
        <BedFurby position={BED_FURBY.position} rotation={BED_FURBY.rotation} hovered={hoveredId === FURBY_CARD} dark={lightsOut} />
      </PlacedModel>
      <PlacedModel
        id="backpack"
        hoveredId={hoveredId}
        card="backpack"
      />
      <PlacedModel id="teddy" hoveredId={hoveredId} card="south-shelf">
        <LavaLamp spec={LAVA.teddy} light={!LOW_POWER} />
      </PlacedModel>
      <PlacedModel id="nightstand" hoveredId={hoveredId} card="nightstand">
        <LavaLamp spec={LAVA.nightstand} light={!LOW_POWER} />
      </PlacedModel>
      <PlacedModel
        id="gushers"
        hoveredId={hoveredId}
        card="gushers"
      />
      <PlacedModel
        id="cards"
        hoveredId={hoveredId}
        card="cards"
      />
      {!hideGameboy && (
        <PlacedModel
          id="gameboy"
          hoveredId={hoveredId}
          card="gameboy"
        />
      )}

      <PlacedModel id="dresser" hoveredId={hoveredId} card="dresser" />
      <PlacedModel id="crt" hoveredId={hoveredId} card="crt-tv">
        {tvInRoom && <RoomTvGlass />}
      </PlacedModel>
      <PlacedModel
        id="door"
        hoveredId={hoveredId}
        card="door"
      />
      <PlacedModel id="toyshelf" hoveredId={hoveredId} card="toyshelf">
        <LavaLamp spec={LAVA.toyshelf} light={!LOW_POWER} />
      </PlacedModel>
      <PlacedModel
        id="nes"
        hoveredId={hoveredId}
        card="nes"
      />
      <PlacedModel
        id="armor"
        hoveredId={hoveredId}
        card="armor"
      />
      <PlacedModel
        id="rubik"
        hoveredId={hoveredId}
        card="rubik"
      />
      <pointLight
        position={[LAYOUT.dresser.x, LAYOUT.dresser.sy + 0.35, LAYOUT.dresser.z + 0.55]}
        color="#7ec8ff"
        intensity={0.45 * on}
        distance={1.6}
        decay={2}
      />
      {lightsOut && tvInRoom && <TvGlow position={[LAYOUT.crt.x, LAYOUT.crt.y + 0.3, LAYOUT.crt.z + 0.7]} />}
      <LightSwitch
        position={[LAYOUT.door.x - LAYOUT.door.sx / 2 - 0.14, 1.22, NORTH_Z + 0.012]}
        on={!lightsOut}
        hovered={hoveredId === 'light-switch'}
      />

      <GameShelf hoveredId={hoveredId} />
      <NeonGameWall games={games} hoveredId={hoveredId} pulledId={pulledGameId} />
      <WallPosters />
      <PlacedModel id="beanbag" hoveredId={hoveredId} card="beanbag" />
      <TableSideBox session={session} hoveredId={hoveredId} />
      <PlayTable
        session={session}
        onUnfolded={onUnfolded ?? (() => {})}
        onPacked={onPacked ?? (() => {})}
        onLeave={onLeaveTable ?? (() => {})}
      />
      <BulbFlicker position={[LAYOUT.shelf.x + 0.55, 1.85, LAYOUT.shelf.z + 0.28]} color="#ffd27a" base={0.42} seed={1.2} />
      <BulbFlicker position={[LAYOUT.shelf.x + 0.58, 1.35, LAYOUT.shelf.z + 0.3]} color="#ffb45a" base={0.34} seed={2.4} />
      {!LOW_POWER && (
        <>
          <BulbFlicker position={[LAYOUT.shelf.x + 0.52, 0.85, LAYOUT.shelf.z + 0.26]} color="#ffe08a" base={0.3} seed={3.1} />
          <BulbFlicker position={[LAYOUT.shelf.x - 0.5, 1.7, LAYOUT.shelf.z + 0.24]} color="#ffcc77" base={0.28} seed={4.2} />
        </>
      )}

      <PlacedModel id="desk" hoveredId={hoveredId} card="desk">
        {!lightsOut && <DeskLampGlow at={[0.43, 0.86, -0.13]} />}
      </PlacedModel>
      <PlacedModel
        id="army"
        hoveredId={hoveredId}
        card="army"
      />
      <PlacedModel id="clutterdesk" hoveredId={hoveredId} card="clutterdesk">
        <LavaLamp spec={LAVA.clutterdesk} />
        {!lightsOut && <DeskLampGlow at={[0.09, 0.93, -0.22]} />}
      </PlacedModel>
      <PlacedModel id="books" hoveredId={hoveredId} card="books" />
      <PlacedModel
        id="hotpockets"
        hoveredId={hoveredId}
        card="hotpockets"
      />
      <PlacedModel
        id="jordans"
        hoveredId={hoveredId}
        card="jordans"
      />
      <PlacedModel
        id="car"
        hoveredId={hoveredId}
        card="car"
      />
      <PlacedModel id="hotwheels" hoveredId={hoveredId} card="hotwheels" />

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
        card="vhs-stack"
      />
      <PlacedModel id="vhs_loose" hoveredId={hoveredId} card="vhs-loose" />

      <mesh position={[0.15, 0.004, -0.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.28, 48]} />
        <meshStandardMaterial map={rugTexture()} transparent roughness={1} />
      </mesh>

      <pointLight position={[0.1, WALL.height - 0.45, 0.2]} color={lights.ceil} intensity={lights.ceilI * 0.45 * on} distance={8} decay={2} />
      <pointLight position={[-1.6, 1.9, -0.2]} color="#e7b08a" intensity={(mood === 'afternoon' ? 0.35 : 0.5) * on} distance={4} decay={2} />

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
