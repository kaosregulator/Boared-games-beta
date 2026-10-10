import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  EAST_X,
  NORTH_Z,
  PALETTE,
  ROOM_PROPS,
  SHELF_SLOTS,
  SHELF_SLOTS_LOWER,
  SOUTH_Z,
  WALL,
  WEST_X,
  type ShelfSlot,
} from './videoRoom';
import { ceilingTexture, floorTexture, nightSkyTexture, rugTexture, wallTexture } from './procTextures';
import type { HoverTarget } from './Interactable';
import { RoomModel } from './RoomModel';
import { LAYOUT, SHELF_ROW_Y } from './roomLayout';
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
      {/* Baseboards — they meet the floor, they don't float */}
      {[
        [0, 0.04, NORTH_Z + 0.02, WALL.halfWidth * 2, 0.08, 0.04],
        [0, 0.04, SOUTH_Z - 0.02, WALL.halfWidth * 2, 0.08, 0.04],
      ].map((b, i) => (
        <mesh key={i} position={[b[0], b[1], b[2]]}>
          <boxGeometry args={[b[3], b[4], b[5]]} />
          <Solid color={PALETTE.trim} />
        </mesh>
      ))}
    </group>
  );
}

function NightBehindWindow() {
  const sky = nightSkyTexture();
  const w = LAYOUT.window;
  return (
    <mesh position={[w.x, w.y + w.sy * 0.48, NORTH_Z - 0.04]}>
      <planeGeometry args={[w.sx * 0.82, w.sy * 0.78]} />
      <meshBasicMaterial map={sky} />
    </mesh>
  );
}

/**
 * Invisible hit on a shelf row so aiming still opens the glass card.
 * The boxes themselves are the Tripo shelf mesh — nothing is drawn here.
 */
function ShelfHit({ slot, y, hovered, pulled }: { slot: ShelfSlot; y: number; hovered: boolean; pulled: boolean }) {
  const group = useRef<THREE.Group>(null);
  const target: HoverTarget = {
    id: `game:${slot.id}`,
    kind: 'game',
    gameId: slot.id,
    label: slot.title,
    hint: 'Inspect · pull to play',
  };
  useFrame((_, delta) => {
    if (!group.current) return;
    const want = pulled ? 0.06 : hovered ? 0.03 : 0;
    group.current.position.z += (want - group.current.position.z) * Math.min(1, delta * 10);
  });
  const { shelf } = LAYOUT;
  return (
    <group ref={group} position={[0, y, shelf.sz * 0.35]} userData={{ interactable: target }}>
      <mesh>
        <boxGeometry args={[shelf.sx * 0.72, 0.16, shelf.sz * 0.55]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {(hovered || pulled) && (
        <mesh position={[0, 0, shelf.sz * 0.2]}>
          <planeGeometry args={[shelf.sx * 0.7, 0.16]} />
          <meshBasicMaterial color={slot.accent} transparent opacity={0.28} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function GameShelf({ hoveredId, pulledId }: { hoveredId: string | null; pulledId: string | null }) {
  const { shelf } = LAYOUT;
  const rows = [...SHELF_SLOTS, ...SHELF_SLOTS_LOWER];
  return (
    <group position={[shelf.x, 0, shelf.z]}>
      <RoomModel id="shelf" position={[0, 0, 0]} axis="y" meters={shelf.meters} tintAmount={0} />
      {rows.map(slot => (
        <ShelfHit
          key={slot.id}
          slot={slot}
          y={SHELF_ROW_Y[slot.row] ?? 0.4}
          hovered={hoveredId === `game:${slot.id}`}
          pulled={pulledId === slot.id}
        />
      ))}
      <pointLight position={[0, shelf.sy * 0.92, 0.35]} color="#ffdf6e" intensity={1.1} distance={2.4} decay={2} />
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
  const modelId = id as
    | 'bed'
    | 'shelf'
    | 'crt'
    | 'dresser'
    | 'desk'
    | 'nightstand'
    | 'boombox'
    | 'window'
    | 'gameboy'
    | 'vhs_stack'
    | 'vhs_loose'
    | 'toyshelf'
    | 'cards';
  return (
    <RoomModel
      id={modelId}
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
}: RealRoomSceneProps) {
  const lights = MOODS[mood];
  return (
    <group>
      <MoodFog color={lights.fog} />
      <ambientLight intensity={lights.ambient} color={lights.ambColor} />
      <hemisphereLight args={[lights.hemiSky, lights.hemiGround, lights.hemi]} />
      <Shell />
      <NightBehindWindow />

      <PlacedModel
        id="window"
        hoveredId={hoveredId}
      />
      <pointLight
        position={[LAYOUT.window.x, LAYOUT.window.y + 0.4, LAYOUT.window.z + 0.6]}
        color={lights.windowC}
        intensity={lights.windowI}
        distance={3.2}
        decay={2}
      />

      <PlacedModel
        id="bed"
        hoveredId={hoveredId}
        interactable={{ id: 'bed', kind: 'prop', label: 'Bed', hint: 'Open memory card' }}
      />
      <PlacedModel id="nightstand" hoveredId={hoveredId} />
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
        interactable={{ id: 'crt-tv', kind: 'prop', label: 'CRT television', hint: 'Open memory · flat list' }}
      />
      <PlacedModel id="toyshelf" hoveredId={hoveredId} />
      <pointLight
        position={[LAYOUT.dresser.x, LAYOUT.dresser.sy + 0.35, LAYOUT.dresser.z + 0.55]}
        color="#7ec8ff"
        intensity={0.45}
        distance={1.6}
        decay={2}
      />

      <GameShelf hoveredId={hoveredId} pulledId={pulledGameId} />

      <PlacedModel id="desk" hoveredId={hoveredId} />

      <PlacedModel
        id="boombox"
        hoveredId={hoveredId}
        interactable={{
          id: 'boombox',
          kind: 'prop',
          label: 'Boombox',
          hint: tapeOn ? 'Stop tape · card' : 'Play tape · card',
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

      <mesh position={[0.15, 0.004, -0.35]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.05, 48]} />
        <meshStandardMaterial map={rugTexture()} transparent roughness={1} />
      </mesh>

      {/* One ceiling light. No loose props. */}
      <pointLight position={[0.1, 2.35, 0.2]} color={lights.ceil} intensity={lights.ceilI} distance={7} decay={2} />
      <pointLight position={[-1.4, 1.8, -0.4]} color="#e7b08a" intensity={mood === 'afternoon' ? 0.35 : 0.55} distance={3.5} decay={2} />

      {placed.map(item => (
        <DynamicModel
          key={item.placement.id}
          url={item.url}
          position={[
            item.placement.position[0],
            item.placement.position[1] + item.placement.lift,
            item.placement.position[2],
          ]}
          rotY={item.placement.rotY}
          height={item.placement.height}
          shadow={item.placement.shadow}
        />
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
        <DynamicModel
          url={ghost.url}
          position={[ghost.anchor.position[0], ghost.anchor.position[1] + ghost.lift, ghost.anchor.position[2]]}
          rotY={ghost.anchor.rotY}
          height={ghost.height}
          shadow={ghost.shadow}
        />
      )}
    </group>
  );
}

export { ROOM_PROPS };
