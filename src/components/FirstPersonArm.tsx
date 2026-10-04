import React from 'react';
import { MiniAvatarConfig } from '../types';

interface FirstPersonArmProps {
  targetCol: number | null;
  totalCols: number;
  isDropping: boolean;
  discColor?: 'red' | 'yellow';
  avatarConfig?: MiniAvatarConfig;
}

export const FirstPersonArm: React.FC<FirstPersonArmProps> = ({
  targetCol,
  totalCols = 7,
  isDropping,
  discColor = 'red',
  avatarConfig
}) => {
  // If no column is hovered and not dropping, park arm slightly at the bottom
  const colIndex = targetCol !== null ? targetCol : Math.floor(totalCols / 2);
  const colPercent = ((colIndex + 0.5) / totalCols) * 100;

  const skinTone = avatarConfig?.skinTone || '#fcd34d';
  const sleeveColor = avatarConfig?.outfitColor || '#dc2626';

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden select-none">
      {/* Dynamic Arm Positioner tracking column cursor */}
      <div
        className="absolute bottom-0 transition-all duration-200 ease-out flex flex-col items-center"
        style={{
          left: `${colPercent}%`,
          transform: `translateX(-50%) ${
            isDropping ? 'translateY(-30px) scale(1.05)' : targetCol !== null ? 'translateY(0px)' : 'translateY(60px)'
          }`
        }}
      >
        {/* SEMI-TRANSLUCENT / SEE-THROUGH FIRST-PERSON ARM (SVG) */}
        <svg
          width="180"
          height="220"
          viewBox="0 0 180 220"
          className="filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)] opacity-85 transition-opacity duration-300"
          style={{ mixBlendMode: 'normal' }}
        >
          {/* Definitions: Glassmorphic gradients & translucent fills */}
          <defs>
            {/* Skin Tone Translucent Gradient */}
            <linearGradient id="armSkinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={skinTone} stopOpacity="0.85" />
              <stop offset="60%" stopColor={skinTone} stopOpacity="0.65" />
              <stop offset="100%" stopColor={skinTone} stopOpacity="0.4" />
            </linearGradient>

            {/* Sleeve Translucent Gradient */}
            <linearGradient id="armSleeveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={sleeveColor} stopOpacity="0.85" />
              <stop offset="80%" stopColor={sleeveColor} stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0.3" />
            </linearGradient>

            {/* Disc 3D Shiny Gradient */}
            <radialGradient id="armDiscRed" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="40%" stopColor="#ef4444" />
              <stop offset="90%" stopColor="#991b1b" />
              <stop offset="100%" stopColor="#450a0a" />
            </radialGradient>

            <radialGradient id="armDiscYellow" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="40%" stopColor="#eab308" />
              <stop offset="90%" stopColor="#a16207" />
              <stop offset="100%" stopColor="#422006" />
            </radialGradient>
          </defs>

          {/* 1. Forearm reaching upwards from bottom */}
          <path
            d="M 55 220 L 70 120 C 70 100, 110 100, 110 120 L 125 220 Z"
            fill="url(#armSleeveGrad)"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
            strokeDasharray="4,2"
          />

          {/* 2. Wrist and Hand (Semi-see-through glass glow) */}
          <path
            d="M 68 120 C 65 95, 74 70, 84 55 C 88 50, 92 50, 96 55 C 106 70, 115 95, 112 120 Z"
            fill="url(#armSkinGrad)"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="2"
          />

          {/* Hand Palm Line & Knuckles */}
          <path
            d="M 76 85 Q 90 92 104 85"
            fill="none"
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* 3. Fingers gripping the disc */}
          {/* Thumb */}
          <path
            d="M 68 75 C 64 65, 70 52, 78 48 C 82 55, 80 68, 76 78 Z"
            fill="url(#armSkinGrad)"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1.5"
          />

          {/* Index & Middle Fingers pinching disc top */}
          <path
            d="M 88 55 C 88 40, 94 32, 98 32 C 102 32, 106 40, 104 55 Z"
            fill="url(#armSkinGrad)"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1.5"
          />

          {/* 4. Weighted Ridged Plastic Disc held in hand (before drop) */}
          {!isDropping && (
            <g id="heldDisc" className="filter drop-shadow-lg">
              {/* Disc Body */}
              <circle
                cx="90"
                cy="30"
                r="22"
                fill={discColor === 'red' ? 'url(#armDiscRed)' : 'url(#armDiscYellow)'}
                stroke={discColor === 'red' ? '#f87171' : '#fde047'}
                strokeWidth="2"
              />
              {/* Inner Circular Ridge */}
              <circle
                cx="90"
                cy="30"
                r="14"
                fill="none"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="2"
                strokeDasharray="2,1"
              />
              {/* Center Finger Gripping Ring */}
              <circle
                cx="90"
                cy="30"
                r="6"
                fill={discColor === 'red' ? '#7f1d1d' : '#713f12'}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* Dropping Disc Flash Trail */}
          {isDropping && (
            <g id="dropTrail" className="animate-ping opacity-75">
              <circle
                cx="90"
                cy="15"
                r="18"
                fill={discColor === 'red' ? '#ef4444' : '#eab308'}
                opacity="0.8"
              />
            </g>
          )}
        </svg>

        {/* Floating "Click to Drop" prompt pill */}
        {targetCol !== null && !isDropping && (
          <div className="mt-[-15px] px-2.5 py-0.5 rounded-full bg-black/80 border border-white/30 text-[9px] font-black text-white uppercase tracking-widest backdrop-blur-md shadow-md animate-pulse">
            Drop Slot #{targetCol + 1} ⬇
          </div>
        )}
      </div>
    </div>
  );
};
