import React, { useState, useEffect } from 'react';
import { Pawn, PawnColor, PawnRushCard, PawnRushState, ViewMode } from '../../types';
import {
  TRACK_LENGTH,
  PLAYER_CONFIG,
  initializePawnRush,
  calculateValidMovesForCard
} from './pawnRushLogic';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  RotateCcw,
  Eye,
  Bot,
  User,
  Layers,
  ArrowRight,
  Flame,
  Zap,
  HelpCircle
} from 'lucide-react';

interface PawnRushGameProps {
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onOpenRules: () => void;
}

export const PawnRushGame: React.FC<PawnRushGameProps> = ({
  viewMode,
  onToggleViewMode,
  onOpenRules
}) => {
  const [state, setState] = useState<PawnRushState>(initializePawnRush);
  const [isBotMap, setIsBotMap] = useState<Record<PawnColor, boolean>>({
    blue: false, // Human
    red: true,
    green: true,
    yellow: true
  });
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  const currentPlayerColor = state.players[state.currentTurnIndex];
  const isCurrentBot = isBotMap[currentPlayerColor];

  // Draw Card action
  const handleDrawCard = () => {
    if (state.currentCard || isDrawing || state.winner) return;

    setIsDrawing(true);
    sound.playCardFlip();

    setTimeout(() => {
      let nextDeck = [...state.deck];
      if (nextDeck.length === 0) {
        nextDeck = initializePawnRush().deck;
      }
      const drawnCard = nextDeck.pop()!;
      const validMoves = calculateValidMovesForCard(drawnCard, currentPlayerColor, state.pawns);

      setState(prev => ({
        ...prev,
        deck: nextDeck,
        currentCard: drawnCard,
        validMoveOptions: validMoves,
        message:
          validMoves.length > 0
            ? `${PLAYER_CONFIG[currentPlayerColor].name} drew [${drawnCard.title}]: ${drawnCard.description}`
            : `${PLAYER_CONFIG[currentPlayerColor].name} drew [${drawnCard.title}], but has no legal moves. Passing turn.`
      }));

      setIsDrawing(false);

      // If no valid moves, auto pass after brief pause
      if (validMoves.length === 0) {
        setTimeout(() => {
          advanceTurn();
        }, 1500);
      }
    }, 400);
  };

  // Move a Pawn based on selected option
  const handleSelectMoveOption = (option: {
    pawn: Pawn;
    targetPosition: number;
    description: string;
    swapWith?: Pawn;
  }) => {
    sound.playPawnHop();

    const nextPawns = JSON.parse(JSON.stringify(state.pawns)) as Record<PawnColor, Pawn[]>;
    const myPawns = nextPawns[currentPlayerColor];
    const targetPawn = myPawns.find(p => p.id === option.pawn.id);
    if (!targetPawn) return;

    let bumpedMsg = '';

    // Handle Swap
    if (option.swapWith) {
      sound.playSorryBump();
      const oppPawn = nextPawns[option.swapWith.color].find(p => p.id === option.swapWith!.id);
      if (oppPawn) {
        if (state.currentCard?.value === 'SORRY') {
          // Send opponent back to start
          oppPawn.position = -1;
          oppPawn.stepIndex = 0;
          bumpedMsg = `💥 BUMPED ${PLAYER_CONFIG[oppPawn.color].name}'s pawn back to START!`;
        } else {
          // Swap positions
          const tempPos = targetPawn.position;
          targetPawn.position = oppPawn.position;
          oppPawn.position = tempPos;
          bumpedMsg = `🔄 SWAPPED places with ${PLAYER_CONFIG[oppPawn.color].name}!`;
        }
      }
    } else {
      // Normal move
      // Check collision bump on landing space
      if (option.targetPosition >= 0 && option.targetPosition < TRACK_LENGTH) {
        Object.entries(nextPawns).forEach(([col, pawns]) => {
          if (col !== currentPlayerColor) {
            pawns.forEach(oppPawn => {
              if (oppPawn.position === option.targetPosition) {
                oppPawn.position = -1;
                oppPawn.stepIndex = 0;
                sound.playSorryBump();
                bumpedMsg = `💥 BUMPED ${PLAYER_CONFIG[oppPawn.color].name}'s pawn back to START!`;
              }
            });
          }
        });
      }

      targetPawn.position = option.targetPosition;
      targetPawn.stepIndex += 5;
    }

    // Check Victory (All 3 pawns at Home 100)
    let winner: PawnColor | null = null;
    if (myPawns.every(p => p.position === 100)) {
      winner = currentPlayerColor;
      sound.playVictoryFanfare();
      confetti({ particleCount: 150, spread: 85, origin: { y: 0.6 } });
    }

    setState(prev => ({
      ...prev,
      pawns: nextPawns,
      winner,
      message: winner
        ? `🏆 ${PLAYER_CONFIG[winner].name} HAS WON THE RACE!`
        : bumpedMsg || `${PLAYER_CONFIG[currentPlayerColor].name} advanced pawn!`
    }));

    if (!winner) {
      // If card was 2, give bonus turn!
      if (state.currentCard?.value === '2') {
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            currentCard: null,
            validMoveOptions: [],
            message: `${PLAYER_CONFIG[currentPlayerColor].name} drew a 2! BONUS TURN: Draw again!`
          }));
        }, 800);
      } else {
        setTimeout(() => {
          advanceTurn();
        }, 800);
      }
    }
  };

  const advanceTurn = () => {
    setState(prev => ({
      ...prev,
      currentTurnIndex: (prev.currentTurnIndex + 1) % prev.players.length,
      currentCard: null,
      validMoveOptions: []
    }));
  };

  // Bot Turn Automation
  useEffect(() => {
    if (!isCurrentBot || state.winner || isDrawing) return;

    if (!state.currentCard) {
      // Bot draws
      const drawTimer = setTimeout(() => {
        handleDrawCard();
      }, 1000);
      return () => clearTimeout(drawTimer);
    } else if (state.validMoveOptions.length > 0) {
      // Bot chooses best move
      const moveTimer = setTimeout(() => {
        // Prioritize moves with swap / bump or moving into home
        const bestMove =
          state.validMoveOptions.find(o => o.swapWith || o.targetPosition === 100) ||
          state.validMoveOptions[0];
        handleSelectMoveOption(bestMove);
      }, 1100);
      return () => clearTimeout(moveTimer);
    }
  }, [isCurrentBot, state.currentCard, state.validMoveOptions, state.winner, isDrawing, currentPlayerColor]);

  return (
    <div className="w-full flex flex-col items-center justify-start text-white select-none py-2 px-2 sm:px-4">
      {/* Header controls */}
      <div className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 backdrop-blur shadow-xl mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow"
            style={{ backgroundColor: PLAYER_CONFIG[currentPlayerColor].colorHex }}
          >
            🎲
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wide text-white flex items-center gap-2">
              PAWN RUSH: REVENGE RACE
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                4-Player Classic
              </span>
            </h2>
            <p className="text-xs text-slate-300 font-mono">
              Active Turn:{' '}
              <strong style={{ color: PLAYER_CONFIG[currentPlayerColor].colorHex }}>
                {PLAYER_CONFIG[currentPlayerColor].name} ({isCurrentBot ? 'BOT' : 'PLAYER'})
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Toggle player bot statuses */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {state.players.map(col => (
              <button
                key={col}
                onClick={() => {
                  sound.playButtonClick();
                  setIsBotMap(prev => ({ ...prev, [col]: !prev[col] }));
                }}
                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  isBotMap[col] ? 'bg-slate-800 text-slate-400' : 'bg-indigo-600 text-white shadow'
                }`}
                title={`Toggle ${col} between Human and Bot`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: PLAYER_CONFIG[col].colorHex }}
                />
                {isBotMap[col] ? 'Bot' : 'You'}
              </button>
            ))}
          </div>

          <button
            onClick={onToggleViewMode}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all hover:scale-105"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            {viewMode === 'isometric' ? '2D View' : '3D View'}
          </button>

          <button
            onClick={onOpenRules}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all hover:scale-105"
          >
            Rules
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setState(initializePawnRush());
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-xs font-semibold flex items-center gap-1.5 border border-rose-700/60 transition-all hover:scale-105"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restart
          </button>
        </div>
      </div>

      {/* Message Banner */}
      <div className="w-full max-w-5xl py-2 px-4 rounded-xl mb-4 bg-slate-900/80 border border-slate-800 text-sm font-semibold flex items-center justify-between shadow">
        <span className="text-cyan-300">{state.message}</span>
        <span className="text-xs text-slate-400 font-mono">Cards in Deck: {state.deck.length}</span>
      </div>

      {/* Main 4-Player Board & Card Draw Table */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Arena: The 4-Player Quad Board */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div
            className={`relative w-full max-w-[500px] aspect-square rounded-3xl bg-slate-950 p-4 border-4 border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-all duration-700 flex flex-col justify-between ${
              viewMode === 'isometric'
                ? 'transform rotate-x-12 rotate-y-[-3deg] scale-95 hover:scale-100 hover:rotate-x-6'
                : 'rotate-0 scale-100'
            }`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Corner Bases */}
            <div className="flex justify-between w-full">
              {/* Blue Base */}
              <div className="w-24 h-24 rounded-2xl bg-blue-950/80 border-2 border-blue-500/60 p-2 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-blue-400">BLUE START</span>
                <div className="flex gap-1.5">
                  {state.pawns.blue.map(p => (
                    <div
                      key={p.id}
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-lg transition-transform ${
                        p.position === -1
                          ? 'bg-blue-500 text-white ring-2 ring-blue-300 animate-pulse'
                          : 'bg-slate-800 text-slate-600'
                      }`}
                    >
                      {p.id}
                    </div>
                  ))}
                </div>
              </div>

              {/* Red Base */}
              <div className="w-24 h-24 rounded-2xl bg-red-950/80 border-2 border-red-500/60 p-2 flex flex-col justify-between items-end">
                <span className="text-[10px] font-black uppercase text-red-400">RED START</span>
                <div className="flex gap-1.5">
                  {state.pawns.red.map(p => (
                    <div
                      key={p.id}
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-lg transition-transform ${
                        p.position === -1
                          ? 'bg-red-500 text-white ring-2 ring-red-300 animate-pulse'
                          : 'bg-slate-800 text-slate-600'
                      }`}
                    >
                      {p.id}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Center Track & Center Home Circle */}
            <div className="my-auto flex items-center justify-center relative">
              <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border-4 border-indigo-500/40 flex flex-col items-center justify-center shadow-2xl">
                <span className="text-xs font-black uppercase tracking-widest text-amber-300">
                  ★ HOME ★
                </span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {state.players.map(col => {
                    const homeCount = state.pawns[col].filter(p => p.position === 100).length;
                    return (
                      <div
                        key={col}
                        className="flex items-center gap-1 text-[11px] font-bold"
                        style={{ color: PLAYER_CONFIG[col].colorHex }}
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: PLAYER_CONFIG[col].colorHex }}
                        />
                        {homeCount}/3
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Corner Bases */}
            <div className="flex justify-between w-full">
              {/* Yellow Base */}
              <div className="w-24 h-24 rounded-2xl bg-amber-950/80 border-2 border-amber-500/60 p-2 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase text-amber-400">YELLOW START</span>
                <div className="flex gap-1.5">
                  {state.pawns.yellow.map(p => (
                    <div
                      key={p.id}
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-lg transition-transform ${
                        p.position === -1
                          ? 'bg-amber-500 text-white ring-2 ring-amber-300 animate-pulse'
                          : 'bg-slate-800 text-slate-600'
                      }`}
                    >
                      {p.id}
                    </div>
                  ))}
                </div>
              </div>

              {/* Green Base */}
              <div className="w-24 h-24 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500/60 p-2 flex flex-col justify-between items-end">
                <span className="text-[10px] font-black uppercase text-emerald-400">GREEN START</span>
                <div className="flex gap-1.5">
                  {state.pawns.green.map(p => (
                    <div
                      key={p.id}
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-lg transition-transform ${
                        p.position === -1
                          ? 'bg-emerald-500 text-white ring-2 ring-emerald-300 animate-pulse'
                          : 'bg-slate-800 text-slate-600'
                      }`}
                    >
                      {p.id}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Arena: Card Deck & Action Selector */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Deck & Draw Station */}
          <div className="bg-slate-900/90 border-2 border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col items-center text-center">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-3">
              Action Card Deck
            </h3>

            {/* 3D Action Card */}
            <div className="relative w-44 h-60 rounded-2xl p-4 flex flex-col justify-between border-4 shadow-2xl transition-all transform hover:scale-105 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 border-indigo-500/50">
              {state.currentCard ? (
                <>
                  <div className="flex justify-between items-start">
                    <span className="text-3xl font-black text-amber-300">
                      {state.currentCard.value}
                    </span>
                    <span className="text-xl">✨</span>
                  </div>
                  <div className="my-auto">
                    <h4 className="text-lg font-black text-white">{state.currentCard.title}</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {state.currentCard.description}
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest text-right">
                    PAWN RUSH
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <Layers className="w-10 h-10 text-indigo-400 animate-bounce" />
                  <span className="text-xs font-bold text-slate-300">Face Down Deck</span>
                  <span className="text-[10px] text-slate-500">Tap to draw card</span>
                </div>
              )}
            </div>

            {/* Draw Card Button */}
            {!state.currentCard && !isCurrentBot && !state.winner && (
              <button
                onClick={handleDrawCard}
                disabled={isDrawing}
                className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95"
              >
                Draw Turn Card 🃏
              </button>
            )}
          </div>

          {/* Valid Movement Options Selector */}
          {state.validMoveOptions.length > 0 && !isCurrentBot && (
            <div className="bg-slate-900/90 border-2 border-emerald-500/40 rounded-3xl p-4 shadow-xl flex flex-col gap-2 animate-in fade-in slide-in-from-bottom duration-300">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Choose Pawn Action:
              </span>
              {state.validMoveOptions.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectMoveOption(opt)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-600/80 border border-slate-700 hover:border-emerald-400 text-left transition-all hover:scale-[1.02] flex items-center justify-between text-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow"
                      style={{ backgroundColor: PLAYER_CONFIG[opt.pawn.color].colorHex }}
                    >
                      {opt.pawn.id}
                    </div>
                    <span className="font-semibold text-slate-200">{opt.description}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
