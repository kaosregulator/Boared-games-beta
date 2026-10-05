import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sound } from '../../utils/audio';
import { DiceTray } from './DiceTray';
import {
  ALL_CATEGORIES,
  Category,
  LOWER,
  PlayerState,
  UPPER,
  UPPER_BONUS,
  UPPER_BONUS_THRESHOLD,
  YAHTZEE_BONUS,
  aiChooseCategory,
  aiKeepMask,
  cardComplete,
  emptyPlayer,
  grandTotal,
  isYahtzee,
  legalCategories,
  lowerSubtotal,
  scoreFor,
  upperBonus,
  upperSubtotal,
} from './yahtzeeRules';

type Phase = 'idle' | 'rolling' | 'settled' | 'over';

const BLANK_DICE = [1, 1, 1, 1, 1];
const NO_HOLDS = [false, false, false, false, false];

interface YahtzeeGameProps {
  onBackToShelf: () => void;
  onGameOver?: (winner: string, isRealMatch: boolean) => void;
  playerName?: string;
}

/**
 * Yahtzee played on real dice. The tray is a physics simulation and every value
 * on the card is read off the dice that actually landed; the full official
 * scorecard is in play, bonuses included, against a scoring opponent.
 */
export function YahtzeeGame({ onBackToShelf, onGameOver, playerName = 'You' }: YahtzeeGameProps) {
  const [players, setPlayers] = useState<PlayerState[]>(() => [
    emptyPlayer(playerName, false),
    emptyPlayer('Blackbeard_Bot', true),
  ]);
  const [turn, setTurn] = useState(0);
  const [dice, setDice] = useState<number[]>(BLANK_DICE);
  const [held, setHeld] = useState<boolean[]>(NO_HOLDS);
  const [rollsLeft, setRollsLeft] = useState(3);
  const [phase, setPhase] = useState<Phase>('idle');
  const [rollToken, setRollToken] = useState(0);
  const [log, setLog] = useState<string[]>(['Roll the dice to open the card.']);
  const aiTimer = useRef<number | null>(null);

  const me = players[0];
  const bot = players[1];
  const active = players[turn];
  const myTurn = turn === 0;

  const pushLog = useCallback((line: string) => {
    setLog(prev => [line, ...prev].slice(0, 7));
  }, []);

  useEffect(
    () => () => {
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    },
    [],
  );

  const roll = useCallback(() => {
    if (rollsLeft <= 0 || phase === 'rolling' || phase === 'over') return;
    sound.playDiceShake();
    setPhase('rolling');
    setRollsLeft(n => n - 1);
    setRollToken(t => t + 1);
  }, [phase, rollsLeft]);

  const handleSettle = useCallback(
    (values: number[]) => {
      setDice(prev => values.map((v, i) => (held[i] ? prev[i] : v)));
      setPhase('settled');
    },
    [held],
  );

  const toggleHold = useCallback(
    (index: number) => {
      if (phase !== 'settled' || !myTurn) return;
      sound.playPieceSelect();
      setHeld(prev => prev.map((h, i) => (i === index ? !h : h)));
    },
    [myTurn, phase],
  );

  const endTurn = useCallback(() => {
    setHeld(NO_HOLDS);
    setRollsLeft(3);
    setPhase('idle');
    setTurn(t => (t + 1) % 2);
  }, []);

  const takeCategory = useCallback(
    (category: Category, playerIndex: number) => {
      const player = players[playerIndex];
      if (player.card[category] !== undefined) return;
      if (!legalCategories(dice, player.card).includes(category)) {
        pushLog('Joker rules: that box is not available for this Yahtzee.');
        return;
      }

      const bonusYahtzee = isYahtzee(dice) && player.card.yahtzee !== undefined && (player.card.yahtzee ?? 0) > 0;
      const points = scoreFor(category, dice, player.card);

      setPlayers(prev =>
        prev.map((p, i) =>
          i === playerIndex
            ? {
                ...p,
                card: { ...p.card, [category]: points },
                yahtzeeBonuses: p.yahtzeeBonuses + (bonusYahtzee ? 1 : 0),
              }
            : p,
        ),
      );

      const label =
        UPPER.find(u => u.id === category)?.label ?? LOWER.find(l => l.id === category)?.label ?? category;
      if (category === 'yahtzee' && points === 50) sound.playVictoryFanfare();
      else if (points === 0) sound.playMoveClack();
      else sound.playChipCollect();

      pushLog(
        `${player.name} scored ${points} in ${label}${bonusYahtzee ? ` +${YAHTZEE_BONUS} Yahtzee bonus` : ''}.`,
      );
      endTurn();
    },
    [dice, endTurn, players, pushLog],
  );

  /* ------------------------------ opponent -------------------------------- */

  useEffect(() => {
    if (phase === 'over' || myTurn) return;

    if (phase === 'idle') {
      aiTimer.current = window.setTimeout(() => roll(), 700);
      return () => {
        if (aiTimer.current) window.clearTimeout(aiTimer.current);
      };
    }

    if (phase !== 'settled') return;

    aiTimer.current = window.setTimeout(() => {
      if (rollsLeft > 0) {
        const keep = aiKeepMask(dice, bot.card, rollsLeft);
        const keptCount = keep.filter(Boolean).length;
        if (keptCount < 5) {
          setHeld(keep);
          setPhase('idle');
          return;
        }
      }
      takeCategory(aiChooseCategory(dice, bot.card), 1);
    }, 900);

    return () => {
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    };
  }, [bot.card, dice, myTurn, phase, roll, rollsLeft, takeCategory]);

  // The opponent needs a fresh roll once it has chosen what to keep.
  useEffect(() => {
    if (myTurn || phase !== 'idle' || rollsLeft === 3 || rollsLeft <= 0) return;
    const t = window.setTimeout(() => roll(), 600);
    return () => window.clearTimeout(t);
  }, [myTurn, phase, rollsLeft, roll]);

  /* ------------------------------ game over ------------------------------- */

  useEffect(() => {
    if (phase === 'over') return;
    if (!cardComplete(me.card) || !cardComplete(bot.card)) return;
    setPhase('over');
    const mine = grandTotal(me);
    const theirs = grandTotal(bot);
    const winner = mine === theirs ? 'Tie' : mine > theirs ? me.name : bot.name;
    pushLog(`Final: ${me.name} ${mine} — ${bot.name} ${theirs}.`);
    if (mine > theirs) sound.playVictoryFanfare();
    else sound.playDefeat();
    onGameOver?.(winner === me.name ? `${me.name} (You)` : winner, true);
  }, [bot, me, onGameOver, phase, pushLog]);

  /* -------------------------------- render -------------------------------- */

  const previewFor = useCallback(
    (category: Category) => {
      if (phase !== 'settled' || !myTurn) return null;
      if (me.card[category] !== undefined) return null;
      if (!legalCategories(dice, me.card).includes(category)) return null;
      return scoreFor(category, dice, me.card);
    },
    [dice, me.card, myTurn, phase],
  );

  const upperSub = upperSubtotal(me.card);
  const filled = ALL_CATEGORIES.filter(c => me.card[c] !== undefined).length;
  const rollLabel = rollsLeft === 3 ? 'Roll the dice' : `Roll again · ${rollsLeft} left`;

  const row = (
    id: Category,
    label: string,
    detail: string,
  ) => {
    const mineVal = me.card[id];
    const botVal = bot.card[id];
    const preview = previewFor(id);
    const open = mineVal === undefined && myTurn && phase === 'settled' && preview !== null;
    return (
      <button
        key={id}
        type="button"
        disabled={!open}
        onClick={() => takeCategory(id, 0)}
        className={`group flex items-center gap-2 w-full rounded-lg border px-2.5 py-1.5 text-left transition ${
          mineVal !== undefined
            ? 'border-white/5 bg-black/30'
            : open
              ? 'border-amber-300/50 bg-amber-400/10 hover:bg-amber-400/20 hover:border-amber-300'
              : 'border-white/5 bg-black/20 opacity-60'
        }`}
      >
        <span className="flex-1 min-w-0">
          <span className="block text-[12px] font-bold text-white truncate">{label}</span>
          <span className="block text-[9px] uppercase tracking-wider text-slate-400">{detail}</span>
        </span>
        <span
          className={`w-10 text-right font-mono text-sm ${
            mineVal !== undefined ? 'text-amber-200' : open ? 'text-emerald-300' : 'text-slate-600'
          }`}
        >
          {mineVal !== undefined ? mineVal : preview !== null ? `+${preview}` : '—'}
        </span>
        <span className="w-8 text-right font-mono text-xs text-slate-500">
          {botVal !== undefined ? botVal : '·'}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full text-white">
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-red-300 font-bold">On the table</p>
          <h2 className="font-display text-3xl leading-tight">Yahtzee</h2>
          <p className="text-[11px] text-slate-400">
            Box {filled} of 13 · {myTurn ? 'your turn' : `${bot.name} is thinking`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400 font-bold">{me.name}</p>
            <p className="font-mono text-2xl text-amber-200 leading-none">{grandTotal(me)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold">{bot.name}</p>
            <p className="font-mono text-xl text-slate-300 leading-none">{grandTotal(bot)}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.15fr_1fr] gap-4 p-4">
        {/* dice tray */}
        <div className="flex flex-col gap-3">
          <div className="relative h-[280px] sm:h-[340px] rounded-2xl overflow-hidden border border-amber-900/40 bg-[#15100c] shadow-inner">
            <DiceTray
              dice={dice}
              held={held}
              rollToken={rollToken}
              rolling={phase === 'rolling'}
              canHold={myTurn && phase === 'settled'}
              onSettle={handleSettle}
              onToggleHold={toggleHold}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={roll}
              disabled={!myTurn || rollsLeft <= 0 || phase === 'rolling' || phase === 'over'}
              className="rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-35 disabled:hover:bg-red-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider shadow-lg transition"
            >
              {rollLabel}
            </button>
            <p className="text-[11px] text-slate-400 flex-1 min-w-[12rem]">
              {phase === 'settled' && myTurn
                ? 'Click a die to keep it, roll again, or fill a highlighted box.'
                : phase === 'rolling'
                  ? 'Dice are tumbling in the tray.'
                  : myTurn
                    ? 'Three rolls per turn. Dice you keep stay on the front rail.'
                    : `${bot.name} is rolling.`}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/35 p-2.5">
            {log.map((line, i) => (
              <p key={i} className={`text-[11px] leading-relaxed ${i === 0 ? 'text-slate-200' : 'text-slate-500'}`}>
                {line}
              </p>
            ))}
          </div>
        </div>

        {/* scorecard */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#2a1416] to-[#17100f] p-3">
          <div className="flex items-center justify-between px-1 pb-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Scorecard</p>
            <div className="flex gap-2 text-[9px] uppercase tracking-wider font-bold">
              <span className="text-amber-200">You</span>
              <span className="text-slate-500">Bot</span>
            </div>
          </div>

          <div className="space-y-1">
            {UPPER.map(u => row(u.id, u.label, `Count the ${u.face}s`))}
          </div>

          <div className="mt-2 flex items-center justify-between rounded-lg bg-black/40 px-2.5 py-1.5">
            <span className="text-[11px] font-bold text-slate-300">
              Upper bonus{' '}
              <span className="text-slate-500 font-normal">
                ({upperSub}/{UPPER_BONUS_THRESHOLD} → {UPPER_BONUS})
              </span>
            </span>
            <span className={`font-mono text-sm ${upperBonus(me.card) ? 'text-emerald-300' : 'text-slate-600'}`}>
              {upperBonus(me.card)}
            </span>
          </div>

          <div className="space-y-1 mt-2">
            {LOWER.map(l => row(l.id, l.label, l.detail))}
          </div>

          {me.yahtzeeBonuses > 0 && (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-400/30 px-2.5 py-1.5">
              <span className="text-[11px] font-bold text-emerald-200">
                Yahtzee bonus × {me.yahtzeeBonuses}
              </span>
              <span className="font-mono text-sm text-emerald-300">{me.yahtzeeBonuses * YAHTZEE_BONUS}</span>
            </div>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 px-1">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-300">Lower section</span>
            <span className="font-mono text-sm text-slate-300">{lowerSubtotal(me.card)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between px-1">
            <span className="text-xs uppercase tracking-wider font-black text-amber-200">Grand total</span>
            <span className="font-mono text-xl text-amber-200">{grandTotal(me)}</span>
          </div>
        </div>
      </div>

      {phase === 'over' && (
        <div className="mx-4 mb-4 rounded-2xl border border-amber-300/40 bg-amber-950/50 p-4">
          <p className="font-display text-2xl">
            {grandTotal(me) > grandTotal(bot)
              ? 'You take the card.'
              : grandTotal(me) === grandTotal(bot)
                ? 'Dead tie.'
                : `${bot.name} takes it.`}
          </p>
          <p className="text-sm text-amber-100/80 mt-1">
            {me.name} {grandTotal(me)} · {bot.name} {grandTotal(bot)}
          </p>
          <button
            type="button"
            onClick={onBackToShelf}
            className="mt-3 rounded-xl bg-amber-400 text-black px-4 py-2 text-xs font-black uppercase tracking-wider hover:brightness-110"
          >
            Pack up &amp; return
          </button>
        </div>
      )}
    </div>
  );
}

export { scoreFor as scoreYahtzee };
