import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { CheckerBoard, CheckerMove, CheckerPieceColor } from '../../types';
import {
  createInitialCheckersBoard,
  executeCheckerMove,
  getAIMove,
  getAllLegalMovesForColor,
  continuationAfter,
  getContinuationJumps,
} from '../../games/checkers/checkersLogic';
import { sound } from '../../utils/audio';
import { PLAY_TABLE } from '../roomLayout';
import { pushHud } from './tableHud';
import { followAction, setTableView, tableCam, wasDrag, type Shot } from './tableCam';
import { GhostHand } from './GhostHand';
import { useStudioEnv } from './monopolyTokens';

/**
 * Checkers with Kytric's voxel set (CC0): the brown and tan board and its red and black men.
 * Same hands as the chess table: lift a man and carry it, or tap it then a
 * square; jumps must be taken and chains go on with the same man; a crowned
 * man gets a second one stacked on it. The ghost hand plays black.
 */

const T = '/games/tabletop/';
/** Kytric's board: 20.4 units, eight 2.4-unit squares inside a 0.6 rim, 0.6 thick. */
const NATIVE = 20.4;
const BOARD_W = 0.46;
const S = BOARD_W / NATIVE;
const SQ = 2.4 * S;
const LIFT = 0.007;
const SURFACE = LIFT + 0.6 * S;
const MAN_H = 0.4 * S;
const HOVER = 0.05;

const sqPos = (r: number, c: number, y = SURFACE) => new THREE.Vector3((c - 3.5) * SQ, y, (r - 3.5) * SQ);

interface Man {
  id: string;
  color: CheckerPieceColor;
  king: boolean;
  r: number;
  c: number;
  out: number | null;
}

function menFrom(board: CheckerBoard): Man[] {
  const out: Man[] = [];
  board.forEach((row, r) => row.forEach((p, c) => p && out.push({ id: p.id, color: p.color, king: p.isKing, r, c, out: null })));
  return out;
}

const outPos = (color: CheckerPieceColor, n: number) => {
  const side = color === 'black' ? 1 : -1;
  return new THREE.Vector3(side * (BOARD_W / 2 + 0.03 + (n % 3) * 0.038), LIFT * 0.3, side * (0.16 - Math.floor(n / 3) * 0.04));
};

interface Carry {
  id: string;
  from: THREE.Vector3;
  to: THREE.Vector3;
  start: number;
}
const REACH = 0.4;
const UP = 0.15;
const MOVE = 0.5;
const DOWN = 0.15;
const BACK = 0.35;
const total = REACH + UP + MOVE + DOWN;

function carryPose(c: Carry, t: number, out: THREE.Vector3) {
  const k = t - c.start - REACH;
  if (k <= 0) return out.copy(c.from);
  if (k < UP) return out.copy(c.from).setY(c.from.y + (k / UP) * HOVER * 0.7);
  if (k < UP + MOVE) {
    const e = (k - UP) / MOVE;
    const s = e * e * (3 - 2 * e);
    out.copy(c.from).lerp(c.to, s);
    out.y = c.from.y + HOVER * 0.7 + Math.sin(Math.PI * s) * 0.02;
    return out;
  }
  const d = Math.min(1, (k - UP - MOVE) / DOWN);
  return out.copy(c.to).setY(c.to.y + (1 - d) * HOVER * 0.7);
}

function useSet() {
  const env = useStudioEnv();
  const { scene } = useGLTF(`${T}checkers.glb`);
  return useMemo(() => {
    scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      // voxel palette: keep every colour crisp
      if (mat.map) {
        mat.map.magFilter = THREE.NearestFilter;
        mat.map.minFilter = THREE.NearestFilter;
        mat.map.needsUpdate = true;
      }
      // lacquered like a real set, so it holds its colour in a dim room
      mat.roughness = 0.42;
      mat.envMap = env;
      mat.envMapIntensity = 0.9;
    });
    const fit = (name: string) => {
      const src = scene.getObjectByName(name)!.clone(true);
      src.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(src);
      const c = box.getCenter(new THREE.Vector3());
      src.position.set(-c.x, -box.min.y, -c.z);
      const g = new THREE.Group();
      g.add(src);
      g.scale.setScalar(S);
      return g;
    };
    return { board: fit('board'), red: () => fit('red'), black: () => fit('black') };
  }, [env, scene]);
}

function ManMesh({
  man,
  make,
  pose,
  onDown,
}: {
  man: Man;
  make: () => THREE.Group;
  pose: (m: Man, out: THREE.Vector3) => THREE.Vector3;
  onDown: (m: Man, e: { stopPropagation: () => void }) => void;
}) {
  const base = useMemo(() => make(), [make]);
  const crown = useMemo(() => make(), [make]);
  const g = useRef<THREE.Group>(null);
  const shown = useRef(new THREE.Vector3());
  const goal = useRef(new THREE.Vector3());
  const first = useRef(true);
  useFrame((_, dt) => {
    if (!g.current) return;
    pose(man, goal.current);
    if (first.current) {
      shown.current.copy(goal.current);
      first.current = false;
    }
    shown.current.lerp(goal.current, Math.min(1, Math.min(dt, 0.05) * 14));
    g.current.position.copy(shown.current);
  });
  return (
    <group
      ref={g}
      onPointerDown={e => {
        if (e.button === 0) onDown(man, e);
      }}
    >
      <primitive object={base} />
      {man.king && <primitive object={crown} position={[0, MAN_H, 0]} rotation={[0, 0.5, 0]} />}
    </group>
  );
}

const PLAY_VIEW: Shot = { target: [0, 0, 0.03], yaw: 0, pitch: 0.98, dist: 0.7 };

export function CheckersTable({ onLeave }: { onLeave: () => void }) {
  const set = useSet();
  const { camera, raycaster, pointer } = useThree();
  const [board, setBoard] = useState<CheckerBoard>(() => createInitialCheckersBoard());
  const [men, setMen] = useState<Man[]>(() => menFrom(createInitialCheckersBoard()));
  const [turn, setTurn] = useState<CheckerPieceColor>('red');
  /** Mid-chain: only this man may move, and only to jump. */
  const [chain, setChain] = useState<{ r: number; c: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [carry, setCarry] = useState<Carry | null>(null);
  const [note, setNote] = useState('Your move: red. Pick up a man.');
  const [over, setOver] = useState<string | null>(null);
  const [score, setScore] = useState({ you: 0, them: 0 });
  const clock = useRef(0);
  const hand = useRef(new THREE.Vector3());
  const grip = useRef(0);
  const handOn = useRef(false);
  const myHand = useRef(new THREE.Vector3());
  const myGrip = useRef(1);
  const myHandOn = useRef(false);
  const dragAt = useRef(new THREE.Vector3());
  const carryLive = useRef(new THREE.Vector3());
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => setTableView(PLAY_VIEW), []);

  const at = (r: number, c: number) => men.find(m => m.out === null && m.r === r && m.c === c);
  const sel = selected ? men.find(m => m.id === selected) ?? null : null;

  const legalFor = (r: number, c: number): CheckerMove[] => {
    if (chain) return chain.r === r && chain.c === c ? getContinuationJumps(board, r, c) : [];
    return getAllLegalMovesForColor(board, turn).filter(m => m.from.r === r && m.from.c === c);
  };
  const legal = useMemo(() => (sel ? legalFor(sel.r, sel.c) : []), [sel, board, chain, turn]); // eslint-disable-line react-hooks/exhaustive-deps

  const pointerAt = (y: number, out: THREE.Vector3) => {
    raycaster.setFromCamera(pointer, camera);
    plane.constant = -(PLAY_TABLE.h + y);
    if (!raycaster.ray.intersectPlane(plane, hit)) return null;
    return out.set(hit.x - PLAY_TABLE.x, y, hit.z - PLAY_TABLE.z);
  };
  const squareUnder = () => {
    const p = pointerAt(SURFACE, new THREE.Vector3());
    if (!p) return null;
    const c = Math.floor(p.x / SQ + 4);
    const r = Math.floor(p.z / SQ + 4);
    return r >= 0 && r < 8 && c >= 0 && c < 8 ? { r, c } : null;
  };

  /** Play one step; returns whether the same side keeps going (a jump chain). */
  const play = (m: CheckerMove, ai: boolean) => {
    const next = executeCheckerMove(board, m);
    const mover = at(m.from.r, m.from.c)!;
    setMen(list => {
      const taken = list.filter(x => x.out !== null && x.color !== mover.color).length;
      return list.map(x => {
        if (m.captured && x.out === null && x.r === m.captured.r && x.c === m.captured.c) return { ...x, out: taken };
        if (x.id === mover.id) return { ...x, r: m.to.r, c: m.to.c, king: x.king || Boolean(m.becomesKing) };
        return x;
      });
    });
    if (m.captured) sound.playChessCapture();
    else sound.playChessMove();
    setBoard(next);
    setSelected(null);
    const more = continuationAfter(next, m);
    if (more.length) {
      setChain({ r: m.to.r, c: m.to.c });
      setNote(ai ? 'They jump again…' : 'Jump again with the same man.');
      return { next, again: true };
    }
    setChain(null);
    const other: CheckerPieceColor = turn === 'red' ? 'black' : 'red';
    if (!getAllLegalMovesForColor(next, other).length) {
      setOver(turn === 'red' ? 'You win! They have no moves left.' : 'The ghost wins. You have no moves left.');
      setScore(s => (turn === 'red' ? { ...s, you: s.you + 1 } : { ...s, them: s.them + 1 }));
      sound.playVictoryFanfare();
    } else setNote(ai ? 'Your move.' : 'Their move…');
    if (m.becomesKing) setNote(ai ? 'They crowned a king. Your move.' : 'King me! Their move…');
    setTurn(other);
    return { next, again: false };
  };

  // The ghost hand plays black, chains included.
  useEffect(() => {
    if (turn !== 'black' || over || carry) return;
    const t = window.setTimeout(() => {
      const options = chain ? getContinuationJumps(board, chain.r, chain.c) : null;
      const m = options && options.length ? options[0] : getAIMove(board, 'black');
      if (!m) return;
      const mover = at(m.from.r, m.from.c);
      if (!mover) return;
      setCarry({ id: mover.id, from: sqPos(m.from.r, m.from.c), to: sqPos(m.to.r, m.to.c), start: clock.current });
      const side = (m.from.c + m.to.c) / 2 < 3.5 ? -1 : 1;
      followAction({ target: [0, 0, 0], yaw: side * (Math.PI / 2 - 0.4), pitch: 0.45, dist: 0.36 }, 1800, () => carryLive.current);
      window.setTimeout(() => play(m, true), total * 1000);
    }, chain ? 350 : 650);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, over, carry, board, chain]);

  useFrame(({ clock: c }) => {
    clock.current = c.elapsedTime;
    const now = c.elapsedTime;
    if (carry) {
      carryPose(carry, now, carryLive.current);
      const k = now - carry.start;
      handOn.current = k < total + BACK * 0.5;
      if (k < REACH) {
        const e = k / REACH;
        hand.current.lerpVectors(new THREE.Vector3(carry.from.x * 0.4, 0.15, -0.4), carry.from, e * e * (3 - 2 * e));
        grip.current = 0;
      } else if (k < total) {
        hand.current.copy(carryLive.current);
        grip.current = Math.min(1, grip.current + 0.2);
      } else {
        grip.current = Math.max(0, grip.current - 0.15);
        hand.current.y += 0.004;
        hand.current.z -= 0.006;
      }
      if (k > total + BACK) setCarry(null);
    }
    if (dragging && sel) {
      pointerAt(SURFACE + HOVER, dragAt.current);
      myHand.current.copy(dragAt.current);
      myHandOn.current = true;
    } else myHandOn.current = false;
  });

  const pose = (m: Man, out: THREE.Vector3) => {
    if (m.out !== null) return out.copy(outPos(m.color, m.out));
    if (carry && carry.id === m.id) return carryPose(carry, clock.current, out);
    if (m.id === selected) return dragging ? out.copy(dragAt.current) : sqPos(m.r, m.c, SURFACE + HOVER * 0.5);
    return out.copy(sqPos(m.r, m.c));
  };

  const yourTurn = turn === 'red' && !over && !carry;

  const grab = (m: Man, e: { stopPropagation: () => void }) => {
    if (!yourTurn || m.color !== 'red') return;
    if (!legalFor(m.r, m.c).length) {
      setNote(chain ? 'Keep jumping with the same man.' : 'That man has no move. (Jumps must be taken.)');
      return;
    }
    e.stopPropagation();
    tableCam.grabbing = true;
    sound.playPieceSelect();
    setSelected(m.id);
    setDragging(true);
    dragAt.current.copy(sqPos(m.r, m.c, SURFACE + HOVER));
  };

  useEffect(() => {
    if (!dragging) return;
    const up = () => {
      tableCam.grabbing = false;
      setDragging(false);
      const sq = squareUnder();
      if (!sel) return;
      const m = sq && legal.find(x => x.to.r === sq.r && x.to.c === sq.c);
      if (m) {
        play(m, false);
        return;
      }
      if (!(sq && sq.r === sel.r && sq.c === sel.c)) setSelected(null);
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, sel, legal]);

  const tapSquare = () => {
    if (!yourTurn || !sel || dragging || wasDrag()) return;
    const sq = squareUnder();
    const m = sq && legal.find(x => x.to.r === sq.r && x.to.c === sq.c);
    if (m) play(m, false);
    else setSelected(null);
  };

  const reset = () => {
    const b = createInitialCheckersBoard();
    setBoard(b);
    setMen(menFrom(b));
    setTurn('red');
    setChain(null);
    setSelected(null);
    setCarry(null);
    setOver(null);
    setNote('Your move: red. Pick up a man.');
    setTableView(PLAY_VIEW);
  };

  useEffect(() => {
    pushHud({
      title: 'Checkers',
      note: over ?? (turn === 'red' ? note : 'Their move…'),
      detail: `You ${score.you} · Ghost ${score.them} · jumps must be taken`,
      onLeave,
      actions: [{ label: over ? 'Play again' : 'New game', onClick: reset, tone: over ? undefined : 'ghost' }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, over, turn, score, onLeave]);
  useEffect(() => () => pushHud(null), []);
  useEffect(
    () => () => {
      tableCam.grabbing = false;
    },
    [],
  );

  return (
    <group>
      <primitive object={set.board} position={[0, LIFT, 0]} />
      <mesh position={[0, SURFACE + 0.0004, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={tapSquare}>
        <planeGeometry args={[SQ * 8, SQ * 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {sel &&
        legal.map(m => (
          <mesh key={`${m.to.r}${m.to.c}`} position={sqPos(m.to.r, m.to.c, SURFACE + 0.0008)} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[SQ * 0.2, 24]} />
            <meshBasicMaterial color={m.captured ? '#ffb02e' : '#7CF29A'} transparent opacity={0.9} depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
      {men.map(m => (
        <ManMesh key={m.id} man={m} make={m.color === 'red' ? set.red : set.black} pose={pose} onDown={grab} />
      ))}
      <GhostHand at={hand.current} grip={grip} visible={handOn} from={Math.PI} tint="#c9b8ff" />
      <GhostHand at={myHand.current} grip={myGrip} visible={myHandOn} from={0} tint="#bfe3ff" />
    </group>
  );
}

useGLTF.preload(`${T}checkers.glb`);
