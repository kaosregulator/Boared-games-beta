import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { BOARD, CHANCE, GROUP_COLORS, type Card } from '../../games/monopoly/monopolyData';
import {
  PLAYER_COLOURS,
  aiBuildTarget,
  aiWantsToBuy,
  auctionBid,
  auctionPass,
  build,
  buyPending,
  canBuild,
  canMortgage,
  canSellBuilding,
  canTrade,
  canUnmortgage,
  endTurn,
  mortgage,
  newGame,
  proposeTrade,
  rentFor,
  rollDice,
  sellBuilding,
  tradeProblem,
  unmortgage,
  unmortgageCost,
  type GameState,
  type TradeOffer,
} from '../../games/monopoly/monopolyEngine';
import { pushHud, type HudAction, type HudChip } from './tableHud';
import { usText } from './monopolyNames';
import { followAction, setTableView, wasDrag, type Shot } from './tableCam';
import {
  BILL_SIZE,
  BOARD_PX,
  CARD_SIZE,
  CHANCE_SPOT,
  CHEST_SPOT,
  DEED_SIZE,
  DENOMS,
  billTexture,
  billsFor,
  OWNER_STRIP,
  cardTexture,
  deedBackTexture,
  deedTexture,
  ownerStripOffset,
  type Denom,
} from './monopolyArt';
import { TOKEN_DEFS, useTokenFactory } from './monopolyTokens';

/**
 * Monopoly on the card table, US edition: the Atlantic City board printed from
 * the engine's own data, silver tokens you pick from up close, dice and a
 * token walk the camera follows, title deeds and paper money laid out in front
 * of each player, Chance and Community Chest cards you lift to read, and
 * houses and hotels from DanielGRasmussen's 3d-monopoly with its sounds.
 */

const P = '/games/monopoly/';
const SIDE = 0.5;
const BOARD_Y = 0.0062;
const CORNER = 215 / 1600;
const TILE = 130 / 1600;
const BAND = 40 / 1600;

/** Tile centre in board-image fractions (0..1, top-left origin). */
function tileUV(i: number): [number, number] {
  const c = CORNER;
  const t = TILE;
  if (i === 0) return [1 - c / 2, 1 - c / 2];
  if (i < 10) return [1 - c - (i - 1) * t - t / 2, 1 - c / 2];
  if (i === 10) return [c / 2, 1 - c / 2];
  if (i < 20) return [c / 2, 1 - c - (i - 11) * t - t / 2];
  if (i === 20) return [c / 2, c / 2];
  if (i < 30) return [c + (i - 21) * t + t / 2, c / 2];
  if (i === 30) return [1 - c / 2, c / 2];
  return [1 - c / 2, c + (i - 31) * t + t / 2];
}

const toWorld = (u: number, v: number) => new THREE.Vector3((u - 0.5) * SIDE, BOARD_Y, (v - 0.5) * SIDE);

function tileCenter(i: number) {
  const [u, v] = tileUV(i);
  return toWorld(u, v);
}

/** Inward direction (towards the board centre) for a tile's side. */
function inward(i: number) {
  if (i > 0 && i < 10) return new THREE.Vector3(0, 0, -1);
  if (i > 10 && i < 20) return new THREE.Vector3(1, 0, 0);
  if (i > 20 && i < 30) return new THREE.Vector3(0, 0, 1);
  if (i > 30) return new THREE.Vector3(-1, 0, 0);
  return new THREE.Vector3(0, 0, 0);
}

/** Camera yaw that looks at a tile from outside its own edge of the board. */
function sideYaw(i: number) {
  const side = Math.floor(i / 10) % 4;
  return [0, -Math.PI / 2, Math.PI, Math.PI / 2][side];
}

/** Where the colour band sits on a street, for houses. */
function bandSpot(i: number, n: number, of: number) {
  const centre = tileCenter(i);
  const inn = inward(i);
  const along = new THREE.Vector3(-inn.z, 0, inn.x);
  const depth = (CORNER / 2 - BAND / 2) * SIDE;
  return centre
    .clone()
    .add(inn.clone().multiplyScalar(depth))
    .add(along.multiplyScalar(((n - (of - 1) / 2) * TILE * SIDE) / (of + 0.6)));
}

function sfx(file: 'dice' | 'move' | 'cash' | 'build', volume = 0.55) {
  const a = new Audio(`${P}sound/${file}.mp3`);
  a.volume = volume;
  void a.play().catch(() => {});
}

function fitModel(src: THREE.Object3D, height: number) {
  const root = src.clone(true);
  const box = new THREE.Box3().setFromObject(root);
  const dims = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  root.position.set(-c.x, -box.min.y, -c.z);
  const g = new THREE.Group();
  g.add(root);
  g.scale.setScalar(height / dims.y);
  return g;
}

/** Token slots on a tile so pieces never stand in each other. */
function slot(i: number, seat: number, inJail: boolean) {
  const base = tileCenter(i);
  const k = seat - 1.5;
  if (i === 10) {
    // Jail corner: prisoners in the orange cell, visitors round the edge.
    const off = inJail ? new THREE.Vector3(0.014, 0, -0.014) : new THREE.Vector3(-0.024, 0, 0.024);
    return base.add(off).add(new THREE.Vector3(k * 0.011, 0, k * -0.006));
  }
  if (i % 10 === 0) return base.add(new THREE.Vector3(k * 0.014, 0, k * 0.011));
  const inn = inward(i);
  const along = new THREE.Vector3(-inn.z, 0, inn.x);
  return base.add(along.multiplyScalar(k * 0.0095)).add(inn.multiplyScalar(-0.01));
}

/* ---------------------------------- tokens ---------------------------------- */

interface TokenProps {
  build: (id: string) => THREE.Group;
  id: string;
  at: number;
  seat: number;
  inJail: boolean;
  live: THREE.Vector3;
  onArrive: () => void;
  onStep: () => void;
  onInspect?: () => void;
}

/**
 * Walks the board a square at a time with a little hop, backwards too
 * ("Go back three spaces"), quicker for a long card move; a trip to jail is a
 * flight. `live` always holds where it is, for the camera.
 */
function Token({ build: make, id, at, seat, inJail, live, onArrive, onStep, onInspect }: TokenProps) {
  const obj = useMemo(() => make(id), [make, id]);
  const g = useRef<THREE.Group>(null);
  const shown = useRef(at);
  const hop = useRef(0);
  const flying = useRef<null | { from: THREE.Vector3; k: number }>(null);
  const heading = useRef(0);
  const arrived = useRef(true);

  useFrame((_, dtRaw) => {
    const n = g.current;
    if (!n) return;
    const dt = Math.min(dtRaw, 0.05);
    if (shown.current !== at && !flying.current) {
      arrived.current = false;
      const forward = (at - shown.current + 40) % 40;
      const back = (shown.current - at + 40) % 40;
      if (inJail && at === 10 && forward > 3 && back > 3) {
        flying.current = { from: n.position.clone(), k: 0 };
      } else {
        const steps = Math.min(forward, back <= 3 ? back : 99);
        const per = THREE.MathUtils.clamp(2.8 / Math.max(1, steps), 0.09, 0.2);
        hop.current += dt / per;
        if (hop.current >= 1) {
          hop.current = 0;
          shown.current = back <= 3 && back < forward ? (shown.current + 39) % 40 : (shown.current + 1) % 40;
          onStep();
        }
      }
    }
    let p: THREE.Vector3;
    if (flying.current) {
      const f = flying.current;
      f.k = Math.min(1, f.k + dt / 1.1);
      const to = slot(10, seat, true);
      p = f.from.clone().lerp(to, f.k);
      p.y += Math.sin(Math.PI * f.k) * 0.12;
      if (f.k >= 1) {
        flying.current = null;
        shown.current = at;
        hop.current = 0;
      }
    } else {
      const back = (shown.current - at + 40) % 40;
      const forward = (at - shown.current + 40) % 40;
      const stepBack = back > 0 && back <= 3 && back < forward;
      const nextTile = shown.current === at ? at : stepBack ? (shown.current + 39) % 40 : (shown.current + 1) % 40;
      const from = slot(shown.current, seat, inJail && shown.current === 10);
      const to = slot(nextTile, seat, inJail && nextTile === 10);
      const e = hop.current * hop.current * (3 - 2 * hop.current);
      p = from.lerp(to, shown.current === at ? 0 : e);
      p.y += shown.current === at ? 0 : Math.sin(Math.PI * hop.current) * 0.016;
      // face the way round the board, turning smoothly at the corners
      const side = Math.floor((stepBack ? nextTile : shown.current) / 10) % 4;
      const want = [Math.PI / 2, 0, -Math.PI / 2, Math.PI][side] + (stepBack ? Math.PI : 0);
      let d = want - heading.current;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      heading.current += d * Math.min(1, dt * 10);
    }
    n.position.copy(p);
    n.rotation.y = heading.current;
    live.copy(p);
    if (shown.current === at && !flying.current && !arrived.current) {
      arrived.current = true;
      onArrive();
    }
  });
  return (
    <group ref={g}>
      <primitive object={obj} />
      <mesh
        onClick={e => {
          e.stopPropagation();
          if (!wasDrag()) onInspect?.();
        }}
      >
        <sphereGeometry args={[0.02, 10, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ----------------------------------- dice ----------------------------------- */

/** Pips per face: +x 3, -x 4, +y 1, -y 6, +z 2, -z 5 (opposites sum to seven). */
const FACE_ORDER = [3, 4, 1, 6, 2, 5];
const SHOW: Record<number, THREE.Euler> = {
  1: new THREE.Euler(0, 0, 0),
  6: new THREE.Euler(Math.PI, 0, 0),
  2: new THREE.Euler(-Math.PI / 2, 0, 0),
  5: new THREE.Euler(Math.PI / 2, 0, 0),
  3: new THREE.Euler(0, 0, Math.PI / 2),
  4: new THREE.Euler(0, 0, -Math.PI / 2),
};

interface Throw {
  values: [number, number];
  from: THREE.Vector3;
  start: number;
  spin: THREE.Quaternion[];
}

const DIE = 0.016;
const DICE_REST = new THREE.Vector3(0.045, BOARD_Y + DIE / 2, 0.07);

function Dice({ toss, live }: { toss: Throw | null; live: THREE.Vector3 }) {
  const faces = useTexture([1, 2, 3, 4, 5, 6].map(n => `${P}dice${n}.jpeg`));
  const mats = useMemo(
    () =>
      FACE_ORDER.map(n => {
        const t = faces[n - 1];
        t.colorSpace = THREE.SRGBColorSpace;
        return new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 });
      }),
    [faces],
  );
  const dice = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
  useFrame(({ clock }) => {
    dice.forEach((ref, i) => {
      const m = ref.current;
      if (!m) return;
      const rest = DICE_REST.clone().add(new THREE.Vector3(i * 0.03, 0, i * 0.012));
      if (!toss) {
        m.position.copy(rest);
        return;
      }
      const k = Math.min(1, (clock.elapsedTime - toss.start) / 1.1);
      const e = 1 - (1 - k) ** 3;
      const p = toss.from.clone().add(new THREE.Vector3(i * 0.03, 0, i * 0.012)).lerp(rest, e);
      // two shrinking bounces
      p.y = BOARD_Y + DIE / 2 + Math.abs(Math.sin(k * Math.PI * 2.5)) * 0.06 * (1 - k);
      m.position.copy(p);
      if (i === 0) live.copy(p);
      const end = new THREE.Quaternion()
        .setFromEuler(SHOW[toss.values[i]])
        .premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.3 + i * 0.7));
      m.quaternion.copy(toss.spin[i]).slerp(end, e);
    });
  });
  return (
    <group>
      {dice.map((ref, i) => (
        <mesh key={i} ref={ref} material={mats}>
          <boxGeometry args={[DIE, DIE, DIE]} />
        </mesh>
      ))}
    </group>
  );
}

/* --------------------------------- buildings -------------------------------- */

function Buildings({ state }: { state: GameState }) {
  const house = useGLTF(`${P}pieces/house.glb`).scene;
  const hotel = useGLTF(`${P}pieces/hotel.glb`).scene;
  const models = useMemo(() => {
    const h = fitModel(house, 0.011);
    const H = fitModel(hotel, 0.014);
    const paint = (g: THREE.Object3D, color: string) =>
      g.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.material = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
      });
    // Monopoly's green houses and red hotels.
    paint(h, '#1e9e4a');
    paint(H, '#c42727');
    return { h, H };
  }, [house, hotel]);
  const pieces: React.ReactNode[] = [];
  Object.entries(state.deeds).forEach(([idx, deed]) => {
    const i = Number(idx);
    const yaw = Math.atan2(inward(i).x, inward(i).z);
    if (deed.hotel) {
      pieces.push(<primitive key={`H${i}`} object={models.H.clone()} position={bandSpot(i, 0, 1)} rotation={[0, yaw, 0]} />);
    } else {
      for (let n = 0; n < deed.houses; n += 1) {
        pieces.push(<primitive key={`h${i}-${n}`} object={models.h.clone()} position={bandSpot(i, n, 4)} rotation={[0, yaw, 0]} />);
      }
    }
  });
  return <group>{pieces}</group>;
}

/** The printed board's own surface: the opened leaf's top, a little under where the pieces stand. */
const PRINT_Y = 0.0045;

/**
 * Who owns what, at a glance: a strip in the owner's colour on each bought
 * space, just under its printed name. A mortgaged one shows faded.
 */
function OwnerStrips({ deeds }: { deeds: GameState['deeds'] }) {
  const w = OWNER_STRIP.w * TILE * SIDE;
  const d = OWNER_STRIP.d * CORNER * SIDE;
  return (
    <group>
      {Object.entries(deeds).map(([idx, deed]) => {
        const i = Number(idx);
        const inn = inward(i);
        const pos = tileCenter(i).add(inn.clone().multiplyScalar(-ownerStripOffset(i) * CORNER * SIDE));
        pos.y = PRINT_Y;
        const colour = PLAYER_COLOURS[deed.owner % PLAYER_COLOURS.length];
        return (
          <group key={i} position={pos} rotation={[0, Math.atan2(inn.x, inn.z), 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
              <planeGeometry args={[w, d]} />
              <meshStandardMaterial
                color={colour}
                emissive={colour}
                emissiveIntensity={0.35}
                roughness={0.7}
                transparent={deed.mortgaged}
                opacity={deed.mortgaged ? 0.35 : 1}
                polygonOffset
                polygonOffsetFactor={-2}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ------------------------ deeds and money on the table ---------------------- */

interface Zone {
  /** Where this player's cash starts, and the way their row runs. */
  cash: THREE.Vector3;
  deeds: THREE.Vector3;
  /** Rotation so the paper reads from that player's side. */
  yaw: number;
  /** Direction the deeds and bills line up along. */
  along: THREE.Vector3;
}

/** You on the near side, opponents to the left, across, and to the right. */
const ZONES: Zone[] = [
  { cash: new THREE.Vector3(0.43, 0, 0.08), deeds: new THREE.Vector3(-0.21, 0, 0.305), yaw: 0, along: new THREE.Vector3(0, 0, 1) },
  { cash: new THREE.Vector3(-0.43, 0, 0.14), deeds: new THREE.Vector3(-0.3, 0, -0.2), yaw: Math.PI / 2, along: new THREE.Vector3(0, 0, -1) },
  { cash: new THREE.Vector3(-0.2, 0, -0.31), deeds: new THREE.Vector3(0.0, 0, -0.31), yaw: Math.PI, along: new THREE.Vector3(1, 0, 0) },
  { cash: new THREE.Vector3(0.43, 0, -0.33), deeds: new THREE.Vector3(0.3, 0, -0.33), yaw: -Math.PI / 2, along: new THREE.Vector3(-1, 0, 0) },
];

const PAPER = 0.0004;

function Cash({ cash, zone, scale, onPick }: { cash: number; zone: Zone; scale: number; onPick?: () => void }) {
  const bills = billsFor(cash);
  const w = BILL_SIZE.w * scale;
  const h = BILL_SIZE.h * scale;
  return (
    <group
      position={zone.cash}
      rotation={[0, zone.yaw, 0]}
      onClick={e => {
        e.stopPropagation();
        if (!wasDrag()) onPick?.();
      }}
    >
      {DENOMS.map((d, k) => {
        const n = bills[d];
        if (!n) return null;
        const stack = Math.max(PAPER, n * PAPER);
        // fanned the way people lay their money out, small bills in front
        return (
          <mesh key={d} position={[(k % 2) * 0.012 - 0.006, stack / 2, (k - 3) * h * 0.52]} rotation={[0, (k - 3) * 0.035, 0]}>
            <boxGeometry args={[w, stack, h]} />
            <BillMaterials d={d} />
          </mesh>
        );
      })}
    </group>
  );
}

function BillMaterials({ d }: { d: Denom }) {
  const tex = billTexture(d);
  return (
    <>
      <meshStandardMaterial attach="material-0" color="#efe9dc" roughness={0.9} />
      <meshStandardMaterial attach="material-1" color="#efe9dc" roughness={0.9} />
      <meshStandardMaterial attach="material-2" map={tex} roughness={0.85} />
      <meshStandardMaterial attach="material-3" color="#efe9dc" roughness={0.9} />
      <meshStandardMaterial attach="material-4" color="#efe9dc" roughness={0.9} />
      <meshStandardMaterial attach="material-5" color="#efe9dc" roughness={0.9} />
    </>
  );
}

function Deeds({
  owned,
  mortgaged,
  zone,
  scale,
  onPick,
}: {
  owned: number[];
  mortgaged: (i: number) => boolean;
  zone: Zone;
  scale: number;
  onPick?: (i: number) => void;
}) {
  const w = DEED_SIZE.w * scale;
  const h = DEED_SIZE.h * scale;
  const sorted = [...owned].sort((a, b) => a - b);
  return (
    <group position={zone.deeds} rotation={[0, zone.yaw, 0]}>
      {sorted.map((i, k) => {
        // a set overlaps, groups sit side by side
        const prevSame = k > 0 && BOARD[sorted[k - 1]].group === BOARD[i].group;
        const x = sorted.slice(0, k + 1).reduce((acc, j, n) => acc + (n === 0 ? 0 : BOARD[sorted[n - 1]].group === BOARD[j].group ? w * 0.38 : w * 1.06), 0);
        return (
          <mesh
            key={i}
            position={[x, PAPER * (k + 1) + (prevSame ? PAPER : 0), 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            onClick={e => {
              e.stopPropagation();
              if (!wasDrag()) onPick?.(i);
            }}
          >
            <planeGeometry args={[w, h]} />
            {/* a mortgaged deed lies face down, as the rules say */}
            <meshStandardMaterial map={mortgaged(i) ? deedBackTexture(i) : deedTexture(i)} roughness={0.85} />
          </mesh>
        );
      })}
    </group>
  );
}

function Decks() {
  const spot = (s: { x: number; y: number; rot: number }) =>
    new THREE.Vector3((s.x / BOARD_PX - 0.5) * SIDE, BOARD_Y + 0.002, (s.y / BOARD_PX - 0.5) * SIDE);
  const c = spot(CHANCE_SPOT);
  const k = spot(CHEST_SPOT);
  const deck = (pos: THREE.Vector3, rot: number, kind: 'chance' | 'chest') => (
    <mesh position={pos} rotation={[-Math.PI / 2, 0, -rot]}>
      <boxGeometry args={[CARD_SIZE.w, CARD_SIZE.h, 0.004]} />
      <meshStandardMaterial attach="material-0" color="#e8e2d4" />
      <meshStandardMaterial attach="material-1" color="#e8e2d4" />
      <meshStandardMaterial attach="material-2" color="#e8e2d4" />
      <meshStandardMaterial attach="material-3" color="#e8e2d4" />
      <meshStandardMaterial attach="material-4" map={cardTexture(kind, null)} roughness={0.8} />
      <meshStandardMaterial attach="material-5" color="#e8e2d4" />
    </mesh>
  );
  return (
    <group>
      {deck(c, CHANCE_SPOT.rot, 'chance')}
      {deck(k, CHEST_SPOT.rot, 'chest')}
    </group>
  );
}

/**
 * A card held up to read: a deed you might buy, or the Chance or Community
 * Chest card just drawn. It rises from where it was and hangs in front of the
 * camera, whatever angle the camera is at.
 */
function HeldCard({ tex, w, h, from, onPick }: { tex: THREE.Texture; w: number; h: number; from: THREE.Vector3; onPick?: () => void }) {
  const { camera } = useThree();
  const g = useRef<THREE.Group>(null);
  const k = useRef(0);
  const parentInv = useRef(new THREE.Matrix4());
  useFrame((_, dt) => {
    const n = g.current;
    if (!n || !n.parent) return;
    k.current = Math.min(1, k.current + Math.min(dt, 0.05) / 0.45);
    const e = 1 - (1 - k.current) ** 3;
    // in front of the lens, a little low, like a card held to read
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    // close enough to read, nudged left so the panel on the right never covers it
    const goal = camera.position.clone().add(fwd.multiplyScalar(0.12)).add(right.multiplyScalar(-0.022)).add(new THREE.Vector3(0, -0.006, 0));
    n.parent.updateMatrixWorld();
    parentInv.current.copy(n.parent.matrixWorld).invert();
    goal.applyMatrix4(parentInv.current);
    n.position.copy(from).lerp(goal, e);
    n.quaternion.copy(camera.quaternion);
    const parentQ = new THREE.Quaternion();
    n.parent.getWorldQuaternion(parentQ);
    n.quaternion.premultiply(parentQ.invert());
    n.scale.setScalar(0.4 + 0.6 * e);
  });
  return (
    <group ref={g}>
      <mesh
        onClick={e => {
          e.stopPropagation();
          if (!wasDrag()) onPick?.();
        }}
      >
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** "+$200", "-$50": rises off a player's money and fades. */
function CashPop({ amount, at, onDone }: { amount: number; at: THREE.Vector3; onDone: () => void }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 96;
    const g = c.getContext('2d')!;
    g.font = '800 64px "Bricolage Grotesque", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = 'rgba(0,0,0,0.75)';
    const text = `${amount > 0 ? '+' : '−'}$${Math.abs(amount)}`;
    g.strokeText(text, 128, 50);
    g.fillStyle = amount > 0 ? '#7CF29A' : '#FF8A80';
    g.fillText(text, 128, 50);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [amount]);
  const s = useRef<THREE.Sprite>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += Math.min(dt, 0.05);
    const k = t.current / 1.6;
    if (s.current) {
      s.current.position.set(at.x, at.y + 0.03 + k * 0.05, at.z);
      (s.current.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - k * k);
    }
    if (k >= 1) onDone();
  });
  return (
    <sprite ref={s} scale={[0.08, 0.03, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

/* ------------------------------ choose your piece ---------------------------- */

const PICK_ROW_Z = 0.02;
const pickPos = (k: number) => new THREE.Vector3((k - (TOKEN_DEFS.length - 1) / 2) * 0.042, BOARD_Y, PICK_ROW_Z);

function Picker({ make, pick, onPick }: { make: (id: string) => THREE.Group; pick: number; onPick: (k: number) => void }) {
  const objs = useMemo(() => TOKEN_DEFS.map(t => make(t.id)), [make]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }, dt) => {
    groups.current.forEach((g, k) => {
      if (!g) return;
      const chosen = k === pick;
      const goalY = chosen ? 0.014 : 0;
      g.position.y += (BOARD_Y + goalY - g.position.y) * Math.min(1, dt * 6);
      g.rotation.y = chosen ? clock.elapsedTime * 0.9 : g.rotation.y * 0.9;
      const s = chosen ? 1.25 : 1;
      g.scale.setScalar(g.scale.x + (s - g.scale.x) * Math.min(1, dt * 6));
    });
  });
  return (
    <group>
      {objs.map((o, k) => {
        const p = pickPos(k);
        return (
          <group key={TOKEN_DEFS[k].id}>
            {/* a felt disc under each, lit for the one in hand */}
            <mesh position={[p.x, BOARD_Y + 0.0006, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.018, 32]} />
              <meshStandardMaterial color={k === pick ? '#f6d36b' : '#2c4a3a'} emissive={k === pick ? '#5a4410' : '#000000'} roughness={0.9} />
            </mesh>
            <group
              ref={el => {
                groups.current[k] = el;
              }}
              position={[p.x, BOARD_Y, p.z]}
              onClick={e => {
                e.stopPropagation();
                if (!wasDrag()) onPick(k);
              }}
            >
              <primitive object={o} />
            </group>
          </group>
        );
      })}
    </group>
  );
}

/* ----------------------------------- table ----------------------------------- */

const PLAY_VIEW: Shot = { target: [0, 0, 0.02], yaw: 0, pitch: 0.98, dist: 0.74 };
const OPPONENT_NAMES = ['Mom', 'Dad', 'Jess'];
/** How long a drawn Chance or Community Chest card stays up before it lays itself back down. */
const CARD_UP_MS = 3600;

/** A player's deeds in board order, which also keeps each colour group together. */
function ownedBy(s: GameState, seat: number) {
  return Object.entries(s.deeds)
    .filter(([, d]) => d.owner === seat)
    .map(([i]) => Number(i))
    .sort((a, b) => a - b);
}

/** A deed as a pick in the panel: its colour group, faded while mortgaged. */
function deedChip(s: GameState, i: number, active: boolean, onClick: () => void): HudChip {
  const sp = BOARD[i];
  return { label: sp.short, swatch: sp.group ? GROUP_COLORS[sp.group] : undefined, active, muted: s.deeds[i]?.mortgaged, onClick };
}

/** "2 houses · rent $90", "mortgaged", "rent $25". */
function deedStatus(s: GameState, i: number) {
  const d = s.deeds[i];
  if (!d) return '';
  if (d.mortgaged) return 'mortgaged';
  const parts: string[] = [];
  if (d.hotel) parts.push('hotel');
  else if (d.houses > 0) parts.push(`${d.houses} house${d.houses > 1 ? 's' : ''}`);
  const sp = BOARD[i];
  if (sp.kind === 'utility') parts.push(`rent ${s.deeds[sp.i === 12 ? 28 : 12]?.owner === d.owner ? 10 : 4}× dice`);
  else parts.push(`rent $${rentFor(s, i, 7)}`);
  return parts.join(' · ');
}

/** What the panel at the top right is busy with, if anything besides the turn. */
type Panel =
  | null
  /** Leafing through one player's deeds: `k` is the one held up. */
  | { kind: 'browse'; seat: number; k: number }
  /** Putting a deal together. `to` is null until a partner is picked. */
  | { kind: 'trade'; to: number | null; give: number[]; want: number | null; cash: number; focus: number | null };

export function MonopolyTable({ onLeave }: { onLeave: () => void }) {
  const make = useTokenFactory();
  const [setup, setSetup] = useState<{ pick: number; opponents: number } | null>({ pick: 0, opponents: 2 });
  const [tokens, setTokens] = useState<string[]>([]);
  const [state, setState] = useState<GameState | null>(null);
  const [toss, setToss] = useState<Throw | null>(null);
  const [walking, setWalking] = useState(false);
  /** The Chance or Community Chest card up in front of you, if one is. */
  const [card, setCard] = useState<null | { kind: 'chance' | 'chest'; text: string }>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [pops, setPops] = useState<{ id: number; amount: number; seat: number }[]>([]);
  const rolling = useRef(false);
  const clock = useRef(0);
  const lives = useRef([0, 1, 2, 3].map(() => new THREE.Vector3()));
  const diceLive = useRef(new THREE.Vector3());
  const lastCash = useRef<number[]>([]);
  const lastCard = useRef<Card | null>(null);
  const cardTimer = useRef(0);
  const popId = useRef(0);

  const actor = state?.players[state.turn];
  const human = Boolean(actor && !actor.isAI && state && state.stage !== 'over');

  useFrame(({ clock: c }) => {
    clock.current = c.elapsedTime;
  });

  // Close up on the piece in hand while choosing; the whole board once playing.
  useEffect(() => {
    if (setup) {
      const p = pickPos(setup.pick);
      setTableView({ target: [p.x, 0.02, p.z], yaw: 0, pitch: 0.3, dist: 0.15 });
    } else setTableView(PLAY_VIEW);
  }, [setup]);

  const start = () => {
    if (!setup) return;
    const mine = TOKEN_DEFS[setup.pick].id;
    const others = TOKEN_DEFS.map(t => t.id)
      .filter(id => id !== mine)
      .sort(() => Math.random() - 0.5)
      .slice(0, setup.opponents);
    const ids = [mine, ...others];
    setTokens(ids);
    const s = newGame(ids.map((id, i) => ({ name: i === 0 ? 'You' : OPPONENT_NAMES[i - 1], isAI: i > 0, token: id, glyph: '' })));
    lastCash.current = s.players.map(p => p.cash);
    setState(s);
    setSetup(null);
  };

  const throwDice = () => {
    if (rolling.current || !state || walking) return;
    rolling.current = true;
    const values: [number, number] = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
    const rand = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    // Thrown from the thrower's side of the table.
    const z = ZONES[state.turn];
    const from = new THREE.Vector3(z.cash.x * 0.6, 0.12, z.cash.z * 0.6 + (state.turn === 0 ? 0.2 : 0));
    setToss({ values, from, start: clock.current, spin: [rand(), rand()] });
    sfx('dice', 0.6);
    followAction({ target: [DICE_REST.x, 0.01, DICE_REST.z], yaw: 0.25, pitch: 0.62, dist: 0.3 }, 1200, () => diceLive.current);
    window.setTimeout(() => {
      setState(cur => {
        if (!cur) return cur;
        const next = rollDice(cur, values);
        const p = next.players[cur.turn];
        if (p.at !== cur.players[cur.turn].at) {
          setWalking(true);
          const steps = (p.at - cur.players[cur.turn].at + 40) % 40;
          const seat = cur.turn;
          // walk alongside the token, from outside the board's edge, low
          followAction({ target: [0, 0, 0], yaw: sideYaw(cur.players[cur.turn].at), pitch: 0.46, dist: 0.3 }, Math.min(6000, steps * 220 + 600), () => lives.current[seat]);
        }
        return next;
      });
      rolling.current = false;
    }, 1150);
  };

  const arrived = (seat: number) => {
    if (!state || seat !== state.turn) return;
    setWalking(false);
    const at = state.players[seat].at;
    const c = tileCenter(at);
    followAction({ target: [c.x, 0, c.z], yaw: sideYaw(at) + 0.3, pitch: 0.85, dist: 0.2 }, 1500);
  };

  // A drawn card: lift it to read, then lay it back. Its own timer puts it
  // down; nothing else in the turn can cancel that, so it never stays up.
  const dropCard = () => {
    window.clearTimeout(cardTimer.current);
    setCard(null);
  };
  useEffect(() => {
    const drawn = state?.drawnCard ?? null;
    if (drawn === lastCard.current) return;
    lastCard.current = drawn;
    window.clearTimeout(cardTimer.current);
    if (!drawn) {
      setCard(null);
      return;
    }
    setCard({ kind: CHANCE.some(c => c.text === drawn.text) ? 'chance' : 'chest', text: drawn.text });
    cardTimer.current = window.setTimeout(() => setCard(null), CARD_UP_MS);
  }, [state?.drawnCard]);
  useEffect(() => () => window.clearTimeout(cardTimer.current), []);

  // Leaf through a player's deeds: their token, their money, or one of their deeds.
  const openBrowse = (seat: number, deed?: number) => {
    if (!state) return;
    const k = deed === undefined ? 0 : Math.max(0, ownedBy(state, seat).indexOf(deed));
    dropCard();
    setPanel({ kind: 'browse', seat, k });
  };
  // While a deal is being put together, a deed on the table goes into it instead.
  const pickDeed = (seat: number, i: number) => {
    if (panel?.kind === 'trade' && state) {
      if (seat === 0 && canTrade(state, i, 0)) {
        const give = panel.give.includes(i) ? panel.give.filter(x => x !== i) : [...panel.give, i];
        return setPanel({ ...panel, give, focus: i });
      }
      if (seat !== 0 && canTrade(state, i, seat) && !state.players[seat].bankrupt) {
        // asking for one of another player's deeds makes them the partner
        return setPanel({ ...panel, to: seat, want: i, focus: i, cash: seat === panel.to ? panel.cash : Math.max(0, panel.cash) });
      }
    }
    openBrowse(seat, i);
  };

  // Money changing hands floats off the player's cash.
  useEffect(() => {
    if (!state) return;
    state.players.forEach((p, seat) => {
      const before = lastCash.current[seat] ?? p.cash;
      const diff = p.cash - before;
      if (diff !== 0) {
        popId.current += 1;
        const id = popId.current;
        setPops(list => [...list, { id, amount: diff, seat }]);
        if (diff > 0) sfx('cash', 0.35);
      }
    });
    lastCash.current = state.players.map(p => p.cash);
  }, [state]);

  // AI turns, paced so you can watch the dice and the walk.
  useEffect(() => {
    const auctionAi = Boolean(state?.stage === 'auction' && state.auction && state.players[state.auction.seat]?.isAI);
    if (!state || state.stage === 'over' || walking) return;
    if (!actor?.isAI && !auctionAi) return;
    const timer = window.setTimeout(() => {
      if (rolling.current) return;
      const cur = state;
      if (cur.stage === 'roll') return throwDice();
      if (cur.stage === 'auction' && cur.auction) {
        const bidder = cur.players[cur.auction.seat];
        if (!bidder?.isAI) return;
        const price = BOARD[cur.auction.space].price ?? 0;
        const next = cur.auction.high + 10;
        const afford = bidder.cash - next >= 80 && next <= Math.ceil(price * 1.15);
        return setState(s => (s ? (afford ? auctionBid(s) : auctionPass(s)) : s));
      }
      if (cur.pendingPurchase !== null) return setState(s => (s ? buyPending(s, aiWantsToBuy(s, s.pendingPurchase!)) : s));
      const spot = aiBuildTarget(cur);
      if (spot !== null) {
        sfx('build');
        const c = tileCenter(spot);
        followAction({ target: [c.x, 0, c.z], yaw: sideYaw(spot), pitch: 0.7, dist: 0.2 }, 1300);
        return setState(s => (s ? build(s, spot) : s));
      }
      setState(s => (s ? endTurn(s) : s));
    }, 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor?.isAI, state?.stage, state?.turn, state?.pendingPurchase, state?.auction?.seat, state?.log.length, walking]);

  // The HUD: choosing a piece, then your turn's choices.
  useEffect(() => {
    if (setup) {
      const def = TOKEN_DEFS[setup.pick];
      const step = (d: number) => setSetup(s => (s ? { ...s, pick: (s.pick + d + TOKEN_DEFS.length) % TOKEN_DEFS.length } : s));
      pushHud({
        title: 'Monopoly · Choose your piece',
        note: `${def.label}. Tap a token or step through them.`,
        detail: `${setup.opponents} opponent${setup.opponents > 1 ? 's' : ''} · $1,500 each · US board`,
        onLeave,
        actions: [
          { label: '◀', onClick: () => step(-1), tone: 'ghost' },
          { label: '▶', onClick: () => step(1), tone: 'ghost' },
          {
            label: `Opponents: ${setup.opponents}`,
            onClick: () => setSetup(s => (s ? { ...s, opponents: (s.opponents % 3) + 1 } : s)),
            tone: 'ghost',
          },
          { label: `Play as the ${def.label}`, onClick: start },
        ],
      });
      return;
    }
    if (!state) return;
    const actions: HudAction[] = [];
    const busy = walking || rolling.current;
    // Your own turn, nothing pending: the time to build, mortgage, sell and trade.
    const free =
      human && state.turn === 0 && ['roll', 'end', 'resolve'].includes(state.stage) && state.pendingPurchase === null && !state.auction && !busy;
    const cashLine = state.players
      .map((p, i) => `${p.name} (${TOKEN_DEFS.find(t => t.id === tokens[i])?.label ?? ''}) $${p.cash}${p.inJail ? ' · jail' : ''}${p.bankrupt ? ' · out' : ''}`)
      .join('  ·  ');

    if (panel?.kind === 'trade') {
      const me = state.players[0];
      const partners = state.players.filter(p => p.id !== 0 && !p.bankrupt);
      if (!free || partners.length === 0) {
        setPanel(null);
        return;
      }
      if (panel.to === null) {
        pushHud({
          title: 'Monopoly · Trade',
          note: 'Who do you want to deal with?',
          detail: cashLine,
          onLeave,
          actions: [
            ...partners.map(p => ({ label: `${p.name} · $${p.cash}`, onClick: () => setPanel({ ...panel, to: p.id }) })),
            { label: 'Cancel', onClick: () => setPanel(null), tone: 'ghost' as const },
          ],
        });
        return;
      }
      const them = state.players[panel.to];
      const offer: TradeOffer = { from: 0, to: them.id, give: panel.give, want: panel.want === null ? [] : [panel.want], cash: panel.cash };
      const problem = tradeProblem(state, offer);
      const side = (deeds: number[], cash: number) => [...deeds.map(i => BOARD[i].short), ...(cash > 0 ? [`$${cash}`] : [])].join(' + ') || 'nothing';
      const nudge = (by: number) =>
        setPanel({ ...panel, cash: THREE.MathUtils.clamp(panel.cash + by, -them.cash, me.cash) });
      pushHud({
        title: `Monopoly · Trade with ${them.name}`,
        note:
          offer.give.length + offer.want.length === 0
            ? `Pick what you'd give and what you want from ${them.name}, then make the offer.`
            : `You give ${side(offer.give, Math.max(0, offer.cash))}. You get ${side(offer.want, Math.max(0, -offer.cash))}.`,
        detail: `You have $${me.cash} · ${them.name} has $${them.cash} · deeds with houses in their colour can't be traded`,
        onLeave,
        lists: [
          {
            label: 'You give',
            chips: ownedBy(state, 0)
              .filter(i => canTrade(state, i, 0))
              .map(i => deedChip(state, i, panel.give.includes(i), () => pickDeed(0, i))),
          },
          {
            label: `You want from ${them.name}`,
            chips: ownedBy(state, them.id)
              .filter(i => canTrade(state, i, them.id))
              .map(i =>
                deedChip(state, i, panel.want === i, () =>
                  setPanel({ ...panel, want: panel.want === i ? null : i, focus: panel.want === i ? null : i }),
                ),
              ),
          },
          {
            label: `Cash · ${panel.cash > 0 ? `you add $${panel.cash}` : panel.cash < 0 ? `${them.name} adds $${-panel.cash}` : 'none'}`,
            chips: [
              { label: 'You +$50', onClick: () => nudge(50) },
              { label: 'You +$10', onClick: () => nudge(10) },
              { label: `${them.name} +$10`, onClick: () => nudge(-10) },
              { label: `${them.name} +$50`, onClick: () => nudge(-50) },
              { label: 'No cash', onClick: () => nudge(-panel.cash), active: panel.cash === 0 },
            ],
          },
        ],
        actions: [
          ...(problem
            ? []
            : [
                {
                  label: `Offer it to ${them.name}`,
                  onClick: () => {
                    setState(cur => (cur ? proposeTrade(cur, offer) : cur));
                    setPanel(null);
                  },
                },
              ]),
          ...(partners.length > 1 ? [{ label: 'Someone else', onClick: () => setPanel({ ...panel, to: null, want: null, focus: null }), tone: 'ghost' as const }] : []),
          { label: 'Cancel', onClick: () => setPanel(null), tone: 'ghost' as const },
        ],
      });
      return;
    }

    if (panel?.kind === 'browse') {
      const who = state.players[panel.seat];
      const list = ownedBy(state, panel.seat);
      const k = Math.min(panel.k, Math.max(0, list.length - 1));
      const i = list[k];
      const go = (n: number) => setPanel({ ...panel, k: n });
      const mine = panel.seat === 0;
      const deedActions: HudAction[] = [];
      if (list.length > 1) {
        deedActions.push({ label: '◀ Previous', onClick: () => go((k - 1 + list.length) % list.length), tone: 'ghost' });
        deedActions.push({ label: 'Next ▶', onClick: () => go((k + 1) % list.length), tone: 'ghost' });
      }
      if (mine && free && i !== undefined) {
        const sp = BOARD[i];
        const d = state.deeds[i];
        if (canBuild(state, i, 0)) {
          deedActions.push({
            label: `${d.houses >= 4 ? 'Build a hotel' : 'Build a house'} ($${sp.houseCost})`,
            onClick: () => {
              sfx('build');
              const c = tileCenter(i);
              followAction({ target: [c.x, 0, c.z], yaw: sideYaw(i), pitch: 0.7, dist: 0.2 }, 1300);
              setState(cur => (cur ? build(cur, i) : cur));
            },
          });
        }
        if (canSellBuilding(state, i, 0)) {
          deedActions.push({
            label: `Sell ${d.hotel ? 'the hotel' : 'a house'} (+$${Math.floor((sp.houseCost ?? 0) / 2)})`,
            onClick: () => setState(cur => (cur ? sellBuilding(cur, i) : cur)),
          });
        }
        if (canMortgage(state, i, 0)) {
          deedActions.push({ label: `Mortgage (+$${Math.floor((sp.price ?? 0) / 2)})`, onClick: () => setState(cur => (cur ? mortgage(cur, i) : cur)) });
        }
        if (canUnmortgage(state, i, 0)) {
          deedActions.push({ label: `Lift mortgage ($${unmortgageCost(i)})`, onClick: () => setState(cur => (cur ? unmortgage(cur, i) : cur)) });
        }
      }
      if (!mine && free && !who.bankrupt) {
        deedActions.push({
          label: `Trade with ${who.name}`,
          onClick: () =>
            setPanel({
              kind: 'trade',
              to: who.id,
              give: [],
              want: i !== undefined && canTrade(state, i, who.id) ? i : null,
              cash: 0,
              focus: i !== undefined && canTrade(state, i, who.id) ? i : null,
            }),
          tone: 'ghost',
        });
      }
      deedActions.push({ label: 'Done', onClick: () => setPanel(null), tone: 'ghost' });
      const owner = mine ? 'Your' : `${who.name}'s`;
      let note: string;
      if (i === undefined) note = `${mine ? 'You don’t' : `${who.name} doesn’t`} own any property yet.`;
      else {
        note = `${k + 1} of ${list.length}: ${BOARD[i].name} · ${deedStatus(state, i)}.`;
        if (mine && state.deeds[i].mortgaged && !canUnmortgage(state, i, 0)) note += ` Lifting the mortgage costs $${unmortgageCost(i)}.`;
        if (mine && !free) note += ' You can sell, mortgage and build on your own turn.';
      }
      pushHud({
        title: `Monopoly · ${owner} deeds`,
        note,
        detail: `${who.name === 'You' ? 'You have' : `${who.name} has`} $${who.cash}${who.getOutCards ? ` · ${who.getOutCards} Get Out of Jail Free` : ''}`,
        onLeave,
        lists: list.length ? [{ label: `${list.length} propert${list.length === 1 ? 'y' : 'ies'}`, chips: list.map((j, n) => deedChip(state, j, n === k, () => go(n))) }] : [],
        actions: deedActions,
      });
      return;
    }

    if (human && state.stage === 'roll' && !busy) actions.push({ label: 'Roll the dice', onClick: throwDice });
    if (human && state.pendingPurchase !== null && !walking) {
      const sp = BOARD[state.pendingPurchase];
      actions.push({ label: `Buy ${sp.name} ($${sp.price})`, onClick: () => setState(cur => (cur ? buyPending(cur, true) : cur)) });
      actions.push({ label: 'Pass', onClick: () => setState(cur => (cur ? buyPending(cur, false) : cur)), tone: 'ghost' });
    }
    if (human && state.stage === 'auction' && state.auction?.seat === 0) {
      const next = state.auction.high + 10;
      if (state.players[0].cash >= next) actions.push({ label: `Bid $${next}`, onClick: () => setState(cur => (cur ? auctionBid(cur) : cur)) });
      actions.push({ label: 'Pass bid', onClick: () => setState(cur => (cur ? auctionPass(cur) : cur)), tone: 'ghost' });
    }
    if (human && (state.stage === 'end' || state.stage === 'resolve') && state.pendingPurchase === null && !state.auction && !busy) {
      actions.push({ label: state.doublesRun > 0 ? 'Roll again' : 'End turn', onClick: () => setState(cur => (cur ? endTurn(cur) : cur)), tone: 'ghost' });
    }
    if (free) {
      const mine = ownedBy(state, 0);
      if (mine.length > 0) {
        const manage = mine.some(i => canSellBuilding(state, i, 0) || canMortgage(state, i, 0) || canUnmortgage(state, i, 0));
        actions.push({ label: manage ? 'Sell or mortgage' : 'Your deeds', onClick: () => openBrowse(0), tone: 'ghost' });
      }
      const partners = state.players.filter(p => p.id !== 0 && !p.bankrupt);
      if (partners.length > 0) {
        actions.push({
          label: 'Trade',
          onClick: () => setPanel({ kind: 'trade', to: partners.length === 1 ? partners[0].id : null, give: [], want: null, cash: 0, focus: null }),
          tone: 'ghost',
        });
      }
    }
    if (card) actions.push({ label: 'Put the card down', onClick: dropCard, tone: 'ghost' });
    const buildable = human && (state.stage === 'end' || state.stage === 'resolve') && state.pendingPurchase === null && !state.auction && !busy ? BOARD.filter(sp => canBuild(state, sp.i, 0)) : [];
    buildable.slice(0, 3).forEach(sp =>
      actions.push({
        label: `Build on ${sp.name}`,
        onClick: () => {
          sfx('build');
          const c = tileCenter(sp.i);
          followAction({ target: [c.x, 0, c.z], yaw: sideYaw(sp.i), pitch: 0.7, dist: 0.2 }, 1300);
          setState(cur => (cur ? build(cur, sp.i) : cur));
        },
        tone: 'ghost',
      }),
    );
    if (state.stage === 'over') actions.push({ label: 'New game', onClick: () => (setState(null), setPanel(null), setSetup({ pick: 0, opponents: 2 })) });
    const over = state.stage === 'over' ? `${state.winner} wins the board. ` : '';
    pushHud({
      title: 'Monopoly',
      note: over + usText(state.log[0] ?? 'Roll to leave GO.'),
      detail: `${cashLine}  ·  Tap a token or its money to see the deeds.`,
      onLeave,
      actions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [human, state, setup, walking, onLeave, tokens, panel, card]);
  useEffect(() => () => pushHud(null), []);

  if (setup) {
    return (
      <group>
        <Picker make={make} pick={setup.pick} onPick={k => setSetup(s => (s ? { ...s, pick: k } : s))} />
        <Decks />
      </group>
    );
  }
  if (!state) return null;

  // What is held up to read. A fresh card first, then whatever deed you are
  // looking at, then the deed you landed on and might buy.
  const browsing = panel?.kind === 'browse' ? ownedBy(state, panel.seat) : [];
  const lookDeed =
    panel?.kind === 'browse' ? browsing[Math.min(panel.k, browsing.length - 1)] : panel?.kind === 'trade' ? (panel.focus ?? undefined) : undefined;
  const buyDeed = state.pendingPurchase !== null && !walking && human ? state.pendingPurchase : undefined;
  const deedUp = lookDeed ?? buyDeed;
  const held: null | { kind: 'deed'; i: number } | { kind: 'chance' | 'chest'; text: string } = card
    ? card
    : deedUp !== undefined
      ? { kind: 'deed', i: deedUp }
      : null;
  const heldFrom = held?.kind === 'deed' ? tileCenter(held.i) : new THREE.Vector3(0, BOARD_Y, 0);
  const putDown = () => {
    if (card) dropCard();
    else if (lookDeed !== undefined && panel?.kind === 'browse') setPanel(null);
  };

  return (
    <group>
      {state.players.map((p, seat) =>
        p.bankrupt ? null : (
          <Token
            key={p.id}
            build={make}
            id={tokens[seat]}
            at={p.at}
            seat={seat}
            inJail={p.inJail}
            live={lives.current[seat]}
            onArrive={() => arrived(seat)}
            onStep={() => sfx('move', 0.22)}
            onInspect={() => openBrowse(seat)}
          />
        ),
      )}
      {state.players.map((p, seat) => (
        <group key={`z${seat}`}>
          {!p.bankrupt && <Cash cash={p.cash} zone={ZONES[seat]} scale={seat === 0 ? 0.82 : 0.6} onPick={() => openBrowse(seat)} />}
          <Deeds
            owned={ownedBy(state, seat)}
            mortgaged={i => Boolean(state.deeds[i]?.mortgaged)}
            zone={ZONES[seat]}
            scale={seat === 0 ? 1 : 0.8}
            onPick={i => pickDeed(seat, i)}
          />
        </group>
      ))}
      {state.players.map((p, seat) => (
        <mesh
          key={`m${seat}`}
          position={[ZONES[seat].cash.x, 0.0005, ZONES[seat].cash.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={e => {
            e.stopPropagation();
            if (!wasDrag()) openBrowse(seat);
          }}
        >
          <ringGeometry args={[0.006, 0.0085, 24]} />
          <meshBasicMaterial color={PLAYER_COLOURS[seat]} toneMapped={false} />
        </mesh>
      ))}
      <OwnerStrips deeds={state.deeds} />
      <Buildings state={state} />
      <Decks />
      <Dice toss={toss} live={diceLive.current} />
      {held && (
        <HeldCard
          key={held.kind === 'deed' ? `d${held.i}` : held.text}
          tex={held.kind === 'deed' ? deedTexture(held.i) : cardTexture(held.kind, held.text)}
          w={held.kind === 'deed' ? DEED_SIZE.w : CARD_SIZE.w}
          h={held.kind === 'deed' ? DEED_SIZE.h : CARD_SIZE.h}
          from={heldFrom}
          onPick={putDown}
        />
      )}
      {pops.map(pop => (
        <CashPop key={pop.id} amount={pop.amount} at={ZONES[pop.seat].cash} onDone={() => setPops(l => l.filter(x => x.id !== pop.id))} />
      ))}
    </group>
  );
}

['house', 'hotel'].forEach(f => useGLTF.preload(`${P}pieces/${f}.glb`));
