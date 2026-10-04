import React from 'react';

interface AnimatedHandProps {
  x: number;
  y: number;
  visible: boolean;
  action?: 'hover' | 'drop' | 'pinch' | 'slide' | 'point';
  holdingItem?: 'red_disc' | 'yellow_disc' | 'chess_piece' | 'checker_red' | 'checker_black' | 'card' | 'chip';
  label?: string;
  isEnemy?: boolean;
}

export const AnimatedHand: React.FC<AnimatedHandProps> = ({
  x,
  y,
  visible,
  action = 'hover',
  holdingItem,
  label,
  isEnemy = false
}) => {
  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed z-50 transition-all duration-300 ease-out"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: `translate(-50%, -50%) ${isEnemy ? 'rotate(180deg)' : ''} ${
          action === 'drop' ? 'scale(0.9) translateY(12px)' : action === 'pinch' ? 'scale(0.95)' : 'scale(1)'
        }`
      }}
    >
      {/* Hand Body Illustration with Shadow */}
      <div className="relative flex flex-col items-center">
        {/* Held Item */}
        {holdingItem === 'red_disc' && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-2 border-red-300 shadow-xl flex items-center justify-center -mb-4 z-20 animate-bounce">
            <div className="w-4 h-4 rounded-full border border-red-200/60" />
          </div>
        )}
        {holdingItem === 'yellow_disc' && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 border-2 border-yellow-200 shadow-xl flex items-center justify-center -mb-4 z-20 animate-bounce">
            <div className="w-4 h-4 rounded-full border border-yellow-100/60" />
          </div>
        )}
        {holdingItem === 'checker_red' && (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-rose-900 border-2 border-rose-400 shadow-xl flex items-center justify-center -mb-3 z-20">
            <div className="w-3.5 h-3.5 rounded-full border border-rose-300" />
          </div>
        )}
        {holdingItem === 'checker_black' && (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-900 to-neutral-950 border-2 border-slate-600 shadow-xl flex items-center justify-center -mb-3 z-20">
            <div className="w-3.5 h-3.5 rounded-full border border-slate-500" />
          </div>
        )}
        {holdingItem === 'card' && (
          <div className="w-8 h-12 rounded bg-white border border-slate-300 shadow-xl flex items-center justify-center text-xs font-bold text-red-600 -mb-4 z-20 rotate-6">
            🂠
          </div>
        )}
        {holdingItem === 'chip' && (
          <div className="w-7 h-7 rounded-full bg-emerald-600 border-2 border-dashed border-white shadow-xl flex items-center justify-center text-[9px] font-bold text-white -mb-3 z-20">
            $25
          </div>
        )}

        {/* Hand SVG Icon */}
        <div className="relative filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.6)]">
          <svg
            width="56"
            height="56"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transform -rotate-12"
          >
            {/* Wrist / Arm */}
            <path
              d="M20 60 L38 60 L36 42 L22 42 Z"
              fill="#fed7aa"
              stroke="#ea580c"
              strokeWidth="2"
            />
            {/* Palm */}
            <path
              d="M18 42 C14 36 16 26 22 24 C24 22 28 22 30 25 L34 25 C37 22 42 22 44 26 C47 28 48 35 44 42 Z"
              fill="#ffedd5"
              stroke="#ea580c"
              strokeWidth="2"
            />
            {/* Index Finger (reaching/pointing) */}
            <path
              d="M28 25 L28 10 C28 6 34 6 34 10 L34 25"
              fill="#ffedd5"
              stroke="#ea580c"
              strokeWidth="2"
            />
            {/* Middle Finger */}
            <path
              d="M34 25 L34 8 C34 4 40 4 40 8 L40 25"
              fill="#ffedd5"
              stroke="#ea580c"
              strokeWidth="2"
            />
            {/* Ring Finger */}
            <path
              d="M40 25 L40 12 C40 9 45 9 45 12 L45 27"
              fill="#fed7aa"
              stroke="#ea580c"
              strokeWidth="2"
            />
            {/* Thumb gripping */}
            <path
              d="M18 36 L12 28 C10 24 16 22 18 26 L22 34"
              fill="#ffedd5"
              stroke="#ea580c"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Hand Label Badge (e.g. "Captain's Move" / "AI Bot") */}
        {label && (
          <div className="mt-1 px-2 py-0.5 rounded-full bg-slate-900/90 border border-blue-400 text-[10px] font-bold text-blue-300 font-mono shadow-md whitespace-nowrap">
            {label}
          </div>
        )}
      </div>
    </div>
  );
};
