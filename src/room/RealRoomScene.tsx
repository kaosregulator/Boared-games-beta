import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  BED,
  BOOMBOX,
  CORNER_DESK,
  CRT,
  DESK_SLOTS,
  DOOR,
  DRESSER,
  EAST_DESK,
  EAST_X,
  FAN,
  NIGHTSTAND,
  NORTH_Z,
  PALETTE,
  PLAY_TABLE,
  ROOM_PROPS,
  RUG,
  SATURN,
  SHELF,
  SHELF_SLOTS,
  SHELF_SLOTS_LOWER,
  SOUTH_Z,
  WALL,
  WEST_X,
  type ShelfSlot,
} from './videoRoom';
import {
  ceilingTexture,
  floorTexture,
  rugTexture,
  wallTexture,
  woodTexture,
} from './procTextures';
import { BOX_FACE, lidTexture, spineStripTexture } from './realBoardArt';
import type { HoverTarget } from './Interactable';
import { RoomModel } from './RoomModel';

function Solid({ color, rough = 0.85 }: { color: string; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={0.05} />;
}

function painted(map: THREE.Texture, emissive = 0.5) {
  return (
    <meshStandardMaterial
      map={map}
      emissive="#ffffff"
      emissiveMap={map}
      emissiveIntensity={emissive}
      roughness={0.85}
      metalness={0.04}
    />
  );
}

function boxSkin(slot: ShelfSlot) {
  const face = BOX_FACE[slot.id];
  return { face: face?.face ?? slot.color, ink: face?.ink ?? '#ffffff' };
}

/* --------------------------------- shell ---------------------------------- */

function Shell() {
  const floor = floorTexture();
  const plaster = wallTexture();
  const wallMat = <meshStandardMaterial map={plaster} roughness={0.95} metalness={0} />;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[WALL.halfWidth * 2, WALL.halfDepth * 2]} />
        <meshStandardMaterial map={floor} emissive="#ffffff" emissiveMap={floor} emissiveIntensity={0.14} roughness={0.8} />
      </mesh>
      <mesh position={[0, WALL.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[WALL.halfWidth * 2, WALL.halfDepth * 2]} />
        <meshStandardMaterial map={ceilingTexture()} roughness={0.9} />
      </mesh>
      <mesh position={[0, WALL.height / 2, NORTH_Z]}>{/* N */}
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
      {[-1.7, -0.55, 0.6, 1.75].map(z => (
        <mesh key={z} position={[0, WALL.height - 0.055, z]}>
          <boxGeometry args={[WALL.halfWidth * 2, 0.1, 0.13]} />
          <Solid color="#2a1715" />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------ shelf games ------------------------------- */

function ShelfBox({
  slot,
  y,
  hovered,
  pulled,
}: {
  slot: ShelfSlot;
  y: number;
  hovered: boolean;
  pulled: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const boxWidth = SHELF.width - 0.12;
  const boxDepth = 0.28;
  const skin = boxSkin(slot);
  const spine = spineStripTexture(slot.id, slot.title, skin.face, skin.ink);
  const target: HoverTarget = {
    id: `game:${slot.id}`,
    kind: 'game',
    gameId: slot.id,
    label: slot.title,
    hint: 'Inspect · pull to play',
  };

  useFrame((_, delta) => {
    if (!group.current) return;
    const want = pulled ? 0.28 : hovered ? 0.08 : 0;
    group.current.position.z += (want - group.current.position.z) * Math.min(1, delta * 9);
  });

  return (
    <group ref={group} position={[0, y + slot.boxHeight / 2 + 0.02, 0.12]} userData={{ interactable: target }}>
      <mesh castShadow>
        <boxGeometry args={[boxWidth, slot.boxHeight, boxDepth]} />
        <meshStandardMaterial color={skin.face} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, boxDepth / 2 + 0.003]}>
        <planeGeometry args={[boxWidth, slot.boxHeight]} />
        {painted(spine, hovered ? 0.95 : 0.55)}
      </mesh>
      {hovered && (
        <mesh position={[0, 0, boxDepth / 2 + 0.014]}>
          <planeGeometry args={[boxWidth + 0.04, slot.boxHeight + 0.04]} />
          <meshBasicMaterial color={slot.accent} transparent opacity={0.28} />
        </mesh>
      )}
    </group>
  );
}

function InteractiveShelf({ hoveredId, pulledId }: { hoveredId: string | null; pulledId: string | null }) {
  const rows = [...SHELF_SLOTS, ...SHELF_SLOTS_LOWER];
  const bulbs = useMemo(() => {
    const colors = ['#ff5f6d', '#ffd166', '#6be5a0', '#6aa8ff', '#e07bff'];
    return Array.from({ length: 14 }, (_, i) => ({
      y: (i / 13) * SHELF.height,
      color: colors[i % colors.length],
    }));
  }, []);
  const lights = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!lights.current) return;
    const t = clock.elapsedTime;
    lights.current.children.forEach((c, i) => {
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(t * 1.5 + i) * 0.4;
    });
  });

  return (
    <group position={[SHELF.x, 0, SHELF.z]}>
      {/* Real Tripo shelf as the visual carcass */}
      <RoomModel id="shelf" position={[0, 0, -0.06]} rotation={[0, 0, 0]} fitHeight={2.05} fitWidth={0.95} />
      {rows.map(slot => (
        <ShelfBox
          key={slot.id}
          slot={slot}
          y={SHELF.rowY[slot.row] ?? 0.1}
          hovered={hoveredId === `game:${slot.id}`}
          pulled={pulledId === slot.id}
        />
      ))}
      {/* smiley glow on top */}
      <mesh position={[0.18, SHELF.height + 0.12, 0.05]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#ffd93d" emissive="#ffd93d" emissiveIntensity={0.9} />
      </mesh>
      <pointLight position={[0.18, SHELF.height + 0.12, 0.2]} color="#ffdf6e" intensity={0.85} distance={1.6} decay={2} />
      <group ref={lights}>
        {bulbs.map((b, i) => (
          <mesh key={i} position={[-SHELF.width / 2 - 0.02, b.y, 0.2]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshBasicMaterial color={b.color} transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ------------------------------- accents ---------------------------------- */

function NeonSaturn() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.015);
  });
  return (
    <group ref={ref} position={[SATURN.x, SATURN.y, NORTH_Z + 0.04]}>
      <mesh>
        <torusGeometry args={[0.1, 0.012, 10, 36]} />
        <meshBasicMaterial color={PALETTE.neonPink} />
      </mesh>
      <mesh rotation={[Math.PI / 2 - 0.35, 0, 0]}>
        <torusGeometry args={[0.16, 0.009, 8, 40]} />
        <meshBasicMaterial color="#ff8ef2" />
      </mesh>
      <pointLight color={PALETTE.neonPink} intensity={0.9} distance={1.6} decay={2} />
    </group>
  );
}

function LavaLamp({ warm, hovered }: { warm: boolean; hovered: boolean }) {
  const target: HoverTarget = {
    id: 'lava-lamp',
    kind: 'prop',
    label: 'Lava lamp',
    hint: warm ? 'Cool the glow' : 'Warm the glow',
  };
  return (
    <group position={[DRESSER.x + 0.42, DRESSER.height + 0.02, DRESSER.z + 0.08]} userData={{ interactable: target }}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.04, 0.055, 0.04, 18]} />
        <Solid color="#23232b" rough={0.5} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <coneGeometry args={[0.04, 0.22, 18, 1, true]} />
        <meshStandardMaterial
          color={warm ? '#e04a1c' : '#d92a62'}
          emissive={warm ? '#ff6a28' : '#ff3f7c'}
          emissiveIntensity={hovered ? 1.0 : 0.7}
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight position={[0, 0.2, 0.1]} color={warm ? '#ff8f4a' : '#ff5c8a'} intensity={warm ? 1.5 : 1.1} distance={2.2} decay={2} />
    </group>
  );
}

function Door({ hovered }: { hovered: boolean }) {
  const target: HoverTarget = {
    id: 'door',
    kind: 'prop',
    label: 'Bedroom door',
    hint: 'Locked for now',
  };
  return (
    <group position={[DOOR.x, 0, NORTH_Z]} userData={{ interactable: target }}>
      <mesh position={[0, DOOR.height / 2, -0.04]}>
        <boxGeometry args={[DOOR.width, DOOR.height, 0.08]} />
        <Solid color={hovered ? '#5a3a2e' : '#3a241c'} />
      </mesh>
      {/* UFO poster */}
      <mesh position={[-0.12, 1.55, 0.05]}>
        <planeGeometry args={[0.32, 0.48]} />
        <meshStandardMaterial color="#1a1a22" emissive="#3a4a6a" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0.22, 1.35, 0.06]}>
        <boxGeometry args={[0.28, 0.9, 0.04]} />
        <Solid color="#1e3a5c" rough={0.95} />
      </mesh>
      <mesh position={[0.22, 1.95, 0.08]}>
        <sphereGeometry args={[0.08, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <Solid color="#2a2a30" />
      </mesh>
    </group>
  );
}

function CeilingFan() {
  const blades = useRef<THREE.Group>(null);
  useFrame((_, d) => {
    if (blades.current) blades.current.rotation.y += d * 0.55;
  });
  return (
    <group position={[FAN.x, FAN.y, FAN.z]}>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.1, 0.08, 0.08, 16]} />
        <Solid color="#5c4632" rough={0.6} />
      </mesh>
      <group ref={blades} position={[0, -0.14, 0]}>
        {[0, 1, 2, 3, 4].map(i => (
          <mesh
            key={i}
            rotation={[0, (i / 5) * Math.PI * 2, 0.06]}
            position={[Math.cos((i / 5) * Math.PI * 2) * 0.34, 0, Math.sin((i / 5) * Math.PI * 2) * 0.34]}
          >
            <boxGeometry args={[0.54, 0.012, 0.14]} />
            <Solid color="#54402e" />
          </mesh>
        ))}
      </group>
      {[0, 1, 2].map(i => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.1, -0.24, Math.sin(a) * 0.1]}>
            <sphereGeometry args={[0.07, 14, 14]} />
            <meshStandardMaterial color="#ffe8c0" emissive="#ffd59b" emissiveIntensity={1.3} />
          </mesh>
        );
      })}
      <pointLight position={[0, -0.3, 0]} color="#ffd9a8" intensity={3.2} distance={6} decay={2} />
    </group>
  );
}

function DeskGames({ hoveredId }: { hoveredId: string | null }) {
  return (
    <group position={[EAST_DESK.x, EAST_DESK.top, EAST_DESK.z + 0.45]}>
      {DESK_SLOTS.map((slot, i) => {
        const skin = boxSkin(slot);
        const target: HoverTarget = {
          id: `game:${slot.id}`,
          kind: 'game',
          gameId: slot.id,
          label: slot.title,
          hint: 'Inspect · pick up to play',
        };
        const hovered = hoveredId === `game:${slot.id}`;
        return (
          <group key={slot.id} position={[0, 0.04 + i * slot.boxHeight, 0]} userData={{ interactable: target }}>
            <mesh castShadow>
              <boxGeometry args={[0.32, slot.boxHeight, 0.24]} />
              <meshStandardMaterial color={skin.face} roughness={0.9} />
            </mesh>
            <mesh position={[0, slot.boxHeight / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.32, 0.24]} />
              {painted(lidTexture(slot.id, slot.title, skin.face, skin.ink), hovered ? 0.7 : 0.45)}
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* --------------------------------- scene ---------------------------------- */

export interface RealRoomSceneProps {
  hoveredId: string | null;
  pulledGameId: string | null;
  tapeOn: boolean;
  lampsWarm: boolean;
}

/**
 * Walkable bedroom rebuilt around real Tripo GLB furniture (compressed for web)
 * instead of photo cut-outs. Shelf game boxes stay interactive for play.
 */
export function RealRoomScene({ hoveredId, pulledGameId, tapeOn, lampsWarm }: RealRoomSceneProps) {
  return (
    <group>
      <ambientLight intensity={0.22} color="#ffd2bd" />
      <hemisphereLight args={['#c4b0e0', '#2a150f', 0.28]} />
      <Shell />

      {/* Window — real model set into the north wall */}
      <RoomModel id="window" position={[-1.75, 1.05, NORTH_Z + 0.08]} fitWidth={0.85} fitHeight={1.15} />
      <pointLight position={[-1.75, 1.55, NORTH_Z + 0.5]} color="#9aa6ff" intensity={1.05} distance={2.6} decay={2} />

      {/* Bed + nightstand (west) */}
      <RoomModel
        id="bed"
        position={[BED.x, 0, BED.z]}
        rotation={[0, Math.PI / 2, 0]}
        fitWidth={BED.length}
        interactable={{ id: 'bed', kind: 'prop', label: 'Bed', hint: 'Open memory card' }}
        hovered={hoveredId === 'bed'}
      />
      <RoomModel id="nightstand" position={[NIGHTSTAND.x, 0, NIGHTSTAND.z]} fitHeight={0.62} fitWidth={0.42} />
      <RoomModel
        id="gameboy"
        position={[BED.x + 0.15, BED.top + 0.02, BED.z + 0.35]}
        rotation={[0, 0.4, 0]}
        fitWidth={0.14}
        interactable={{ id: 'gameboy', kind: 'prop', label: 'Game Boy', hint: 'Open memory card' }}
        hovered={hoveredId === 'gameboy'}
      />

      {/* West desk under the posters */}
      <RoomModel id="desk" position={[CORNER_DESK.x + 0.2, 0, CORNER_DESK.z + 0.1]} fitWidth={0.95} fitHeight={0.78} />

      {/* Dresser + CRT + lava + neon */}
      <RoomModel id="dresser" position={[DRESSER.x, 0, DRESSER.z]} fitWidth={DRESSER.width} fitHeight={DRESSER.height} />
      <RoomModel
        id="crt"
        position={[CRT.x, DRESSER.height, DRESSER.z + 0.02]}
        fitWidth={CRT.width * 1.05}
        interactable={{ id: 'crt-tv', kind: 'prop', label: 'CRT television', hint: 'Open memory · flat list' }}
        hovered={hoveredId === 'crt-tv'}
      />
      <RoomModel id="toyshelf" position={[CRT.x + 0.15, DRESSER.height + CRT.height + 0.35, NORTH_Z + 0.12]} fitWidth={0.85} />
      <LavaLamp warm={lampsWarm} hovered={hoveredId === 'lava-lamp'} />
      <NeonSaturn />

      <Door hovered={hoveredId === 'door'} />

      {/* Boombox + tapes on the floor */}
      <RoomModel
        id="boombox"
        position={[BOOMBOX.x, 0, BOOMBOX.z + 0.15]}
        rotation={[0, -0.35, 0]}
        fitWidth={0.48}
        interactable={{ id: 'boombox', kind: 'prop', label: 'Boombox', hint: tapeOn ? 'Stop tape · card' : 'Play tape · card' }}
        hovered={hoveredId === 'boombox'}
      />
      {tapeOn && <pointLight position={[BOOMBOX.x, 0.2, BOOMBOX.z + 0.3]} color="#ff7ad8" intensity={1.1} distance={1.2} decay={2} />}
      <RoomModel
        id="vhs_stack"
        position={[BOOMBOX.x - 0.35, 0, BOOMBOX.z + 0.35]}
        rotation={[0, 0.5, 0]}
        fitWidth={0.28}
        interactable={{ id: 'vhs-stack', kind: 'prop', label: 'VHS stack', hint: 'Open memory card' }}
        hovered={hoveredId === 'vhs-stack'}
      />
      <RoomModel id="vhs_loose" position={[0.55, 0, -1.55]} rotation={[0, -0.8, 0]} fitWidth={0.35} />

      {/* Game shelf — hero interaction */}
      <InteractiveShelf hoveredId={hoveredId} pulledId={pulledGameId} />

      {/* East computer desk + card games */}
      <RoomModel id="desk" position={[EAST_DESK.x, 0, EAST_DESK.z]} rotation={[0, -Math.PI / 2, 0]} fitWidth={1.4} fitHeight={0.78} />
      <DeskGames hoveredId={hoveredId} />
      <RoomModel
        id="cards"
        position={[0.2, 0.01, -1.35]}
        rotation={[0, 0.6, 0]}
        fitWidth={0.35}
        interactable={{ id: 'cards', kind: 'prop', label: 'Trading cards', hint: 'Open memory card' }}
        hovered={hoveredId === 'cards'}
      />

      {/* Play table in front of shelf */}
      <group position={[PLAY_TABLE.x, 0, PLAY_TABLE.z]}>
        <mesh position={[0, PLAY_TABLE.top, 0]} castShadow receiveShadow>
          <boxGeometry args={[PLAY_TABLE.width, PLAY_TABLE.thickness, PLAY_TABLE.depth]} />
          <meshStandardMaterial map={woodTexture('#5a3621', [1, 1])} roughness={0.78} />
        </mesh>
      </group>

      <mesh position={[RUG.x, 0.004, RUG.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[RUG.radius, 48]} />
        <meshStandardMaterial map={rugTexture()} transparent roughness={0.98} />
      </mesh>

      <CeilingFan />
      <pointLight position={[0, 1.75, 1.3]} color="#b48ce0" intensity={0.55} distance={5} decay={2} />
      <pointLight position={[-1.3, 1.3, -1.5]} color="#e09a6e" intensity={0.55} distance={3.6} decay={2} />
    </group>
  );
}

export { ROOM_PROPS };
