import React from 'react';
import type { DeviceId } from './devices';

interface DeviceOverlayProps {
  device: DeviceId;
  /** Touch screens get the remote and the thumb pad instead of key hints. */
  touch?: boolean;
  /** Big screen is on (TV picture laid flat over the display). */
  big?: boolean;
  /** Present for the TV: switch big screen on or off. */
  onBig?: (on: boolean) => void;
  radioError: string | null;
  onBack: () => void;
}

const HINT: Record<DeviceId, string> = {
  crt: 'Buttons on the TV and cable box · arrows change channel · G guide · scroll to zoom · F big screen',
  nes: 'Pick a cartridge · arrows, Z, X, Enter play · scroll to zoom · F big screen',
  boombox: 'Turn the dial, press SCAN, or tap a preset · scroll to zoom',
  pc: 'Point and click on the screen · Win key opens Start · F big screen',
};

/**
 * Leaning in hands every control to the 3D device itself. What stays on
 * screen is the way back out, big screen for the TV, and a one-line hint.
 */
export function DeviceOverlay({ device, touch = false, big = false, onBig, radioError, onBack }: DeviceOverlayProps) {
  return (
    <div data-ui="device" className="pointer-events-none absolute inset-0 z-40">
      <div className="pointer-events-auto absolute right-4 top-4 flex gap-2">
        {onBig && !touch && (
          <button
            type="button"
            onClick={() => onBig(!big)}
            className="rounded-xl border border-cyan-200/30 bg-black/60 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100 hover:bg-black/80"
          >
            {big ? '⤡ Exit big screen' : '⤢ Big screen'}
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white hover:bg-black/80"
        >
          Step back
        </button>
      </div>
      {touch ? (
        device === 'boombox' && (
          <p className="pointer-events-none absolute bottom-4 left-1/2 w-[calc(100%-2rem)] -translate-x-1/2 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
            Tap the buttons on the stereo · pinch to zoom
          </p>
        )
      ) : (
        !big && (
          <p className="pointer-events-none absolute bottom-3 left-1/2 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">
            {HINT[device]} · Esc steps back
          </p>
        )
      )}
      {radioError && (
        <p className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-rose-200">
          {radioError}
        </p>
      )}
    </div>
  );
}
