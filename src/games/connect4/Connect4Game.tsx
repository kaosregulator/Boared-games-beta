import React, { useState, useEffect, useRef } from 'react';
import {
  Connect4State,
  DiscColor,
  ViewMode,
  Connect4Mode,
  UserProfile,
  MiniAvatarConfig
} from '../../types';
import {
  ROWS,
  COLS,
  DEFAULT_CONFIGS,
  initializeConnect4,
  getLowestEmptyRow,
  checkConnect4Win,
  getBestConnect4Move,
  popOutBottomDisc,
  rotateBoardGravity,
  countAllConnections
} from './connect4Logic';
import { sound } from '../../utils/audio';
import { MiniAvatarFigure, DEFAULT_AVATAR_CONFIG, AI_OPPONENT_CONFIG } from '../../components/MiniAvatarFigure';
import { FirstPersonArm } from '../../components/FirstPersonArm';
import { MiniAvatarMakerModal } from '../../components/MiniAvatarMakerModal';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Sparkles,
  Eye,
  ChevronDown,
  Bot,
  User,
  ArrowDown,
  HelpCircle,
  Trophy,
  Palette,
  Flame,
  Clock,
  Shuffle,
  Grid,
  Zap,
  Maximize2,
  RefreshCw
} from 'lucide-react';
import { RulesModal } from '../../components/RulesModal';
import { GAME_CATALOG } from '../../utils/gameData';

interface Connect4GameProps {
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onOpenRules: () => void;
  onBackToShelf: () => void;
  userProfile?: UserProfile;
  onUpdateUserProfile?: (updated: UserProfile) => void;
}

export const Connect4Game: React.FC<Connect4GameProps> = ({
  viewMode,
  onToggleViewMode,
  onOpenRules,
  onBackToShelf,
  userProfile,
  onUpdateUserProfile
}) => {
  const [selectedMode, setSelectedMode] = useState<Connect4Mode>('classic');
  const [state, setState] = useState<Connect4State>(() => initializeConnect4('classic'));
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [isTrayReleased, setIsTrayReleased] = useState<boolean>(false);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('hard');
  const [isVersusAI, setIsVersusAI] = useState<boolean>(true);
  const [isDropping, setIsDropping] = useState<boolean>(false);
  const [seriesScore, setSeriesScore] = useState<{ red: number; yellow: number }>({ red: 0, yellow: 0 });
  const [showRules, setShowRules] = useState<boolean>(false);
  const [showAvatarStudio, setShowAvatarStudio] = useState<boolean>(false);
  const [tableZoom, setTableZoom] = useState<'isometric' | 'close_up' | 'flat'>('isometric');

  // Mood reactions for the 2 seated figures
  const [playerMood, setPlayerMood] = useState<'idle' | 'thinking' | 'celebrate' | 'worried'>('idle');
  const [opponentMood, setOpponentMood] = useState<'idle' | 'thinking' | 'celebrate' | 'worried'>('idle');

  // Blitz Timer
  useEffect(() => {
    if (selectedMode !== 'blitz' || state.winner) return;
    const interval = setInterval(() => {
      setState(prev => {
        if (prev.turnTimeLeft <= 1) {
          // Time expired: auto random drop
          sound.playExplosionHit();
          return {
            ...prev,
            currentTurn: prev.currentTurn === 'red' ? 'yellow' : 'red',
            turnTimeLeft: 10
          };
        }
        if (prev.turnTimeLeft <= 3) {
          sound.playRadarPing();
        }
        return { ...prev, turnTimeLeft: prev.turnTimeLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedMode, state.currentTurn, state.winner]);

  // Handle Mode Change
  const handleModeSelect = (mode: Connect4Mode) => {
    sound.playButtonClick();
    setSelectedMode(mode);
    setState(initializeConnect4(mode));
    setPlayerMood('idle');
    setOpponentMood('idle');
  };

  // Drop disc into column
  const handleDrop = (col: number) => {
    if (state.winner || isDropping || state.board[0][col] !== null) return;
    if (isVersusAI && state.currentTurn === 'yellow') return;

    const row = getLowestEmptyRow(state.board, col);
    if (row === -1) return;

    setIsDropping(true);
    setPlayerMood('thinking');
    setOpponentMood('thinking');

    setTimeout(() => {
      sound.playDiscDrop();
      const nextBoard = state.board.map(r => [...r]);
      nextBoard[row][col] = state.currentTurn;

      const winResult = checkConnect4Win(
        nextBoard,
        DEFAULT_CONFIGS[selectedMode].winLength,
        selectedMode
      );

      setState(prev => ({
        ...prev,
        board: nextBoard,
        currentTurn: prev.currentTurn === 'red' ? 'yellow' : 'red',
        winner: winResult.winner,
        winningLine: winResult.line,
        scores: winResult.scores || prev.scores,
        turnTimeLeft: DEFAULT_CONFIGS[selectedMode].turnTimerSeconds || 10,
        moveHistory: [...prev.moveHistory, { col, row, color: prev.currentTurn, type: 'drop' }]
      }));

      setIsDropping(false);

      if (winResult.winner && winResult.winner !== 'draw') {
        sound.playVictoryFanfare();
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        setSeriesScore(sc => ({
          ...sc,
          [winResult.winner!]: sc[winResult.winner as 'red' | 'yellow'] + 1
        }));

        if (winResult.winner === 'red') {
          setPlayerMood('celebrate');
          setOpponentMood('worried');
        } else {
          setPlayerMood('worried');
          setOpponentMood('celebrate');
        }
      } else {
        setPlayerMood('idle');
        setOpponentMood('idle');
      }
    }, 250);
  };

  // Pop Out bottom disc (for Pop Out Mode)
  const handlePopOut = (col: number) => {
    if (selectedMode !== 'pop_out' || state.winner || isDropping) return;
    const bottomColor = state.board[state.rows - 1][col];
    if (bottomColor !== state.currentTurn) return; // Can only pop own color

    setIsDropping(true);
    sound.playCardFlip();

    setTimeout(() => {
      const { nextBoard } = popOutBottomDisc(state.board, col);
      const winResult = checkConnect4Win(
        nextBoard,
        DEFAULT_CONFIGS[selectedMode].winLength,
        selectedMode
      );

      setState(prev => ({
        ...prev,
        board: nextBoard,
        currentTurn: prev.currentTurn === 'red' ? 'yellow' : 'red',
        winner: winResult.winner,
        winningLine: winResult.line,
        turnTimeLeft: 10,
        moveHistory: [...prev.moveHistory, { col, row: prev.rows - 1, color: bottomColor, type: 'pop' }]
      }));

      setIsDropping(false);
      sound.playDiscDrop();

      if (winResult.winner && winResult.winner !== 'draw') {
        sound.playVictoryFanfare();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    }, 200);
  };

  // Gravity Spin 90deg (for Spin Mode)
  const handleGravitySpin = () => {
    if (selectedMode !== 'gravity_spin' || state.winner || isDropping) return;
    sound.playBoardUnfold();
    const nextBoard = rotateBoardGravity(state.board);
    const winResult = checkConnect4Win(nextBoard, 4, 'gravity_spin');

    setState(prev => ({
      ...prev,
      board: nextBoard,
      spinAngle: prev.spinAngle + 90,
      winner: winResult.winner,
      winningLine: winResult.line,
      currentTurn: prev.currentTurn === 'red' ? 'yellow' : 'red'
    }));

    setTimeout(() => {
      sound.playDiscDrop();
    }, 300);
  };

  // AI Turn Execution
  useEffect(() => {
    if (!isVersusAI || state.currentTurn !== 'yellow' || state.winner || isDropping) return;

    const timer = setTimeout(() => {
      const config = DEFAULT_CONFIGS[selectedMode];
      const bestCol = getBestConnect4Move(
        state.board,
        aiDifficulty,
        config.winLength,
        selectedMode
      );
      const row = getLowestEmptyRow(state.board, bestCol);
      if (row === -1) return;

      setIsDropping(true);
      setOpponentMood('thinking');
      setPlayerMood('worried');

      setTimeout(() => {
        sound.playDiscDrop();
        const nextBoard = state.board.map(r => [...r]);
        nextBoard[row][bestCol] = 'yellow';
        const winResult = checkConnect4Win(nextBoard, config.winLength, selectedMode);

        setState(prev => ({
          ...prev,
          board: nextBoard,
          currentTurn: 'red',
          winner: winResult.winner,
          winningLine: winResult.line,
          scores: winResult.scores || prev.scores,
          turnTimeLeft: config.turnTimerSeconds || 10,
          moveHistory: [...prev.moveHistory, { col: bestCol, row, color: 'yellow', type: 'drop' }]
        }));
        setIsDropping(false);

        if (winResult.winner && winResult.winner !== 'draw') {
          sound.playVictoryFanfare();
          setSeriesScore(sc => ({
            ...sc,
            [winResult.winner!]: sc[winResult.winner as 'red' | 'yellow'] + 1
          }));

          if (winResult.winner === 'yellow') {
            setOpponentMood('celebrate');
            setPlayerMood('worried');
          } else {
            setPlayerMood('celebrate');
            setOpponentMood('worried');
          }
        } else {
          setPlayerMood('idle');
          setOpponentMood('idle');
        }
      }, 300);
    }, 650);

    return () => clearTimeout(timer);
  }, [state.currentTurn, state.winner, isVersusAI, isDropping, aiDifficulty, selectedMode]);

  // Release Bottom Tray Lever (Dumps pieces down)
  const handleReleaseTray = () => {
    sound.playCupSlam();
    setIsTrayReleased(true);
    setTimeout(() => {
      setState(initializeConnect4(selectedMode));
      setIsTrayReleased(false);
      sound.playPawnHop();
      setPlayerMood('idle');
      setOpponentMood('idle');
    }, 600);
  };

  const restartGame = () => {
    sound.playButtonClick();
    setState(initializeConnect4(selectedMode));
    setPlayerMood('idle');
    setOpponentMood('idle');
  };

  const playerConfig = userProfile?.miniAvatar || DEFAULT_AVATAR_CONFIG;

  return (
    <div className="w-full max-w-5xl flex flex-col items-center justify-start text-white select-none py-1 sm:py-2 px-2 sm:px-4 animate-in fade-in duration-300 font-sans">
      {/* Mini Avatar Studio Modal */}
      {showAvatarStudio && userProfile && onUpdateUserProfile && (
        <MiniAvatarMakerModal
          profile={userProfile}
          onSave={onUpdateUserProfile}
          onClose={() => setShowAvatarStudio(false)}
        />
      )}

      {/* Rules Modal */}
      {showRules && (
        <RulesModal
          game={GAME_CATALOG.find(g => g.id === 'connect4')!}
          onClose={() => setShowRules(false)}
        />
      )}

      {/* TOP HEADER CONTROLS BAR */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-[#081526]/90 border border-[#172e4d] rounded-2xl p-3 sm:p-4 backdrop-blur shadow-xl mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToShelf}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all hover:scale-105"
            title="Return to Bookshelf"
          >
            <RotateCcw className="w-4 h-4 text-cyan-400" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-wider text-white flex items-center gap-1.5 uppercase">
                <span>CONNECT 4 TABLETOP</span>
              </h2>
              <span className="text-[9px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-bold">
                {DEFAULT_CONFIGS[selectedMode].winLength} in a row
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Series:{' '}
              <span className="text-red-400 font-bold">Red ({seriesScore.red})</span> vs{' '}
              <span className="text-amber-400 font-bold">Yellow ({seriesScore.yellow})</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Avatar Maker Launcher */}
          {userProfile && onUpdateUserProfile && (
            <button
              onClick={() => {
                sound.playButtonClick();
                setShowAvatarStudio(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all hover:scale-105"
            >
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span>Mini Avatar</span>
            </button>
          )}

          {/* AI vs Pass & Play Toggle */}
          <button
            onClick={() => {
              sound.playButtonClick();
              setIsVersusAI(v => !v);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#0f233d] hover:bg-[#1a3860] border border-cyan-500/30 text-xs font-bold text-cyan-200 flex items-center gap-1.5 shadow-sm"
          >
            {isVersusAI ? <Bot className="w-3.5 h-3.5 text-cyan-400" /> : <User className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isVersusAI ? 'vs AI' : '2-Player'}</span>
          </button>

          {/* Perspective View Angle */}
          <button
            onClick={() => {
              sound.playButtonClick();
              setTableZoom(z =>
                z === 'isometric' ? 'close_up' : z === 'close_up' ? 'flat' : 'isometric'
              );
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Camera Perspective (2.5D Isometric / Close-up / Flat 2D)"
          >
            <Eye className="w-4 h-4 text-cyan-400" />
          </button>

          <button
            onClick={() => setShowRules(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Rules"
          >
            <HelpCircle className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      {/* GAME MODES & CUSTOM RULE TABS BAR */}
      <div className="w-full flex items-center justify-start gap-1.5 overflow-x-auto pb-1 mb-3">
        {[
          { id: 'classic', label: 'Classic 4', icon: '🔴', desc: 'Standard 4-in-a-row' },
          { id: 'blackout', label: 'Blackout / Full Rack', icon: '⬛', desc: 'Fill board; most 4-in-a-row sets wins!' },
          { id: 'connect5', label: 'Epic 8x8 (Connect 5)', icon: '🌟', desc: 'Giant 8x8 grid, 5 in a row' },
          { id: 'pop_out', label: 'Pop Out Mode', icon: '⬇️', desc: 'Drop top or pop bottom piece' },
          { id: 'blitz', label: '10s Blitz Clock', icon: '⚡', desc: '10s per move urgency' },
          { id: 'gravity_spin', label: 'Gravity Spin 90°', icon: '🔄', desc: 'Rotate board physics' }
        ].map(m => (
          <button
            key={m.id}
            onClick={() => handleModeSelect(m.id as Connect4Mode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
              selectedMode === m.id
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40 scale-102 border border-cyan-400'
                : 'bg-[#081526] hover:bg-[#10243d] text-slate-400 border border-slate-800'
            }`}
          >
            <span>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 2.5D ISOMETRIC BEDROOM TABLETOP STAGE WITH 2 SEATED CHARACTERS */}
      {/* ========================================================================= */}
      <div
        className={`w-full relative rounded-3xl bg-gradient-to-b from-[#181008] via-[#0f0904] to-[#050302] border-4 border-[#3d2716] shadow-[0_30px_90px_rgba(0,0,0,0.95)] p-3 sm:p-6 overflow-hidden flex flex-col items-center justify-between min-h-[540px] ${
          tableZoom === 'isometric'
            ? 'perspective-1000'
            : tableZoom === 'close_up'
            ? 'scale-105'
            : ''
        }`}
      >
        {/* Warm Banker's Lamp Ambient Spotlight */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Polished Mahogany Wood Table Surface Grain Texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '36px 36px'
          }}
        />

        {/* ------------------------------------------------------------- */}
        {/* TOP STATUS & TURN BANNER */}
        {/* ------------------------------------------------------------- */}
        <div className="w-full flex items-center justify-between relative z-20 mb-2">
          {/* Turn Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-4 h-4 rounded-full border-2 shadow-md ${
                state.currentTurn === 'red'
                  ? 'bg-red-500 border-red-300 shadow-red-500/50 animate-ping'
                  : 'bg-yellow-400 border-yellow-200 shadow-yellow-400/50 animate-ping'
              }`}
            />
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
              {state.winner === 'red'
                ? '🏆 RED VICTORY!'
                : state.winner === 'yellow'
                ? '🏆 YELLOW VICTORY!'
                : state.winner === 'draw'
                ? '🤝 TIE / DRAW!'
                : state.currentTurn === 'red'
                ? 'Player 1 (Red Turn)'
                : isVersusAI
                ? 'Minimax AI (Yellow Turn)'
                : 'Player 2 (Yellow Turn)'}
            </span>
          </div>

          {/* Blackout Mode Connection Scores or Blitz Timer */}
          {selectedMode === 'blackout' && (
            <div className="flex items-center gap-3 bg-black/60 px-3 py-1 rounded-xl border border-slate-700 font-mono text-xs">
              <span className="text-red-400 font-bold">Red Sets: {state.scores.red}</span>
              <span className="text-slate-500">|</span>
              <span className="text-yellow-400 font-bold">Yellow Sets: {state.scores.yellow}</span>
            </div>
          )}

          {selectedMode === 'blitz' && !state.winner && (
            <div className="flex items-center gap-1.5 bg-red-950/80 border border-red-500/50 px-3 py-1 rounded-xl font-mono text-xs font-bold text-red-300 animate-pulse">
              <Clock className="w-3.5 h-3.5 text-red-400" />
              <span>Shot Clock: {state.turnTimeLeft}s</span>
            </div>
          )}

          {/* Gravity Spin Trigger in Spin Mode */}
          {selectedMode === 'gravity_spin' && !state.winner && (
            <button
              onClick={handleGravitySpin}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md animate-pulse"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Spin 90°
            </button>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* TABLE ARENA: LEFT AVATAR, CENTER RACK, RIGHT AVATAR */}
        {/* ------------------------------------------------------------- */}
        <div className="w-full flex items-center justify-between gap-2 sm:gap-6 relative z-10 my-auto">
          {/* 1. LEFT SEATED FIGURE: Player 1 (Red) */}
          <div className="flex flex-col items-center gap-2">
            <MiniAvatarFigure
              config={playerConfig}
              size="table"
              facing="right"
              mood={playerMood}
              playerName={userProfile?.name || 'Player 1'}
            />
            {/* Red Disc Tray Rack */}
            <div className="hidden sm:flex items-center gap-1 bg-[#120803] p-1.5 rounded-lg border border-[#3d2716] shadow-inner">
              <div className="w-3.5 h-3.5 rounded-full bg-red-600 border border-red-400 shadow-sm" />
              <div className="w-3.5 h-3.5 rounded-full bg-red-600 border border-red-400 shadow-sm" />
              <div className="w-3.5 h-3.5 rounded-full bg-red-600 border border-red-400 shadow-sm" />
              <span className="text-[9px] font-mono text-red-400 font-bold">Tray</span>
            </div>
          </div>

          {/* 2. CENTER STAGE: 2.5D ISOMETRIC CONNECT 4 RACK */}
          <div
            className={`relative flex flex-col items-center transition-transform duration-500 ${
              tableZoom === 'isometric' ? 'rotate-x-6' : ''
            }`}
            style={{ transform: `rotate(${state.spinAngle}deg)` }}
          >
            {/* Column Hover Indicator Arrows */}
            <div
              className="grid gap-1.5 sm:gap-2 mb-1 z-20 w-full"
              style={{ gridTemplateColumns: `repeat(${state.cols}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: state.cols }, (_, col) => {
                const isHovered = hoveredCol === col;
                const isFull = state.board[0][col] !== null;

                return (
                  <button
                    key={col}
                    disabled={isFull || state.winner !== null || (isVersusAI && state.currentTurn === 'yellow')}
                    onMouseEnter={() => setHoveredCol(col)}
                    onMouseLeave={() => setHoveredCol(null)}
                    onClick={() => handleDrop(col)}
                    className={`h-7 sm:h-9 rounded-lg flex items-center justify-center transition-all ${
                      isHovered && !isFull
                        ? 'bg-amber-400/30 border border-amber-300 scale-110 shadow-lg animate-bounce'
                        : 'opacity-0 hover:opacity-100'
                    }`}
                  >
                    <ArrowDown
                      className={`w-4 h-4 ${
                        state.currentTurn === 'red' ? 'text-red-400' : 'text-yellow-400'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* THE PHYSICAL VERTICAL PLASTIC RACK */}
            <div
              ref={useRef<HTMLDivElement>(null)}
              className="relative p-3 sm:p-4 rounded-2xl bg-gradient-to-b from-[#1d4ed8] via-[#1e40af] to-[#1e3a8a] border-4 border-[#3b82f6] shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden"
              style={{
                boxShadow:
                  'inset 0 4px 10px rgba(255,255,255,0.3), 0 25px 50px rgba(0,0,0,0.8), 0 0 30px rgba(37,99,235,0.4)'
              }}
            >
              {/* Grid of Circular Slots */}
              <div
                className="grid gap-2 sm:gap-2.5 relative z-10"
                style={{
                  gridTemplateColumns: `repeat(${state.cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${state.rows}, minmax(0, 1fr))`
                }}
              >
                {state.board.map((row, r) =>
                  row.map((cell, c) => {
                    const isWinningCell = state.winningLine?.some(
                      w => w.row === r && w.col === c
                    );

                    return (
                      <button
                        key={`${r}-${c}`}
                        disabled={state.winner !== null}
                        onMouseEnter={() => setHoveredCol(c)}
                        onMouseLeave={() => setHoveredCol(null)}
                        onClick={() => handleDrop(c)}
                        className={`w-7 h-7 sm:w-11 sm:h-11 rounded-full flex items-center justify-center relative transition-all duration-300 ${
                          isWinningCell
                            ? 'ring-4 ring-white scale-105 z-20 shadow-[0_0_20px_rgba(255,255,255,0.9)] animate-pulse'
                            : ''
                        }`}
                        style={{
                          background:
                            cell === null
                              ? 'radial-gradient(circle at center, #050b14 60%, #0c182b 100%)'
                              : 'transparent',
                          boxShadow:
                            cell === null
                              ? 'inset 0 4px 8px rgba(0,0,0,0.9)'
                              : 'none'
                        }}
                      >
                        {/* THE WEIGHTED RIDGED PLASTIC DISC */}
                        {cell && (
                          <div
                            className={`w-full h-full rounded-full border-2 transition-transform duration-300 flex items-center justify-center ${
                              cell === 'red'
                                ? 'bg-gradient-to-br from-[#f87171] via-[#ef4444] to-[#991b1b] border-[#fca5a5] shadow-[0_4px_10px_rgba(239,68,68,0.5)]'
                                : 'bg-gradient-to-br from-[#fef08a] via-[#eab308] to-[#a16207] border-[#fde047] shadow-[0_4px_10px_rgba(234,179,8,0.5)]'
                            } ${isTrayReleased ? 'translate-y-96 opacity-0' : 'animate-in zoom-in-75 duration-200'}`}
                          >
                            {/* Inner concentric ring ridge */}
                            <div className="w-4/6 h-4/6 rounded-full border border-white/30 flex items-center justify-center">
                              <div
                                className={`w-2.5 h-2.5 rounded-full ${
                                  cell === 'red' ? 'bg-red-900/60' : 'bg-yellow-900/60'
                                }`}
                              />
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Bottom Release Lever Slot */}
              <div className="w-full mt-3 pt-2 border-t-2 border-blue-400/40 flex items-center justify-between text-[10px] font-mono text-cyan-200">
                <span className="font-bold tracking-widest uppercase">MB CONNECT 4</span>
                {selectedMode === 'pop_out' && (
                  <span className="text-amber-300 font-bold animate-pulse">
                    Pop-Out Enabled (Bottom Row)
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Pop Out Actions (if Pop Out mode) */}
            {selectedMode === 'pop_out' && !state.winner && (
              <div
                className="grid gap-1.5 sm:gap-2 mt-1 z-20 w-full"
                style={{ gridTemplateColumns: `repeat(${state.cols}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: state.cols }, (_, col) => {
                  const bottomColor = state.board[state.rows - 1][col];
                  const canPop = bottomColor === state.currentTurn;

                  return (
                    <button
                      key={col}
                      disabled={!canPop}
                      onClick={() => handlePopOut(col)}
                      className={`h-6 rounded text-[9px] font-bold uppercase flex items-center justify-center border transition-all ${
                        canPop
                          ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-400 shadow animate-bounce'
                          : 'opacity-0'
                      }`}
                    >
                      Pop ⬆
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. RIGHT SEATED FIGURE: Opponent / Minimax AI */}
          <div className="flex flex-col items-center gap-2">
            <MiniAvatarFigure
              config={AI_OPPONENT_CONFIG}
              size="table"
              facing="left"
              mood={opponentMood}
              isAI={isVersusAI}
              playerName={isVersusAI ? `Minimax AI (${aiDifficulty.toUpperCase()})` : 'Player 2'}
            />
            {/* Yellow Disc Tray Rack */}
            <div className="hidden sm:flex items-center gap-1 bg-[#120803] p-1.5 rounded-lg border border-[#3d2716] shadow-inner">
              <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 border border-yellow-200 shadow-sm" />
              <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 border border-yellow-200 shadow-sm" />
              <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 border border-yellow-200 shadow-sm" />
              <span className="text-[9px] font-mono text-yellow-400 font-bold">Tray</span>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* FIRST-PERSON TRANSLUCENT SEE-THROUGH POV ARM */}
        {/* ------------------------------------------------------------- */}
        <FirstPersonArm
          targetCol={hoveredCol}
          totalCols={state.cols}
          isDropping={isDropping}
          discColor={state.currentTurn === 'red' ? 'red' : 'yellow'}
          avatarConfig={playerConfig}
        />

        {/* ------------------------------------------------------------- */}
        {/* BOTTOM TRAY ACTIONS BAR */}
        {/* ------------------------------------------------------------- */}
        <div className="w-full flex items-center justify-between pt-3 border-t border-[#3d2716] relative z-20 mt-2">
          {/* Release Bottom Lever Slider */}
          <button
            onClick={handleReleaseTray}
            className="px-4 py-2 rounded-xl bg-[#2e1c10] hover:bg-[#422817] text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-2 border border-[#52351f] shadow-lg transition-all hover:scale-105"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Slide Release Lever (Reset Rack)</span>
          </button>

          {/* Quick Restart */}
          <button
            onClick={restartGame}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-900/40 transition-all hover:scale-105"
          >
            New Match ⚔️
          </button>
        </div>
      </div>
    </div>
  );
};
