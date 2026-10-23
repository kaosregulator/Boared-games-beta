import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { ChessBoard, ChessPieceColor, ChessPieceType } from '../../types';
import { createInitialBoard, findKing, getBestChessMove, getLegalMoves, isSquareUnderAttack } from '../../games/chess/chessLogic';
import { sound } from '../../utils/audio';
import { PLAY_TABLE } from '../roomLayout';
import { pushHud } from './tableHud';
import { followAction, setTableView, tableCam, wasDrag, type Shot } from './tableCam';
import { GhostHand } from './GhostHand';
import { useStudioEnv } from './monopolyTokens';

/**
 * Chess on the card table with Tabletop Club's set: rehcub's pieces on
 * pennomi and Tiziana's board. Pick a piece up and it lifts and follows your
 * hand; the squares it can reach glow; let go over one to set it down (or tap
 * the piece, then tap the square). The other side's ghost hand reaches over,
 * picks its piece up and sets it down while the camera swings round to watch.
 */

const T = '/games/tabletop/';
/** The board model is 8.88 units across with an 8 x 8 playing surface at y 0.362. */
const NATIVE = 8.88;
/** Sized to cover the board printed inside the box: 6.5 cm squares, near tournament size. */
const BOARD_W = 0.52;
const S = BOARD_W / NATIVE;
const SQ = S; // one square is one native unit
const BOARD_LIFT = 0.007;
const SURFACE = BOARD_LIFT + 0.362 * S;
const HOVER = 0.06;
const KING_H = 0.092;

const sqPos = (r: number, c: number, y = SURFACE) => new THREE.Vector3((c - 3.5) * SQ, y, (r - 3.5) * SQ);

interface Piece {
  id: number;
  type: ChessPieceType;
  color: ChessPieceColor;
  r: number;
  c: number;
  /** Taken: stands beside the board, n-th in its row. */
  out: number | null;
}

interface Move {
  from: { r: number; c: number };
  to: { r: number; c: number };
}

function piecesFrom(board: ChessBoard): Piece[] {
  const out: Piece[] = [];
  board.forEach((row, r) =>
    row.forEach((p, c) => {
      if (p) out.push({ id: out.length, type: p.type, color: p.color, r, c, out: null });
    }),
  );
  return out;
}

/** The engine's move, with castling's rook, promotion to a queen, and the taken piece. */
function applyMove(board: ChessBoard, m: Move) {
  const next = board.map(row => [...row]);
  const piece = next[m.from.r][m.from.c]!;
  const captured = next[m.to.r][m.to.c];
  const promote = piece.type === 'p' && (m.to.r === 0 || m.to.r === 7);
  next[m.from.r][m.from.c] = null;
  next[m.to.r][m.to.c] = { ...piece, type: promote ? 'q' : piece.type, hasMoved: true };
  let rook: Move | null = null;
  if (piece.type === 'k' && Math.abs(m.to.c - m.from.c) === 2) {
    const fromC = m.to.c === 6 ? 7 : 0;
    const toC = m.to.c === 6 ? 5 : 3;
    next[m.to.r][toC] = { ...next[m.to.r][fromC]!, hasMoved: true };
    next[m.to.r][fromC] = null;
    rook = { from: { r: m.to.r, c: fromC }, to: { r: m.to.r, c: toC } };
  }
  return { next, captured, rook, promote };
}

function status(board: ChessBoard, toMove: ChessPieceColor) {
  const king = findKing(board, toMove);
  const inCheck = king ? isSquareUnderAttack(board, king.r, king.c, toMove === 'w' ? 'b' : 'w') : false;
  let any = false;
  for (let r = 0; r < 8 && !any; r++) for (let c = 0; c < 8 && !any; c++) if (board[r][c]?.color === toMove && getLegalMoves(board, r, c).length) any = true;
  return { inCheck, mate: inCheck && !any, stalemate: !inCheck && !any };
}

/** Taken pieces line up beside the board on the side of whoever took them. */
function outPos(color: ChessPieceColor, n: number) {
  const side = color === 'b' ? 1 : -1; // black pieces you took sit on your right
  return new THREE.Vector3(side * (BOARD_W / 2 + 0.034 + (n % 2) * 0.036), 0, side * (0.2 - Math.floor(n / 2) * 0.045));
}

/** The opponent's move, timed: reach, grip, lift, carry, set down, let go. */
interface Carry {
  id: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  start: number;
  ai: boolean;
}
const REACH = 0.45;
const LIFT = 0.18;
const MOVE = 0.55;
const DROP = 0.18;
const BACK = 0.4;

function carryPose(c: Carry, t: number, out: THREE.Vector3) {
  const k = t - c.start - (c.ai ? REACH : 0);
  if (k <= 0) return out.copy(c.from);
  if (k < LIFT) return out.copy(c.from).setY(c.from.y + (k / LIFT) * HOVER);
  if (k < LIFT + MOVE) {
    const e = (k - LIFT) / MOVE;
    const s = e * e * (3 - 2 * e);
    out.copy(c.from).lerp(c.to, s);
    out.y = c.from.y + HOVER + Math.sin(Math.PI * s) * 0.02;
    return out;
  }
  const d = Math.min(1, (k - LIFT - MOVE) / DROP);
  return out.copy(c.to).setY(c.to.y + (1 - d) * HOVER);
}
const carryDone = (c: Carry, t: number) => t - c.start >= (c.ai ? REACH : 0) + LIFT + MOVE + DROP;

function useChessSet() {
  const env = useStudioEnv();
  const { scene } = useGLTF(`${T}chess-pieces.glb`);
  return useMemo(() => {
    const white = new THREE.MeshStandardMaterial({ color: '#efe5cf', roughness: 0.38, envMap: env, envMapIntensity: 0.55 });
    const black = new THREE.MeshStandardMaterial({ color: '#1f1b1d', roughness: 0.28, metalness: 0.05, envMap: env, envMapIntensity: 0.7 });
    const names: Record<ChessPieceType, string> = { k: 'king', q: 'queen', b: 'bishop', n: 'knight', r: 'rook', p: 'pawn' };
    // One scale for the whole set, so a pawn stays a pawn next to the king.
    const king = scene.getObjectByName('king')!;
    const kb = new THREE.Box3().setFromObject(king);
    const scale = KING_H / (kb.max.y - kb.min.y);
    const make = (type: ChessPieceType, color: ChessPieceColor) => {
      const src = scene.getObjectByName(names[type])!.clone(true);
      src.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.material = color === 'w' ? white : black;
      });
      src.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(src);
      const c = box.getCenter(new THREE.Vector3());
      src.position.set(-c.x, -box.min.y, -c.z);
      const g = new THREE.Group();
      const inner = new THREE.Group();
      inner.add(src);
      inner.scale.setScalar(scale);
      // knights look across the board at the other side
      inner.rotation.y = (type === 'n' ? Math.PI : 0) + (color === 'b' ? Math.PI : 0);
      g.add(inner);
      return g;
    };
    return make;
  }, [env, scene]);
}

function Board() {
  const { scene } = useGLTF(`${T}chess-board.glb`);
  const obj = useMemo(() => {
    const o = scene.clone(true);
    o.traverse(n => {
      const m = n as THREE.Mesh;
      if (m.isMesh) m.receiveShadow = true;
    });
    return o;
  }, [scene]);
  return <primitive object={obj} position={[0, BOARD_LIFT, 0]} scale={S} />;
}

function PieceMesh({
  piece,
  make,
  pose,
  onDown,
}: {
  piece: Piece;
  make: (t: ChessPieceType, c: ChessPieceColor) => THREE.Group;
  pose: (p: Piece, out: THREE.Vector3) => THREE.Vector3;
  onDown: (p: Piece, e: { stopPropagation: () => void; pointerId: number; target: EventTarget | null }) => void;
}) {
  const obj = useMemo(() => make(piece.type, piece.color), [make, piece.type, piece.color]);
  const g = useRef<THREE.Group>(null);
  const shown = useRef(new THREE.Vector3());
  const goal = useRef(new THREE.Vector3());
  const first = useRef(true);
  useFrame((_, dt) => {
    const n = g.current;
    if (!n) return;
    pose(piece, goal.current);
    if (first.current) {
      shown.current.copy(goal.current);
      first.current = false;
    }
    // pieces that just settle (a castling rook, a taken piece) glide there
    shown.current.lerp(goal.current, Math.min(1, Math.min(dt, 0.05) * 14));
    n.position.copy(shown.current);
  });
  return (
    <group
      ref={g}
      onPointerDown={e => {
        if (e.button !== 0) return;
        onDown(piece, e);
      }}
    >
      <primitive object={obj} />
    </group>
  );
}

const PLAY_VIEW: Shot = { target: [0, 0, 0.03], yaw: 0, pitch: 0.95, dist: 0.72 };
const DIFFS = ['easy', 'medium', 'hard'] as const;

export function ChessTable({ onLeave }: { onLeave: () => void }) {
  const make = useChessSet();
  const { camera, raycaster, pointer } = useThree();
  const [board, setBoard] = useState<ChessBoard>(() => createInitialBoard());
  const [pieces, setPieces] = useState<Piece[]>(() => piecesFrom(createInitialBoard()));
  const [turn, setTurn] = useState<ChessPieceColor>('w');
  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [carry, setCarry] = useState<Carry | null>(null);
  const [diff, setDiff] = useState<(typeof DIFFS)[number]>('medium');
  const [note, setNote] = useState('Your move. Pick up a white piece.');
  const [over, setOver] = useState<string | null>(null);
  const [score, setScore] = useState({ you: 0, them: 0 });
  const clock = useRef(0);
  const hand = useRef(new THREE.Vector3(0, 0.2, -0.4));
  const handGrip = useRef(0);
  const handOn = useRef(false);
  const myHand = useRef(new THREE.Vector3());
  const myGrip = useRef(1);
  const myHandOn = useRef(false);
  const dragAt = useRef(new THREE.Vector3());
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hit = useMemo(() => new THREE.Vector3(), []);
  const carryLive = useRef(new THREE.Vector3());

  useEffect(() => setTableView(PLAY_VIEW), []);

  const at = (r: number, c: number) => pieces.find(p => p.out === null && p.r === r && p.c === c);
  const selPiece = selected === null ? null : pieces.find(p => p.id === selected) ?? null;
  const legal = useMemo(() => (selPiece ? getLegalMoves(board, selPiece.r, selPiece.c) : []), [board, selPiece]);

  /** Where a table-local point under the pointer is, at a given height. */
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

  /** Commit a move on the board and the pieces; returns the new board. */
  const play = (m: Move, ai: boolean) => {
    const { next, captured, rook, promote } = applyMove(board, m);
    const mover = at(m.from.r, m.from.c)!;
    setPieces(list => {
      const takenCount = list.filter(p => p.out !== null && captured && p.color === captured.color).length;
      return list.map(p => {
        if (captured && p.out === null && p.r === m.to.r && p.c === m.to.c) return { ...p, out: takenCount };
        if (p.id === mover.id) return { ...p, r: m.to.r, c: m.to.c, type: promote ? 'q' : p.type };
        if (rook && p.out === null && p.r === rook.from.r && p.c === rook.from.c) return { ...p, c: rook.to.c };
        return p;
      });
    });
    if (captured) sound.playChessCapture();
    else sound.playChessMove();
    setBoard(next);
    const nextTurn: ChessPieceColor = turn === 'w' ? 'b' : 'w';
    const st = status(next, nextTurn);
    if (st.mate) {
      setOver(ai ? 'Checkmate. The ghost wins this one.' : 'Checkmate! You win.');
      setScore(s => (ai ? { ...s, them: s.them + 1 } : { ...s, you: s.you + 1 }));
      sound.playVictoryFanfare();
    } else if (st.stalemate) setOver('Stalemate. Nobody wins.');
    else if (st.inCheck) {
      sound.playChessCheck();
      setNote(ai ? 'Check! Get your king out of it.' : 'Check!');
    } else setNote(ai ? 'Your move.' : 'Their move…');
    setTurn(nextTurn);
    setSelected(null);
    return next;
  };

  // The opponent's turn: think a moment, then the ghost hand makes the move.
  useEffect(() => {
    if (turn !== 'b' || over || carry) return;
    const t = window.setTimeout(() => {
      const best = getBestChessMove(board, 'b', diff);
      if (!best) return;
      const mover = at(best.from.r, best.from.c);
      if (!mover) return;
      const from = sqPos(best.from.r, best.from.c);
      const to = sqPos(best.to.r, best.to.c);
      setCarry({ id: mover.id, from, to, start: clock.current, ai: true });
      // watch it from the side of the board the move is on, low, following the piece
      const side = (best.from.c + best.to.c) / 2 < 3.5 ? -1 : 1;
      followAction({ target: [0, 0, 0], yaw: side * (Math.PI / 2) - side * 0.35, pitch: 0.42, dist: 0.34 }, 2100, () => carryLive.current);
      window.setTimeout(() => {
        play(best, true);
      }, (REACH + LIFT + MOVE + DROP) * 1000);
    }, 650);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, over, carry, board, diff]);

  // Let go of the hand once the carried piece is down.
  useFrame(({ clock: c }) => {
    clock.current = c.elapsedTime;
    const now = c.elapsedTime;
    if (carry) {
      carryPose(carry, now, carryLive.current);
      const k = now - carry.start;
      if (carry.ai) {
        handOn.current = k < REACH + LIFT + MOVE + DROP + BACK * 0.5;
        const reach = Math.min(1, k / REACH);
        if (k < REACH) {
          hand.current.lerpVectors(new THREE.Vector3(carry.from.x * 0.4, 0.16, -0.42), carry.from, reach * reach * (3 - 2 * reach));
          handGrip.current = 0;
        } else if (!carryDone(carry, now)) {
          hand.current.copy(carryLive.current);
          handGrip.current = Math.min(1, handGrip.current + 0.2);
        } else {
          handGrip.current = Math.max(0, handGrip.current - 0.15);
          hand.current.y += 0.004;
          hand.current.z -= 0.006;
        }
      }
      if (carryDone(carry, now) && now - carry.start > REACH + LIFT + MOVE + DROP + BACK) setCarry(null);
    }
    if (dragging && selPiece) {
      pointerAt(SURFACE + HOVER, dragAt.current);
      myHand.current.copy(dragAt.current);
      myHandOn.current = true;
    } else myHandOn.current = false;
  });

  /** Where each piece should be right now. */
  const pose = (p: Piece, out: THREE.Vector3) => {
    if (p.out !== null) return out.copy(outPos(p.color, p.out)).setY(BOARD_LIFT * 0.2);
    if (carry && carry.id === p.id) return carryPose(carry, clock.current, out);
    if (p.id === selected) {
      if (dragging) return out.copy(dragAt.current);
      return sqPos(p.r, p.c, SURFACE + HOVER * 0.6);
    }
    return out.copy(sqPos(p.r, p.c));
  };

  const yourTurn = turn === 'w' && !over && !carry;

  const grab = (p: Piece, e: { stopPropagation: () => void; pointerId: number; target: EventTarget | null }) => {
    if (!yourTurn) return;
    if (p.color !== 'w') {
      // tapping an enemy piece with yours in hand is a capture
      if (selPiece && legal.some(m => m.r === p.r && m.c === p.c)) {
        e.stopPropagation();
        play({ from: { r: selPiece.r, c: selPiece.c }, to: { r: p.r, c: p.c } }, false);
      }
      return;
    }
    e.stopPropagation();
    tableCam.grabbing = true;
    sound.playPieceSelect();
    setSelected(p.id);
    setDragging(true);
    dragAt.current.copy(sqPos(p.r, p.c, SURFACE + HOVER));
  };

  // Letting go: on a legal square it's a move; a tap without moving keeps it in hand.
  useEffect(() => {
    if (!dragging) return;
    const startAt = performance.now();
    const up = () => {
      tableCam.grabbing = false;
      setDragging(false);
      const sq = squareUnder();
      const p = selPiece;
      if (!p) return;
      if (sq && legal.some(m => m.r === sq.r && m.c === sq.c)) {
        play({ from: { r: p.r, c: p.c }, to: sq }, false);
        return;
      }
      if (sq && sq.r === p.r && sq.c === p.c && performance.now() - startAt < 400) return; // a tap: stays selected
      if (sq && sq.r === p.r && sq.c === p.c) return;
      setSelected(null);
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, selPiece, legal]);

  // With a piece in hand, tapping a glowing square plays there.
  const tapSquare = () => {
    if (!yourTurn || !selPiece || dragging || wasDrag()) return;
    const sq = squareUnder();
    if (sq && legal.some(m => m.r === sq.r && m.c === sq.c)) play({ from: { r: selPiece.r, c: selPiece.c }, to: sq }, false);
    else setSelected(null);
  };

  const reset = () => {
    const b = createInitialBoard();
    setBoard(b);
    setPieces(piecesFrom(b));
    setTurn('w');
    setSelected(null);
    setCarry(null);
    setOver(null);
    setNote('Your move. Pick up a white piece.');
    setTableView(PLAY_VIEW);
  };

  useEffect(() => {
    pushHud({
      title: 'Chess',
      note: over ?? (turn === 'w' ? note : 'Their move…'),
      detail: `You ${score.you} · Ghost ${score.them} · drag a piece, or tap it then a glowing square`,
      onLeave,
      actions: [
        { label: `Opponent: ${diff[0].toUpperCase()}${diff.slice(1)}`, onClick: () => setDiff(d => DIFFS[(DIFFS.indexOf(d) + 1) % DIFFS.length]), tone: 'ghost' },
        { label: over ? 'Play again' : 'New game', onClick: reset, tone: over ? undefined : 'ghost' },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, over, turn, diff, score, onLeave]);
  useEffect(() => () => pushHud(null), []);
  useEffect(
    () => () => {
      tableCam.grabbing = false;
    },
    [],
  );

  return (
    <group>
      <Board />
      {/* the playing surface, for taps on empty squares */}
      <mesh position={[0, SURFACE + 0.0004, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={tapSquare}>
        <planeGeometry args={[SQ * 8, SQ * 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {selPiece &&
        legal.map(m => {
          const target = at(m.r, m.c);
          const p = sqPos(m.r, m.c, SURFACE + 0.0008);
          return (
            <mesh key={`${m.r}${m.c}`} position={p} rotation={[-Math.PI / 2, 0, 0]}>
              {target ? <ringGeometry args={[SQ * 0.36, SQ * 0.46, 28]} /> : <circleGeometry args={[SQ * 0.16, 24]} />}
              <meshBasicMaterial color={target ? '#ff6b5b' : '#7CF29A'} transparent opacity={0.85} depthWrite={false} toneMapped={false} />
            </mesh>
          );
        })}
      {pieces.map(p => (
        <PieceMesh key={`${p.id}${p.type}`} piece={p} make={make} pose={pose} onDown={grab} />
      ))}
      <GhostHand at={hand.current} grip={handGrip} visible={handOn} from={Math.PI} tint="#c9b8ff" />
      <GhostHand at={myHand.current} grip={myGrip} visible={myHandOn} from={0} tint="#bfe3ff" />
    </group>
  );
}

useGLTF.preload(`${T}chess-pieces.glb`);
useGLTF.preload(`${T}chess-board.glb`);
