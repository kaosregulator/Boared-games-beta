import React from 'react';
import { Lock, Sparkles, Clock, AlertCircle } from 'lucide-react';
import { sound } from '../utils/audio';

export interface ComingSoonBoxMeta {
  id: string;
  packId: 'pack2' | 'pack3';
  brand: string;
  brandSub: string;
  title: string;
  subtitle: string;
  themeColor: string;
  borderColor: string;
  accentGradient: string;
  badge: string;
  players: string;
  age: string;
  expectedDate?: string;
}

interface ComingSoonSpineBoxProps {
  box: ComingSoonBoxMeta;
  onClick: () => void;
}

export const ComingSoonSpineBox: React.FC<ComingSoonSpineBoxProps> = ({ box, onClick }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      onClick={() => {
        sound.playButtonClick();
        onClick();
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        sound.playShelfSlide();
      }}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative w-full h-14 sm:h-16 md:h-18 select-none cursor-pointer rounded-lg overflow-hidden transition-all duration-200 border-2 shadow-2xl flex items-center justify-between ${
        isHovered
          ? 'scale-[1.015] -translate-y-1 shadow-[0_12px_30px_rgba(0,0,0,0.9)] ring-2 ring-cyan-400/60 z-30'
          : 'shadow-[0_6px_16px_rgba(0,0,0,0.7)] z-10'
      } ${box.themeColor} ${box.borderColor}`}
    >
      {/* Background Graphic Layer */}
      <div className={`absolute inset-0 bg-gradient-to-r ${box.accentGradient} opacity-40`} />

      {/* 2. REALISTIC CARDBOARD WEAR, SEAMS, CORNER SCUFFS & SHEEN */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-white/30 via-white/70 to-white/20 pointer-events-none z-20" />
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-black/80 via-black/50 to-black/80 pointer-events-none z-20" />
      <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-gradient-to-b from-white/30 via-transparent to-black/60 pointer-events-none z-20" />
      <div className="absolute top-0 bottom-0 right-0 w-[4px] bg-gradient-to-b from-white/20 via-transparent to-black/70 pointer-events-none z-20" />
      <div
        className="absolute inset-0 opacity-15 pointer-events-none mix-blend-overlay z-10"
        style={{
          backgroundImage:
            'radial-gradient(circle, #fff 1px, transparent 1px), radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 8px 8px'
        }}
      />

      {/* Left: Brand Corner Box + Titles */}
      <div className="flex items-center gap-2 sm:gap-3.5 pl-3 sm:pl-4 relative z-20">
        {/* Brand Stamp */}
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md flex flex-col items-center justify-center text-center shadow-lg border bg-black/60 border-white/20 text-white">
          <span className="text-[10px] sm:text-[11px] font-black tracking-tight leading-none text-cyan-300">
            {box.brand}
          </span>
          <span className="text-[6px] sm:text-[7px] font-bold text-slate-300 tracking-wider">
            {box.brandSub}
          </span>
        </div>

        {/* Title and Subtitle */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wider leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {box.title}
            </h3>
            <span className="hidden md:inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
              COMING SOON
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] md:text-[11px] font-semibold text-slate-300 tracking-wide truncate max-w-[200px] sm:max-w-[340px] md:max-w-[420px]">
            {box.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Coming Soon Badge & Teaser Action */}
      <div className="flex items-center gap-2 sm:gap-3 pr-3 sm:pr-4 relative z-20">
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/60 border border-white/20 text-amber-300 text-[9px] font-mono font-extrabold uppercase">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>COMING SOON</span>
        </div>

        <button
          onClick={e => {
            e.stopPropagation();
            sound.playButtonClick();
            onClick();
          }}
          className={`px-3 sm:px-4 py-1.5 rounded-lg font-black uppercase text-[10px] sm:text-xs tracking-wider flex items-center gap-1.5 shadow-lg transition-all duration-200 border ${
            isHovered
              ? 'bg-amber-400 text-black border-white scale-105 shadow-amber-400/50'
              : 'bg-black/70 text-amber-300 border-amber-400/30'
          }`}
        >
          <Lock className="w-3 h-3" />
          <span>PREVIEW</span>
        </button>
      </div>
    </div>
  );
};
