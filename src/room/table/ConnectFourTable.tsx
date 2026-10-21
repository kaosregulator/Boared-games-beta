import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { isTouchDevice } from '../input';

const TOUCH = isTouchDevice();
import { checkConnect4Win, createEmptyConnect4Board, getBestConnect4Move, getLowestEmptyRow } from '../../games/connect4/connect4Logic';
import type { DiscColor } from '../../types';
import { sound } from '../../utils/audio';
import { pushHud } from './tableHud';

/**
 * Connect Four on BertovDev's frame and discs (3D-Connect-Four). You pick a
 * red disc up off your pile, carry it over a column, and let go; the rival
 * does the same with its green ones. Play again pulls the release slide and
 * every disc drops out of the bottom.
 */

const ROWS = 6;
const COLS = 7;
/** BertovDev's model units -> metres: the 95-unit frame is a 30 cm grid. */
const S = 0.3 / 95;
const FRAME_Z = -0.12;
/** Slot centres measured off the model, in its units. */
const colX = (c: number) => (-41.85 + 13.8 * c + 0.45) * S;
const rowY = (r: number) => (9.85 + 10 * (ROWS - 1 - r)) * S;
const SLOT_Z = FRAME_Z + 0.0;
const DISC_T = 4.3 * S;
const TOP_Y = 0.235;

interface Disc {
  key: number;
  color: 'red' | 'yellow';
  col: number;
  row: number;
  /** Animated position. */
  y: number;
  vy: number;
  landed: boolean;
}

interface Carry {
  color: 'red' | 'yellow';
  /** Where the disc is right now (it eases toward the target). */
  pos: THREE.Vector3;
  target: THREE.Vector3;
  col: number;
}

function useDiscGeometry() {
  const { nodes, materials } = useGLTF('/games/connect4/board.glb') as unknown as {
    nodes: Record<string, THREE.Mesh>;
    materials: Record<string, THREE.MeshStandardMaterial>;
  };
  return useMemo(() => {
    // The disc mesh sits off its own origin; centre it and stand it up.
    const geo = nodes['4_connect_disc'].geometry.clone();
    geo.computeBoundingBox();
    const c = new THREE.Vector3();
    geo.boundingBox!.getCenter(c);
    geo.translate(-c.x, -c.y, -c.z);
    geo.rotateX(Math.PI / 2);
    geo.scale(S, S, S);
    const flat = geo.clone().rotateX(-Math.PI / 2);
    const red = materials.red_ficha.clone();
    const green = materials['blue-ficha'].clone();
    [red, green].forEach(m => {
      m.roughness = 0.35;
      m.metalness = 0.05;
    });
    return { standing: geo, flat, red, green };
  }, [materials, nodes]);
}

const PILE = { red: new THREE.Vector3(0.3, 0, 0.08), yellow: new THREE.Vector3(-0.3, 0, 0.08) };

/** Seven short stacks of three per colour, loosely heaped beside the frame. */
function pileTop(color: 'red' | 'yellow', left: number) {
  const base = PILE[color];
  const i = Math.max(0, left - 1);
  const stack = Math.floor(i / 3);
  const level = i % 3;
  const col = stack % 4;
  const row = Math.floor(stack / 4);
  const side = color === 'red' ? 1 : -1;
  return new THREE.Vector3(
    base.x + side * (col - 1.5) * 0.036,
    level * DISC_T + DISC_T / 2,
    base.z + row * 0.038 - 0.02,
  );
}

export function ConnectFourTable({ onLeave }: { onLeave: () => void }) {
  const geo = useDiscGeometry();
  const [board, setBoard] = useState<DiscColor[][]>(() => createEmptyConnect4Board(ROWS, COLS));
  const [discs, setDiscs] = useState<Disc[]>([]);
  const [turn, setTurn] = useState<'red' | 'yellow'>('red');
  const [carry, setCarry] = useState<Carry | null>(null);
  const [hoverCol, setHoverCol] = useState(3);
  const [result, setResult] = useState<ReturnType<typeof checkConnect4Win>>({ winner: null, line: null });
  const [releasing, setReleasing] = useState(false);
  const keySeq = useRef(0);
  const carryMesh = useRef<THREE.Mesh>(null);
  const discMeshes = useRef(new Map<number, THREE.Mesh>());
  const busy = useRef(false);
  const root = useRef<THREE.Group>(null);
  const discMats = useRef(new Map<number, THREE.MeshStandardMaterial>());
  const matFor = (d: Disc) => {
    let m = discMats.current.get(d.key);
    if (!m) {
      m = (d.color === 'red' ? geo.red : geo.green).clone();
      discMats.current.set(d.key, m);
    }
    return m;
  };

  const left = { red: 21 - discs.filter(d => d.color === 'red').length, yellow: 21 - discs.filter(d => d.color === 'yellow').length };
  const over = result.winner !== null;

  const drop = (color: 'red' | 'yellow', col: number) => {
    const row = getLowestEmptyRow(board, col);
    if (row < 0) return false;
    const next = board.map(r => [...r]);
    next[row][col] = color;
    keySeq.current += 1;
    setDiscs(cur => [...cur, { key: keySeq.current, color, col, row, y: TOP_Y, vy: 0, landed: false }]);
    setBoard(next);
    setCarry(null);
    busy.current = true;
    const res = checkConnect4Win(next);
    window.setTimeout(() => {
      busy.current = false;
      if (res.winner) {
        setResult(res);
        if (res.winner === 'red') sound.playVictoryFanfare();
        return;
      }
      setTurn(color === 'red' ? 'yellow' : 'red');
    }, 700);
    return true;
  };

  // The rival lifts a green disc off its pile, carries it over, lets go.
  useEffect(() => {
    if (turn !== 'yellow' || over || releasing) return;
    const col = getBestConnect4Move(board, 'medium');
    const t1 = window.setTimeout(() => {
      const from = pileTop('yellow', left.yellow);
      setCarry({ color: 'yellow', pos: from.clone(), target: new THREE.Vector3(colX(col), TOP_Y, SLOT_Z), col });
    }, 450);
    const t2 = window.setTimeout(() => drop('yellow', col), 1500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, over, releasing]);

  const columnAt = (point: THREE.Vector3) => {
    const local = root.current ? root.current.worldToLocal(point.clone()).x : 0;
    const c = Math.round((local / S + 41.85 - 0.45) / 13.8);
    return Math.max(0, Math.min(COLS - 1, c));
  };

  const pickUp = () => {
    if (turn !== 'red' || over || carry || busy.current || releasing) return;
    sound.playButtonClick();
    const from = pileTop('red', left.red);
    setCarry({ color: 'red', pos: from.clone(), target: new THREE.Vector3(colX(hoverCol), TOP_Y, SLOT_Z), col: hoverCol });
  };

  const playAgain = () => {
    if (releasing) return;
    setReleasing(true);
    sound.playShelfSlide();
    window.setTimeout(() => {
      setBoard(createEmptyConnect4Board(ROWS, COLS));
      setDiscs([]);
      discMats.current.forEach(m => m.dispose());
      discMats.current.clear();
      setResult({ winner: null, line: null });
      setTurn('red');
      setReleasing(false);
      sound.playBoardSettle();
    }, 1600);
  };

  useEffect(() => {
    const winnerNote =
      result.winner === 'red' ? 'Four in a row — you win!' : result.winner === 'yellow' ? 'The rival connects four.' : result.winner === 'draw' ? 'The grid is full: a draw.' : null;
    pushHud({
      title: 'Connect Four',
      note:
        winnerNote ??
        (turn === 'red'
          ? carry
            ? `${TOUCH ? 'Tap' : 'Move over'} a column${TOUCH ? '' : ' and click'} to drop.`
            : `Your turn — ${TOUCH ? 'tap' : 'click'} your red pile to pick up a disc. (${left.red} left)`
          : 'The rival is choosing a column…'),
      onLeave,
      actions: over ? [{ label: 'Play again', onClick: playAgain }] : [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.winner, turn, carry === null, left.red, onLeave, over]);
  useEffect(() => () => pushHud(null), []);

  const winning = useMemo(() => new Set((result.line ?? []).map(p => `${p.row}-${p.col}`)), [result.line]);

  useFrame(({ clock }, raw) => {
    const dt = Math.min(raw, 0.05);
    // gravity drop with a little bounce on the disc below
    let landedNow = false;
    for (const d of discs) {
      const mesh = discMeshes.current.get(d.key);
      if (!mesh) continue;
      const floor = rowY(d.row);
      if (releasing) {
        d.vy -= 9.8 * dt;
        d.y += d.vy * dt;
        mesh.position.y = Math.max(d.y, -0.12);
      } else if (!d.landed) {
        d.vy -= 9.8 * dt * 0.55;
        d.y += d.vy * dt;
        if (d.y <= floor) {
          d.y = floor;
          if (Math.abs(d.vy) > 0.25) d.vy = -d.vy * 0.22;
          else {
            d.vy = 0;
            d.landed = true;
            landedNow = true;
          }
        }
        mesh.position.y = d.y;
      }
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (winning.has(`${d.row}-${d.col}`)) {
        mat.emissive.set(d.color === 'red' ? '#ff5040' : '#40ff70');
        mat.emissiveIntensity = 0.4 + Math.sin(clock.elapsedTime * 6) * 0.3;
      }
    }
    if (landedNow) sound.playMoveClack();
    if (carry && carryMesh.current) {
      if (carry.color === 'red') carry.target.set(colX(hoverCol), TOP_Y, SLOT_Z);
      carry.pos.lerp(carry.target, Math.min(1, dt * 8));
      carryMesh.current.position.copy(carry.pos);
    }
  });

  return (
    <group ref={root}>
      {/* placed discs */}
      {discs.map(d => (
        <mesh
          key={d.key}
          ref={m => {
            if (m) discMeshes.current.set(d.key, m);
            else discMeshes.current.delete(d.key);
          }}
          geometry={geo.standing}
          material={matFor(d)}
          position={[colX(d.col), d.y, SLOT_Z]}
        />
      ))}

      {/* the disc in hand */}
      {carry && <mesh ref={carryMesh} geometry={geo.standing} material={carry.color === 'red' ? geo.red : geo.green} position={carry.pos} />}

      {/* piles on the table */}
      {(['red', 'yellow'] as const).map(color =>
        Array.from({ length: left[color] - (carry?.color === color ? 1 : 0) }, (_, i) => {
          const p = pileTop(color, i + 1);
          return (
            <mesh
              key={`${color}-${i}`}
              geometry={geo.flat}
              material={color === 'red' ? geo.red : geo.green}
              position={[p.x, p.y, p.z]}
              rotation={[0, i * 0.4, 0]}
              onPointerDown={color === 'red' ? e => {
                e.stopPropagation();
                pickUp();
              } : undefined}
              onPointerOver={color === 'red' ? () => (document.body.style.cursor = 'grab') : undefined}
              onPointerOut={color === 'red' ? () => (document.body.style.cursor = '') : undefined}
            />
          );
        }),
      )}

      {/* aiming plane in front of the frame */}
      <mesh
        position={[0, 0.13, FRAME_Z + 0.03]}
        onPointerMove={e => setHoverCol(columnAt(e.point))}
        onPointerDown={e => {
          e.stopPropagation();
          // A tap has no hover before it, so read the column off the tap itself.
          const col = columnAt(e.point);
          setHoverCol(col);
          if (carry?.color === 'red' && !busy.current) drop('red', col);
          else pickUp();
        }}
      >
        <planeGeometry args={[0.32, 0.3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {turn === 'red' && !over && (
        <mesh position={[colX(hoverCol), TOP_Y + 0.03, SLOT_Z]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.008, 0.016, 12]} />
          <meshBasicMaterial color="#ffe45c" toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}
