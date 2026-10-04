import React from 'react';
import { GameMetadata, GameBoxArtOverride } from '../types';
import { sound } from '../utils/audio';
import { Play } from 'lucide-react';

interface BoardGameSpineBoxProps {
  game: GameMetadata;
  override?: GameBoxArtOverride;
  isHovered: boolean;
  onUnbox: () => void;
}

export const BoardGameSpineBox: React.FC<BoardGameSpineBoxProps> = ({
  game,
  override,
  isHovered,
  onUnbox
}) => {
  const gameId = game.id;

  return (
    <div
      onClick={onUnbox}
      className={`relative w-full h-14 sm:h-16 md:h-18 select-none cursor-pointer rounded-lg overflow-hidden transition-all duration-200 border-2 shadow-2xl flex items-center justify-between ${
        isHovered
          ? 'scale-[1.015] -translate-y-1 shadow-[0_12px_30px_rgba(0,0,0,0.9)] ring-2 ring-white/60 z-30'
          : 'shadow-[0_6px_16px_rgba(0,0,0,0.7)] z-10'
      } ${
        gameId === 'battleship'
          ? 'bg-[#081829] border-[#1f3c58]'
          : gameId === 'connect4'
          ? 'bg-[#d8971f] border-[#f3b544]'
          : gameId === 'trivia'
          ? 'bg-[#291338] border-[#4c2966]'
          : gameId === 'poker'
          ? 'bg-[#3b0f0f] border-[#6b2222]'
          : gameId === 'casino'
          ? 'bg-[#0d3420] border-[#1d5e3c]'
          : 'bg-[#23150c] border-[#4a2e1b]'
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* 1. CUSTOM UPLOADED IMAGE WRAP OVERLAY (IF PROVIDED BY USER)  */}
      {/* ------------------------------------------------------------- */}
      {override?.coverImageUrl || override?.spineImageUrl ? (
        <div className="absolute inset-0 z-0">
          <img
            src={override.spineImageUrl || override.coverImageUrl}
            alt={game.title}
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-black/80" />
        </div>
      ) : null}

      {/* ------------------------------------------------------------- */}
      {/* 2. REALISTIC CARDBOARD WEAR, SEAMS, CORNER SCUFFS & SHEEN    */}
      {/* ------------------------------------------------------------- */}
      {/* Top Edge Cardboard Crease Highlight */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-white/30 via-white/70 to-white/20 pointer-events-none z-20" />
      {/* Bottom Edge Shadow Crease */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-black/80 via-black/50 to-black/80 pointer-events-none z-20" />
      {/* Left/Right Corner Cardboard Bevels */}
      <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-gradient-to-b from-white/30 via-transparent to-black/60 pointer-events-none z-20" />
      <div className="absolute top-0 bottom-0 right-0 w-[4px] bg-gradient-to-b from-white/20 via-transparent to-black/70 pointer-events-none z-20" />
      {/* Scratched / Distressed Cardboard Grain Texture */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none mix-blend-overlay z-10"
        style={{
          backgroundImage:
            'radial-gradient(circle, #fff 1px, transparent 1px), radial-gradient(circle, #000 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 8px 8px'
        }}
      />

      {/* ============================================================= */}
      {/* 3. DEFAULT FULL-WRAP EMBEDDED ARTWORK MATCHING REFERENCE      */}
      {/* ============================================================= */}
      {!override?.coverImageUrl && !override?.spineImageUrl && (
        <>
          {/* A. BATTLESHIP BACKGROUND ART */}
          {gameId === 'battleship' && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              {/* Stormy sea gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#071320] via-[#0d2238] to-[#081525]" />
              {/* Naval Warship firing cannon at center */}
              <div className="absolute inset-0 flex items-center justify-center translate-x-4 sm:translate-x-12 opacity-85">
                <svg viewBox="0 0 400 70" className="h-full w-auto">
                  {/* Sky Clouds & Stars */}
                  <path d="M 120 10 Q 180 5 240 12 Q 320 8 380 18 L 400 40 L 100 40 Z" fill="#17314d" opacity="0.5" />
                  {/* Distant Fighter Jet */}
                  <path d="M 280 14 L 295 16 L 305 15 L 298 18 L 290 17 Z" fill="#94a3b8" />
                  <line x1="288" y1="18" x2="270" y2="20" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
                  {/* Battleship Hull */}
                  <path d="M 140 54 L 175 42 L 310 42 L 340 54 L 320 58 L 160 58 Z" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                  {/* Superstructure & Bridge */}
                  <rect x="220" y="28" width="35" height="15" rx="1" fill="#334155" />
                  <rect x="232" y="16" width="12" height="12" fill="#475569" />
                  <line x1="238" y1="10" x2="238" y2="16" stroke="#94a3b8" strokeWidth="1.5" />
                  {/* Main Gun Turret + Muzzle Explosion */}
                  <rect x="185" y="36" width="22" height="7" rx="1" fill="#0f172a" />
                  <line x1="165" y1="38" x2="185" y2="38" stroke="#cbd5e1" strokeWidth="2.5" />
                  {/* Explosive Cannon Blast Flash */}
                  <circle cx="160" cy="38" r="8" fill="#f59e0b" opacity="0.9" />
                  <circle cx="158" cy="38" r="5" fill="#fef08a" />
                  <path d="M 160 38 L 130 32 L 145 42 Z" fill="#f97316" opacity="0.8" />
                  {/* Ocean Wake & Waves */}
                  <path d="M 100 58 Q 200 52 300 58 T 400 58 L 400 70 L 100 70 Z" fill="#0369a1" opacity="0.7" />
                  <path d="M 130 60 Q 220 56 320 60" stroke="#e0f2fe" strokeWidth="1" strokeDasharray="6,3" opacity="0.8" />
                </svg>
              </div>
            </div>
          )}

          {/* B. CONNECT 4 BACKGROUND ART */}
          {gameId === 'connect4' && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-[#ca8a04] via-[#eab308] to-[#ca8a04]" />
              {/* Cardboard dust & action splash */}
              <div className="absolute inset-0 flex items-center justify-center translate-x-6 opacity-90">
                <svg viewBox="0 0 350 70" className="h-full w-auto">
                  {/* 3D Slanted Blue Vertical Grid Rack */}
                  <g transform="rotate(-6 180 35)">
                    <rect x="130" y="8" width="100" height="54" rx="6" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="2" />
                    {/* Grid Holes with Red & Yellow Discs */}
                    <circle cx="145" cy="22" r="6" fill="#ef4444" stroke="#fca5a5" strokeWidth="1" />
                    <circle cx="165" cy="22" r="6" fill="#ef4444" stroke="#fca5a5" strokeWidth="1" />
                    <circle cx="185" cy="22" r="6" fill="#eab308" stroke="#fef08a" strokeWidth="1" />
                    <circle cx="205" cy="22" r="6" fill="#1e3a8a" />
                    <circle cx="145" cy="38" r="6" fill="#eab308" stroke="#fef08a" strokeWidth="1" />
                    <circle cx="165" cy="38" r="6" fill="#eab308" stroke="#fef08a" strokeWidth="1" />
                    <circle cx="185" cy="38" r="6" fill="#ef4444" stroke="#fca5a5" strokeWidth="1" />
                    <circle cx="205" cy="38" r="6" fill="#eab308" stroke="#fef08a" strokeWidth="1" />
                    <circle cx="145" cy="52" r="6" fill="#ef4444" stroke="#fca5a5" strokeWidth="1" />
                    <circle cx="165" cy="52" r="6" fill="#eab308" stroke="#fef08a" strokeWidth="1" />
                    <circle cx="185" cy="52" r="6" fill="#ef4444" stroke="#fca5a5" strokeWidth="1" />
                    <circle cx="205" cy="52" r="6" fill="#ef4444" stroke="#fca5a5" strokeWidth="1" />
                  </g>
                </svg>
              </div>
            </div>
          )}

          {/* C. TRIVIA PARTY & MURDER MYSTERY ART */}
          {gameId === 'trivia' && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-[#3b0764] via-[#2e1065] to-[#1e1b4b]" />
              <div className="absolute inset-0 flex items-center justify-center translate-x-4 sm:translate-x-10 opacity-85">
                <svg viewBox="0 0 350 70" className="h-full w-auto">
                  {/* Movie Clapperboard */}
                  <g transform="rotate(-8 140 35)">
                    <rect x="120" y="20" width="36" height="32" rx="3" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
                    <rect x="120" y="14" width="36" height="8" rx="2" fill="#0f172a" stroke="#cbd5e1" strokeWidth="1.5" />
                    {/* Clapper stripes */}
                    <line x1="126" y1="14" x2="132" y2="22" stroke="#ffffff" strokeWidth="2.5" />
                    <line x1="138" y1="14" x2="144" y2="22" stroke="#ffffff" strokeWidth="2.5" />
                  </g>
                  {/* Popcorn Bucket */}
                  <polygon points="162,25 186,25 182,58 166,58" fill="#ef4444" stroke="#fca5a5" strokeWidth="1" />
                  <line x1="170" y1="25" x2="171" y2="58" stroke="#ffffff" strokeWidth="2" />
                  <line x1="178" y1="25" x2="177" y2="58" stroke="#ffffff" strokeWidth="2" />
                  {/* Fluffy Popcorn */}
                  <circle cx="168" cy="22" r="4" fill="#fef08a" />
                  <circle cx="174" cy="18" r="5" fill="#fef08a" />
                  <circle cx="180" cy="22" r="4" fill="#fef08a" />
                  {/* Murder Mystery Dossier + Magnifying Glass */}
                  <g transform="rotate(6 210 35)">
                    <rect x="195" y="16" width="32" height="42" rx="2" fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" />
                    <text x="198" y="26" fontSize="6" fontWeight="bold" fill="#78350f" fontFamily="sans-serif">MURDER</text>
                    <text x="198" y="33" fontSize="5" fontWeight="bold" fill="#dc2626" fontFamily="sans-serif">MYSTERY</text>
                    <line x1="198" y1="38" x2="222" y2="38" stroke="#92400e" strokeWidth="0.8" />
                    <line x1="198" y1="42" x2="218" y2="42" stroke="#92400e" strokeWidth="0.8" />
                    <line x1="198" y1="46" x2="224" y2="46" stroke="#92400e" strokeWidth="0.8" />
                    {/* Magnifying Glass */}
                    <circle cx="218" cy="38" r="8" fill="rgba(56,189,248,0.2)" stroke="#ca8a04" strokeWidth="1.5" />
                    <line x1="224" y1="44" x2="232" y2="52" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" />
                  </g>
                </svg>
              </div>
            </div>
          )}

          {/* D. TEXAS HOLD'EM POKER ART */}
          {gameId === 'poker' && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-[#450a0a] via-[#350707] to-[#200404]" />
              <div className="absolute inset-0 flex items-center justify-center translate-x-4 sm:translate-x-12 opacity-85">
                <svg viewBox="0 0 350 70" className="h-full w-auto">
                  {/* Clay Poker Chips Stacks */}
                  {/* Red Stack */}
                  <ellipse cx="140" cy="48" rx="9" ry="3.5" fill="#dc2626" stroke="#fca5a5" strokeWidth="0.8" />
                  <ellipse cx="140" cy="44" rx="9" ry="3.5" fill="#dc2626" stroke="#fca5a5" strokeWidth="0.8" />
                  <ellipse cx="140" cy="40" rx="9" ry="3.5" fill="#dc2626" stroke="#fca5a5" strokeWidth="0.8" />
                  <ellipse cx="140" cy="36" rx="9" ry="3.5" fill="#dc2626" stroke="#fca5a5" strokeWidth="0.8" />
                  {/* Blue Stack */}
                  <ellipse cx="152" cy="52" rx="9" ry="3.5" fill="#2563eb" stroke="#93c5fd" strokeWidth="0.8" />
                  <ellipse cx="152" cy="48" rx="9" ry="3.5" fill="#2563eb" stroke="#93c5fd" strokeWidth="0.8" />
                  <ellipse cx="152" cy="44" rx="9" ry="3.5" fill="#2563eb" stroke="#93c5fd" strokeWidth="0.8" />
                  {/* Green Stack */}
                  <ellipse cx="164" cy="56" rx="9" ry="3.5" fill="#16a34a" stroke="#86efac" strokeWidth="0.8" />
                  <ellipse cx="164" cy="52" rx="9" ry="3.5" fill="#16a34a" stroke="#86efac" strokeWidth="0.8" />

                  {/* Fanned Royal Flush Cards (10, J, Q, K, A of Hearts) */}
                  <g transform="rotate(-12 185 35)">
                    <rect x="175" y="16" width="16" height="24" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="177" y="24" fontSize="6" fontWeight="bold" fill="#dc2626" fontFamily="sans-serif">10</text>
                  </g>
                  <g transform="rotate(-6 195 35)">
                    <rect x="185" y="14" width="16" height="24" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="187" y="22" fontSize="6" fontWeight="bold" fill="#dc2626" fontFamily="sans-serif">J</text>
                  </g>
                  <g transform="rotate(0 205 35)">
                    <rect x="195" y="13" width="16" height="24" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="197" y="21" fontSize="6" fontWeight="bold" fill="#dc2626" fontFamily="sans-serif">Q</text>
                  </g>
                  <g transform="rotate(6 215 35)">
                    <rect x="205" y="14" width="16" height="24" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="207" y="22" fontSize="6" fontWeight="bold" fill="#dc2626" fontFamily="sans-serif">K</text>
                  </g>
                  <g transform="rotate(12 225 35)">
                    <rect x="215" y="16" width="16" height="24" rx="2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                    <text x="217" y="24" fontSize="7" fontWeight="bold" fill="#dc2626" fontFamily="sans-serif">A♥</text>
                  </g>
                </svg>
              </div>
            </div>
          )}

          {/* E. ROYAL CASINO & SLOTS ART */}
          {gameId === 'casino' && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-[#064e3b] via-[#043d2e] to-[#02241b]" />
              <div className="absolute inset-0 flex items-center justify-center translate-x-4 sm:translate-x-12 opacity-85">
                <svg viewBox="0 0 350 70" className="h-full w-auto">
                  {/* Mechanical 7-7-7 Slot Reels Box */}
                  <rect x="135" y="16" width="60" height="38" rx="4" fill="#0f172a" stroke="#ca8a04" strokeWidth="1.5" />
                  <rect x="140" y="20" width="14" height="28" rx="2" fill="#ffffff" stroke="#cbd5e1" />
                  <text x="144" y="38" fontSize="12" fontWeight="black" fill="#dc2626" fontFamily="sans-serif">7</text>
                  <rect x="158" y="20" width="14" height="28" rx="2" fill="#ffffff" stroke="#cbd5e1" />
                  <text x="162" y="38" fontSize="12" fontWeight="black" fill="#dc2626" fontFamily="sans-serif">7</text>
                  <rect x="176" y="20" width="14" height="28" rx="2" fill="#ffffff" stroke="#cbd5e1" />
                  <text x="180" y="38" fontSize="12" fontWeight="black" fill="#dc2626" fontFamily="sans-serif">7</text>
                  {/* Slot Machine Pull Arm */}
                  <line x1="195" y1="35" x2="204" y2="25" stroke="#94a3b8" strokeWidth="2.5" />
                  <circle cx="206" cy="23" r="4" fill="#ef4444" stroke="#fca5a5" strokeWidth="1" />

                  {/* Roulette Wheel */}
                  <g transform="translate(225, 35)">
                    <circle cx="0" cy="0" r="16" fill="#14532d" stroke="#ca8a04" strokeWidth="2" />
                    <circle cx="0" cy="0" r="10" fill="#450a0a" stroke="#eab308" strokeWidth="1" />
                    <line x1="-12" y1="0" x2="12" y2="0" stroke="#facc15" strokeWidth="1" />
                    <line x1="0" y1="-12" x2="0" y2="12" stroke="#facc15" strokeWidth="1" />
                    <circle cx="0" cy="0" r="4" fill="#ca8a04" />
                    <circle cx="6" cy="-4" r="1.5" fill="#ffffff" />
                  </g>
                </svg>
              </div>
            </div>
          )}

          {/* F. CHESS & CHECKERS ART */}
          {(gameId === 'chess' || gameId === 'checkers') && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-[#2e1b10] via-[#221309] to-[#150a04]" />
              <div className="absolute inset-0 flex items-center justify-center translate-x-4 sm:translate-x-12 opacity-85">
                <svg viewBox="0 0 350 70" className="h-full w-auto">
                  {/* Tilted Wood Board Surface */}
                  <polygon points="130,48 230,48 245,62 115,62" fill="#78350f" stroke="#451a03" strokeWidth="1" />
                  {/* Black Knight Chess Piece */}
                  <path d="M 138 52 C 136 40, 142 32, 148 30 C 146 36, 150 40, 152 44 L 152 52 Z" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                  {/* White King / Queen Pieces */}
                  <path d="M 160 52 L 160 30 L 158 24 L 164 20 L 170 24 L 168 30 L 168 52 Z" fill="#fef3c7" stroke="#b45309" strokeWidth="1" />
                  <circle cx="164" cy="18" r="2.5" fill="#facc15" />
                  {/* White Bishop / Pawns */}
                  <path d="M 175 52 L 175 36 L 180 32 L 185 36 L 185 52 Z" fill="#fef3c7" stroke="#b45309" strokeWidth="1" />
                  {/* Glossy Red & Black Checkers Chips */}
                  <ellipse cx="205" cy="46" rx="9" ry="3.5" fill="#dc2626" stroke="#fca5a5" strokeWidth="0.8" />
                  <ellipse cx="218" cy="50" rx="9" ry="3.5" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
                  <ellipse cx="210" cy="56" rx="9" ry="3.5" fill="#dc2626" stroke="#fca5a5" strokeWidth="0.8" />
                </svg>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================= */}
      {/* 4. EXACT TYPOGRAPHY, BRAND EMBLEM & SUBTITLES (LEFT SIDE)     */}
      {/* ============================================================= */}
      <div className="flex items-center gap-2 sm:gap-3.5 pl-3 sm:pl-4 relative z-20">
        {/* Brand Square Corner Box (MB / JACKBOX / ROYAL / CASINO / CLASSIC) */}
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-md flex flex-col items-center justify-center text-center shadow-lg border ${
            gameId === 'battleship'
              ? 'bg-[#061320] border-slate-700 text-white'
              : gameId === 'connect4'
              ? 'bg-[#0f172a] border-amber-900 text-white'
              : gameId === 'trivia'
              ? 'bg-[#1e102f] border-purple-800 text-white'
              : gameId === 'poker'
              ? 'bg-[#220707] border-rose-900 text-amber-300'
              : gameId === 'casino'
              ? 'bg-[#031c13] border-emerald-800 text-white'
              : 'bg-[#150a04] border-amber-900 text-amber-200'
          }`}
        >
          {gameId === 'battleship' && (
            <>
              <span className="text-[11px] sm:text-xs font-black tracking-tight leading-none">MB</span>
              <span className="text-[7px] font-bold text-slate-300 tracking-wider">GAMES</span>
            </>
          )}
          {gameId === 'connect4' && (
            <>
              <span className="text-[11px] sm:text-xs font-black tracking-tight leading-none text-white">MB</span>
              <span className="text-[7px] font-bold text-amber-400 tracking-wider">GAMES</span>
            </>
          )}
          {gameId === 'trivia' && (
            <>
              <span className="text-[9px] sm:text-[10px] font-black tracking-tight leading-none text-purple-200">JACKBOX</span>
              <span className="text-[7px] font-bold text-amber-300 tracking-wider">PARTY</span>
            </>
          )}
          {gameId === 'poker' && (
            <>
              <span className="text-[7px] text-amber-400">👑</span>
              <span className="text-[9px] sm:text-[10px] font-black tracking-tight leading-none text-amber-200">ROYAL</span>
              <span className="text-[6px] font-bold text-slate-300 tracking-wider">LOUNGE</span>
            </>
          )}
          {gameId === 'casino' && (
            <>
              <span className="text-[9px] sm:text-[10px] font-black tracking-tight leading-none text-emerald-200">CASINO</span>
              <span className="text-[6px] font-bold text-emerald-400 tracking-wider">DELUXE ◆</span>
            </>
          )}
          {(gameId === 'chess' || gameId === 'checkers') && (
            <>
              <span className="text-[7px] text-amber-400">♟️</span>
              <span className="text-[8px] sm:text-[9px] font-black tracking-tight leading-none text-amber-200">CLASSIC</span>
              <span className="text-[6px] font-bold text-amber-400 tracking-wider">EDITION</span>
            </>
          )}
        </div>

        {/* Title, Stars, and Subtitle Text Stack */}
        <div className="flex flex-col justify-center">
          {/* Main Title */}
          <div className="flex items-center gap-1.5">
            <h3
              className={`text-sm sm:text-lg md:text-xl font-black uppercase tracking-wider leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
                gameId === 'battleship'
                  ? 'text-white font-stencil'
                  : gameId === 'connect4'
                  ? 'text-amber-950 font-black'
                  : gameId === 'trivia'
                  ? 'text-white font-extrabold'
                  : gameId === 'poker'
                  ? 'text-white font-serif'
                  : gameId === 'casino'
                  ? 'text-amber-300 font-extrabold tracking-widest drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                  : 'text-amber-100 font-serif'
              }`}
            >
              {override?.customTitle || (
                gameId === 'battleship'
                  ? 'BATTLESHIP'
                  : gameId === 'connect4'
                  ? 'CONNECT 4'
                  : gameId === 'trivia'
                  ? 'TRIVIA PARTY & MURDER MYSTERY'
                  : gameId === 'poker'
                  ? "TEXAS HOLD'EM POKER"
                  : gameId === 'casino'
                  ? 'ROYAL CASINO & SLOTS'
                  : 'CHESS & CHECKERS'
              )}
            </h3>
          </div>

          {/* Subtitle with Star Bullets */}
          <p
            className={`text-[9px] sm:text-[10px] md:text-[11px] font-semibold tracking-wide truncate max-w-[200px] sm:max-w-[340px] md:max-w-[420px] ${
              gameId === 'connect4' ? 'text-amber-900' : 'text-slate-300'
            }`}
          >
            {override?.customSubtitle || (
              gameId === 'battleship'
                ? '★ THE CLASSIC NAVAL COMBAT GAME ★'
                : gameId === 'connect4'
                ? '✦ THE ORIGINAL VERTICAL FOUR-IN-A-ROW ✦'
                : gameId === 'trivia'
                ? '★ MOVIE QUOTES, GAME CONSOLES, KILLING FLOOR & CUSTOM AI PACKS ★'
                : gameId === 'poker'
                ? '◆ HIGH-STAKES OVAL ROOM & 5-CARD VIDEO POKER ◆'
                : gameId === 'casino'
                ? 'LUCKY 777 MECHANICAL SLOTS & EUROPEAN ROULETTE WHEEL'
                : '➔ GRANDMASTER MINIMAX AI & HAND CURSOR ANIMATIONS'
            )}
          </p>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 5. RIGHT SECTION: SLEEK UNBOX ACTION                          */}
      {/* ============================================================= */}
      <div className="flex items-center pr-3 sm:pr-4 relative z-20">
        {/* 3D Embossed "▶ UNBOX" Button */}
        <button
          onClick={e => {
            e.stopPropagation();
            sound.playBoxOpen();
            onUnbox();
          }}
          className={`px-3 sm:px-4 py-1.5 rounded-lg font-black uppercase text-[10px] sm:text-xs tracking-wider flex items-center gap-1.5 shadow-lg transition-all duration-200 border ${
            isHovered
              ? 'bg-amber-400 hover:bg-amber-300 text-black border-white scale-105 shadow-amber-400/50 ring-2 ring-white/60'
              : 'bg-black/60 hover:bg-black/80 text-white border-white/30'
          }`}
        >
          <Play className="w-3 h-3 fill-current" />
          <span>UNBOX</span>
        </button>
      </div>
    </div>
  );
};
