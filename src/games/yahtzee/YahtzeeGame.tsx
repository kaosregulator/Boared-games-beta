import React, { useMemo, useState } from 'react';
import { sound } from '../../utils/audio';

type Cat =
  | 'ones' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes'
  | 'three' | 'four' | 'full' | 'small' | 'large' | 'yahtzee' | 'chance';

const CATS: { id: Cat; label: string }[] = [
  { id: 'ones', label: 'Aces' },
  { id: 'twos', label: 'Twos' },
  { id: 'threes', label: 'Threes' },
  { id: 'fours', label: 'Fours' },
  { id: 'fives', label: 'Fives' },
  { id: 'sixes', label: 'Sixes' },
  { id: 'three', label: '3 of a kind' },
  { id: 'four', label: '4 of a kind' },
  { id: 'full', label: 'Full house' },
  { id: 'small', label: 'Small straight' },
  { id: 'large', label: 'Large straight' },
  { id: 'yahtzee', label: 'Yahtzee' },
  { id: 'chance', label: 'Chance' },
];

function tally(dice: number[]) {
  const c = [0, 0, 0, 0, 0, 0, 0];
  dice.forEach(d => { c[d] += 1; });
  return c;
}

export function scoreYahtzee(cat: Cat, dice: number[]) {
  const c = tally(dice);
  const sum = dice.reduce((a, b) => a + b, 0);
  const face: Partial<Record<Cat, number>> = { ones: 1, twos: 2, threes: 3, fours: 4, fives: 5, sixes: 6 };
  if (face[cat]) return c[face[cat]!] * face[cat]!;
  if (cat === 'three') return c.some(n => n >= 3) ? sum : 0;
  if (cat === 'four') return c.some(n => n >= 4) ? sum : 0;
  if (cat === 'full') return c.includes(3) && c.includes(2) ? 25 : 0;
  if (cat === 'small' || cat === 'large') {
    const present = [1, 2, 3, 4, 5, 6].map(n => (c[n] > 0 ? '1' : '0')).join('');
    if (cat === 'large') return present.includes('11111') ? 40 : 0;
    return /1111/.test(present) ? 30 : 0;
  }
  if (cat === 'yahtzee') return c.some(n => n === 5) ? 50 : 0;
  return sum;
}

function rollDie() {
  return 1 + Math.floor(Math.random() * 6);
}

export function YahtzeeGame({ onBackToShelf }: { onBackToShelf: () => void }) {
  const [dice, setDice] = useState<number[]>([1, 1, 1, 1, 1]);
  const [held, setHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [rollsLeft, setRollsLeft] = useState(3);
  const [scores, setScores] = useState<Partial<Record<Cat, number>>>({});
  const [started, setStarted] = useState(false);

  const total = useMemo(() => Object.values(scores).reduce((a, b) => a + (b ?? 0), 0), [scores]);
  const done = CATS.every(c => scores[c.id] !== undefined);

  const roll = () => {
    if (rollsLeft <= 0 || done) return;
    sound.playButtonClick();
    setDice(prev => prev.map((d, i) => (held[i] && started ? d : rollDie())));
    setRollsLeft(n => n - 1);
    setStarted(true);
  };

  const take = (cat: Cat) => {
    if (!started || scores[cat] !== undefined || done) return;
    sound.playButtonClick();
    setScores(prev => ({ ...prev, [cat]: scoreYahtzee(cat, dice) }));
    setHeld([false, false, false, false, false]);
    setRollsLeft(3);
    setStarted(false);
  };

  return (
    <div className="w-full text-white p-4">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-red-300 font-bold">On the table</p>
          <h2 className="font-display text-3xl">Yahtzee</h2>
        </div>
        <p className="font-mono text-amber-200 text-lg">{total} pts</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {dice.map((d, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setHeld(prev => prev.map((h, idx) => (idx === i ? !h : h)))}
            className={`w-14 h-14 rounded-xl text-2xl font-black ${held[i] ? 'bg-amber-300 text-black' : 'bg-white text-red-900'}`}
          >
            {d}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={roll}
        disabled={rollsLeft <= 0 || done}
        className="rounded-xl bg-red-600 disabled:opacity-40 px-4 py-2 text-xs font-black uppercase tracking-wider"
      >
        {started ? `Roll again (${rollsLeft})` : `Roll (${rollsLeft})`}
      </button>
      <p className="text-[11px] text-slate-400 mt-2">Hold a die to keep it. Score one open box after you roll.</p>

      <div className="grid sm:grid-cols-2 gap-2 mt-4">
        {CATS.map(cat => {
          const taken = scores[cat.id];
          const preview = started && taken === undefined ? scoreYahtzee(cat.id, dice) : null;
          return (
            <button
              key={cat.id}
              type="button"
              disabled={!started || taken !== undefined}
              onClick={() => take(cat.id)}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm disabled:opacity-70"
            >
              <span>{cat.label}</span>
              <span className="font-mono">{taken !== undefined ? taken : preview !== null ? preview : '—'}</span>
            </button>
          );
        })}
      </div>

      {done && (
        <div className="mt-4 rounded-2xl border border-amber-300/40 bg-amber-950/40 p-4">
          <p className="font-bold">Card full. {total} points.</p>
          <button type="button" onClick={onBackToShelf} className="mt-3 rounded-xl bg-amber-400 text-black px-4 py-2 text-xs font-black uppercase">
            Pack up & return
          </button>
        </div>
      )}
    </div>
  );
}
