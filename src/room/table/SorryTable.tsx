import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  CARD_INFO,
  PLAYER_META,
  applyMoveToState,
  createInitialGameState,
  drawNextCard,
  getNormalizedBoardCoords,
  type LegalMove,
  type PawnState,
  type PlayerColor,
  type SorryGameState,
} from '../../games/sorry/sorryRules';
import { buildSorryBoardScene, sorryBoardPoint, sorryCardFront } from '../../games/bored/sorryBoard3D';
import { sound } from '../../utils/audio';
import { pushHud, type HudAction } from './tableHud';
import { setTableView, type Shot } from './tableCam';

/**
 * Sorry on the card table, using their board texture, deck, and pawns.
 * You sit on yellow. The other three play themselves. The game id stays pawnrush.
 */

const YOU: PlayerColor = 'yellow';
const VIEW: Shot = { target: [0, 0.02, 0], yaw: 0.15, pitch: 0.78, dist: 0.98 };
const FIT = 0.6;

function place(pawn: PawnState) {
  const index =
    pawn.zone === 'track' ? pawn.trackIndex : pawn.zone === 'safety' ? pawn.safetyIndex : pawn.pawnIndex;
  const { u, v } = getNormalizedBoardCoords(pawn.zone, pawn.color, index, pawn.pawnIndex);
  return sorryBoardPoint(u, v);
}

export function SorryTable({ onLeave }: { onLeave: () => void }) {
  const [state, setState] = useState<SorryGameState>(() => {
    const next = createInitialGameState();
    return { ...next, currentTurn: YOU };
  });
  const scene = useMemo(() => buildSorryBoardScene(), []);
  const shownCard = state.currentCard;

  useEffect(() => setTableView(VIEW), []);
  useEffect(() => () => pushHud(null), []);

  useEffect(() => {
    if (!shownCard) return;
    scene.discardFront.map = sorryCardFront(shownCard);
    scene.discardFront.needsUpdate = true;
  }, [scene, shownCard]);

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

  const pick = (id: string) => {
    if (!yourTurn) return;
    const move = state.legalMoves.find(m => m.primaryPawnId === id);
    if (move) play(move);
  };

  useFrame(() => {
    for (const pawn of state.pawns) {
      const mesh = scene.pawns.get(pawn.id);
      if (!mesh) continue;
      mesh.position.copy(place(pawn));
      const hot = yourTurn && state.legalMoves.some(m => m.primaryPawnId === pawn.id);
      mesh.position.y += hot ? 0.012 : 0;
    }
  });

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
        for (const move of state.legalMoves.slice(0, 6)) actions.push({ label: move.label, onClick: () => play(move) });
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
    <primitive
      object={scene.root}
      scale={FIT}
      position={[0, 0.008, 0]}
      onClick={event => {
        event.stopPropagation();
        let node: { userData: { pawnId?: string }; parent: typeof node | null } | null = event.object;
        while (node) {
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
