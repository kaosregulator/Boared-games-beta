import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GRID, ROOM_RECTS, type RoomName, type RoomRect } from '../../games/clue/clueData';
import { sound } from '../../utils/audio';
import { floorTexture, kraftTexture, standeeTexture, wallpaperTexture, type StandeeKind } from './clueArt';
import {
  BOARD_Y,
  FURNITURE,
  PASSAGE_CORNER,
  SCALE,
  SIDE,
  TILE,
  WALL_H,
  doorway,
  type Furniture,
  type Side,
} from './clueBoard';

/**
 * The pop-up mansion. Each room's floor is printed card; its walls are card
 * panels with wallpaper inside and chipboard outside, and they spring up out
 * of the flat board one room after another like a pop-up book. Then the
 * furniture pops up: real little 3D pieces in painted card colours, plus
 * die-cut sticker standees. Walls between the camera and the room fade, like
 * a dollhouse with the front off, so the people inside are never hidden.
 */

const THK = 0.0022;
const noRay = () => null;

const MATS = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, roughness = 0.82, metalness = 0) {
  const key = `${color}|${roughness}|${metalness}`;
  let m = MATS.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    MATS.set(key, m);
  }
  return m;
}

/* -------------------------------- furniture -------------------------------- */
// Built in real metres; the room group scales them down to the board.

type V3 = [number, number, number];

function B({ p, s, c, r = 0.82, m = 0 }: { p: V3; s: V3; c: string; r?: number; m?: number }) {
  return (
    <mesh position={p} material={mat(c, r, m)} raycast={noRay} castShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}

function Cyl({ p, r0, r1, h, c, rough = 0.7, seg = 16, rot }: { p: V3; r0: number; r1: number; h: number; c: string; rough?: number; seg?: number; rot?: V3 }) {
  return (
    <mesh position={p} rotation={rot} material={mat(c, rough)} raycast={noRay}>
      <cylinderGeometry args={[r0, r1, h, seg]} />
    </mesh>
  );
}

function Legs({ w, d, h, c, t = 0.06 }: { w: number; d: number; h: number; c: string; t?: number }) {
  return (
    <>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz]) => (
        <B key={`${sx}${sz}`} p={[(w / 2 - t) * sx, h / 2, (d / 2 - t) * sz]} s={[t, h, t]} c={c} />
      ))}
    </>
  );
}

const WOOD = '#6b4423';
const DARK = '#3e2412';

function Chair({ c = '#7a1f24' }: { c?: string }) {
  return (
    <group>
      <Legs w={0.45} d={0.45} h={0.45} c={DARK} t={0.04} />
      <B p={[0, 0.47, 0]} s={[0.46, 0.06, 0.46]} c={c} />
      <B p={[0, 0.78, -0.21]} s={[0.46, 0.6, 0.05]} c={DARK} />
    </group>
  );
}

function Armchair({ c, w = 0.9 }: { c: string; w?: number }) {
  return (
    <group>
      <B p={[0, 0.22, 0.02]} s={[w, 0.36, 0.84]} c={c} />
      <B p={[0, 0.44, 0.06]} s={[w - 0.3, 0.12, 0.66]} c={new THREE.Color(c).offsetHSL(0, 0, 0.06).getStyle()} />
      <B p={[0, 0.66, -0.33]} s={[w, 0.66, 0.2]} c={c} />
      <B p={[-(w / 2 - 0.08), 0.52, 0.02]} s={[0.16, 0.3, 0.84]} c={c} />
      <B p={[w / 2 - 0.08, 0.52, 0.02]} s={[0.16, 0.3, 0.84]} c={c} />
    </group>
  );
}

function Bookcase() {
  const books = useMemo(() => wallpaperTexture('Library', 1.6, 'bookcase', false), []);
  return (
    <group>
      <B p={[0, 1.0, 0]} s={[1.8, 2.0, 0.4]} c={DARK} />
      <mesh position={[0, 1.0, 0.201]} raycast={noRay}>
        <planeGeometry args={[1.7, 1.9]} />
        <meshStandardMaterial map={books} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Desk() {
  return (
    <group>
      <B p={[0, 0.74, 0]} s={[1.6, 0.06, 0.8]} c={WOOD} />
      <B p={[-0.52, 0.36, 0]} s={[0.5, 0.72, 0.74]} c={DARK} />
      <B p={[0.52, 0.36, 0]} s={[0.5, 0.72, 0.74]} c={DARK} />
      <B p={[0.2, 0.78, 0.05]} s={[0.5, 0.02, 0.36]} c="#2d5a3a" />
      <Cyl p={[-0.55, 0.9, -0.2]} r0={0.02} r1={0.03} h={0.28} c="#b8892f" />
      <Cyl p={[-0.55, 1.06, -0.2]} r0={0.1} r1={0.16} h={0.12} c="#2f7a46" />
    </group>
  );
}

function Billiard() {
  const balls = ['#f4f1e8', '#d7263d', '#f2c14e', '#1f5fb4', '#1a1a1a', '#e07a2b', '#2f9e52'];
  return (
    <group>
      <Legs w={2.4} d={1.2} h={0.66} c={DARK} t={0.14} />
      <B p={[0, 0.72, 0]} s={[2.6, 0.12, 1.4]} c={DARK} />
      <B p={[0, 0.785, 0]} s={[2.36, 0.02, 1.16]} c="#1f7a3a" r={0.95} />
      {balls.map((col, i) => (
        <mesh key={i} position={[-0.6 + (i % 4) * 0.18 + (i > 3 ? 0.4 : 0), 0.82, -0.2 + Math.floor(i / 4) * 0.3]} material={mat(col, 0.3)} raycast={noRay}>
          <sphereGeometry args={[0.04, 10, 8]} />
        </mesh>
      ))}
      <Cyl p={[0.2, 0.81, 0.35]} r0={0.012} r1={0.02} h={1.5} c="#c9a75a" rot={[0, 0, Math.PI / 2]} />
    </group>
  );
}

function Dining() {
  return (
    <group>
      <Legs w={1.0} d={2.4} h={0.72} c={DARK} />
      <B p={[0, 0.75, 0]} s={[1.0, 0.06, 2.4]} c={WOOD} />
      <B p={[0, 0.785, 0]} s={[0.4, 0.01, 2.0]} c="#f2ead8" />
      {[-0.75, 0, 0.75].map(z => (
        <React.Fragment key={z}>
          <group position={[-0.62, 0, z]} rotation={[0, Math.PI / 2, 0]}>
            <Chair />
          </group>
          <group position={[0.62, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
            <Chair />
          </group>
        </React.Fragment>
      ))}
      <group position={[0, 0, -1.35]}>
        <Chair />
      </group>
    </group>
  );
}

function Piano() {
  return (
    <group>
      <Legs w={1.3} d={1.6} h={0.62} c="#111" t={0.09} />
      <B p={[0, 0.78, -0.1]} s={[1.5, 0.32, 1.7]} c="#141414" r={0.25} />
      <B p={[0, 0.72, 0.85]} s={[1.2, 0.08, 0.22]} c="#f4f1e8" r={0.3} />
      <mesh position={[0, 1.18, -0.2]} rotation={[0.55, 0, 0]} material={mat('#1c1c1c', 0.25)} raycast={noRay}>
        <boxGeometry args={[1.45, 0.02, 1.4]} />
      </mesh>
      <group position={[0, 0, 1.4]}>
        <B p={[0, 0.48, 0]} s={[0.8, 0.08, 0.36]} c="#141414" r={0.3} />
        <Legs w={0.8} d={0.36} h={0.46} c="#111" t={0.05} />
      </group>
    </group>
  );
}

function Stove() {
  return (
    <group>
      <B p={[0, 0.45, 0]} s={[1.2, 0.9, 0.7]} c="#2a2a2e" r={0.5} m={0.3} />
      <B p={[-0.25, 0.42, 0.355]} s={[0.45, 0.4, 0.02]} c="#55555c" r={0.4} m={0.4} />
      <B p={[0.3, 0.42, 0.355]} s={[0.35, 0.4, 0.02]} c="#55555c" r={0.4} m={0.4} />
      {[
        [-0.3, -0.15],
        [0.3, -0.15],
        [-0.3, 0.15],
        [0.3, 0.15],
      ].map(([x, z]) => (
        <Cyl key={`${x}${z}`} p={[x, 0.91, z]} r0={0.12} r1={0.12} h={0.02} c="#111" />
      ))}
      <Cyl p={[0.3, 1.02, 0.15]} r0={0.14} r1={0.13} h={0.2} c="#b87333" rough={0.35} />
      <Cyl p={[0, 1.5, -0.25]} r0={0.1} r1={0.1} h={1.2} c="#2a2a2e" />
    </group>
  );
}

function Counter() {
  return (
    <group>
      <B p={[0, 0.43, 0]} s={[2.0, 0.86, 0.6]} c="#7a5a3a" />
      <B p={[0, 0.88, 0]} s={[2.06, 0.05, 0.64]} c="#e8e2d4" r={0.4} />
      <B p={[0.5, 0.86, 0.02]} s={[0.5, 0.06, 0.4]} c="#9aa3ad" r={0.3} m={0.5} />
      <Cyl p={[-0.5, 0.98, 0]} r0={0.1} r1={0.08} h={0.16} c="#f2ead8" />
      <Cyl p={[-0.2, 0.96, 0.05]} r0={0.07} r1={0.07} h={0.12} c="#d7263d" />
    </group>
  );
}

function KitchenTable() {
  return (
    <group>
      <Legs w={1.2} d={0.8} h={0.72} c="#8a6a3a" />
      <B p={[0, 0.75, 0]} s={[1.2, 0.05, 0.8]} c="#c99a5c" />
      <group position={[0, 0, -0.6]}>
        <Chair c="#c99a5c" />
      </group>
      <group position={[0, 0, 0.6]} rotation={[0, Math.PI, 0]}>
        <Chair c="#c99a5c" />
      </group>
      <Cyl p={[0.2, 0.84, 0]} r0={0.1} r1={0.07} h={0.12} c="#f4f1e8" />
    </group>
  );
}

function Clock() {
  return (
    <group>
      <B p={[0, 1.0, 0]} s={[0.5, 2.0, 0.35]} c={DARK} />
      <B p={[0, 2.06, 0]} s={[0.58, 0.14, 0.4]} c={WOOD} />
      <Cyl p={[0, 1.65, 0.18]} r0={0.17} r1={0.17} h={0.02} c="#f4ecd8" rot={[Math.PI / 2, 0, 0]} seg={20} />
      <B p={[0, 0.9, 0.176]} s={[0.24, 0.7, 0.01]} c="#b8892f" r={0.3} m={0.6} />
    </group>
  );
}

function Stairs() {
  const steps = 9;
  return (
    <group>
      {Array.from({ length: steps }, (_, i) => {
        const h = ((i + 1) / steps) * 1.9;
        return <B key={i} p={[0, h / 2, 1.2 - (i + 0.5) * (2.4 / steps)]} s={[1.1, h, 2.4 / steps]} c={i % 2 ? '#7a1f24' : '#8c2a2e'} />;
      })}
      <B p={[-0.58, 1.3, 0]} s={[0.05, 0.05, 2.5]} c={WOOD} />
      {Array.from({ length: 6 }, (_, i) => (
        <B key={`b${i}`} p={[-0.58, 0.25 + i * 0.3, 1.1 - i * 0.42]} s={[0.04, 0.9, 0.04]} c={WOOD} />
      ))}
    </group>
  );
}

function Sideboard() {
  return (
    <group>
      <B p={[0, 0.45, 0]} s={[1.8, 0.9, 0.5]} c={DARK} />
      <B p={[0, 0.92, 0]} s={[1.86, 0.04, 0.54]} c={WOOD} />
      <Cyl p={[-0.5, 1.12, 0]} r0={0.06} r1={0.1} h={0.36} c="#2f4f8a" />
      <Cyl p={[0.4, 1.0, 0]} r0={0.18} r1={0.12} h={0.12} c="#c9a227" rough={0.3} />
    </group>
  );
}

function Globe() {
  return (
    <group>
      <Cyl p={[0, 0.4, 0]} r0={0.04} r1={0.18} h={0.8} c={DARK} />
      <mesh position={[0, 1.0, 0]} material={mat('#2f6aa8', 0.5)} raycast={noRay}>
        <sphereGeometry args={[0.24, 16, 12]} />
      </mesh>
      <mesh position={[0.06, 1.08, 0.12]} material={mat('#5a8a3a', 0.6)} raycast={noRay}>
        <sphereGeometry args={[0.15, 8, 6]} />
      </mesh>
    </group>
  );
}

function RoundTable({ top = WOOD }: { top?: string }) {
  return (
    <group>
      <Cyl p={[0, 0.36, 0]} r0={0.05} r1={0.1} h={0.72} c={DARK} />
      <Cyl p={[0, 0.73, 0]} r0={0.32} r1={0.32} h={0.04} c={top} seg={20} />
      <Cyl p={[0, 0.82, 0]} r0={0.05} r1={0.07} h={0.14} c="#f4f1e8" />
    </group>
  );
}

function CoffeeTable() {
  return (
    <group>
      <Legs w={1.1} d={0.6} h={0.42} c={DARK} t={0.05} />
      <B p={[0, 0.44, 0]} s={[1.1, 0.04, 0.6]} c={WOOD} />
      <B p={[0.2, 0.47, 0]} s={[0.26, 0.03, 0.2]} c="#7a1f24" />
    </group>
  );
}

function Sofa() {
  return <Armchair c="#4a6a3a" w={2.0} />;
}

/** A die-cut sticker on a little folded card stand. */
function Standee({ kind, w, h }: { kind: StandeeKind; w: number; h: number }) {
  const map = useMemo(() => standeeTexture(kind), [kind]);
  return (
    <group>
      <mesh position={[0, h / 2, 0]} raycast={noRay}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={map} alphaTest={0.5} side={THREE.DoubleSide} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.12, -0.12]} rotation={[-0.5, 0, 0]} material={mat('#b89a72')} raycast={noRay}>
        <boxGeometry args={[w * 0.3, 0.3, 0.01]} />
      </mesh>
    </group>
  );
}

function Piece({ it }: { it: Furniture }) {
  switch (it.kind) {
    case 'desk':
      return <Desk />;
    case 'chair':
      return <Chair />;
    case 'armchair':
      return <Armchair c="#7a1f24" />;
    case 'sofa':
      return <Sofa />;
    case 'bookcase':
      return <Bookcase />;
    case 'billiard':
      return <Billiard />;
    case 'dining':
      return <Dining />;
    case 'piano':
      return <Piano />;
    case 'stove':
      return <Stove />;
    case 'counter':
      return <Counter />;
    case 'kitchenTable':
      return <KitchenTable />;
    case 'clock':
      return <Clock />;
    case 'stairs':
      return <Stairs />;
    case 'sideboard':
      return <Sideboard />;
    case 'globe':
      return <Globe />;
    case 'roundTable':
      return <RoundTable />;
    case 'coffeeTable':
      return <CoffeeTable />;
    default: {
      const kind = it.kind.split(':')[1] as StandeeKind;
      const h = kind === 'palm' ? 1.9 : kind === 'armour' ? 1.9 : kind === 'harp' ? 1.6 : kind === 'lamp' ? 1.7 : 1.3;
      return <Standee kind={kind} w={h * (256 / 384)} h={h} />;
    }
  }
}

/* ---------------------------------- walls ---------------------------------- */

interface WallSpec {
  key: string;
  side: Side;
  /** Centre on the board, table-local. */
  x: number;
  z: number;
  len: number;
  /** Turn so the wallpaper faces into the room. */
  yaw: number;
  /** Points out of the room. */
  out: THREE.Vector3;
  tiles: number;
}

function wallsOf(r: RoomRect): WallSpec[] {
  const { side: doorSide, door } = doorway(r.name);
  const x0 = (r.x / GRID - 0.5) * SIDE;
  const z0 = (r.y / GRID - 0.5) * SIDE;
  const x1 = x0 + r.w * TILE;
  const z1 = z0 + r.h * TILE;
  const out: WallSpec[] = [];
  const sides: { side: Side; n: number; start: (i: number) => [number, number]; along: [number, number]; yaw: number; outward: THREE.Vector3; gap: number }[] = [
    { side: 'N', n: r.w, start: i => [x0 + i * TILE, z0], along: [1, 0], yaw: 0, outward: new THREE.Vector3(0, 0, -1), gap: doorSide === 'N' ? door[0] - r.x : -1 },
    { side: 'S', n: r.w, start: i => [x0 + i * TILE, z1], along: [1, 0], yaw: Math.PI, outward: new THREE.Vector3(0, 0, 1), gap: doorSide === 'S' ? door[0] - r.x : -1 },
    { side: 'W', n: r.h, start: i => [x0, z0 + i * TILE], along: [0, 1], yaw: Math.PI / 2, outward: new THREE.Vector3(-1, 0, 0), gap: doorSide === 'W' ? door[1] - r.y : -1 },
    { side: 'E', n: r.h, start: i => [x1, z0 + i * TILE], along: [0, 1], yaw: -Math.PI / 2, outward: new THREE.Vector3(1, 0, 0), gap: doorSide === 'E' ? door[1] - r.y : -1 },
  ];
  sides.forEach(s => {
    // runs of whole tiles either side of the doorway
    const runs: [number, number][] = s.gap < 0 ? [[0, s.n]] : [[0, s.gap], [s.gap + 1, s.n]];
    runs.forEach(([a, b], k) => {
      if (b <= a) return;
      const [sx, sz] = s.start(a);
      const tiles = b - a;
      const len = tiles * TILE;
      // walls at the corners overlap by a card's thickness
      const ext = (a === 0 ? THK / 2 : 0) + (b === s.n ? THK / 2 : 0);
      const shift = ((b === s.n ? THK / 2 : 0) - (a === 0 ? THK / 2 : 0)) / 2;
      out.push({
        key: `${s.side}${k}`,
        side: s.side,
        x: sx + s.along[0] * (len / 2 + shift),
        z: sz + s.along[1] * (len / 2 + shift),
        len: len + ext,
        yaw: s.yaw,
        out: s.outward,
        tiles,
      });
    });
  });
  return out;
}

const EDGE = '#efe4c8';

function Wall({ room, spec, rise, fade }: { room: RoomName; spec: WallSpec; rise: () => number; fade: (spec: WallSpec) => number }) {
  const g = useRef<THREE.Group>(null);
  const mats = useMemo(() => {
    const paper = new THREE.MeshStandardMaterial({ map: wallpaperTexture(room, spec.tiles, spec.key, true), roughness: 0.78, transparent: true });
    const back = new THREE.MeshStandardMaterial({ map: kraftTexture(), color: '#d8c4a4', roughness: 0.95, transparent: true });
    const edge = new THREE.MeshStandardMaterial({ color: EDGE, roughness: 0.9, transparent: true });
    // box faces: +x, -x, +y, -y, +z (into the room), -z (outside)
    return [edge, edge, edge, back, paper, back];
  }, [room, spec.key, spec.tiles]);
  const shown = useRef(1);
  useFrame((_, dt) => {
    const n = g.current;
    if (!n) return;
    const k = rise();
    n.scale.y = Math.max(0.001, k);
    n.visible = k > 0.002;
    const want = fade(spec);
    shown.current += (want - shown.current) * Math.min(1, dt * 8);
    const o = shown.current;
    mats.forEach(m => {
      m.opacity = o;
      m.depthWrite = o > 0.95;
    });
  });
  return (
    <group ref={g} position={[spec.x, BOARD_Y, spec.z]} rotation={[0, spec.yaw, 0]}>
      <mesh position={[0, WALL_H / 2, 0]} material={mats} raycast={noRay} castShadow receiveShadow>
        <boxGeometry args={[spec.len, WALL_H, THK]} />
      </mesh>
    </group>
  );
}

/* ----------------------------------- room ---------------------------------- */

function backOut(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function Room({ r, order, startedAt, raised }: { r: RoomRect; order: number; startedAt: React.MutableRefObject<number | null>; raised: boolean }) {
  const { camera } = useThree();
  const floor = useMemo(() => floorTexture(r.name, r.w, r.h), [r.name, r.w, r.h]);
  const walls = useMemo(() => wallsOf(r), [r]);
  const group = useRef<THREE.Group>(null);
  const floorMat = useRef<THREE.MeshStandardMaterial>(null);
  const props = useRef<(THREE.Group | null)[]>([]);
  const k = useRef(0);
  const local = useRef(new THREE.Vector3());
  const popped = useRef(false);
  const delay = 0.35 + order * 0.22;
  const cx = ((r.x + r.w / 2) / GRID - 0.5) * SIDE;
  const cz = ((r.y + r.h / 2) / GRID - 0.5) * SIDE;

  useFrame(({ clock }) => {
    const t0 = startedAt.current;
    const t = raised && t0 !== null ? clock.elapsedTime - t0 - delay : -1;
    const raw = THREE.MathUtils.clamp(t / 0.55, 0, 1);
    k.current = raw <= 0 ? 0 : backOut(raw);
    if (raw > 0 && !popped.current) {
      popped.current = true;
      sound.playBoardFlap();
    }
    if (floorMat.current) floorMat.current.opacity = THREE.MathUtils.clamp(t / 0.35, 0, 1);
    FURNITURE[r.name].forEach((_, i) => {
      const p = props.current[i];
      if (!p) return;
      const kt = THREE.MathUtils.clamp((t - 0.35 - i * 0.07) / 0.35, 0, 1);
      const s = kt <= 0 ? 0.001 : backOut(kt);
      p.scale.setScalar(Math.max(0.001, s) * SCALE);
      p.visible = kt > 0;
    });
    if (group.current) {
      local.current.copy(camera.position);
      group.current.worldToLocal(local.current);
    }
  });

  // Cut away the walls between the camera and the middle of this room.
  const fade = (spec: WallSpec) => {
    const c = local.current;
    const toCam = new THREE.Vector3(c.x - spec.x, 0, c.z - spec.z);
    const facing = toCam.dot(spec.out) > 0;
    const steep = c.y > 0.9 * Math.hypot(c.x - cx, c.z - cz) + 0.4;
    return facing && !steep ? 0.12 : 1;
  };

  const passage = PASSAGE_CORNER[r.name];

  return (
    <group ref={group}>
      <mesh position={[cx, BOARD_Y + 0.0003, cz]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRay} receiveShadow>
        <planeGeometry args={[r.w * TILE, r.h * TILE]} />
        <meshStandardMaterial ref={floorMat} map={floor} roughness={0.75} transparent opacity={0} />
      </mesh>
      {passage && (
        <group position={[((r.x + passage[0]) / GRID - 0.5) * SIDE, BOARD_Y + 0.0006, ((r.y + passage[1]) / GRID - 0.5) * SIDE]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={noRay}>
            <planeGeometry args={[TILE * 0.62, TILE * 0.62]} />
            <meshStandardMaterial color="#2a1a0e" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.0002, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRay}>
            <ringGeometry args={[TILE * 0.12, TILE * 0.17, 20]} />
            <meshStandardMaterial color="#c9a227" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      )}
      {walls.map(spec => (
        <Wall key={spec.key} room={r.name} spec={spec} rise={() => k.current} fade={fade} />
      ))}
      {FURNITURE[r.name].map((it, i) => (
        <group
          key={`${it.kind}${i}`}
          ref={el => {
            props.current[i] = el;
          }}
          position={[((r.x + it.u) / GRID - 0.5) * SIDE, BOARD_Y, ((r.y + it.v) / GRID - 0.5) * SIDE]}
          rotation={[0, it.rot, 0]}
          scale={0.001}
          visible={false}
        >
          <Piece it={it} />
        </group>
      ))}
    </group>
  );
}

/**
 * All nine rooms. `raised` starts the pop-up: rooms spring up one after
 * another from the far left corner, about two and a half seconds in all.
 */
export function ClueRooms({ raised }: { raised: boolean }) {
  const startedAt = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (raised && startedAt.current === null) startedAt.current = clock.elapsedTime;
    if (!raised) startedAt.current = null;
  });
  // far row first, then towards the player
  const order = useMemo(() => [...ROOM_RECTS].sort((a, b) => a.y + a.x * 0.1 - (b.y + b.x * 0.1)), []);
  return (
    <group>
      {order.map((r, i) => (
        <Room key={r.name} r={r} order={i} startedAt={startedAt} raised={raised} />
      ))}
    </group>
  );
}
