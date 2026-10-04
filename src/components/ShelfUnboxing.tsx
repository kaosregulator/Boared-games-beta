import React, { useEffect, useState } from 'react';
import { GameMetadata } from '../types';
import { sound } from '../utils/audio';
import { Sparkles, Play, RotateCcw, ShieldCheck, Box, Layers, Anchor, Gamepad2, Check } from 'lucide-react';

interface ShelfUnboxingProps {
  game: GameMetadata;
  onComplete: () => void;
  onBackToShelf: () => void;
}

export const ShelfUnboxing: React.FC<ShelfUnboxingProps> = ({ game, onComplete, onBackToShelf }) => {
  const [step, setStep] = useState<number>(0);
  const [isSkipped, setIsSkipped] = useState<boolean>(false);

  useEffect(() => {
    sound.playShelfSlide();

    // 1. Box placed on table
    const t1 = setTimeout(() => {
      setStep(1);
      sound.playBoxOpen();
    }, 1200);

    // 2. Lid lifts off
    const t2 = setTimeout(() => {
      setStep(2);
      sound.playBoardUnfold();
    }, 2400);

    // 3. Board Unfolds (tri-fold cardboard opening)
    const t3 = setTimeout(() => {
      setStep(3);
      sound.playCardFlip();
    }, 3600);

    // 4. Pieces mount & radar arrays activate
    const t4 = setTimeout(() => {
      setStep(4);
      sound.playPawnHop();
    }, 4800);

    // 5. Finished & Ready
    const t5 = setTimeout(() => {
      setStep(5);
      sound.playVictoryFanfare();
      onComplete();
    }, 6000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [game]);

  const handleSkip = () => {
    setIsSkipped(true);
    sound.playButtonClick();
    onComplete();
  };

  return (
    <div className="relative w-full h-full min-h-[660px] flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,#182538_0%,#080e1a_100%)] select-none text-white p-4">
      {/* Warm Banker's Lamp Ambient Overhead Spotlight */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Retro Wood Tabletop Desk Surface in Foreground */}
      <div
        className="absolute bottom-0 w-full h-64 bg-gradient-to-t from-[#0d0704] via-[#1a0f08] to-transparent border-b-8 border-[#0a0503] shadow-[0_-20px_50px_rgba(0,0,0,0.9)] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Top Header controls */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-30">
        <button
          onClick={onBackToShelf}
          className="px-4 py-2 rounded-xl bg-[#0a1424]/90 hover:bg-[#12233f] text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-[#1e3455] backdrop-blur transition-all shadow-md hover:scale-105"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          Back to Shelf
        </button>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-[2px] rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            Unfolding Board Game
          </span>
          <button
            onClick={handleSkip}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-900/40 transition-all hover:scale-105"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Quick Launch
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3D BOARD UNFOLDING ANIMATION STAGE */}
      {/* ========================================================================= */}
      <div className="relative flex flex-col items-center justify-center my-auto z-20 w-full max-w-2xl mt-8">
        <div
          className={`relative transition-all duration-700 ease-out transform perspective-1000 ${
            step === 0
              ? 'scale-75 -translate-y-24 rotate-x-24 opacity-80'
              : step === 1
              ? 'scale-90 translate-y-0 rotate-x-12 shadow-2xl'
              : step === 2
              ? 'scale-95 translate-y-2 rotate-x-6'
              : step === 3
              ? 'scale-105 translate-y-4 rotate-x-0'
              : 'scale-110 translate-y-6 rotate-x-0'
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Main Box Structure or Unfolded Cardboard Board */}
          {step < 3 ? (
            /* 1. PHYSICAL GAME BOX WITH LIFTING LID */
            <div
              className={`w-[360px] sm:w-[480px] h-[260px] sm:h-[300px] rounded-2xl bg-gradient-to-br ${game.boxColor} p-6 border-2 border-slate-600 shadow-[0_30px_70px_rgba(0,0,0,0.9)] relative overflow-hidden flex flex-col justify-between`}
            >
              {/* Box Texture & Highlights */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none" />

              {/* Box Lid Animation (Slides off at step 2) */}
              {step >= 2 && (
                <div
                  className="absolute inset-0 rounded-2xl bg-[#081526]/95 border border-cyan-400/50 backdrop-blur-md flex items-center justify-center transition-all duration-700 transform -translate-y-full opacity-0 pointer-events-none shadow-2xl"
                  style={{ transform: 'translateY(-140%) rotateX(-45deg)' }}
                >
                  <span className="text-xs uppercase tracking-[2px] text-cyan-300 font-bold">
                    Lid Removed
                  </span>
                </div>
              )}

              {/* Box Header */}
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-[2px] bg-amber-500/20 text-amber-300 border border-amber-400/40">
                      Vintage 1989 Edition
                    </span>
                    <span className="text-xs text-slate-300 font-medium">{game.players}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
                    {game.title}
                  </h2>
                  <p className="text-xs text-cyan-200/80 font-medium mt-0.5">{game.subtitle}</p>
                </div>

                <div className="w-12 h-12 rounded-xl bg-black/60 border border-white/20 flex items-center justify-center text-2xl shadow-inner">
                  {game.id === 'battleship' && '⚓'}
                  {game.id === 'connect4' && '🔴'}
                  {game.id === 'trivia' && '🎙️'}
                  {game.id === 'poker' && '♠️'}
                  {game.id === 'casino' && '🎰'}
                  {game.id === 'chess' && '♟️'}
                </div>
              </div>

              {/* Inner Tray State */}
              <div className="relative z-10 my-auto bg-[#040a14]/80 border border-slate-700/80 rounded-xl p-4 flex items-center justify-around backdrop-blur-sm shadow-inner">
                {step === 0 ? (
                  <div className="text-center">
                    <p className="text-xs sm:text-sm font-bold text-slate-200">
                      Pulling Box from Bedroom Shelf...
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Extracting physical tabletop board & naval pieces
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 animate-pulse">
                    <div className="w-9 h-9 rounded-lg bg-cyan-600/30 border border-cyan-400/50 flex items-center justify-center text-cyan-300">
                      <Box className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-cyan-300">
                        Opening Physical Box Lid...
                      </p>
                      <p className="text-[11px] text-slate-400">Preparing board unfolding hinges</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Box Footer */}
              <div className="relative z-10 flex items-center justify-between text-xs text-slate-300 border-t border-slate-700/60 pt-2 font-mono">
                <span className="text-cyan-300">⏱️ {game.duration}</span>
                <span className="text-slate-200">{game.rating}</span>
                <span className="uppercase text-[9px] text-slate-400">TABLETOP UNBOXING</span>
              </div>
            </div>
          ) : (
            /* 2. THE UNFOLDED PHYSICAL BOARD GAME (Tri-fold / Quad-fold Opening) */
            <div className="w-[380px] sm:w-[540px] h-[280px] sm:h-[340px] rounded-2xl bg-[#061224] border-4 border-[#173052] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.95)] relative overflow-hidden flex flex-col justify-between animate-in zoom-in-95 duration-500">
              {/* Realistic Board Crease Lines (Origami Folding Sections) */}
              <div className="absolute inset-0 pointer-events-none flex">
                <div className="w-1/2 h-full border-r-2 border-black/40 shadow-[inset_-5px_0_15px_rgba(0,0,0,0.5)]" />
                <div className="w-1/2 h-full shadow-[inset_5px_0_15px_rgba(0,0,0,0.5)]" />
              </div>
              <div className="absolute inset-0 pointer-events-none flex flex-col">
                <div className="w-full h-1/2 border-b-2 border-black/40 shadow-[inset_0_-5px_15px_rgba(0,0,0,0.5)]" />
                <div className="w-full h-1/2 shadow-[inset_0_5px_15px_rgba(0,0,0,0.5)]" />
              </div>

              {/* Board Unfolding Visuals */}
              <div className="relative z-10 flex items-center justify-between border-b border-cyan-500/30 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs font-black tracking-widest text-white uppercase">
                    {game.title} - TACTICAL BOARD UNFOLDED
                  </span>
                </div>
                <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40">
                  {step >= 4 ? 'PIECES MOUNTED' : 'UNFOLDING HINGES...'}
                </span>
              </div>

              {/* Center Arena Preview on Unfolded Board */}
              <div className="relative z-10 my-auto bg-[#030914]/90 border border-cyan-500/30 rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-inner">
                {game.id === 'battleship' && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <Anchor className="w-6 h-6 animate-bounce" />
                      <span className="text-sm font-black uppercase tracking-wider">
                        Dual Radar Array Deployed
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Real naval warships, ocean grid coordinates, and missile launchers ready!
                    </p>
                  </div>
                )}
                {game.id !== 'battleship' && (
                  <div className="flex flex-col items-center gap-2">
                    <Sparkles className="w-6 h-6 text-amber-400 animate-bounce" />
                    <span className="text-sm font-black text-white uppercase tracking-wider">
                      Tabletop Board & Pieces Synchronized
                    </span>
                    <p className="text-xs text-slate-300">{game.subtitle}</p>
                  </div>
                )}
              </div>

              {/* Ready Status Bar */}
              <div className="relative z-10 flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-cyan-900/40 font-mono">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ready for Combat</span>
                </div>
                <span className="text-cyan-300 animate-pulse">Launching match...</span>
              </div>
            </div>
          )}
        </div>

        {/* Stepper Progression (Retrieve -> Open Lid -> Unfold Board -> Setup Pieces -> Ready) */}
        <div className="mt-8 flex items-center gap-2 sm:gap-3">
          {[
            { num: 1, label: 'Retrieve' },
            { num: 2, label: 'Open Lid' },
            { num: 3, label: 'Unfold Board' },
            { num: 4, label: 'Setup Pieces' },
            { num: 5, label: 'Ready' }
          ].map(s => (
            <div key={s.num} className="flex items-center gap-1.5 sm:gap-2">
              <div
                className={`w-6 sm:w-7 h-6 sm:h-7 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-black font-mono transition-all ${
                  step >= s.num
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/60 scale-105'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider hidden sm:inline ${
                  step >= s.num ? 'text-slate-200' : 'text-slate-500'
                }`}
              >
                {s.label}
              </span>
              {s.num < 5 && (
                <div className={`w-3 sm:w-4 h-0.5 ${step > s.num ? 'bg-cyan-600' : 'bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Launch Button */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => {
              sound.playButtonClick();
              onComplete();
            }}
            className="px-8 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-cyan-900/50 transition-all transform hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Enter Game Arena
          </button>
        </div>
      </div>
    </div>
  );
};
