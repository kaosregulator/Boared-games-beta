import React, { useState } from 'react';
import { sound } from '../../utils/audio';

const TRACK = [
  { name: 'Start', cash: 0 },
  { name: 'Payday', cash: 200 },
  { name: 'Tax', cash: -100 },
  { name: 'Career', cash: 300 },
  { name: 'Baby', cash: 0 },
  { name: 'Payday', cash: 200 },
  { name: 'House', cash: -150 },
  { name: 'Payday', cash: 200 },
  { name: 'Spin to win', cash: 250 },
  { name: 'Tax', cash: -100 },
  { name: 'Retirement', cash: 0 },
];

export function LifeGame({ onBackToShelf }: { onBackToShelf: () => void }) {
  const [you, setYou] = useState(0);
  const [rival, setRival] = useState(0);
  const [cash, setCash] = useState(1000);
  const [rivalCash, setRivalCash] = useState(1000);
  const [spin, setSpin] = useState<number | null>(null);
  const [log, setLog] = useState('Spin to move along the track.');
  const over = you >= TRACK.length - 1 && rival >= TRACK.length - 1;

  const takeTurn = () => {
    if (over) return;
    sound.playButtonClick();
    const roll = 1 + Math.floor(Math.random() * 6);
    const next = Math.min(TRACK.length - 1, you + roll);
    const space = TRACK[next];
    const rivalRoll = 1 + Math.floor(Math.random() * 6);
    const rivalNext = Math.min(TRACK.length - 1, rival + rivalRoll);
    setSpin(roll);
    setYou(next);
    setRival(rivalNext);
    setCash(c => c + space.cash);
    setRivalCash(c => c + TRACK[rivalNext].cash);
    setLog(`You spun ${roll} and landed on ${space.name} (${space.cash >= 0 ? '+' : ''}${space.cash}). Rival spun ${rivalRoll}.`);
  };

  const winner = cash === rivalCash ? 'Tie at retirement.' : cash > rivalCash ? 'You retire ahead.' : 'Rival retires ahead.';

  return (
    <div className="w-full text-white p-4">
      <p className="text-[10px] uppercase tracking-[0.25em] text-lime-300 font-bold">On the table</p>
      <h2 className="font-display text-3xl mb-2">The Game of Life</h2>
      <p className="text-sm text-slate-300">You ${cash} · space {you} · Rival ${rivalCash} · space {rival}</p>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 my-4">
        {TRACK.map((space, i) => (
          <div
            key={space.name + i}
            className={`rounded-xl border px-2 py-3 text-[11px] ${i === you ? 'border-lime-300 bg-lime-900/50' : 'border-white/10 bg-black/30'} ${i === rival ? 'ring-1 ring-orange-300' : ''}`}
          >
            {space.name}
          </div>
        ))}
      </div>
      <button type="button" onClick={takeTurn} disabled={over} className="rounded-xl bg-lime-500 text-black px-4 py-2 text-xs font-black uppercase disabled:opacity-40">
        {spin ? `Spin again (last ${spin})` : 'Spin'}
      </button>
      <p className="text-sm mt-3 text-slate-200">{log}</p>
      {over && (
        <div className="mt-4 rounded-2xl border border-lime-300/40 bg-lime-950/40 p-4">
          <p>{winner}</p>
          <button type="button" onClick={onBackToShelf} className="mt-3 rounded-xl bg-amber-400 text-black px-4 py-2 text-xs font-black uppercase">
            Pack up & return
          </button>
        </div>
      )}
    </div>
  );
}
