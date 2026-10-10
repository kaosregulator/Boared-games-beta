import React from 'react';
import type { GameMetadata } from '../types';
import type { PropCard } from './propCards';
import { BookOpen, Users, Wifi, WifiOff, X, Sparkles } from 'lucide-react';

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
  onPlay: () => void;
  onRules: () => void;
  onClose: () => void;
}

interface PropCardProps {
  kind: 'prop';
  prop: PropCard;
  onClose: () => void;
  /** Optional secondary action (e.g. boombox play). */
  onAction?: () => void;
  actionLabel?: string;
}

export type MemoryFlashCardProps = GameCardProps | PropCardProps;

/**
 * See-through glass flash card for shelf games and nostalgia props.
 * Desktop: appears while aiming; E opens play / inspect. Mobile: tap to pin.
 */
export function MemoryFlashCard(props: MemoryFlashCardProps) {
  return (
    <div
      className="pointer-events-auto w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/25 bg-[#1a1020]/55 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl text-white overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-100/90 truncate">
            {props.kind === 'game' ? 'Game box' : 'Memory'}
          </span>
        </div>
        <button
          type="button"
          aria-label="Close card"
          onClick={props.onClose}
          className="rounded-lg p-1 text-white/70 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {props.kind === 'game' ? <GameBody {...props} /> : <PropBody {...props} />}
    </div>
  );
}

function GameBody({ game, onPlay, onRules }: GameCardProps) {
  const mode = gameMode(game.id);
  const online = mode === 'Online ready';
  return (
    <div className="p-3.5 flex flex-col gap-3">
      <div
        className="h-28 rounded-xl border border-white/15 flex items-center justify-center relative overflow-hidden"
        style={{ background: `linear-gradient(145deg, ${game.boxAccent.includes('amber') ? '#4a2818' : '#1e2a4a'}, #120a14)` }}
      >
        {game.coverImage ? (
          <img src={game.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
        ) : (
          <div className="text-center px-3">
            <p className="font-display text-2xl tracking-wide text-white drop-shadow">{game.title}</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 mt-1">{game.badge}</p>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

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
        <button
          type="button"
          onClick={onPlay}
          className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-600 to-amber-500 px-3 py-2.5 font-display text-sm text-white shadow hover:brightness-110"
        >
          Pull & play
        </button>
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

function PropBody({ prop, onAction, actionLabel }: PropCardProps) {
  return (
    <div className="p-3.5 flex flex-col gap-3">
      <div className="h-24 rounded-xl border border-white/15 bg-gradient-to-br from-[#3a2438] to-[#120a14] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-display text-2xl text-white">{prop.title}</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80 mt-1">{prop.era}</p>
        </div>
      </div>
      <p className="text-sm text-white/85 leading-relaxed">{prop.blurb}</p>
      <ul className="text-xs text-white/70 space-y-1.5">
        {prop.facts.map(f => (
          <li key={f} className="flex gap-2">
            <span className="text-amber-300/80 shrink-0">▸</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {onAction && actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-white/15"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
