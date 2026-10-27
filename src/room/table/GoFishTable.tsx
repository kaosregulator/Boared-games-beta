import React, { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { CardRank } from '../../types';
import { applyBot, ask, newFish, type Fish } from '../../games/gofish/goFishEngine';
import { sound } from '../../utils/audio';
import { pushHud, type HudAction } from './tableHud';
import { followAction, setTableView, wasDrag, type Shot } from './tableCam';
import { Card3D, useCardMaterial, type CardPose } from './cards3d';

/**
 * Go Fish on the felt. Your hand is face up, the other hands are face down,
 * books sit beside each player, and the pond is a stack in the middle.
 * Pick a rank, then tap the person you want to ask.
 */

const FELT_Y = 0.0068;
const TABLE_VIEW: Shot = { target: [0, 0, 0.02], yaw: 0, pitch: 1.0, dist: 0.92 };
const HERO_VIEW: Shot = { target: [0, 0, 0.12], yaw: 0, pitch: 0.78, dist: 0.55 };

const SEAT = [
  { x: 0, z: 0.2 },
  { x: -0.3, z: 0.0 },
  { x: 0, z: -0.26 },
  { x: 0.3, z: 0.0 },
];

const BOOKS = [
  { x: -0.34, z: 0.1 },
  { x: -0.34, z: -0.12 },
  { x: -0.06, z: -0.26 },
  { x: 0.34, z: -0.12 },
];

function fan(i: number, k: number, n: number, lift: boolean): CardPose {
  const seat = SEAT[i];
  const spread = Math.min(0.036, 0.34 / Math.max(1, n));
  return {
    pos: new THREE.Vector3(seat.x + (k - (n - 1) / 2) * spread, FELT_Y + (lift ? 0.014 : 0.0005) + k * 0.00035, seat.z),
    yaw: i === 2 ? Math.PI : 0,
    faceUp: true,
  };
}

function voice(prev: Fish, next: Fish) {
  if (next.note.includes('go fish') || next.note.includes('fishes')) sound.playSplash();
  else if (next.note !== prev.note) sound.playCardDeal();
  if (next.players.some((p, i) => p.books.length > prev.players[i].books.length)) sound.playVictoryFanfare();
  else if (next.over && !prev.over && next.winner === 0) sound.playVictoryFanfare();
}

function Felt() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 640;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(512, 340, 30, 512, 300, 620);
    grad.addColorStop(0, '#1a6e92');
    grad.addColorStop(1, '#0c3348');
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 640);
    g.strokeStyle = 'rgba(190, 235, 255, 0.75)';
    g.lineWidth = 8;
    g.beginPath();
    g.ellipse(512, 330, 220, 120, 0, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = 'rgba(230, 248, 255, 0.92)';
    g.font = '700 52px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('GO FISH', 512, 250);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  return (
    <mesh position={[0, FELT_Y - 0.0004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1.02, 0.64]} />
      <meshStandardMaterial map={tex} roughness={0.92} />
    </mesh>
  );
}

function Tag({ text, x, z, hot }: { text: string; x: number; z: number; hot: boolean }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = hot ? '#d7f4ff' : '#f4efe4';
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = '#102028';
    g.font = '700 60px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 256, 66);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text, hot]);
  return (
    <mesh position={[x, 0.02, z]} rotation={[-0.65, 0, 0]}>
      <planeGeometry args={[0.09, 0.022]} />
      <meshBasicMaterial map={tex} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function GoFishTable({ onLeave }: { onLeave: () => void }) {
  const cardMat = useCardMaterial();
  const [state, setState] = useState<Fish>(() => newFish());
  const [rank, setRank] = useState<CardRank | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => setTableView(TABLE_VIEW), []);
  useEffect(() => () => pushHud(null), []);
  useEffect(() => {
    if (rank && !state.players[0].hand.some(c => c.rank === rank)) setRank(null);
  }, [state, rank]);

  const play = (fn: (s: Fish) => Fish) => {
    setHint(null);
    setState(cur => {
      const next = fn(cur);
      voice(cur, next);
      return next;
    });
  };

  const yours = state.turn === 0 && !state.over;

  const askSeat = (target: number) => {
    if (!yours) return;
    if (!rank) {
      setHint('Pick a rank from your hand, then tap who you want to ask.');
      return;
    }
    const chosen = rank;
    setRank(null);
    play(s => ask(s, target, chosen));
  };

  useEffect(() => {
    followAction(yours ? HERO_VIEW : TABLE_VIEW, 900);
  }, [state.turn, state.over]);

  useEffect(() => {
    if (state.over || !state.players[state.turn].bot) return;
    const turn = state.turn;
    const t = window.setTimeout(() => {
      setState(cur => {
        if (cur.over || cur.turn !== turn || !cur.players[turn].bot) return cur;
        const next = applyBot(cur);
        voice(cur, next);
        return next;
      });
    }, 900);
    return () => window.clearTimeout(t);
  }, [state.turn, state.over, state.note]);

  useEffect(() => {
    const you = state.players[0];
    const actions: HudAction[] = [];
    if (yours) {
      const ranks = [...new Set(you.hand.map(c => c.rank))];
      ranks.forEach(r => actions.push({ label: rank === r ? `${r} picked` : r, onClick: () => setRank(r), tone: rank === r ? 'amber' : 'ghost' }));
      if (rank) {
        state.players.forEach((p, i) => {
          if (i === 0 || p.hand.length === 0) return;
          actions.push({ label: `Ask ${p.name}`, onClick: () => askSeat(i) });
        });
      }
    } else if (state.over) {
      actions.push({ label: 'New game', onClick: () => play(() => newFish()) });
    }
    const books = state.players.map(p => `${p.name.split(' ')[0]} ${p.books.length}`).join(' · ');
    pushHud({
      title: 'Go Fish',
      note: hint ?? (rank && yours ? `Asking for ${rank}s. Tap a player.` : state.note),
      detail: `${books} · pond ${state.pond.length}${you.books.length ? ` · your books ${you.books.map(b => b[0].rank).join(' ')}` : ''}`,
      onLeave,
      actions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, rank, hint, onLeave]);

  const pond = state.pond.slice(-Math.min(10, state.pond.length));

  return (
    <group>
      <Felt />
      {pond.map((c, k) => (
        <Card3D
          key={c.id}
          rank={c.rank}
          suit={c.suit}
          material={cardMat}
          pose={{ pos: new THREE.Vector3(-0.01 + k * 0.0008, FELT_Y + k * 0.00045, -0.02), yaw: 0.15, faceUp: false }}
        />
      ))}
      {state.players.map((p, i) =>
        p.hand.map((c, k) => {
          const mine = i === 0;
          const pose = fan(i, k, p.hand.length, mine && rank === c.rank);
          if (!mine) pose.faceUp = false;
          return (
            <group
              key={c.id}
              onClick={e => {
                e.stopPropagation();
                if (wasDrag()) return;
                if (mine) setRank(c.rank);
                else askSeat(i);
              }}
            >
              <Card3D rank={c.rank} suit={c.suit} pose={pose} material={cardMat} />
            </group>
          );
        }),
      )}
      {state.players.map((p, i) =>
        p.books.map((book, b) =>
          book.map((c, k) => (
            <Card3D
              key={c.id}
              rank={c.rank}
              suit={c.suit}
              material={cardMat}
              pose={{
                pos: new THREE.Vector3(BOOKS[i].x + (b % 4) * 0.032 + k * 0.003, FELT_Y + k * 0.0005, BOOKS[i].z + Math.floor(b / 4) * 0.05),
                yaw: 0.2,
                faceUp: true,
              }}
            />
          )),
        ),
      )}
      {state.players.map((p, i) => {
        const tag = [
          [0, 0.32],
          [-0.46, 0],
          [0, -0.36],
          [0.46, 0],
        ][i];
        return <Tag key={p.id} text={p.name} x={tag[0]} z={tag[1]} hot={state.turn === i} />;
      })}
    </group>
  );
}
