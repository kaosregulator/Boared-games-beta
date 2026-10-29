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
import { BANK_AT, BET_AT, DEALER_ROW, PLAYER_ROW, SHOE_AT, blackjackShot, settleBeats, type BlackjackBeat } from './blackjackCam';
import { reportEvent } from '../../net/roomApi';

/**
 * Blackjack on green felt with real cards and chips (Tabletop Club's CC0
 * pack). The dealer is a ghost hand: it deals off the shoe, slides your cards
 * to you face up, keeps its hole card face down until your turn is over, then
 * turns it and draws to 17. Bets are real chip stacks in the betting circle.
 */

const SHOE = new THREE.Vector3(SHOE_AT[0], 0.012, SHOE_AT[1]);
/** The printed betting circle's centre on the felt. */
const BET_SPOT = new THREE.Vector3(BET_AT[0], 0.0072, BET_AT[1]);
const BANK_SPOT = new THREE.Vector3(BANK_AT[0], 0.0072, BANK_AT[1]);
const FELT_Y = 0.0068;

const PLAY_VIEW: Shot = { target: [0.04, 0, -0.01], yaw: 0, pitch: 0.95, dist: 0.78 };

type Phase = 'bet' | 'deal' | 'player' | 'dealer' | 'settle' | 'done';

/** Follow action for one beat of the hand (skipped when following is off). */
function follow(beat: BlackjackBeat, x = 0) {
  const { shot, ms } = blackjackShot(beat, x);
  followAction(shot, ms);
  // Capture scripts read which beats the camera followed (dev server only).
  if (import.meta.env.DEV) {
    const w = window as unknown as { __bjBeats?: BlackjackBeat[] };
    (w.__bjBeats ??= []).push(beat);
  }
}

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

  /** Compare the hands, then move the chips: paid into the circle and home, or swept to the house. */
  const settle = (p: PlayingCard[], d: PlayingCard[], doubled: number) => {
    setPhase('settle');
    handOn.current = false;
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
    setNote(msg);
    const [first, ...rest] = settleBeats(pay, stake);
    follow(first);
    const finish = () => {
      setStreak(s => (pay > stake ? { ...s, won: s.won + 1 } : pay < stake ? { ...s, lost: s.lost + 1 } : s));
      if (pay !== stake) reportEvent('blackjack', pay > stake ? 'won' : 'lost');
      setPhase('done');
      handOn.current = false;
      grip.current = 0;
    };
    let t = blackjackShot(first).ms;
    for (const beat of rest) {
      later(t, () => {
        follow(beat);
        if (beat === 'payout') {
          // the house sets the winnings down beside your stake
          handOn.current = true;
          grip.current = 1;
          handGoal.current.copy(BET_SPOT);
          setBet(pay);
          sound.playPokerChipsBet();
        } else if (beat === 'collect') {
          handOn.current = false;
          setBank(b => b + pay);
          setBet(0);
          sound.playChipCollect();
          if (pay > stake) sound.playVictoryFanfare();
        } else if (beat === 'houseTakes') {
          // the ghost hand rakes the stake off the circle and back to the shoe
          handOn.current = true;
          grip.current = 1;
          handGoal.current.copy(BET_SPOT);
          later(500, () => {
            setBet(0);
            sound.playChipCollect();
            handGoal.current.copy(SHOE);
          });
        }
      });
      t += blackjackShot(beat).ms;
    }
    later(t, finish);
  };

  /** The dealer's turn: turn the hole card, then draw to 17. */
  const dealerPlays = (p: PlayingCard[], d0: PlayingCard[], src: { d: PlayingCard[] }, stake: number, lead = 500) => {
    setPhase('dealer');
    let d = d0.map(c => ({ ...c, faceUp: true }));
    later(lead, () => {
      const hole = rowPos(DEALER_ROW, 1, d.length);
      dealTo(hole);
      follow('flip', hole.x);
      sound.playCardFlip();
      setDealer(d);
      setNote(`The dealer turns the hole card: ${calculateHandScore(d).total}.`);
    });
    const step = (delay: number) => {
      later(delay, () => {
        const sc = calculateHandScore(d);
        if (sc.total < 17 && !calculateHandScore(p).isBust) {
          d = [...d, draw(true, src)];
          const at = rowPos(DEALER_ROW, d.length - 1, d.length);
          dealTo(at);
          follow('dealerDraw', at.x);
          setDealer(d);
          setDeck(src.d);
          setNote(`The dealer draws: ${calculateHandScore(d).total}.`);
          step(blackjackShot('dealerDraw').ms);
        } else if (sc.isBust) {
          follow('dealerBust');
          setNote(`The dealer busts with ${sc.total}!`);
          grip.current = 0;
          handGoal.current.copy(SHOE);
          later(blackjackShot('dealerBust').ms, () => settle(p, d, stake));
        } else later(500, () => settle(p, d, stake));
      });
    };
    step(lead + blackjackShot('flip').ms);
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
          const at = rowPos(PLAYER_ROW, p.length - 1, p.length);
          dealTo(at);
          follow('dealPlayer', at.x);
        } else {
          d.push(draw(d.length === 0, src));
          setDealer([...d]);
          const at = rowPos(DEALER_ROW, d.length - 1, d.length);
          dealTo(at);
          follow('dealDealer', at.x);
        }
        setDeck(src.d);
      });
    });
    later(250 + 4 * 480, () => {
      grip.current = 0;
      handGoal.current.copy(SHOE);
      const ps = calculateHandScore(p);
      if (ps.isBlackjack) {
        setNote('Blackjack!');
        dealerPlays(p, d, src, bet, 700);
      } else {
        setPhase('player');
        setNote(`You have ${ps.total}${ps.isSoft ? ' (soft)' : ''}. Hit or stand?`);
      }
    });
  };

  const hit = (doubleDown = false) => {
    if (phase !== 'player') return;
    const stake = doubleDown ? bet * 2 : bet;
    const giveCard = () => {
      const src = { d: deck };
      const p = [...player, draw(true, src)];
      setPlayer(p);
      setDeck(src.d);
      const at = rowPos(PLAYER_ROW, p.length - 1, p.length);
      dealTo(at);
      later(450, () => {
        grip.current = 0;
        handGoal.current.copy(SHOE);
      });
      const sc = calculateHandScore(p);
      if (sc.isBust) {
        follow('bust', at.x);
        setNote(`Bust with ${sc.total}.`);
        setPhase('dealer');
        later(blackjackShot('bust').ms, () => dealerPlays(p, dealer, src, stake));
      } else {
        follow('hit', at.x);
        if (doubleDown || sc.total === 21) {
          setNote(`${sc.total}. ${doubleDown ? 'Doubled, one card only.' : 'Standing on 21.'}`);
          setPhase('dealer');
          later(blackjackShot('hit').ms, () => dealerPlays(p, dealer, src, stake));
        } else setNote(`You have ${sc.total}${sc.isSoft ? ' (soft)' : ''}. Hit or stand?`);
      }
    };
    if (!doubleDown) {
      giveCard();
      return;
    }
    // the second stake goes down first, then the one card
    setPhase('deal');
    setBank(b => b - bet);
    setBet(stake);
    sound.playPokerChipsBet();
    follow('double');
    setNote(`Doubled to $${stake}. One more card.`);
    later(blackjackShot('double').ms, giveCard);
  };

  const stand = () => {
    if (phase !== 'player') return;
    follow('stand');
    setNote(`You stand on ${calculateHandScore(player).total}.`);
    dealerPlays(player, dealer, { d: deck }, bet, blackjackShot('stand').ms);
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
    follow('bet');
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
      follow('bet');
      sound.playPokerChipsBet();
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
        actions.push({ label: 'Clear', onClick: () => (setBank(b => b + bet), setBet(0), follow('clear')), tone: 'ghost' });
        actions.push({ label: `Deal ($${bet})`, onClick: deal });
      }
    } else if (phase === 'player') {
      actions.push({ label: 'Hit', onClick: () => hit() });
      actions.push({ label: 'Stand', onClick: stand, tone: 'ghost' });
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
