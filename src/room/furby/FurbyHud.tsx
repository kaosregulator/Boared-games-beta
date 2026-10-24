import React, { useEffect, useState } from 'react';
import { onBubble, type Bubble } from './furbyBrain';
import { furbyGesture, type Gesture } from './furbyStore';

/**
 * What the Furby says, in Furbish with the English underneath, the way the
 * 1998 dictionary in the box translated it.
 */
export function FurbyBubble() {
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => onBubble(setBubble), []);
  useEffect(() => {
    if (!bubble) return;
    setShown(true);
    const id = window.setTimeout(() => setShown(false), 3600);
    return () => window.clearTimeout(id);
  }, [bubble]);
  if (!bubble) return null;
  return (
    <div
      data-furby-bubble
      className="pointer-events-none absolute left-1/2 top-[14%] z-40 -translate-x-1/2 transition-all duration-300"
      style={{ opacity: shown ? 1 : 0, transform: `translate(-50%, ${shown ? 0 : -8}px)` }}
    >
      <div className="relative max-w-[min(86vw,420px)] rounded-[22px] border-2 border-[#3b2a55] bg-[#fff6e0] px-5 py-3 text-center shadow-[4px_5px_0_#3b2a55]">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#9b5fb5]">{bubble.who}</p>
        <p className="text-lg font-black leading-tight text-[#2a1d3d]">{bubble.furbish}</p>
        <p className="text-[12px] italic text-[#6b5a7d]">“{bubble.english}”</p>
        <span className="absolute -bottom-[11px] left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#3b2a55] bg-[#fff6e0]" />
      </div>
    </div>
  );
}

const MOVES: { g: Gesture; label: string; key: string; tip: string }[] = [
  { g: 'pet', label: 'Pet', key: 'P', tip: 'Stroke its head' },
  { g: 'tickle', label: 'Tickle', key: 'T', tip: 'Poke its tummy' },
  { g: 'feed', label: 'Feed', key: 'F', tip: 'Finger in its beak' },
  { g: 'hug', label: 'Hug', key: 'H', tip: 'Squeeze' },
  { g: 'flip', label: 'Upside down', key: 'U', tip: 'Turn it over' },
  { g: 'shake', label: 'Shake', key: 'S', tip: 'Give it a shake' },
  { g: 'sing', label: 'Sing', key: 'M', tip: 'Ask for a song' },
  { g: 'bedtime', label: 'Night night', key: 'N', tip: 'Rock it to sleep (or wake it)' },
];

/** The buttons for the Furby in your hands, with keys for each. */
export function FurbyHoldHud({ asleep, onTable }: { asleep?: boolean; onTable?: () => void }) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey) return;
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        furbyGesture('putdown');
        return;
      }
      const move = MOVES.find(m => m.key === e.key.toUpperCase());
      if (move) furbyGesture(move.g);
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);
  return (
    <div data-furby-hud className="pointer-events-none absolute inset-0 z-40 text-white">
      <div className="pointer-events-auto absolute left-4 top-4 flex max-w-[calc(100vw-2rem)] flex-wrap gap-2">
        <button
          type="button"
          onClick={() => furbyGesture('putdown')}
          className="min-h-11 rounded-xl bg-amber-400 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-black"
        >
          Put it down <span className="opacity-60">Esc</span>
        </button>
        {onTable && (
          <button
            type="button"
            data-furby-table="open"
            onClick={onTable}
            className="min-h-11 rounded-xl border border-fuchsia-300/50 bg-[#7b1f78]/85 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-amber-100"
          >
            Open the new ones at the table
          </button>
        )}
      </div>
      <div className="pointer-events-auto absolute bottom-4 left-1/2 flex w-[min(96vw,720px)] -translate-x-1/2 flex-wrap justify-center gap-1.5">
        {MOVES.map(m => (
          <button
            key={m.g}
            type="button"
            title={m.tip}
            onClick={() => furbyGesture(m.g)}
            className="rounded-xl border border-white/25 bg-black/60 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-50 backdrop-blur-sm hover:bg-[#6b3f8c]/80"
          >
            {m.g === 'bedtime' && asleep ? 'Wake up' : m.label} <span className="text-white/45">{m.key}</span>
          </button>
        ))}
      </div>
      <p className="absolute bottom-[4.25rem] left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-white/60 max-sm:bottom-[6.5rem]">
        Or touch it: head to pet, tummy to tickle, beak to feed
      </p>
    </div>
  );
}
