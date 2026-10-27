import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  act,
  applyBot,
  committed,
  dealHand,
  legal,
  newMatch,
  potBeforeStreet,
  type Holdem,
  type Seat,
} from '../../games/poker/holdemEngine';
import { evaluatePokerHand } from '../../utils/pokerLogic';
import { sound } from '../../utils/audio';
import { pushHud, type HudAction } from './tableHud';
import { followAction, setTableView, type Shot } from './tableCam';
import { GhostHand } from './GhostHand';
import { CARD_W, Card3D, ChipStacks, useCardMaterial, useChipMaterial, type CardPose } from './cards3d';

/**
 * Texas Hold'em on the same felt as blackjack: real cards, real chips, a
 * ghost hand dealing the board. Your two cards stay face up. The other three
 * stay down until the showdown.
 */

const FELT_Y = 0.0068;
const STEP = CARD_W * 1.05;

const TABLE_VIEW: Shot = { target: [0, 0, 0.02], yaw: 0, pitch: 0.98, dist: 0.9 };
const HERO_VIEW: Shot = { target: [0, 0, 0.1], yaw: 0, pitch: 0.78, dist: 0.58 };
const BOARD_VIEW: Shot = { target: [0, 0, -0.02], yaw: 0, pitch: 0.84, dist: 0.56 };

const HOLE = [
  { x: 0, z: 0.2 },
  { x: -0.3, z: 0.02 },
  { x: 0, z: -0.26 },
  { x: 0.3, z: 0.02 },
];

const POT_AT = new THREE.Vector3(0.22, FELT_Y + 0.004, 0.06);
const SHOE = new THREE.Vector3(0.36, 0.02, -0.16);

function along(i: number, extra: number) {
  const h = HOLE[i];
  const len = Math.hypot(h.x, h.z) || 1;
  const d = Math.max(0.05, len + extra);
  return new THREE.Vector3((h.x / len) * d, FELT_Y + 0.004, (h.z / len) * d);
}

function holePose(i: number, k: number, faceUp: boolean, n: number): CardPose {
  const seat = HOLE[i];
  const spread = (k - (n - 1) / 2) * 0.034;
  const yaw = faceUp ? spread * 0.6 : Math.atan2(seat.x, seat.z || 1);
  const x = seat.x + spread;
  const z = seat.z + (faceUp ? 0 : 0);
  return {
    pos: new THREE.Vector3(x, FELT_Y + 0.0004 + k * 0.00045, z),
    yaw: faceUp ? yaw : Math.atan2(-seat.x, -(seat.z || 0.01)),
    faceUp,
  };
}

function boardPose(k: number, n: number): CardPose {
  return {
    pos: new THREE.Vector3((k - (n - 1) / 2) * STEP, FELT_Y + 0.0005 + k * 0.0002, -0.04),
    yaw: 0,
    faceUp: true,
  };
}

function voice(prev: Holdem, next: Holdem) {
  if (next.handNo !== prev.handNo || next.board.length > prev.board.length) sound.playCardDeal();
  else if (next.note !== prev.note) {
    if (next.note.includes('folds')) sound.playButtonClick();
    else sound.playPokerChipsBet();
  }
  if (next.street === 'over' && prev.street !== 'over') {
    if (next.winners.some(w => w.seat === 0)) sound.playVictoryFanfare();
    else sound.playChipCollect();
  }
}

function Felt() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 640;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(512, 300, 40, 512, 320, 640);
    grad.addColorStop(0, '#1b6b45');
    grad.addColorStop(1, '#0c3a26');
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 640);
    g.strokeStyle = 'rgba(255, 224, 160, 0.8)';
    g.lineWidth = 8;
    g.strokeRect(36, 28, 952, 584);
    g.lineWidth = 3;
    g.strokeRect(52, 44, 920, 552);
    g.fillStyle = 'rgba(255, 230, 170, 0.9)';
    g.font = '700 54px Georgia, serif';
    g.textAlign = 'center';
    g.fillText("TEXAS HOLD 'EM", 512, 250);
    g.font = '600 26px Georgia, serif';
    g.fillText('BLINDS  $10  /  $20', 512, 292);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  return (
    <mesh position={[0, FELT_Y - 0.0004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1.02, 0.64]} />
      <meshStandardMaterial map={tex} roughness={0.95} />
    </mesh>
  );
}

function Tag({ name, at, hot, out }: { name: string; at: THREE.Vector3; hot: boolean; out: boolean }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = hot ? '#f6e2b0' : '#f4efe4';
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = out ? '#8d8478' : '#1c140c';
    g.font = '700 62px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(name, 256, 66);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [name, hot, out]);
  return (
    <mesh position={[at.x, 0.02, at.z]} rotation={[-0.65, 0, 0]}>
      <planeGeometry args={[0.1, 0.025]} />
      <meshBasicMaterial map={tex} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function faceUp(seat: Seat, i: number, over: boolean) {
  if (seat.folded) return false;
  return i === 0 || over;
}

export function HoldemTable({ onLeave }: { onLeave: () => void }) {
  const cardMat = useCardMaterial();
  const chipMat = useChipMaterial();
  const [state, setState] = useState<Holdem>(() => newMatch());
  const hand = useRef(new THREE.Vector3().copy(SHOE));
  const handGoal = useRef(new THREE.Vector3().copy(SHOE));
  const grip = useRef(0);
  const handOn = useRef(false);
  const seenBoard = useRef(0);

  useEffect(() => setTableView(TABLE_VIEW), []);
  useEffect(() => () => pushHud(null), []);

  useFrame((_, dt) => {
    hand.current.lerp(handGoal.current, Math.min(1, Math.min(dt, 0.05) * 8));
  });

  const play = (fn: (s: Holdem) => Holdem) => {
    setState(cur => {
      const next = fn(cur);
      voice(cur, next);
      return next;
    });
  };

  useEffect(() => {
    seenBoard.current = 0;
    handOn.current = true;
    grip.current = 1;
    handGoal.current.set(HOLE[0].x, FELT_Y, HOLE[0].z);
    const t = window.setTimeout(() => {
      grip.current = 0;
      handGoal.current.copy(SHOE);
      handOn.current = false;
    }, 900);
    return () => window.clearTimeout(t);
  }, [state.handNo]);

  useEffect(() => {
    if (state.board.length <= seenBoard.current) return;
    const pose = boardPose(state.board.length - 1, state.board.length);
    handOn.current = true;
    grip.current = 1;
    handGoal.current.copy(pose.pos);
    seenBoard.current = state.board.length;
    const t = window.setTimeout(() => {
      grip.current = 0;
      handGoal.current.copy(SHOE);
      handOn.current = false;
    }, 700);
    return () => window.clearTimeout(t);
  }, [state.board.length, state.handNo]);

  useEffect(() => {
    if (state.street === 'over' || state.actor !== 0) followAction(state.board.length ? BOARD_VIEW : TABLE_VIEW, 1200);
    else followAction(HERO_VIEW, 800);
  }, [state.actor, state.street, state.board.length, state.handNo]);

  useEffect(() => {
    if (state.street === 'over' || state.actor < 0 || !state.seats[state.actor].bot) return;
    const actor = state.actor;
    const handNo = state.handNo;
    const t = window.setTimeout(() => {
      setState(cur => {
        if (cur.actor !== actor || cur.handNo !== handNo || cur.street === 'over') return cur;
        const next = applyBot(cur);
        voice(cur, next);
        return next;
      });
    }, 820);
    return () => window.clearTimeout(t);
  }, [state.actor, state.street, state.handNo, state.note]);

  useEffect(() => {
    const you = state.seats[0];
    const L = legal(state);
    const actions: HudAction[] = [];
    if (L && state.actor === 0) {
      actions.push({ label: 'Fold', onClick: () => play(s => act(s, 'fold')), tone: 'ghost' });
      if (L.check) actions.push({ label: 'Check', onClick: () => play(s => act(s, 'check')) });
      else actions.push({ label: `Call $${L.call}`, onClick: () => play(s => act(s, 'call')) });
      if (L.minRaise > 0 && L.minRaise < you.chips) {
        actions.push({
          label: `Raise to $${you.bet + L.minRaise}`,
          onClick: () => play(s => act(s, 'raise', L.minRaise)),
          tone: 'ghost',
        });
      }
      const pot = committed(state);
      const potPut = Math.min(you.chips, Math.max(L.minRaise, pot));
      if (potPut > L.minRaise && potPut < you.chips) {
        actions.push({ label: `Pot $${you.bet + potPut}`, onClick: () => play(s => act(s, 'raise', potPut)) });
      }
      if (you.chips > 0 && you.chips !== L.call) actions.push({ label: `All-in $${you.chips}`, onClick: () => play(s => act(s, 'allin')), tone: 'ghost' });
    } else if (state.street === 'over') {
      actions.push({ label: 'Next hand', onClick: () => play(dealHand) });
    }
    const made = you.hole.length ? evaluatePokerHand([...you.hole, ...state.board]).name : '';
    const stacks = state.seats.map(p => `${p.name.split(' ')[0]} $${p.chips}${p.folded ? ' out' : ''}`).join(' · ');
    pushHud({
      title: "Texas Hold'em",
      note: state.actor === 0 && state.street !== 'over' ? `Your turn. ${state.note}` : state.note,
      detail: `${stacks} · pot $${committed(state)}${made ? ` · ${made}` : ''}`,
      onLeave,
      actions,
    });
    // play() closes over the latest setters; the state snapshot is the dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, onLeave]);

  const over = state.street === 'over';
  const pot = potBeforeStreet(state);

  return (
    <group>
      <Felt />
      {state.board.map((c, k) => (
        <Card3D key={c.id} rank={c.rank} suit={c.suit} pose={boardPose(k, state.board.length)} material={cardMat} />
      ))}
      {state.seats.map((seat, i) => {
        const up = faceUp(seat, i, over);
        return seat.hole.map((c, k) => (
          <Card3D key={c.id} rank={c.rank} suit={c.suit} pose={holePose(i, k, up, seat.hole.length)} material={cardMat} />
        ));
      })}
      {state.seats.map((seat, i) => (
        <Tag key={seat.name} name={seat.name} at={along(i, 0.09)} hot={state.actor === i} out={seat.folded} />
      ))}
      {state.seats.map((seat, i) =>
        seat.chips > 0 ? <ChipStacks key={`bank-${i}`} amount={seat.chips} at={along(i, 0.05)} material={chipMat} spread={0.04} /> : null,
      )}
      {state.seats.map((seat, i) =>
        seat.bet > 0 ? <ChipStacks key={`bet-${i}`} amount={seat.bet} at={along(i, -0.1)} material={chipMat} spread={0.036} /> : null,
      )}
      {pot > 0 && <ChipStacks amount={pot} at={POT_AT} material={chipMat} spread={0.042} />}
      <mesh position={along(state.dealer, 0.02)} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.014, 24]} />
        <meshBasicMaterial color="#f6f3ea" />
      </mesh>
      <GhostHand at={hand.current} grip={grip} visible={handOn} from={0.4} tint="#d7c4ff" />
      <group position={[SHOE.x, 0.004, SHOE.z]} rotation={[0, 0.4, 0]}>
        <mesh position={[0, 0.012, 0]}>
          <boxGeometry args={[0.07, 0.018, 0.05]} />
          <meshStandardMaterial color="#1a3f86" roughness={0.55} />
        </mesh>
      </group>
    </group>
  );
}
