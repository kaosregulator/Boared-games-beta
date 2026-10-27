import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  GUESS_WHO_CHARACTERS,
  GUESS_WHO_QUESTIONS,
  askGuessWhoQuestion,
  createInitialGuessWhoState,
  executeAiGuessWhoTurn,
  makeDirectCharacterGuess,
  toggleCharacterStand,
  type GuessWhoCharacter,
  type GuessWhoGameState,
} from '../../games/guesswho/guessWhoRules';
import { sound } from '../../utils/audio';
import { pushHud, type HudAction } from './tableHud';
import { setTableView, type Shot } from './tableCam';

/**
 * Guess Who on the card table. The red tray is yours, the blue tray is the
 * other player's. Faces are drawn from the cast, not from a photo set.
 */

const VIEW: Shot = { target: [0, 0, 0], yaw: 0, pitch: 0.95, dist: 0.92 };

function faceTexture(ch: GuessWhoCharacter) {
  const c = document.createElement('canvas');
  c.width = 180;
  c.height = 240;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f8f1e4';
  g.fillRect(0, 0, 180, 240);
  g.fillStyle = ch.shirtColor;
  g.fillRect(0, 168, 180, 72);
  g.fillStyle = ch.skinTone;
  g.beginPath();
  g.arc(90, 108, 48, 0, Math.PI * 2);
  g.fill();
  if (!ch.isBald) {
    g.fillStyle = ch.hairHex;
    g.beginPath();
    g.arc(90, 92, 50, Math.PI, 0);
    g.fill();
    if (ch.gender === 'female') {
      g.fillRect(40, 92, 18, 70);
      g.fillRect(122, 92, 18, 70);
    }
  } else {
    g.fillStyle = ch.skinTone;
    g.beginPath();
    g.arc(90, 86, 46, Math.PI, 0);
    g.fill();
  }
  if (ch.hasHat) {
    g.fillStyle = ch.hatColor ?? '#1e293b';
    g.fillRect(42, 48, 96, 16);
    g.fillRect(58, 28, 64, 24);
  }
  const eye = ch.eyeColor === 'blue' ? '#3b82f6' : ch.eyeColor === 'green' ? '#16a34a' : '#4a3428';
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(72, 108, 8, 0, Math.PI * 2);
  g.arc(108, 108, 8, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = eye;
  g.beginPath();
  g.arc(73, 108, 4, 0, Math.PI * 2);
  g.arc(109, 108, 4, 0, Math.PI * 2);
  g.fill();
  if (ch.hasGlasses) {
    g.strokeStyle = '#111';
    g.lineWidth = 3;
    g.strokeRect(60, 98, 24, 18);
    g.strokeRect(96, 98, 24, 18);
    g.beginPath();
    g.moveTo(84, 106);
    g.lineTo(96, 106);
    g.stroke();
  }
  if (ch.hasFacialHair) {
    g.fillStyle = ch.hairHex;
    g.fillRect(68, 132, 44, 14);
  }
  if (ch.hasEarrings) {
    g.fillStyle = '#f5d76e';
    g.beginPath();
    g.arc(42, 118, 4, 0, Math.PI * 2);
    g.arc(138, 118, 4, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = '#1c140c';
  g.font = '700 22px Georgia, serif';
  g.textAlign = 'center';
  g.fillText(ch.name, 90, 222);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function grid(i: number, z0: number) {
  const c = i % 6;
  const r = Math.floor(i / 6);
  return new THREE.Vector3((c - 2.5) * 0.064, 0.012, z0 + (r - 1.5) * 0.072);
}

function Stand({
  ch,
  at,
  down,
  tint,
  onPick,
}: {
  ch: GuessWhoCharacter;
  at: THREE.Vector3;
  down: boolean;
  tint: string;
  onPick?: (id: string) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const flip = useRef(down ? 1.15 : 0);
  const map = useMemo(() => faceTexture(ch), [ch]);
  useFrame((_, dt) => {
    const n = ref.current;
    if (!n) return;
    const want = down ? 1.15 : 0;
    flip.current += (want - flip.current) * Math.min(1, dt * 8);
    n.rotation.x = -flip.current;
  });
  return (
    <group position={at}>
      <group
        ref={ref}
        onClick={e => {
          if (!onPick) return;
          e.stopPropagation();
          onPick(ch.id);
        }}
      >
        <mesh position={[0, 0.046, 0]}>
          <planeGeometry args={[0.05, 0.068]} />
          <meshBasicMaterial map={map} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.01, 0.004]}>
          <boxGeometry args={[0.052, 0.008, 0.008]} />
          <meshStandardMaterial color={tint} />
        </mesh>
      </group>
    </group>
  );
}

export function GuessWhoTable({ onLeave }: { onLeave: () => void }) {
  const [state, setState] = useState<GuessWhoGameState>(() => createInitialGuessWhoState());
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const faces = useMemo(() => GUESS_WHO_CHARACTERS, []);
  const secretMap = useMemo(() => faceTexture(state.playerSecret), [state.playerSecret]);

  useEffect(() => setTableView(VIEW), []);
  useEffect(() => () => pushHud(null), []);

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

  useEffect(() => {
    const yours = state.turn === 'player' && !state.winner;
    const actions: HudAction[] = [];
    if (state.winner) {
      actions.push({ label: 'New game', onClick: () => setState(createInitialGuessWhoState()) });
    } else if (yours) {
      const slice = GUESS_WHO_QUESTIONS.slice(page * 8, page * 8 + 8);
      for (const q of slice) {
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
      detail: `Your card is ${state.playerSecret.name} · standing ${faces.length - state.playerFoldedIds.length} · they still have ${faces.length - state.aiFoldedIds.length}`,
      onLeave,
      actions,
    });
  }, [state, onLeave, page, picked, faces.length]);

  return (
    <group>
      <mesh position={[0, 0.004, 0.12]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.46, 0.36]} />
        <meshStandardMaterial color="#b91c1c" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.004, -0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.46, 0.36]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.55} />
      </mesh>
      {faces.map((ch, i) => (
        <Stand
          key={`r-${ch.id}`}
          ch={ch}
          at={grid(i, 0.12)}
          down={state.playerFoldedIds.includes(ch.id)}
          tint="#7f1d1d"
          onPick={flip}
        />
      ))}
      {faces.map((ch, i) => (
        <Stand key={`b-${ch.id}`} ch={ch} at={grid(i, -0.2)} down={state.aiFoldedIds.includes(ch.id)} tint="#1e3a8a" />
      ))}
      <mesh position={[-0.34, 0.07, 0.28]} rotation={[-0.5, 0.2, 0]}>
        <planeGeometry args={[0.07, 0.094]} />
        <meshBasicMaterial map={secretMap} toneMapped={false} />
      </mesh>
    </group>
  );
}
