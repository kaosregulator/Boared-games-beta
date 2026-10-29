import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CARD_INFO,
  PLAYER_META,
  applyMoveToState,
  createInitialGameState,
  drawNextCard,
  type LegalMove,
  type PlayerColor,
  type SorryGameState,
} from '../../games/sorry/sorryRules';
import { chooseSorryAiMove } from '../../games/sorry/sorryAi';
import { buildSorryBoardScene, sorryBoardPoint, sorryCardFront } from '../../games/bored/sorryBoard3D';
import { sound } from '../../utils/audio';
import { pushHud, type HudAction } from './tableHud';
import { followAction, setTableView, type Shot } from './tableCam';
import { movePaths, moveDestination, pawnUV } from './sorryMotion';
import { useMatchResult } from '../../net/useMatchResult';

/**
 * Sorry on the card table, using their board texture, deck, and pawns.
 * You sit on yellow. The other three play themselves. The game id stays pawnrush.
 *
 * A move is applied to the rules at once, but the pawns walk it: square by
 * square, a hop each, slides at a run, and a bumped pawn hops home to START
 * after the mover lands. The next card waits until every pawn has stopped.
 * When a pawn has more than one legal move, tapping it lights each place it
 * could go; tap one (or its button) to play it.
 */

const YOU: PlayerColor = 'yellow';
const VIEW: Shot = { target: [0, 0.02, 0], yaw: 0.15, pitch: 0.78, dist: 0.98 };
const FIT = 0.6;
/** Board units a second: one square takes about a fifth of a second. */
const WALK = 0.33;
const RUN = 0.9;
const HOP = 0.022;

interface Walk {
  path: THREE.Vector3[];
  slide: boolean[];
  /** Seconds before this pawn starts (a bumped pawn waits for the mover). */
  wait: number;
  from: THREE.Vector3 | null;
  progress: number;
}

export function SorryTable({ onLeave }: { onLeave: () => void }) {
  const [state, setState] = useState<SorryGameState>(() => {
    const next = createInitialGameState();
    return { ...next, currentTurn: YOU };
  });
  const [moving, setMoving] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const scene = useMemo(() => buildSorryBoardScene(), []);
  const rings = useMemo(() => new THREE.Group(), []);
  const walks = useRef(new Map<string, Walk>());
  const shownCard = state.currentCard;

  useMatchResult('pawnrush', state.winner ? (state.winner === YOU ? 'won' : 'lost') : null);
  useEffect(() => setTableView(VIEW), []);
  useEffect(() => () => pushHud(null), []);
  useEffect(() => {
    scene.root.add(rings);
    return () => {
      scene.root.remove(rings);
    };
  }, [scene, rings]);

  useEffect(() => {
    if (!shownCard) return;
    scene.discardFront.map = sorryCardFront(shownCard);
    scene.discardFront.needsUpdate = true;
  }, [scene, shownCard]);

  /** Apply a move to the rules and send the pawns walking it. */
  const apply = (move: LegalMove | null) => {
    setSelected(null);
    if (move) {
      let longest = 0;
      const paths = movePaths(state, move);
      for (const [id, path] of paths) longest = Math.max(longest, path.length);
      for (const [id, path] of paths) {
        const bumped = id !== move.primaryPawnId && id !== move.secondaryPawnId;
        walks.current.set(id, {
          path: path.map(p => sorryBoardPoint(p.u, p.v)),
          slide: path.map(p => Boolean(p.slide)),
          wait: bumped ? longest * 0.22 + 0.1 : 0,
          from: null,
          progress: 0,
        });
      }
      setMoving(true);
      // follow the mover across the board
      const end = moveDestination(state, move);
      if (end) {
        const p = sorryBoardPoint(end.u, end.v);
        followAction({ target: [p.x * FIT, 0.02, p.z * FIT], yaw: 0.15, pitch: 0.8, dist: 0.62 }, 400 + longest * 230);
      }
    }
    setState(s => applyMoveToState(s, move));
    sound.playChessMove();
  };

  useEffect(() => {
    if (state.turnPhase !== 'draw' || state.winner || moving) return;
    const t = window.setTimeout(() => {
      setState(s => (s.turnPhase === 'draw' && !s.winner ? drawNextCard(s) : s));
      sound.playCardDeal();
    }, state.currentTurn === YOU ? 280 : 640);
    return () => window.clearTimeout(t);
  }, [state.turnPhase, state.currentTurn, state.winner, state.stats.cardsDrawn, moving]);

  useEffect(() => {
    if (state.turnPhase !== 'move' || state.currentTurn === YOU || state.winner || moving) return;
    const t = window.setTimeout(() => apply(chooseSorryAiMove(state)), 820);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, moving]);

  const yourTurn = state.currentTurn === YOU && state.turnPhase === 'move' && !state.winner && !moving;

  const movesOf = (id: string) => state.legalMoves.filter(m => m.primaryPawnId === id);

  const pick = (id: string) => {
    if (!yourTurn) return;
    const mine = movesOf(id);
    if (mine.length === 1) apply(mine[0]);
    else if (mine.length > 1) setSelected(selected === id ? null : id);
  };

  // A ring on every square the selected pawn could land on.
  useEffect(() => {
    rings.clear();
    if (!selected || !yourTurn) return;
    const seen = new Set<string>();
    for (const move of movesOf(selected)) {
      const end = moveDestination(state, move);
      if (!end) continue;
      const k = `${end.u.toFixed(3)},${end.v.toFixed(3)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const p = sorryBoardPoint(end.u, end.v);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.026, 0.036, 24),
        new THREE.MeshBasicMaterial({ color: '#fde047', toneMapped: false, depthTest: false, transparent: true }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(p.x, p.y + 0.004, p.z);
      ring.renderOrder = 20;
      ring.userData = { moveId: move.id };
      rings.add(ring);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, yourTurn, state.legalMoves, rings]);

  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    let any = false;
    const pulse = 1 + Math.sin(clock.elapsedTime * 6) * 0.12;
    rings.children.forEach(r => r.scale.setScalar(pulse));
    for (const pawn of state.pawns) {
      const mesh = scene.pawns.get(pawn.id);
      if (!mesh) continue;
      const walk = walks.current.get(pawn.id);
      if (walk) {
        any = true;
        if (walk.wait > 0) walk.wait -= dt;
        else {
          const target = walk.path[0];
          if (!walk.from) {
            walk.from = mesh.position.clone();
            walk.progress = 0;
          }
          const dist = walk.from.distanceTo(target) || 0.001;
          const speed = walk.slide[0] ? RUN : WALK;
          walk.progress = Math.min(1, walk.progress + (speed * dt) / dist);
          mesh.position.lerpVectors(walk.from, target, walk.progress);
          mesh.position.y = target.y + (walk.slide[0] ? 0.004 : Math.sin(Math.PI * walk.progress) * HOP);
          if (walk.progress >= 1) {
            walk.path.shift();
            walk.slide.shift();
            walk.from = null;
            if (walk.path.length === 0) walks.current.delete(pawn.id);
          }
        }
        continue;
      }
      const at = pawnUV(pawn);
      mesh.position.copy(sorryBoardPoint(at.u, at.v));
      const hot = yourTurn && state.legalMoves.some(m => m.primaryPawnId === pawn.id);
      mesh.position.y += hot ? 0.012 + (pawn.id === selected ? Math.abs(Math.sin(clock.elapsedTime * 5)) * 0.01 : 0) : 0;
    }
    if (!any && moving) setMoving(false);
  });

  // Capture scripts read the state and play moves (dev server only).
  if (import.meta.env.DEV) (window as unknown as { __sorry: unknown }).__sorry = { state, moving, selected, pick, apply };

  useEffect(() => {
    const home = (color: PlayerColor) => state.pawns.filter(p => p.color === color && p.zone === 'home').length;
    const actions: HudAction[] = [];
    let hint = '';
    if (state.winner) {
      actions.push({
        label: 'New game',
        onClick: () => (walks.current.clear(), setSelected(null), setMoving(false), setState({ ...createInitialGameState(), currentTurn: YOU })),
      });
    } else if (yourTurn) {
      if (state.legalMoves.length === 0) actions.push({ label: 'Pass', onClick: () => apply(null), tone: 'ghost' });
      else {
        const list = selected ? movesOf(selected) : state.legalMoves;
        for (const move of list.slice(0, 10)) actions.push({ label: move.label, onClick: () => apply(move) });
        if (selected) actions.push({ label: 'Choose another pawn', onClick: () => setSelected(null), tone: 'ghost' });
        else if (new Set(state.legalMoves.map(m => m.primaryPawnId)).size > 1 || state.legalMoves.length > 1)
          hint = ' Tap a pawn to see where it can go.';
      }
    }
    const info = state.currentCard ? CARD_INFO[state.currentCard] : null;
    pushHud({
      title: 'Sorry!',
      note: state.winner ? `${PLAYER_META[state.winner].name} wins.` : (state.lastActionLog || 'Draw a card.') + (yourTurn ? hint : ''),
      detail: `You ${home(YOU)}/4 home · Red ${home('red')} · Blue ${home('blue')} · Green ${home('green')}${info ? ` · ${info.ruleSummary}` : ''}`,
      onLeave,
      actions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, onLeave, yourTurn, selected]);

  return (
    <primitive
      object={scene.root}
      scale={FIT}
      position={[0, 0.008, 0]}
      onClick={event => {
        event.stopPropagation();
        let node: { userData: { pawnId?: string; moveId?: string }; parent: typeof node | null } | null = event.object;
        while (node) {
          if (node.userData.moveId) {
            const move = state.legalMoves.find(m => m.id === node!.userData.moveId);
            if (move && yourTurn) apply(move);
            return;
          }
          if (node.userData.pawnId) {
            pick(node.userData.pawnId);
            return;
          }
          node = node.parent;
        }
      }}
    />
  );
}
