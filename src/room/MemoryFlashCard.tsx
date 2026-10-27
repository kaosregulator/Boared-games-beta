import React, { useEffect, useRef, useState } from 'react';
import type { GameMetadata } from '../types';
import type { CardPhoto, CardVideo, PropCard } from './propCards';
import { GAME_PHOTOS } from './gamePhotos';
import { TimeCapsule } from './TimeCapsule';
import { BookOpen, ChevronLeft, ChevronRight, Users, Wifi, WifiOff, X, Sparkles } from 'lucide-react';

/** Board games that already have a real in-room engine vs coming-soon shells. */
const ONLINE_READY = new Set([
  'monopoly',
  'clue',
  'yahtzee',
  'checkers',
  'chess',
  'connect4',
  'gofish',
  'liarsdice',
  'poker',
  'blackjack',
  'battleship',
  'life',
  'pawnrush',
]);

function gameMode(id: string): 'Online ready' | 'Local / offline' {
  return ONLINE_READY.has(id) ? 'Online ready' : 'Local / offline';
}

interface GameCardProps {
  kind: 'game';
  game: GameMetadata;
  /** Left out for the box beside the table: that game is already being played. */
  onPlay?: () => void;
  onRules: () => void;
  onClose: () => void;
}

interface PropCardProps {
  kind: 'prop';
  prop: PropCard;
  onClose: () => void;
  /** The card's own action: turn on the TV, sit down with the Game Boy... */
  onAction?: () => void;
  /** An old commercial started or stopped, so the room music can step aside. */
  onVideo?: (playing: boolean) => void;
}

export type MemoryFlashCardProps = GameCardProps | PropCardProps;

/**
 * Glass card for a game box or a memory. On a phone it is a sheet along the
 * bottom of the screen; on a bigger screen it sits on the right. The body
 * scrolls, so long stories and the photo strip fit anywhere.
 */
export function MemoryFlashCard(props: MemoryFlashCardProps) {
  return (
    <div
      data-ui="card"
      className={`pointer-events-auto flex max-h-[min(72dvh,42rem)] w-[min(24rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-3xl border text-white shadow-[0_24px_70px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:max-h-[min(86dvh,46rem)] ${
        props.kind === 'game'
          ? 'border-cyan-200/30 bg-[#071018]/55'
          : 'border-white/25 bg-[#120a16]/80'
      }`}
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-300" />
          <span className="truncate text-[10px] font-bold uppercase tracking-[0.22em] text-amber-100/90">
            {props.kind === 'game' ? 'Time capsule' : 'Memory'}
          </span>
        </div>
        <button
          type="button"
          aria-label="Close card"
          onClick={props.onClose}
          className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ touchAction: 'pan-y' }}>
        {props.kind === 'game' ? <GameBody {...props} /> : <PropBody {...props} />}
      </div>
    </div>
  );
}

function GameBody({ game, onPlay, onRules }: GameCardProps) {
  const mode = gameMode(game.id);
  const online = mode === 'Online ready';
  const photo = GAME_PHOTOS[game.id];
  return (
    <div className="p-3.5 flex flex-col gap-3">
      <TimeCapsule id={game.id} title={game.title} photos={photo ? [photo] : []} />

      <div>
        <h3 className="font-display text-xl text-white leading-tight">{game.title}</h3>
        <p className="text-xs text-white/75 mt-1 line-clamp-2">{game.description}</p>
      </div>

      <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold uppercase tracking-wider">
        <div className="rounded-lg bg-black/35 border border-white/10 px-2 py-1.5 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-amber-300" />
          <span className="truncate">{game.players}</span>
        </div>
        <div className="rounded-lg bg-black/35 border border-white/10 px-2 py-1.5 flex items-center gap-1.5 col-span-1">
          <BookOpen className="w-3.5 h-3.5 text-fuchsia-300" />
          <span className="truncate">{game.duration}</span>
        </div>
        <div className="rounded-lg bg-black/35 border border-white/10 px-2 py-1.5 flex items-center gap-1.5">
          {online ? <Wifi className="w-3.5 h-3.5 text-emerald-300" /> : <WifiOff className="w-3.5 h-3.5 text-slate-300" />}
          <span className="truncate">{online ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/50 mb-1">Rule book peek</p>
        <ul className="text-xs text-white/80 space-y-1">
          {game.rules.slice(0, 2).map(rule => (
            <li key={rule} className="line-clamp-2">• {rule}</li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2">
        {onPlay ? (
          <button
            type="button"
            onClick={onPlay}
            className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-600 to-amber-500 px-3 py-2.5 font-display text-sm text-white shadow hover:brightness-110"
          >
            Play
          </button>
        ) : (
          <p className="flex flex-1 items-center justify-center rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-amber-100/80">
            Already on the table
          </p>
        )}
        <button
          type="button"
          onClick={onRules}
          className="rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white/90 hover:bg-white/10"
        >
          Rules
        </button>
      </div>
    </div>
  );
}

/** Swipe (or click the arrows) through the real photos. */
function Gallery({ photos }: { photos: CardPhoto[] }) {
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const go = (dir: number) => {
    const el = strip.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: 'smooth' });
  };
  return (
    <div className="relative">
      <div
        ref={strip}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl border border-white/15 bg-black/40 [scrollbar-width:none]"
        style={{ touchAction: 'pan-x pan-y' }}
        onScroll={e => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
      >
        {photos.map(photo => (
          <figure key={photo.src} className="w-full shrink-0 snap-center">
            <img
              src={photo.src}
              alt={photo.alt}
              loading="lazy"
              className="h-44 w-full bg-black/30 object-contain"
              onError={e => {
                // Offline or blocked: show the caption on a plain frame instead of a broken image.
                const img = e.currentTarget;
                img.style.visibility = 'hidden';
                img.parentElement?.setAttribute('data-missing', '1');
              }}
            />
            <figcaption className="truncate px-2.5 py-1 text-[9px] text-white/50">{photo.credit}</figcaption>
          </figure>
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => go(-1)}
            className="absolute left-1.5 top-[40%] hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white/85 hover:bg-black/75 sm:flex"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => go(1)}
            className="absolute right-1.5 top-[40%] hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white/85 hover:bg-black/75 sm:flex"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-1">
            {photos.map((photo, i) => (
              <span key={photo.src} className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/35'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** The old commercial, from archive.org's own player, loaded only when asked. */
function Commercial({ video, onVideo }: { video: CardVideo; onVideo?: (playing: boolean) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    onVideo?.(true);
    return () => onVideo?.(false);
  }, [open, onVideo]);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/15 bg-black/35 px-3 py-2.5 text-left hover:bg-black/50"
      >
        <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md border border-white/20 bg-[#1a1a1a] font-mono text-[10px] font-bold text-red-400">
          ▶ VHS
        </span>
        <span className="min-w-0">
          <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-amber-200/80">Play the old commercial</span>
          <span className="block truncate text-xs text-white/85">{video.title}</span>
        </span>
      </button>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-black">
      <div className="relative w-full" style={{ paddingTop: '75%' }}>
        <iframe
          title={video.title}
          src={`https://archive.org/embed/${encodeURIComponent(video.archiveId)}?autoplay=1`}
          allow="autoplay; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
        <span className="truncate text-[9px] text-white/50">{video.title} · Internet Archive</span>
        <button type="button" onClick={() => setOpen(false)} className="text-[9px] font-bold uppercase tracking-wider text-amber-200">
          Stop
        </button>
      </div>
    </div>
  );
}

function PropBody({ prop, onAction, onVideo }: PropCardProps) {
  return (
    <div className="flex flex-col gap-3 p-3.5">
      {prop.photos?.length ? (
        <Gallery photos={prop.photos} />
      ) : (
        <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-fuchsia-700/40 via-black/30 to-amber-600/30 px-4 py-5">
          <p className="font-display text-2xl leading-tight text-white">{prop.title}</p>
        </div>
      )}
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80">{prop.era}</p>
        {prop.photos?.length ? <h3 className="mt-0.5 font-display text-xl leading-tight text-white">{prop.title}</h3> : null}
      </div>
      {onAction && prop.action && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-xl bg-gradient-to-r from-fuchsia-600 to-amber-500 px-3 py-2.5 font-display text-sm text-white shadow hover:brightness-110"
        >
          {prop.action.label}
        </button>
      )}
      <p className="text-sm leading-relaxed text-white/85">{prop.story}</p>
      <ul className="space-y-1.5 text-xs text-white/70">
        {prop.memories.map(line => (
          <li key={line} className="flex gap-2">
            <span className="shrink-0 text-amber-300/80">▸</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {prop.video && <Commercial video={prop.video} onVideo={onVideo} />}
    </div>
  );
}
