import React, { useState } from 'react';
import { isTouchDevice } from './input';
import { CHANNELS } from '../tv/channels';
import { STATIONS } from '../radio/stations';
import { CARTRIDGES, GAME_PAKS } from '../devices/cartridges';

interface IntroCardProps {
  wallTitles: string[];
  onEnter: () => void;
}

const SPOTS: { tag: string; title: string; detail: string; tint: string }[] = [
  {
    tag: 'CH 02–' + String(CHANNELS[CHANNELS.length - 1].number).padStart(2, '0'),
    title: 'The TV',
    detail: `SNICK on channel 2 and ${CHANNELS.length - 1} cartoon channels, with a real cable guide.`,
    tint: '#7ad7ff',
  },
  {
    tag: 'NES',
    title: 'The console',
    detail: `${CARTRIDGES.map(c => c.name).join(' and ')} in the cartridge slot.`,
    tint: '#ff5a5a',
  },
  {
    tag: 'FM',
    title: 'The boombox',
    detail: `${STATIONS.length} stations on the dial. Scan through the static like it's 1988.`,
    tint: '#ffcf4a',
  },
  {
    tag: 'GB',
    title: 'The bean bag',
    detail: `Sit down with the Game Boy and play ${GAME_PAKS.map(c => c.name).join(', ')} from the floor.`,
    tint: '#9bbc0f',
  },
  {
    tag: 'TABLE',
    title: 'The board games',
    detail: 'Monopoly, Battleship, Connect Four — pick one and the box unfolds on the table.',
    tint: '#ff7ad8',
  },
];

/** First thing you see: a taped-label title card over the dark room. */
export function IntroCard({ wallTitles, onEnter }: IntroCardProps) {
  const [touch] = useState(isTouchDevice);
  const controls = touch
    ? [
        ['Left thumb', 'walk'],
        ['Drag', 'look'],
        ['Tap', 'use'],
        ['Duck', 'crouch'],
      ]
    : [
        ['WASD / arrows', 'walk'],
        ['Drag · 2-finger swipe', 'look'],
        ['Click · E', 'use'],
        ['C', 'crouch'],
        ['Esc', 'step back'],
      ];
  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain p-3 pointer-events-none sm:items-center sm:p-8">
      <div
        className="pointer-events-auto relative my-auto w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/15 bg-[#0d0712]/90 shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-md sm:rounded-[28px]"
        style={{ fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}
      >
        {/* tube scanlines over the whole card */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0 1px, transparent 2px 4px)' }}
        />
        {/* VHS spine stripes */}
        <div className="flex h-2">
          {['#ff3b6b', '#ff9a3b', '#ffe14d', '#3bd6ff', '#9b5bff'].map(c => (
            <div key={c} className="flex-1" style={{ background: c }} />
          ))}
        </div>
        <div className="relative px-5 pt-5 pb-5 sm:px-9 sm:pt-6">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">
            <span>
              <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500 align-middle" />
              PLAY ▶ SP
            </span>
            <span>Saturday · 8:00 PM</span>
          </div>
          <h1 className="font-display mt-3 text-4xl leading-[0.95] text-white sm:mt-4 sm:text-6xl">
            Boared <span className="text-[#ff7ad8]">Games</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-300">
            A 90s bedroom where everything works, and everything has a story. Walk up to anything and {touch ? 'tap it' : 'click it'}.
          </p>

          <ul className="mt-4 grid grid-cols-2 gap-2 sm:mt-5">
            {SPOTS.map(spot => (
              <li key={spot.tag} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
                <span
                  className="mt-0.5 h-fit shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-wider text-black"
                  style={{ background: spot.tint }}
                >
                  {spot.tag}
                </span>
                <span>
                  <span className="block text-[13px] font-bold text-white">{spot.title}</span>
                  <span className="hidden text-[11px] leading-snug text-slate-400 min-[420px]:block">{spot.detail}</span>
                </span>
              </li>
            ))}
            <li className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
              <span className="mt-0.5 h-fit shrink-0 rounded-md bg-[#d4ffe8] px-1.5 py-0.5 text-[10px] font-black tracking-wider text-black">
                WALL
              </span>
              <span>
                <span className="block text-[13px] font-bold text-white">Neon signs</span>
                <span className="hidden text-[11px] leading-snug text-slate-400 min-[420px]:block">{wallTitles.slice(0, 5).join(' · ')} and more.</span>
              </span>
            </li>
          </ul>

          <div className="mt-5 flex flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
            {controls.map(([k, v]) => (
              <span key={k} className="rounded-md border border-white/10 bg-black/40 px-2 py-1">
                <span className="text-amber-200">{k}</span> {v}
              </span>
            ))}
          </div>

          <button
            id="enter-room"
            type="button"
            onClick={onEnter}
            className="font-display sticky bottom-0 mt-5 w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-500 to-amber-500 px-6 py-3.5 text-lg text-white shadow-lg transition hover:brightness-110 active:scale-[0.99]"
          >
            Step into the room
          </button>
        </div>
      </div>
    </div>
  );
}
