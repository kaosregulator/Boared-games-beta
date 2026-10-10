import React, { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import {
  BED,
  BOOMBOX,
  CORNER_DESK,
  CRT,
  DECALS,
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
  TOY_SHELF,
  WALL,
  WEST_X,
  WINDOW_NORTH,
  type ShelfSlot,
} from './videoRoom';
import {
  blindsTexture,
  ceilingTexture,
  crtScreenTexture,
  floorTexture,
  nightSkyTexture,
  rugTexture,
  wallTexture,
  woodTexture,
} from './procTextures';
import { BOX_FACE, lidTexture } from './realBoardArt';
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

/* -------------------------------- posters --------------------------------- */

const POSTER_NAMES = [
  'poster_sharks',
  'poster_rundmc',
  'poster_spacejam',
  'frames_west',
  'ufo_poster',
  'shelf_full',
  'coat',
] as const;

type PosterName = (typeof POSTER_NAMES)[number];

function usePosters() {
  const urls = useMemo(() => POSTER_NAMES.map(n => `/room/${n}.png`), []);
  const loaded = useLoader(THREE.TextureLoader, urls);
  return useMemo(() => {
    const out = {} as Record<PosterName, THREE.Texture>;
    POSTER_NAMES.forEach((name, i) => {
      const tex = loaded[i];
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      out[name] = tex;
    });
    return out;
  }, [loaded]);
}

function WallDecals() {
  const posters = usePosters();
  return (
    <group>
      {DECALS.map(d => {
        const tex = posters[d.texture as PosterName];
        if (!tex) return null;
        const pos: [number, number, number] =
          d.wall === 'north'
            ? [d.along, d.y, NORTH_Z + 0.015]
            : d.wall === 'south'
              ? [d.along, d.y, SOUTH_Z - 0.015]
              : d.wall === 'west'
                ? [WEST_X + 0.015, d.y, d.along]
                : [EAST_X - 0.015, d.y, d.along];
        const rot: [number, number, number] =
          d.wall === 'north'
            ? [0, 0, 0]
            : d.wall === 'south'
              ? [0, Math.PI, 0]
              : d.wall === 'west'
                ? [0, Math.PI / 2, 0]
                : [0, -Math.PI / 2, 0];
        return (
          <mesh key={d.id} position={pos} rotation={rot}>
            <planeGeometry args={[d.width, d.height]} />
            {painted(tex, 0.52)}
          </mesh>
        );
      })}
    </group>
  );
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
      {[-1.7, -0.55, 0.6, 1.75].map(z => (
        <mesh key={z} position={[0, WALL.height - 0.055, z]}>
          <boxGeometry args={[WALL.halfWidth * 2, 0.1, 0.13]} />
          <Solid color="#2a1715" />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------- shelf: real mesh + invisible hits ------------------- */

/**
 * The Tripo shelf GLB already has Monopoly / Battleship / Sorry / Clue / Life /
 * Yahtzee baked into the mesh. We never draw fake boxes on top — only invisible
 * hit volumes so the player can aim, get a glass card, and pull a title.
 */
function ShelfHit({
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
  const boxWidth = SHELF.width - 0.18;
  const boxDepth = 0.32;
  const target: HoverTarget = {
    id: `game:${slot.id}`,
    kind: 'game',
    gameId: slot.id,
    label: slot.title,
    hint: 'Inspect · pull to play',
  };

  useFrame((_, delta) => {
    if (!group.current) return;
    const want = pulled ? 0.1 : hovered ? 0.04 : 0;
    group.current.position.z += (want - group.current.position.z) * Math.min(1, delta * 10);
  });

  return (
    <group ref={group} position={[0, y + slot.boxHeight / 2 + 0.02, 0.14]} userData={{ interactable: target }}>
      {/* Invisible collider — ray hits this, not a homemade box */}
      <mesh>
        <boxGeometry args={[boxWidth, slot.boxHeight + 0.02, boxDepth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Soft see-through rim when aimed */}
      {(hovered || pulled) && (
        <mesh position={[0, 0, boxDepth / 2 + 0.01]}>
          <planeGeometry args={[boxWidth + 0.02, slot.boxHeight + 0.02]} />
          <meshBasicMaterial color={slot.accent} transparent opacity={pulled ? 0.45 : 0.28} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function InteractiveShelf({ hoveredId, pulledId }: { hoveredId: string | null; pulledId: string | null }) {
  const posters = usePosters();
  const rows = [...SHELF_SLOTS, ...SHELF_SLOTS_LOWER];
  const bulbs = useMemo(() => {
    const colors = ['#ff5f6d', '#ffd166', '#6be5a0', '#6aa8ff', '#e07bff'];
    return Array.from({ length: 18 }, (_, i) => ({
      y: 0.1 + (i / 17) * (SHELF.height - 0.15),
      color: colors[i % colors.length],
    }));
  }, []);
  const lights = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!lights.current) return;
    const t = clock.elapsedTime;
    lights.current.children.forEach((c, i) => {
      ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(t * 1.6 + i) * 0.35;
    });
  });

  // High-res painting face for the game-box rows (helmet/ornaments stay on the Tripo mesh).
  const faceH = 1.05;
  const faceY = 0.95;
  const faceW = SHELF.width - 0.1;

  return (
    <group position={[SHELF.x, 0, SHELF.z]}>
      {/* Real Drive shelf mesh — depth, helmet, ornaments, wood */}
      <RoomModel id="shelf" position={[0, 0, -0.02]} fitHeight={SHELF.height} fitWidth={SHELF.width} tintAmount={0.01} />

      {/* Crisp board-game spines from the source painting, seated in the mesh face */}
      <mesh position={[0, faceY, SHELF.depth / 2 + 0.01]}>
        <planeGeometry args={[faceW, faceH]} />
        {painted(posters.shelf_full, 0.62)}
      </mesh>

      {rows.map(slot => (
        <ShelfHit
          key={slot.id}
          slot={slot}
          y={SHELF.rowY[slot.row] ?? 0.1}
          hovered={hoveredId === `game:${slot.id}`}
          pulled={pulledId === slot.id}
        />
      ))}

      {/* Extra smiley glow (mesh already has one; this boosts the room light) */}
      <pointLight position={[0.1, SHELF.height + 0.08, 0.25]} color="#ffdf6e" intensity={1.35} distance={2.0} decay={2} />

      {/* String lights on both stiles */}
      <group ref={lights}>
        {bulbs.map((b, i) => (
          <group key={i}>
            <mesh position={[-SHELF.width / 2 + 0.03, b.y, 0.22]}>
              <sphereGeometry args={[0.013, 8, 8]} />
              <meshBasicMaterial color={b.color} transparent opacity={0.9} />
            </mesh>
            <mesh position={[SHELF.width / 2 - 0.03, b.y, 0.22]}>
              <sphereGeometry args={[0.013, 8, 8]} />
              <meshBasicMaterial color={b.color} transparent opacity={0.9} />
            </mesh>
          </group>
        ))}
      </group>
      <pointLight position={[0, SHELF.height * 0.55, 0.35]} color="#ffb0c8" intensity={0.4} distance={2.4} decay={2} />

      {/* Baseball bat leaning */}
      <mesh position={[-SHELF.width / 2 - 0.1, 0.55, 0.2]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.018, 0.028, 1.05, 10]} />
        <Solid color="#8a6238" rough={0.7} />
      </mesh>
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
      <pointLight color={PALETTE.neonPink} intensity={1.15} distance={1.8} decay={2} />
    </group>
  );
}

function LavaLamp({
  position,
  warm,
  hovered,
  id = 'lava-lamp',
}: {
  position: [number, number, number];
  warm: boolean;
  hovered: boolean;
  id?: string;
}) {
  const blob = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!blob.current) return;
    const t = clock.elapsedTime;
    blob.current.position.y = 0.12 + Math.sin(t * 1.2) * 0.04;
    blob.current.scale.setScalar(0.9 + Math.sin(t * 0.8) * 0.12);
  });
  const target: HoverTarget = {
    id,
    kind: 'prop',
    label: 'Lava lamp',
    hint: warm ? 'Cool the glow' : 'Warm the glow',
  };
  return (
    <group position={position} userData={{ interactable: target }}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.04, 0.055, 0.04, 18]} />
        <Solid color="#23232b" rough={0.5} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <coneGeometry args={[0.04, 0.22, 18, 1, true]} />
        <meshStandardMaterial
          color={warm ? '#e04a1c' : '#d92a62'}
          emissive={warm ? '#ff6a28' : '#ff3f7c'}
          emissiveIntensity={hovered ? 1.15 : 0.8}
          transparent
          opacity={0.78}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={blob} position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.028, 12, 12]} />
        <meshStandardMaterial
          color={warm ? '#ff8a3a' : '#ff5a9a'}
          emissive={warm ? '#ff8a3a' : '#ff5a9a'}
          emissiveIntensity={1.4}
          transparent
          opacity={0.9}
        />
      </mesh>
      <pointLight
        position={[0, 0.2, 0.1]}
        color={warm ? '#ff8f4a' : '#ff5c8a'}
        intensity={warm ? 1.7 : 1.25}
        distance={2.4}
        decay={2}
      />
    </group>
  );
}

function Door({ hovered }: { hovered: boolean }) {
  const posters = usePosters();
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
      <mesh position={[-0.12, 1.55, 0.05]}>
        <planeGeometry args={[0.34, 0.5]} />
        {painted(posters.ufo_poster, 0.55)}
      </mesh>
      {/* Coat from the painting crop */}
      <mesh position={[0.2, 1.15, 0.06]}>
        <planeGeometry args={[0.32, 0.95]} />
        {painted(posters.coat, 0.4)}
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
            <meshStandardMaterial color="#ffe8c0" emissive="#ffd59b" emissiveIntensity={1.35} />
          </mesh>
        );
      })}
      <pointLight position={[0, -0.3, 0]} color="#ffd9a8" intensity={3.4} distance={6.5} decay={2} />
    </group>
  );
}

function DeskGames({ hoveredId }: { hoveredId: string | null }) {
  return (
    <group position={[EAST_DESK.x - 0.05, EAST_DESK.top, EAST_DESK.z + 0.35]}>
      {DESK_SLOTS.map((slot, i) => {
        const face = BOX_FACE[slot.id];
        const skin = { face: face?.face ?? slot.color, ink: face?.ink ?? '#ffffff' };
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
              <boxGeometry args={[0.3, slot.boxHeight, 0.22]} />
              <meshStandardMaterial color={skin.face} roughness={0.9} />
            </mesh>
            <mesh position={[0, slot.boxHeight / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.3, 0.22]} />
              {painted(lidTexture(slot.id, slot.title, skin.face, skin.ink), hovered ? 0.7 : 0.45)}
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function NightSkyWindow() {
  const sky = nightSkyTexture();
  const blinds = blindsTexture();
  const { x, y, width, height } = WINDOW_NORTH;
  return (
    <group position={[x, y, NORTH_Z]}>
      {/* Soft night glow behind / around the real window mesh */}
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[width * 1.15, height * 1.1]} />
        <meshBasicMaterial map={sky} />
      </mesh>
      <mesh position={[0, 0.04, 0.02]}>
        <planeGeometry args={[width * 0.95, height * 0.75]} />
        <meshStandardMaterial map={blinds} transparent opacity={0.35} emissive="#ffd9c0" emissiveIntensity={0.08} />
      </mesh>
      <pointLight position={[0, 0.1, 0.45]} color="#9aa6ff" intensity={1.2} distance={2.8} decay={2} />
    </group>
  );
}

function DeskLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.03, 12]} />
        <Solid color="#3a3028" />
      </mesh>
      <mesh position={[0, 0.12, 0]} rotation={[0.15, 0, 0.2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.22, 8]} />
        <Solid color="#5a4a38" rough={0.5} />
      </mesh>
      <mesh position={[0.06, 0.22, 0.04]} rotation={[0.6, 0, 0]}>
        <coneGeometry args={[0.07, 0.1, 16, 1, true]} />
        <meshStandardMaterial color="#c4a882" emissive="#ffc489" emissiveIntensity={0.55} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0.08, 0.18, 0.12]} color="#ffc489" intensity={1.4} distance={2.2} decay={2} />
    </group>
  );
}

function FloorClutter() {
  return (
    <group>
      {/* RC truck silhouette */}
      <mesh position={[-0.15, 0.05, -0.55]} rotation={[0, 0.6, 0]} castShadow>
        <boxGeometry args={[0.22, 0.08, 0.14]} />
        <Solid color="#1a6b3a" />
      </mesh>
      <mesh position={[-0.15, 0.1, -0.55]} rotation={[0, 0.6, 0]}>
        <boxGeometry args={[0.14, 0.05, 0.1]} />
        <Solid color="#c41e3a" />
      </mesh>
      {/* Toy cars */}
      {[
        [0.35, -0.85, 0.9, '#d4541a'],
        [0.55, -0.7, -0.4, '#2a5cff'],
        [0.1, -1.15, 0.2, '#e8c84a'],
      ].map(([x, z, rot, color], i) => (
        <mesh key={i} position={[x as number, 0.025, z as number]} rotation={[0, rot as number, 0]} castShadow>
          <boxGeometry args={[0.1, 0.04, 0.06]} />
          <Solid color={color as string} />
        </mesh>
      ))}
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
 * Walkable bedroom built from every Drive Tripo mesh. The shelf keeps its baked
 * board-game boxes — interaction uses invisible hit volumes, not fake geometry.
 */
export function RealRoomScene({ hoveredId, pulledGameId, tapeOn, lampsWarm }: RealRoomSceneProps) {
  const crtScreen = crtScreenTexture('PLAY');

  return (
    <group>
      <ambientLight intensity={0.2} color="#e8c8b8" />
      <hemisphereLight args={['#9a88b8', '#1e120e', 0.38]} />
      <Shell />
      <WallDecals />

      {/* Window — night sky glow + Tripo window frame nestled in the north wall */}
      <NightSkyWindow />
      <RoomModel
        id="window"
        position={[WINDOW_NORTH.x, 0.55, NORTH_Z + 0.05]}
        fitWidth={WINDOW_NORTH.width * 0.95}
        fitHeight={WINDOW_NORTH.height * 0.85}
        tintAmount={0.02}
      />

      {/* Bed + nightstand (west) — full quilt mesh */}
      <RoomModel
        id="bed"
        position={[BED.x, 0, BED.z]}
        rotation={[0, Math.PI / 2, 0]}
        fitWidth={BED.length}
        fitHeight={BED.top + 0.35}
        interactable={{ id: 'bed', kind: 'prop', label: 'Bed', hint: 'Open memory card' }}
        hovered={hoveredId === 'bed'}
        tintAmount={0.03}
      />
      <RoomModel id="nightstand" position={[NIGHTSTAND.x, 0, NIGHTSTAND.z]} fitHeight={0.62} fitWidth={0.42} />
      <LavaLamp
        position={[NIGHTSTAND.x + 0.02, NIGHTSTAND.top, NIGHTSTAND.z + 0.05]}
        warm={lampsWarm}
        hovered={hoveredId === 'lava-lamp'}
      />
      {/* Alarm clock glow */}
      <mesh position={[NIGHTSTAND.x - 0.1, NIGHTSTAND.top + 0.04, NIGHTSTAND.z + 0.08]}>
        <boxGeometry args={[0.1, 0.05, 0.06]} />
        <Solid color="#1a1a1e" rough={0.4} />
      </mesh>
      <mesh position={[NIGHTSTAND.x - 0.1, NIGHTSTAND.top + 0.05, NIGHTSTAND.z + 0.115]}>
        <planeGeometry args={[0.08, 0.03]} />
        <meshBasicMaterial color="#ff3030" />
      </mesh>
      <RoomModel
        id="gameboy"
        position={[BED.x + 0.18, BED.top + 0.03, BED.z + 0.35]}
        rotation={[-Math.PI / 2 + 0.15, 0.35, 0.1]}
        fitWidth={0.11}
        fitHeight={0.04}
        interactable={{ id: 'gameboy', kind: 'prop', label: 'Game Boy', hint: 'Open memory card' }}
        hovered={hoveredId === 'gameboy'}
        tintAmount={0.02}
      />

      {/* West corner desk under posters */}
      <RoomModel
        id="desk"
        position={[CORNER_DESK.x + 0.15, 0, CORNER_DESK.z + 0.12]}
        fitWidth={0.95}
        fitHeight={0.76}
        tintAmount={0.05}
      />
      <DeskLamp position={[CORNER_DESK.x + 0.25, CORNER_DESK.top, CORNER_DESK.z + 0.1]} />

      {/* Dresser + CRT — hero of the north wall */}
      <RoomModel
        id="dresser"
        position={[DRESSER.x, 0, DRESSER.z]}
        fitWidth={DRESSER.width}
        fitHeight={DRESSER.height}
        tintAmount={0.05}
      />
      <RoomModel
        id="crt"
        position={[CRT.x, DRESSER.height, DRESSER.z + 0.02]}
        fitWidth={CRT.width * 1.08}
        interactable={{ id: 'crt-tv', kind: 'prop', label: 'CRT television', hint: 'Open memory · flat list' }}
        hovered={hoveredId === 'crt-tv'}
        tintAmount={0.02}
      />
      {/* Soft PLAY glow on the screen face */}
      <mesh position={[CRT.x, DRESSER.height + CRT.height * 0.52, DRESSER.z + CRT.depth / 2 + 0.02]}>
        <planeGeometry args={[CRT.width * 0.72, CRT.height * 0.55]} />
        <meshBasicMaterial map={crtScreen} transparent opacity={0.85} />
      </mesh>
      <pointLight position={[CRT.x, DRESSER.height + 0.35, DRESSER.z + 0.5]} color="#6ec8ff" intensity={0.55} distance={1.8} decay={2} />

      {/* Toy shelf on the wall above the dresser (reference) */}
      <RoomModel
        id="toyshelf"
        position={[TOY_SHELF.x, TOY_SHELF.y - 0.15, NORTH_Z + 0.1]}
        fitWidth={TOY_SHELF.width * 0.95}
        tintAmount={0.04}
      />

      <LavaLamp
        position={[DRESSER.x + DRESSER.width * 0.38, DRESSER.height + 0.02, DRESSER.z + 0.1]}
        warm={lampsWarm}
        hovered={hoveredId === 'lava-lamp'}
      />
      <NeonSaturn />
      <Door hovered={hoveredId === 'door'} />

      {/* Boombox + VHS on the floor by the dresser */}
      <RoomModel
        id="boombox"
        position={[BOOMBOX.x, 0, BOOMBOX.z + 0.2]}
        rotation={[0, -0.4, 0]}
        fitWidth={0.5}
        interactable={{ id: 'boombox', kind: 'prop', label: 'Boombox', hint: tapeOn ? 'Stop tape · card' : 'Play tape · card' }}
        hovered={hoveredId === 'boombox'}
        tintAmount={0.02}
      />
      {tapeOn && (
        <pointLight position={[BOOMBOX.x, 0.22, BOOMBOX.z + 0.35]} color="#ff7ad8" intensity={1.25} distance={1.4} decay={2} />
      )}
      <RoomModel
        id="vhs_stack"
        position={[BOOMBOX.x - 0.38, 0, BOOMBOX.z + 0.42]}
        rotation={[0, 0.55, 0]}
        fitWidth={0.3}
        interactable={{ id: 'vhs-stack', kind: 'prop', label: 'VHS stack', hint: 'Open memory card' }}
        hovered={hoveredId === 'vhs-stack'}
      />
      <RoomModel id="vhs_loose" position={[0.6, 0, -1.45]} rotation={[0, -0.85, 0]} fitWidth={0.36} />
      <RoomModel id="vhs_loose" position={[0.85, 0, -1.25]} rotation={[0, 0.4, 0]} fitWidth={0.28} scale={0.85} />

      {/* Game shelf — real mesh only */}
      <InteractiveShelf hoveredId={hoveredId} pulledId={pulledGameId} />

      {/* East computer desk — desk games tucked as a small lid stack */}
      <RoomModel
        id="desk"
        position={[EAST_DESK.x, 0, EAST_DESK.z]}
        rotation={[0, -Math.PI / 2, 0]}
        fitWidth={1.35}
        fitHeight={0.76}
        tintAmount={0.05}
      />
      <group scale={[0.7, 0.7, 0.7]} position={[0.05, 0, -0.15]}>
        <DeskGames hoveredId={hoveredId} />
      </group>
      <RoomModel
        id="cards"
        position={[RUG.x - 0.2, 0.01, RUG.z + 0.25]}
        rotation={[0, 0.7, 0]}
        fitWidth={0.28}
        interactable={{ id: 'cards', kind: 'prop', label: 'Trading cards', hint: 'Open memory card' }}
        hovered={hoveredId === 'cards'}
        tintAmount={0.02}
      />

      {/* Desk in front of shelf (with legs so it doesn't float) */}
      <group position={[PLAY_TABLE.x, 0, PLAY_TABLE.z]}>
        <mesh position={[0, PLAY_TABLE.top, 0]} castShadow receiveShadow>
          <boxGeometry args={[PLAY_TABLE.width, PLAY_TABLE.thickness, PLAY_TABLE.depth]} />
          <meshStandardMaterial map={woodTexture('#5a3621', [1, 1])} roughness={0.78} />
        </mesh>
        {[
          [-PLAY_TABLE.width / 2 + 0.06, -PLAY_TABLE.depth / 2 + 0.06],
          [PLAY_TABLE.width / 2 - 0.06, -PLAY_TABLE.depth / 2 + 0.06],
          [-PLAY_TABLE.width / 2 + 0.06, PLAY_TABLE.depth / 2 - 0.06],
          [PLAY_TABLE.width / 2 - 0.06, PLAY_TABLE.depth / 2 - 0.06],
        ].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, PLAY_TABLE.top / 2, lz]} castShadow>
            <boxGeometry args={[0.05, PLAY_TABLE.top, 0.05]} />
            <Solid color="#3a2418" />
          </mesh>
        ))}
      </group>

      <mesh position={[RUG.x, 0.004, RUG.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[RUG.radius, 48]} />
        <meshStandardMaterial map={rugTexture()} transparent roughness={0.98} />
      </mesh>

      <FloorClutter />
      <CeilingFan />

      {/* Atmosphere fills matching the painting */}
      <pointLight position={[0, 1.8, 1.2]} color="#b48ce0" intensity={0.65} distance={5.5} decay={2} />
      <pointLight position={[-1.4, 1.25, -1.4]} color="#e09a6e" intensity={0.7} distance={3.8} decay={2} />
      <pointLight position={[1.8, 1.5, -1.8]} color="#ff9eb8" intensity={0.45} distance={3.2} decay={2} />
      <pointLight position={[DRESSER.x, 2.2, DRESSER.z + 1.2]} color="#ffd4b0" intensity={0.85} distance={4.5} decay={2} />
    </group>
  );
}

export { ROOM_PROPS };
