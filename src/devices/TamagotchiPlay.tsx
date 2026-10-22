import React from 'react';

/**
 * Dammagotchi (github.com/dammafra/dammagotchi, AGPL-3.0) built as-is into
 * /tamagotchi. It is its own little three.js world with the full life cycle,
 * so playing it means holding it up close: the room dims behind it.
 * The pet's life is saved in this browser by the game itself.
 */
export function TamagotchiPlay({ onClose }: { onClose: () => void }) {
  return (
    <div data-ui="tamagotchi" className="absolute inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="font-display text-lg text-white">Tamagotchi</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white hover:bg-black/80"
        >
          Put it down
        </button>
      </div>
      <div className="relative mx-auto mb-[max(0.75rem,env(safe-area-inset-bottom))] w-[min(100%-1.5rem,64rem)] flex-1 overflow-hidden rounded-3xl border border-white/15 shadow-2xl">
        <iframe
          title="Dammagotchi"
          src="/tamagotchi/index.html"
          allow="autoplay; fullscreen"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <p className="pb-2 text-center text-[9px] text-white/40">
        Dammagotchi by dammafra · AGPL-3.0 ·{' '}
        <a className="underline" href="https://github.com/dammafra/dammagotchi" target="_blank" rel="noreferrer">
          source
        </a>
      </p>
    </div>
  );
}
