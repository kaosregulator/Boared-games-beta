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
  EAST_TV,
  EAST_X,
  FAN,
  LAVA,
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
import { BOX_FACE, lidTexture, spineStripTexture } from './realBoardArt';
import type { HoverTarget } from './Interactable';

/** Printed box art for a shelf slot, matched to that game's real board face. */
function boxSkin(slot: ShelfSlot) {
  const face = BOX_FACE[slot.id];
  return { face: face?.face ?? slot.color, ink: face?.ink ?? '#ffffff' };
}

/** Art cut out of the reference clip, loaded straight off /room. */
const CROPS = [
  'poster_sharks',
  'poster_rundmc',
  'poster_spacejam',
  'frames_west',
  'toyshelf',
  'dresser',
  'door',
  'ufo_poster',
  'coat',
  'desk_east',
  'tv_east',
  'deskchair',
  'bed_quilt',
  'bed_pillow',
  'nightstand_west',
  'boombox',
  'crt_play',
  'spine_monopoly',
  'spine_battleship',
  'spine_sorry',
  'spine_clue',
  'spine_life',
  'spine_yahtzee',
] as const;

type CropName = (typeof CROPS)[number];
export type Crops = Record<CropName, THREE.Texture>;

export function useRoomCrops(): Crops {
  const urls = useMemo(() => CROPS.map(name => `/room/${name}.png`), []);
  const loaded = useLoader(THREE.TextureLoader, urls);
  return useMemo(() => {
    const out = {} as Crops;
    CROPS.forEach((name, i) => {
      const tex = loaded[i];
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      out[name] = tex;
    });
    return out;
  }, [loaded]);
}

/**
 * The reference art is already lit, so props re-emit their own map at partial
 * strength. That keeps the painted highlights readable without flattening the
 * room's real lights.
 */
function paintedMaterial(map: THREE.Texture, emissive = 0.42) {
  return (
    <meshStandardMaterial
      map={map}
      emissive="#ffffff"
      emissiveMap={map}
      emissiveIntensity={emissive}
      roughness={0.82}
      metalness={0.04}
    />
  );
}

function Solid({ color, rough = 0.85 }: { color: string; rough?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={0.05} />;
}

interface SceneProps {
  /** Games already unlocked for pulling off the shelf. */
  onRegister?: (target: HoverTarget) => void;
  hoveredId: string | null;
  tapeOn: boolean;
  lampsWarm: boolean;
}

/* -------------------------------------------------------------------------- */

function Shell() {
  const floor = floorTexture();
  const plaster = wallTexture();
  const wallMat = <meshStandardMaterial map={plaster} roughness={0.95} metalness={0} />;

  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[WALL.halfWidth * 2, WALL.halfDepth * 2]} />
        <meshStandardMaterial map={floor} emissive="#ffffff" emissiveMap={floor} emissiveIntensity={0.16} roughness={0.78} metalness={0.03} />
      </mesh>

      {/* ceiling */}
      <mesh position={[0, WALL.height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[WALL.halfWidth * 2, WALL.halfDepth * 2]} />
        <meshStandardMaterial map={ceilingTexture()} roughness={0.9} />
      </mesh>

      {/* north / south / west / east walls */}
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

      {/* baseboards */}
      {[
        { p: [0, 0.055, NORTH_Z + 0.02] as const, r: [0, 0, 0] as const, w: WALL.halfWidth * 2 },
        { p: [0, 0.055, SOUTH_Z - 0.02] as const, r: [0, Math.PI, 0] as const, w: WALL.halfWidth * 2 },
        { p: [WEST_X + 0.02, 0.055, 0] as const, r: [0, Math.PI / 2, 0] as const, w: WALL.halfDepth * 2 },
        { p: [EAST_X - 0.02, 0.055, 0] as const, r: [0, -Math.PI / 2, 0] as const, w: WALL.halfDepth * 2 },
      ].map((b, i) => (
        <mesh key={i} position={b.p as unknown as [number, number, number]} rotation={b.r as unknown as [number, number, number]}>
          <planeGeometry args={[b.w, 0.11]} />
          <Solid color={PALETTE.trim} />
        </mesh>
      ))}

      {/* ceiling beams from the clip */}
      {[-1.7, -0.55, 0.6, 1.75].map(z => (
        <mesh key={z} position={[0, WALL.height - 0.055, z]}>
          <boxGeometry args={[WALL.halfWidth * 2, 0.1, 0.13]} />
          <Solid color="#2a1715" />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */

function WallDecals({ crops }: { crops: Crops }) {
  return (
    <group>
      {DECALS.map(d => {
        const tex = crops[d.texture as CropName];
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
            {paintedMaterial(tex, 0.5)}
          </mesh>
        );
      })}
    </group>
  );
}

function NorthWindow() {
  const sky = nightSkyTexture();
  const blinds = blindsTexture();
  const { x, y, width, height } = WINDOW_NORTH;
  return (
    <group position={[x, y, NORTH_Z]}>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={sky} />
      </mesh>
      <mesh position={[0, 0.06, 0.03]}>
        <planeGeometry args={[width - 0.02, height * 0.82]} />
        <meshStandardMaterial map={blinds} transparent emissive="#ffd9c0" emissiveIntensity={0.1} />
      </mesh>
      {/* frame */}
      {[
        [0, height / 2 + 0.035, 0.04, width + 0.12, 0.07],
        [0, -height / 2 - 0.035, 0.04, width + 0.12, 0.07],
      ].map((f, i) => (
        <mesh key={`h${i}`} position={[f[0], f[1], f[2]]}>
          <boxGeometry args={[f[3], f[4], 0.07]} />
          <Solid color="#6a5a52" />
        </mesh>
      ))}
      {[-1, 1].map(s => (
        <mesh key={s} position={[(s * (width + 0.06)) / 2, 0, 0.04]}>
          <boxGeometry args={[0.06, height + 0.14, 0.07]} />
          <Solid color="#6a5a52" />
        </mesh>
      ))}
      <pointLight position={[0, 0, 0.45]} color="#8ea2ff" intensity={0.85} distance={2.3} decay={2} />
    </group>
  );
}

function Dresser({ crops }: { crops: Crops }) {
  const wood = woodTexture('#5a3826', [1, 1]);
  const { x, z, width, height, depth } = DRESSER;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial map={wood} roughness={0.8} />
      </mesh>
      {/* painted drawer front straight off the clip */}
      <mesh position={[0, height / 2, depth / 2 + 0.006]}>
        <planeGeometry args={[width - 0.02, height - 0.02]} />
        {paintedMaterial(crops.dresser, 0.5)}
      </mesh>
      <mesh position={[0, height + 0.012, 0]}>
        <boxGeometry args={[width + 0.05, 0.025, depth + 0.05]} />
        <meshStandardMaterial map={wood} roughness={0.6} />
      </mesh>
    </group>
  );
}

function CrtTelevision({ crops, hovered }: { crops: Crops; hovered: boolean }) {
  const screen = crtScreenTexture('PLAY');
  const base = DRESSER.height + 0.025;
  const target: HoverTarget = {
    id: 'crt-tv',
    kind: 'prop',
    label: 'CRT television',
    hint: 'Open the flat game list',
  };
  return (
    <group position={[CRT.x, base, DRESSER.z + 0.03]} userData={{ interactable: target }}>
      {/* cabinet */}
      <mesh position={[0, CRT.height / 2, 0]} castShadow>
        <boxGeometry args={[CRT.width, CRT.height, CRT.depth]} />
        <meshStandardMaterial color={hovered ? '#6d6d7a' : '#4a4a55'} roughness={0.68} />
      </mesh>
      {/* glass */}
      <mesh position={[0, CRT.height / 2 + 0.01, CRT.depth / 2 + 0.004]}>
        <planeGeometry args={[CRT.width * 0.78, CRT.height * 0.66]} />
        <meshStandardMaterial
          map={screen}
          emissive="#9fb6ff"
          emissiveMap={screen}
          emissiveIntensity={0.72}
          roughness={0.25}
        />
      </mesh>
      {/* painted bezel detail */}
      <mesh position={[0, CRT.height / 2, CRT.depth / 2 + 0.002]}>
        <planeGeometry args={[CRT.width, CRT.height]} />
        {paintedMaterial(crops.crt_play, 0.38)}
      </mesh>
      {/* VCR stacked on top, as in the clip */}
      <mesh position={[0, CRT.height + 0.055, -0.02]} castShadow>
        <boxGeometry args={[CRT.width * 0.92, 0.1, CRT.depth * 0.8]} />
        <Solid color="#2e2b33" rough={0.6} />
      </mesh>
      <mesh position={[0.12, CRT.height + 0.055, CRT.depth * 0.4 + 0.002]}>
        <planeGeometry args={[0.1, 0.03]} />
        <meshBasicMaterial color="#7dff9b" />
      </mesh>
      <pointLight position={[0, CRT.height / 2, 0.55]} color="#89a6ff" intensity={hovered ? 1.5 : 0.95} distance={2.2} decay={2} />
    </group>
  );
}

function ToyWallShelf({ crops }: { crops: Crops }) {
  return (
    <group position={[TOY_SHELF.x, TOY_SHELF.y, NORTH_Z + 0.1]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[TOY_SHELF.width, 0.035, 0.19]} />
        <Solid color="#4a2d20" />
      </mesh>
      <mesh position={[0, 0.12, -0.085]}>
        <planeGeometry args={[TOY_SHELF.width, 0.24]} />
        {paintedMaterial(crops.toyshelf, 0.6)}
      </mesh>
    </group>
  );
}

function NeonSaturn() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.elapsedTime;
      ref.current.scale.setScalar(1 + Math.sin(t * 3.1) * 0.012);
    }
  });
  return (
    <group ref={ref} position={[SATURN.x, SATURN.y, NORTH_Z + 0.05]}>
      <mesh>
        <torusGeometry args={[0.1, 0.012, 10, 36]} />
        <meshBasicMaterial color={PALETTE.neonPink} />
      </mesh>
      <mesh rotation={[Math.PI / 2 - 0.35, 0, 0]}>
        <torusGeometry args={[0.16, 0.009, 8, 40]} />
        <meshBasicMaterial color="#ff8ef2" />
      </mesh>
      <pointLight color={PALETTE.neonPink} intensity={1.25} distance={1.8} decay={2} />
    </group>
  );
}

function LavaLamp({ warm, hovered }: { warm: boolean; hovered: boolean }) {
  const blobs = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!blobs.current) return;
    const t = clock.elapsedTime;
    blobs.current.children.forEach((child, i) => {
      child.position.y = Math.sin(t * 0.6 + i * 2.1) * 0.055;
      child.scale.setScalar(0.9 + Math.sin(t * 0.9 + i) * 0.18);
    });
  });
  const target: HoverTarget = {
    id: 'lava-lamp',
    kind: 'prop',
    label: 'Lava lamp',
    hint: warm ? 'Cool the room light down' : 'Warm the room light up',
  };
  return (
    <group position={[LAVA.x, DRESSER.height + 0.025, DRESSER.z + 0.08]} userData={{ interactable: target }}>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.04, 0.055, 0.04, 20]} />
        <Solid color="#23232b" rough={0.5} />
      </mesh>
      <mesh position={[0, 0.135, 0]}>
        <coneGeometry args={[0.038, 0.2, 20, 1, true]} />
        <meshStandardMaterial
          color={warm ? '#e04a1c' : '#d92a62'}
          emissive={warm ? '#ff6a28' : '#ff3f7c'}
          emissiveIntensity={hovered ? 0.95 : 0.65}
          transparent
          opacity={0.72}
          roughness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      <group ref={blobs} position={[0, 0.13, 0]}>
        {[0, 1, 2].map(i => (
          <mesh key={i} position={[0, 0, 0]}>
            <sphereGeometry args={[0.016, 10, 10]} />
            <meshBasicMaterial color="#ffb860" />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.022, 0.016, 0.04, 16]} />
        <Solid color="#23232b" />
      </mesh>
      <pointLight
        position={[0, 0.22, 0.1]}
        color={warm ? '#ff8f4a' : '#ff5c8a'}
        intensity={warm ? 1.7 : 1.2}
        distance={2.4}
        decay={2}
      />
    </group>
  );
}

function BedroomDoor({ crops, hovered }: { crops: Crops; hovered: boolean }) {
  const target: HoverTarget = {
    id: 'door',
    kind: 'prop',
    label: 'Bedroom door',
    hint: 'Locked for now. Pack 02 is behind it',
  };
  return (
    <group position={[DOOR.x, 0, NORTH_Z]} userData={{ interactable: target }}>
      {/* recess so the door reads as a real opening */}
      <mesh position={[0, DOOR.height / 2, -0.055]}>
        <boxGeometry args={[DOOR.width, DOOR.height, 0.1]} />
        <Solid color="#2a1a16" />
      </mesh>
      <mesh position={[0, DOOR.height / 2, 0.016]}>
        <planeGeometry args={[DOOR.width, DOOR.height]} />
        {paintedMaterial(crops.door, hovered ? 0.78 : 0.56)}
      </mesh>
      {/* frame */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[(s * (DOOR.width + 0.08)) / 2, DOOR.height / 2, 0.035]}>
          <boxGeometry args={[0.08, DOOR.height + 0.1, 0.08]} />
          <Solid color="#43281f" />
        </mesh>
      ))}
      <mesh position={[0, DOOR.height + 0.045, 0.035]}>
        <boxGeometry args={[DOOR.width + 0.16, 0.08, 0.08]} />
        <Solid color="#43281f" />
      </mesh>
      {/* coat on the hook beside the frame */}
      <mesh position={[DOOR.width / 2 + 0.17, 1.22, 0.07]}>
        <planeGeometry args={[0.26, 0.86]} />
        {paintedMaterial(crops.coat, 0.5)}
      </mesh>
      <mesh position={[0, 1.02, 0.045]}>
        <sphereGeometry args={[0.025, 10, 10]} />
        <Solid color="#c9ab72" rough={0.35} />
      </mesh>
    </group>
  );
}

/* --------------------------------- shelf ---------------------------------- */

function spineMap(slot: ShelfSlot, crops: Crops) {
  if (slot.spine && crops[slot.spine as CropName]) return crops[slot.spine as CropName];
  const skin = boxSkin(slot);
  return spineStripTexture(slot.id, slot.title, skin.face, skin.ink);
}

function ShelfBox({
  slot,
  y,
  crops,
  hovered,
  pulled,
}: {
  slot: ShelfSlot;
  y: number;
  crops: Crops;
  hovered: boolean;
  pulled: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const boxWidth = SHELF.width - 0.1;
  const boxDepth = SHELF.depth - 0.11;
  const target: HoverTarget = {
    id: `game:${slot.id}`,
    kind: 'game',
    gameId: slot.id,
    label: slot.title,
    hint: 'Pull the box off the shelf',
  };

  useFrame((_, delta) => {
    if (!group.current) return;
    const want = pulled ? 0.26 : hovered ? 0.065 : 0;
    group.current.position.z += (want - group.current.position.z) * Math.min(1, delta * 9);
  });

  return (
    <group ref={group} position={[0, y + slot.boxHeight / 2 + 0.02, 0]} userData={{ interactable: target }}>
      <mesh castShadow>
        <boxGeometry args={[boxWidth, slot.boxHeight, boxDepth]} />
        <meshStandardMaterial color={slot.color} roughness={0.9} />
      </mesh>
      {/* spine faces the room */}
      <mesh position={[0, 0, boxDepth / 2 + 0.003]}>
        <planeGeometry args={[boxWidth, slot.boxHeight]} />
        {paintedMaterial(spineMap(slot, crops), hovered ? 0.95 : 0.6)}
      </mesh>
      {hovered && (
        <mesh position={[0, 0, boxDepth / 2 + 0.012]}>
          <planeGeometry args={[boxWidth + 0.03, slot.boxHeight + 0.03]} />
          <meshBasicMaterial color={slot.accent} transparent opacity={0.22} />
        </mesh>
      )}
    </group>
  );
}

function StringLights({ width, height }: { width: number; height: number }) {
  const bulbs = useMemo(() => {
    const out: { x: number; y: number; color: string }[] = [];
    const colors = ['#ff5f6d', '#ffd166', '#6be5a0', '#6aa8ff', '#e07bff'];
    for (let i = 0; i < 16; i += 1) {
      const t = i / 15;
      out.push({
        x: -width / 2 - 0.02 + Math.sin(t * 7) * 0.02,
        y: height * t,
        color: colors[i % colors.length],
      });
    }
    return out;
  }, [width, height]);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    ref.current.children.forEach((child, i) => {
      const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = 0.55 + Math.sin(t * 1.6 + i * 0.8) * 0.4;
    });
  });
  return (
    <group ref={ref}>
      {bulbs.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, SHELF.depth / 2 + 0.02]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshBasicMaterial color={b.color} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function GameShelfUnit({
  crops,
  hoveredId,
  pulledId,
}: {
  crops: Crops;
  hoveredId: string | null;
  pulledId: string | null;
}) {
  const wood = woodTexture('#54331f', [1, 2]);
  const rows = [...SHELF_SLOTS, ...SHELF_SLOTS_LOWER];
  return (
    <group position={[SHELF.x, 0, SHELF.z]}>
      {/* carcass */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[(s * SHELF.width) / 2, SHELF.height / 2, 0]} castShadow>
          <boxGeometry args={[0.05, SHELF.height, SHELF.depth]} />
          <meshStandardMaterial map={wood} roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, SHELF.height / 2, -SHELF.depth / 2]}>
        <boxGeometry args={[SHELF.width, SHELF.height, 0.03]} />
        <Solid color="#2a1813" />
      </mesh>
      <mesh position={[0, SHELF.height + 0.02, 0]} castShadow>
        <boxGeometry args={[SHELF.width + 0.08, 0.04, SHELF.depth + 0.04]} />
        <meshStandardMaterial map={wood} roughness={0.8} />
      </mesh>

      {/* boards */}
      {SHELF.rowY.map((y, i) => (
        <mesh key={i} position={[0, y, 0]} receiveShadow>
          <boxGeometry args={[SHELF.width - 0.06, 0.028, SHELF.depth - 0.03]} />
          <meshStandardMaterial map={wood} roughness={0.85} />
        </mesh>
      ))}

      {/* boxes */}
      {rows.map(slot => (
        <ShelfBox
          key={slot.id}
          slot={slot}
          y={SHELF.rowY[slot.row] ?? 0.1}
          crops={crops}
          hovered={hoveredId === `game:${slot.id}`}
          pulled={pulledId === slot.id}
        />
      ))}

      {/* top-shelf junk: helmet and smiley lamp from the clip */}
      <mesh position={[-0.22, SHELF.height + 0.13, 0.02]} castShadow>
        <sphereGeometry args={[0.1, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshStandardMaterial color="#7b2bb0" roughness={0.45} />
      </mesh>
      <mesh position={[0.16, SHELF.height + 0.13, 0.02]}>
        <sphereGeometry args={[0.1, 18, 18]} />
        <meshStandardMaterial color="#ffd93d" emissive="#ffd93d" emissiveIntensity={0.85} roughness={0.5} />
      </mesh>
      <pointLight position={[0.16, SHELF.height + 0.13, 0.2]} color="#ffdf6e" intensity={0.8} distance={1.6} decay={2} />

      <StringLights width={SHELF.width} height={SHELF.height} />
      <pointLight position={[0, 1.25, 0.7]} color="#ffb780" intensity={0.95} distance={2.3} decay={2} />
    </group>
  );
}

/* ------------------------------- furniture -------------------------------- */

function Bed({ crops, hovered }: { crops: Crops; hovered: boolean }) {
  const wood = woodTexture('#4a2c1d', [1, 1]);
  const target: HoverTarget = {
    id: 'bed',
    kind: 'prop',
    label: 'Bed',
    hint: 'Trivia night lives on the quilt',
  };
  return (
    <group position={[BED.x, 0, BED.z]} userData={{ interactable: target }}>
      {/* frame */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[BED.width + 0.08, 0.4, BED.length + 0.08]} />
        <meshStandardMaterial map={wood} roughness={0.85} />
      </mesh>
      {/* mattress + quilt */}
      <mesh position={[0, BED.top - 0.08, 0]} castShadow>
        <boxGeometry args={[BED.width, 0.16, BED.length]} />
        <meshStandardMaterial color="#d8cfc2" roughness={0.95} />
      </mesh>
      <mesh position={[0, BED.top + 0.004, 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BED.width + 0.02, BED.length * 0.82]} />
        {paintedMaterial(crops.bed_quilt, hovered ? 0.78 : 0.6)}
      </mesh>
      {/* pillow at the far end */}
      <mesh position={[0, BED.top + 0.045, -BED.length / 2 + 0.22]} rotation={[-Math.PI / 2 + 0.22, 0, 0]}>
        <planeGeometry args={[BED.width - 0.04, 0.42]} />
        {paintedMaterial(crops.bed_pillow, 0.62)}
      </mesh>
      {/* headboard */}
      <mesh position={[0, 0.62, -BED.length / 2 - 0.05]} castShadow>
        <boxGeometry args={[BED.width + 0.08, 0.72, 0.07]} />
        <meshStandardMaterial map={wood} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Nightstand({ crops }: { crops: Crops }) {
  return (
    <group position={[NIGHTSTAND.x, 0, NIGHTSTAND.z]}>
      <mesh position={[0, NIGHTSTAND.top / 2, 0]} castShadow>
        <boxGeometry args={[NIGHTSTAND.width, NIGHTSTAND.top, NIGHTSTAND.depth]} />
        <meshStandardMaterial map={woodTexture('#4e2f20', [1, 1])} roughness={0.85} />
      </mesh>
      <mesh position={[0, NIGHTSTAND.top / 2, NIGHTSTAND.depth / 2 + 0.005]}>
        <planeGeometry args={[NIGHTSTAND.width, NIGHTSTAND.top]} />
        {paintedMaterial(crops.nightstand_west, 0.52)}
      </mesh>
      {/* table lamp */}
      <mesh position={[0, NIGHTSTAND.top + 0.12, 0]}>
        <cylinderGeometry args={[0.07, 0.1, 0.24, 18]} />
        <meshStandardMaterial color="#f3dcb0" emissive="#ffcf92" emissiveIntensity={0.9} roughness={0.7} />
      </mesh>
      <pointLight position={[0, NIGHTSTAND.top + 0.2, 0]} color={PALETTE.lampWarm} intensity={1.5} distance={2.7} decay={2} />
    </group>
  );
}

function EastDesk({ crops }: { crops: Crops }) {
  const wood = woodTexture('#56331f', [1, 1]);
  return (
    <group position={[EAST_DESK.x, 0, EAST_DESK.z]}>
      <mesh position={[0, EAST_DESK.top, 0]} castShadow receiveShadow>
        <boxGeometry args={[EAST_DESK.depth, 0.05, EAST_DESK.length]} />
        <meshStandardMaterial map={wood} roughness={0.8} />
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} position={[0, EAST_DESK.top / 2, (s * (EAST_DESK.length - 0.14)) / 2]}>
          <boxGeometry args={[EAST_DESK.depth - 0.06, EAST_DESK.top, 0.07]} />
          <meshStandardMaterial map={wood} roughness={0.85} />
        </mesh>
      ))}
      {/* beige tower monitor, keyboard and mouse */}
      <group position={[0.06, EAST_DESK.top + 0.03, -0.18]} rotation={[0, -Math.PI / 2 - 0.25, 0]}>
        {/* front shell and tapered tube housing, like a 90s CRT monitor */}
        <mesh position={[0, 0.17, 0.105]} castShadow>
          <boxGeometry args={[0.42, 0.34, 0.15]} />
          <meshStandardMaterial color="#bdb094" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.17, -0.085]} castShadow>
          <boxGeometry args={[0.31, 0.26, 0.23]} />
          <meshStandardMaterial color="#aa9e84" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.012, 0.03]} castShadow>
          <boxGeometry args={[0.34, 0.024, 0.3]} />
          <meshStandardMaterial color="#b3a68c" roughness={0.82} />
        </mesh>
        {/* recessed bezel so the tube reads as a tube, not a white block */}
        <mesh position={[0, 0.18, 0.181]}>
          <planeGeometry args={[0.37, 0.29]} />
          <meshStandardMaterial color="#9c9075" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.02, 0.182]}>
          <planeGeometry args={[0.34, 0.035]} />
          <meshStandardMaterial color="#6f6553" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.183, 0.1825]}>
          <planeGeometry args={[0.32, 0.24]} />
          <meshStandardMaterial
            map={crops.desk_east}
            emissive="#9fd4ff"
            emissiveMap={crops.desk_east}
            emissiveIntensity={0.85}
            roughness={0.3}
          />
        </mesh>
        <pointLight position={[0, 0.18, 0.4]} color="#8fc8ff" intensity={1.1} distance={1.7} decay={2} />
      </group>
      <mesh position={[-0.02, EAST_DESK.top + 0.035, 0.12]} rotation={[0, -0.2, 0]} castShadow>
        <boxGeometry args={[0.18, 0.025, 0.42]} />
        <meshStandardMaterial color="#cdc3ab" roughness={0.8} />
      </mesh>
      <mesh position={[-0.02, EAST_DESK.top + 0.035, 0.46]}>
        <boxGeometry args={[0.07, 0.025, 0.11]} />
        <meshStandardMaterial color="#cdc3ab" roughness={0.8} />
      </mesh>
      {/* gooseneck desk lamp */}
      <group position={[0.02, EAST_DESK.top, -EAST_DESK.length / 2 + 0.2]}>
        <mesh position={[0, 0.17, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.34, 10]} />
          <Solid color="#2f3f3a" />
        </mesh>
        <mesh position={[0, 0.35, 0.06]} rotation={[0.9, 0, 0]}>
          <coneGeometry args={[0.1, 0.12, 18, 1, true]} />
          <meshStandardMaterial color="#2f5b4c" emissive="#ffd89a" emissiveIntensity={0.5} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0, 0.3, 0.18]} color="#ffd9a0" intensity={1.55} distance={2.4} decay={2} />
      </group>
      {/* boxed card games stacked on the desk */}
      {DESK_SLOTS.map((slot, i) => (
        <group key={slot.id} position={[0, EAST_DESK.top + 0.06 + i * slot.boxHeight, 0.62]} userData={{
          interactable: {
            id: `game:${slot.id}`,
            kind: 'game',
            gameId: slot.id,
            label: slot.title,
            hint: 'Pick the box up off the desk',
          } as HoverTarget,
        }}>
          <mesh castShadow>
            <boxGeometry args={[0.34, slot.boxHeight, 0.26]} />
            <meshStandardMaterial color={boxSkin(slot).face} roughness={0.9} />
          </mesh>
          <mesh position={[0, slot.boxHeight / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.34, 0.26]} />
            {paintedMaterial(lidTexture(slot.id, slot.title, boxSkin(slot).face, boxSkin(slot).ink), 0.45)}
          </mesh>
          <mesh position={[0, 0, 0.132]}>
            <planeGeometry args={[0.34, slot.boxHeight]} />
            {paintedMaterial(spineStripTexture(slot.id, slot.title, boxSkin(slot).face, boxSkin(slot).ink), 0.5)}
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DeskChair({ crops }: { crops: Crops }) {
  return (
    <group position={[1.75, 0, -1.1]} rotation={[0, -0.5, 0]}>
      <mesh position={[0, 0.26, 0]}>
        <planeGeometry args={[0.62, 0.9]} />
        {paintedMaterial(crops.deskchair, 0.55)}
      </mesh>
      <mesh position={[0, 0.26, -0.01]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[0.62, 0.9]} />
        {paintedMaterial(crops.deskchair, 0.45)}
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.24, 0.26, 0.05, 16]} />
        <Solid color="#1d1a1c" />
      </mesh>
    </group>
  );
}

function EastTelevision({ crops, hovered }: { crops: Crops; hovered: boolean }) {
  const target: HoverTarget = {
    id: 'east-tv',
    kind: 'prop',
    label: 'Spare TV',
    hint: 'Season standings on tape',
  };
  return (
    <group position={[EAST_TV.x, 0, EAST_TV.z]} userData={{ interactable: target }}>
      <mesh position={[0, EAST_TV.top / 2, 0]} castShadow>
        <boxGeometry args={[EAST_TV.width, EAST_TV.top, EAST_TV.depth]} />
        <meshStandardMaterial map={woodTexture('#4b2d1f', [1, 1])} roughness={0.85} />
      </mesh>
      <mesh position={[0, EAST_TV.top + 0.22, 0]} castShadow>
        <boxGeometry args={[EAST_TV.width - 0.04, 0.44, EAST_TV.depth - 0.08]} />
        <Solid color="#45454f" rough={0.65} />
      </mesh>
      <mesh position={[-EAST_TV.width / 2 + 0.018, EAST_TV.top + 0.22, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[EAST_TV.depth - 0.08, 0.44]} />
        {paintedMaterial(crops.tv_east, hovered ? 1.0 : 0.8)}
      </mesh>
      <pointLight position={[-0.3, EAST_TV.top + 0.22, 0]} color="#7ad8ff" intensity={hovered ? 1.5 : 1.0} distance={2.1} decay={2} />
    </group>
  );
}

function Boombox({ crops, tapeOn, hovered }: { crops: Crops; tapeOn: boolean; hovered: boolean }) {
  const target: HoverTarget = {
    id: 'boombox',
    kind: 'prop',
    label: 'Boombox',
    hint: tapeOn ? 'Stop the tape' : 'Press play on the tape',
  };
  return (
    <group position={[BOOMBOX.x, 0.13, BOOMBOX.z]} userData={{ interactable: target }}>
      <mesh castShadow>
        <boxGeometry args={[0.42, 0.26, 0.15]} />
        <Solid color="#23232a" rough={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.078]}>
        <planeGeometry args={[0.42, 0.26]} />
        {paintedMaterial(crops.boombox, hovered ? 0.95 : 0.62)}
      </mesh>
      {tapeOn &&
        [-0.13, 0.13].map(x => (
          <pointLight key={x} position={[x, 0, 0.2]} color="#ff7ad8" intensity={1.1} distance={1.1} decay={2} />
        ))}
    </group>
  );
}

function CornerDesk() {
  return (
    <group position={[CORNER_DESK.x, 0, CORNER_DESK.z]}>
      <mesh position={[0, CORNER_DESK.top, 0]} castShadow receiveShadow>
        <boxGeometry args={[CORNER_DESK.width, 0.05, CORNER_DESK.depth]} />
        <meshStandardMaterial map={woodTexture('#523120', [1, 1])} roughness={0.8} />
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} position={[(s * (CORNER_DESK.width - 0.1)) / 2, CORNER_DESK.top / 2, 0]}>
          <boxGeometry args={[0.07, CORNER_DESK.top, CORNER_DESK.depth - 0.06]} />
          <meshStandardMaterial map={woodTexture('#523120', [1, 1])} roughness={0.85} />
        </mesh>
      ))}
      {/* stack of books and a lamp */}
      {[0, 1, 2].map(i => (
        <mesh key={i} position={[-0.24, CORNER_DESK.top + 0.045 + i * 0.035, 0]} rotation={[0, i * 0.12, 0]}>
          <boxGeometry args={[0.2, 0.032, 0.14]} />
          <Solid color={['#7a2c2c', '#2c4a7a', '#6a5a2c'][i]} />
        </mesh>
      ))}
      <mesh position={[0.24, CORNER_DESK.top + 0.13, 0]}>
        <cylinderGeometry args={[0.06, 0.09, 0.2, 16]} />
        <meshStandardMaterial color="#f0d9ab" emissive="#ffca8a" emissiveIntensity={0.8} />
      </mesh>
      <pointLight position={[0.24, CORNER_DESK.top + 0.2, 0.1]} color={PALETTE.lampWarm} intensity={1.3} distance={2.4} decay={2} />
    </group>
  );
}

function PlayTable() {
  const wood = woodTexture('#5a3621', [1, 1]);
  return (
    <group position={[PLAY_TABLE.x, 0, PLAY_TABLE.z]}>
      <mesh position={[0, PLAY_TABLE.top, 0]} castShadow receiveShadow>
        <boxGeometry args={[PLAY_TABLE.width, PLAY_TABLE.thickness, PLAY_TABLE.depth]} />
        <meshStandardMaterial map={wood} roughness={0.78} />
      </mesh>
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh key={i} position={[(sx * (PLAY_TABLE.width - 0.12)) / 2, PLAY_TABLE.top / 2, (sz * (PLAY_TABLE.depth - 0.12)) / 2]}>
          <boxGeometry args={[0.055, PLAY_TABLE.top, 0.055]} />
          <meshStandardMaterial map={wood} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Rug() {
  const tex = rugTexture();
  return (
    <mesh position={[RUG.x, 0.004, RUG.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[RUG.radius, 48]} />
      <meshStandardMaterial map={tex} transparent roughness={0.98} />
    </mesh>
  );
}

/** Die-cast cars and loose tapes left on the floor, as in the clip. */
function FloorClutter() {
  const cars = useMemo(
    () => [
      { p: [-0.55, -0.35], r: 0.6, c: '#b32a2a' },
      { p: [0.2, 0.4], r: -0.9, c: '#2a4fb3' },
      { p: [1.05, -0.2], r: 2.1, c: '#c2c2c8' },
      { p: [-1.2, 0.75], r: 1.2, c: '#b38a2a' },
      { p: [0.85, 0.95], r: -0.4, c: '#2a8f5a' },
      { p: [-0.1, -1.75], r: 2.6, c: '#9c2a6a' },
      { p: [1.95, 0.35], r: 0.2, c: '#b33a2a' },
      { p: [-1.6, -1.9], r: -1.4, c: '#3a6ab3' },
    ],
    [],
  );
  const tapes = useMemo(
    () => [
      { p: [-0.95, 1.35], r: 0.3 },
      { p: [0.55, 1.65], r: -0.8 },
      { p: [1.35, -0.75], r: 1.7 },
    ],
    [],
  );
  return (
    <group>
      {cars.map((car, i) => (
        <group key={i} position={[car.p[0], 0.03, car.p[1]]} rotation={[0, car.r, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.13, 0.035, 0.06]} />
            <meshStandardMaterial color={car.c} roughness={0.35} metalness={0.45} />
          </mesh>
          <mesh position={[-0.008, 0.028, 0]}>
            <boxGeometry args={[0.062, 0.025, 0.052]} />
            <meshStandardMaterial color="#1c1c22" roughness={0.3} metalness={0.3} />
          </mesh>
        </group>
      ))}
      {tapes.map((t, i) => (
        <mesh key={i} position={[t.p[0], 0.008, t.p[1]]} rotation={[-Math.PI / 2, 0, t.r]}>
          <planeGeometry args={[0.1, 0.064]} />
          <meshStandardMaterial color="#2b2b33" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function CeilingFan() {
  const blades = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (blades.current) blades.current.rotation.y += delta * 0.55;
  });
  return (
    <group position={[FAN.x, FAN.y, FAN.z]}>
      <mesh position={[0, -0.03, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.1, 12]} />
        <Solid color="#4a3a2c" />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.1, 0.08, 0.08, 16]} />
        <Solid color="#5c4632" rough={0.6} />
      </mesh>
      <group ref={blades} position={[0, -0.14, 0]}>
        {[0, 1, 2, 3, 4].map(i => (
          <mesh key={i} rotation={[0, (i / 5) * Math.PI * 2, 0.06]} position={[Math.cos((i / 5) * Math.PI * 2) * 0.34, 0, Math.sin((i / 5) * Math.PI * 2) * 0.34]}>
            <boxGeometry args={[0.54, 0.012, 0.14]} />
            <Solid color="#54402e" />
          </mesh>
        ))}
      </group>
      {/* three-globe light kit */}
      {[0, 1, 2].map(i => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.1, -0.24, Math.sin(a) * 0.1]}>
            <sphereGeometry args={[0.072, 16, 16]} />
            <meshStandardMaterial color="#ffe8c0" emissive="#ffd59b" emissiveIntensity={1.4} />
          </mesh>
        );
      })}
      <pointLight position={[0, -0.3, 0]} color="#ffd9a8" intensity={3.4} distance={6.0} decay={2} />
    </group>
  );
}

/* -------------------------------------------------------------------------- */

export interface VideoRoomSceneProps {
  hoveredId: string | null;
  pulledGameId: string | null;
  tapeOn: boolean;
  lampsWarm: boolean;
}

export function VideoRoomScene({ hoveredId, pulledGameId, tapeOn, lampsWarm }: VideoRoomSceneProps) {
  const crops = useRoomCrops();
  return (
    <group>
      <ambientLight intensity={0.2} color="#ffd2bd" />
      <hemisphereLight args={['#9e86d6', '#2a150f', 0.24]} />
      <Shell />
      <WallDecals crops={crops} />
      <NorthWindow />
      <Dresser crops={crops} />
      <CrtTelevision crops={crops} hovered={hoveredId === 'crt-tv'} />
      <ToyWallShelf crops={crops} />
      <NeonSaturn />
      <LavaLamp warm={lampsWarm} hovered={hoveredId === 'lava-lamp'} />
      <BedroomDoor crops={crops} hovered={hoveredId === 'door'} />
      <GameShelfUnit crops={crops} hoveredId={hoveredId} pulledId={pulledGameId} />
      <Bed crops={crops} hovered={hoveredId === 'bed'} />
      <Nightstand crops={crops} />
      <CornerDesk />
      <EastDesk crops={crops} />
      <DeskChair crops={crops} />
      <EastTelevision crops={crops} hovered={hoveredId === 'east-tv'} />
      <Boombox crops={crops} tapeOn={tapeOn} hovered={hoveredId === 'boombox'} />
      <PlayTable />
      <Rug />
      <FloorClutter />
      <CeilingFan />
      {/* fill so no corner of the walkable floor goes fully black */}
      <pointLight position={[0, 1.75, 1.3]} color="#b48ce0" intensity={0.65} distance={5.0} decay={2} />
      <pointLight position={[-1.3, 1.3, -1.5]} color="#e09a6e" intensity={0.5} distance={3.6} decay={2} />
    </group>
  );
}

/** Props list is exported for the HUD's "look at" hints. */
export { ROOM_PROPS };
