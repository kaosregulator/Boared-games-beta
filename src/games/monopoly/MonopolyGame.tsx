import React, { useState } from 'react';
import { sound } from '../../utils/audio';

type Space =
  | { kind: 'go' }
  | { kind: 'tax'; name: string; cost: number }
  | { kind: 'chest'; name: string }
  | { kind: 'deed'; name: string; price: number; rent: number };

const BOARD: Space[] = [
  { kind: 'go' },
  { kind: 'deed', name: 'Mediterranean', price: 60, rent: 10 },
  { kind: 'chest', name: 'Community Chest' },
  { kind: 'deed', name: 'Baltic', price: 80, rent: 16 },
  { kind: 'tax', name: 'Income Tax', cost: 100 },
  { kind: 'deed', name: 'Reading Railroad', price: 200, rent: 25 },
  { kind: 'deed', name: 'Vermont', price: 120, rent: 20 },
  { kind: 'deed', name: 'Boardwalk', price: 400, rent: 50 },
];

export function MonopolyGame({ onBackToShelf }: { onBackToShelf: () => void }) {
  const [pos, setPos] = useState(0);
  const [ai, setAi] = useState(4);
  const [cash, setCash] = useState(1500);
  const [aiCash, setAiCash] = useState(1500);
  const [owner, setOwner] = useState<Array<'you' | 'ai' | null>>(BOARD.map(() => null));
  const [log, setLog] = useState('Roll. Buy unowned deeds. Pay rent when you land on a rival.');
  const [over, setOver] = useState<string | null>(null);

  const land = (who: 'you' | 'ai', index: number, money: number, owners: Array<'you' | 'ai' | null>) => {
    const space = BOARD[index];
    let next = money;
    const owned = owners.slice();
    let note = '';
    if (space.kind === 'go') note = 'landed on Go';
    if (space.kind === 'tax') {
      next -= space.cost;
      note = `paid ${space.name}`;
    }
    if (space.kind === 'chest') {
      const bonus = Math.random() > 0.5 ? 50 : -50;
      next += bonus;
      note = `chest ${bonus > 0 ? '+' : ''}${bonus}`;
    }
    if (space.kind === 'deed') {
      const holder = owned[index];
      if (!holder && next >= space.price) {
        owned[index] = who;
        next -= space.price;
        note = `bought ${space.name}`;
      } else if (holder && holder !== who) {
        next -= space.rent;
        note = `paid $${space.rent} rent on ${space.name}`;
        return { money: next, owners: owned, note, rentTo: holder, rent: space.rent };
      } else note = holder === who ? `own ${space.name}` : `passed on ${space.name}`;
    }
    return { money: next, owners: owned, note, rentTo: null as 'you' | 'ai' | null, rent: 0 };
  };

  const roll = () => {
    if (over) return;
    sound.playButtonClick();
    const die = 1 + Math.floor(Math.random() * 6);
    let nextPos = (pos + die) % BOARD.length;
    let nextCash = cash + (pos + die >= BOARD.length ? 200 : 0);
    const yours = land('you', nextPos, nextCash, owner);
    let owners = yours.owners;
    let yourCash = yours.money;
    let rivalCash = aiCash + (yours.rentTo === 'ai' ? yours.rent : 0);

    const aiDie = 1 + Math.floor(Math.random() * 6);
    const aiPos = (ai + aiDie) % BOARD.length;
    rivalCash += ai + aiDie >= BOARD.length ? 200 : 0;
    const theirs = land('ai', aiPos, rivalCash, owners);
    owners = theirs.owners;
    rivalCash = theirs.money;
    if (theirs.rentTo === 'you') yourCash += theirs.rent;

    setPos(nextPos);
    setAi(aiPos);
    setCash(yourCash);
    setAiCash(rivalCash);
    setOwner(owners);
    setLog(`You rolled ${die}. ${yours.note}. Rival rolled ${aiDie}. ${theirs.note}.`);
    if (yourCash < 0 || rivalCash < 0) {
      setOver(yourCash < 0 ? 'You are out of cash.' : 'Rival is out of cash. You take the board.');
    }
  };

  return (
    <div className="w-full text-white p-4">
      <p className="text-[10px] uppercase tracking-[0.25em] text-sky-300 font-bold">On the table</p>
      <h2 className="font-display text-3xl mb-2">Monopoly</h2>
      <p className="text-sm text-slate-300">You ${cash} on {BOARD[pos].kind === 'go' ? 'Go' : BOARD[pos].kind === 'deed' ? BOARD[pos].name : BOARD[pos].name} · Rival ${aiCash}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-4">
        {BOARD.map((space, i) => {
          const label = space.kind === 'go' ? 'Go' : space.name;
          return (
            <div key={label + i} className={`rounded-xl border px-2 py-3 text-xs ${i === pos ? 'border-sky-300 bg-sky-950/60' : 'border-white/10 bg-black/30'}`}>
              <div className="font-bold">{label}</div>
              <div className="text-slate-400">{owner[i] ? owner[i] : space.kind === 'deed' ? `$${space.price}` : ''}</div>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={roll} disabled={!!over} className="rounded-xl bg-sky-500 text-black px-4 py-2 text-xs font-black uppercase disabled:opacity-40">
        Roll
      </button>
      <p className="text-sm mt-3">{log}</p>
      {over && (
        <div className="mt-4 rounded-2xl border border-sky-300/40 bg-sky-950/40 p-4">
          <p>{over}</p>
          <button type="button" onClick={onBackToShelf} className="mt-3 rounded-xl bg-amber-400 text-black px-4 py-2 text-xs font-black uppercase">
            Pack up & return
          </button>
        </div>
      )}
    </div>
  );
}
