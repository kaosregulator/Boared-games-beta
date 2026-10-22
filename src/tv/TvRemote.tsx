import React, { useEffect, useRef, useState } from 'react';
import { pressTv, useTvStatus } from './tvBus';
import type { TvCommand } from './TvScreen';
import { LAYOUT, resetView, useViewRig } from '../devices/viewRig';

type Key = TvCommand['key'];

function Btn({
  k,
  label,
  className = '',
  onPress,
}: {
  k?: Key;
  label: string;
  className?: string;
  onPress?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (k) pressTv(k);
        onPress?.();
        navigator.vibrate?.(6);
      }}
      className={`pointer-events-auto flex min-h-0 items-center justify-center rounded-xl border border-white/15 bg-[#1b1b20] text-[11px] font-bold tracking-wider text-white/85 shadow-[inset_0_-2px_0_rgba(0,0,0,0.5)] active:translate-y-px active:bg-[#2a2a31] ${className}`}
    >
      {label}
    </button>
  );
}

interface TvRemoteProps {
  landscape: boolean;
  /** Big screen: the picture fills the display and the remote floats over it. */
  big: boolean;
  onBig: (on: boolean) => void;
  /** On a touch screen in a game, the thumb pad is the controller. */
  padUp: boolean;
}

/**
 * The clicker. A bottom sheet in portrait, a rail down the right in
 * landscape; its size is the same LAYOUT the camera frames around, so it
 * never sits on the TV. In big-screen mode it floats over the picture and
 * tucks itself away after a few seconds.
 */
export function TvRemote({ landscape, big, onBig, padUp }: TvRemoteProps) {
  const status = useTvStatus();
  const rig = useViewRig();
  const [shown, setShown] = useState(true);
  const hideTimer = useRef(0);

  const poke = () => {
    if (!big) return;
    setShown(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShown(false), 4000);
  };
  useEffect(() => {
    setShown(true);
    poke();
    return () => window.clearTimeout(hideTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [big]);

  const bigBtn = (
    <Btn
      label={big ? '⤡ EXIT BIG SCREEN' : '⤢ BIG SCREEN'}
      onPress={() => onBig(!big)}
      className="!text-cyan-200"
    />
  );

  if (status.mode === 'emulator' && padUp) {
    // The thumb pad is the controller; keep only the way out and the screen size.
    return (
      <div className="pointer-events-none absolute left-3 top-3 z-[55] flex gap-2">
        <Btn k="back" label="◀ LEAVE GAME" className="h-9 px-3" />
        <Btn label={big ? '⤡' : '⤢'} onPress={() => onBig(!big)} className="h-9 w-10 !text-cyan-200" />
      </div>
    );
  }

  if (big && !shown) {
    return (
      <button
        type="button"
        onClick={poke}
        className="pointer-events-auto absolute left-3 top-3 z-[55] rounded-full border border-white/20 bg-black/55 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/80"
      >
        Remote
      </button>
    );
  }

  const zoomed = rig.zoom > 1.02;
  const keys = (
    <>
      <Btn k="power" label="⏻ POWER" className="col-span-2 !text-red-300" />
      <Btn k="menu" label="MENU" />
      <Btn k="guide" label="GUIDE" />
      <Btn k="chUp" label="CH ▲" />
      <Btn k="volUp" label="VOL +" />
      <Btn k="ok" label="OK" className="col-span-2 row-span-2 !rounded-full !bg-[#2b2533] text-base" />
      <Btn k="chDown" label="CH ▼" />
      <Btn k="volDown" label="VOL −" />
      <Btn k="game" label="▶ NES" className="!text-amber-200" />
      <Btn k="back" label="BACK" />
      <div className="col-span-2 grid grid-cols-[1fr_auto] gap-1.5">
        {bigBtn}
        {zoomed && !big && <Btn label="⟲" onPress={resetView} className="w-10" />}
      </div>
    </>
  );

  if (landscape) {
    return (
      <div
        data-ui="remote"
        onPointerDown={poke}
        className="pointer-events-none absolute bottom-0 right-0 top-0 z-[55] flex items-stretch py-2 pr-[max(0.5rem,env(safe-area-inset-right))]"
        style={{ width: LAYOUT.remoteRail }}
      >
        <div
          className={`pointer-events-auto grid w-full auto-rows-fr grid-cols-4 gap-1.5 rounded-[20px] border border-white/10 p-2 shadow-2xl backdrop-blur ${big ? 'bg-[#0d0d10]/70' : 'bg-[#0d0d10]/90'}`}
          style={{ marginTop: 52 }}
        >
          {keys}
        </div>
      </div>
    );
  }

  return (
    <div
      data-ui="remote"
      onPointerDown={poke}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[55] flex justify-center px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
      style={{ height: LAYOUT.remotePortrait }}
    >
      <div
        className={`pointer-events-auto grid w-full max-w-sm auto-rows-fr grid-cols-4 gap-1.5 rounded-[22px] border border-white/10 p-2.5 shadow-2xl backdrop-blur ${big ? 'bg-[#0d0d10]/70' : 'bg-[#0d0d10]/90'}`}
      >
        {keys}
      </div>
    </div>
  );
}
