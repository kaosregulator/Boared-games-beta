import type { ReactNode } from 'react';
import { RoomBackdrop } from '../room/RoomBackdrop';
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
  return (
    <div className="fixed inset-0 z-40 bg-black text-white">
      <div className="absolute inset-0">
        <RoomBackdrop />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/40 to-black/75" />
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
            Pack up & return
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
