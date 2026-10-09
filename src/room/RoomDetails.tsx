import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  BED,
  CEILING_LIGHT,
  DRESSER,
  EAST_DESK,
  EAST_TV,
  LIGHT_SWITCH,
  NIGHTSTAND,
  NORTH_Z,
  OFFICE_CHAIR,
  PALETTE,
  SHELF,
  WALL,
  WEST_DESK,
  WOOD_CHAIR,
} from './videoRoom';
import { woodTexture } from './procTextures';
import { ArtSlab, Cutout, PaintedCone, Solid, paintedMaterial, type Crops } from './roomCrops';

/* ------------------------------ west desk --------------------------------- */

/**
 * Student desk under the Run DMC poster. Everything on it is placed where the
 * painting has it: lava lamp at the back-left, alarm clock at the front, blue
 * camera, a short stack of books and the gooseneck lamp on the right.
 */
export function WestDesk({ crops }: { crops: Crops }) {
  const wood = woodTexture('#523120', [1, 1]);
  const { x, z, width, depth, top } = WEST_DESK;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, top - 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.04, depth]} />
        <meshStandardMaterial map={wood} roughness={0.8} />
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} position={[(s * (width - 0.06)) / 2, (top - 0.04) / 2, 0]}>
          <boxGeometry args={[0.05, top - 0.04, depth - 0.04]} />
          <meshStandardMaterial map={wood} roughness={0.85} />
        </mesh>
      ))}
      {/* drawer stack on the right, like the painting */}
      <mesh position={[width / 4 + 0.02, (top - 0.04) / 2, 0]}>
        <boxGeometry args={[width / 2 - 0.1, top - 0.06, depth - 0.08]} />
        <meshStandardMaterial map={wood} roughness={0.85} />
      </mesh>
      {[0.2, 0.42, 0.62].map(y => (
        <mesh key={y} position={[width / 4 + 0.02, y, depth / 2 - 0.035]}>
          <boxGeometry args={[0.1, 0.018, 0.012]} />
          <Solid color="#b89a62" rough={0.4} />
        </mesh>
      ))}
      {/* back modesty panel */}
      <mesh position={[0, (top - 0.04) / 2, -depth / 2 + 0.015]}>
        <boxGeometry args={[width - 0.1, top - 0.04, 0.02]} />
        <Solid color="#3a2218" />
      </mesh>

      {/* lava lamp */}
      <PaintedCone map={crops.lava_west} region={[0.37, 0.27, 0.69, 0.65]} radiusTop={0.024} radiusBottom={0.05} height={0.25} position={[-0.22, top, -0.14]} emissive={0.95} />
      <pointLight position={[-0.23, top + 0.14, -0.05]} color="#ff7a52" intensity={1.0} distance={1.6} decay={2} />
      {/* alarm clock */}
      <ArtSlab map={crops.alarm_clock} size={[0.15, 0.08, 0.06]} position={[-0.15, top + 0.04, 0.12]} color="#121216" emissive={1.1} />
      <pointLight position={[-0.15, top + 0.06, 0.2]} color="#ff3a2a" intensity={0.35} distance={0.7} decay={2} />
      {/* blue camera */}
      <ArtSlab map={crops.camera_blue} size={[0.1, 0.07, 0.05]} position={[0.01, top + 0.035, -0.06]} rotation={[0, -0.3, 0]} color="#27477f" emissive={0.55} />
      {/* books */}
      <ArtSlab map={crops.books_west} size={[0.16, 0.13, 0.14]} position={[0.15, top + 0.065, -0.1]} rotation={[0, 0.12, 0]} color="#3a2a26" emissive={0.5} />
      {/* desk lamp */}
      <Cutout map={crops.desk_lamp_ref} width={0.24} height={0.27} position={[0.26, top, -0.16]} rotation={-0.2} emissive={0.95} />
      <pointLight position={[0.2, top + 0.22, -0.02]} color="#ffd59e" intensity={1.5} distance={2.3} decay={2} />
    </group>
  );
}

/** Blue swivel office chair pulled up to the west desk. */
export function OfficeChair() {
  const { x, z, seat } = OFFICE_CHAIR;
  const fabric = '#161b2a';
  return (
    <group position={[x, 0, z]} rotation={[0, 0.15, 0]}>
      {/* five-star base */}
      {[0, 1, 2, 3, 4].map(i => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.14, 0.03, Math.sin(a) * 0.14]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.3, 0.035, 0.045]} />
            <Solid color="#15151a" rough={0.5} />
          </mesh>
        );
      })}
      {[0, 1, 2, 3, 4].map(i => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={`w${i}`} position={[Math.cos(a) * 0.27, 0.025, Math.sin(a) * 0.27]} rotation={[0, -a, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 0.03, 10]} />
            <Solid color="#0f0f12" rough={0.4} />
          </mesh>
        );
      })}
      <mesh position={[0, seat / 2, 0]}>
        <cylinderGeometry args={[0.028, 0.028, seat - 0.05, 12]} />
        <Solid color="#2a2a30" rough={0.35} />
      </mesh>
      {/* seat cushion */}
      <mesh position={[0, seat, 0]} castShadow>
        <boxGeometry args={[0.47, 0.08, 0.46]} />
        <Solid color={fabric} rough={1} />
      </mesh>
      <mesh position={[0, seat + 0.045, 0.02]}>
        <boxGeometry args={[0.4, 0.02, 0.38]} />
        <Solid color="#1a2033" rough={1} />
      </mesh>
      {/* back rest */}
      <mesh position={[0, seat + 0.33, -0.2]} rotation={[-0.1, 0, 0]} castShadow>
        <boxGeometry args={[0.44, 0.5, 0.07]} />
        <Solid color={fabric} rough={1} />
      </mesh>
      <mesh position={[0, seat + 0.33, -0.16]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[0.36, 0.4, 0.02]} />
        <Solid color="#1a2033" rough={1} />
      </mesh>
      {/* armrests */}
      {[-1, 1].map(s => (
        <group key={s}>
          <mesh position={[s * 0.26, seat + 0.17, -0.02]}>
            <boxGeometry args={[0.05, 0.03, 0.3]} />
            <Solid color="#1a1a20" rough={0.6} />
          </mesh>
          <mesh position={[s * 0.26, seat + 0.09, 0.02]}>
            <boxGeometry args={[0.03, 0.16, 0.03]} />
            <Solid color="#1a1a20" rough={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Plain wooden kitchen chair at the computer desk on the east wall. */
export function WoodChair() {
  const { x, z, seat } = WOOD_CHAIR;
  const wood = woodTexture('#6b4426', [1, 1]);
  return (
    <group position={[x, 0, z]} rotation={[0, Math.PI / 2 + 0.2, 0]}>
      <mesh position={[0, seat, 0]} castShadow>
        <boxGeometry args={[0.42, 0.04, 0.42]} />
        <meshStandardMaterial map={wood} roughness={0.8} />
      </mesh>
      {[
        [-0.18, -0.18],
        [0.18, -0.18],
        [-0.18, 0.18],
        [0.18, 0.18],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, seat / 2, lz]}>
          <cylinderGeometry args={[0.018, 0.022, seat, 10]} />
          <meshStandardMaterial map={wood} roughness={0.85} />
        </mesh>
      ))}
      {[-0.18, 0.18].map(lx => (
        <mesh key={lx} position={[lx, seat + 0.24, -0.19]} rotation={[-0.08, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.02, 0.48, 10]} />
          <meshStandardMaterial map={wood} roughness={0.85} />
        </mesh>
      ))}
      {[0.12, 0.26, 0.4].map(h => (
        <mesh key={h} position={[0, seat + h, -0.19 - h * 0.08]}>
          <boxGeometry args={[0.36, 0.05, 0.02]} />
          <meshStandardMaterial map={wood} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}

/** "RAD" skateboard leaning deck-out against the desk. */
export function Skateboard({ crops }: { crops: Crops }) {
  return (
    <group position={[WEST_DESK.x - WEST_DESK.width / 2 - 0.05, 0.03, WEST_DESK.z + 0.1]} rotation={[-0.3, 0.1, 0]}>
      <mesh position={[0, 0.39, 0]}>
        <boxGeometry args={[0.2, 0.78, 0.014]} />
        <Solid color="#3a2a30" />
      </mesh>
      <mesh position={[0, 0.39, 0.0085]}>
        <planeGeometry args={[0.19, 0.76]} />
        {paintedMaterial(crops.skateboard_ref, 0.6, true)}
      </mesh>
      {[0.18, 0.6].map(y => (
        <group key={y} position={[0, y, -0.03]}>
          <mesh>
            <boxGeometry args={[0.16, 0.03, 0.04]} />
            <Solid color="#9a9aa4" rough={0.4} />
          </mesh>
          {[-1, 1].map(s => (
            <mesh key={s} position={[s * 0.085, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.026, 0.026, 0.03, 12]} />
              <Solid color="#e0b03a" rough={0.5} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* --------------------------------- bed ------------------------------------ */

/** Pillows and the things left lying on the quilt. */
export function BedDressing({ crops }: { crops: Crops }) {
  const head = -BED.length / 2 + 0.26;
  const y = BED.top + 0.004;
  return (
    <group position={[BED.x, 0, BED.z]}>
      {/* patterned pillow across the head of the bed */}
      <mesh position={[-0.05, y + 0.06, head]} rotation={[0.1, 0.04, 0]} scale={[1, 0.36, 0.62]} castShadow>
        <sphereGeometry args={[0.34, 24, 16]} />
        <meshStandardMaterial map={crops.pillow_pattern} emissive="#ffffff" emissiveMap={crops.pillow_pattern} emissiveIntensity={0.28} roughness={1} />
      </mesh>
      {/* smiley cushion propped against it */}
      <mesh position={[-0.14, y + 0.26, head + 0.26]} rotation={[-Math.PI / 2 + 0.42, 0, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.08, 28]} />
        <meshStandardMaterial
          map={crops.pillow_smiley}
          emissive="#ffffff"
          emissiveMap={crops.pillow_smiley}
          emissiveIntensity={0.55}
          transparent
          alphaTest={0.3}
          roughness={0.9}
        />
      </mesh>
      <mesh position={[-0.14, y + 0.26, head + 0.26]} rotation={[-Math.PI / 2 + 0.42, 0, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.078, 28]} />
        <Solid color="#e8a92a" rough={0.95} />
      </mesh>

      {/* Goosebumps paperback, Gushers box and the Game Boy on the quilt */}
      <ArtSlab map={crops.goosebumps} size={[0.19, 0.016, 0.26]} position={[-0.2, y + 0.008, 0.02]} rotation={[0, 0.32, 0]} color="#2a4b3a" emissive={0.55} top />
      <ArtSlab map={crops.gushers} size={[0.15, 0.045, 0.21]} position={[0.22, y + 0.0225, 0.28]} rotation={[0, 0.55, 0]} color="#c43a2a" emissive={0.55} top />
      <ArtSlab map={crops.gameboy} size={[0.09, 0.026, 0.15]} position={[0.03, y + 0.013, 0.62]} rotation={[0, -0.22, 0]} color="#b9b4a6" emissive={0.5} top />
    </group>
  );
}

/* ------------------------------ nightstand -------------------------------- */

export function NightstandTop({ crops }: { crops: Crops }) {
  const { x, z, top } = NIGHTSTAND;
  return (
    <group position={[x, top, z]}>
      <Cutout map={crops.teddy_nightstand} width={0.17} height={0.23} position={[-0.06, 0, -0.06]} rotation={0.25} emissive={0.5} />
      <mesh position={[0.1, 0.045, 0.08]} castShadow>
        <cylinderGeometry args={[0.04, 0.036, 0.09, 18]} />
        {paintedMaterial(crops.mug, 0.5)}
      </mesh>
      <mesh position={[0.1, 0.045, 0.08]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.03, 0.007, 8, 16]} />
        <Solid color="#d8c9b0" rough={0.5} />
      </mesh>
    </group>
  );
}

/* ---------------------------- dresser + wall ------------------------------ */

export function DresserDressing({ crops }: { crops: Crops }) {
  return (
    <group>
      {/* green teddy at the right end of the dresser top */}
      <Cutout map={crops.teddy_green} width={0.17} height={0.23} position={[DRESSER.x + 0.5, DRESSER.height + 0.025, DRESSER.z + 0.08]} rotation={-0.3} emissive={0.55} />
      {/* light switch plate between the lava lamp and the door */}
      <ArtSlab map={crops.light_switch} size={[0.08, 0.12, 0.012]} position={[LIGHT_SWITCH.x, LIGHT_SWITCH.y, NORTH_Z + 0.006]} color="#4a3a46" emissive={0.5} />
    </group>
  );
}

/* ------------------------------ shelf top --------------------------------- */

/** Bills helmet, smiley lamp, Rubik's cube and two figures on top of the shelf. */
export function ShelfTopItems({ crops }: { crops: Crops }) {
  const y = SHELF.height + 0.04;
  return (
    <group position={[SHELF.x, y, SHELF.z]}>
      <Cutout map={crops.figure_shelf_l} width={0.1} height={0.2} position={[-0.4, 0, 0.02]} rotation={0.2} />
      <Cutout map={crops.helmet} width={0.3} height={0.25} position={[-0.18, 0, 0.0]} rotation={-0.15} emissive={0.55} />
      <Cutout map={crops.smiley_plush} width={0.22} height={0.26} position={[0.13, 0, 0.03]} emissive={1.0} />
      <pointLight position={[0.13, 0.14, 0.2]} color="#ffdf6e" intensity={0.9} distance={1.7} decay={2} />
      <ArtSlab map={crops.rubiks} size={[0.06, 0.06, 0.06]} position={[0.32, 0.03, 0.05]} rotation={[0, 0.5, 0]} color="#1a1a1a" emissive={0.6} />
      <Cutout map={crops.figure_shelf_r} width={0.11} height={0.22} position={[0.42, 0, 0.0]} rotation={-0.2} />
    </group>
  );
}

/** Action figures standing on the computer desk and the spare TV. */
export function Figures({ crops }: { crops: Crops }) {
  return (
    <group>
      <Cutout map={crops.figure_spiderman} width={0.12} height={0.2} position={[EAST_DESK.x - 0.22, EAST_DESK.top + 0.025, EAST_DESK.z + 0.26]} rotation={-Math.PI / 2 + 0.3} />
      <Cutout map={crops.figure_mario} width={0.11} height={0.16} position={[EAST_TV.x + 0.08, EAST_TV.top + 0.44, EAST_TV.z + 0.12]} rotation={-Math.PI / 2 - 0.2} emissive={0.6} />
    </group>
  );
}

/* --------------------------------- floor ---------------------------------- */

function ToyCar({ map, position, rotation, color }: { map: THREE.Texture; position: [number, number]; rotation: number; color: string }) {
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.03, 0]} castShadow>
        <boxGeometry args={[0.15, 0.05, 0.07]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.35} />
      </mesh>
      <mesh position={[0, 0.055, 0]}>
        <planeGeometry args={[0.17, 0.11]} />
        {paintedMaterial(map, 0.55, true)}
      </mesh>
      {[-0.045, 0.045].map(wx =>
        [-1, 1].map(s => (
          <mesh key={`${wx}${s}`} position={[wx, 0.02, s * 0.038]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.012, 10]} />
            <Solid color="#111114" rough={0.5} />
          </mesh>
        )),
      )}
    </group>
  );
}

/**
 * Die-cast cars, loose tapes, a green army man, roller skates, a Monopoly box
 * and the baseball bat in the corner, laid out like the painting's floor.
 */
export function FloorProps({ crops }: { crops: Crops }) {
  const cars = useMemo(
    () => [
      { map: crops.car_red, p: [-0.3, -1.9] as [number, number], r: 0.5, c: '#b02a28' },
      { map: crops.car_blue, p: [0.55, -0.25] as [number, number], r: -0.8, c: '#2b4a9c' },
      { map: crops.car_yellow, p: [1.0, -0.55] as [number, number], r: 2.0, c: '#c9a63a' },
      { map: crops.car_blue, p: [-1.25, 0.95] as [number, number], r: 1.1, c: '#2c3f7a' },
      { map: crops.car_yellow, p: [0.05, -1.55] as [number, number], r: 0.2, c: '#b8902a' },
      { map: crops.car_red, p: [1.9, 0.6] as [number, number], r: -0.4, c: '#8c2a30' },
    ],
    [crops],
  );
  return (
    <group>
      {cars.map((car, i) => (
        <ToyCar key={i} map={car.map} position={car.p} rotation={car.r} color={car.c} />
      ))}
      {/* green army man by the dresser */}
      <Cutout map={crops.figure_green} width={0.12} height={0.19} position={[0.3, 0, -1.78]} rotation={0.4} emissive={0.45} />
      {/* tapes dumped in front of the boombox */}
      <mesh position={[1.0, 0.006, -1.78]} rotation={[-Math.PI / 2, 0, 0.3]}>
        <planeGeometry args={[0.34, 0.25]} />
        {paintedMaterial(crops.tapes_floor, 0.5, true)}
      </mesh>
      <mesh position={[-1.15, 0.006, 1.3]} rotation={[-Math.PI / 2, 0, -1.1]}>
        <planeGeometry args={[0.3, 0.22]} />
        {paintedMaterial(crops.tapes_floor, 0.45, true)}
      </mesh>
      {/* roller skates and a Monopoly box left in front of the shelf */}
      <Cutout map={crops.skates} width={0.3} height={0.32} position={[1.9, 0, -1.8]} rotation={0.3} emissive={0.5} />
      <ArtSlab map={crops.mono_box_floor} size={[0.4, 0.06, 0.27]} position={[2.25, 0.03, -1.55]} rotation={[0, 0.45, 0]} color="#1e3f7a" emissive={0.5} top />
      {/* baseball bat leaning in the corner beside the shelf */}
      <group position={[2.5, 0, -1.9]} rotation={[0.16, 0, -0.2]}>
        <mesh position={[0, 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.032, 0.016, 0.84, 12]} />
          <meshStandardMaterial color="#8a5a2e" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 0.03, 12]} />
          <Solid color="#2a1a12" />
        </mesh>
      </group>
    </group>
  );
}

/* -------------------------------- ceiling --------------------------------- */

/** Flush-mount dome light over the shelf end of the room. */
export function CeilingLight({ warm }: { warm: boolean }) {
  return (
    <group position={[CEILING_LIGHT.x, WALL.height, CEILING_LIGHT.z]}>
      <mesh position={[0, -0.012, 0]}>
        <cylinderGeometry args={[0.19, 0.19, 0.024, 24]} />
        <Solid color="#5c4632" rough={0.6} />
      </mesh>
      <mesh position={[0, -0.03, 0]} rotation={[Math.PI, 0, 0]}>
        <sphereGeometry args={[0.16, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ffe9c8" emissive={warm ? '#ffcf96' : '#ffe2bc'} emissiveIntensity={1.2} roughness={0.5} />
      </mesh>
      <pointLight position={[0, -0.22, 0]} color={warm ? PALETTE.lampWarm : '#ffe3c2'} intensity={2.4} distance={5.5} decay={2} />
    </group>
  );
}
