import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import {
  ROOMS,
  SECRET_PASSAGES,
  START_TILES,
  SUSPECTS,
  WEAPONS,
  cardKey,
  type Card,
  type RoomName,
  type Suspect,
  type Weapon,
} from '../../games/clue/clueData';
import {
  accuse,
  aiBeforeRoll,
  aiRoomChoice,
  aiShouldAccuse,
  aiSuggestion,
  aiTileChoice,
  closeReveal,
  moveToRoom,
  moveToTile,
  newClueGame,
  reachable,
  rollClueDie,
  showCard,
  skipSuggestion,
  suggest,
  suggestHere,
  takePassage,
  type ClueState,
} from '../../games/clue/clueEngine';
import { sound } from '../../utils/audio';
import { CLUE_CARD, clueCardTexture } from './clueArt';
import { BOARD_Y, TILE, rectOf, roomCentre, roomPoint, roomSpots, tilePos } from './clueBoard';
import { CameraCard, CardFan, CardPortrait, Hand, Notebook, WeaponMini } from './clueCards';
import { ClueFigure, SUSPECT_COLOUR, type Spot } from './ClueFigure';
import { ClueRooms } from './ClueRooms';
import { pushHud, type HudAction } from './tableHud';
import { followAction, setTableView, wasDrag, type Shot } from './tableCam';
import { useMatchResult } from '../../net/useMatchResult';

/**
 * Clue on the card table, as a pop-up mansion. The box unfolds to the classic
 * flat board with all six suspects on their start squares; then every room
 * springs up out of the board, walls, wallpaper, furniture and all. The
 * suspects are little people who walk the real corridors, file through the
 * doorways, slip down the secret passages and mill about in the rooms while
 * they wait. Every move, yours or a bot's, plays out live while you watch
 * from above. Cards, the suggestion you're making, the card you're shown and
 * your notebook are all physical things in the room.
 */

const P = '/games/monopoly/';
const noRay = () => null;

function sfx(file: 'dice' | 'move', volume = 0.5) {
  const a = new Audio(`${P}sound/${file}.mp3`);
  a.volume = volume;
  void a.play().catch(() => {});
}

const ORDER: Suspect[] = ['Scarlett', 'Mustard', 'White', 'Green', 'Peacock', 'Plum'];
const fullName = (id: Suspect) => SUSPECTS.find(s => s.id === id)!.full;

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
const DICE_REST = new THREE.Vector3(0.31, DIE / 2, -0.05);

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
      const off = new THREE.Vector3(i * 0.026, 0, i * 0.014);
      const rest = DICE_REST.clone().add(off);
      if (!toss) {
        m.position.copy(rest);
        return;
      }
      const k = Math.min(1, (clock.elapsedTime - toss.start) / 1.1);
      const e = 1 - (1 - k) ** 3;
      const p = toss.from.clone().add(off).lerp(rest, e);
      p.y = DIE / 2 + Math.abs(Math.sin(k * Math.PI * 2.5)) * 0.06 * (1 - k);
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
        <mesh key={i} ref={ref} material={mats} castShadow>
          <boxGeometry args={[DIE, DIE, DIE]} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------------------------- weapons --------------------------------- */

function weaponSpot(room: RoomName, k: number) {
  const spots = roomSpots(room);
  const [u, v] = spots[Math.max(0, spots.length - 1 - k)];
  return roomPoint(rectOf(room), u, v);
}

/** A weapon in its room; carried to the next room in an arc when suggested. */
function WeaponPiece({ id, room, k }: { id: Weapon; room: RoomName; k: number }) {
  const g = useRef<THREE.Group>(null);
  const from = useRef<THREE.Vector3 | null>(null);
  const to = useRef(weaponSpot(room, k));
  const t = useRef(1);
  useEffect(() => {
    const next = weaponSpot(room, k);
    if (g.current && next.distanceToSquared(to.current) > 1e-8) {
      from.current = g.current.position.clone();
      t.current = 0;
    }
    to.current = next;
  }, [room, k]);
  useFrame((_, dt) => {
    const n = g.current;
    if (!n) return;
    if (t.current < 1 && from.current) {
      t.current = Math.min(1, t.current + Math.min(dt, 0.05) / 1.3);
      const e = t.current * t.current * (3 - 2 * t.current);
      n.position.copy(from.current).lerp(to.current, e);
      n.position.y += Math.sin(Math.PI * e) * 0.09;
      n.rotation.y += dt * 6 * (1 - e);
    } else n.position.copy(to.current);
  });
  return (
    <group ref={g} position={to.current}>
      <WeaponMini id={id} />
    </group>
  );
}

/* ---------------------------- case file and seats --------------------------- */

/** The case-file envelope in the cellar; the answer rises out of it at the end. */
function CaseFile({ solution }: { solution: Card[] | null }) {
  const { camera } = useThree();
  const cards = useRef<(THREE.Group | null)[]>([]);
  const t = useRef(0);
  const flapRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    t.current = solution ? Math.min(1, t.current + dt / 1.6) : 0;
    const e = t.current;
    if (flapRef.current) flapRef.current.rotation.x = -e * 2.4;
    const yaw = Math.atan2(camera.position.x - 0, camera.position.z - 0);
    cards.current.forEach((c, i) => {
      if (!c) return;
      const k = THREE.MathUtils.clamp(e * 1.6 - i * 0.2, 0, 1);
      c.visible = k > 0;
      c.position.set((i - 1) * 0.044 * k, BOARD_Y + 0.004 + k * 0.05, 0);
      c.rotation.set(0, yaw + (1 - k) * Math.PI, 0);
    });
  });
  return (
    <group>
      <mesh position={[0, BOARD_Y + 0.0015, 0]} raycast={noRay}>
        <boxGeometry args={[0.044, 0.002, 0.03]} />
        <meshStandardMaterial color="#d8b878" roughness={0.9} />
      </mesh>
      <group ref={flapRef} position={[0, BOARD_Y + 0.0026, -0.015]}>
        <mesh position={[0, 0, 0.008]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRay}>
          <planeGeometry args={[0.044, 0.016]} />
          <meshStandardMaterial color="#c9a46a" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh position={[0, BOARD_Y + 0.0028, 0.002]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRay}>
        <circleGeometry args={[0.0035, 16]} />
        <meshStandardMaterial color="#8c1d22" roughness={0.5} />
      </mesh>
      {solution?.map((c, i) => (
        <group
          key={cardKey(c)}
          ref={el => {
            cards.current[i] = el;
          }}
          visible={false}
        >
          <mesh position={[0, CLUE_CARD.h / 2, 0]} raycast={noRay}>
            <planeGeometry args={[CLUE_CARD.w, CLUE_CARD.h]} />
            <meshBasicMaterial map={clueCardTexture(c)} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          <group position={[0, CLUE_CARD.h / 2, 0]}>
            <CardPortrait card={c} spin="up" />
          </group>
        </group>
      ))}
    </group>
  );
}

/** A folded name card and a face-down hand at each opponent's seat. */
function Seat({ name, colour, cards, angle }: { name: string; colour: string; cards: number; angle: number }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 384;
    c.height = 96;
    const g = c.getContext('2d')!;
    g.fillStyle = '#f4ecd8';
    g.fillRect(0, 0, 384, 96);
    g.fillStyle = colour;
    g.fillRect(0, 0, 24, 96);
    g.fillStyle = '#1a1a1a';
    g.font = '700 40px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(name, 204, 50);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [name, colour]);
  const back = useMemo(() => clueCardTexture(null), []);
  const x = Math.sin(angle) * 0.42;
  const z = -Math.cos(angle) * 0.29;
  const yaw = Math.atan2(-x, -z);
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      {/* tent card, facing the middle of the table */}
      <group position={[0, 0, -0.02]}>
        <mesh position={[0, 0.011, 0.004]} rotation={[-0.35, Math.PI, 0]} raycast={noRay}>
          <planeGeometry args={[0.07, 0.0175]} />
          <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.011, -0.004]} rotation={[0.35, 0, 0]} raycast={noRay}>
          <planeGeometry args={[0.07, 0.0175]} />
          <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      </group>
      {Array.from({ length: cards }, (_, i) => (
        <mesh key={i} position={[(i - (cards - 1) / 2) * 0.008, 0.0004 + i * 0.0002, 0.025]} rotation={[-Math.PI / 2, 0, (i - (cards - 1) / 2) * 0.12]} raycast={noRay}>
          <planeGeometry args={[CLUE_CARD.w * 0.8, CLUE_CARD.h * 0.8]} />
          <meshStandardMaterial map={back} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------ move highlights ----------------------------- */

function Highlights({ tiles, rooms, onTile, onRoom }: { tiles: { x: number; y: number }[]; rooms: RoomName[]; onTile: (x: number, y: number) => void; onRoom: (r: RoomName) => void }) {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#7CF29A', transparent: true, opacity: 0.45, depthWrite: false, toneMapped: false }), []);
  const roomMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffd36b', transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false }), []);
  useFrame(({ clock }) => {
    const p = 0.5 + Math.sin(clock.elapsedTime * 4) * 0.5;
    mat.opacity = 0.3 + p * 0.3;
    roomMat.opacity = 0.14 + p * 0.18;
  });
  const click = (fn: () => void) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (!wasDrag()) fn();
  };
  return (
    <group>
      {tiles.map(t => {
        const p = tilePos(t.x, t.y);
        return (
          <mesh key={`${t.x},${t.y}`} position={[p.x, BOARD_Y + 0.0009, p.z]} rotation={[-Math.PI / 2, 0, 0]} material={mat} onClick={click(() => onTile(t.x, t.y))}>
            <planeGeometry args={[TILE * 0.8, TILE * 0.8]} />
          </mesh>
        );
      })}
      {rooms.map(r => {
        const rect = rectOf(r);
        const c = roomCentre(r);
        return (
          <mesh key={r} position={[c.x, BOARD_Y + 0.0012, c.z]} rotation={[-Math.PI / 2, 0, 0]} material={roomMat} onClick={click(() => onRoom(r))}>
            <planeGeometry args={[rect.w * TILE * 0.96, rect.h * TILE * 0.96]} />
          </mesh>
        );
      })}
    </group>
  );
}

/* ----------------------------------- table ---------------------------------- */

const OVERVIEW: Shot = { target: [0, 0, 0], yaw: 0, pitch: 1.0, dist: 0.82 };
const PLAY_VIEW: Shot = { target: [0, 0, 0.035], yaw: 0, pitch: 1.1, dist: 0.74 };

type Picker = { mode: 'suggest' | 'accuse'; suspect?: Suspect; weapon?: Weapon };

export function ClueTable({ onLeave }: { onLeave: () => void }) {
  const [setup, setSetup] = useState<{ pick: number; opponents: number } | null>({ pick: 0, opponents: 3 });
  const [state, setState] = useState<ClueState | null>(null);
  const [raised, setRaised] = useState(false);
  const [intro, setIntro] = useState(true);
  const [toss, setToss] = useState<Throw | null>(null);
  const [walkers, setWalkers] = useState(0);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [noteUp, setNoteUp] = useState(false);
  const rolling = useRef(false);
  const clock = useRef(0);
  const diceLive = useRef(new THREE.Vector3());
  const lives = useRef(Object.fromEntries(ORDER.map(id => [id, new THREE.Vector3()])) as Record<Suspect, THREE.Vector3>);
  const walking = walkers > 0;

  useFrame(({ clock: c }) => {
    clock.current = c.elapsedTime;
  });

  // The flat board first, then the mansion pops up, then choose who you are.
  useMatchResult('clue', state?.winner ? (state.winner === 'You' ? 'won' : 'lost') : null);
  useEffect(() => {
    setTableView(OVERVIEW);
    const a = window.setTimeout(() => setRaised(true), 900);
    const b = window.setTimeout(() => setIntro(false), 4400);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  useEffect(() => {
    if (intro) return;
    if (setup) {
      const p = tilePos(...START_TILES[ORDER[setup.pick]]);
      setTableView({ target: [p.x, 0.02, p.z], yaw: 0, pitch: 0.62, dist: 0.24 });
    } else setTableView(PLAY_VIEW);
  }, [setup, intro]);

  const meIdx = state ? state.players.findIndex(p => !p.isAI) : -1;
  const me = meIdx >= 0 && state ? state.players[meIdx] : null;
  const actor = state?.players[state.turn];
  const myTurn = Boolean(state && actor && !actor.isAI && state.stage !== 'over');

  const start = () => {
    if (!setup) return;
    const s = newClueGame('You', { me: ORDER[setup.pick], seats: setup.opponents + 1, refuterChooses: true });
    setState(s);
    setSetup(null);
  };

  // Who is walking right now: the bots wait until everyone has arrived.
  const walkingSet = useRef(new Set<Suspect>());
  const startWalk = (id: Suspect, stops: number) => {
    walkingSet.current.add(id);
    setWalkers(walkingSet.current.size);
    if (stops > 1) followAction({ target: [0, 0, 0], yaw: 0, pitch: 0.95, dist: 0.36 }, Math.min(7000, stops * 230 + 700), () => lives.current[id]);
  };
  const endWalk = (id: Suspect) => {
    walkingSet.current.delete(id);
    setWalkers(walkingSet.current.size);
  };

  const throwDice = () => {
    if (rolling.current || !state || walking || state.stage !== 'roll') return;
    rolling.current = true;
    const values: [number, number] = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
    const rand = () => new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    const who = lives.current[state.players[state.turn].suspect];
    const from = new THREE.Vector3(who.x * 0.5 + 0.1, 0.12, who.z * 0.5 + 0.1);
    setToss({ values, from, start: clock.current, spin: [rand(), rand()] });
    sfx('dice', 0.6);
    followAction({ target: [DICE_REST.x, 0.01, DICE_REST.z], yaw: 0.3, pitch: 0.7, dist: 0.3 }, 1300, () => diceLive.current);
    window.setTimeout(() => {
      setState(cur => (cur ? rollClueDie(cur, values) : cur));
      rolling.current = false;
    }, 1150);
  };

  const apply = (fn: (s: ClueState) => ClueState) => setState(cur => (cur ? fn(cur) : cur));

  // Lean into the room when a suggestion is made there.
  const lastSugKey = useRef('');
  useEffect(() => {
    const sg = state?.lastSuggestion;
    const k = sg ? `${sg.by}|${sg.suspect}|${sg.weapon}|${sg.room}|${state?.log.length}` : '';
    if (sg && k !== lastSugKey.current) {
      lastSugKey.current = k;
      const c = roomCentre(sg.room);
      window.setTimeout(() => followAction({ target: [c.x, 0.01, c.z], yaw: 0, pitch: 0.8, dist: 0.3 }, 2600), 250);
    }
  }, [state?.lastSuggestion, state?.log.length]);

  // A walk that never reports in (a tab in the background) can't stall the game.
  useEffect(() => {
    if (!walking) return;
    const t = window.setTimeout(() => {
      walkingSet.current.clear();
      setWalkers(0);
    }, 12000);
    return () => window.clearTimeout(t);
  }, [walking, walkers]);

  // Bots take their turns at a pace you can follow.
  useEffect(() => {
    if (!state || !actor || state.stage === 'over' || walking || rolling.current) return;
    const s = state;
    const bot = actor.isAI;
    if (s.stage === 'reveal' && s.players[s.turn].isAI) {
      const t = window.setTimeout(() => apply(closeReveal), 2400);
      return () => window.clearTimeout(t);
    }
    if (!bot) return;
    const t = window.setTimeout(() => {
      if (s.stage === 'roll') {
        const acc = aiShouldAccuse(s);
        if (acc) return apply(cur => accuse(cur, acc));
        const pre = aiBeforeRoll(s);
        if (pre === 'passage') return apply(takePassage);
        if (pre === 'suggest') return apply(suggestHere);
        return throwDice();
      }
      if (s.stage === 'move') {
        const room = aiRoomChoice(s);
        if (room) return apply(cur => moveToRoom(cur, room));
        const tile = aiTileChoice(s);
        if (tile) return apply(cur => moveToTile(cur, tile[0], tile[1]));
        return apply(skipSuggestion);
      }
      if (s.stage === 'suggest') return apply(cur => suggest(cur, aiSuggestion(cur)));
    }, 1100);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, walking]);

  // Your suggestion opens its card picker as soon as you walk in.
  useEffect(() => {
    if (myTurn && state?.stage === 'suggest' && !walking) setPicker(p => p ?? { mode: 'suggest' });
    if (state?.stage !== 'suggest' && picker?.mode === 'suggest') setPicker(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTurn, state?.stage, walking]);

  const pick = (c: Card) => {
    sound.playCardFlip();
    if (!picker || !state) return;
    if (c.kind === 'suspect') return setPicker({ ...picker, suspect: c.value });
    if (c.kind === 'weapon') {
      if (picker.mode === 'suggest' && picker.suspect && me?.room) {
        const sg = { suspect: picker.suspect, weapon: c.value, room: me.room };
        setPicker(null);
        return apply(cur => suggest(cur, sg));
      }
      return setPicker({ ...picker, weapon: c.value });
    }
    if (c.kind === 'room' && picker.suspect && picker.weapon) {
      const guess = { suspect: picker.suspect, weapon: picker.weapon, room: c.value };
      setPicker(null);
      apply(cur => accuse(cur, guess));
    }
  };

  // Capture scripts pick cards with window.__cluePick (dev server only).
  if (import.meta.env.DEV) (window as unknown as { __cluePick?: (c: Card) => void }).__cluePick = pick;

  const fanCards: Card[] = !picker
    ? []
    : !picker.suspect
      ? SUSPECTS.map(s => ({ kind: 'suspect', value: s.id }) as Card)
      : !picker.weapon
        ? WEAPONS.map(w => ({ kind: 'weapon', value: w.id }) as Card)
        : ROOMS.map(r => ({ kind: 'room', value: r }) as Card);
  const fanTitle = !picker
    ? ''
    : !picker.suspect
      ? picker.mode === 'accuse'
        ? 'Accuse: who did it?'
        : `Suggest in the ${me?.room ?? ''}: who?`
      : !picker.weapon
        ? 'With which weapon?'
        : 'In which room?';

  const moves = useMemo(() => (state && myTurn && state.stage === 'move' && !walking ? reachable(state, state.stepsLeft) : { tiles: [], rooms: [] }), [state, myTurn, walking]);
  const passageTo = me?.room ? SECRET_PASSAGES[me.room] : undefined;

  // The card someone shows you flips up in front of you.
  const shown = state?.stage === 'reveal' && state.lastRefutation && !state.lastRefutation.hidden && state.players[state.turn] === me ? state.lastRefutation.card : null;
  const refuting = state?.stage === 'refute' && state.pendingRefute && state.pendingRefute.by === meIdx ? state.pendingRefute : null;

  /* ------------------------------------ HUD ----------------------------------- */
  useEffect(() => {
    if (intro) {
      pushHud({ title: 'Clue', note: 'The mansion is popping up out of the board…', onLeave, actions: [], typed: true });
      return;
    }
    if (setup) {
      const id = ORDER[setup.pick];
      const step = (d: number) => setSetup(s => (s ? { ...s, pick: (s.pick + d + 6) % 6 } : s));
      pushHud({
        title: 'Clue · Choose your suspect',
        note: `${fullName(id)}. Tap a figure on the board or step through them.`,
        detail: `${setup.opponents} opponent${setup.opponents > 1 ? 's' : ''} · Miss Scarlett moves first`,
        onLeave,
        typed: true,
        actions: [
          { label: '◀', onClick: () => step(-1), tone: 'ghost' },
          { label: '▶', onClick: () => step(1), tone: 'ghost' },
          { label: `Opponents: ${setup.opponents}`, onClick: () => setSetup(s => (s ? { ...s, opponents: s.opponents >= 5 ? 2 : s.opponents + 1 } : s)), tone: 'ghost' },
          { label: `Play as ${fullName(id)}`, onClick: start },
        ],
      });
      return;
    }
    if (!state) return;
    const actions: HudAction[] = [];
    const busy = walking || rolling.current;
    let note = state.log[0] ?? '';
    if (myTurn && !busy && !picker) {
      if (state.stage === 'roll') {
        actions.push({ label: 'Roll the dice', onClick: throwDice });
        if (passageTo) actions.push({ label: `Secret passage to the ${passageTo}`, onClick: () => apply(takePassage), tone: 'ghost' });
        if (me?.pulled && me.room) actions.push({ label: `Suggest in the ${me.room}`, onClick: () => apply(suggestHere), tone: 'ghost' });
        actions.push({ label: 'Accuse…', onClick: () => setPicker({ mode: 'accuse' }), tone: 'ghost' });
        note = `Your turn${me?.room ? `, in the ${me.room}` : ''}. ${state.log[0] ?? ''}`;
      }
      if (state.stage === 'move') {
        note = `You rolled ${state.die}. Tap a green square, or a glowing room you can reach.`;
        moves.rooms.forEach(r => actions.push({ label: `Into the ${r.room}`, onClick: () => apply(cur => moveToRoom(cur, r.room)), tone: 'ghost' }));
        if (moves.tiles.length === 0 && moves.rooms.length === 0) actions.push({ label: 'No moves: end turn', onClick: () => apply(skipSuggestion) });
      }
    }
    // You can read the card and move on while the suspect is still walking in.
    if (myTurn && state.stage === 'reveal' && !picker) actions.push({ label: 'Continue', onClick: () => apply(closeReveal) });
    if (picker) {
      note = picker.mode === 'accuse' ? 'Pick the three cards in the case file. A wrong accusation puts you out.' : 'Pick a suspect card, then a weapon card.';
      if (picker.suspect || picker.weapon) note += ` So far: ${[picker.suspect && fullName(picker.suspect), picker.weapon].filter(Boolean).join(', ')}.`;
      if (picker.mode === 'suggest') actions.push({ label: 'Skip the suggestion', onClick: () => (setPicker(null), apply(skipSuggestion)), tone: 'ghost' });
      if (picker.mode === 'suggest') actions.push({ label: 'Accuse instead…', onClick: () => setPicker({ mode: 'accuse' }), tone: 'ghost' });
      else actions.push({ label: 'Cancel', onClick: () => setPicker(state.stage === 'suggest' ? { mode: 'suggest' } : null), tone: 'ghost' });
    }
    if (refuting && state.lastSuggestion) {
      const sg = state.lastSuggestion;
      note = `${state.players[sg.by].name} suggests ${fullName(sg.suspect)}, ${sg.weapon}, ${sg.room}. Tap one of your glowing cards to show them.`;
    }
    if (state.stage === 'over') {
      note = `${state.winner === 'You' ? 'You crack the case!' : `${state.winner} wins.`} It was ${fullName(state.solution.suspect)} in the ${state.solution.room} with the ${state.solution.weapon}.`;
      actions.push({ label: 'New game', onClick: () => (setState(null), setPicker(null), setSetup({ pick: 0, opponents: 3 })) });
    }
    actions.push({ label: noteUp ? 'Put notes down' : 'Notebook', onClick: () => setNoteUp(v => !v), tone: 'ghost' });
    pushHud({
      title: `Clue${actor && state.stage !== 'over' ? ` · ${actor.isAI ? `${actor.name}'s turn` : 'Your turn'}` : ''}`,
      note,
      detail: state.players.map(p => `${p.isAI ? p.name : `You (${fullName(p.suspect)})`}${p.outOfGame ? ' · out' : ''}`).join('  ·  '),
      onLeave,
      typed: true,
      actions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, setup, intro, walking, picker, noteUp, onLeave, myTurn, moves, shown, refuting]);
  useEffect(() => () => pushHud(null), []);

  /* ---------------------------------- pieces ---------------------------------- */

  const spots: Record<Suspect, Spot> = useMemo(() => {
    const out = {} as Record<Suspect, Spot>;
    ORDER.forEach(id => (out[id] = { at: START_TILES[id], room: null }));
    state?.players.forEach(p => (out[p.suspect] = { at: p.at, room: p.room }));
    state?.bystanders.forEach(b => (out[b.suspect] = { at: b.at, room: b.room }));
    return out;
  }, [state]);

  const weaponRooms = useMemo(() => {
    if (state) return state.weaponRooms;
    return WEAPONS.reduce((acc, w, i) => ({ ...acc, [w.id]: ROOMS[i % ROOMS.length] }), {} as Record<Weapon, RoomName>);
  }, [state]);
  const weaponIndex = (w: Weapon) => WEAPONS.filter(x => weaponRooms[x.id] === weaponRooms[w]).findIndex(x => x.id === w);

  const pulled = state?.lastSuggestion?.suspect;
  const deckFrom = useMemo(() => new THREE.Vector3(0, BOARD_Y, 0.3), []);
  const solution: Card[] | null =
    state?.stage === 'over'
      ? [
          { kind: 'suspect', value: state.solution.suspect },
          { kind: 'weapon', value: state.solution.weapon },
          { kind: 'room', value: state.solution.room },
        ]
      : null;
  const glowing = new Set(refuting ? refuting.options.map(cardKey) : []);
  const ais = state ? state.players.filter(p => p.isAI) : [];

  return (
    <group>
      <ClueRooms raised={raised} />
      {ORDER.map((id, i) => (
        <ClueFigure
          key={id}
          id={id}
          spot={spots[id]}
          slot={i}
          active={Boolean(actor && actor.suspect === id && state?.stage !== 'over')}
          fast={pulled === id}
          live={lives.current[id]}
          chosen={Boolean(setup && !intro && ORDER[setup.pick] === id)}
          onClick={setup && !intro ? () => setSetup(s => (s ? { ...s, pick: i } : s)) : undefined}
          onStart={stops => startWalk(id, stops)}
          onArrive={() => endWalk(id)}
          onStep={() => sfx('move', 0.08)}
        />
      ))}
      {WEAPONS.map(w => (
        <WeaponPiece key={w.id} id={w.id} room={weaponRooms[w.id]} k={weaponIndex(w.id)} />
      ))}
      <CaseFile solution={solution} />
      <Dice toss={toss} live={diceLive.current} />
      {state && (
        <>
          <Highlights
            tiles={moves.tiles}
            rooms={[...moves.rooms.map(r => r.room)]}
            onTile={(x, y) => apply(cur => moveToTile(cur, x, y))}
            onRoom={r => apply(cur => moveToRoom(cur, r))}
          />
          {me && <Hand cards={me.hand} glowing={glowing} onPick={c => apply(cur => showCard(cur, c))} />}
          <Notebook me={me} version={`${me?.detective.cleared.size ?? 0}|${state.log.length}`} lifted={noteUp} onToggle={() => setNoteUp(v => !v)} />
          {ais.map((p, i) => (
            <Seat key={p.id} name={fullName(p.suspect)} colour={SUSPECT_COLOUR[p.suspect]} cards={p.hand.length} angle={((i + 0.5) / ais.length - 0.5) * Math.PI * 1.15} />
          ))}
        </>
      )}
      {picker && fanCards.length > 0 && <CardFan key={`${picker.mode}${picker.suspect ?? ''}${picker.weapon ?? ''}`} cards={fanCards} from={deckFrom} onPick={pick} title={fanTitle} />}
      {shown && <CameraCard key={cardKey(shown)} card={shown} from={deckFrom} x={0} y={0.02} dist={0.125} scale={1.65} faceUp />}
    </group>
  );
}
