import React from 'react';
import { GameMetadata, GameBoxArtOverride } from '../types';
import { GameBoxArtGraphic } from './GameBoxArtGraphic';
import { sound } from '../utils/audio';
import {
  Play,
  HelpCircle,
  Sparkles,
  Users,
  Clock,
  Palette,
  ShieldCheck,
  ChevronRight,
  Zap,
  Flame,
  Award
} from 'lucide-react';

interface GameHoverPopoutCardProps {
  game: GameMetadata;
  artOverride?: GameBoxArtOverride;
  onPlay: () => void;
  onOpenRules: () => void;
  onOpenCustomArt: () => void;
  position?: 'right' | 'top' | 'floating';
}

export const GameHoverPopoutCard: React.FC<GameHoverPopoutCardProps> = ({
  game,
  artOverride,
  onPlay,
  onOpenRules,
  onOpenCustomArt,
  position = 'floating'
}) => {
  return (
    <div
      className="w-80 sm:w-96 rounded-2xl bg-gradient-to-b from-[#0e1d32] via-[#091424] to-[#040912] border-2 border-cyan-500/80 shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_30px_rgba(6,182,212,0.35)] p-4 sm:p-5 text-white backdrop-blur-xl animate-in zoom-in-95 fade-in duration-200 pointer-events-auto flex flex-col gap-3 select-none z-50 ring-1 ring-white/20"
      onClick={e => e.stopPropagation()}
    >
      {/* Top Banner: Hologram Header & Quick Stats */}
      <div className="flex items-center justify-between border-b border-cyan-500/30 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-300">
            GAME BOX INSPECTION SCREEN
          </span>
        </div>
        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-200 border border-cyan-500/40 font-bold">
          {game.badge}
        </span>
      </div>

      {/* 3D Box Cover Art Graphic */}
      <div className="w-full h-36 relative rounded-xl overflow-hidden shadow-lg border border-cyan-500/40 bg-black/60 flex items-center justify-center group">
        <GameBoxArtGraphic
          gameId={game.id}
          title={artOverride?.customTitle || game.title}
          customImageUrl={artOverride?.coverImageUrl}
          className="w-full h-full"
        />

        {/* Floating Custom Art Overlay Button */}
        <button
          onClick={e => {
            e.stopPropagation();
            sound.playButtonClick();
            onOpenCustomArt();
          }}
          className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/80 hover:bg-black text-[9px] font-bold text-cyan-300 border border-cyan-500/50 flex items-center gap-1 shadow-md opacity-90 hover:opacity-100 transition-opacity"
          title="Upload or change cover image"
        >
          <Palette className="w-3 h-3 text-cyan-400" />
          <span>Edit Art</span>
        </button>
      </div>

      {/* Title & Description */}
      <div>
        <h3 className="text-base sm:text-lg font-black uppercase tracking-wide text-white drop-shadow">
          {artOverride?.customTitle || game.title}
        </h3>
        <p className="text-xs text-cyan-200/90 font-medium line-clamp-2 mt-0.5">
          {game.subtitle}
        </p>
      </div>

      {/* Specs Pill Badges */}
      <div className="grid grid-cols-3 gap-2 bg-[#050c18] p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-slate-300">
          <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">{game.players}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">{game.duration}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{game.rating || 'Ages 7+'}</span>
        </div>
      </div>

      {/* Quick Rules & Objective Highlights */}
      <div className="bg-[#06101e] rounded-xl p-2.5 border border-cyan-900/60 flex flex-col gap-1">
        <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Rules & Objective:
        </span>
        <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
          {game.rules.slice(0, 2).map((rule, idx) => (
            <li key={idx} className="leading-snug">
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={e => {
            e.stopPropagation();
            sound.playBoxOpen();
            onPlay();
          }}
          className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-900/60 flex items-center justify-center gap-1.5 transition-all hover:scale-102 active:scale-98"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Unbox & Play Now
        </button>

        <button
          onClick={e => {
            e.stopPropagation();
            sound.playButtonClick();
            onOpenRules();
          }}
          className="px-3.5 py-2.5 bg-[#0a182d] hover:bg-[#102747] text-cyan-300 text-xs font-bold uppercase rounded-xl border border-cyan-500/40 flex items-center gap-1 shadow-md transition-all hover:scale-102"
          title="Open Full Rules Manual"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Rules</span>
        </button>
      </div>
    </div>
  );
};
