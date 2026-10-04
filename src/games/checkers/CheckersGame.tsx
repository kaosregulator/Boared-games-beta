import React, { useState, useEffect, useRef } from 'react';
import { CheckerBoard, CheckerPieceColor, CheckerMove, ViewMode, GameMode } from '../../types';
import { createInitialCheckersBoard, getAllLegalMovesForColor, executeCheckerMove, getAIMove, getLegalMovesForPiece } from './checkersLogic';
import { sound } from '../../utils/audio';
import { AnimatedHand } from '../../components/HandCursor';
import { RotateCcw, Eye, Shield, Crown, Sparkles, User, Bot, HelpCircle, Trophy } from 'lucide-react';
import { RulesModal } from '../../components/RulesModal';
import { GAME_CATALOG } from '../../utils/gameData';

interface CheckersGameProps {
  onBackToShelf: () => void;
}

export const CheckersGame: React.FC<CheckersGameProps> = ({ onBackToShelf }) => {
  const [board, setBoard] = useState<CheckerBoard>(createInitialCheckersBoard());
  const [turn, setTurn] = useState<CheckerPieceColor>('red');
  const [selectedSquare, setSelectedSquare] = useState<{ r: number; c: number } | null>(null);
  const [validMoves, setValidMoves] = useState<CheckerMove[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [viewMode, setViewMode] = useState<ViewMode>('isometric');
  const [winner, setWinner] = useState<CheckerPieceColor | 'draw' | null>(null);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [seriesScore, setSeriesScore] = useState<{ red: number; black: number }>({ red: 0, black: 0 });

  // Animated Hand state
  const [handState, setHandState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    holdingItem?: 'checker_red' | 'checker_black';
    action: 'hover' | 'pinch' | 'slide' | 'drop';
    label: string;
    isEnemy: boolean;
  }>({
    visible: false,
    x: 0,
    y: 0,
    action: 'hover',
    label: '',
    isEnemy: false
  });

  const boardRef = useRef<HTMLDivElement>(null);

  const checkersMetadata = GAME_CATALOG.find(g => g.id === 'checkers')!;

  // Count remaining pieces
  let redCount = 0;
  let blackCount = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color === 'red') redCount++;
      if (board[r][c]?.color === 'black') blackCount++;
    }
  }

  // Handle square clicks for Player
  const handleSquareClick = (r: number, c: number) => {
    if (winner) return;
    if (gameMode === 'ai' && turn === 'black') return;

    const piece = board[r][c];

    // If already selected, check if clicked valid move target
    if (selectedSquare) {
      const chosenMove = validMoves.find(m => m.to.r === r && m.to.c === c);
      if (chosenMove) {
        performMove(chosenMove, false);
        return;
      }
    }

    // Select piece
    if (piece && piece.color === turn) {
      sound.playPieceSelect();
      setSelectedSquare({ r, c });
      const pieceMoves = getLegalMovesForPiece(board, r, c, piece);
      // Filter by jumping rules if any jump exists across all pieces
      const allMoves = getAllLegalMovesForColor(board, turn);
      const hasJumps = allMoves.some(m => !!m.captured);
      setValidMoves(hasJumps ? pieceMoves.filter(m => !!m.captured) : pieceMoves);
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const performMove = (move: CheckerMove, isAI: boolean) => {
    sound.playMoveClack();
    const movingPiece = board[move.from.r][move.from.c];

    // Trigger Animated Hand movement
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      const cellSize = rect.width / 8;
      const startX = rect.left + move.from.c * cellSize + cellSize / 2;
      const startY = rect.top + move.from.r * cellSize + cellSize / 2;
      const endX = rect.left + move.to.c * cellSize + cellSize / 2;
      const endY = rect.top + move.to.r * cellSize + cellSize / 2;

      setHandState({
        visible: true,
        x: startX,
        y: startY,
        holdingItem: movingPiece?.color === 'red' ? 'checker_red' : 'checker_black',
        action: 'pinch',
        label: isAI ? 'AI Draughts Bot' : 'Player',
        isEnemy: isAI || turn === 'black'
      });

      setTimeout(() => {
        setHandState(prev => ({ ...prev, x: endX, y: endY, action: 'slide' }));
      }, 200);

      setTimeout(() => {
        setHandState(prev => ({ ...prev, action: 'drop' }));
      }, 450);

      setTimeout(() => {
        setHandState(prev => ({ ...prev, visible: false }));
      }, 750);
    }

    const nextBoard = executeCheckerMove(board, move);
    setBoard(nextBoard);
    setSelectedSquare(null);
    setValidMoves([]);

    const nextTurn: CheckerPieceColor = turn === 'red' ? 'black' : 'red';

    // Check winner
    const remainingMoves = getAllLegalMovesForColor(nextBoard, nextTurn);
    let nextRedCount = 0;
    let nextBlackCount = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (nextBoard[r][c]?.color === 'red') nextRedCount++;
        if (nextBoard[r][c]?.color === 'black') nextBlackCount++;
      }
    }

    if (nextRedCount === 0 || (nextTurn === 'red' && remainingMoves.length === 0)) {
      sound.playDefeat();
      setWinner('black');
      setSeriesScore(prev => ({ ...prev, black: prev.black + 1 }));
    } else if (nextBlackCount === 0 || (nextTurn === 'black' && remainingMoves.length === 0)) {
      sound.playVictory();
      setWinner('red');
      setSeriesScore(prev => ({ ...prev, red: prev.red + 1 }));
    } else {
      setTurn(nextTurn);
    }
  };

  // AI Turn handler
  useEffect(() => {
    if (gameMode === 'ai' && turn === 'black' && !winner) {
      const timer = setTimeout(() => {
        const aiMove = getAIMove(board, 'black');
        if (aiMove) {
          performMove(aiMove, true);
        } else {
          setWinner('red');
          sound.playVictory();
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [turn, gameMode, winner, board]);

  const restartGame = () => {
    sound.playButtonClick();
    setBoard(createInitialCheckersBoard());
    setTurn('red');
    setSelectedSquare(null);
    setValidMoves([]);
    setWinner(null);
  };

  return (
    <div className="w-full max-w-5xl px-2 sm:px-6 py-4 flex flex-col items-center select-none animate-in fade-in duration-300">
      {/* Animated Hand Cursor */}
      <AnimatedHand
        x={handState.x}
        y={handState.y}
        visible={handState.visible}
        action={handState.action}
        holdingItem={handState.holdingItem}
        label={handState.label}
        isEnemy={handState.isEnemy}
      />

      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-xl backdrop-blur mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToShelf}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all hover:scale-105"
            title="Return to Game Shelf"
          >
            <RotateCcw className="w-4 h-4 text-blue-400" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>CHECKERS</span>
              <span className="text-[10px] font-mono uppercase bg-red-500/20 text-red-300 px-2 py-0.5 rounded border border-red-500/30">
                8x8 Draughts
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Series: <span className="text-red-400 font-bold">Red {seriesScore.red}</span> - <span className="text-slate-200 font-bold">Black {seriesScore.black}</span>
            </p>
          </div>
        </div>

        {/* Center: Turn Indicator */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <div
            className={`w-4 h-4 rounded-full border-2 ${
              turn === 'red' ? 'bg-red-500 border-red-300 animate-pulse' : 'bg-neutral-800 border-neutral-600 animate-pulse'
            }`}
          />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {turn === 'red' ? "Red's Turn" : "Black's Turn"}
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGameMode(m => (m === 'ai' ? 'pass_and_play' : 'ai'))}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5"
            title="Toggle AI / 2-Player Pass & Play"
          >
            {gameMode === 'ai' ? <Bot className="w-3.5 h-3.5 text-blue-400" /> : <User className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden sm:inline">{gameMode === 'ai' ? 'vs Bot' : 'Pass & Play'}</span>
          </button>

          <button
            onClick={() => setViewMode(v => (v === 'isometric' ? '2d' : 'isometric'))}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Toggle 3D / 2D Perspective"
          >
            <Eye className="w-4 h-4 text-blue-400" />
          </button>

          <button
            onClick={() => setShowRules(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Rules"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Main Checkers Board Stage */}
      <div
        className={`relative transition-all duration-500 ${
          viewMode === 'isometric' ? 'perspective-1200' : ''
        } flex items-center justify-center my-2 sm:my-4`}
      >
        <div
          ref={boardRef}
          className={`w-[320px] sm:w-[480px] h-[320px] sm:h-[480px] rounded-2xl bg-[#2d1e16] p-3 sm:p-4 border-8 border-[#1f140e] shadow-[0_30px_60px_rgba(0,0,0,0.9)] transition-transform duration-500 relative ${
            viewMode === 'isometric' ? 'rotate-x-20 shadow-2xl' : ''
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Wood Board Inlay Grid */}
          <div className="w-full h-full grid grid-cols-8 grid-rows-8 rounded-lg overflow-hidden border border-amber-950 shadow-inner">
            {board.map((row, r) =>
              row.map((piece, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSelected = selectedSquare?.r === r && selectedSquare?.c === c;
                const isValidTarget = validMoves.some(m => m.to.r === r && m.to.c === c);

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleSquareClick(r, c)}
                    className={`relative flex items-center justify-center cursor-pointer transition-colors ${
                      isDark ? 'bg-[#3b2518]' : 'bg-[#e2c499]'
                    } ${isSelected ? 'ring-4 ring-blue-400 z-10' : ''}`}
                  >
                    {/* Move Target Marker */}
                    {isValidTarget && (
                      <div className="absolute w-4 h-4 rounded-full bg-emerald-400/80 border-2 border-white shadow-lg animate-ping z-20" />
                    )}

                    {/* Checker Piece Render */}
                    {piece && (
                      <div
                        className={`w-7 sm:w-11 h-7 sm:h-11 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform transform active:scale-95 ${
                          piece.color === 'red'
                            ? 'bg-gradient-to-br from-red-500 via-red-600 to-rose-900 border-rose-300 shadow-[0_4px_8px_rgba(225,29,72,0.6)]'
                            : 'bg-gradient-to-br from-neutral-800 via-neutral-900 to-black border-neutral-600 shadow-[0_4px_8px_rgba(0,0,0,0.8)]'
                        } ${isSelected ? 'scale-110 -translate-y-1' : ''}`}
                      >
                        {/* Concentric Ridge Rings */}
                        <div
                          className={`w-4 sm:w-7 h-4 sm:h-7 rounded-full border ${
                            piece.color === 'red' ? 'border-rose-300/40' : 'border-neutral-500/40'
                          } flex items-center justify-center`}
                        >
                          {piece.isKing && (
                            <Crown className="w-3.5 sm:w-5 h-3.5 sm:h-5 text-amber-300 fill-amber-400 drop-shadow animate-bounce" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Piece Tracker Footer */}
      <div className="w-full max-w-md flex items-center justify-between bg-slate-900/80 border border-slate-800 px-6 py-2.5 rounded-xl mt-2 text-xs font-mono text-slate-300">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-red-600 border border-red-300" />
          <span>Red Pawns: <strong className="text-white">{redCount}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-neutral-900 border border-neutral-600" />
          <span>Black Pawns: <strong className="text-white">{blackCount}</strong></span>
        </div>
      </div>

      {/* Winner / Rematch Overlay */}
      {winner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="sleek-card border-slate-700/80 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto mb-4 text-3xl">
              🏆
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-wider">
              {winner === 'red' ? 'RED WINS THE MATCH!' : 'BLACK WINS THE MATCH!'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Series Score: Red {seriesScore.red} - Black {seriesScore.black}
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={restartGame}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-blue-900/40 transition-all hover:scale-105"
              >
                Play Rematch
              </button>
              <button
                onClick={onBackToShelf}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider text-xs border border-slate-700"
              >
                Back to Shelf
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRules && <RulesModal game={checkersMetadata} onClose={() => setShowRules(false)} />}
    </div>
  );
};
