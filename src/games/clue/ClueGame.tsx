import React, { useMemo, useState } from 'react';
import { sound } from '../../utils/audio';

const PEOPLE = ['Scarlet', 'Mustard', 'Green', 'Plum'];
const WEAPONS = ['Candlestick', 'Knife', 'Pipe', 'Wrench'];
const ROOMS = ['Kitchen', 'Hall', 'Lounge', 'Study'];

type Card = { kind: 'person' | 'weapon' | 'room'; name: string };

function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

function buildCase() {
  const secret: Card[] = [
    { kind: 'person', name: pick(PEOPLE) },
    { kind: 'weapon', name: pick(WEAPONS) },
    { kind: 'room', name: pick(ROOMS) },
  ];
  const deck: Card[] = [
    ...PEOPLE.map(name => ({ kind: 'person' as const, name })),
    ...WEAPONS.map(name => ({ kind: 'weapon' as const, name })),
    ...ROOMS.map(name => ({ kind: 'room' as const, name })),
  ].filter(card => !secret.some(s => s.kind === card.kind && s.name === card.name));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return { secret, hand: deck.slice(0, 4), ai: deck.slice(4) };
}

export function ClueGame({ onBackToShelf }: { onBackToShelf: () => void }) {
  const deal = useMemo(() => buildCase(), []);
  const [person, setPerson] = useState(PEOPLE[0]);
  const [weapon, setWeapon] = useState(WEAPONS[0]);
  const [room, setRoom] = useState(ROOMS[0]);
  const [log, setLog] = useState<string[]>(['The case is set. Suggest a person, weapon, and room.']);
  const [over, setOver] = useState<string | null>(null);

  const suggest = () => {
    if (over) return;
    sound.playButtonClick();
    const shown = deal.ai.find(c => c.name === person || c.name === weapon || c.name === room);
    if (shown) {
      setLog(prev => [`Shown: ${shown.name}. That card is not in the envelope.`, ...prev]);
    } else {
      setLog(prev => ['No card shown. The envelope might match this suggestion.', ...prev]);
    }
  };

  const accuse = () => {
    if (over) return;
    sound.playButtonClick();
    const hit =
      deal.secret[0].name === person && deal.secret[1].name === weapon && deal.secret[2].name === room;
    if (hit) setOver(`Correct. ${person} with the ${weapon} in the ${room}.`);
    else setOver(`Wrong accusation. It was ${deal.secret[0].name}, ${deal.secret[1].name}, ${deal.secret[2].name}.`);
  };

  return (
    <div className="w-full text-white p-4">
      <p className="text-[10px] uppercase tracking-[0.25em] text-emerald-300 font-bold">On the table</p>
      <h2 className="font-display text-3xl mb-2">Clue</h2>
      <p className="text-sm text-slate-300 mb-3">Your cards: {deal.hand.map(c => c.name).join(', ')}</p>
      <div className="grid sm:grid-cols-3 gap-2">
        <select className="bg-black/50 border border-white/15 rounded-xl px-3 py-2" value={person} onChange={e => setPerson(e.target.value)}>
          {PEOPLE.map(p => <option key={p}>{p}</option>)}
        </select>
        <select className="bg-black/50 border border-white/15 rounded-xl px-3 py-2" value={weapon} onChange={e => setWeapon(e.target.value)}>
          {WEAPONS.map(p => <option key={p}>{p}</option>)}
        </select>
        <select className="bg-black/50 border border-white/15 rounded-xl px-3 py-2" value={room} onChange={e => setRoom(e.target.value)}>
          {ROOMS.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>
      <div className="flex gap-2 mt-3">
        <button type="button" onClick={suggest} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase">Suggest</button>
        <button type="button" onClick={accuse} className="rounded-xl bg-amber-500 text-black px-4 py-2 text-xs font-black uppercase">Accuse</button>
      </div>
      <ul className="mt-4 space-y-1 text-sm text-slate-200 max-h-40 overflow-auto">
        {log.map((line, i) => <li key={i}>{line}</li>)}
      </ul>
      {over && (
        <div className="mt-4 rounded-2xl border border-emerald-300/40 bg-emerald-950/40 p-4">
          <p>{over}</p>
          <button type="button" onClick={onBackToShelf} className="mt-3 rounded-xl bg-amber-400 text-black px-4 py-2 text-xs font-black uppercase">
            Pack up & return
          </button>
        </div>
      )}
    </div>
  );
}
