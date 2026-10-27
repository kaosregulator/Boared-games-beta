import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CARD_INFO,
  PLAYER_COLORS,
  PLAYER_META,
  SLIDE_SEGMENTS,
  applyMoveToState,
  createInitialGameState,
  drawNextCard,
  getNormalizedBoardCoords,
  type LegalMove,
  type PawnState,
  type PlayerColor,
  type SorryGameState,
} from '../../games/sorry/sorryRules';
import { sound } from '../../utils/audio';
import { pushHud, type HudAction } from './tableHud';
import { setTableView, type Shot } from './tableCam';

/**
 * Sorry on the card table: four colors, a real deck, slides, and bumps.
 * You sit on yellow, the near side. The other three play themselves.
 */

const YOU: PlayerColor = 'yellow';
const BOARD = 0.66;
const VIEW: Shot = { target: [0, 0, 0.02], yaw: 0, pitch: 0.92, dist: 0.86 };

function spot(zone: PawnState['zone'], color: PlayerColor, index: number, slot: number) {
  const { u, v } = getNormalizedBoardCoords(zone, color, index, slot);
  return new THREE.Vector3(u * BOARD, 0.02, v * BOARD);
}

function pawnAt(p: PawnState) {
  if (p.zone === 'track') return spot('track', p.color, p.trackIndex, p.pawnIndex);
  if (p.zone === 'safety') return spot('safety', p.color, p.safetyIndex, p.pawnIndex);
  return spot(p.zone, p.color, p.pawnIndex, p.pawnIndex);
}

function paintBoard() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f4e2bc';
  g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = '#6b3a22';
  g.lineWidth = 28;
  g.strokeRect(18, 18, 988, 988);
  const px = (u: number, v: number) => ({ x: (u + 0.5) * 1024, y: (v + 0.5) * 1024 });
  const cell = 0.058125 * 1024 * 0.86;

  const blob = (u: number, v: number, color: string, r: number) => {
    const p = px(u, v);
    g.fillStyle = color;
    g.beginPath();
    g.arc(p.x, p.y, r, 0, Math.PI * 2);
    g.fill();
  };

  for (const color of PLAYER_COLORS) {
    let su = 0;
    let sv = 0;
    let hu = 0;
    let hv = 0;
    for (let i = 0; i < 4; i++) {
      const s = getNormalizedBoardCoords('start', color, i, i);
      const h = getNormalizedBoardCoords('home', color, i, i);
      su += s.u;
      sv += s.v;
      hu += h.u;
      hv += h.v;
    }
    blob(su / 4, sv / 4, PLAYER_META[color].hex, cell * 1.35);
    blob(hu / 4, hv / 4, PLAYER_META[color].accentHex, cell * 1.15);
    for (let i = 0; i < 5; i++) {
      const s = getNormalizedBoardCoords('safety', color, i, 0);
      const p = px(s.u, s.v);
      g.fillStyle = PLAYER_META[color].accentHex;
      g.fillRect(p.x - cell / 2, p.y - cell / 2, cell, cell);
    }
  }

  for (let t = 0; t < 60; t++) {
    const slide = SLIDE_SEGMENTS.find(s => s.squares.includes(t));
    const { u, v } = getNormalizedBoardCoords('track', 'red', t, 0);
    const p = px(u, v);
    g.fillStyle = slide ? PLAYER_META[slide.color].hex : t % 2 === 0 ? '#fffaf0' : '#efe2c4';
    g.fillRect(p.x - cell / 2, p.y - cell / 2, cell, cell);
    g.strokeStyle = 'rgba(80, 48, 24, 0.35)';
    g.lineWidth = 2;
    g.strokeRect(p.x - cell / 2, p.y - cell / 2, cell, cell);
  }

  g.fillStyle = '#7f1d1d';
  g.font = '800 92px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('SORRY!', 512, 512);
  g.font = '600 28px Georgia, serif';
  g.fillStyle = '#44403c';
  g.fillText('SLIDE · BUMP · HOME', 512, 590);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function cardTex(rank: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 360;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fffaf3';
  g.fillRect(0, 0, 256, 360);
  g.strokeStyle = '#7f1d1d';
  g.lineWidth = 10;
  g.strokeRect(8, 8, 240, 344);
  g.fillStyle = '#7f1d1d';
  g.font = '800 84px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(rank === 'SORRY!' ? '!' : rank, 128, 150);
  g.font = '700 28px Georgia, serif';
  g.fillText(rank === 'SORRY!' ? 'SORRY' : 'SORRY!', 128, 250);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Pawn({
  pawn,
  hot,
  onPick,
}: {
  pawn: PawnState;
  hot: boolean;
  onPick: (id: string) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const shown = useRef(new THREE.Vector3());
  const goal = useRef(new THREE.Vector3());
  const first = useRef(true);
  goal.current.copy(pawnAt(pawn));
  useFrame((_, dt) => {
    const n = ref.current;
    if (!n) return;
    if (first.current) {
      shown.current.copy(goal.current);
      first.current = false;
    }
    shown.current.lerp(goal.current, Math.min(1, Math.min(dt, 0.05) * 8));
    n.position.copy(shown.current);
    if (hot) n.position.y += 0.014;
  });
  const hex = PLAYER_META[pawn.color].hex;
  return (
    <group
      ref={ref}
      onClick={e => {
        e.stopPropagation();
        onPick(pawn.id);
      }}
    >
      <mesh position={[0, 0.012, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.016, 0.02, 12]} />
        <meshStandardMaterial color={hex} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.026, 0]} castShadow>
        <sphereGeometry args={[0.011, 14, 12]} />
        <meshStandardMaterial color={hex} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function SorryTable({ onLeave }: { onLeave: () => void }) {
  const [state, setState] = useState<SorryGameState>(() => {
    const s = createInitialGameState();
    return { ...s, currentTurn: YOU };
  });
  const tex = useMemo(paintBoard, []);
  const shownCard = state.currentCard;
  const card = useMemo(() => (shownCard ? cardTex(shownCard) : null), [shownCard]);

  useEffect(() => setTableView(VIEW), []);
  useEffect(() => () => pushHud(null), []);

  useEffect(() => {
    if (state.turnPhase !== 'draw' || state.winner) return;
    const t = window.setTimeout(() => {
      setState(s => (s.turnPhase === 'draw' && !s.winner ? drawNextCard(s) : s));
      sound.playCardDeal();
    }, state.currentTurn === YOU ? 280 : 640);
    return () => window.clearTimeout(t);
  }, [state.turnPhase, state.currentTurn, state.winner, state.stats.cardsDrawn]);

  useEffect(() => {
    if (state.turnPhase !== 'move' || state.currentTurn === YOU || state.winner) return;
    const t = window.setTimeout(() => {
      setState(s => {
        if (s.turnPhase !== 'move' || s.currentTurn === YOU || s.winner) return s;
        return applyMoveToState(s, s.legalMoves[0] ?? null);
      });
      sound.playChessMove();
    }, 820);
    return () => window.clearTimeout(t);
  }, [state.turnPhase, state.currentTurn, state.winner, state.lastActionLog]);

  const play = (move: LegalMove | null) => {
    setState(s => applyMoveToState(s, move));
    if (state.winner) return;
    sound.playChessMove();
  };

  const yourTurn = state.currentTurn === YOU && state.turnPhase === 'move' && !state.winner;
  const hotIds = new Set(yourTurn ? state.legalMoves.map(m => m.primaryPawnId) : []);

  const pick = (id: string) => {
    if (!yourTurn) return;
    const move = state.legalMoves.find(m => m.primaryPawnId === id);
    if (move) play(move);
  };

  useEffect(() => {
    const home = (color: PlayerColor) => state.pawns.filter(p => p.color === color && p.zone === 'home').length;
    const actions: HudAction[] = [];
    if (state.winner) {
      actions.push({
        label: 'New game',
        onClick: () => setState({ ...createInitialGameState(), currentTurn: YOU }),
      });
    } else if (yourTurn) {
      if (state.legalMoves.length === 0) actions.push({ label: 'Pass', onClick: () => play(null), tone: 'ghost' });
      else {
        const listed = state.legalMoves.slice(0, 6);
        for (const m of listed) actions.push({ label: m.label, onClick: () => play(m) });
      }
    }
    const info = state.currentCard ? CARD_INFO[state.currentCard] : null;
    pushHud({
      title: 'Sorry!',
      note: state.winner ? `${PLAYER_META[state.winner].name} wins.` : state.lastActionLog || 'Draw a card.',
      detail: `You ${home(YOU)}/4 home · Red ${home('red')} · Blue ${home('blue')} · Green ${home('green')}${info ? ` · ${info.ruleSummary}` : ''}`,
      onLeave,
      actions,
    });
  }, [state, onLeave, yourTurn]);

  return (
    <group>
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[BOARD, BOARD]} />
        <meshStandardMaterial map={tex} roughness={0.86} />
      </mesh>
      {card && (
        <mesh position={[0, 0.09, 0]} rotation={[-0.4, 0, 0]} raycast={() => null}>
          <planeGeometry args={[0.07, 0.098]} />
          <meshBasicMaterial map={card} toneMapped={false} />
        </mesh>
      )}
      {state.pawns.map(p => (
        <Pawn key={p.id} pawn={p} hot={hotIds.has(p.id)} onPick={pick} />
      ))}
    </group>
  );
}
