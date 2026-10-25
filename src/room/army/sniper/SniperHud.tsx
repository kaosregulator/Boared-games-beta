import { useState } from 'react';
import { isTouchDevice } from '../../input';
import { wakeArmyAudio } from '../armyAudio';
import { DUCKS_PER_WAVE, SHELLS, WAVES_PER_ROUND, quota } from './range';
import { ZOOM_LABEL, sniper, sniperControls, useSniper } from './state';

/**
 * Everything on screen for the shelf sniper: the radio man's call, the scope,
 * the shells and the ten-duck counter, and the bullet cam's letterbox.
 */

const BULLET_CAM_LABEL = { hits: 'Bullet cam: hits', all: 'Bullet cam: every shot', off: 'Bullet cam: off' } as const;

/** In the army HUD while the chopper sits on the shelf by the squad. */
export function SquadPrompt() {
  const s = useSniper();
  if (s.phase !== 'near') return null;
  return (
    <button
      type="button"
      onClick={() => sniperControls.talk?.()}
      className="pointer-events-auto absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full bg-lime-500 px-4 py-1.5 text-[12px] font-black uppercase tracking-[0.2em] text-black shadow-lg"
    >
      Psst! Up here · F to talk to the radio man
    </button>
  );
}

function Talk() {
  return (
    <div data-sniper-talk className="pointer-events-auto absolute inset-x-0 bottom-0 flex justify-center p-4 sm:bottom-6">
      <div className="w-full max-w-md rounded-3xl border-4 border-[#2f3d1a] bg-[#55652e]/95 p-5 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-8 w-20 items-center justify-center gap-1 rounded-lg bg-[#2f3d1a]">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className="h-4 w-1 animate-pulse rounded bg-lime-300" style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-lime-200">Radio man · shelf outpost</p>
        <p className="mt-2 text-2xl font-black uppercase leading-tight text-white drop-shadow sm:text-3xl">We're under attack!</p>
        <p className="mt-1 text-lg font-black uppercase text-amber-200">The ducks have taken over!</p>
        <p className="mt-2 text-[13px] leading-snug text-white/85">
          They came in through the window and set up camp by the beanbag. Private Scope here has the only rifle on the shelf, but he's
          been lying down since 1994. Take his spot, soldier.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              wakeArmyAudio();
              sniperControls.accept?.();
            }}
            className="rounded-2xl bg-lime-400 px-4 py-3 text-base font-black uppercase tracking-wider text-black hover:bg-lime-300"
          >
            Take the rifle
          </button>
          <button
            type="button"
            onClick={() => sniperControls.leave?.()}
            className="rounded-2xl bg-black/30 px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-white/80 hover:bg-black/45"
          >
            Not now, I'm flying
          </button>
        </div>
      </div>
    </div>
  );
}

function Scope({ zoom }: { zoom: number }) {
  if (zoom === 1) {
    return (
      <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/80" />
        <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/80" />
      </div>
    );
  }
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at 50% 50%, transparent 0, transparent 40vmin, rgba(0,0,0,0.55) 41vmin, #000 42.5vmin)' }}
      />
      <div className="absolute left-1/2 top-1/2 h-[84vmin] w-[84vmin] -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[inset_0_0_6vmin_rgba(0,0,0,0.85)]" />
      {/* Crosshair with mil dots, thick toward the edges. */}
      <span className="absolute left-1/2 top-1/2 h-px w-[84vmin] -translate-x-1/2 -translate-y-1/2 bg-black/80" />
      <span className="absolute left-1/2 top-1/2 h-[84vmin] w-px -translate-x-1/2 -translate-y-1/2 bg-black/80" />
      <span className="absolute left-[calc(50%-42vmin)] top-1/2 h-[3px] w-[26vmin] -translate-y-1/2 bg-black" />
      <span className="absolute right-[calc(50%-42vmin)] top-1/2 h-[3px] w-[26vmin] -translate-y-1/2 bg-black" />
      <span className="absolute bottom-[calc(50%-42vmin)] left-1/2 h-[26vmin] w-[3px] -translate-x-1/2 bg-black" />
      {[-3, -2, -1, 1, 2, 3].map(i => (
        <span key={`h${i}`} className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/85" style={{ left: `calc(50% + ${i * 3.2}vmin)` }} />
      ))}
      {[1, 2, 3].map(i => (
        <span key={`v${i}`} className="absolute left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/85" style={{ top: `calc(50% + ${i * 3.2}vmin)` }} />
      ))}
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(255,0,0,0.9)]" />
    </div>
  );
}

function DuckIcon({ state }: { state: boolean | null }) {
  const color = state === true ? '#ff4d3d' : state === false ? 'rgba(255,255,255,0.18)' : '#f4f1e6';
  return (
    <svg viewBox="0 0 16 12" className="h-3.5 w-5" aria-hidden>
      <path d="M1 7 L5 5 L11 5 L12 2 L15 3 L13 5 L13 8 L10 10 L4 10 Z" fill={color} />
    </svg>
  );
}

export function SniperHud() {
  const s = useSniper();
  const [isTouch] = useState(isTouchDevice);
  const btn = 'pointer-events-auto rounded-xl border border-white/25 bg-black/60 px-3 py-2 text-[11px] font-bold uppercase tracking-wider';
  const playing = s.phase === 'play';
  const cine = s.phase === 'bullet';
  const hits = s.tally.filter(t => t === true).length;
  const need = quota(s.round);
  return (
    <div data-sniper={s.phase} className="pointer-events-none absolute inset-0 z-40 select-none text-white">
      {playing && <Scope zoom={s.zoom} />}
      {cine && (
        <>
          <div className="absolute inset-x-0 top-0 h-[11vh] bg-black" />
          <div className="absolute inset-x-0 bottom-0 flex h-[11vh] items-center justify-center bg-black">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-amber-200">
              Bullet cam <span className="text-white/45">· click or Space to skip</span>
            </p>
          </div>
        </>
      )}
      {s.phase === 'talk' && <Talk />}

      {(playing || cine) && (
        <>
          <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => sniperControls.leave?.()} className="pointer-events-auto rounded-xl bg-lime-400 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-black">
              Back to the chopper
            </button>
            {playing && (
              <>
                <button type="button" onClick={() => sniperControls.zoom?.()} className={`${btn} text-lime-100`}>
                  Zoom: {ZOOM_LABEL[s.zoom]}
                </button>
                <button type="button" onClick={() => sniperControls.cycleBulletCam?.()} className={`${btn} text-amber-100`}>
                  {BULLET_CAM_LABEL[s.bulletCam]}
                </button>
              </>
            )}
          </div>
          <div className="absolute right-4 top-4 min-w-[150px] rounded-2xl border border-lime-300/30 bg-black/60 px-4 py-2 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-200">
              Round {s.round} · wave {Math.min(s.wave + 1, WAVES_PER_ROUND)}/{WAVES_PER_ROUND}
            </p>
            <p className="font-mono text-2xl font-black tabular-nums">{s.score.toLocaleString()}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Best {Math.max(s.best, s.score).toLocaleString()}</p>
          </div>
        </>
      )}

      {playing && (
        <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-2 px-4">
          <div className="flex items-center gap-4 rounded-2xl bg-black/65 px-4 py-2">
            <div className="flex items-end gap-1" aria-label={`${s.shells} shells`}>
              {Array.from({ length: SHELLS }, (_, i) => (
                <span key={i} className={`block h-5 w-2 rounded-t-full ${i < s.shells ? 'bg-amber-400' : 'bg-white/15'}`} />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-0.5">
              {s.tally.map((t, i) => (
                <span key={i} className={i === need - 1 ? 'border-r-2 border-amber-300 pr-0.5' : ''}>
                  <DuckIcon state={t} />
                </span>
              ))}
            </div>
            <p className="font-mono text-[11px] font-bold tabular-nums text-white/70">
              {hits}/{need}
            </p>
          </div>
          {s.holding || s.breath < 0.98 ? (
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/15">
              <div className="h-full bg-cyan-300" style={{ width: `${Math.round(s.breath * 100)}%` }} />
            </div>
          ) : null}
          {!isTouch && (
            <p className="rounded-full bg-black/55 px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white/65">
              Click to grab the mouse, then click to fire · mouse or WASD aim · Shift hold breath · Z or wheel zoom · B bullet cam · X leave
            </p>
          )}
        </div>
      )}

      {isTouch && playing && (
        <div className="absolute bottom-24 right-4 flex flex-col items-end gap-2">
          <button
            type="button"
            className="pointer-events-auto h-20 w-20 rounded-full border border-white/25 bg-red-600/70 text-sm font-black uppercase"
            onPointerDown={e => {
              e.preventDefault();
              sniperControls.fire?.();
            }}
          >
            Fire
          </button>
          <button
            type="button"
            className="pointer-events-auto h-12 w-20 rounded-2xl border border-white/25 bg-black/60 text-xs font-black uppercase"
            onPointerDown={() => (sniper.touchBreath = true)}
            onPointerUp={() => (sniper.touchBreath = false)}
            onPointerLeave={() => (sniper.touchBreath = false)}
          >
            Breath
          </button>
        </div>
      )}

      {s.banner && (playing || cine) && (
        <div className="absolute left-1/2 top-[22%] -translate-x-1/2 text-center">
          <p className="whitespace-nowrap text-4xl font-black uppercase italic text-amber-300 drop-shadow-[0_3px_0_rgba(0,0,0,0.75)] sm:text-5xl">
            {s.banner.text}
          </p>
          {s.banner.sub && <p className="mt-2 rounded-full bg-black/60 px-4 py-1 text-sm font-bold text-white/90">{s.banner.sub}</p>}
        </div>
      )}
      {s.radio && (playing || cine) && (
        <div className="absolute bottom-28 right-4 max-w-[16rem] rounded-2xl border border-lime-300/40 bg-[#2f3d1a]/90 px-3 py-2 shadow-xl">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-lime-200">Radio man</p>
          <p className="text-[13px] font-bold leading-snug">{s.radio.text}</p>
        </div>
      )}

      {playing && s.stage === 'over' && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-sm rounded-3xl border-4 border-[#2f3d1a] bg-[#55652e] p-5 text-center shadow-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-lime-200">Round {s.round}</p>
            <p className="mt-1 text-3xl font-black uppercase text-white">The ducks win</p>
            <p className="mt-1 text-sm text-white/80">
              {hits} of {WAVES_PER_ROUND * DUCKS_PER_WAVE} down, you needed {need}. They’ve taken the beanbag.
            </p>
            <p className="mt-3 font-mono text-2xl font-black tabular-nums">{s.score.toLocaleString()}</p>
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" onClick={() => sniperControls.again?.()} className="rounded-2xl bg-lime-400 px-4 py-3 font-black uppercase tracking-wider text-black">
                Try again
              </button>
              <button type="button" onClick={() => sniperControls.leave?.()} className="rounded-2xl bg-black/30 px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-white/80">
                Back to the chopper
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`absolute inset-0 bg-black transition-opacity duration-300 ${s.fade > 0 ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
}
