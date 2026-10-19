import React, { useEffect } from 'react';
import { nesPad, youtubeId, type DeviceId, type DeviceManifest, type TvChannel } from './devices';

interface DeviceOverlayProps {
  device: DeviceId;
  manifest: DeviceManifest;
  tvIndex: number;
  onTv: (index: number) => void;
  radioError: string | null;
  nesOn: boolean;
  onNesPower: () => void;
  onBack: () => void;
}

const TITLES: Record<DeviceId, string> = {
  crt: 'Cable',
  nes: 'NES',
  boombox: 'Room stereo',
};

/** Controls for the zoomed TV, NES, and radio. The 3D clone stays in the canvas. */
export function DeviceOverlay({
  device,
  manifest,
  tvIndex,
  onTv,
  radioError,
  nesOn,
  onNesPower,
  onBack,
}: DeviceOverlayProps) {
  const channel: TvChannel | undefined = manifest.tv[tvIndex];
  const embed = channel?.kind === 'youtube' && channel.url ? youtubeId(channel.url) : null;

  useEffect(() => {
    if (device !== 'nes' || !nesOn) {
      nesPad.up = false;
      nesPad.down = false;
      return;
    }
    const down = (event: KeyboardEvent) => {
      if (event.code === 'ArrowUp') nesPad.up = true;
      if (event.code === 'ArrowDown') nesPad.down = true;
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === 'ArrowUp') nesPad.up = false;
      if (event.code === 'ArrowDown') nesPad.down = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      nesPad.up = false;
      nesPad.down = false;
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [device, nesOn]);

  if (device === 'boombox') {
    return (
      <div data-ui="device" className="pointer-events-none absolute inset-0 z-40">
        <button
          type="button"
          onClick={onBack}
          className="pointer-events-auto absolute right-4 top-4 rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white hover:bg-black/80"
        >
          Step back
        </button>
        {radioError && (
          <p className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-rose-200">
            {radioError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div data-ui="device" className="absolute inset-0 z-40 pointer-events-none">
      {embed && (
        <div className="pointer-events-auto absolute left-1/2 top-[18%] w-[min(40rem,92vw)] -translate-x-1/2 aspect-video overflow-hidden rounded-xl border border-white/20 bg-black shadow-2xl">
          <iframe
            title={channel?.name ?? 'Tape'}
            src={`https://www.youtube-nocookie.com/embed/${embed}?autoplay=1&rel=0`}
            className="h-full w-full"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        </div>
      )}

      <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex justify-center p-4">
        <div className="w-[min(40rem,calc(100vw-2rem))] rounded-3xl border border-amber-200/25 bg-[#12080f]/85 p-4 text-white shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-200">{TITLES[device]}</p>
              <p className="font-display text-2xl leading-none mt-1">
                {device === 'crt' && (channel?.name ?? 'No signal')}
                {device === 'nes' && (nesOn ? 'Power on' : 'Power off')}
              </p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] hover:bg-white/20"
            >
              Step back
            </button>
          </div>

          {device === 'crt' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {manifest.tv.map((row, index) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onTv(index)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] border ${
                    index === tvIndex
                      ? 'border-amber-300 bg-amber-400/20 text-amber-100'
                      : 'border-white/15 bg-black/40 text-white/80 hover:bg-white/10'
                  }`}
                >
                  {row.name}
                </button>
              ))}
              <p className="w-full text-[11px] text-white/50 mt-1">
                Add a tape in public/room/devices.json — kind video or youtube.
              </p>
            </div>
          )}

          {device === 'nes' && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onNesPower}
                className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] ${
                  nesOn ? 'bg-red-600 text-white' : 'bg-white/10 border border-white/20'
                }`}
              >
                Power
              </button>
              <button
                type="button"
                onPointerDown={() => {
                  nesPad.up = true;
                }}
                onPointerUp={() => {
                  nesPad.up = false;
                }}
                onPointerLeave={() => {
                  nesPad.up = false;
                }}
                className="rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-xs font-bold"
              >
                Up
              </button>
              <button
                type="button"
                onPointerDown={() => {
                  nesPad.down = true;
                }}
                onPointerUp={() => {
                  nesPad.down = false;
                }}
                onPointerLeave={() => {
                  nesPad.down = false;
                }}
                className="rounded-xl border border-white/20 bg-black/40 px-4 py-2 text-xs font-bold"
              >
                Down
              </button>
              <span className="text-[11px] uppercase tracking-[0.16em] text-white/55">Arrows move the paddle</span>
            </div>
          )}

          <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-white/40">Esc steps back</p>
        </div>
      </div>
    </div>
  );
}
