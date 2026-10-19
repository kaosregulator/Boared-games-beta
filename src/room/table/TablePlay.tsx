import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PLAY_TABLE } from '../roomLayout';
import { BOARD, GROUP_COLORS, type Space } from '../../games/monopoly/monopolyData';
import {
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
import {
  checkConnect4Win,
  createEmptyConnect4Board,
  getBestConnect4Move,
  getLowestEmptyRow,
} from '../../games/connect4/connect4Logic';
import {
  createEmptyGrid,
  generateRandomFleet,
  getSmartAIMove,
  isValidPlacement,
  SHIP_DEFINITIONS,
} from '../../games/battleship/battleshipLogic';
import type { CellState, DiscColor, Ship } from '../../types';

export type TableGameId = 'monopoly' | 'connect4' | 'battleship';

const HALF = 0.25;
const CORNER = 0.064;
const TILE_W = (2 * HALF - 2 * CORNER) / 9;
const TILE_D = CORNER;

/** 40-square loop, GO at the near-right corner, matching a tabletop board. */
function tilePos(index: number): [number, number] {
  const edge = HALF - CORNER / 2;
  const inner = HALF - CORNER - TILE_W / 2;
  if (index === 0) return [edge, edge];
  if (index < 10) return [inner - (index - 1) * TILE_W, HALF - TILE_D / 2];
  if (index === 10) return [-edge, edge];
  if (index < 20) return [-(HALF - TILE_D / 2), inner - (index - 11) * TILE_W];
  if (index === 20) return [-edge, -edge];
  if (index < 30) return [-(inner - (index - 21) * TILE_W), -(HALF - TILE_D / 2)];
  if (index === 30) return [edge, -edge];
  return [HALF - TILE_D / 2, -(inner - (index - 31) * TILE_W)];
}

function tileSize(index: number): [number, number] {
  return index % 10 === 0 ? [CORNER, CORNER] : index < 10 || (index > 20 && index < 30) ? [TILE_W * 0.96, TILE_D * 0.92] : [TILE_D * 0.92, TILE_W * 0.96];
}

function spaceColor(space: Space) {
  if (space.group && space.group in GROUP_COLORS) return GROUP_COLORS[space.group];
  if (space.kind === 'go') return '#efe3bf';
  if (space.kind === 'jail') return '#f0a15a';
  if (space.kind === 'parking') return '#e23d3d';
  if (space.kind === 'gotojail') return '#2a2a2a';
  if (space.kind === 'chance') return '#ef8a32';
  if (space.kind === 'chest') return '#f2d36a';
  if (space.kind === 'tax') return '#d5d5d5';
  return '#cbb89a';
}

interface HudAction {
  label: string;
  onClick: () => void;
  tone?: 'amber' | 'ghost';
}

interface HudModel {
  title: string;
  note: string;
  onLeave: () => void;
  actions: HudAction[];
}

/** DOM copy of the match. Kept outside the canvas so a <p> never hits the WebGL reconciler. */
let hudModel: HudModel | null = null;
const hudSubs = new Set<(model: HudModel | null) => void>();

function pushHud(next: HudModel | null) {
  hudModel = next;
  hudSubs.forEach(fn => fn(next));
}

export function TableHudOverlay() {
  const [model, setModel] = useState<HudModel | null>(null);
  useEffect(() => {
    hudSubs.add(setModel);
    setModel(hudModel);
    return () => {
      hudSubs.delete(setModel);
    };
  }, []);
  if (!model) return null;
  return (
    <div className="pointer-events-none absolute right-4 top-16 z-30 w-[min(22rem,calc(100vw-7rem))]">
      <div
        data-ui="table"
        className="pointer-events-auto rounded-2xl border border-white/15 bg-black/75 px-4 py-3 text-white shadow-2xl backdrop-blur"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">{model.title}</p>
            <p className="mt-1 text-sm text-white/90">{model.note}</p>
          </div>
          <button
            type="button"
            onClick={model.onLeave}
            className="shrink-0 rounded-xl bg-amber-400 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-black"
          >
            Pack up
          </button>
        </div>
        {model.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {model.actions.map(action => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                  action.tone === 'ghost' ? 'border border-white/20 bg-white/10 text-white' : 'bg-amber-400 text-black'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TableWood() {
  const { w, d, h } = PLAY_TABLE;
  return (
    <group>
      <mesh position={[0, h - 0.02, 0]} receiveShadow>
        <boxGeometry args={[w, 0.04, d]} />
        <meshStandardMaterial color="#8a5a32" roughness={0.72} metalness={0} />
      </mesh>
      <mesh position={[0, h - 0.045, 0]}>
        <boxGeometry args={[w * 0.96, 0.012, d * 0.94]} />
        <meshStandardMaterial color="#c4894e" roughness={0.55} metalness={0} />
      </mesh>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[(w / 2 - 0.06) * sx, h / 2 - 0.02, (d / 2 - 0.06) * sz]}>
          <boxGeometry args={[0.05, h - 0.04, 0.05]} />
          <meshStandardMaterial color="#5c3a22" roughness={0.8} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

function MonopolyMatch({ onLeave }: { onLeave: () => void }) {
  const [state, setState] = useState<GameState>(() =>
    newGame([
      { name: 'You', isAI: false, token: 'hat', glyph: '🎩' },
      { name: 'Rival', isAI: true, token: 'car', glyph: '🚗' },
    ]),
  );
  const you = state.players[0];
  const rival = state.players[1];
  const actor = state.players[state.turn];
  const log = state.log[0] ?? 'Roll to leave GO.';

  useEffect(() => {
    if (!actor?.isAI || state.stage === 'over') return;
    const timer = window.setTimeout(() => {
      setState(cur => {
        const who = cur.players[cur.turn];
        if (!who?.isAI || cur.stage === 'over') return cur;
        if (cur.stage === 'roll') return rollDice(cur);
        if (cur.pendingPurchase !== null) return buyPending(cur, aiWantsToBuy(cur, cur.pendingPurchase));
        const spot = aiBuildTarget(cur);
        if (spot !== null) return build(cur, spot);
        return endTurn(cur);
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [actor?.isAI, state.stage, state.turn, state.pendingPurchase, state.log.length]);

  const human = actor && !actor.isAI && state.stage !== 'over';

  useEffect(() => {
    const actions: HudAction[] = [];
    if (human && state.stage === 'roll') actions.push({ label: 'Roll', onClick: () => setState(cur => rollDice(cur)) });
    if (human && state.pendingPurchase !== null) {
      actions.push({ label: 'Buy', onClick: () => setState(cur => buyPending(cur, true)) });
      actions.push({ label: 'Pass', onClick: () => setState(cur => buyPending(cur, false)), tone: 'ghost' });
    }
    if (human && state.stage !== 'roll' && state.pendingPurchase === null && state.stage !== 'over') {
      actions.push({
        label: state.doublesRun > 0 ? 'Roll again' : 'End turn',
        onClick: () => setState(cur => endTurn(cur)),
        tone: 'ghost',
      });
    }
    const buildHint = human && state.stage !== 'roll' ? ' Click a street you own to build.' : '';
    const over = state.stage === 'over' ? `${state.winner} wins the board. ` : '';
    pushHud({
      title: 'Monopoly',
      note: `${over}${log}  ·  You $${you.cash}  ·  Rival $${rival.cash}.${buildHint}`,
      onLeave,
      actions,
    });
  }, [human, log, onLeave, rival.cash, state.doublesRun, state.pendingPurchase, state.stage, state.winner, you.cash]);
  useEffect(() => () => pushHud(null), []);

  return (
    <group position={[0, PLAY_TABLE.h, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
        <planeGeometry args={[HALF * 2 + 0.02, HALF * 2 + 0.02]} />
        <meshStandardMaterial color="#1c6b3a" roughness={0.9} />
      </mesh>
      {BOARD.map(space => {
        const [x, z] = tilePos(space.i);
        const [sx, sz] = tileSize(space.i);
        const deed = state.deeds[space.i];
        return (
          <group key={space.i} position={[x, 0.008, z]}>
            <mesh
              onClick={event => {
                event.stopPropagation();
                if (!human || state.stage === 'roll') return;
                if (canBuild(state, space.i, actor.id)) setState(cur => build(cur, space.i));
              }}
            >
              <boxGeometry args={[sx, 0.012, sz]} />
              <meshStandardMaterial color={spaceColor(space)} roughness={0.6} metalness={0} />
            </mesh>
            {deed && deed.owner === 0 && (
              <mesh position={[0, 0.01, 0]}>
                <boxGeometry args={[sx * 0.35, 0.008, sz * 0.18]} />
                <meshStandardMaterial color="#f0b429" />
              </mesh>
            )}
            {deed && deed.owner === 1 && (
              <mesh position={[0, 0.01, 0]}>
                <boxGeometry args={[sx * 0.35, 0.008, sz * 0.18]} />
                <meshStandardMaterial color="#38bdf8" />
              </mesh>
            )}
            {deed && !deed.hotel &&
              Array.from({ length: deed.houses }, (_, h) => (
                <mesh key={h} position={[(h - 1.5) * sx * 0.16, 0.02, 0]}>
                  <boxGeometry args={[sx * 0.12, 0.02, sz * 0.2]} />
                  <meshStandardMaterial color="#2f9e44" />
                </mesh>
              ))}
            {deed?.hotel && (
              <mesh position={[0, 0.028, 0]}>
                <boxGeometry args={[sx * 0.28, 0.035, sz * 0.28]} />
                <meshStandardMaterial color="#c0392b" />
              </mesh>
            )}
          </group>
        );
      })}
      <Token at={you.at} color="#f0b429" kind="hat" seat={0} />
      <Token at={rival.at} color="#38bdf8" kind="car" seat={1} />
    </group>
  );
}

function Token({ at, color, kind, seat }: { at: number; color: string; kind: 'hat' | 'car'; seat: number }) {
  const group = useRef<THREE.Group>(null);
  const shown = useRef(at);
  useFrame((_, dt) => {
    let delta = at - shown.current;
    if (delta > 20) delta -= 40;
    if (delta < -20) delta += 40;
    shown.current += delta * Math.min(1, dt * 3.2);
    const index = ((Math.round(shown.current) % 40) + 40) % 40;
    const [x, z] = tilePos(index);
    const nudge = seat === 0 ? 0.012 : -0.012;
    if (group.current) group.current.position.set(x + nudge, 0.03, z + nudge);
  });
  return (
    <group ref={group}>
      {kind === 'hat' ? (
        <>
          <mesh position={[0, 0.01, 0]}>
            <cylinderGeometry args={[0.018, 0.02, 0.006, 12]} />
            <meshStandardMaterial color={color} roughness={0.35} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.028, 0]}>
            <cylinderGeometry args={[0.012, 0.013, 0.028, 12]} />
            <meshStandardMaterial color={color} roughness={0.35} metalness={0.4} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, 0.016, 0]}>
          <boxGeometry args={[0.028, 0.014, 0.016]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.35} />
        </mesh>
      )}
    </group>
  );
}

const C4_ROWS = 6;
const C4_COLS = 7;
const C4_PITCH = 0.058;
const C4_BASE = 0.1;

function c4Slot(col: number, row: number): [number, number, number] {
  return [(col - 3) * C4_PITCH, C4_BASE + (C4_ROWS - 1 - row) * C4_PITCH, -0.01];
}

function ConnectMatch({ onLeave }: { onLeave: () => void }) {
  const [board, setBoard] = useState<DiscColor[][]>(() => createEmptyConnect4Board());
  const [turn, setTurn] = useState<'red' | 'yellow'>('red');
  const [winner, setWinner] = useState<'red' | 'yellow' | 'draw' | null>(null);
  const [fall, setFall] = useState<{ col: number; row: number; color: 'red' | 'yellow' } | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const drop = (col: number, color: 'red' | 'yellow') => {
    if (winner || fall) return;
    const row = getLowestEmptyRow(board, col);
    if (row < 0) return;
    setFall({ col, row, color });
  };

  const finishFall = () => {
    if (!fall) return;
    const landed = fall;
    const next = board.map(row => row.slice());
    next[landed.row][landed.col] = landed.color;
    const result = checkConnect4Win(next);
    setBoard(next);
    if (result.winner) {
      setWinner(result.winner);
      setFall(null);
      return;
    }
    const following = landed.color === 'red' ? 'yellow' : 'red';
    setTurn(following);
    if (following === 'yellow') {
      const col = getBestConnect4Move(next, 'medium');
      const row = getLowestEmptyRow(next, col);
      if (row >= 0) {
        // Replace the falling disc in one update so the new one remounts and animates.
        setFall({ col, row, color: 'yellow' });
        return;
      }
    }
    setFall(null);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const n = Number(event.key);
      if (n >= 1 && n <= 7 && turn === 'red') drop(n - 1, 'red');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [board, fall, turn, winner]);

  const note =
    winner === 'draw'
      ? 'The grid is full.'
      : winner
        ? winner === 'red'
          ? 'Four in a row. You win.'
          : 'Four in a row. The room wins this one.'
        : turn === 'red'
          ? 'Click a column, or press 1–7. Look around — the room stays with you.'
          : 'Their disc is dropping.';

  useEffect(() => {
    pushHud({
      title: 'Connect Four',
      note,
      onLeave,
      actions: winner
        ? [
            {
              label: 'Play again',
              onClick: () => {
                setBoard(createEmptyConnect4Board());
                setTurn('red');
                setWinner(null);
                setFall(null);
              },
            },
          ]
        : [],
    });
  }, [note, onLeave, winner]);
  useEffect(() => () => pushHud(null), []);

  const boardCenter = C4_BASE + ((C4_ROWS - 1) * C4_PITCH) / 2;
  return (
    <group position={[0, PLAY_TABLE.h, 0]}>
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 0.16, 0.045, -0.02]}>
          <boxGeometry args={[0.028, 0.09, 0.028]} />
          <meshStandardMaterial color="#163a78" roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, boardCenter, -0.028]}>
        <boxGeometry args={[C4_COLS * C4_PITCH + 0.05, C4_ROWS * C4_PITCH + 0.05, 0.026]} />
        <meshStandardMaterial color="#1d4fa3" roughness={0.45} metalness={0.05} />
      </mesh>
      {Array.from({ length: C4_ROWS }, (_, r) =>
        Array.from({ length: C4_COLS }, (_, c) => {
          const [x, y] = c4Slot(c, r);
          return (
            <mesh key={`hole-${r}-${c}`} position={[x, y, -0.014]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 0.004, 16]} />
              <meshStandardMaterial color="#071018" roughness={0.8} />
            </mesh>
          );
        }),
      )}
      {board.map((row, r) =>
        row.map((cell, c) => {
          if (!cell) return null;
          const [x, y, z] = c4Slot(c, r);
          return (
            <mesh key={`${r}-${c}`} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.021, 0.021, 0.01, 20]} />
              <meshStandardMaterial color={cell === 'red' ? '#e23b3b' : '#f2c14e'} roughness={0.35} />
            </mesh>
          );
        }),
      )}
      <mesh
        position={[0, boardCenter, 0.02]}
        onPointerMove={event => {
          event.stopPropagation();
          const x = event.object.worldToLocal(event.point.clone()).x;
          const col = Math.round(x / C4_PITCH + 3);
          setHover(col >= 0 && col < C4_COLS ? col : null);
        }}
        onPointerOut={() => setHover(null)}
        onClick={event => {
          event.stopPropagation();
          const x = event.object.worldToLocal(event.point.clone()).x;
          const col = Math.round(x / C4_PITCH + 3);
          if (col >= 0 && col < C4_COLS && turn === 'red') drop(col, 'red');
        }}
      >
        <planeGeometry args={[C4_COLS * C4_PITCH + 0.06, C4_ROWS * C4_PITCH + 0.06]} />
        <meshBasicMaterial transparent opacity={hover === null ? 0 : 0.12} color="#ffe08a" depthWrite={false} />
      </mesh>
      {fall && (
        <FallingDisc
          key={`${fall.color}-${fall.col}-${fall.row}`}
          col={fall.col}
          row={fall.row}
          color={fall.color}
          onDone={finishFall}
        />
      )}
    </group>
  );
}

function FallingDisc({
  col,
  row,
  color,
  onDone,
}: {
  col: number;
  row: number;
  color: 'red' | 'yellow';
  onDone: () => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const done = useRef(false);
  const from = C4_BASE + C4_ROWS * C4_PITCH + 0.06;
  const to = c4Slot(col, row)[1];
  useFrame((_, dt) => {
    t.current = Math.min(1, t.current + dt * 2.2);
    const eased = 1 - (1 - t.current) ** 3;
    if (mesh.current) mesh.current.position.y = from + (to - from) * eased;
    if (t.current >= 1 && !done.current) {
      done.current = true;
      onDone();
    }
  });
  return (
    <mesh ref={mesh} position={[(col - 3) * C4_PITCH, from, c4Slot(col, row)[2]]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.022, 0.022, 0.012, 20]} />
      <meshStandardMaterial color={color === 'red' ? '#e23b3b' : '#f2c14e'} roughness={0.35} />
    </mesh>
  );
}

function ShipMatch({ onLeave }: { onLeave: () => void }) {
  const enemy = useMemo(() => generateRandomFleet(), []);
  const [grid, setGrid] = useState<CellState[][]>(() => createEmptyGrid());
  const [ships, setShips] = useState<Ship[]>([]);
  const [placed, setPlaced] = useState(0);
  const [ori, setOri] = useState<'horizontal' | 'vertical'>('horizontal');
  const [enemyView, setEnemyView] = useState<CellState[][]>(() => createEmptyGrid());
  const [enemyShips, setEnemyShips] = useState<Ship[]>(() => enemy.ships.map(s => ({ ...s, positions: s.positions.map(p => ({ ...p })) })));
  const [phase, setPhase] = useState<'place' | 'fire' | 'over'>('place');
  const [turn, setTurn] = useState<'player' | 'enemy'>('player');
  const [note, setNote] = useState('Place the carrier. R rotates the hull.');
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'KeyR' && phase === 'place') {
        setOri(o => (o === 'horizontal' ? 'vertical' : 'horizontal'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  const lay = (x: number, y: number) => {
    if (phase !== 'place') return;
    const def = SHIP_DEFINITIONS[placed];
    if (!def || !isValidPlacement(grid, x, y, def.size, ori)) {
      setNote('That hull does not fit. Turn it with R.');
      return;
    }
    const next = grid.map(row => row.slice());
    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < def.size; i += 1) {
      const px = ori === 'horizontal' ? x + i : x;
      const py = ori === 'horizontal' ? y : y + i;
      next[py][px] = 'ship';
      positions.push({ x: px, y: py });
    }
    const ship: Ship = {
      id: def.type,
      type: def.type,
      name: def.name,
      size: def.size,
      positions,
      hits: 0,
      sunk: false,
      color: def.color,
    };
    const fleet = [...ships, ship];
    setGrid(next);
    setShips(fleet);
    const n = placed + 1;
    setPlaced(n);
    if (n >= SHIP_DEFINITIONS.length) {
      setPhase('fire');
      setNote('Both oceans are on the table. Yours is the near one. Fire on theirs.');
    } else {
      setNote(`Place the ${SHIP_DEFINITIONS[n].name}. R rotates.`);
    }
  };

  const fire = (x: number, y: number) => {
    if (phase !== 'fire' || turn !== 'player') return;
    if (enemyView[y][x] === 'hit' || enemyView[y][x] === 'miss') return;
    const view = enemyView.map(row => row.slice());
    const fleet = enemyShips.map(s => ({ ...s, positions: s.positions.map(p => ({ ...p })) }));
    const hit = fleet.find(s => s.positions.some(p => p.x === x && p.y === y));
    view[y][x] = hit ? 'hit' : 'miss';
    if (hit) {
      hit.hits += 1;
      if (hit.hits >= hit.size) hit.sunk = true;
    }
    setEnemyView(view);
    setEnemyShips(fleet);
    if (fleet.every(s => s.sunk)) {
      setPhase('over');
      setWinner('You');
      setNote('Their fleet is on the bottom. You win.');
      return;
    }
    const aim = getSmartAIMove(grid, ships, 'medium');
    const yours = grid.map(row => row.slice());
    const myFleet = ships.map(s => ({ ...s, positions: s.positions.map(p => ({ ...p })) }));
    const struck = myFleet.find(s => s.positions.some(p => p.x === aim.x && p.y === aim.y));
    yours[aim.y][aim.x] = struck ? 'hit' : 'miss';
    if (struck) {
      struck.hits += 1;
      if (struck.hits >= struck.size) struck.sunk = true;
    }
    setGrid(yours);
    setShips(myFleet);
    if (myFleet.length > 0 && myFleet.every(s => s.sunk)) {
      setPhase('over');
      setWinner('Rival');
      setNote('Your fleet is sunk.');
      return;
    }
    setTurn('player');
    setNote(hit ? (hit.sunk ? `${hit.name} sunk.` : 'Hit.') : 'Miss. Your shot, again.');
  };

  useEffect(() => {
    const actions: HudAction[] = [];
    if (phase === 'place') {
      actions.push({
        label: ori === 'horizontal' ? 'Hull across' : 'Hull down',
        onClick: () => setOri(o => (o === 'horizontal' ? 'vertical' : 'horizontal')),
      });
    }
    if (phase === 'over') {
      actions.push({
        label: 'New battle',
        onClick: () => {
          setGrid(createEmptyGrid());
          setShips([]);
          setPlaced(0);
          setEnemyView(createEmptyGrid());
          setEnemyShips(generateRandomFleet().ships);
          setPhase('place');
          setWinner(null);
          setNote('Place the carrier. R rotates the hull.');
        },
      });
    }
    pushHud({ title: 'Battleship', note, onLeave, actions });
  }, [note, onLeave, ori, phase]);
  useEffect(() => () => pushHud(null), []);

  return (
    <group position={[0, PLAY_TABLE.h + 0.01, 0]}>
      <Ocean
        grid={grid}
        ships={ships}
        showShips
        origin={[0, 0, 0.2]}
        onCell={lay}
      />
      <Ocean
        grid={enemyView}
        ships={enemyShips.filter(s => s.sunk)}
        showShips
        origin={[0, 0, -0.2]}
        onCell={fire}
      />
    </group>
  );
}

function Ocean({
  grid,
  ships,
  showShips,
  origin,
  onCell,
}: {
  grid: CellState[][];
  ships: Ship[];
  showShips: boolean;
  origin: [number, number, number];
  onCell: (x: number, y: number) => void;
}) {
  const cell = 0.034;
  const [hot, setHot] = useState<string | null>(null);
  const group = useRef<THREE.Group>(null);
  const cellAt = (point: THREE.Vector3) => {
    if (!group.current) return null;
    const local = group.current.worldToLocal(point.clone());
    const x = Math.round(local.x / cell + 4.5);
    const y = Math.round(local.z / cell + 4.5);
    if (x < 0 || y < 0 || x > 9 || y > 9) return null;
    return { x, y };
  };
  return (
    <group ref={group} position={origin}>
      <mesh position={[0, -0.004, 0]}>
        <boxGeometry args={[cell * 10 + 0.02, 0.008, cell * 10 + 0.02]} />
        <meshStandardMaterial color="#16324a" roughness={0.7} />
      </mesh>
      {grid.map((row, y) =>
        row.map((state, x) => (
          <mesh
            key={`${x}-${y}`}
            position={[(x - 4.5) * cell, 0.004, (y - 4.5) * cell]}
          >
            <boxGeometry args={[cell * 0.9, 0.008, cell * 0.9]} />
            <meshStandardMaterial
              color={
                state === 'hit' ? '#e25b4a' : state === 'miss' ? '#d5dde6' : hot === `${x}-${y}` ? '#4eb6e0' : '#1f6f9a'
              }
              roughness={0.45}
            />
          </mesh>
        )),
      )}
      <mesh
        position={[0, 0.04, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={event => {
          event.stopPropagation();
          const hit = cellAt(event.point);
          setHot(hit ? `${hit.x}-${hit.y}` : null);
        }}
        onPointerOut={() => setHot(null)}
        onClick={event => {
          event.stopPropagation();
          const hit = cellAt(event.point);
          if (hit) onCell(hit.x, hit.y);
        }}
      >
        <planeGeometry args={[cell * 10, cell * 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {showShips &&
        ships.map(ship => {
          const horizontal = ship.positions.every(p => p.y === ship.positions[0].y);
          const minX = Math.min(...ship.positions.map(p => p.x));
          const minY = Math.min(...ship.positions.map(p => p.y));
          const cx = (minX + (horizontal ? (ship.size - 1) / 2 : 0) - 4.5) * cell;
          const cz = (minY + (horizontal ? 0 : (ship.size - 1) / 2) - 4.5) * cell;
          const len = ship.size * cell * 0.82;
          const beam = cell * 0.5;
          const bow = cell * 0.42;
          const color = ship.sunk ? '#6b2a2a' : ship.color;
          const bowShift = (len / 2 + bow * 0.35) * (horizontal ? 1 : 0);
          const bowShiftZ = (len / 2 + bow * 0.35) * (horizontal ? 0 : 1);
          return (
            <group key={ship.id} position={[cx, 0.016, cz]}>
              <mesh>
                <boxGeometry args={[horizontal ? len : beam, 0.012, horizontal ? beam : len]} />
                <meshStandardMaterial color={color} roughness={0.4} metalness={0.15} />
              </mesh>
              <mesh
                position={[bowShift, 0.002, bowShiftZ]}
                rotation={horizontal ? [0, 0, -Math.PI / 2] : [Math.PI / 2, 0, 0]}
              >
                <coneGeometry args={[beam * 0.55, bow, 4]} />
                <meshStandardMaterial color={color} roughness={0.4} metalness={0.15} />
              </mesh>
            </group>
          );
        })}
    </group>
  );
}

export function PlayTable({ game, onLeave }: { game: TableGameId | null; onLeave: () => void }) {
  return (
    <group position={[PLAY_TABLE.x, 0, PLAY_TABLE.z]}>
      <TableWood />
      <pointLight position={[0, 1.25, 0]} color="#ffe2c2" intensity={1.35} distance={3.4} decay={2} />
      {game === 'monopoly' && <MonopolyMatch onLeave={onLeave} />}
      {game === 'connect4' && <ConnectMatch onLeave={onLeave} />}
      {game === 'battleship' && <ShipMatch onLeave={onLeave} />}
    </group>
  );
}
