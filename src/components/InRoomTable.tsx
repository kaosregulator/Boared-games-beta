import type { ReactNode } from 'react';
import { GameMetadata } from '../types';
import { TriviaOnTableContext, useTriviaTableRect } from '../room/table/triviaTable';

export function InRoomTable({
  game,
  onPackUp,
  children,
}: {
  game: GameMetadata;
  onPackUp: () => void;
  children: ReactNode;
}) {
  const tableRect = useTriviaTableRect();
  if (game.id === 'trivia') {
    if (!tableRect) return null;
    // A thin rim of the real table stays visible around the board.
    const insetX = Math.round(tableRect.width * 0.03);
    const insetY = Math.round(tableRect.height * 0.035);
    return (
      <div className="pointer-events-none fixed inset-0 z-40 text-white">
        <div
          data-trivia-table
          className="pointer-events-auto absolute flex flex-col"
          style={{
            left: tableRect.left + insetX,
            top: tableRect.top + insetY,
            width: Math.max(120, tableRect.width - insetX * 2),
            height: Math.max(80, tableRect.height - insetY * 2),
          }}
        >
          {/* The box lid's tab: closes the game and puts it back on the shelf. */}
          <button
            type="button"
            onClick={onPackUp}
            className="absolute -top-3 right-5 z-10 rounded-md border-2 border-[#f1e3bf] bg-[#c0392b] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#fbf5e6] shadow-[0_4px_8px_rgba(0,0,0,0.5)] hover:bg-[#d64a3b]"
            aria-label={`Pack up ${game.title}`}
          >
            Pack up
          </button>
          <div className="min-h-0 flex-1">
            <TriviaOnTableContext.Provider value={true}>{children}</TriviaOnTableContext.Provider>
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
