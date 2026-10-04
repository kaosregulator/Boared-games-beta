import React from 'react';
import { GameMetadata } from '../types';
import { sound } from '../utils/audio';
import { Play, Users, Clock, Sparkles } from 'lucide-react';

interface GameCardProps {
  game: GameMetadata;
  onSelect: (game: GameMetadata) => void;
}

export const GameCard: React.FC<GameCardProps> = ({ game, onSelect }) => {
  return (
    <div
      onClick={() => {
        sound.playShelfSlide();
        onSelect(game);
      }}
      className="group relative cursor-pointer transform perspective-1000 transition-all duration-300 hover:-translate-y-2"
    >
      {/* Sleek 3D Box Styling */}
      <div
        className={`w-full h-84 rounded-2xl bg-gradient-to-br ${game.boxColor} p-6 border border-slate-700/70 shadow-[0_20px_40px_rgba(0,0,0,0.6)] flex flex-col justify-between relative overflow-hidden group-hover:border-blue-500/80 group-hover:shadow-[0_25px_50px_rgba(59,130,246,0.25)] transition-all`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Glow Shimmer Effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Box Header */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-[2px] bg-blue-500/20 text-blue-300 border border-blue-400/40">
              {game.badge}
            </span>
            <span className="text-2xl filter drop-shadow">
              {game.id === 'battleship' && '⚓'}
              {game.id === 'connect4' && '🔴'}
              {game.id === 'chess' && '♟️'}
              {game.id === 'checkers' && '🔴'}
              {game.id === 'blackjack' && '♠️'}
              {game.id === 'gofish' && '🎣'}
              {game.id === 'pawnrush' && '✨'}
              {game.id === 'liarsdice' && '🎲'}
            </span>
          </div>

          <h3 className="text-xl font-bold text-white group-hover:text-blue-200 transition-colors leading-tight tracking-wide">
            {game.title}
          </h3>
          <p className="text-xs text-slate-300 font-medium mt-1 line-clamp-2 leading-relaxed">
            {game.subtitle}
          </p>
        </div>

        {/* Mid Stats Tag */}
        <div className="relative z-10 my-auto bg-slate-900/80 border border-slate-700/60 rounded-xl p-3 backdrop-blur-sm">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-1.5 font-medium">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>{game.players}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{game.duration}</span>
            </div>
          </div>
        </div>

        {/* Box Footer & Action Button */}
        <div className="relative z-10 flex items-center justify-between pt-3 border-t border-slate-700/60">
          <span className="text-xs font-semibold text-blue-300 font-mono">{game.rating}</span>

          <button className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider text-xs flex items-center gap-2 shadow-lg shadow-blue-900/40 group-hover:scale-105 transition-all">
            <Play className="w-3 h-3 fill-current" />
            Unbox & Play
          </button>
        </div>
      </div>

      {/* Shelf Shadow */}
      <div className="w-4/5 mx-auto h-3 bg-black/70 rounded-full blur-md -mt-1 group-hover:scale-105 transition-transform" />
    </div>
  );
};
