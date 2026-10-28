import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { ChessBoard, ChessPieceColor, ChessPieceType } from '../../types';
import { applyChessMove, createInitialBoard, getLegalMoves, sideStatus } from '../../games/chess/chessLogic';
import { chooseSmartAIMove, type WizardDifficulty } from '../../games/chess/wizardAI';
import { sound } from '../../utils/audio';
import { PLAY_TABLE } from '../roomLayout';
import { pushHud } from './tableHud';
import { followAction, setTableView, tableCam, wasDrag, type Shot } from './tableCam';
import { GhostHand } from './GhostHand';
import { SURFACE_PER_SQ, useWizardSet, WizardBoard } from './wizardSet';
import {
  ATTACK_SYNC_PROFILES,
  CLIP_SPEED,
  SRC_SQ,
  boardToWorld,
  duelCamera,
  planChoreo,
  spawnShards,
  stepShards,
  type Choreo,
  type ChoreoFrame,
  type Shard,
  type Vec3,
} from './wizardMelee';

/**
 * Wizard chess on this room's card table: the owner's sculpted statues on the
 * owner's board, the Obsidian Altar from the wizards-chess cathedral.
 *
 * Pick a piece up and it lifts and follows your hand; the squares it can
 * reach glow; let go over one to set it down (or tap the piece, then tap the
 * square, and it walks there itself). Taking a piece is the source's melee:
 * the attacker marches up, swings, and the defender bursts into stone while
 * the camera cuts in on the duel. The other side's ghost hand carries its
 * quiet moves; its captures are fought out the same way. The opponent is the
 * source's own AI (wizardAI.ts).
 */

/** 5 cm squares: the altar's 0.34 m squares scaled down so the plinth fits the card table. */
const SQ = 0.05;
/** Source metres to table metres. */
const K = SQ / SRC_SQ;
/** The squares' top face, up on the altar. */
const SURFACE = SQ * SURFACE_PER_SQ;
const HOVER = 0.06;
/** Half the altar's top slab, table metres: shards that fly past it drop to the table. */
const SLAB = { x: 2.2 * K, z: 2.1 * K };

const sqPos = (r: number, c: number, y = SURFACE) => new THREE.Vector3((c - 3.5) * SQ, y, (r - 3.5) * SQ);
const toTable = (v: Vec3, out: THREE.Vector3) => out.set(v.x * K, SURFACE + v.y * K, v.z * K);

interface Piece {
  id: number;
  type: ChessPieceType;
  color: ChessPieceColor;
  r: number;
  c: number;
  /** Shattered. */
  taken: boolean;
}

interface Move {
  from: { r: number; c: number };
  to: { r: number; c: number };
}

function piecesFrom(board: ChessBoard): Piece[] {
  const out: Piece[] = [];
  board.forEach((row, r) =>
    row.forEach((p, c) => {
      if (p) out.push({ id: out.length, type: p.type, color: p.color, r, c, taken: false });
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

/** The opponent's quiet move, timed: reach, grip, lift, carry, set down, let go. */
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

/** A statue walking (or fighting) its way to a square: the source's choreography. */
interface Dance {
  ch: Choreo;
  move: Move;
  ai: boolean;
  start: number;
  duel: ReturnType<typeof duelCamera> | null;
  /** What has happened so far (mutated by the frame loop). */
  done: { close: boolean; contact: boolean; shatter: boolean; committed: boolean };
  /** The duel shot on screen now (kept so a frozen capture can hold it). */
  cam: { shot: Shot; track: () => THREE.Vector3 } | null;
}

type Clip = 'Idle' | 'Move' | 'Attack' | 'Shatter';
interface Drive {
  pos: THREE.Vector3;
  /** Facing (rotation about y for a statue that faces +z), or null for its side's rest pose. */
  heading: number | null;
  clip: Clip;
  /** How fast the shown position chases `pos` (per second); Infinity sticks to it. */
  rate: number;
  hidden: boolean;
  /** Pin the clip to this time (seconds into it), so the blow lands on the choreography's beat at any frame rate. */
  clipTime: number | null;
}

/** Capture scripts can freeze a capture mid-blow (dev only): the choreography, clips and shards all stop. */
const devFreeze = { on: false };
const FADE: Record<Clip, number> = { Idle: 0.18, Move: 0.1, Attack: 0.08, Shatter: 0.04 };

/** Shortest signed turn from a to b. */
function angleDelta(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function PieceMesh({
  piece,
  make,
  drive,
  onDown,
}: {
  piece: Piece;
  make: (t: ChessPieceType, c: ChessPieceColor) => THREE.Group;
  drive: (p: Piece, now: number, out: Drive) => void;
  onDown: (p: Piece, e: { stopPropagation: () => void; pointerId: number; target: EventTarget | null }) => void;
}) {
  const obj = useMemo(() => make(piece.type, piece.color), [make, piece.type, piece.color]);
  const g = useRef<THREE.Group>(null);
  const shown = useRef(new THREE.Vector3());
  const d = useRef<Drive>({ pos: new THREE.Vector3(), heading: null, clip: 'Idle', rate: 14, hidden: false, clipTime: null });
  const yaw = useRef(0);
  const first = useRef(true);
  useFrame((state, rawDt) => {
    const n = g.current;
    if (!n) return;
    const dt = Math.min(rawDt, 0.05);
    const want = d.current;
    want.heading = null;
    want.clip = 'Idle';
    want.rate = 14;
    want.hidden = false;
    want.clipTime = null;
    drive(piece, state.clock.elapsedTime, want);
    n.visible = !want.hidden;
    if (first.current) {
      shown.current.copy(want.pos);
      first.current = false;
    }
    if (want.rate === Infinity) shown.current.copy(want.pos);
    else shown.current.lerp(want.pos, Math.min(1, dt * want.rate));
    n.position.copy(shown.current);
    // The sculpt faces +z; white's rest pose is turned to face black.
    const rest = piece.color === 'w' ? Math.PI : 0;
    const goalYaw = want.heading === null ? 0 : want.heading - rest;
    yaw.current += angleDelta(yaw.current, goalYaw) * Math.min(1, dt * 12);
    n.rotation.y = yaw.current;

    const mixer = obj.userData.mixer as THREE.AnimationMixer | undefined;
    const actions = obj.userData.actions as Record<string, THREE.AnimationAction> | undefined;
    if (mixer && actions) {
      let clip = want.clip as Clip; // set by drive(), which TS can't see
      if (clip === 'Idle' && shown.current.distanceTo(want.pos) > 0.004) clip = 'Move';
      if (obj.userData.clip !== clip && actions[clip]) {
        const next = actions[clip];
        next.reset();
        next.timeScale = clip === 'Attack' ? ATTACK_SYNC_PROFILES[piece.type].timeScale : CLIP_SPEED;
        next.fadeIn(FADE[clip]).play();
        actions[obj.userData.clip as string]?.fadeOut(FADE[clip]);
        obj.userData.clip = clip;
      }
      mixer.update(devFreeze.on ? 0 : dt);
      if (want.clipTime !== null && actions[clip]) {
        actions[clip].time = Math.min(want.clipTime, actions[clip].getClip().duration);
        mixer.update(0);
      }
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

/** The stone burst: one instanced batch of chips per marble. */
function Shards({ list, mats }: { list: React.MutableRefObject<{ shards: Shard[]; color: ChessPieceColor }[]>; mats: Record<ChessPieceColor, THREE.Material> }) {
  const geo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  const white = useRef<THREE.InstancedMesh>(null);
  const black = useRef<THREE.InstancedMesh>(null);
  const tmp = useMemo(() => new THREE.Object3D(), []);
  useFrame(() => {
    for (const [color, mesh] of [
      ['w', white.current],
      ['b', black.current],
    ] as const) {
      if (!mesh) continue;
      let n = 0;
      for (const burst of list.current) {
        if (burst.color !== color) continue;
        for (const s of burst.shards) {
          if (n >= MAX_SHARDS) break;
          toTable(s.pos, tmp.position);
          tmp.rotation.set(s.rot.x, s.rot.y, s.rot.z);
          tmp.scale.setScalar(s.scale * K);
          tmp.updateMatrix();
          mesh.setMatrixAt(n++, tmp.matrix);
        }
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <>
      <instancedMesh ref={white} args={[geo, mats.w, MAX_SHARDS]} castShadow frustumCulled={false} />
      <instancedMesh ref={black} args={[geo, mats.b, MAX_SHARDS]} castShadow frustumCulled={false} />
    </>
  );
}
const MAX_SHARDS = 96;

/** A camera shot from a camera point and a look point, both in the source's board space. */
function shotFrom(cam: Vec3, look: Vec3): Shot {
  const ox = (cam.x - look.x) * K;
  const oy = (cam.y - look.y) * K;
  const oz = (cam.z - look.z) * K;
  const flat = Math.hypot(ox, oz);
  return {
    target: [look.x * K, SURFACE + look.y * K, look.z * K],
    yaw: Math.atan2(ox, oz),
    pitch: Math.atan2(oy, flat),
    // a little further out than the cathedral's camera: the room's near plane is 8 cm
    dist: Math.max(0.2, Math.hypot(flat, oy) * 1.25),
  };
}

const PLAY_VIEW: Shot = { target: [0, SURFACE, 0.02], yaw: 0, pitch: 0.92, dist: 0.66 };
const DIFFS: WizardDifficulty[] = ['easy', 'medium', 'hard'];
/** Flash intensity in the source's cathedral, scaled for a light that is K times closer (decay 1.5). */
const FLASH = Math.pow(K, 1.5);

export function ChessTable({ onLeave }: { onLeave: () => void }) {
  const make = useWizardSet(SQ);
  const { camera, raycaster, pointer } = useThree();
  const [board, setBoard] = useState<ChessBoard>(() => createInitialBoard());
  const [pieces, setPieces] = useState<Piece[]>(() => piecesFrom(createInitialBoard()));
  const [you, setYou] = useState<ChessPieceColor>('w');
  const [turn, setTurn] = useState<ChessPieceColor>('w');
  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [carry, setCarry] = useState<Carry | null>(null);
  const [dance, setDance] = useState<Dance | null>(null);
  const [diff, setDiff] = useState<WizardDifficulty>('medium');
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
  const bursts = useRef<{ shards: Shard[]; color: ChessPieceColor }[]>([]);
  const flash = useRef<THREE.PointLight>(null);
  const frameCache = useRef<{ now: number; dance: Dance | null; frame: ChoreoFrame | null }>({ now: -1, dance: null, frame: null });
  const camLook = useRef(new THREE.Vector3());

  useEffect(() => {
    setTableView({ ...PLAY_VIEW, yaw: you === 'b' ? Math.PI : 0 });
  }, [you]);

  const at = (r: number, c: number) => pieces.find(p => !p.taken && p.r === r && p.c === c);
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

  /** Commit a move on the board and the pieces. */
  const play = (m: Move, ai: boolean) => {
    const { next, captured, capturedAt, rook, promoted } = applyMove(board, m);
    const mover = at(m.from.r, m.from.c);
    if (!mover) return;
    setPieces(list =>
      list.map(p => {
        if (capturedAt && !p.taken && p.id !== mover.id && p.r === capturedAt.r && p.c === capturedAt.c) return { ...p, taken: true };
        if (p.id === mover.id) return { ...p, r: m.to.r, c: m.to.c, type: promoted ?? p.type };
        if (rook && !p.taken && p.r === rook.from.r && p.c === rook.from.c) return { ...p, c: rook.to.c };
        return p;
      }),
    );
    if (!captured) sound.playChessMove(); // a capture already rang out when the stone burst
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
  };

  /** Where the camera is now, in the source's board space. */
  const cameraOnBoard = (): Vec3 => ({
    x: (camera.position.x - PLAY_TABLE.x) / K,
    y: (camera.position.y - PLAY_TABLE.h - SURFACE) / K,
    z: (camera.position.z - PLAY_TABLE.z) / K,
  });

  /** Start the source's choreography for a move: a walk, or a melee when it takes. */
  const perform = (m: Move, ai: boolean) => {
    const mover = at(m.from.r, m.from.c);
    if (!mover) return;
    const { capturedAt, rook } = applyMove(board, m);
    const victim = capturedAt ? at(capturedAt.r, capturedAt.c) ?? null : null;
    const rookPiece = rook ? at(rook.from.r, rook.from.c) : undefined;
    const cam = cameraOnBoard();
    const ch = planChoreo({
      mover: { id: mover.id, type: mover.type, r: mover.r, c: mover.c },
      to: m.to,
      victim: victim ? { id: victim.id, type: victim.type, r: victim.r, c: victim.c } : null,
      rook: rook && rookPiece ? { id: rookPiece.id, from: rook.from, to: rook.to } : null,
      bystanders: pieces.filter(p => !p.taken).map(p => ({ id: p.id, type: p.type, r: p.r, c: p.c })),
      camReturnDist: Math.hypot(cam.x, cam.y, cam.z) * 0.35,
    });
    let duel: Dance['duel'] = null;
    let shot: Dance['cam'] = null;
    if (ch.capture) {
      const others = pieces.filter(p => !p.taken && p.id !== mover.id && p.id !== victim?.id).map(p => boardToWorld(p.r, p.c));
      duel = duelCamera(ch, cam, others);
      const look = duel.lookStart;
      shot = { shot: shotFrom(duel.wide, look), track: () => toTable(look, camLook.current) };
      followAction(shot.shot, ch.tApproach * 1000, shot.track);
    }
    setSelected(null);
    setDance({ ch, move: m, ai, start: clock.current, duel, cam: shot, done: { close: false, contact: false, shatter: false, committed: false } });
  };

  // The opponent's turn: think a moment, then move. Quiet moves go by the ghost hand; captures are fought.
  useEffect(() => {
    if (turn === you || over || carry || dance) return;
    const t = window.setTimeout(() => {
      const best = chooseSmartAIMove(board, turn, diff);
      if (!best) return;
      const mover = at(best.from.r, best.from.c);
      if (!mover) return;
      if (applyMove(board, best).captured) {
        perform(best, true);
        return;
      }
      const from = sqPos(best.from.r, best.from.c);
      const to = sqPos(best.to.r, best.to.c);
      setCarry({ id: mover.id, from, to, start: clock.current, ai: true });
      // watch it from the side of the board the move is on, low, following the piece
      const side = (best.from.c + best.to.c) / 2 < 3.5 ? -1 : 1;
      followAction({ target: [0, SURFACE, 0], yaw: side * (Math.PI / 2) - side * 0.35, pitch: 0.42, dist: 0.34 }, 2100, () => carryLive.current);
      window.setTimeout(() => {
        play(best, true);
      }, (REACH + LIFT + MOVE + DROP) * 1000 * tableCam.slow);
    }, 540);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, over, carry, dance, board, diff, you]);

  /** Seconds into the current dance, on the capture scripts' slowed clock. */
  const hold = useRef<number | null>(null);
  const danceT = (d: Dance, now: number) => {
    let t = (now - d.start) / tableCam.slow;
    if (hold.current !== null) t = Math.min(t, hold.current);
    return Math.min(d.ch.duration, t);
  };
  /** The choreography time the shards were last stepped to. */
  const shardClock = useRef<{ dance: Dance | null; t: number }>({ dance: null, t: 0 });
  const frameAt = (now: number) => {
    const cache = frameCache.current;
    if (!dance) return null;
    if (cache.now !== now || cache.dance !== dance) {
      cache.now = now;
      cache.dance = dance;
      cache.frame = dance.ch.sample(danceT(dance, now));
    }
    return cache.frame;
  };

  useFrame(({ clock: c }, rawDt) => {
    clock.current = c.elapsedTime;
    const now = c.elapsedTime;
    const dt = Math.min(rawDt, 0.05) / tableCam.slow;

    if (dance) {
      const { ch, duel, done } = dance;
      const t = danceT(dance, now);
      if (ch.capture && duel) {
        if (!done.close && t >= ch.tApproach) {
          done.close = true;
          const span = ch.tStrikeDone - ch.tApproach;
          const d = dance;
          const look: Vec3 = { x: 0, y: 0, z: 0 };
          const track = () => {
            const tt = danceT(d, clock.current);
            const k = Math.min(1, Math.max(0, tt - ch.tApproach) / span);
            look.x = duel.lookStart.x + (duel.lookEnd.x - duel.lookStart.x) * k;
            look.y = duel.lookStart.y + (duel.lookEnd.y - duel.lookStart.y) * k;
            look.z = duel.lookStart.z + (duel.lookEnd.z - duel.lookStart.z) * k;
            // the impact shudder
            const since = tt - ch.tImpact;
            if (since > 0 && since < 0.26) look.y += Math.sin((since / 0.26) * Math.PI * 8) * 0.024 * (1 - since / 0.26) ** 2;
            return toTable(look, camLook.current);
          };
          d.cam = { shot: shotFrom(duel.close, duel.lookEnd), track };
          followAction(d.cam.shot, (span + 0.25) * 1000, track);
        }
        const f = flash.current;
        if (!done.contact && t >= ch.tContact) {
          done.contact = true;
          if (f) {
            toTable({ x: ch.target.x - ch.dir.x * 0.08, y: 0.28, z: ch.target.z - ch.dir.z * 0.08 }, f.position);
            f.intensity = 4.5 * FLASH;
          }
        }
        if (!done.shatter && t >= ch.tImpact) {
          done.shatter = true;
          const victim = pieces.find(p => p.id === ch.plan.victim?.id);
          const origin = { x: ch.target.x + ch.dir.x * 0.045, y: 0, z: ch.target.z + ch.dir.z * 0.045 };
          bursts.current.push({ shards: spawnShards(origin), color: victim?.color ?? 'b' });
          if (f) {
            toTable({ ...origin, y: 0.4 }, f.position);
            f.intensity = 7.5 * FLASH;
          }
          sound.playChessCapture();
        }
      }
      if (!done.committed && t >= ch.duration) {
        done.committed = true;
        play(dance.move, dance.ai);
        setDance(null);
      }
    }

    // The burst settles on the altar, or drops to the table off its edge.
    // During a capture the shards run on the choreography's clock, so they fly the same at any frame rate.
    let shardDt = dt;
    if (dance) {
      const sc = shardClock.current;
      const t = danceT(dance, now);
      if (sc.dance !== dance) {
        sc.dance = dance;
        sc.t = t;
      }
      shardDt = Math.min(0.5, Math.max(0, t - sc.t));
      sc.t = t;
    }
    devFreeze.on = Boolean(dance && hold.current !== null && danceT(dance, now) >= hold.current);
    if (devFreeze.on && dance?.cam && tableCam.follow) tableCam.action = { ...dance.cam, until: performance.now() + 60000 };
    if (bursts.current.length && shardDt > 0) {
      const standing = pieces.filter(p => !p.taken).map(p => boardToWorld(p.r, p.c));
      const floor = (x: number, z: number) => (Math.abs(x * K) > SLAB.x || Math.abs(z * K) > SLAB.z ? -SURFACE / K : 0);
      const steps = Math.ceil(shardDt / (1 / 60));
      for (let i = 0; i < steps; i++) for (const b of bursts.current) stepShards(b.shards, shardDt / steps, standing, floor);
      bursts.current = bursts.current.filter(b => b.shards.length > 0);
    }
    if (flash.current && flash.current.intensity > 0) flash.current.intensity = Math.max(0, flash.current.intensity - dt * 28 * FLASH);

    if (carry) {
      carryPose(carry, now, carryLive.current);
      const k = now - carry.start;
      if (carry.ai) {
        handOn.current = k < REACH + LIFT + MOVE + DROP + BACK * 0.5;
        const reach = Math.min(1, k / REACH);
        if (k < REACH) {
          const homeZ = you === 'w' ? -0.42 : 0.42;
          hand.current.lerpVectors(new THREE.Vector3(carry.from.x * 0.4, SURFACE + 0.08, homeZ), carry.from, reach * reach * (3 - 2 * reach));
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

  /** Where each piece should be right now, which way it faces, and what it is doing. */
  const drive = (p: Piece, now: number, out: Drive) => {
    const f = frameAt(now);
    if (dance && f) {
      const { ch } = dance;
      const t = danceT(dance, now);
      if (p.id === ch.plan.mover.id) {
        toTable(f.mover, out.pos);
        out.heading = ch.heading;
        out.clip = f.phase === 'done' ? 'Idle' : ch.capture && t >= ch.tApproach ? 'Attack' : 'Move';
        if (out.clip === 'Attack') out.clipTime = (t - ch.tApproach) * ATTACK_SYNC_PROFILES[p.type].timeScale;
        // picked up from your hand: settle into the walk before sticking to it
        out.rate = t < 0.35 ? 18 : Infinity;
        return;
      }
      if (p.id === ch.plan.victim?.id) {
        if (!f.victim) {
          out.hidden = true;
          toTable(ch.target, out.pos);
          return;
        }
        toTable(f.victim, out.pos);
        out.heading = ch.victimHeading;
        out.clip = t >= ch.tContact ? 'Shatter' : 'Idle';
        if (out.clip === 'Shatter') out.clipTime = (t - ch.tContact) * CLIP_SPEED;
        out.rate = Infinity;
        return;
      }
      if (p.id === ch.plan.rook?.id && f.rook) {
        toTable(f.rook, out.pos);
        out.heading = ch.plan.rook.to.c > ch.plan.rook.from.c ? Math.PI / 2 : -Math.PI / 2;
        out.clip = 'Move';
        out.rate = Infinity;
        return;
      }
      const nudged = f.nudged.get(p.id);
      if (nudged) {
        toTable(nudged, out.pos);
        out.rate = 30;
        return;
      }
    }
    if (carry && carry.id === p.id) {
      carryPose(carry, now, out.pos);
      out.rate = Infinity;
      return;
    }
    if (p.id === selected) {
      if (dragging) out.pos.copy(dragAt.current);
      else out.pos.copy(sqPos(p.r, p.c, SURFACE + HOVER * 0.6));
      return;
    }
    out.pos.copy(sqPos(p.r, p.c));
  };

  const busy = Boolean(carry || dance);
  const yourTurn = turn === you && !over && !busy;

  /** Your move: a capture is fought out; a quiet move either lands where you let go or walks there. */
  const yourMove = (m: Move, walk: boolean) => {
    if (applyMove(board, m).captured) perform(m, false);
    else if (walk) perform(m, false);
    else play(m, false);
  };

  const grab = (p: Piece, e: { stopPropagation: () => void; pointerId: number; target: EventTarget | null }) => {
    if (!yourTurn) return;
    if (p.color !== you) {
      // tapping an enemy piece with yours in hand is a capture
      if (selPiece && legal.some(m => m.r === p.r && m.c === p.c)) {
        e.stopPropagation();
        yourMove({ from: { r: selPiece.r, c: selPiece.c }, to: { r: p.r, c: p.c } }, true);
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
        yourMove({ from: { r: p.r, c: p.c }, to: sq }, false);
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

  // With a piece in hand, tapping a glowing square sends it walking there.
  const tapSquare = () => {
    if (!yourTurn || !selPiece || dragging || wasDrag()) return;
    const sq = squareUnder();
    if (sq && legal.some(m => m.r === sq.r && m.c === sq.c)) yourMove({ from: { r: selPiece.r, c: selPiece.c }, to: sq }, true);
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
    setDance(null);
    bursts.current = [];
    setOver(null);
    setNote(side === 'w' ? 'Your move. Pick up a piece.' : 'You have the black pieces. White moves first.');
  };

  // Capture scripts drive the table through window.__chessTable (dev server only).
  const load = (b: ChessBoard, toMove: ChessPieceColor) => {
    setBoard(b);
    setPieces(piecesFrom(b));
    setTurn(toMove);
    setSelected(null);
    setCarry(null);
    setDance(null);
    setOver(null);
  };
  const devRef = useRef({ board, turn, you, busy, over, perform, reset, load, setDiff, dance });
  devRef.current = { board, turn, you, busy, over, perform, reset, load, setDiff, dance };
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __chessTable?: unknown };
    w.__chessTable = {
      state: () => {
        const d = devRef.current;
        return { board: d.board, turn: d.turn, you: d.you, busy: d.busy, over: d.over };
      },
      /** Play a move for whoever is to move, with its full animation. Squares are [row, col], row 0 is black's back rank. */
      move: (from: [number, number], to: [number, number]) => {
        const d = devRef.current;
        if (d.busy || d.over) return false;
        const m = { from: { r: from[0], c: from[1] }, to: { r: to[0], c: to[1] } };
        if (!getLegalMoves(d.board, m.from.r, m.from.c).some(x => x.r === m.to.r && x.c === m.to.c)) return false;
        d.perform(m, d.turn !== d.you);
        return true;
      },
      reset: (side?: ChessPieceColor) => devRef.current.reset(side),
      /** Set up a position: a ChessBoard (row 0 black's back rank) and the side to move. */
      load: (b: ChessBoard, toMove: ChessPieceColor = 'w') => devRef.current.load(b, toMove),
      difficulty: (v: WizardDifficulty) => devRef.current.setDiff(v),
      /** Freeze the next capture this many seconds in (null lets it run). */
      hold: (t: number | null) => {
        hold.current = t;
      },
      /** The running choreography's beats, for picking a hold time. */
      beats: () => {
        const d = devRef.current.dance;
        return d ? { capture: d.ch.capture, approach: d.ch.tApproach, contact: d.ch.tContact, impact: d.ch.tImpact, strikeDone: d.ch.tStrikeDone, duration: d.ch.duration } : null;
      },
    };
    return () => {
      delete w.__chessTable;
    };
  }, []);

  const taken = useMemo(() => {
    const lost = pieces.filter(p => p.taken && p.color === you).length;
    const won = pieces.filter(p => p.taken && p.color !== you).length;
    return { won, lost };
  }, [pieces, you]);

  useEffect(() => {
    pushHud({
      title: 'Wizard Chess',
      note: over ?? (turn === you ? note : 'Their move…'),
      detail: `You ${score.you} · Ghost ${score.them} · shattered ${taken.won}, lost ${taken.lost} · drag a piece, or tap it then a glowing square`,
      onLeave,
      actions: [
        { label: `You: ${you === 'w' ? 'White' : 'Black'}`, onClick: () => reset(you === 'w' ? 'b' : 'w'), tone: 'ghost' },
        { label: `Opponent: ${diff[0].toUpperCase()}${diff.slice(1)}`, onClick: () => setDiff(d => DIFFS[(DIFFS.indexOf(d) + 1) % DIFFS.length]), tone: 'ghost' },
        { label: over ? 'Play again' : 'New game', onClick: () => reset(), tone: over ? undefined : 'ghost' },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, over, turn, diff, score, taken, onLeave]);
  useEffect(() => () => pushHud(null), []);
  useEffect(
    () => () => {
      tableCam.grabbing = false;
    },
    [],
  );

  return (
    <group>
      <WizardBoard sq={SQ} />
      {/* the playing surface, for taps on empty squares */}
      <mesh position={[0, SURFACE + 0.0004, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={tapSquare}>
        <planeGeometry args={[SQ * 8, SQ * 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {selPiece &&
        !busy &&
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
      {pieces.map(p =>
        p.taken ? null : <PieceMesh key={`${p.id}${p.type}`} piece={p} make={make} drive={drive} onDown={grab} />,
      )}
      <Shards list={bursts} mats={make.marble} />
      {/* the source's impact flash: always mounted at zero so lighting never recompiles mid-fight */}
      <pointLight ref={flash} color="#ffb74d" intensity={0} distance={6 * K} decay={1.5} />
      <GhostHand at={hand.current} grip={handGrip} visible={handOn} from={you === 'w' ? Math.PI : 0} tint="#c9b8ff" />
      <GhostHand at={myHand.current} grip={myGrip} visible={myHandOn} from={you === 'w' ? 0 : Math.PI} tint="#bfe3ff" />
    </group>
  );
}
