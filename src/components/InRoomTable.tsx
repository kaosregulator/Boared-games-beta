import type { ReactNode } from 'react';
import { GameMetadata } from '../types';

export function InRoomTable({
  game,
  onPackUp,
  children,
}: {
  game: GameMetadata;
  onPackUp: () => void;
  children: ReactNode;
}) {
  if (game.id === 'trivia') {
    return (
      // The bedroom stays up. Throwback is a stack of cards, not a second room.
      <div className="pointer-events-none fixed inset-0 z-40 text-white">
        <div className="pointer-events-auto absolute inset-x-2 bottom-2 top-14 flex flex-col sm:inset-x-auto sm:right-5 sm:top-16 sm:bottom-5 sm:w-[min(36rem,calc(100vw-2.5rem))]">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.28em] text-amber-200 font-bold">Still in the room</p>
              <h1 className="font-display text-2xl truncate">{game.title}</h1>
            </div>
            <button
              type="button"
              onClick={onPackUp}
              className="shrink-0 rounded-2xl bg-amber-400 text-black px-4 py-2 text-xs font-black uppercase tracking-wider"
            >
              Pack up
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-3xl border border-amber-100/20 bg-[#1a1024]/80 shadow-2xl backdrop-blur-xl">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    // See-through: the live room, with the unfolded box on the card table, stays behind the board.
    <div className="fixed inset-0 z-40 text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/70" />
      <div className="relative z-10 h-full flex flex-col">
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-amber-200 font-bold">Playing in the room</p>
            <h1 className="font-display text-2xl">{game.title}</h1>
          </div>
          <button
            type="button"
            onClick={onPackUp}
            className="rounded-2xl bg-amber-400 text-black px-4 py-2 text-xs font-black uppercase tracking-wider"
          >
            Pack up
          </button>
        </header>
        <div className="flex-1 overflow-auto px-3 pb-6">
          <div className="mx-auto max-w-5xl rounded-3xl border border-white/15 bg-[#120c18]/90 shadow-2xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
