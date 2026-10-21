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
import { PlayTable, type TableGameId } from './table/TablePlay';
import { NeonGameWall } from './NeonGameWall';
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

/** The original bookcase stays empty so the string lights around it stay visible. */
function GameShelf() {
  const { shelf } = LAYOUT;
  return (
    <group position={[shelf.x, 0, shelf.z]}>
      <SafeRoomModel id="shelf" position={[0, 0, 0]} axis="y" meters={shelf.meters} tintAmount={0} />
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
  tableGame?: TableGameId | null;
  onLeaveTable?: () => void;
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
  tableGame = null,
  onLeaveTable,
}: RealRoomSceneProps) {
  const lights = MOODS[mood];
  return (
    <group>
      <MoodFog color={lights.fog} />
      <ambientLight intensity={lights.ambient} color={lights.ambColor} />
      <hemisphereLight args={[lights.hemiSky, lights.hemiGround, lights.hemi]} />
      <Shell />
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
      <pointLight
        position={[SOUTH_WINDOW.x, SOUTH_WINDOW.y + 0.35, SOUTH_WINDOW.z - 0.7]}
        color={lights.windowC}
        intensity={lights.windowI * 0.8}
        distance={3.6}
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
        interactable={{ id: 'gameboy', kind: 'prop', label: 'Game Boy', hint: 'Sit down & play' }}
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

      <GameShelf />
      <NeonGameWall games={games} hoveredId={hoveredId} pulledId={pulledGameId} />
      <PlacedModel id="beanbag" hoveredId={hoveredId} />
      <PlayTable game={tableGame} onLeave={onLeaveTable ?? (() => {})} />
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
