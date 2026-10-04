import React from 'react';
import { MiniAvatarConfig } from '../types';

export interface MiniAvatarFigureProps {
  config?: MiniAvatarConfig;
  mood?: 'idle' | 'thinking' | 'celebrate' | 'worried';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'table';
  facing?: 'left' | 'right' | 'front';
  playerName?: string;
  isAI?: boolean;
}

export const DEFAULT_AVATAR_CONFIG: MiniAvatarConfig = {
  skinTone: '#fcd34d', // warm golden tan
  hairStyle: 'retro_shag',
  hairColor: '#451a03', // dark brunette
  faceExpression: 'focused',
  outfitType: 'retro_hoodie',
  outfitColor: '#dc2626', // ruby red
  headwear: 'retro_cap_backward',
  accessory: 'headphones'
};

export const AI_OPPONENT_CONFIG: MiniAvatarConfig = {
  skinTone: '#fed7aa',
  hairStyle: 'pompadour',
  hairColor: '#1e293b',
  faceExpression: 'cool_shades',
  outfitType: 'leather_jacket',
  outfitColor: '#0f172a',
  headwear: 'aviator_shades',
  accessory: 'gold_chain'
};

export const MiniAvatarFigure: React.FC<MiniAvatarFigureProps> = ({
  config = DEFAULT_AVATAR_CONFIG,
  mood = 'idle',
  size = 'md',
  facing = 'front',
  playerName,
  isAI = false
}) => {
  const avatar = config || DEFAULT_AVATAR_CONFIG;

  const sizeClasses = {
    xs: 'w-8 h-10',
    sm: 'w-12 h-16',
    table: 'w-20 h-28 sm:w-24 sm:h-32',
    md: 'w-24 h-32',
    lg: 'w-44 h-56'
  }[size];

  const moodAnimation = {
    idle: 'animate-subtle-bob',
    thinking: 'animate-pulse',
    celebrate: 'animate-bounce',
    worried: 'animate-wiggle'
  }[mood];

  return (
    <div className={`relative flex flex-col items-center select-none ${sizeClasses}`}>
      {/* Dynamic Thought / Speech Bubble on special moods */}
      {mood === 'celebrate' && (
        <div className="absolute -top-7 z-30 px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black uppercase tracking-wider shadow-lg animate-bounce whitespace-nowrap">
          {isAI ? 'CHECKMATE!' : 'CONNECT 4! 🎉'}
        </div>
      )}
      {mood === 'worried' && (
        <div className="absolute -top-7 z-30 px-2 py-0.5 rounded-full bg-amber-500 text-black text-[9px] font-black uppercase tracking-wider shadow-lg animate-pulse whitespace-nowrap">
          {isAI ? 'THREAT DETECTED! ⚠️' : 'UH OH... ⚡'}
        </div>
      )}
      {mood === 'thinking' && (
        <div className="absolute -top-7 z-30 px-2 py-0.5 rounded-full bg-cyan-600 text-white text-[9px] font-bold uppercase tracking-wider shadow-lg animate-pulse whitespace-nowrap">
          Thinking... 🧠
        </div>
      )}

      {/* SVG Cartoon Figure (Head, Hair, Eyes/Shades, Outfit, Accessories) */}
      <div
        className={`w-full h-full relative flex items-center justify-center transition-transform duration-300 ${moodAnimation} ${
          facing === 'left' ? 'scale-x-[-1]' : ''
        }`}
      >
        <svg
          viewBox="0 0 100 120"
          className="w-full h-full filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] overflow-visible"
        >
          {/* Subtle Glow Ring behind avatar */}
          <circle
            cx="50"
            cy="55"
            r="42"
            fill={isAI ? 'rgba(234, 179, 8, 0.12)' : 'rgba(239, 68, 68, 0.15)'}
            className="animate-pulse"
          />

          {/* 1. TORSO & OUTFIT */}
          <g id="torso">
            {/* Base Body / Shoulders */}
            <path
              d="M 22 92 C 22 68, 78 68, 78 92 L 84 118 C 84 120, 16 120, 16 118 Z"
              fill={avatar.outfitColor || '#dc2626'}
              stroke="#0f172a"
              strokeWidth="3.5"
              strokeLinejoin="round"
            />

            {/* Outfit Detailing */}
            {avatar.outfitType === 'retro_hoodie' && (
              <>
                {/* Hoodie Pocket & Drawstrings */}
                <path
                  d="M 34 100 L 66 100 L 62 118 L 38 118 Z"
                  fill="rgba(0,0,0,0.2)"
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                <line x1="44" y1="72" x2="42" y2="88" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="56" y1="72" x2="58" y2="88" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                {/* Hoodie Collar */}
                <path
                  d="M 36 68 C 42 76, 58 76, 64 68"
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth="3"
                />
              </>
            )}

            {avatar.outfitType === 'leather_jacket' && (
              <>
                {/* Leather Lapels */}
                <path
                  d="M 30 70 L 44 88 L 32 94 Z"
                  fill="#1e293b"
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                <path
                  d="M 70 70 L 56 88 L 68 94 Z"
                  fill="#1e293b"
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                {/* Center zipper */}
                <line x1="50" y1="84" x2="50" y2="118" stroke="#cbd5e1" strokeWidth="2.5" strokeDasharray="3,2" />
              </>
            )}

            {avatar.outfitType === 'arcade_tee' && (
              <>
                {/* Pixel Space Invader Graphic on chest */}
                <rect x="42" y="82" width="16" height="12" rx="2" fill="#0f172a" />
                <circle cx="47" cy="88" r="1.5" fill="#38bdf8" />
                <circle cx="53" cy="88" r="1.5" fill="#38bdf8" />
                <rect x="45" y="85" width="10" height="2" fill="#38bdf8" />
              </>
            )}

            {avatar.outfitType === 'varsity_jacket' && (
              <>
                {/* Sleeves in contrast white */}
                <path d="M 22 84 C 20 95, 18 108, 16 118" stroke="#f8fafc" strokeWidth="7" strokeLinecap="round" />
                <path d="M 78 84 C 80 95, 82 108, 84 118" stroke="#f8fafc" strokeWidth="7" strokeLinecap="round" />
                {/* Letter Patch */}
                <text x="32" y="90" fontSize="11" fontWeight="bold" fill="#facc15" fontFamily="sans-serif">
                  C4
                </text>
              </>
            )}

            {/* Accessory: Gold Chain */}
            {avatar.accessory === 'gold_chain' && (
              <path
                d="M 38 72 C 44 88, 56 88, 62 72"
                fill="none"
                stroke="#facc15"
                strokeWidth="3"
                strokeLinecap="round"
              />
            )}
          </g>

          {/* 2. NECK & HEAD */}
          <g id="head">
            {/* Neck */}
            <rect
              x="42"
              y="58"
              width="16"
              height="15"
              fill={avatar.skinTone || '#fcd34d'}
              stroke="#0f172a"
              strokeWidth="3"
            />

            {/* Head Contour (Cute rounded chunky chibi proportion) */}
            <rect
              x="25"
              y="18"
              width="50"
              height="46"
              rx="20"
              fill={avatar.skinTone || '#fcd34d'}
              stroke="#0f172a"
              strokeWidth="3.5"
            />

            {/* Ears */}
            <circle cx="24" cy="40" r="5" fill={avatar.skinTone || '#fcd34d'} stroke="#0f172a" strokeWidth="2.5" />
            <circle cx="76" cy="40" r="5" fill={avatar.skinTone || '#fcd34d'} stroke="#0f172a" strokeWidth="2.5" />

            {/* Cheeks Blush */}
            <circle cx="34" cy="48" r="4" fill="rgba(239, 68, 68, 0.3)" />
            <circle cx="66" cy="48" r="4" fill="rgba(239, 68, 68, 0.3)" />

            {/* 3. FACIAL EXPRESSION */}
            {/* Cool Sunglasses */}
            {avatar.faceExpression === 'cool_shades' || avatar.headwear === 'aviator_shades' ? (
              <g id="shades">
                <rect x="30" y="32" width="18" height="14" rx="4" fill="#090d16" stroke="#000000" strokeWidth="2" />
                <rect x="52" y="32" width="18" height="14" rx="4" fill="#090d16" stroke="#000000" strokeWidth="2" />
                <line x1="48" y1="36" x2="52" y2="36" stroke="#000000" strokeWidth="3" />
                {/* Glare shine */}
                <line x1="33" y1="35" x2="43" y2="43" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="55" y1="35" x2="65" y2="43" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
              </g>
            ) : avatar.faceExpression === 'retro_glasses' ? (
              <g id="glasses">
                <circle cx="38" cy="38" r="8" fill="none" stroke="#0f172a" strokeWidth="2.5" />
                <circle cx="62" cy="38" r="8" fill="none" stroke="#0f172a" strokeWidth="2.5" />
                <line x1="46" y1="38" x2="54" y2="38" stroke="#0f172a" strokeWidth="2.5" />
                {/* Eyes behind glass */}
                <circle cx="38" cy="38" r="2.5" fill="#0f172a" />
                <circle cx="62" cy="38" r="2.5" fill="#0f172a" />
              </g>
            ) : (
              /* Standard Cartoon Eyes */
              <g id="eyes">
                {/* Eyebrows */}
                {mood === 'worried' ? (
                  <>
                    <line x1="32" y1="31" x2="44" y2="28" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="56" y1="28" x2="68" y2="31" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <line x1="32" y1="30" x2="44" y2="32" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="56" y1="32" x2="68" y2="30" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
                  </>
                )}

                {/* Eyes */}
                {mood === 'celebrate' ? (
                  <>
                    {/* Happy squint arcs */}
                    <path d="M 33 38 Q 38 33 43 38" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                    <path d="M 57 38 Q 62 33 67 38" fill="none" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
                  </>
                ) : (
                  <>
                    <ellipse cx="38" cy="38" rx="3.5" ry="4.5" fill="#0f172a" />
                    <circle cx="39.5" cy="36.5" r="1.5" fill="#ffffff" />
                    <ellipse cx="62" cy="38" rx="3.5" ry="4.5" fill="#0f172a" />
                    <circle cx="63.5" cy="36.5" r="1.5" fill="#ffffff" />
                  </>
                )}
              </g>
            )}

            {/* Mouth */}
            {mood === 'celebrate' || avatar.faceExpression === 'smiling' ? (
              <path
                d="M 40 50 Q 50 60 60 50 Z"
                fill="#e11d48"
                stroke="#0f172a"
                strokeWidth="2.5"
              />
            ) : mood === 'worried' ? (
              <path
                d="M 42 54 Q 50 48 58 54"
                fill="none"
                stroke="#0f172a"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ) : (
              /* Focused / Smirking */
              <path
                d="M 44 51 Q 52 53 56 49"
                fill="none"
                stroke="#0f172a"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}
          </g>

          {/* 4. HAIRSTYLES */}
          <g id="hair">
            {avatar.hairStyle === 'retro_shag' && (
              <path
                d="M 23 34 C 20 10, 80 10, 77 34 C 74 22, 60 18, 50 20 C 40 18, 26 22, 23 34 Z"
                fill={avatar.hairColor || '#451a03'}
                stroke="#0f172a"
                strokeWidth="3"
                strokeLinejoin="round"
              />
            )}

            {avatar.hairStyle === 'pompadour' && (
              <path
                d="M 24 30 C 20 6, 80 4, 76 30 C 70 12, 54 8, 48 10 C 36 8, 28 14, 24 30 Z"
                fill={avatar.hairColor || '#1e293b'}
                stroke="#0f172a"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
            )}

            {avatar.hairStyle === 'curly' && (
              <g fill={avatar.hairColor || '#451a03'} stroke="#0f172a" strokeWidth="2.5">
                <circle cx="28" cy="22" r="9" />
                <circle cx="42" cy="16" r="10" />
                <circle cx="58" cy="16" r="10" />
                <circle cx="72" cy="22" r="9" />
                <circle cx="32" cy="28" r="7" />
                <circle cx="68" cy="28" r="7" />
              </g>
            )}

            {avatar.hairStyle === 'punk_spiky' && (
              <path
                d="M 26 30 L 32 10 L 40 22 L 50 6 L 60 22 L 68 10 L 74 30 Z"
                fill={avatar.hairColor || '#ec4899'}
                stroke="#0f172a"
                strokeWidth="3"
                strokeLinejoin="round"
              />
            )}
          </g>

          {/* 5. HEADWEAR & ACCESSORIES */}
          <g id="headwear">
            {avatar.headwear === 'retro_cap_backward' && (
              <g>
                {/* Backward Cap Dome & Snapback Tab */}
                <path
                  d="M 24 28 C 24 10, 76 10, 76 28 Z"
                  fill="#3b82f6"
                  stroke="#0f172a"
                  strokeWidth="3"
                />
                {/* Back Brim Visor */}
                <path
                  d="M 38 28 L 62 28 L 66 33 L 34 33 Z"
                  fill="#1d4ed8"
                  stroke="#0f172a"
                  strokeWidth="2"
                />
                {/* Snapback Plastic Holes */}
                <circle cx="48" cy="24" r="1" fill="#ffffff" />
                <circle cx="52" cy="24" r="1" fill="#ffffff" />
              </g>
            )}

            {avatar.headwear === 'headphones' || avatar.accessory === 'headphones' ? (
              <g id="headphones">
                {/* Over-ear Band */}
                <path
                  d="M 20 40 C 18 10, 82 10, 80 40"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                {/* Ear Cups */}
                <rect x="16" y="32" width="9" height="18" rx="4" fill="#ef4444" stroke="#0f172a" strokeWidth="2.5" />
                <rect x="75" y="32" width="9" height="18" rx="4" fill="#ef4444" stroke="#0f172a" strokeWidth="2.5" />
              </g>
            ) : null}
          </g>
        </svg>
      </div>

      {/* Player Name Badge under figure */}
      {playerName && (
        <div className="mt-1 px-2.5 py-0.5 rounded-md bg-[#050c18]/90 border border-slate-700/80 backdrop-blur shadow-md flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              isAI ? 'bg-amber-400 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider font-mono truncate max-w-[90px]">
            {playerName}
          </span>
        </div>
      )}
    </div>
  );
};
