import React, { useRef } from 'react';
import { PAD } from './cartridges';
import { sendPad } from './gameboyBus';

type PadKey = keyof typeof PAD;

function Key({
  k,
  label,
  className,
}: {
  k: PadKey;
  label: string;
  className: string;
}) {
  const held = useRef(false);
  const press = (on: boolean) => {
    if (held.current === on) return;
    held.current = on;
    sendPad(PAD[k], on);
    if (on) navigator.vibrate?.(8);
  };
  return (
    <button
      type="button"
      aria-label={label}
      className={`pointer-events-auto touch-none select-none active:brightness-150 ${className}`}
      onPointerDown={e => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        press(true);
      }}
      onPointerUp={() => press(false)}
      onPointerCancel={() => press(false)}
      onLostPointerCapture={() => press(false)}
      onContextMenu={e => e.preventDefault()}
    >
      {label}
    </button>
  );
}

/**
 * Thumb pad for phones and tablets, for whichever emulator is on: the Game
 * Boy in your hands or the NES on the TV.
 */
export function TouchGamepad({ tone = 'gb' }: { tone?: 'gb' | 'nes' }) {
  const ab =
    tone === 'gb'
      ? 'bg-[#9b1b4b] text-white/90 border-[#5e0d2c]'
      : 'bg-[#c4161c] text-white/90 border-[#7a0d10]';
  const dpadKey = 'absolute h-12 w-12 rounded-md border border-black/60 bg-[#1d1d22]/90 text-white/70 text-lg';
  return (
    <div data-ui="gamepad" className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex items-end justify-between px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="relative h-36 w-36">
        <Key k="UP" label="▲" className={`${dpadKey} left-12 top-0`} />
        <Key k="DOWN" label="▼" className={`${dpadKey} left-12 bottom-0`} />
        <Key k="LEFT" label="◀" className={`${dpadKey} left-0 top-12`} />
        <Key k="RIGHT" label="▶" className={`${dpadKey} right-0 top-12`} />
      </div>
      <div className="mb-1 flex gap-3">
        <Key k="SELECT" label="SELECT" className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[9px] font-bold tracking-widest text-white/75" />
        <Key k="START" label="START" className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[9px] font-bold tracking-widest text-white/75" />
      </div>
      <div className="relative h-36 w-36">
        <Key k="B" label="B" className={`absolute bottom-3 left-0 h-16 w-16 rounded-full border-2 font-display text-xl ${ab}`} />
        <Key k="A" label="A" className={`absolute right-0 top-3 h-16 w-16 rounded-full border-2 font-display text-xl ${ab}`} />
      </div>
    </div>
  );
}
