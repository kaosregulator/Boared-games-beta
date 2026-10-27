import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { PlayingCard } from '../../types';
import { calculateHandScore, createDeck } from '../../games/blackjack/blackjackLogic';
import { sound } from '../../utils/audio';
import { pushHud, type HudAction } from './tableHud';
import { followAction, setTableView, type Shot } from './tableCam';
import { GhostHand } from './GhostHand';
import { CARD_W, Card3D, ChipStacks, useCardMaterial, useChipMaterial, type CardPose } from './cards3d';

/**
 * Blackjack on green felt with real cards and chips (Tabletop Club's CC0
 * pack). The dealer is a ghost hand: it deals off the shoe, slides your cards
 * to you face up, keeps its hole card face down until your turn is over, then
 * turns it and draws to 17. Bets are real chip stacks in the betting circle.
 */

const SHOE = new THREE.Vector3(0.33, 0.012, -0.2);
const DEALER_ROW = -0.15;
const PLAYER_ROW = 0.19;
/** The printed betting circle's centre on the felt. */
const BET_SPOT = new THREE.Vector3(0, 0.0072, 0.084);
const BANK_SPOT = new THREE.Vector3(0.31, 0.0072, 0.17);
const FELT_Y = 0.0068;

const PLAY_VIEW: Shot = { target: [0.04, 0, -0.01], yaw: 0, pitch: 0.95, dist: 0.78 };
const DEALER_VIEW: Shot = { target: [0.02, 0, DEALER_ROW], yaw: 0, pitch: 0.78, dist: 0.32 };
const PLAYER_VIEW: Shot = { target: [0, 0, PLAYER_ROW], yaw: 0, pitch: 0.7, dist: 0.34 };
const BET_VIEW: Shot = { target: [BET_SPOT.x, 0.01, BET_SPOT.z], yaw: 0.15, pitch: 0.72, dist: 0.34 };

type Phase = 'bet' | 'deal' | 'player' | 'dealer' | 'done';

function rowPos(row: number, k: number, n: number) {
  return new THREE.Vector3((k - (n - 1) / 2) * (CARD_W * 0.74), FELT_Y + 0.0003 + k * 0.0005, row);
}

function Felt() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 640;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(512, 280, 60, 512, 320, 620);
    grad.addColorStop(0, '#1f7a4a');
    grad.addColorStop(1, '#0f4a2c');
    g.fillStyle = grad;
    g.fillRect(0, 0, 1024, 640);
    g.strokeStyle = 'rgba(255, 230, 160, 0.75)';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(512, -380, 760, 0.23 * Math.PI, 0.77 * Math.PI);
    g.stroke();
    g.fillStyle = 'rgba(255, 230, 160, 0.85)';
    g.font = '700 30px "Bricolage Grotesque", Georgia, serif';
    g.textAlign = 'center';
    g.fillText('BLACKJACK PAYS 3 TO 2', 512, 300);
    g.font = '600 22px "Bricolage Grotesque", Georgia, serif';
    g.fillText('DEALER MUST DRAW TO 16 AND STAND ON ALL 17s', 512, 336);
    // the betting circle
    g.lineWidth = 4;
    g.beginPath();
    g.arc(512, 420, 58, 0, Math.PI * 2);
    g.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  // 0.96 x 0.6 m of felt, the circle lands at BET_SPOT
  return (
    <mesh position={[0, FELT_Y - 0.0004, -0.01]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[0.96, 0.6]} />
      <meshStandardMaterial map={tex} roughness={0.95} />
    </mesh>
  );
}

function Shoe() {
  return (
    <group position={[SHOE.x, 0.007, SHOE.z]} rotation={[0, -0.5, 0]}>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[0.08, 0.04, 0.12]} />
        <meshStandardMaterial color="#2a1a14" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.03, 0.045]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.068, 0.002, 0.04]} />
        <meshStandardMaterial color="#1b4a8a" roughness={0.6} />
      </mesh>
    </group>
  );
}

export function BlackjackTable({ onLeave }: { onLeave: () => void }) {
  const cardMat = useCardMaterial();
  const chipMat = useChipMaterial();
  const [phase, setPhase] = useState<Phase>('bet');
  const [bank, setBank] = useState(500);
  const [bet, setBet] = useState(0);
  const [deck, setDeck] = useState<PlayingCard[]>(() => createDeck());
  const [player, setPlayer] = useState<PlayingCard[]>([]);
  const [dealer, setDealer] = useState<PlayingCard[]>([]);
  const [note, setNote] = useState('Place your bet: tap the chips, then Deal.');
  const [streak, setStreak] = useState({ won: 0, lost: 0 });
  const timers = useRef<number[]>([]);
  const hand = useRef(new THREE.Vector3().copy(SHOE));
  const handGoal = useRef(new THREE.Vector3().copy(SHOE));
  const grip = useRef(0);
  const handOn = useRef(false);
  const lastBet = useRef(10);

  useEffect(() => setTableView(PLAY_VIEW), []);
  useEffect(() => () => timers.current.forEach(t => window.clearTimeout(t)), []);
  const later = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));

  useFrame((_, dt) => {
    hand.current.lerp(handGoal.current, Math.min(1, Math.min(dt, 0.05) * 9));
  });

  /** Draw one card off the shoe (a fresh shuffled shoe when it runs low). */
  const draw = (faceUp: boolean, src: { d: PlayingCard[] }) => {
    if (src.d.length < 12) src.d = createDeck();
    const c = { ...src.d[0], faceUp };
    src.d = src.d.slice(1);
    return c;
  };

  /** The ghost hand reaches to where a card lands, gripping as it goes. */
  const dealTo = (to: THREE.Vector3) => {
    handOn.current = true;
    grip.current = 1;
    handGoal.current.copy(to);
    sound.playCardDeal();
  };

  const settle = (p: PlayingCard[], d: PlayingCard[], doubled: number) => {
    const ps = calculateHandScore(p);
    const ds = calculateHandScore(d.map(c => ({ ...c, faceUp: true })));
    const stake = doubled;
    let pay = 0;
    let msg: string;
    if (ps.isBust) msg = `Bust with ${ps.total}. The house takes $${stake}.`;
    else if (ps.isBlackjack && !ds.isBlackjack) {
      pay = stake + Math.floor(stake * 1.5);
      msg = `Blackjack! Paid 3 to 2: +$${Math.floor(stake * 1.5)}.`;
    } else if (ds.isBust) {
      pay = stake * 2;
      msg = `Dealer busts with ${ds.total}. You win $${stake}.`;
    } else if (ps.total > ds.total) {
      pay = stake * 2;
      msg = `${ps.total} beats ${ds.total}. You win $${stake}.`;
    } else if (ps.total === ds.total) {
      pay = stake;
      msg = `Push at ${ps.total}. Your bet comes back.`;
    } else msg = `Dealer's ${ds.total} beats your ${ps.total}.`;
    setBank(b => b + pay);
    if (pay) sound.playChipCollect();
    setBet(0);
    setStreak(s => (pay > stake ? { ...s, won: s.won + 1 } : pay < stake ? { ...s, lost: s.lost + 1 } : s));
    if (pay > stake) sound.playVictoryFanfare();
    setNote(msg);
    setPhase('done');
    handOn.current = false;
  };

  /** The dealer's turn: turn the hole card, then draw to 17. */
  const dealerPlays = (p: PlayingCard[], d0: PlayingCard[], src: { d: PlayingCard[] }, stake: number) => {
    setPhase('dealer');
    let d = d0.map(c => ({ ...c, faceUp: true }));
    later(500, () => {
      dealTo(rowPos(DEALER_ROW, 1, d.length));
      followAction(DEALER_VIEW, 900);
      sound.playCardFlip();
      setDealer(d);
    });
    const step = (delay: number) => {
      later(delay, () => {
        const sc = calculateHandScore(d);
        if (sc.total < 17 && !calculateHandScore(p).isBust) {
          d = [...d, draw(true, src)];
          dealTo(rowPos(DEALER_ROW, d.length - 1, d.length));
          followAction(DEALER_VIEW, 800);
          setDealer(d);
          setDeck(src.d);
          step(750);
        } else later(500, () => settle(p, d, stake));
      });
    };
    step(1200);
  };

  const deal = () => {
    if (bet <= 0) return;
    lastBet.current = bet;
    setPhase('deal');
    setNote('Dealing…');
    const src = { d: deck };
    const p: PlayingCard[] = [];
    const d: PlayingCard[] = [];
    const order: ('p' | 'd')[] = ['p', 'd', 'p', 'd'];
    order.forEach((who, k) => {
      later(250 + k * 480, () => {
        if (who === 'p') {
          p.push(draw(true, src));
          setPlayer([...p]);
          dealTo(rowPos(PLAYER_ROW, p.length - 1, p.length));
          followAction(PLAYER_VIEW, 700);
        } else {
          d.push(draw(d.length === 0, src));
          setDealer([...d]);
          dealTo(rowPos(DEALER_ROW, d.length - 1, d.length));
          followAction(DEALER_VIEW, 700);
        }
        setDeck(src.d);
      });
    });
    later(250 + 4 * 480, () => {
      grip.current = 0;
      handGoal.current.copy(SHOE);
      const ps = calculateHandScore(p);
      if (ps.isBlackjack) dealerPlays(p, d, src, bet);
      else {
        setPhase('player');
        setNote(`You have ${ps.total}${ps.isSoft ? ' (soft)' : ''}. Hit or stand?`);
      }
    });
  };

  const hit = (doubleDown = false) => {
    const src = { d: deck };
    const p = [...player, draw(true, src)];
    setPlayer(p);
    setDeck(src.d);
    dealTo(rowPos(PLAYER_ROW, p.length - 1, p.length));
    followAction(PLAYER_VIEW, 900);
    later(450, () => {
      grip.current = 0;
      handGoal.current.copy(SHOE);
    });
    const stake = doubleDown ? bet * 2 : bet;
    if (doubleDown) {
      setBank(b => b - bet);
      setBet(stake);
    }
    const sc = calculateHandScore(p);
    if (sc.isBust) {
      setNote(`Bust with ${sc.total}.`);
      later(700, () => dealerPlays(p, dealer, src, stake));
    } else if (doubleDown || sc.total === 21) later(600, () => dealerPlays(p, dealer, src, stake));
    else setNote(`You have ${sc.total}${sc.isSoft ? ' (soft)' : ''}. Hit or stand?`);
  };

  const addChip = (v: number) => {
    if (phase !== 'bet' && phase !== 'done') return;
    if (phase === 'done') {
      setPlayer([]);
      setDealer([]);
      setPhase('bet');
    }
    if (bank < v) return;
    setBank(b => b - v);
    setBet(b => b + v);
    followAction(BET_VIEW, 800);
    sound.playPokerChipsBet();
  };

  const nextHand = () => {
    setPlayer([]);
    setDealer([]);
    setPhase('bet');
    const v = Math.min(lastBet.current, bank);
    if (v > 0) {
      setBank(b => b - v);
      setBet(v);
    }
    setNote(bank > 0 ? 'Same bet again, or change it, then Deal.' : 'Out of chips. The house spots you $500.');
    if (bank <= 0) setBank(500);
    setTableView(PLAY_VIEW);
  };

  useEffect(() => {
    const actions: HudAction[] = [];
    if (phase === 'bet') {
      [5, 10, 25, 100].forEach(v => actions.push({ label: `+$${v}`, onClick: () => addChip(v), tone: 'ghost' }));
      if (bet > 0) {
        actions.push({ label: 'Clear', onClick: () => (setBank(b => b + bet), setBet(0)), tone: 'ghost' });
        actions.push({ label: `Deal ($${bet})`, onClick: deal });
      }
    } else if (phase === 'player') {
      actions.push({ label: 'Hit', onClick: () => hit() });
      actions.push({ label: 'Stand', onClick: () => dealerPlays(player, dealer, { d: deck }, bet), tone: 'ghost' });
      if (player.length === 2 && bank >= bet) actions.push({ label: `Double ($${bet})`, onClick: () => hit(true), tone: 'ghost' });
    } else if (phase === 'done') actions.push({ label: 'Next hand', onClick: nextHand });
    const ps = player.length ? calculateHandScore(player).total : null;
    const ds = dealer.length ? calculateHandScore(dealer).total : null;
    pushHud({
      title: 'Blackjack',
      note,
      detail: `Chips $${bank} · on the table $${bet}${ps !== null ? ` · you ${ps}` : ''}${ds !== null ? ` · dealer shows ${ds}` : ''} · won ${streak.won} lost ${streak.lost}`,
      onLeave,
      actions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, bank, bet, player, dealer, note, streak, onLeave]);
  useEffect(() => () => pushHud(null), []);

  const poses = (cards: PlayingCard[], row: number): CardPose[] =>
    cards.map((c, k) => ({ pos: rowPos(row, k, cards.length), yaw: 0, faceUp: c.faceUp }));
  const pp = poses(player, PLAYER_ROW);
  const dp = poses(dealer, DEALER_ROW);

  return (
    <group>
      <Felt />
      <Shoe />
      {player.map((c, k) => (
        <Card3D key={c.id} rank={c.rank} suit={c.suit} pose={pp[k]} material={cardMat} />
      ))}
      {dealer.map((c, k) => (
        <Card3D key={c.id} rank={c.rank} suit={c.suit} pose={dp[k]} material={cardMat} />
      ))}
      {bet > 0 && <ChipStacks amount={bet} at={BET_SPOT} material={chipMat} spread={0.044} />}
      <ChipStacks amount={bank} at={BANK_SPOT} material={chipMat} spread={0.043} />
      <GhostHand at={hand.current} grip={grip} visible={handOn} from={Math.PI} tint="#c9b8ff" />
    </group>
  );
}
