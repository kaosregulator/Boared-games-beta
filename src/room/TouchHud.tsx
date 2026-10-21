import React, { useEffect, useRef, useState } from 'react';
import { pad } from './input';

const RADIUS = 52;

/**
 * Left-thumb stick. It appears wherever the thumb lands in the lower-left of
 * the screen, so it works on a small phone and a big tablet alike.
 */
function ThumbStick() {
  const zone = useRef<HTMLDivElement>(null);
  const [stick, setStick] = useState<null | { ox: number; oy: number; dx: number; dy: number }>(null);
  const pointer = useRef<number | null>(null);

  useEffect(
    () => () => {
      pad.x = 0;
      pad.y = 0;
    },
    [],
  );

  const release = () => {
    pointer.current = null;
    pad.x = 0;
    pad.y = 0;
    setStick(null);
  };

  return (
    <div
      ref={zone}
      data-ui="stick"
      className="pointer-events-auto absolute bottom-0 left-0 z-30 h-[46%] w-[46%] touch-none select-none"
      onPointerDown={e => {
        if (pointer.current !== null) return;
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        const rect = e.currentTarget.getBoundingClientRect();
        setStick({ ox: e.clientX - rect.left, oy: e.clientY - rect.top, dx: 0, dy: 0 });
      }}
      onPointerMove={e => {
        if (e.pointerId !== pointer.current || !stick) return;
        const rect = e.currentTarget.getBoundingClientRect();
        let dx = e.clientX - rect.left - stick.ox;
        let dy = e.clientY - rect.top - stick.oy;
        const len = Math.hypot(dx, dy);
        if (len > RADIUS) {
          dx = (dx / len) * RADIUS;
          dy = (dy / len) * RADIUS;
        }
        // A small dead zone so resting a thumb doesn't drift.
        const mag = Math.min(1, len / RADIUS);
        const live = mag < 0.12 ? 0 : (mag - 0.12) / 0.88;
        const ang = Math.atan2(dy, dx);
        pad.x = Math.cos(ang) * live;
        pad.y = -Math.sin(ang) * live;
        setStick({ ...stick, dx, dy });
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      {stick ? (
        <div className="absolute" style={{ left: stick.ox - RADIUS, top: stick.oy - RADIUS }}>
          <div className="h-[104px] w-[104px] rounded-full border-2 border-white/30 bg-black/25 backdrop-blur-sm" />
          <div
            className="absolute h-12 w-12 rounded-full border border-white/50 bg-white/30"
            style={{ left: RADIUS - 24 + stick.dx, top: RADIUS - 24 + stick.dy }}
          />
        </div>
      ) : (
        <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-6 flex h-[104px] w-[104px] items-center justify-center rounded-full border-2 border-dashed border-white/25 bg-black/20">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">Walk</span>
        </div>
      )}
    </div>
  );
}

interface TouchHudProps {
  /** Something in reach under the middle dot. */
  useLabel: string | null;
  onUse: () => void;
  crouched: boolean;
  onCrouch: () => void;
}

/** On-screen controls for phones and tablets. */
export function TouchHud({ useLabel, onUse, crouched, onCrouch }: TouchHudProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <ThumbStick />
      <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] right-5 flex flex-col items-end gap-3">
        {useLabel && (
          <button
            type="button"
            data-ui="use"
            onClick={onUse}
            className="pointer-events-auto max-w-[44vw] rounded-2xl border border-amber-200/60 bg-amber-300/25 px-4 py-3 text-left backdrop-blur-md active:scale-95"
          >
            <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-amber-100/80">Tap to use</span>
            <span className="block truncate font-display text-base text-white">{useLabel}</span>
          </button>
        )}
        <button
          type="button"
          data-ui="crouch"
          onClick={onCrouch}
          className={`pointer-events-auto h-14 w-14 rounded-full border text-[10px] font-bold uppercase tracking-wider backdrop-blur-md active:scale-95 ${
            crouched ? 'border-amber-200/70 bg-amber-300/30 text-white' : 'border-white/30 bg-black/35 text-white/80'
          }`}
        >
          {crouched ? 'Stand' : 'Duck'}
        </button>
      </div>
      <p className="absolute left-1/2 top-[max(0.9rem,env(safe-area-inset-top))] -translate-x-1/2 whitespace-nowrap rounded-full bg-black/45 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">
        Drag to look · tap things
      </p>
    </div>
  );
}
