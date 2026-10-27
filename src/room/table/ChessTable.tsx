import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ChessBoard, ChessPieceColor, ChessPieceType } from '../../types';
import { applyChessMove, createInitialBoard, getBestChessMove, getLegalMoves, sideStatus } from '../../games/chess/chessLogic';
import { sound } from '../../utils/audio';
import { PLAY_TABLE } from '../roomLayout';
import { pushHud } from './tableHud';
import { followAction, setTableView, tableCam, wasDrag, type Shot } from './tableCam';
import { GhostHand } from './GhostHand';
import { useWizardSet, WizardBoard } from './wizardSet';

/**
 * Wizard chess on this room's card table. The sculpted pieces and the stone
 * board come from the owner's wizard-chess set; the cathedral does not.
 * Pick a piece up and it lifts and follows your hand; the squares it can
 * reach glow; let go over one to set it down (or tap the piece, then tap the
 * square). The other side's ghost hand reaches over, picks its piece up and
 * sets it down while the camera swings round to watch.
 */

/** 6.5 cm squares, near tournament size, on the card table. */
const SQ = 0.065;
const BOARD_LIFT = 0.007;
const SURFACE = BOARD_LIFT + 0.012;
const HOVER = 0.06;

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
  const played = applyChessMove(board, m.from, m.to);
  let rook: Move | null = null;
  if (played.castle) {
    const fromC = played.castle === 'k' ? 7 : 0;
    const toC = played.castle === 'k' ? 5 : 3;
    rook = { from: { r: m.to.r, c: fromC }, to: { r: m.to.r, c: toC } };
  }
  return {
    next: played.board,
    captured: played.captured,
    capturedAt: played.capturedAt,
    rook,
    promoted: played.promoted,
  };
}

/** Taken pieces line up beside the board on the side of whoever took them. */
function outPos(color: ChessPieceColor, n: number) {
  const side = color === 'b' ? 1 : -1; // black pieces you took sit on your right
  return new THREE.Vector3(side * (SQ * 4 + 0.04 + (n % 2) * 0.036), 0, side * (0.2 - Math.floor(n / 2) * 0.045));
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
    const mixer = obj.userData.mixer as THREE.AnimationMixer | undefined;
    const actions = obj.userData.actions as Record<string, THREE.AnimationAction> | undefined;
    if (mixer && actions) {
      const moving = shown.current.distanceTo(goal.current) > 0.004;
      const want = moving && actions.Move ? 'Move' : 'Idle';
      if (obj.userData.clip !== want && actions[want]) {
        actions[want].reset().fadeIn(0.18).play();
        actions[obj.userData.clip as string]?.fadeOut(0.18);
        obj.userData.clip = want;
      }
      mixer.update(dt);
    }
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
  const make = useWizardSet(SQ * 0.78);
  const { camera, raycaster, pointer } = useThree();
  const [board, setBoard] = useState<ChessBoard>(() => createInitialBoard());
  const [pieces, setPieces] = useState<Piece[]>(() => piecesFrom(createInitialBoard()));
  const [you, setYou] = useState<ChessPieceColor>('w');
  const [turn, setTurn] = useState<ChessPieceColor>('w');
  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [carry, setCarry] = useState<Carry | null>(null);
  const [diff, setDiff] = useState<(typeof DIFFS)[number]>('medium');
  const [note, setNote] = useState('Your move. Pick up a piece.');
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

  useEffect(() => {
    setTableView({ ...PLAY_VIEW, yaw: you === 'b' ? Math.PI : 0 });
  }, [you]);

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
    const { next, captured, capturedAt, rook, promoted } = applyMove(board, m);
    const mover = at(m.from.r, m.from.c)!;
    setPieces(list => {
      const takenCount = list.filter(p => p.out !== null && captured && p.color === captured.color).length;
      return list.map(p => {
        if (capturedAt && p.out === null && p.id !== mover.id && p.r === capturedAt.r && p.c === capturedAt.c) {
          return { ...p, out: takenCount };
        }
        if (p.id === mover.id) return { ...p, r: m.to.r, c: m.to.c, type: promoted ?? p.type };
        if (rook && p.out === null && p.r === rook.from.r && p.c === rook.from.c) return { ...p, c: rook.to.c };
        return p;
      });
    });
    if (captured) sound.playChessCapture();
    else sound.playChessMove();
    setBoard(next);
    const nextTurn: ChessPieceColor = turn === 'w' ? 'b' : 'w';
    const st = sideStatus(next, nextTurn);
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
    if (turn === you || over || carry) return;
    const t = window.setTimeout(() => {
      const best = getBestChessMove(board, turn, diff);
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
  }, [turn, over, carry, board, diff, you]);

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
          const homeZ = you === 'w' ? -0.42 : 0.42;
          hand.current.lerpVectors(new THREE.Vector3(carry.from.x * 0.4, 0.16, homeZ), carry.from, reach * reach * (3 - 2 * reach));
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

  const yourTurn = turn === you && !over && !carry;

  const grab = (p: Piece, e: { stopPropagation: () => void; pointerId: number; target: EventTarget | null }) => {
    if (!yourTurn) return;
    if (p.color !== you) {
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

  const reset = (side: ChessPieceColor = you) => {
    const b = createInitialBoard();
    setBoard(b);
    setPieces(piecesFrom(b));
    setYou(side);
    setTurn('w');
    setSelected(null);
    setCarry(null);
    setOver(null);
    setNote(side === 'w' ? 'Your move. Pick up a piece.' : 'You have the black pieces. White moves first.');
  };

  useEffect(() => {
    pushHud({
      title: 'Wizard Chess',
      note: over ?? (turn === you ? note : 'Their move…'),
      detail: `You ${score.you} · Ghost ${score.them} · drag a piece, or tap it then a glowing square`,
      onLeave,
      actions: [
        { label: `You: ${you === 'w' ? 'White' : 'Black'}`, onClick: () => reset(you === 'w' ? 'b' : 'w'), tone: 'ghost' },
        { label: `Opponent: ${diff[0].toUpperCase()}${diff.slice(1)}`, onClick: () => setDiff(d => DIFFS[(DIFFS.indexOf(d) + 1) % DIFFS.length]), tone: 'ghost' },
        { label: over ? 'Play again' : 'New game', onClick: () => reset(), tone: over ? undefined : 'ghost' },
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
      <WizardBoard sq={SQ} top={SURFACE} />
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
      <GhostHand at={hand.current} grip={handGrip} visible={handOn} from={you === 'w' ? Math.PI : 0} tint="#c9b8ff" />
      <GhostHand at={myHand.current} grip={myGrip} visible={myHandOn} from={you === 'w' ? 0 : Math.PI} tint="#bfe3ff" />
    </group>
  );
}
