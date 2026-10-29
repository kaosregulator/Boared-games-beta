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
import { useMatchResult } from '../../net/useMatchResult';

/**
 * Guess Who on the card table, using their red and blue trays and hinged stands.
 *
 * Tapping a face flips it down or back up. "Make a guess" switches the taps to
 * picking: any face on your tray, standing or flipped down, lifts up in a
 * yellow frame without folding, and you confirm the guess from the card.
 */

const VIEW: Shot = { target: [0, 0.04, 0.02], yaw: 0, pitch: 0.82, dist: 0.95 };
/** Closer over your own red tray while you pick a face to guess. */
const GUESS_VIEW: Shot = { target: [0, 0.04, 0.17], yaw: 0, pitch: 0.72, dist: 0.6 };
const FIT = 0.58;
const UP = -0.16;
const DOWN = -Math.PI * 0.48;
/** The picked face leans forward to you, standing even if it was flipped down. */
const PICKED = 0.08;
const STAND_W = 0.098;
const STAND_H = 0.118;

/** A glowing frame round one stand, unlit so it reads in a dark room. */
function makePickFrame() {
  const frame = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: '#fde047', toneMapped: false });
  const t = 0.007;
  const w = STAND_W + t * 2;
  const h = STAND_H + t * 2;
  const bars: [number, number, number, number][] = [
    [0, h / 2 - t / 2, w, t],
    [0, -h / 2 + t / 2, w, t],
    [-w / 2 + t / 2, 0, t, h],
    [w / 2 - t / 2, 0, t, h],
  ];
  for (const [x, y, bw, bh] of bars) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.004), mat);
    bar.position.set(x, y, 0);
    frame.add(bar);
  }
  frame.position.set(0, STAND_H / 2, 0.006);
  return frame;
}

const nameOf = (id: string) => GUESS_WHO_CHARACTERS.find(c => c.id === id)?.name ?? id;

export function GuessWhoTable({ onLeave }: { onLeave: () => void }) {
  const [state, setState] = useState<GuessWhoGameState>(() => createInitialGuessWhoState());
  const [page, setPage] = useState(0);
  /** Picking a face to guess: taps choose instead of flipping. */
  const [guessing, setGuessing] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const scene = useMemo(() => buildGuessWhoBoardScene(), []);
  const pickFrame = useMemo(makePickFrame, []);

  useMatchResult('guesswho', state.winner === 'player' ? 'won' : state.winner === 'ai' ? 'lost' : null);
  useEffect(() => setTableView(guessing ? GUESS_VIEW : VIEW, true), [guessing]);
  useEffect(() => () => pushHud(null), []);

  useEffect(() => {
    const yours = scene.portraits.get(state.playerSecret.id);
    const theirs = scene.portraits.get(state.aiSecret.id);
    if (yours) scene.playerMystery.map = yours;
    if (theirs) scene.aiMystery.map = theirs;
    scene.playerMystery.needsUpdate = true;
    scene.aiMystery.needsUpdate = true;
  }, [scene, state.playerSecret.id, state.aiSecret.id]);

  // The frame rides on the picked stand's hinge.
  useEffect(() => {
    const pivot = guessing && picked ? scene.playerPivots.get(picked) : undefined;
    if (!pivot) return;
    pivot.add(pickFrame);
    return () => {
      pivot.remove(pickFrame);
    };
  }, [scene, pickFrame, guessing, picked]);

  useEffect(() => {
    if (state.turn !== 'ai' || state.winner) return;
    const t = window.setTimeout(() => {
      setState(s => (s.turn === 'ai' && !s.winner ? executeAiGuessWhoTurn(s) : s));
      sound.playButtonClick();
    }, 900);
    return () => window.clearTimeout(t);
  }, [state.turn, state.winner, state.turnCount, state.narratorLog]);

  const endGuessing = () => {
    setGuessing(false);
    setPicked(null);
  };

  const ask = (id: string) => {
    endGuessing();
    setState(s => askGuessWhoQuestion(s, id));
    sound.playCardDeal();
  };

  /** A tap on one of your faces: pick it while guessing, otherwise flip it. */
  const tapFace = (id: string) => {
    if (state.winner || state.turn !== 'player') return;
    if (guessing) {
      setPicked(id);
      sound.playButtonClick();
      return;
    }
    setState(s => toggleCharacterStand(s, id));
    sound.playButtonClick();
  };

  const guess = (id: string) => {
    endGuessing();
    setState(s => makeDirectCharacterGuess(s, id));
    sound.playButtonClick();
  };

  useFrame((_, dt) => {
    const damp = (pivot: THREE.Group, target: number) => {
      pivot.rotation.x = THREE.MathUtils.damp(pivot.rotation.x, target, 10, dt);
    };
    for (const [id, pivot] of scene.playerPivots) {
      const target = guessing && id === picked ? PICKED : state.playerFoldedIds.includes(id) ? DOWN : UP;
      damp(pivot, target);
    }
    for (const [id, pivot] of scene.aiPivots) damp(pivot, state.aiFoldedIds.includes(id) ? DOWN : UP);
  });

  // Capture scripts drive the flow with window.__guessWho (dev server only).
  if (import.meta.env.DEV) (window as unknown as { __guessWho: unknown }).__guessWho = { state, tapFace, guessing };

  useEffect(() => {
    const yours = state.turn === 'player' && !state.winner;
    const actions: HudAction[] = [];
    let note = state.winner ? state.winReason : state.narratorLog[0]?.playByPlay ?? 'Ask a question.';
    if (state.winner) {
      actions.push({ label: 'New game', onClick: () => (endGuessing(), setState(createInitialGuessWhoState())) });
    } else if (yours && guessing) {
      note = picked
        ? `Is it ${nameOf(picked)}? Right and you win. Wrong and ${nameOf(picked)} flips down and Blue takes a turn.`
        : 'Who is on their card? Tap any face on your tray, standing or flipped down.';
      if (picked) actions.push({ label: `Guess ${nameOf(picked)}`, onClick: () => guess(picked) });
      actions.push({ label: 'Back to questions', onClick: endGuessing, tone: 'ghost' });
    } else if (yours) {
      for (const q of GUESS_WHO_QUESTIONS.slice(page * 8, page * 8 + 8)) {
        if (!state.askedQuestionIds.includes(q.id)) actions.push({ label: q.shortLabel, onClick: () => ask(q.id), tone: 'ghost' });
      }
      actions.push({
        label: page === 0 ? 'More questions' : 'First questions',
        onClick: () => setPage(p => (p === 0 ? 1 : 0)),
        tone: 'ghost',
      });
      actions.push({ label: 'Make a guess', onClick: () => (setPicked(null), setGuessing(true)) });
    }
    pushHud({
      title: 'Guess Who',
      note,
      detail: `Your card is ${state.playerSecret.name} · standing ${GUESS_WHO_CHARACTERS.length - state.playerFoldedIds.length} · they still have ${GUESS_WHO_CHARACTERS.length - state.aiFoldedIds.length}`,
      onLeave,
      actions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, onLeave, page, picked, guessing]);

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
            tapFace(node.userData.characterId);
            return;
          }
          node = node.parent;
        }
      }}
    />
  );
}
