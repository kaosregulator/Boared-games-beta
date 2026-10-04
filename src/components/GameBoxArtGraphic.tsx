import React from 'react';
import { GameId } from '../types';
import { Anchor, Sparkles, Flame, Crown, Grid, Shield, Play } from 'lucide-react';

interface GameBoxArtGraphicProps {
  gameId: GameId;
  title: string;
  customImageUrl?: string;
  className?: string;
  variant?: 'front' | 'popout' | 'thumbnail';
}

export const GameBoxArtGraphic: React.FC<GameBoxArtGraphicProps> = ({
  gameId,
  title,
  customImageUrl,
  className = '',
  variant = 'front'
}) => {
  // If user provided a custom cover image URL, render with authentic box frame
  if (customImageUrl) {
    return (
      <div
        className={`relative rounded-xl overflow-hidden border-2 border-amber-900/60 shadow-2xl bg-black ${className}`}
      >
        <img
          src={customImageUrl}
          alt={title}
          className="w-full h-full object-cover object-center"
        />
        {/* Realistic Cardboard Box Texture & Gloss Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/20 pointer-events-none" />
        <div className="absolute inset-0 border border-white/20 rounded-xl pointer-events-none" />
        {/* MB / Classic Corner Emblem */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 border border-white/30 text-[8px] font-black text-white font-mono uppercase tracking-widest shadow-md">
          CLASSIC
        </div>
      </div>
    );
  }

  // Default Vector Graphic Box Art based on Game ID
  return (
    <div
      className={`relative rounded-xl overflow-hidden border-2 shadow-2xl flex flex-col justify-between p-3 sm:p-4 select-none ${className} ${
        gameId === 'battleship'
          ? 'bg-gradient-to-b from-[#0e243a] via-[#081525] to-[#030910] border-cyan-500/50'
          : gameId === 'connect4'
          ? 'bg-gradient-to-b from-[#fef08a] via-[#f59e0b] to-[#b45309] border-amber-500/60 text-amber-950'
          : gameId === 'trivia'
          ? 'bg-gradient-to-b from-[#3b0764] via-[#1e1035] to-[#0f071a] border-purple-500/50'
          : gameId === 'poker'
          ? 'bg-gradient-to-b from-[#450a0a] via-[#240505] to-[#120202] border-rose-500/50'
          : gameId === 'casino'
          ? 'bg-gradient-to-b from-[#064e3b] via-[#02281e] to-[#01140e] border-emerald-500/50'
          : gameId === 'chess' || gameId === 'checkers'
          ? 'bg-gradient-to-b from-[#2e1c10] via-[#1a0f08] to-[#0a0502] border-amber-700/50'
          : 'bg-gradient-to-b from-[#0f172a] to-[#020617] border-slate-700'
      }`}
    >
      {/* Glossy Plastic Box Wrap & Cardboard Crease Lighting */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/15 pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />

      {/* Top Header: MB Brand Logo & Player Age Badge */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-1.5">
          <div
            className={`px-1.5 py-0.5 rounded font-black text-[9px] tracking-tight ${
              gameId === 'connect4'
                ? 'bg-blue-600 text-white'
                : 'bg-red-600 text-white shadow-md'
            }`}
          >
            MB
          </div>
          <span
            className={`text-[8px] font-mono font-bold tracking-wider uppercase ${
              gameId === 'connect4' ? 'text-amber-950' : 'text-slate-300'
            }`}
          >
            GAMES
          </span>
        </div>

        <div
          className={`text-[8px] font-mono px-2 py-0.5 rounded border uppercase font-bold ${
            gameId === 'connect4'
              ? 'bg-amber-100/90 text-amber-900 border-amber-600/40'
              : 'bg-black/60 text-slate-300 border-white/20'
          }`}
        >
          Ages 7 to Adult
        </div>
      </div>

      {/* Center Artwork Scene */}
      <div className="my-auto py-2 flex flex-col items-center justify-center relative z-10">
        {gameId === 'battleship' && (
          <div className="w-full flex flex-col items-center">
            {/* Battleship Silhouette with Radar Ping */}
            <svg viewBox="0 0 160 50" className="w-40 h-14 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
              {/* Ocean Wave lines */}
              <path d="M 0 42 Q 40 38 80 42 T 160 42 L 160 50 L 0 50 Z" fill="#0284c7" opacity="0.6" />
              {/* Warship Hull */}
              <path d="M 15 36 L 25 24 L 135 24 L 148 36 Z" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
              {/* Radar Tower & Gun Turrets */}
              <rect x="50" y="14" width="22" height="10" rx="1" fill="#334155" />
              <rect x="58" y="4" width="6" height="10" fill="#64748b" />
              <line x1="52" y1="4" x2="70" y2="4" stroke="#38bdf8" strokeWidth="2" />
              {/* Forward Turret Barrels */}
              <rect x="28" y="20" width="16" height="4" rx="1" fill="#1e293b" />
              <line x1="18" y1="22" x2="28" y2="22" stroke="#cbd5e1" strokeWidth="2" />
              {/* Aft Turret Barrels */}
              <rect x="110" y="20" width="16" height="4" rx="1" fill="#1e293b" />
              <line x1="126" y1="22" x2="136" y2="22" stroke="#cbd5e1" strokeWidth="2" />
            </svg>
            <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest font-bold mt-1">
              Dual Radar Arrays • 10x10 Grid
            </span>
          </div>
        )}

        {gameId === 'connect4' && (
          <div className="w-full flex flex-col items-center">
            {/* Physical Vertical Blue Rack Illustration */}
            <div className="w-28 h-16 rounded-lg bg-blue-600 border-2 border-blue-400 p-1.5 shadow-xl grid grid-cols-4 gap-1 items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-red-600 border border-red-300 shadow" />
              <div className="w-4 h-4 rounded-full bg-yellow-400 border border-yellow-200 shadow" />
              <div className="w-4 h-4 rounded-full bg-red-600 border border-red-300 shadow" />
              <div className="w-4 h-4 rounded-full bg-red-600 border border-red-300 shadow" />
              <div className="w-4 h-4 rounded-full bg-yellow-400 border border-yellow-200 shadow" />
              <div className="w-4 h-4 rounded-full bg-red-600 border border-red-300 shadow" />
              <div className="w-4 h-4 rounded-full bg-yellow-400 border border-yellow-200 shadow" />
              <div className="w-4 h-4 rounded-full bg-yellow-400 border border-yellow-200 shadow" />
            </div>
            <span className="text-[10px] font-mono text-amber-950 uppercase tracking-wider font-extrabold mt-1">
              Vertical 4-In-A-Row
            </span>
          </div>
        )}

        {gameId === 'trivia' && (
          <div className="w-full flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-purple-900/80 border border-purple-400 flex items-center justify-center text-amber-300 shadow-xl mb-1">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <span className="text-[10px] font-mono text-purple-200 uppercase font-bold">
              Murder Mystery & Movie Trivia
            </span>
          </div>
        )}

        {gameId === 'poker' && (
          <div className="w-full flex flex-col items-center text-center">
            <div className="flex items-center gap-1 mb-1">
              <div className="w-7 h-10 rounded bg-white text-black border border-slate-300 flex flex-col items-center justify-center font-bold text-[10px] shadow">
                <span>A</span>
                <span className="text-red-600 text-[8px]">♥</span>
              </div>
              <div className="w-7 h-10 rounded bg-white text-black border border-slate-300 flex flex-col items-center justify-center font-bold text-[10px] shadow rotate-6">
                <span>K</span>
                <span className="text-black text-[8px]">♠</span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-rose-300 uppercase font-bold">
              High-Stakes Oval Table
            </span>
          </div>
        )}

        {gameId === 'casino' && (
          <div className="w-full flex flex-col items-center text-center">
            <div className="px-3 py-1 rounded bg-black/80 border border-emerald-400 font-mono text-emerald-400 font-black text-sm tracking-widest shadow-lg mb-1">
              7 • 7 • 7
            </div>
            <span className="text-[10px] font-mono text-emerald-300 uppercase font-bold">
              Neon Slots & European Roulette
            </span>
          </div>
        )}

        {gameId === 'chess' && (
          <div className="w-full flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-black/60 border border-amber-600/60 flex items-center justify-center text-amber-300 shadow-xl mb-1">
              <Crown className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-mono text-amber-300 uppercase font-bold">
              Grandmaster Staunton Chess
            </span>
          </div>
        )}
      </div>

      {/* Bottom Title Banner */}
      <div className="relative z-10 border-t border-white/20 pt-1.5 flex items-center justify-between">
        <h4
          className={`text-xs sm:text-sm font-black uppercase tracking-wider ${
            gameId === 'connect4' ? 'text-amber-950' : 'text-white'
          }`}
        >
          {title}
        </h4>
        <span
          className={`text-[8px] font-mono uppercase font-bold ${
            gameId === 'connect4' ? 'text-amber-900' : 'text-slate-400'
          }`}
        >
          2 Players
        </span>
      </div>
    </div>
  );
};
