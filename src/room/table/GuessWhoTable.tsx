import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { buildGuessWhoBoardScene } from '../../games/bored/guessWhoBoard3D';
import {
  GUESS_WHO_CHARACTERS,
  GUESS_WHO_QUESTIONS,
  askGuessWhoQuestion,
  createInitialGuessWhoState,
  executeAiGuessWhoTurn,
  makeDirectCharacterGuess,
  toggleCharacterStand,
  type GuessWhoGameState,
} from '../../games/guesswho/guessWhoRules';
import { sound } from '../../utils/audio';
import { pushHud, type HudAction } from './tableHud';
import { setTableView, type Shot } from './tableCam';

/**
 * Guess Who on the card table, using their red and blue trays and hinged stands.
 */

const VIEW: Shot = { target: [0, 0.04, 0.02], yaw: 0, pitch: 0.82, dist: 0.95 };
const FIT = 0.58;
const UP = -0.16;
const DOWN = -Math.PI * 0.48;

export function GuessWhoTable({ onLeave }: { onLeave: () => void }) {
  const [state, setState] = useState<GuessWhoGameState>(() => createInitialGuessWhoState());
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const scene = useMemo(() => buildGuessWhoBoardScene(), []);

  useEffect(() => setTableView(VIEW), []);
  useEffect(() => () => pushHud(null), []);

  useEffect(() => {
    const yours = scene.portraits.get(state.playerSecret.id);
    const theirs = scene.portraits.get(state.aiSecret.id);
    if (yours) scene.playerMystery.map = yours;
    if (theirs) scene.aiMystery.map = theirs;
    scene.playerMystery.needsUpdate = true;
    scene.aiMystery.needsUpdate = true;
  }, [scene, state.playerSecret.id, state.aiSecret.id]);

  useEffect(() => {
    if (state.turn !== 'ai' || state.winner) return;
    const t = window.setTimeout(() => {
      setState(s => (s.turn === 'ai' && !s.winner ? executeAiGuessWhoTurn(s) : s));
      sound.playButtonClick();
    }, 900);
    return () => window.clearTimeout(t);
  }, [state.turn, state.winner, state.turnCount, state.narratorLog]);

  const ask = (id: string) => {
    setState(s => askGuessWhoQuestion(s, id));
    sound.playCardDeal();
  };
  const flip = (id: string) => {
    if (state.winner || state.turn !== 'player') return;
    setPicked(id);
    setState(s => toggleCharacterStand(s, id));
    sound.playButtonClick();
  };
  const guess = () => {
    if (!picked) return;
    setState(s => makeDirectCharacterGuess(s, picked));
    sound.playButtonClick();
  };

  useFrame((_, dt) => {
    const damp = (pivot: THREE.Group, down: boolean) => {
      const target = down ? DOWN : UP;
      pivot.rotation.x = THREE.MathUtils.damp(pivot.rotation.x, target, 10, dt);
    };
    for (const [id, pivot] of scene.playerPivots) damp(pivot, state.playerFoldedIds.includes(id));
    for (const [id, pivot] of scene.aiPivots) damp(pivot, state.aiFoldedIds.includes(id));
  });

  useEffect(() => {
    const yours = state.turn === 'player' && !state.winner;
    const actions: HudAction[] = [];
    if (state.winner) {
      actions.push({ label: 'New game', onClick: () => setState(createInitialGuessWhoState()) });
    } else if (yours) {
      for (const q of GUESS_WHO_QUESTIONS.slice(page * 8, page * 8 + 8)) {
        if (!state.askedQuestionIds.includes(q.id)) actions.push({ label: q.shortLabel, onClick: () => ask(q.id), tone: 'ghost' });
      }
      actions.push({
        label: page === 0 ? 'More questions' : 'First questions',
        onClick: () => setPage(p => (p === 0 ? 1 : 0)),
        tone: 'ghost',
      });
      if (picked) actions.push({ label: `Guess ${picked}`, onClick: guess });
    }
    const line = state.narratorLog[0];
    pushHud({
      title: 'Guess Who',
      note: state.winner ? state.winReason : line?.playByPlay ?? 'Ask a question.',
      detail: `Your card is ${state.playerSecret.name} · standing ${GUESS_WHO_CHARACTERS.length - state.playerFoldedIds.length} · they still have ${GUESS_WHO_CHARACTERS.length - state.aiFoldedIds.length}`,
      onLeave,
      actions,
    });
  }, [state, onLeave, page, picked]);

  return (
    <primitive
      object={scene.root}
      scale={FIT}
      position={[0, 0.006, 0]}
      onClick={event => {
        event.stopPropagation();
        let node: { userData: { characterId?: string; tray?: string }; parent: typeof node | null } | null = event.object;
        while (node) {
          if (node.userData.tray === 'red' && node.userData.characterId) {
            flip(node.userData.characterId);
            return;
          }
          node = node.parent;
        }
      }}
    />
  );
}
