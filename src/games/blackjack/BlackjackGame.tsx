import React, { useState, useEffect, useRef } from 'react';
import { PlayingCard, BlackjackState } from '../../types';
import { createDeck, calculateHandScore } from './blackjackLogic';
import { sound } from '../../utils/audio';
import { AnimatedHand } from '../../components/HandCursor';
import { RotateCcw, HelpCircle, Coins, ShieldAlert, Sparkles, Trophy } from 'lucide-react';
import { RulesModal } from '../../components/RulesModal';
import { GAME_CATALOG } from '../../utils/gameData';

interface BlackjackGameProps {
  onBackToShelf: () => void;
}

export const BlackjackGame: React.FC<BlackjackGameProps> = ({ onBackToShelf }) => {
  const [deck, setDeck] = useState<PlayingCard[]>(createDeck());
  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [dealerHand, setDealerHand] = useState<PlayingCard[]>([]);
  const [chips, setChips] = useState<number>(1000);
  const [currentBet, setCurrentBet] = useState<number>(50);
  const [gamePhase, setGamePhase] = useState<'betting' | 'player_turn' | 'dealer_turn' | 'round_over'>('betting');
  const [resultMessage, setResultMessage] = useState<string>('Place your bet and press DEAL');
  const [showRules, setShowRules] = useState<boolean>(false);
  const [stats, setStats] = useState<{ wins: number; losses: number; pushes: number }>({ wins: 0, losses: 0, pushes: 0 });

  // Hand animation state
  const [handState, setHandState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    holdingItem?: 'card' | 'chip';
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

  const tableRef = useRef<HTMLDivElement>(null);
  const blackjackMetadata = GAME_CATALOG.find(g => g.id === 'blackjack')!;

  const triggerHandAnimation = (type: 'deal' | 'hit' | 'chip', isDealer: boolean) => {
    if (!tableRef.current) return;
    const rect = tableRef.current.getBoundingClientRect();
    const startX = isDealer ? rect.left + rect.width * 0.7 : rect.left + rect.width * 0.5;
    const startY = isDealer ? rect.top + 50 : rect.bottom - 60;
    const endX = isDealer ? rect.left + rect.width * 0.5 : rect.left + rect.width * 0.5;
    const endY = isDealer ? rect.top + 140 : rect.bottom - 160;

    setHandState({
      visible: true,
      x: startX,
      y: startY,
      holdingItem: type === 'chip' ? 'chip' : 'card',
      action: 'pinch',
      label: isDealer ? 'Dealer Hand' : 'Player',
      isEnemy: isDealer
    });

    setTimeout(() => {
      setHandState(prev => ({ ...prev, x: endX, y: endY, action: 'drop' }));
    }, 200);

    setTimeout(() => {
      setHandState(prev => ({ ...prev, visible: false }));
    }, 550);
  };

  // Start Deal
  const handleDeal = () => {
    if (chips < currentBet) return;
    sound.playButtonClick();
    triggerHandAnimation('deal', true);

    let activeDeck = [...deck];
    if (activeDeck.length < 15) {
      activeDeck = createDeck();
    }

    const pCard1 = activeDeck.pop()!;
    const dCard1 = activeDeck.pop()!;
    const pCard2 = activeDeck.pop()!;
    const dCard2 = { ...activeDeck.pop()!, faceUp: false }; // Dealer hole card

    const initialPlayer = [pCard1, pCard2];
    const initialDealer = [dCard1, dCard2];

    setDeck(activeDeck);
    setPlayerHand(initialPlayer);
    setDealerHand(initialDealer);
    setChips(prev => prev - currentBet);

    const playerScore = calculateHandScore(initialPlayer);
    if (playerScore.isBlackjack) {
      // Natural Blackjack!
      setGamePhase('dealer_turn');
      revealDealerAndResolve(initialDealer, initialPlayer, activeDeck, true);
    } else {
      setGamePhase('player_turn');
      setResultMessage('Hit, Stand, or Double Down?');
    }
  };

  // Player Hits
  const handleHit = () => {
    if (gamePhase !== 'player_turn') return;
    sound.playMoveClack();
    triggerHandAnimation('hit', false);

    const activeDeck = [...deck];
    const nextCard = activeDeck.pop()!;
    const newHand = [...playerHand, nextCard];

    setDeck(activeDeck);
    setPlayerHand(newHand);

    const score = calculateHandScore(newHand);
    if (score.isBust) {
      sound.playDefeat();
      setGamePhase('round_over');
      setResultMessage(`Bust! You went over 21 (${score.total}).`);
      setStats(prev => ({ ...prev, losses: prev.losses + 1 }));
    }
  };

  // Player Stands
  const handleStand = () => {
    if (gamePhase !== 'player_turn') return;
    sound.playButtonClick();
    setGamePhase('dealer_turn');
    revealDealerAndResolve(dealerHand, playerHand, deck, false);
  };

  // Player Double Down
  const handleDouble = () => {
    if (gamePhase !== 'player_turn' || chips < currentBet || playerHand.length !== 2) return;
    sound.playCoinToss();
    triggerHandAnimation('chip', false);

    setChips(prev => prev - currentBet);
    const doubledBet = currentBet * 2;

    const activeDeck = [...deck];
    const nextCard = activeDeck.pop()!;
    const newHand = [...playerHand, nextCard];

    setDeck(activeDeck);
    setPlayerHand(newHand);

    const score = calculateHandScore(newHand);
    if (score.isBust) {
      sound.playDefeat();
      setGamePhase('round_over');
      setResultMessage(`Bust on Double Down! (${score.total})`);
      setStats(prev => ({ ...prev, losses: prev.losses + 1 }));
    } else {
      setGamePhase('dealer_turn');
      revealDealerAndResolve(dealerHand, newHand, activeDeck, false, doubledBet);
    }
  };

  // Dealer Turn AI
  const revealDealerAndResolve = (
    dHand: PlayingCard[],
    pHand: PlayingCard[],
    activeDeck: PlayingCard[],
    playerHasBlackjack: boolean,
    effectiveBet = currentBet
  ) => {
    // 1. Flip hole card
    let currentDealer = dHand.map(c => ({ ...c, faceUp: true }));
    let deckCopy = [...activeDeck];

    setTimeout(() => {
      triggerHandAnimation('deal', true);
      sound.playPieceSelect();
      setDealerHand(currentDealer);

      const runDealerDraws = () => {
        let dScore = calculateHandScore(currentDealer);
        if (dScore.total < 17 && !playerHasBlackjack) {
          setTimeout(() => {
            const extraCard = deckCopy.pop()!;
            currentDealer = [...currentDealer, extraCard];
            setDealerHand(currentDealer);
            setDeck(deckCopy);
            sound.playMoveClack();
            runDealerDraws();
          }, 600);
        } else {
          // Resolve outcome
          finalizeRound(currentDealer, pHand, playerHasBlackjack, effectiveBet);
        }
      };

      runDealerDraws();
    }, 500);
  };

  const finalizeRound = (
    finalDealer: PlayingCard[],
    finalPlayer: PlayingCard[],
    playerHasBlackjack: boolean,
    effectiveBet: number
  ) => {
    const pScore = calculateHandScore(finalPlayer);
    const dScore = calculateHandScore(finalDealer);

    setGamePhase('round_over');

    if (playerHasBlackjack) {
      if (dScore.isBlackjack) {
        // Push
        setChips(prev => prev + effectiveBet);
        setResultMessage('Push! Both have Blackjack.');
        setStats(prev => ({ ...prev, pushes: prev.pushes + 1 }));
      } else {
        // 3:2 Payout
        const payout = effectiveBet + Math.floor(effectiveBet * 1.5);
        setChips(prev => prev + payout);
        sound.playVictory();
        setResultMessage(`BLACKJACK! Natural 21 pays $${payout}!`);
        setStats(prev => ({ ...prev, wins: prev.wins + 1 }));
      }
      return;
    }

    if (dScore.isBust) {
      sound.playVictory();
      setChips(prev => prev + effectiveBet * 2);
      setResultMessage(`Dealer busts (${dScore.total})! You win $${effectiveBet * 2}!`);
      setStats(prev => ({ ...prev, wins: prev.wins + 1 }));
    } else if (pScore.total > dScore.total) {
      sound.playVictory();
      setChips(prev => prev + effectiveBet * 2);
      setResultMessage(`You win with ${pScore.total} over Dealer's ${dScore.total}!`);
      setStats(prev => ({ ...prev, wins: prev.wins + 1 }));
    } else if (pScore.total < dScore.total) {
      sound.playDefeat();
      setResultMessage(`Dealer wins with ${dScore.total} over your ${pScore.total}.`);
      setStats(prev => ({ ...prev, losses: prev.losses + 1 }));
    } else {
      setChips(prev => prev + effectiveBet);
      setResultMessage(`Push at ${pScore.total}! Bet returned.`);
      setStats(prev => ({ ...prev, pushes: prev.pushes + 1 }));
    }
  };

  const pScore = calculateHandScore(playerHand);
  const dScore = calculateHandScore(dealerHand);

  return (
    <div className="w-full max-w-5xl px-2 sm:px-6 py-4 flex flex-col items-center select-none animate-in fade-in duration-300">
      <AnimatedHand
        x={handState.x}
        y={handState.y}
        visible={handState.visible}
        action={handState.action}
        holdingItem={handState.holdingItem}
        label={handState.label}
        isEnemy={handState.isEnemy}
      />

      {/* Top Bar */}
      <div className="w-full flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-xl backdrop-blur mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToShelf}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all hover:scale-105"
          >
            <RotateCcw className="w-4 h-4 text-blue-400" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>BLACKJACK</span>
              <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                Pays 3:2 • Stands on 17
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              W: <span className="text-emerald-400 font-bold">{stats.wins}</span> | L: <span className="text-red-400 font-bold">{stats.losses}</span> | P: <span className="text-slate-300 font-bold">{stats.pushes}</span>
            </p>
          </div>
        </div>

        {/* Chip Bankroll */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800 shadow-inner">
            <Coins className="w-4 h-4 text-amber-400" />
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Bankroll</span>
              <span className="font-mono text-emerald-400 font-bold text-sm sm:text-base">${chips}</span>
            </div>
          </div>

          <button
            onClick={() => setShowRules(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Casino Felt Table */}
      <div
        ref={tableRef}
        className="w-full max-w-3xl min-h-[380px] sm:min-h-[420px] rounded-3xl bg-gradient-to-b from-emerald-900 via-emerald-950 to-slate-950 border-8 border-[#3b2518] shadow-[0_30px_60px_rgba(0,0,0,0.9)] p-4 sm:p-6 flex flex-col justify-between relative overflow-hidden my-2"
      >
        {/* Felt Texture & Semi-Circle Line */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.15),transparent_70%)] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-44 rounded-b-full border-2 border-dashed border-emerald-500/20 pointer-events-none" />

        {/* Dealer Zone */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-[2px] text-emerald-300/80 bg-black/40 px-3 py-0.5 rounded-full border border-emerald-500/30">
              Dealer {dealerHand.length > 0 && dealerHand[1]?.faceUp ? `(${dScore.total})` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2 min-h-[80px]">
            {dealerHand.map((card, idx) => (
              <div
                key={card.id || idx}
                className={`w-14 sm:w-16 h-20 sm:h-24 rounded-lg flex flex-col justify-between p-1.5 shadow-xl transition-all ${
                  card.faceUp
                    ? 'bg-white text-slate-900 border border-slate-300'
                    : 'bg-gradient-to-br from-blue-700 to-indigo-900 border-2 border-white/60 text-white flex items-center justify-center'
                }`}
              >
                {card.faceUp ? (
                  <>
                    <span className={`text-xs font-bold ${['♥', '♦'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}>
                      {card.rank}{card.suit}
                    </span>
                    <span className="text-xl sm:text-2xl self-center leading-none">
                      {card.suit}
                    </span>
                    <span className={`text-xs font-bold self-end ${['♥', '♦'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}>
                      {card.rank}
                    </span>
                  </>
                ) : (
                  <div className="w-full h-full border border-blue-400/40 rounded flex items-center justify-center font-bold text-xs">
                    🂠
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Center Banner / Status */}
        <div className="relative z-10 text-center my-2">
          <div className="inline-block bg-slate-950/90 border border-emerald-500/40 px-4 py-1.5 rounded-full text-xs font-mono text-emerald-300 shadow-lg">
            {resultMessage}
          </div>
        </div>

        {/* Player Zone */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-2 min-h-[80px] mb-2">
            {playerHand.map((card, idx) => (
              <div
                key={card.id || idx}
                className="w-14 sm:w-16 h-20 sm:h-24 rounded-lg bg-white text-slate-900 border border-slate-300 flex flex-col justify-between p-1.5 shadow-xl animate-in zoom-in-95 duration-200"
              >
                <span className={`text-xs font-bold ${['♥', '♦'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}>
                  {card.rank}{card.suit}
                </span>
                <span className="text-xl sm:text-2xl self-center leading-none">
                  {card.suit}
                </span>
                <span className={`text-xs font-bold self-end ${['♥', '♦'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}>
                  {card.rank}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-[2px] text-emerald-300/80 bg-black/40 px-3 py-0.5 rounded-full border border-emerald-500/30">
              Player {playerHand.length > 0 ? `(${pScore.total})` : ''} • Bet: ${currentBet}
            </span>
          </div>
        </div>
      </div>

      {/* Action Controls Bar */}
      <div className="w-full max-w-3xl bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 mt-2">
        {gamePhase === 'betting' || gamePhase === 'round_over' ? (
          <div className="w-full flex items-center justify-between gap-4">
            {/* Bet Chip Selectors */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Bet:</span>
              {[10, 25, 50, 100, 250].map(amt => (
                <button
                  key={amt}
                  onClick={() => {
                    sound.playCoinToss();
                    setCurrentBet(amt);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                    currentBet === amt
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/50 scale-105'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>

            {/* Deal Button */}
            <button
              onClick={handleDeal}
              className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-emerald-900/50 transition-all hover:scale-105 active:scale-95"
            >
              Deal Cards
            </button>
          </div>
        ) : (
          <div className="w-full flex items-center justify-center gap-4">
            <button
              onClick={handleHit}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-blue-900/50 transition-all hover:scale-105 active:scale-95"
            >
              Hit (+1 Card)
            </button>

            <button
              onClick={handleStand}
              className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-amber-900/50 transition-all hover:scale-105 active:scale-95"
            >
              Stand
            </button>

            {playerHand.length === 2 && chips >= currentBet && (
              <button
                onClick={handleDouble}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-purple-900/50 transition-all hover:scale-105 active:scale-95"
              >
                Double Down (2x)
              </button>
            )}
          </div>
        )}
      </div>

      {showRules && <RulesModal game={blackjackMetadata} onClose={() => setShowRules(false)} />}
    </div>
  );
};
