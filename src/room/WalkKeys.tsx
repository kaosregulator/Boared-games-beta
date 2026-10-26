import React, { useEffect, useState } from 'react';

const CHIPS: [string, string][] = [
  ['W A S D', 'walk'],
  ['Arrows · drag', 'look'],
  ['Click', 'use'],
  ['C', 'duck'],
  ['+ −', 'zoom'],
];

/**
 * A short control strip while you are learning the room. It steps aside once
 * you walk or look, and a Keys button brings it back. The full list lives in
 * the room menu.
 */
export function WalkKeys() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const hide = () => setOpen(false);
    const timer = window.setTimeout(hide, 8000);
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (
        event.code === 'KeyW' ||
        event.code === 'KeyA' ||
        event.code === 'KeyS' ||
        event.code === 'KeyD' ||
        event.code.startsWith('Arrow')
      ) {
        hide();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto absolute bottom-4 left-1/2 z-30 min-h-11 -translate-x-1/2 rounded-full border border-white/15 bg-black/55 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200"
      >
        Keys
      </button>
    );
  }

  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 flex w-[calc(100%-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2">
      {CHIPS.map(([key, what]) => (
        <span key={key} className="rounded-lg border border-white/10 bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
          <span className="text-amber-200">{key}</span> {what}
        </span>
      ))}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="pointer-events-auto min-h-11 rounded-lg border border-white/15 bg-black/55 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70"
      >
        Hide
      </button>
    </div>
  );
}
