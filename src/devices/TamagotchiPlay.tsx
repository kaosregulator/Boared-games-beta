import React, { useEffect, useRef } from 'react';
import { useViewport } from './viewRig';

type PadKey = 'A' | 'B' | 'C';

/** The game reads these keys on its own window (see dammagotchi device.js). */
const KEY: Record<PadKey, string> = { A: 'Tab', B: 'Enter', C: 'Backspace' };
const ROLE: Record<PadKey, string> = { A: 'Select', B: 'OK', C: 'Back' };

/**
 * Dammagotchi (github.com/dammafra/dammagotchi, AGPL-3.0) built as-is into
 * /tamagotchi. It is its own little three.js world with the full life cycle,
 * so playing it means holding it up close: the room dims behind it.
 * The pet's life is saved in this browser by the game itself.
 *
 * The toy's own buttons are tiny on a phone, so three big ones sit beside
 * the picture (under it in portrait, down the side in landscape) and press
 * the same keys the game listens for. On a computer the keys work without
 * clicking into the game first.
 */
export function TamagotchiPlay({ onClose }: { onClose: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const vp = useViewport();
  // A phone (either way up) plays edge to edge; a big screen gets the framed window.
  const phone = Math.min(vp.w, vp.h) < 560;
  const landscape = phone && vp.w > vp.h;

  const press = (k: PadKey) => {
    const win = frame.current?.contentWindow as (Window & typeof globalThis) | null | undefined;
    if (!win) return;
    try {
      win.dispatchEvent(new win.KeyboardEvent('keydown', { key: KEY[k], bubbles: true, cancelable: true }));
    } catch {
      // Still loading.
    }
    navigator.vibrate?.(8);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return onClose();
      const k = (Object.keys(KEY) as PadKey[]).find(p => KEY[p] === e.key || (p === 'B' && e.key === ' '));
      if (!k) return;
      e.preventDefault();
      press(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const pad = (
    <div className={`flex shrink-0 items-center justify-center ${landscape ? 'flex-col gap-3' : 'gap-5'}`}>
      {(['A', 'B', 'C'] as PadKey[]).map(k => (
        <button
          key={k}
          type="button"
          onPointerDown={e => {
            e.preventDefault();
            press(k);
          }}
          onContextMenu={e => e.preventDefault()}
          className="flex select-none flex-col items-center gap-1 [touch-action:manipulation]"
          aria-label={`${k} button (${ROLE[k]})`}
        >
          <span className={`flex items-center justify-center rounded-full border-2 border-white/25 bg-gradient-to-b from-[#f4d35e] to-[#d19a1c] font-display text-[#3a2600] shadow-[inset_0_-4px_0_rgba(0,0,0,0.25),0_6px_14px_rgba(0,0,0,0.45)] active:translate-y-0.5 active:shadow-[inset_0_-1px_0_rgba(0,0,0,0.25)] ${phone ? 'size-16 text-2xl' : 'size-14 text-xl'}`}>
            {k}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/60">{ROLE[k]}</span>
        </button>
      ))}
    </div>
  );

  const putDown = (
    <button
      type="button"
      onClick={onClose}
      className="rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white hover:bg-black/80"
    >
      Put it down
    </button>
  );

  const credit = (
    <p className="text-center text-[9px] text-white/40">
      Dammagotchi by dammafra · AGPL-3.0 ·{' '}
      <a className="underline" href="https://github.com/dammafra/dammagotchi" target="_blank" rel="noreferrer">
        source
      </a>{' '}
      ·{' '}
      <a className="underline" href="/tamagotchi/CHANGES.patch" target="_blank" rel="noreferrer">
        changes
      </a>
    </p>
  );

  const game = (
    <div
      className={`relative min-h-0 min-w-0 flex-1 overflow-hidden ${phone ? '' : 'mx-auto w-[min(100%-1.5rem,64rem)] rounded-3xl border border-white/15 shadow-2xl'}`}
    >
      <iframe
        ref={frame}
        title="Dammagotchi"
        src="/tamagotchi/index.html"
        allow="autoplay; fullscreen"
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  );

  if (landscape) {
    return (
      <div data-ui="tamagotchi" className="absolute inset-0 z-50 flex bg-black/80 pl-[env(safe-area-inset-left)]">
        {game}
        <div className="flex w-36 shrink-0 flex-col items-center justify-between py-[max(0.6rem,env(safe-area-inset-top))] pr-[env(safe-area-inset-right)]">
          {putDown}
          {pad}
          {credit}
        </div>
      </div>
    );
  }

  return (
    <div data-ui="tamagotchi" className={`absolute inset-0 z-50 flex flex-col ${phone ? 'bg-black/85' : 'bg-black/70 backdrop-blur-sm'}`}>
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-[max(0.6rem,env(safe-area-inset-top))]">
        <p className="font-display text-lg text-white">Tamagotchi</p>
        {putDown}
      </div>
      {game}
      <div className="shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3">
        {pad}
        <div className="mt-2">{credit}</div>
      </div>
    </div>
  );
}
