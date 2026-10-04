import React, { useState, useEffect } from 'react';
import { ViewMode } from '../../types';
import { sound } from '../../utils/audio';
import {
  Coins,
  Flame,
  Sparkles,
  Award,
  RotateCcw,
  ArrowLeft,
  DollarSign,
  HelpCircle,
  Trophy,
  Dices,
  CircleDot
} from 'lucide-react';

interface CasinoLoungeGameProps {
  onBackToShelf?: () => void;
  onOpenPoker?: () => void;
}

const SLOT_SYMBOLS = ['🍒', '🔔', '🍇', '💎', '🎰', '🌟'];

const ROULETTE_NUMBERS = [
  { num: 0, color: 'green' },
  { num: 32, color: 'red' },
  { num: 15, color: 'black' },
  { num: 19, color: 'red' },
  { num: 4, color: 'black' },
  { num: 21, color: 'red' },
  { num: 2, color: 'black' },
  { num: 25, color: 'red' },
  { num: 17, color: 'black' },
  { num: 34, color: 'red' },
  { num: 6, color: 'black' },
  { num: 27, color: 'red' },
  { num: 13, color: 'black' },
  { num: 36, color: 'red' },
  { num: 11, color: 'black' },
  { num: 30, color: 'red' },
  { num: 8, color: 'black' },
  { num: 23, color: 'red' },
  { num: 10, color: 'black' },
  { num: 5, color: 'red' },
  { num: 24, color: 'black' },
  { num: 16, color: 'red' },
  { num: 33, color: 'black' },
  { num: 1, color: 'red' },
  { num: 20, color: 'black' },
  { num: 14, color: 'red' },
  { num: 31, color: 'black' },
  { num: 9, color: 'red' },
  { num: 22, color: 'black' },
  { num: 18, color: 'red' },
  { num: 29, color: 'black' },
  { num: 7, color: 'red' },
  { num: 28, color: 'black' },
  { num: 12, color: 'red' },
  { num: 35, color: 'black' },
  { num: 3, color: 'red' },
  { num: 26, color: 'black' }
];

export const CasinoLoungeGame: React.FC<CasinoLoungeGameProps> = ({
  onBackToShelf,
  onOpenPoker
}) => {
  const [activeTab, setActiveTab] = useState<'slots' | 'roulette' | 'faucet'>('slots');
  const [chips, setChips] = useState<number>(1500);

  // Slots State
  const [slotReels, setSlotReels] = useState<string[]>(['🌟', '🌟', '🌟']);
  const [slotSpinning, setSlotSpinning] = useState<boolean>(false);
  const [slotBet, setSlotBet] = useState<number>(20);
  const [slotMessage, setSlotMessage] = useState<string>('Spin the reels to win up to 500x!');
  const [slotLastWin, setSlotLastWin] = useState<number>(0);
  const [jackpotPool, setJackpotPool] = useState<number>(25420);

  // Roulette State
  const [selectedChipValue, setSelectedChipValue] = useState<number>(25);
  const [rouletteBets, setRouletteBets] = useState<Record<string, number>>({});
  const [rouletteSpinning, setRouletteSpinning] = useState<boolean>(false);
  const [rouletteResult, setRouletteResult] = useState<{ num: number; color: string } | null>(null);
  const [rouletteRotation, setRouletteRotation] = useState<number>(0);
  const [rouletteMessage, setRouletteMessage] = useState<string>('Place your bets on the felt table!');

  // Faucet state
  const [faucetClaimed, setFaucetClaimed] = useState<boolean>(false);

  // ----------------------------------------------------
  // SLOTS LOGIC
  // ----------------------------------------------------
  const handleSpinSlots = () => {
    if (slotSpinning) return;
    if (chips < slotBet) {
      setSlotMessage('Not enough chips! Claim free chips in the Faucet.');
      return;
    }

    sound.playSlotSpin();
    setChips(prev => prev - slotBet);
    setJackpotPool(prev => prev + Math.floor(slotBet * 0.15));
    setSlotSpinning(true);
    setSlotMessage('Reels are spinning...');
    setSlotLastWin(0);

    // Simulate animated spinning
    const interval = setInterval(() => {
      setSlotReels([
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)],
        SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]
      ]);
    }, 80);

    setTimeout(() => {
      clearInterval(interval);
      sound.playSlotStop();

      // Determine final reel values
      const r1 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
      const r2 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
      const r3 = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
      const finalReels = [r1, r2, r3];
      setSlotReels(finalReels);
      setSlotSpinning(false);

      // Evaluate Payout
      let multiplier = 0;
      if (r1 === '🌟' && r2 === '🌟' && r3 === '🌟') {
        multiplier = 500;
      } else if (r1 === '💎' && r2 === '💎' && r3 === '💎') {
        multiplier = 200;
      } else if (r1 === '🎰' && r2 === '🎰' && r3 === '🎰') {
        multiplier = 100;
      } else if (r1 === '🔔' && r2 === '🔔' && r3 === '🔔') {
        multiplier = 50;
      } else if (r1 === '🍇' && r2 === '🍇' && r3 === '🍇') {
        multiplier = 25;
      } else if (r1 === '🍒' && r2 === '🍒' && r3 === '🍒') {
        multiplier = 15;
      } else {
        const cherryCount = finalReels.filter(s => s === '🍒').length;
        if (cherryCount === 2) multiplier = 5;
        else if (cherryCount === 1) multiplier = 2;
      }

      const winAmount = slotBet * multiplier;
      if (winAmount > 0) {
        sound.playSlotJackpot();
        setChips(prev => prev + winAmount);
        setSlotLastWin(winAmount);
        setSlotMessage(`🎉 JACKPOT WIN! Payout: $${winAmount} (${multiplier}x)!`);
      } else {
        setSlotMessage('No match this spin. Try again!');
      }
    }, 1800);
  };

  // ----------------------------------------------------
  // ROULETTE LOGIC
  // ----------------------------------------------------
  const handlePlaceRouletteBet = (betKey: string) => {
    if (rouletteSpinning) return;
    if (chips < selectedChipValue) {
      setRouletteMessage('Not enough chips for this bet!');
      return;
    }
    sound.playPokerChipsBet();
    setChips(prev => prev - selectedChipValue);
    setRouletteBets(prev => ({
      ...prev,
      [betKey]: (prev[betKey] || 0) + selectedChipValue
    }));
  };

  const handleClearRouletteBets = () => {
    if (rouletteSpinning) return;
    sound.playButtonClick();
    const totalRefund = (Object.values(rouletteBets) as number[]).reduce((a: number, b: number) => a + b, 0);
    setChips(prev => prev + totalRefund);
    setRouletteBets({});
  };

  const handleSpinRoulette = () => {
    const totalBet = (Object.values(rouletteBets) as number[]).reduce((a: number, b: number) => a + b, 0);
    if (totalBet === 0) {
      setRouletteMessage('Place at least one bet on the board first!');
      return;
    }
    if (rouletteSpinning) return;

    sound.playRouletteSpin();
    setRouletteSpinning(true);
    setRouletteMessage('Wheel is spinning... No more bets!');

    const winningIdx = Math.floor(Math.random() * ROULETTE_NUMBERS.length);
    const winningObj = ROULETTE_NUMBERS[winningIdx];

    const spinTurns = 5 + Math.floor(Math.random() * 3);
    const targetAngle = spinTurns * 360 + (winningIdx * (360 / ROULETTE_NUMBERS.length));
    setRouletteRotation(prev => prev + targetAngle);

    setTimeout(() => {
      sound.playRouletteBallDrop();
      setRouletteResult(winningObj);
      setRouletteSpinning(false);

      // Payout calculations
      let totalWon = 0;
      const num = winningObj.num;
      const col = winningObj.color;

      Object.entries(rouletteBets).forEach(([key, amountRaw]) => {
        const amount = Number(amountRaw) || 0;
        if (key === `num_${num}`) {
          totalWon += amount * 36; // 35:1 + original
        } else if (key === 'red' && col === 'red') {
          totalWon += amount * 2;
        } else if (key === 'black' && col === 'black') {
          totalWon += amount * 2;
        } else if (key === 'even' && num !== 0 && num % 2 === 0) {
          totalWon += amount * 2;
        } else if (key === 'odd' && num % 2 === 1) {
          totalWon += amount * 2;
        } else if (key === 'low' && num >= 1 && num <= 18) {
          totalWon += amount * 2;
        } else if (key === 'high' && num >= 19 && num <= 36) {
          totalWon += amount * 2;
        } else if (key === '1st12' && num >= 1 && num <= 12) {
          totalWon += amount * 3;
        } else if (key === '2nd12' && num >= 13 && num <= 24) {
          totalWon += amount * 3;
        } else if (key === '3rd12' && num >= 25 && num <= 36) {
          totalWon += amount * 3;
        }
      });

      if (totalWon > 0) {
        sound.playVictoryFanfare();
        setChips(prev => prev + totalWon);
        setRouletteMessage(`🎉 Number ${num} (${col.toUpperCase()})! You won $${totalWon}!`);
      } else {
        sound.playDefeat();
        setRouletteMessage(`Ball landed on ${num} (${col.toUpperCase()}). Better luck next spin!`);
      }

      setRouletteBets({});
    }, 3200);
  };

  // ----------------------------------------------------
  // FAUCET LOGIC
  // ----------------------------------------------------
  const handleClaimDailyChips = () => {
    if (faucetClaimed) return;
    sound.playVictoryFanfare();
    setChips(prev => prev + 1000);
    setFaucetClaimed(true);
  };

  return (
    <div className="w-full max-w-6xl px-2 sm:px-4 py-3 flex flex-col items-center select-none animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {onBackToShelf && (
            <button
              onClick={onBackToShelf}
              className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all shadow"
              title="Back to Shelf"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 border border-emerald-300/40 flex items-center justify-center text-white font-bold shadow-lg">
              🎰
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                ROYAL DISCORD CASINO & LOUNGE
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                  Chips: ${chips}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">High-Roller Mini Games • Slots & Roulette</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher & Poker Link */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => {
                sound.playButtonClick();
                setActiveTab('slots');
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'slots' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Lucky 777 Slots
            </button>
            <button
              onClick={() => {
                sound.playButtonClick();
                setActiveTab('roulette');
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'roulette' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Roulette Wheel
            </button>
            <button
              onClick={() => {
                sound.playButtonClick();
                setActiveTab('faucet');
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'faucet' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Free Faucet
            </button>
          </div>

          {onOpenPoker && (
            <button
              onClick={onOpenPoker}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-950/40 transition-all hover:scale-105"
            >
              <span>♠️ Poker Room</span>
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: RETRO NEON LUCKY 777 SLOTS */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'slots' && (
        <div className="w-full max-w-3xl flex flex-col items-center">
          {/* Slot Machine Frame */}
          <div className="w-full bg-gradient-to-b from-slate-900 via-slate-950 to-black border-4 border-amber-500/60 rounded-[36px] p-6 sm:p-8 shadow-2xl flex flex-col items-center relative overflow-hidden">
            {/* Ambient Neon Top Glow */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

            {/* Jackpot Banner */}
            <div className="flex items-center gap-2 bg-amber-950/80 border border-amber-500/60 px-6 py-2 rounded-full shadow-lg mb-6 animate-pulse">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-xs sm:text-sm font-mono font-black text-amber-300 uppercase tracking-widest">
                PROGRESSIVE JACKPOT: ${jackpotPool}
              </span>
            </div>

            {/* 3 Mechanical Reels Box */}
            <div className="flex items-center justify-center gap-3 sm:gap-6 bg-black/80 p-5 sm:p-8 rounded-3xl border-4 border-slate-800 shadow-inner w-full max-w-lg mb-6">
              {slotReels.map((symbol, idx) => (
                <div
                  key={idx}
                  className={`w-24 h-32 sm:w-28 sm:h-36 rounded-2xl bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-2 border-amber-500/40 flex items-center justify-center text-4xl sm:text-5xl shadow-2xl transform transition-transform ${
                    slotSpinning ? 'animate-bounce' : 'scale-100'
                  }`}
                  style={{
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.9), 0 8px 16px rgba(0,0,0,0.6)'
                  }}
                >
                  {symbol}
                </div>
              ))}
            </div>

            {/* Status Message */}
            <div className="mb-6 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-amber-300">
              {slotMessage}
            </div>

            {/* Bet & Spin Controls */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {/* Bet Sizing */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Bet:</span>
                {[10, 20, 50, 100].map(b => (
                  <button
                    key={b}
                    onClick={() => {
                      sound.playButtonClick();
                      setSlotBet(b);
                    }}
                    disabled={slotSpinning}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                      slotBet === b
                        ? 'bg-amber-500 text-black shadow-md'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'
                    }`}
                  >
                    ${b}
                  </button>
                ))}
              </div>

              {/* Spin Action Button */}
              <button
                onClick={handleSpinSlots}
                disabled={slotSpinning || chips < slotBet}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-40 text-white font-extrabold text-sm uppercase tracking-widest shadow-xl shadow-emerald-950/60 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <RotateCcw className={`w-4 h-4 ${slotSpinning ? 'animate-spin' : ''}`} />
                {slotSpinning ? 'Spinning...' : `SPIN ($${slotBet})`}
              </button>
            </div>

            {/* Payout Guide */}
            <div className="w-full mt-6 grid grid-cols-2 sm:grid-cols-6 gap-2 text-[10px] font-mono text-slate-400 text-center">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">🌟🌟🌟 : 500x</div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">💎💎💎 : 200x</div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">🎰🎰🎰 : 100x</div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">🔔🔔🔔 : 50x</div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">🍇🍇🍇 : 25x</div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">🍒🍒🍒 : 15x</div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: EUROPEAN ROULETTE TABLE */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'roulette' && (
        <div className="w-full max-w-4xl flex flex-col items-center">
          {/* Wheel & Board Container */}
          <div className="w-full bg-gradient-to-b from-slate-900 via-slate-950 to-black border-4 border-emerald-500/50 rounded-[36px] p-4 sm:p-6 shadow-2xl flex flex-col items-center">
            {/* Roulette Wheel Visualizer */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-4 w-full">
              {/* Spinning Wheel */}
              <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full border-8 border-amber-800 bg-gradient-to-tr from-slate-950 via-emerald-950 to-slate-950 shadow-2xl flex items-center justify-center overflow-hidden">
                <div
                  className="w-full h-full rounded-full border-4 border-amber-400/40 flex items-center justify-center transition-transform duration-[3000ms] ease-out"
                  style={{ transform: `rotate(${rouletteRotation}deg)` }}
                >
                  {/* Wheel center pin */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-amber-600 border-2 border-white/60 shadow-lg flex items-center justify-center text-black font-extrabold text-xs">
                    🎡
                  </div>
                </div>

                {/* Silver Ball Indicator */}
                <div className="absolute top-3 w-4 h-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-400 border border-white shadow-lg animate-pulse" />
              </div>

              {/* Result & Message Display */}
              <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
                {rouletteResult && (
                  <div className="flex items-center gap-3 mb-2 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-lg ${
                        rouletteResult.color === 'red'
                          ? 'bg-rose-600'
                          : rouletteResult.color === 'black'
                          ? 'bg-slate-900'
                          : 'bg-emerald-600'
                      }`}
                    >
                      {rouletteResult.num}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white uppercase">{rouletteResult.color} Number</span>
                      <p className="text-[11px] text-slate-400">Winning Pocket Result</p>
                    </div>
                  </div>
                )}
                <p className="text-xs font-medium text-amber-300 bg-black/60 px-3.5 py-1.5 rounded-xl border border-white/10">
                  {rouletteMessage}
                </p>
              </div>
            </div>

            {/* Felt Betting Table Grid */}
            <div className="w-full bg-emerald-950/90 border-4 border-emerald-600/60 rounded-2xl p-3 sm:p-4 shadow-2xl my-3">
              {/* Outside Bet Row 1 */}
              <div className="grid grid-cols-6 gap-1.5 mb-2 text-xs font-bold">
                <button
                  onClick={() => handlePlaceRouletteBet('1st12')}
                  className="py-2 rounded-lg bg-emerald-900 hover:bg-emerald-800 border border-emerald-500/40 text-white transition-all text-[11px]"
                >
                  1st 12 {rouletteBets['1st12'] ? `($${rouletteBets['1st12']})` : ''}
                </button>
                <button
                  onClick={() => handlePlaceRouletteBet('2nd12')}
                  className="py-2 rounded-lg bg-emerald-900 hover:bg-emerald-800 border border-emerald-500/40 text-white transition-all text-[11px]"
                >
                  2nd 12 {rouletteBets['2nd12'] ? `($${rouletteBets['2nd12']})` : ''}
                </button>
                <button
                  onClick={() => handlePlaceRouletteBet('3rd12')}
                  className="py-2 rounded-lg bg-emerald-900 hover:bg-emerald-800 border border-emerald-500/40 text-white transition-all text-[11px]"
                >
                  3rd 12 {rouletteBets['3rd12'] ? `($${rouletteBets['3rd12']})` : ''}
                </button>
                <button
                  onClick={() => handlePlaceRouletteBet('low')}
                  className="py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white transition-all text-[11px]"
                >
                  1 - 18 {rouletteBets['low'] ? `($${rouletteBets['low']})` : ''}
                </button>
                <button
                  onClick={() => handlePlaceRouletteBet('even')}
                  className="py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white transition-all text-[11px]"
                >
                  EVEN {rouletteBets['even'] ? `($${rouletteBets['even']})` : ''}
                </button>
                <button
                  onClick={() => handlePlaceRouletteBet('high')}
                  className="py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white transition-all text-[11px]"
                >
                  19 - 36 {rouletteBets['high'] ? `($${rouletteBets['high']})` : ''}
                </button>
              </div>

              {/* Red / Black Outside Bets */}
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs font-bold">
                <button
                  onClick={() => handlePlaceRouletteBet('red')}
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 border border-rose-400 text-white transition-all shadow"
                >
                  RED (1:1) {rouletteBets['red'] ? `[$${rouletteBets['red']}]` : ''}
                </button>
                <button
                  onClick={() => handlePlaceRouletteBet('black')}
                  className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-700 text-white transition-all shadow"
                >
                  BLACK (1:1) {rouletteBets['black'] ? `[$${rouletteBets['black']}]` : ''}
                </button>
              </div>

              {/* Numbers Grid (0 to 36) */}
              <div className="grid grid-cols-12 gap-1 text-[11px] font-bold">
                {ROULETTE_NUMBERS.slice(0, 36).map(item => (
                  <button
                    key={item.num}
                    onClick={() => handlePlaceRouletteBet(`num_${item.num}`)}
                    className={`h-8 rounded-lg border flex flex-col items-center justify-center transition-all ${
                      item.color === 'red'
                        ? 'bg-rose-700 hover:bg-rose-600 border-rose-400 text-white'
                        : item.color === 'black'
                        ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-white'
                        : 'bg-emerald-600 border-emerald-400 text-white col-span-12'
                    }`}
                  >
                    <span>{item.num}</span>
                    {rouletteBets[`num_${item.num}`] && (
                      <span className="text-[8px] text-amber-300 font-mono">
                        ${rouletteBets[`num_${item.num}`]}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Chip Selector & Controls */}
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Chip:</span>
                {[10, 25, 50, 100, 500].map(val => (
                  <button
                    key={val}
                    onClick={() => {
                      sound.playButtonClick();
                      setSelectedChipValue(val);
                    }}
                    className={`w-9 h-9 rounded-full font-mono text-xs font-extrabold flex items-center justify-center border-2 transition-all ${
                      selectedChipValue === val ? 'scale-110 ring-2 ring-white shadow-lg' : 'opacity-70 hover:opacity-100'
                    } ${
                      val === 10
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : val === 25
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : val === 50
                        ? 'bg-amber-600 border-amber-400 text-white'
                        : val === 100
                        ? 'bg-rose-600 border-rose-400 text-white'
                        : 'bg-purple-600 border-purple-400 text-white'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearRouletteBets}
                  disabled={rouletteSpinning}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider"
                >
                  Clear Bets
                </button>

                <button
                  onClick={handleSpinRoulette}
                  disabled={rouletteSpinning}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/60 transition-all hover:scale-105 active:scale-95"
                >
                  {rouletteSpinning ? 'Spinning Wheel...' : 'SPIN WHEEL 🎡'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: DISCORD DAILY CHIP FAUCET */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'faucet' && (
        <div className="w-full max-w-xl flex flex-col items-center">
          <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl mb-4 shadow-inner">
              🎁
            </div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">Discord Daily Chip Faucet</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-md">
              Running low on chips for Texas Hold’em or Roulette? Claim your daily Discord Activity allowance of 1,000 Free Casino Chips!
            </p>

            <div className="my-6 p-4 rounded-2xl bg-slate-950 border border-slate-800 w-full flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Current Balance</span>
                <p className="text-lg font-mono font-bold text-emerald-400">${chips}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Reward</span>
                <p className="text-lg font-mono font-bold text-amber-400">+1,000 CHIPS</p>
              </div>
            </div>

            <button
              onClick={handleClaimDailyChips}
              disabled={faucetClaimed}
              className={`w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg transition-all ${
                faucetClaimed
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-amber-950/40 hover:scale-105 active:scale-95'
              }`}
            >
              {faucetClaimed ? 'Claimed for Today! ✨' : 'Claim 1,000 Free Chips Now 💰'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
