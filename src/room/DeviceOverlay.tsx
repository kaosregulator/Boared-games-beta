import React from 'react';
import type { DeviceId } from './devices';

interface DeviceOverlayProps {
  device: DeviceId;
  radioError: string | null;
  onBack: () => void;
}

const HINT: Record<DeviceId, string> = {
  crt: 'Use the buttons on the TV and the cable box · arrows change channel · G guide',
  nes: 'Pick a cartridge on the TV · arrows, Z, X, Enter play',
  boombox: 'Turn the dial, press SCAN, or tap a preset',
};

/**
 * Leaning in hands every control to the 3D device itself. All that stays on
 * screen is the way back out and a one-line hint.
 */
export function DeviceOverlay({ device, radioError, onBack }: DeviceOverlayProps) {
  return (
    <div data-ui="device" className="pointer-events-none absolute inset-0 z-40">
      <button
        type="button"
        onClick={onBack}
        className="pointer-events-auto absolute right-4 top-4 rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white hover:bg-black/80"
      >
        Step back
      </button>
      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">
        {HINT[device]} · Esc steps back
      </p>
      {radioError && (
        <p className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-rose-200">
          {radioError}
        </p>
      )}
    </div>
  );
}
