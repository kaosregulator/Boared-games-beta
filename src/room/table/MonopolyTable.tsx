import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { BOARD } from '../../games/monopoly/monopolyData';
import {
  PLAYER_COLOURS,
  aiBuildTarget,
  aiWantsToBuy,
  build,
  buyPending,
  canBuild,
  endTurn,
  newGame,
  rollDice,
  type GameState,
} from '../../games/monopoly/monopolyEngine';
import { pushHud, type HudAction } from './tableHud';
import { londonize } from './monopolyNames';

/**
 * Monopoly on MonopolyClone's board (Bizangel), with the penguin, R2-D2 and
 * robot tokens, houses and hotels, and sounds from DanielGRasmussen's
 * 3d-monopoly. The board is the one the box just unfolded.
 */

const P = '/games/monopoly/';
const SIDE = 0.5;
const BOARD_Y = 0.0062;
/** MonopolyClone's own image constants: 215px corners and 130px tiles on a 1600px board. */
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

const ukName = (i: number) => londonize(BOARD[i].name);

function sfx(name: 'dice' | 'move' | 'cash' | 'build', volume = 0.55) {
  const a = new Audio(`${P}sound/${name}.mp3`);
  a.volume = volume;
  void a.play().catch(() => {});
}

const TOKENS = [
  { file: 'r2d2', name: 'You', height: 0.045 },
  { file: 'penguin', name: 'Penguin', height: 0.038 },
  { file: 'robot', name: 'Robot', height: 0.05 },
];

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

/** Token slots on a tile so two pieces never stand in each other. */
function slot(i: number, seat: number, inJail: boolean) {
  const base = tileCenter(i);
  if (i === 10) {
    // Jail corner: prisoners in the orange cell, visitors on the edge.
    const off = inJail ? new THREE.Vector3(0.012, 0, -0.012) : new THREE.Vector3(-0.022, 0, 0.022);
    return base.add(off).add(new THREE.Vector3((seat - 1) * 0.012, 0, (seat - 1) * -0.006));
  }
  const inn = inward(i);
  const along = new THREE.Vector3(-inn.z, 0, inn.x);
  if (i % 10 === 0) return base.add(new THREE.Vector3((seat - 1) * 0.016, 0, (seat - 1) * 0.012));
  return base.add(along.multiplyScalar((seat - 1) * 0.012)).add(inn.multiplyScalar(-0.008));
}

function Token({ file, height, at, seat, inJail }: { file: string; height: number; at: number; seat: number; inJail: boolean }) {
  const { scene } = useGLTF(`${P}pieces/${file}.glb`);
  const obj = useMemo(() => fitModel(scene, height), [scene, height]);
  const g = useRef<THREE.Group>(null);
  const shown = useRef(at);
  const hop = useRef(0);
  useFrame((_, dt) => {
    const n = g.current;
    if (!n) return;
    // Walk the board a square at a time, with a little hop per square.
    if (shown.current !== at) {
      hop.current += dt / 0.17;
      if (hop.current >= 1) {
        hop.current = 0;
        const forward = (at - shown.current + 40) % 40;
        shown.current = forward > 0 && forward <= 12 ? (shown.current + 1) % 40 : at;
        sfx('move', 0.25);
      }
    }
    const from = slot(shown.current, seat, inJail && shown.current === 10);
    const nextTile = shown.current === at ? at : (shown.current + 1) % 40;
    const to = slot(nextTile, seat, inJail && nextTile === 10);
    const p = from.lerp(to, shown.current === at ? 0 : hop.current);
    p.y += shown.current === at ? 0 : Math.sin(Math.PI * hop.current) * 0.02;
    n.position.copy(p);
    // face along the direction of travel round the board
    const side = Math.floor(shown.current / 10);
    n.rotation.y = [Math.PI / 2, 0, -Math.PI / 2, Math.PI][side] ?? 0;
  });
  return <primitive ref={g} object={obj} />;
}

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

function Dice({ toss }: { toss: Throw | null }) {
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
      const rest = new THREE.Vector3(0.03 + i * 0.03, BOARD_Y + DIE / 2, 0.06 + i * 0.012);
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
      const end = new THREE.Quaternion().setFromEuler(SHOW[toss.values[i]]).premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.3 + i * 0.7));
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
    // owner's marker chip on the outer edge of the deed
    const chip = tileCenter(i).add(inward(i).multiplyScalar(-(CORNER / 2 - 0.012) * SIDE));
    pieces.push(
      <mesh key={`o${i}`} position={[chip.x, BOARD_Y + 0.0015, chip.z]}>
        <cylinderGeometry args={[0.006, 0.006, 0.003, 18]} />
        <meshStandardMaterial color={PLAYER_COLOURS[deed.owner]} roughness={0.4} metalness={0.2} />
      </mesh>,
    );
  });
  return <group>{pieces}</group>;
}

export function MonopolyTable({ onLeave }: { onLeave: () => void }) {
  const [state, setState] = useState<GameState>(() =>
    newGame(TOKENS.map((t, i) => ({ name: t.name, isAI: i > 0, token: t.file, glyph: '' }))),
  );
  const [toss, setToss] = useState<Throw | null>(null);
  const rolling = useRef(false);
  const clock = useRef(0);
  const actor = state.players[state.turn];
  const human = actor && !actor.isAI && state.stage !== 'over';
  const lastBuys = useRef(Object.keys(state.deeds).length);

  useFrame(({ clock: c }) => {
    clock.current = c.elapsedTime;
  });

  const throwDice = () => {
    if (rolling.current) return;
    rolling.current = true;
    const values: [number, number] = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
    const rand = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    // Thrown from the thrower's side of the table.
    const from = state.turn === 0 ? new THREE.Vector3(0.05, 0.12, 0.3) : state.turn === 1 ? new THREE.Vector3(-0.3, 0.12, -0.05) : new THREE.Vector3(0.3, 0.12, -0.1);
    setToss({ values, from, start: clock.current, spin: [rand(), rand()] });
    sfx('dice', 0.6);
    window.setTimeout(() => {
      setState(cur => rollDice(cur, values));
      rolling.current = false;
    }, 1150);
  };

  // AI turns, paced so you can watch the dice and the walk.
  useEffect(() => {
    if (!actor?.isAI || state.stage === 'over') return;
    const timer = window.setTimeout(() => {
      if (rolling.current) return;
      const cur = state;
      if (cur.stage === 'roll') return throwDice();
      if (cur.pendingPurchase !== null) return setState(s => buyPending(s, aiWantsToBuy(s, s.pendingPurchase!)));
      const spot = aiBuildTarget(cur);
      if (spot !== null) {
        sfx('build');
        return setState(s => build(s, spot));
      }
      setState(s => endTurn(s));
    }, 1300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor?.isAI, state.stage, state.turn, state.pendingPurchase, state.log.length]);

  // Buying anything rings the till.
  useEffect(() => {
    const owned = Object.keys(state.deeds).length;
    if (owned > lastBuys.current) sfx('cash');
    lastBuys.current = owned;
  }, [state.deeds]);

  useEffect(() => {
    const actions: HudAction[] = [];
    if (human && state.stage === 'roll') actions.push({ label: 'Roll the dice', onClick: throwDice });
    if (human && state.pendingPurchase !== null) {
      actions.push({ label: `Buy ${ukName(state.pendingPurchase)}`, onClick: () => setState(cur => buyPending(cur, true)) });
      actions.push({ label: 'Pass', onClick: () => setState(cur => buyPending(cur, false)), tone: 'ghost' });
    }
    if (human && state.stage !== 'roll' && state.pendingPurchase === null) {
      actions.push({ label: state.doublesRun > 0 ? 'Roll again' : 'End turn', onClick: () => setState(cur => endTurn(cur)), tone: 'ghost' });
    }
    const buildable = human && state.stage !== 'roll' ? BOARD.filter(sp => canBuild(state, sp.i, 0)) : [];
    buildable.slice(0, 3).forEach(sp =>
      actions.push({
        label: `Build on ${ukName(sp.i)}`,
        onClick: () => {
          sfx('build');
          setState(cur => build(cur, sp.i));
        },
        tone: 'ghost',
      }),
    );
    const over = state.stage === 'over' ? `${state.winner} wins the board. ` : '';
    pushHud({
      title: 'Monopoly',
      note: over + londonize(state.log[0] ?? 'Roll to leave GO.'),
      detail: state.players.map(p => `${p.name} M${p.cash}${p.inJail ? ' (jail)' : ''}${p.bankrupt ? ' (out)' : ''}`).join(' · '),
      onLeave,
      actions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [human, state, onLeave]);
  useEffect(() => () => pushHud(null), []);

  return (
    <group>
      {state.players.map((p, seat) =>
        p.bankrupt ? null : <Token key={p.id} file={TOKENS[seat].file} height={TOKENS[seat].height} at={p.at} seat={seat} inJail={p.inJail} />,
      )}
      <Buildings state={state} />
      <Dice toss={toss} />
    </group>
  );
}

['r2d2', 'penguin', 'robot', 'house', 'hotel'].forEach(f => useGLTF.preload(`${P}pieces/${f}.glb`));
