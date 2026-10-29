import React, { useEffect, useState } from 'react';
import catalog from '../rewards/catalog.json';
import { onAwards } from '../net/roomApi';
import { sound } from '../utils/audio';

interface Shown {
  id: number;
  emoji: string;
  name: string;
  rarity: string;
  color: string;
}

const byKey = new Map(catalog.roles.map(r => [r.key, r]));
const RARITY = catalog.rarityColors as Record<string, string>;
let next = 1;

/** "Role unlocked" cards, one per newly earned role, bottom-centre for a few seconds. */
export function AwardToast() {
  const [shown, setShown] = useState<Shown[]>([]);

  useEffect(
    () =>
      onAwards(keys => {
        const fresh = keys
          .map(k => byKey.get(k))
          .filter((r): r is NonNullable<typeof r> => Boolean(r))
          .map(r => ({ id: next++, emoji: r.emoji, name: r.name, rarity: r.rarity, color: ('color' in r && r.color) || RARITY[r.rarity] || '#fff' }));
        if (!fresh.length) return;
        sound.playVictoryFanfare();
        setShown(s => [...s, ...fresh].slice(-3));
        for (const f of fresh) window.setTimeout(() => setShown(s => s.filter(x => x.id !== f.id)), 5200);
      }),
    [],
  );

  if (!shown.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {shown.map(s => (
        <div
          key={s.id}
          className="flex max-w-sm items-center gap-3 rounded-2xl border bg-[#140c14]/85 px-4 py-2.5 text-white shadow-2xl backdrop-blur-xl"
          style={{ borderColor: `${s.color}99` }}
        >
          <span className="text-2xl" aria-hidden>
            {s.emoji}
          </span>
          <span className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: s.color }}>
              Role unlocked · {s.rarity}
            </span>
            <span className="text-sm font-black">{s.name}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
