import React from 'react';
import { pressTv, useTvStatus } from './tvBus';
import type { TvCommand } from './TvScreen';

type Key = TvCommand['key'];

function Btn({ k, label, className = '' }: { k: Key; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        pressTv(k);
        navigator.vibrate?.(6);
      }}
      className={`pointer-events-auto flex items-center justify-center rounded-xl border border-white/15 bg-[#1b1b20] text-[11px] font-bold tracking-wider text-white/85 shadow-[inset_0_-2px_0_rgba(0,0,0,0.5)] active:translate-y-px active:bg-[#2a2a31] ${className}`}
    >
      {label}
    </button>
  );
}

/**
 * The clicker, for touch screens where the buttons on the TV's bezel are
 * too small for a thumb. It sends the same presses as the bezel and the
 * cable box.
 */
export function TvRemote() {
  const status = useTvStatus();
  if (status.mode === 'emulator') {
    return (
      <div className="pointer-events-none absolute right-3 top-16 z-50">
        <Btn k="back" label="◀ LEAVE GAME" className="px-3 py-2" />
      </div>
    );
  }
  return (
    <div
      data-ui="remote"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="pointer-events-auto grid w-full max-w-sm grid-cols-4 gap-1.5 rounded-[22px] border border-white/10 bg-[#0d0d10]/90 p-2.5 shadow-2xl backdrop-blur">
        <Btn k="power" label="⏻ POWER" className="col-span-2 h-10 !text-red-300" />
        <Btn k="menu" label="MENU" className="h-10" />
        <Btn k="guide" label="GUIDE" className="h-10" />
        <Btn k="chUp" label="CH ▲" className="h-11" />
        <Btn k="volUp" label="VOL +" className="h-11" />
        <Btn k="ok" label="OK" className="col-span-2 row-span-2 !rounded-full !bg-[#2b2533] text-base" />
        <Btn k="chDown" label="CH ▼" className="h-11" />
        <Btn k="volDown" label="VOL −" className="h-11" />
        <Btn k="game" label="▶ PLAY NES" className="col-span-2 h-10 !text-amber-200" />
        <Btn k="back" label="BACK" className="col-span-2 h-10" />
      </div>
    </div>
  );
}
