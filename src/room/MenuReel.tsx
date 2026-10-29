import React, { useCallback, useEffect, useRef, useState } from 'react';
import { setControlPreset, useControlSettings, type ControlPreset } from './controls';
import { sound, MUSIC_CREDITS } from '../utils/audio';

interface MenuReelProps {
  /** At full black: the room takes over underneath. */
  onEnter: () => void;
  /** The fade back up is finished; the menu can go. */
  onDone: () => void;
}

/** Fade to black, hold a beat, then fade up on the room. */
const FADE_OUT_MS = 650;
const HOLD_MS = 180;
const FADE_IN_MS = 900;

/**
 * The title screen: a recorded walk through the room (public/menu/reel.mp4)
 * plays straight away while the real room loads behind it. One see-through
 * button stops the reel and fades through black into the room.
 */
const MENU_DEVICES: { id: Exclude<ControlPreset, 'custom'>; label: string }[] = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'phone', label: 'Phone' },
];

export function MenuReel({ onEnter, onDone }: MenuReelProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<'reel' | 'out' | 'in'>('reel');
  const controls = useControlSettings();
  const year = new Date().getFullYear();

  // The title screen has its own song; the room music takes over when it goes.
  useEffect(() => {
    sound.setMenuMusic(true);
    return () => sound.setMenuMusic(false);
  }, []);

  const play = useCallback(() => {
    if (phase !== 'reel') return;
    setPhase('out');
  }, [phase]);

  useEffect(() => {
    if (phase === 'out') {
      const id = window.setTimeout(() => {
        video.current?.pause();
        sound.setMenuMusic(false);
        onEnter();
        window.setTimeout(() => setPhase('in'), HOLD_MS);
      }, FADE_OUT_MS);
      return () => window.clearTimeout(id);
    }
    if (phase === 'in') {
      const id = window.setTimeout(onDone, FADE_IN_MS);
      return () => window.clearTimeout(id);
    }
    // Enter or Space from the keyboard plays too.
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Enter' && e.code !== 'Space') return;
      // A focused preset button keeps its own Enter/Space; the play button plays either way.
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest('button, input, select, textarea, a')) return;
      e.preventDefault();
      play();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onEnter, onDone, play]);

  return (
    <div className="absolute inset-0 z-[80]" style={{ pointerEvents: phase === 'in' ? 'none' : 'auto' }}>
      {phase !== 'in' && (
        <video
          ref={video}
          className="absolute inset-0 h-full w-full object-cover"
          src="/menu/reel.mp4"
          poster="/menu/reel-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden
        />
      )}
      {/* a soft vignette so the button and footer read over any shot */}
      {phase === 'reel' && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.45) 100%)' }}
        />
      )}

      {phase === 'reel' && (
        <div className="absolute inset-x-0 bottom-[calc(18%+4.6rem)] z-[81] flex flex-wrap justify-center gap-1.5 px-3">
          {MENU_DEVICES.map(preset => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={controls.preset === preset.id}
              onClick={() => setControlPreset(preset.id)}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] backdrop-blur-sm ${
                controls.preset === preset.id
                  ? 'border-amber-100 bg-black/70 text-amber-50'
                  : 'border-white/35 bg-black/45 text-white/80'
              }`}
              style={{ fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {phase === 'reel' && (
        <div className="absolute inset-x-0 bottom-[18%] flex justify-center px-4">
          <button
            type="button"
            onClick={play}
            autoFocus
            className="menu-play group flex items-center gap-3 rounded-full border border-white/30 bg-white/[0.08] px-7 py-3.5 text-white/90 shadow-[0_8px_40px_rgba(0,0,0,0.35)] backdrop-blur-[3px] transition hover:border-white/60 hover:bg-white/[0.16] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 active:scale-[0.98]"
            style={{ fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full border border-white/40 bg-white/10 text-[13px] transition group-hover:bg-white/25">
              ▶
            </span>
            <span className="text-[13px] font-bold uppercase tracking-[0.32em] sm:text-sm">Step through time</span>
          </button>
        </div>
      )}

      {/* the black between the reel and the room */}
      <div
        className="pointer-events-none absolute inset-0 bg-black"
        style={{
          opacity: phase === 'reel' ? 0 : phase === 'out' ? 1 : 0,
          transition: `opacity ${phase === 'out' ? FADE_OUT_MS : FADE_IN_MS}ms ease-in-out`,
        }}
      />

      {phase === 'reel' && (
        <div className="menu-credits absolute inset-x-0 bottom-[calc(max(12px,env(safe-area-inset-bottom))+1.35rem)] mx-auto h-[3.6rem] max-w-md overflow-hidden px-4 text-center" aria-label="Music credits">
          <div className="menu-credits-roll" style={{ fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}>
            {[0, 1].map(copy => (
              <div key={copy} aria-hidden={copy === 1} className="flex flex-col gap-1 pb-4">
                <span className="text-[9px] font-bold uppercase tracking-[0.32em] text-white/45">Music</span>
                {MUSIC_CREDITS.map(c => (
                  <span key={c.title} className="text-[10px] leading-snug text-white/55">
                    “{c.title}” by {c.artist}
                    <br />
                    <a href={c.source} target="_blank" rel="noreferrer" tabIndex={copy === 1 ? -1 : 0} className="underline decoration-white/25 hover:text-white/85">
                      breakingcopyright.com
                    </a>{' '}
                    ·{' '}
                    {c.licenseUrl ? (
                      <a href={c.licenseUrl} target="_blank" rel="noreferrer" tabIndex={copy === 1 ? -1 : 0} className="underline decoration-white/25 hover:text-white/85">
                        {c.license}
                      </a>
                    ) : (
                      c.license
                    )}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === 'reel' && (
        <footer
          className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-[max(12px,env(safe-area-inset-bottom))] text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-white/55"
          style={{ fontFamily: '"IBM Plex Mono", ui-monospace, monospace', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
        >
          kaosregulator™ · © {year}
        </footer>
      )}
    </div>
  );
}
