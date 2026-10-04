import React, { useState, useEffect, useRef } from 'react';
import { ChessBoard, ChessPiece, ChessPieceColor, ChessPieceType, ChessState, ViewMode } from '../../types';
import {
  initializeChess,
  getLegalMoves,
  getBestChessMove,
  findKing,
  isSquareUnderAttack
} from './chessLogic';
import { sound } from '../../utils/audio';
import { AnimatedHand } from '../../components/HandCursor';
import confetti from 'canvas-confetti';
import {
  Crown,
  RotateCcw,
  Sparkles,
  Eye,
  Bot,
  User,
  ShieldAlert,
  Swords,
  ChevronRight,
  HelpCircle,
  Trophy
} from 'lucide-react';
import { RulesModal } from '../../components/RulesModal';
import { GAME_CATALOG } from '../../utils/gameData';

interface ChessGameProps {
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onOpenRules: () => void;
  onBackToShelf: () => void;
}

const PIECE_UNICODE: Record<ChessPieceColor, Record<ChessPieceType, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }
};

export const ChessGame: React.FC<ChessGameProps> = ({
  viewMode,
  onToggleViewMode,
  onOpenRules,
  onBackToShelf
}) => {
  const [state, setState] = useState<ChessState>(initializeChess);
  const [isVersusAI, setIsVersusAI] = useState<boolean>(true);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [seriesScore, setSeriesScore] = useState<{ w: number; b: number }>({ w: 0, b: 0 });
  const [showRules, setShowRules] = useState<boolean>(false);
  const [promotionPending, setPromotionPending] = useState<{
    from: { r: number; c: number };
    to: { r: number; c: number };
    piece: ChessPiece;
  } | null>(null);

  // Animated Hand state
  const [handState, setHandState] = useState<{
    visible: boolean;
    x: number;
    y: number;
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
  const chessMetadata = GAME_CATALOG.find(g => g.id === 'chess')!;

  const triggerHandMove = (from: { r: number; c: number }, to: { r: number; c: number }, isAI: boolean) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const cellSize = rect.width / 8;
    const startX = rect.left + from.c * cellSize + cellSize / 2;
    const startY = rect.top + from.r * cellSize + cellSize / 2;
    const endX = rect.left + to.c * cellSize + cellSize / 2;
    const endY = rect.top + to.r * cellSize + cellSize / 2;

    setHandState({
      visible: true,
      x: startX,
      y: startY,
      action: 'pinch',
      label: isAI ? 'Grandmaster AI' : 'Player Move',
      isEnemy: isAI || state.turn === 'b'
    });

    setTimeout(() => {
      setHandState(prev => ({ ...prev, x: endX, y: endY, action: 'slide' }));
    }, 200);

    setTimeout(() => {
      setHandState(prev => ({ ...prev, action: 'drop' }));
    }, 450);

    setTimeout(() => {
      setHandState(prev => ({ ...prev, visible: false }));
    }, 700);
  };

  // Handle Square Click
  const handleSquareClick = (r: number, c: number) => {
    if (state.isCheckmate || state.isStalemate || promotionPending) return;
    if (isVersusAI && state.turn === 'b') return;

    const clickedPiece = state.board[r][c];

    if (state.selectedSquare) {
      const isValid = state.validMoves.some(m => m.r === r && m.c === c);
      if (isValid) {
        const fromPiece = state.board[state.selectedSquare.r][state.selectedSquare.c]!;

        if (fromPiece.type === 'p' && (r === 0 || r === 7)) {
          setPromotionPending({
            from: { r: state.selectedSquare.r, c: state.selectedSquare.c },
            to: { r, c },
            piece: fromPiece
          });
          return;
        }

        executeMove(state.selectedSquare, { r, c }, fromPiece, undefined, false);
        return;
      }
    }

    if (clickedPiece && clickedPiece.color === state.turn) {
      const legals = getLegalMoves(state.board, r, c);
      sound.playPieceSelect();
      setState(prev => ({
        ...prev,
        selectedSquare: { r, c },
        validMoves: legals
      }));
    } else {
      setState(prev => ({
        ...prev,
        selectedSquare: null,
        validMoves: []
      }));
    }
  };

  const executeMove = (
    from: { r: number; c: number },
    to: { r: number; c: number },
    piece: ChessPiece,
    promotedTo?: ChessPieceType,
    isAI = false
  ) => {
    triggerHandMove(from, to, isAI);

    const nextBoard = state.board.map(row => [...row]);
    const captured = nextBoard[to.r][to.c];

    if (captured) {
      sound.playChessCapture();
    } else {
      sound.playChessMove();
    }

    const movingPiece: ChessPiece = {
      ...piece,
      type: promotedTo || piece.type,
      hasMoved: true
    };

    nextBoard[from.r][from.c] = null;
    nextBoard[to.r][to.c] = movingPiece;

    // Castling rook repositioning
    if (piece.type === 'k' && Math.abs(to.c - from.c) === 2) {
      if (to.c === 6) {
        nextBoard[to.r][5] = { ...nextBoard[to.r][7]!, hasMoved: true };
        nextBoard[to.r][7] = null;
      } else if (to.c === 2) {
        nextBoard[to.r][3] = { ...nextBoard[to.r][0]!, hasMoved: true };
        nextBoard[to.r][0] = null;
      }
    }

    const nextTurn: ChessPieceColor = state.turn === 'w' ? 'b' : 'w';

    // Check check and checkmate
    const enemyKingPos = findKing(nextBoard, nextTurn);
    const inCheck = enemyKingPos
      ? isSquareUnderAttack(nextBoard, enemyKingPos.r, enemyKingPos.c, state.turn)
      : false;

    let hasLegalMoves = false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (nextBoard[r][c]?.color === nextTurn) {
          if (getLegalMoves(nextBoard, r, c).length > 0) {
            hasLegalMoves = true;
            break;
          }
        }
      }
      if (hasLegalMoves) break;
    }

    const isCheckmate = inCheck && !hasLegalMoves;
    const isStalemate = !inCheck && !hasLegalMoves;

    if (inCheck && !isCheckmate) {
      sound.playChessCheck();
    }

    if (isCheckmate) {
      sound.playVictoryFanfare();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setSeriesScore(sc => ({
        ...sc,
        [state.turn]: sc[state.turn] + 1
      }));
    }

    const nextCapWhite = [...state.capturedWhite];
    const nextCapBlack = [...state.capturedBlack];
    if (captured) {
      if (captured.color === 'w') nextCapWhite.push(captured);
      else nextCapBlack.push(captured);
    }

    setState(prev => ({
      ...prev,
      board: nextBoard,
      turn: nextTurn,
      selectedSquare: null,
      validMoves: [],
      capturedWhite: nextCapWhite,
      capturedBlack: nextCapBlack,
      isCheck: inCheck,
      isCheckmate,
      isStalemate,
      lastMove: { from, to, piece, captured }
    }));
  };

  // AI Turn Handling
  useEffect(() => {
    if (!isVersusAI || state.turn !== 'b' || state.isCheckmate || state.isStalemate) return;

    const timer = setTimeout(() => {
      const bestMove = getBestChessMove(state.board, aiDifficulty);
      if (bestMove) {
        const piece = state.board[bestMove.from.r][bestMove.from.c]!;
        executeMove(bestMove.from, bestMove.to, piece, undefined, true);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [state.turn, state.isCheckmate, state.isStalemate, isVersusAI, aiDifficulty]);

  const restartMatch = () => {
    sound.playButtonClick();
    setState(initializeChess());
    setPromotionPending(null);
  };

  return (
    <div className="w-full max-w-4xl flex flex-col items-center justify-start text-white select-none py-2 px-2 sm:px-4 animate-in fade-in duration-300">
      <AnimatedHand
        x={handState.x}
        y={handState.y}
        visible={handState.visible}
        action={handState.action}
        label={handState.label}
        isEnemy={handState.isEnemy}
      />

      {/* Top Header Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 backdrop-blur shadow-xl mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToShelf}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all hover:scale-105"
          >
            <RotateCcw className="w-4 h-4 text-blue-400" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>CHESS</span>
              <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                Staunton Classic
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Series: <span className="text-amber-300 font-bold">White {seriesScore.w}</span> - <span className="text-slate-300 font-bold">Black {seriesScore.b}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsVersusAI(v => !v)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5"
          >
            {isVersusAI ? <Bot className="w-3.5 h-3.5 text-blue-400" /> : <User className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isVersusAI ? 'vs Bot' : 'Pass & Play'}</span>
          </button>

          <button
            onClick={onToggleViewMode}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            <Eye className="w-4 h-4 text-blue-400" />
          </button>

          <button
            onClick={() => setShowRules(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Main Wooden Chessboard */}
      <div
        className={`relative transition-all duration-500 my-2 ${
          viewMode === 'isometric' ? 'perspective-1200' : ''
        }`}
      >
        <div
          ref={boardRef}
          className={`w-[320px] sm:w-[480px] h-[320px] sm:h-[480px] rounded-2xl bg-[#2b1810] p-3 sm:p-4 border-8 border-[#1a0f0a] shadow-[0_25px_60px_rgba(0,0,0,0.9)] relative transition-transform duration-500 ${
            viewMode === 'isometric' ? 'rotate-x-20 shadow-2xl' : ''
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="w-full h-full grid grid-cols-8 grid-rows-8 rounded-lg overflow-hidden border border-amber-950 shadow-inner">
            {state.board.map((row, r) =>
              row.map((piece, c) => {
                const isDark = (r + c) % 2 === 1;
                const isSelected = state.selectedSquare?.r === r && state.selectedSquare?.c === c;
                const isValidMove = state.validMoves.some(m => m.r === r && m.c === c);

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleSquareClick(r, c)}
                    className={`relative flex items-center justify-center cursor-pointer transition-colors ${
                      isDark ? 'bg-[#b58863]' : 'bg-[#f0d9b5]'
                    } ${isSelected ? 'ring-4 ring-blue-500 z-10' : ''}`}
                  >
                    {isValidMove && (
                      <div className="absolute w-3.5 h-3.5 rounded-full bg-emerald-500/80 border border-white z-20 animate-ping" />
                    )}

                    {piece && (
                      <span
                        className={`text-2xl sm:text-4xl select-none transition-transform drop-shadow ${
                          piece.color === 'w' ? 'text-slate-100 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]' : 'text-neutral-900'
                        } ${isSelected ? 'scale-110 -translate-y-1' : ''}`}
                      >
                        {PIECE_UNICODE[piece.color][piece.type]}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Captured Pieces Readout */}
      <div className="w-full max-w-md flex items-center justify-between bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl mt-2 text-xs font-mono text-slate-300">
        <div>
          <span className="text-slate-400">Captured White:</span>{' '}
          {state.capturedWhite.map((p, i) => PIECE_UNICODE.w[p.type]).join(' ')}
        </div>
        <div>
          <span className="text-slate-400">Captured Black:</span>{' '}
          {state.capturedBlack.map((p, i) => PIECE_UNICODE.b[p.type]).join(' ')}
        </div>
      </div>

      {/* Checkmate / Rematch Overlay */}
      {(state.isCheckmate || state.isStalemate) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="sleek-card border-slate-700/80 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center mx-auto mb-4 text-3xl">
              🏆
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-wider">
              {state.isCheckmate
                ? `${state.turn === 'w' ? 'BLACK' : 'WHITE'} WINS BY CHECKMATE!`
                : 'DRAW BY STALEMATE!'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Series Score: White {seriesScore.w} - Black {seriesScore.b}
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={restartMatch}
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

      {showRules && <RulesModal game={chessMetadata} onClose={() => setShowRules(false)} />}
    </div>
  );
};
