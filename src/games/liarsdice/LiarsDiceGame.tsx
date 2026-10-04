import React, { useState, useEffect } from 'react';
import { LiarsDiceBid, LiarsDicePlayer, LiarsDiceState, ViewMode } from '../../types';
import {
  initializeLiarsDice,
  rollDice,
  countMatchingDice,
  isValidBid
} from './liarsDiceLogic';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import {
  Dices,
  RotateCcw,
  Sparkles,
  Eye,
  EyeOff,
  Bot,
  User,
  ShieldAlert,
  Flame,
  Volume2,
  ChevronUp,
  Skull
} from 'lucide-react';

interface LiarsDiceGameProps {
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onOpenRules: () => void;
}

const DICE_UNICODE: Record<number, string> = {
  1: '⚀',
  2: '⚁',
  3: '⚂',
  4: '⚃',
  5: '⚄',
  6: '⚅'
};

export const LiarsDiceGame: React.FC<LiarsDiceGameProps> = ({
  viewMode,
  onToggleViewMode,
  onOpenRules
}) => {
  const [state, setState] = useState<LiarsDiceState>(initializeLiarsDice);
  const [isPeeking, setIsPeeking] = useState<boolean>(true);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(2);
  const [selectedFace, setSelectedFace] = useState<number>(3);

  const currentPlayer = state.players[state.currentTurnIndex];
  const activePlayers = state.players.filter(p => !p.isEliminated);
  const totalDiceInPlay = activePlayers.reduce((acc, p) => acc + p.diceCount, 0);

  // Submit Player Bid
  const handleMakeBid = () => {
    if (state.roundPhase !== 'bidding' || currentPlayer.isBot) return;

    if (!isValidBid({ quantity: selectedQuantity, faceValue: selectedFace }, state.currentBid)) {
      return;
    }

    sound.playPawnHop();

    const nextBid: LiarsDiceBid = {
      playerId: currentPlayer.id,
      quantity: selectedQuantity,
      faceValue: selectedFace
    };

    const nextTurnIndex = getNextActivePlayerIndex(state.currentTurnIndex);

    setState(prev => ({
      ...prev,
      lastBid: prev.currentBid,
      currentBid: nextBid,
      currentTurnIndex: nextTurnIndex
    }));
  };

  // Call LIAR! (Dudo)
  const handleCallLiar = () => {
    if (state.roundPhase !== 'bidding' || !state.currentBid) return;

    sound.playCupSlam();

    const allDice = state.players.filter(p => !p.isEliminated).map(p => p.dice);
    const actualMatches = countMatchingDice(allDice, state.currentBid.faceValue);
    const isBidCorrect = actualMatches >= state.currentBid.quantity;

    const bidder = state.players.find(p => p.id === state.currentBid!.playerId)!;
    const challenger = currentPlayer;
    const loser = isBidCorrect ? challenger : bidder;

    const nextPlayers = state.players.map(p => {
      if (p.id === loser.id) {
        const nextCount = p.diceCount - 1;
        return {
          ...p,
          diceCount: nextCount,
          isEliminated: nextCount <= 0
        };
      }
      return p;
    });

    const remainingActive = nextPlayers.filter(p => !p.isEliminated);
    let winner: LiarsDicePlayer | null = null;
    if (remainingActive.length === 1) {
      winner = remainingActive[0];
      sound.playVictoryFanfare();
      if (!winner.isBot) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      }
    }

    setState(prev => ({
      ...prev,
      players: nextPlayers,
      roundPhase: winner ? 'game_over' : 'reveal',
      revealedDice: prev.players.map(p => ({ playerId: p.id, dice: p.dice })),
      revealSummary: {
        challenger: challenger.name,
        bidder: bidder.name,
        actualCount: actualMatches,
        bidCount: prev.currentBid!.quantity,
        loser: loser.name
      },
      winner
    }));
  };

  // Next Round reset
  const handleStartNextRound = () => {
    sound.playDiceShake();

    const nextPlayers = state.players.map(p => ({
      ...p,
      dice: p.isEliminated ? [] : rollDice(p.diceCount)
    }));

    setState(prev => ({
      ...prev,
      players: nextPlayers,
      roundPhase: 'bidding',
      currentBid: null,
      lastBid: null,
      revealedDice: null,
      revealSummary: null,
      currentTurnIndex: getNextActivePlayerIndex(prev.currentTurnIndex)
    }));
  };

  const getNextActivePlayerIndex = (currentIdx: number): number => {
    let nextIdx = (currentIdx + 1) % state.players.length;
    while (state.players[nextIdx].isEliminated) {
      nextIdx = (nextIdx + 1) % state.players.length;
    }
    return nextIdx;
  };

  // Bot Turn AI
  useEffect(() => {
    if (state.roundPhase !== 'bidding' || !currentPlayer.isBot || state.winner) return;

    const botTimer = setTimeout(() => {
      // If no bid yet, make a reasonable initial bid
      if (!state.currentBid) {
        const botHand = currentPlayer.dice;
        const faceCounts: Record<number, number> = {};
        botHand.forEach(d => (faceCounts[d] = (faceCounts[d] || 0) + 1));
        let bestFace = 2;
        let maxC = 0;
        Object.entries(faceCounts).forEach(([f, c]) => {
          if (parseInt(f) !== 1 && c > maxC) {
            maxC = c;
            bestFace = parseInt(f);
          }
        });

        const initialQty = Math.max(1, Math.floor(totalDiceInPlay / 3));
        const nextBid: LiarsDiceBid = {
          playerId: currentPlayer.id,
          quantity: initialQty,
          faceValue: bestFace
        };

        sound.playPawnHop();
        setState(prev => ({
          ...prev,
          currentBid: nextBid,
          currentTurnIndex: getNextActivePlayerIndex(prev.currentTurnIndex)
        }));
        return;
      }

      // Check probability of current bid
      const myCount = countMatchingDice([currentPlayer.dice], state.currentBid.faceValue);
      const estimatedTotal = myCount + (totalDiceInPlay - currentPlayer.diceCount) * (1 / 3);

      // If bid exceeds statistical expectation significantly, call LIAR
      if (state.currentBid.quantity > estimatedTotal + 1.2) {
        handleCallLiar();
      } else {
        // Raise bid
        const nextQty = state.currentBid.quantity + (Math.random() > 0.6 ? 1 : 0);
        const nextFace = nextQty === state.currentBid.quantity ? Math.min(6, state.currentBid.faceValue + 1) : state.currentBid.faceValue;

        const nextBid: LiarsDiceBid = {
          playerId: currentPlayer.id,
          quantity: nextQty,
          faceValue: nextFace
        };

        sound.playPawnHop();
        setState(prev => ({
          ...prev,
          currentBid: nextBid,
          currentTurnIndex: getNextActivePlayerIndex(prev.currentTurnIndex)
        }));
      }
    }, 1100);

    return () => clearTimeout(botTimer);
  }, [state.roundPhase, currentPlayer, state.currentBid, state.winner]);

  return (
    <div className="w-full flex flex-col items-center justify-start text-white select-none py-2 px-2 sm:px-4">
      {/* Header controls */}
      <div className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 bg-amber-950/90 border border-amber-800/80 rounded-2xl p-3 sm:p-4 backdrop-blur shadow-xl mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400">
            <Skull className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-wide text-yellow-400 flex items-center gap-2">
              PIRATE'S LIAR'S DICE (PERUDO)
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-yellow-300 border border-yellow-800">
                {totalDiceInPlay} Dice in Play
              </span>
            </h2>
            <p className="text-xs text-amber-200/80 font-mono">
              Turn: <strong>{currentPlayer.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={onToggleViewMode}
            className="px-3 py-1.5 rounded-xl bg-amber-900/80 hover:bg-amber-800 text-xs font-semibold flex items-center gap-1.5 border border-amber-700 transition-all hover:scale-105"
          >
            <Eye className="w-3.5 h-3.5 text-yellow-400" />
            {viewMode === 'isometric' ? '2D View' : '3D View'}
          </button>

          <button
            onClick={onOpenRules}
            className="px-3 py-1.5 rounded-xl bg-amber-900/80 hover:bg-amber-800 text-xs font-semibold flex items-center gap-1.5 border border-amber-700 transition-all hover:scale-105"
          >
            Rules
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setState(initializeLiarsDice());
            }}
            className="px-3 py-1.5 rounded-xl bg-rose-900/80 hover:bg-rose-800 text-xs font-semibold flex items-center gap-1.5 border border-rose-700 transition-all hover:scale-105"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Match
          </button>
        </div>
      </div>

      {/* Current Bid Banner */}
      <div className="w-full max-w-5xl py-3 px-5 rounded-2xl mb-4 bg-gradient-to-r from-amber-950 via-stone-900 to-amber-950 border-2 border-yellow-500/40 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase font-black tracking-widest text-amber-400">
            Current Table Bid:
          </span>
          {state.currentBid ? (
            <div className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded-xl border border-yellow-500/50">
              <span className="text-xl font-black text-white">{state.currentBid.quantity}x</span>
              <span className="text-2xl text-yellow-400 font-bold">
                {DICE_UNICODE[state.currentBid.faceValue]}
              </span>
              <span className="text-xs text-amber-200">({state.currentBid.faceValue}s)</span>
              <span className="text-[10px] text-slate-400 ml-2">
                by {state.players.find(p => p.id === state.currentBid!.playerId)?.name}
              </span>
            </div>
          ) : (
            <span className="text-sm font-semibold text-slate-300">
              No bids placed yet. Place initial bid!
            </span>
          )}
        </div>
        <span className="text-xs text-amber-300/80 font-mono">
          Note: 1s (Aces) are WILD!
        </span>
      </div>

      {/* Main 3D Round Table */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Table Arena with Players around */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div
            className={`relative w-full aspect-[4/3] rounded-3xl bg-gradient-to-b from-amber-900 via-yellow-950 to-stone-950 p-6 border-8 border-amber-950 shadow-[0_25px_60px_rgba(0,0,0,0.9),inset_0_4px_25px_rgba(0,0,0,0.8)] flex flex-col justify-between transition-all duration-700 ${
              viewMode === 'isometric'
                ? 'transform rotate-x-12 scale-95 hover:scale-100 hover:rotate-x-6'
                : 'rotate-0 scale-100'
            }`}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* Top Bots */}
            <div className="flex justify-around w-full">
              {state.players.filter(p => p.isBot).map(bot => (
                <div
                  key={bot.id}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-2 backdrop-blur transition-all ${
                    bot.isEliminated
                      ? 'bg-black/60 border-slate-800 opacity-40'
                      : bot.id === currentPlayer.id
                      ? 'bg-yellow-950/80 border-yellow-400 ring-2 ring-yellow-400/50 scale-105 shadow-xl'
                      : 'bg-black/40 border-amber-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{bot.avatar}</span>
                    <div className="text-left">
                      <div className="text-xs font-bold text-white">{bot.name}</div>
                      <div className="text-[10px] text-amber-300 font-mono">
                        {bot.isEliminated ? 'ELIMINATED' : `${bot.diceCount} dice`}
                      </div>
                    </div>
                  </div>

                  {/* Dice Cup / Revealed Dice */}
                  <div className="flex gap-1 bg-black/50 px-3 py-1.5 rounded-xl border border-white/10">
                    {state.roundPhase === 'reveal' || state.roundPhase === 'game_over' ? (
                      bot.dice.map((d, i) => (
                        <span key={i} className="text-2xl text-yellow-300">
                          {DICE_UNICODE[d]}
                        </span>
                      ))
                    ) : (
                      Array.from({ length: bot.diceCount }, (_, i) => (
                        <div
                          key={i}
                          className="w-5 h-6 rounded-t-lg bg-amber-800 border border-amber-600 shadow-inner flex items-center justify-center text-[10px]"
                        >
                          🎲
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Table Center: Showdown Summary Banner */}
            {state.revealSummary && (
              <div className="my-auto bg-black/85 border-2 border-yellow-500 rounded-2xl p-4 text-center shadow-2xl animate-in zoom-in-90 duration-300">
                <h3 className="text-lg font-black text-yellow-300">
                  ⚔️ CHALLENGE REVEAL: {state.revealSummary.challenger} called LIAR on {state.revealSummary.bidder}!
                </h3>
                <p className="text-sm text-white mt-1">
                  Actual matching dice on table:{' '}
                  <strong className="text-yellow-400 text-lg">{state.revealSummary.actualCount}</strong>{' '}
                  (Bid was {state.revealSummary.bidCount})
                </p>
                <p className="text-xs text-rose-400 font-bold mt-2">
                  ☠️ {state.revealSummary.loser} lost 1 die!
                </p>

                <button
                  onClick={handleStartNextRound}
                  className="mt-3 px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-xs hover:scale-105 active:scale-95 transition-all shadow"
                >
                  Roll Next Round 🎲
                </button>
              </div>
            )}

            {/* Bottom: Player's Cup & Dice */}
            <div className="w-full flex flex-col items-center">
              <div className="bg-black/60 border-2 border-yellow-500/50 rounded-2xl p-4 flex flex-col items-center gap-2 backdrop-blur shadow-2xl">
                <div className="flex items-center justify-between w-full gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">🏴‍☠️</span>
                    <div>
                      <div className="text-sm font-black text-amber-300">Your Pirate Cup</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {state.players[0].diceCount} Dice Remaining
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      sound.playButtonClick();
                      setIsPeeking(!isPeeking);
                    }}
                    className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                  >
                    {isPeeking ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-cyan-400" />}
                    {isPeeking ? 'Hide Dice' : 'Peek Under Cup'}
                  </button>
                </div>

                {/* Dice Display */}
                <div className="flex gap-2 mt-2">
                  {isPeeking ? (
                    state.players[0].dice.map((d, idx) => (
                      <div
                        key={idx}
                        className="w-10 h-10 rounded-xl bg-amber-100 text-stone-950 flex items-center justify-center text-3xl font-bold shadow-[0_4px_10px_rgba(0,0,0,0.5)] border-2 border-amber-300 transform hover:scale-110 transition-transform"
                      >
                        {DICE_UNICODE[d]}
                      </div>
                    ))
                  ) : (
                    <div className="h-10 px-6 rounded-xl bg-amber-900 border border-amber-700 flex items-center justify-center text-xs font-bold text-amber-200">
                      🔒 Dice Hidden Under Leather Cup
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Controls: Bidding Terminal */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-amber-950/90 border-2 border-amber-800 rounded-3xl p-5 shadow-xl flex flex-col gap-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-yellow-400">
              Bidding Controls
            </h3>

            {state.roundPhase === 'bidding' && !currentPlayer.isBot && (
              <>
                {/* Quantity Selector */}
                <div>
                  <label className="text-xs text-amber-200 font-bold block mb-1">
                    Total Quantity on Table:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={totalDiceInPlay}
                      value={selectedQuantity}
                      onChange={e => setSelectedQuantity(parseInt(e.target.value) || 1)}
                      className="w-full bg-black/60 border border-amber-700 rounded-xl px-3 py-2 text-white font-bold text-lg text-center"
                    />
                  </div>
                </div>

                {/* Face Value Selector (1-6) */}
                <div>
                  <label className="text-xs text-amber-200 font-bold block mb-1">
                    Dice Face Value:
                  </label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map(face => (
                      <button
                        key={face}
                        onClick={() => {
                          sound.playButtonClick();
                          setSelectedFace(face);
                        }}
                        className={`p-2 rounded-xl border text-xl flex items-center justify-center transition-all ${
                          selectedFace === face
                            ? 'bg-yellow-500 text-black border-white shadow-lg scale-105'
                            : 'bg-black/50 border-amber-800 text-amber-300 hover:bg-black/80'
                        }`}
                      >
                        {DICE_UNICODE[face]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={handleMakeBid}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-sm shadow-lg transition-all hover:scale-105 active:scale-95"
                  >
                    Raise Bid ({selectedQuantity}x {DICE_UNICODE[selectedFace]})
                  </button>

                  {state.currentBid && (
                    <button
                      onClick={handleCallLiar}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-sm shadow-lg shadow-rose-600/40 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Skull className="w-4 h-4" />
                      CALL "LIAR!" (DUDO)
                    </button>
                  )}
                </div>
              </>
            )}

            {currentPlayer.isBot && state.roundPhase === 'bidding' && (
              <div className="text-center py-6 text-sm text-amber-300 font-semibold animate-pulse">
                {currentPlayer.name} is calculating their bluff...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
