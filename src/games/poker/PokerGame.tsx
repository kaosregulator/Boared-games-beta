import React, { useState, useEffect } from 'react';
import { PokerCard, PokerPlayer, PokerState, ViewMode } from '../../types';
import { createPokerDeck, evaluatePokerHand, getAIPokerDecision } from '../../utils/pokerLogic';
import { sound } from '../../utils/audio';
import { AnimatedHand } from '../../components/HandCursor';
import {
  Coins,
  Flame,
  RotateCcw,
  Sparkles,
  Award,
  Layers,
  HelpCircle,
  Volume2,
  ChevronRight,
  TrendingUp,
  Sliders,
  DollarSign,
  ArrowLeft
} from 'lucide-react';

interface PokerGameProps {
  viewMode?: ViewMode;
  onToggleViewMode?: () => void;
  onOpenRules?: () => void;
  onBackToShelf?: () => void;
  onUpdateUserChips?: (amount: number) => void;
}

const INITIAL_PLAYERS: PokerPlayer[] = [
  {
    id: 'user_player',
    name: 'You (Captain)',
    avatar: '🎮',
    isBot: false,
    chips: 1000,
    currentBet: 0,
    totalRoundBet: 0,
    cards: [],
    hasFolded: false,
    isAllIn: false,
    personality: 'balanced'
  },
  {
    id: 'bot_bob',
    name: 'Bluffing Bob',
    avatar: '🤠',
    isBot: true,
    chips: 1000,
    currentBet: 0,
    totalRoundBet: 0,
    cards: [],
    hasFolded: false,
    isAllIn: false,
    personality: 'bluffer'
  },
  {
    id: 'bot_lisa',
    name: 'Lucky Lisa',
    avatar: '🎲',
    isBot: true,
    chips: 1000,
    currentBet: 0,
    totalRoundBet: 0,
    cards: [],
    hasFolded: false,
    isAllIn: false,
    personality: 'aggressive'
  },
  {
    id: 'bot_dave',
    name: 'HighRoller Dave',
    avatar: '🕶️',
    isBot: true,
    chips: 1000,
    currentBet: 0,
    totalRoundBet: 0,
    cards: [],
    hasFolded: false,
    isAllIn: false,
    personality: 'tight'
  }
];

export const PokerGame: React.FC<PokerGameProps> = ({
  viewMode = 'isometric',
  onToggleViewMode,
  onOpenRules,
  onBackToShelf,
  onUpdateUserChips
}) => {
  const [gameState, setGameState] = useState<PokerState>(() => {
    return {
      deck: createPokerDeck(),
      communityCards: [],
      players: INITIAL_PLAYERS,
      pot: 0,
      currentBet: 20,
      minRaise: 20,
      dealerIndex: 0,
      activePlayerIndex: 0,
      smallBlind: 10,
      bigBlind: 20,
      phase: 'preflop',
      lastActionMessage: 'Welcome to Texas Hold’em! Blinds are $10/$20.',
      winners: [],
      roundNumber: 1,
      feltColor: 'emerald'
    };
  });

  const [raiseAmount, setRaiseAmount] = useState<number>(40);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const [gameModeTab, setGameModeTab] = useState<'holdem' | 'videopoker'>('holdem');

  // Video Poker Mini-State
  const [vpDeck, setVpDeck] = useState<PokerCard[]>(() => createPokerDeck());
  const [vpHand, setVpHand] = useState<PokerCard[]>([]);
  const [vpHeld, setVpHeld] = useState<boolean[]>([false, false, false, false, false]);
  const [vpBet, setVpBet] = useState<number>(10);
  const [vpCredits, setVpCredits] = useState<number>(500);
  const [vpPhase, setVpPhase] = useState<'deal' | 'draw'>('deal');
  const [vpMessage, setVpMessage] = useState<string>('Press DEAL to start Video Poker');

  // Start fresh round on mount
  useEffect(() => {
    startNewRound();
  }, []);

  const startNewRound = () => {
    sound.playCardDeal();
    const newDeck = createPokerDeck();
    let deckIndex = 0;

    const sbIndex = (gameState.dealerIndex + 1) % 4;
    const bbIndex = (gameState.dealerIndex + 2) % 4;
    const firstToActIndex = (gameState.dealerIndex + 3) % 4;

    const updatedPlayers = gameState.players.map((p, idx) => {
      // If player is broke, give a $500 rebuy
      const currentChips = p.chips <= 0 ? 500 : p.chips;
      const c1 = { ...newDeck[deckIndex++], faceUp: !p.isBot };
      const c2 = { ...newDeck[deckIndex++], faceUp: !p.isBot };

      let bet = 0;
      let chips = currentChips;

      if (idx === sbIndex) {
        const sb = Math.min(chips, 10);
        bet = sb;
        chips -= sb;
      } else if (idx === bbIndex) {
        const bb = Math.min(chips, 20);
        bet = bb;
        chips -= bb;
      }

      return {
        ...p,
        chips,
        cards: [c1, c2],
        currentBet: bet,
        totalRoundBet: bet,
        hasFolded: false,
        isAllIn: chips === 0,
        lastAction: idx === sbIndex ? 'Small Blind $10' : idx === bbIndex ? 'Big Blind $20' : undefined,
        evaluatedHand: undefined
      };
    });

    const pot = updatedPlayers.reduce((acc, p) => acc + p.currentBet, 0);

    setGameState(prev => ({
      ...prev,
      deck: newDeck.slice(deckIndex),
      communityCards: [],
      players: updatedPlayers,
      pot,
      currentBet: 20,
      minRaise: 20,
      activePlayerIndex: firstToActIndex,
      phase: 'preflop',
      winners: [],
      lastActionMessage: 'Cards dealt! Pre-flop action begins.'
    }));

    setRaiseAmount(40);
  };

  // Bot Turn Automation Handler
  useEffect(() => {
    if (gameState.phase === 'showdown' || gameState.phase === 'round_over') return;

    const activePlayer = gameState.players[gameState.activePlayerIndex];
    if (!activePlayer || !activePlayer.isBot || activePlayer.hasFolded || activePlayer.isAllIn) {
      return;
    }

    setIsBotThinking(true);
    const timer = setTimeout(() => {
      const decision = getAIPokerDecision(activePlayer, gameState);
      executePlayerAction(gameState.activePlayerIndex, decision.action, decision.amount, decision.message);
      setIsBotThinking(false);
    }, 1100);

    return () => clearTimeout(timer);
  }, [gameState.activePlayerIndex, gameState.phase]);

  // Execute Player Action (User or Bot)
  const executePlayerAction = (
    playerIdx: number,
    action: 'fold' | 'check' | 'call' | 'raise' | 'allin',
    amount: number = 0,
    actionText?: string
  ) => {
    const player = gameState.players[playerIdx];
    if (!player) return;

    sound.playPokerChipsBet();
    let updatedPlayers = [...gameState.players];
    let newPot = gameState.pot;
    let newCurrentBet = gameState.currentBet;
    let newMinRaise = gameState.minRaise;
    let msg = '';

    if (action === 'fold') {
      updatedPlayers[playerIdx] = {
        ...player,
        hasFolded: true,
        lastAction: 'Fold'
      };
      msg = `${player.name} folds.`;
    } else if (action === 'check') {
      updatedPlayers[playerIdx] = {
        ...player,
        lastAction: 'Check'
      };
      msg = `${player.name} checks.`;
    } else if (action === 'call') {
      const callDiff = Math.min(player.chips, gameState.currentBet - player.currentBet);
      const newChips = player.chips - callDiff;
      const newBet = player.currentBet + callDiff;

      updatedPlayers[playerIdx] = {
        ...player,
        chips: newChips,
        currentBet: newBet,
        totalRoundBet: player.totalRoundBet + callDiff,
        isAllIn: newChips === 0,
        lastAction: `Call $${callDiff}`
      };
      newPot += callDiff;
      msg = `${player.name} calls $${callDiff}.`;
    } else if (action === 'raise' || action === 'allin') {
      const raiseVal = action === 'allin' ? player.chips : Math.min(player.chips, amount);
      const newChips = player.chips - raiseVal;
      const newBet = player.currentBet + raiseVal;

      updatedPlayers[playerIdx] = {
        ...player,
        chips: newChips,
        currentBet: newBet,
        totalRoundBet: player.totalRoundBet + raiseVal,
        isAllIn: newChips === 0,
        lastAction: action === 'allin' ? `ALL IN ($${raiseVal})` : `Raise to $${newBet}`
      };
      newPot += raiseVal;
      newCurrentBet = newBet;
      newMinRaise = Math.max(gameState.bigBlind, raiseVal);
      msg = `${player.name} ${action === 'allin' ? 'goes ALL IN with' : 'raises to'} $${newBet}!`;
    }

    // Check if only 1 player remains unfolded
    const activeUnfolded = updatedPlayers.filter(p => !p.hasFolded);
    if (activeUnfolded.length === 1) {
      // Single winner by default
      const winner = activeUnfolded[0];
      const winAmount = newPot;
      updatedPlayers = updatedPlayers.map(p =>
        p.id === winner.id ? { ...p, chips: p.chips + winAmount } : p
      );

      sound.playVictoryFanfare();
      setGameState(prev => ({
        ...prev,
        players: updatedPlayers,
        pot: 0,
        phase: 'round_over',
        winners: [{ player: winner, amount: winAmount, handName: 'Last Player Standing' }],
        lastActionMessage: `${winner.name} wins the pot of $${winAmount} as everyone else folded!`
      }));
      return;
    }

    // Determine next player or advance betting round
    advanceBettingTurn(updatedPlayers, newPot, newCurrentBet, newMinRaise, playerIdx, msg);
  };

  const advanceBettingTurn = (
    players: PokerPlayer[],
    pot: number,
    currentBet: number,
    minRaise: number,
    actedIndex: number,
    lastMsg: string
  ) => {
    // Find next eligible player
    const canActPlayers = players.filter(p => !p.hasFolded && !p.isAllIn);

    // If 0 or 1 player can act, proceed to showdown/board deals
    if (canActPlayers.length <= 1) {
      // All other players are either all-in or folded, run out community cards
      runOutBoardAndShowdown(players, pot);
      return;
    }

    // Check if all active non-folded players have matched currentBet
    const allMatched = players.every(
      p => p.hasFolded || p.isAllIn || p.currentBet === currentBet
    );

    let nextIdx = (actedIndex + 1) % 4;
    while (players[nextIdx].hasFolded || players[nextIdx].isAllIn) {
      nextIdx = (nextIdx + 1) % 4;
    }

    if (allMatched && (actedIndex === (gameState.dealerIndex + 2) % 4 || currentBet > 0)) {
      // Move to next board phase
      advancePokerPhase(players, pot);
    } else {
      setGameState(prev => ({
        ...prev,
        players,
        pot,
        currentBet,
        minRaise,
        activePlayerIndex: nextIdx,
        lastActionMessage: lastMsg
      }));
    }
  };

  const advancePokerPhase = (players: PokerPlayer[], pot: number) => {
    sound.playCardDeal();

    // Reset player round current bets for new street
    const resetPlayers = players.map(p => ({
      ...p,
      currentBet: 0,
      lastAction: undefined
    }));

    let nextPhase = gameState.phase;
    let nextDeck = [...gameState.deck];
    let newCommunity = [...gameState.communityCards];

    if (gameState.phase === 'preflop') {
      // Deal Flop (3 cards)
      nextPhase = 'flop';
      newCommunity = [
        { ...nextDeck[0], faceUp: true },
        { ...nextDeck[1], faceUp: true },
        { ...nextDeck[2], faceUp: true }
      ];
      nextDeck = nextDeck.slice(3);
    } else if (gameState.phase === 'flop') {
      // Deal Turn (1 card)
      nextPhase = 'turn';
      newCommunity.push({ ...nextDeck[0], faceUp: true });
      nextDeck = nextDeck.slice(1);
    } else if (gameState.phase === 'turn') {
      // Deal River (1 card)
      nextPhase = 'river';
      newCommunity.push({ ...nextDeck[0], faceUp: true });
      nextDeck = nextDeck.slice(1);
    } else if (gameState.phase === 'river') {
      // Showdown!
      handleShowdown(resetPlayers, pot, newCommunity);
      return;
    }

    // Find first active player to act post-flop (left of dealer)
    let firstToAct = (gameState.dealerIndex + 1) % 4;
    while (resetPlayers[firstToAct].hasFolded || resetPlayers[firstToAct].isAllIn) {
      firstToAct = (firstToAct + 1) % 4;
    }

    setGameState(prev => ({
      ...prev,
      deck: nextDeck,
      communityCards: newCommunity,
      players: resetPlayers,
      pot,
      currentBet: 0,
      minRaise: prev.bigBlind,
      phase: nextPhase,
      activePlayerIndex: firstToAct,
      lastActionMessage: `Dealt ${nextPhase.toUpperCase()}: ${newCommunity.map(c => c.rank + c.suit).join(' ')}`
    }));
  };

  const runOutBoardAndShowdown = (players: PokerPlayer[], pot: number) => {
    let remainingCommunity = [...gameState.communityCards];
    let curDeck = [...gameState.deck];

    while (remainingCommunity.length < 5) {
      remainingCommunity.push({ ...curDeck[0], faceUp: true });
      curDeck = curDeck.slice(1);
    }

    sound.playCardDeal();
    handleShowdown(players, pot, remainingCommunity);
  };

  const handleShowdown = (players: PokerPlayer[], pot: number, community: PokerCard[]) => {
    sound.playVictoryFanfare();

    // Reveal all remaining hands and evaluate
    const evaluatedPlayers = players.map(p => {
      if (p.hasFolded) return p;
      const allCards = [...p.cards.map(c => ({ ...c, faceUp: true })), ...community];
      const evaluated = evaluatePokerHand(allCards);
      return {
        ...p,
        cards: p.cards.map(c => ({ ...c, faceUp: true })),
        evaluatedHand: evaluated
      };
    });

    // Find best hand score among non-folded players
    const activeContenders = evaluatedPlayers.filter(p => !p.hasFolded);
    let bestScore = -1;
    activeContenders.forEach(p => {
      if (p.evaluatedHand && p.evaluatedHand.score > bestScore) {
        bestScore = p.evaluatedHand.score;
      }
    });

    const winnersList = activeContenders.filter(
      p => p.evaluatedHand && p.evaluatedHand.score === bestScore
    );

    const splitAmount = Math.floor(pot / winnersList.length);

    const finalPlayers = evaluatedPlayers.map(p => {
      const isWin = winnersList.some(w => w.id === p.id);
      return {
        ...p,
        chips: isWin ? p.chips + splitAmount : p.chips
      };
    });

    const winnersPayload = winnersList.map(w => ({
      player: w,
      amount: splitAmount,
      handName: w.evaluatedHand?.name || 'High Card'
    }));

    setGameState(prev => ({
      ...prev,
      communityCards: community,
      players: finalPlayers,
      pot: 0,
      phase: 'round_over',
      winners: winnersPayload,
      lastActionMessage: `🏆 ${winnersList.map(w => w.name).join(' & ')} win $${splitAmount} with ${winnersList[0].evaluatedHand?.name}!`
    }));
  };

  const handleNextHand = () => {
    sound.playShelfSlide();
    setGameState(prev => ({
      ...prev,
      dealerIndex: (prev.dealerIndex + 1) % 4,
      roundNumber: prev.roundNumber + 1
    }));
    startNewRound();
  };

  // Video Poker Handlers
  const handleVpDeal = () => {
    if (vpCredits < vpBet) {
      setVpMessage('Not enough credits!');
      return;
    }
    sound.playCardDeal();
    const freshDeck = createPokerDeck();
    const deal5 = freshDeck.slice(0, 5).map(c => ({ ...c, faceUp: true }));
    setVpDeck(freshDeck.slice(5));
    setVpHand(deal5);
    setVpHeld([false, false, false, false, false]);
    setVpCredits(prev => prev - vpBet);
    setVpPhase('draw');
    setVpMessage('Select cards to HOLD, then press DRAW');
  };

  const handleVpToggleHold = (index: number) => {
    if (vpPhase !== 'draw') return;
    sound.playPieceSelect();
    setVpHeld(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleVpDraw = () => {
    sound.playCardDeal();
    let dIndex = 0;
    const finalHand = vpHand.map((card, idx) => {
      if (vpHeld[idx]) return card;
      const drawn = { ...vpDeck[dIndex++], faceUp: true };
      return drawn;
    });

    const evalResult = evaluatePokerHand(finalHand);
    let multiplier = 0;

    switch (evalResult.ranking) {
      case 'royal_flush':
        multiplier = 800;
        break;
      case 'straight_flush':
        multiplier = 50;
        break;
      case 'four_of_a_kind':
        multiplier = 25;
        break;
      case 'full_house':
        multiplier = 9;
        break;
      case 'flush':
        multiplier = 6;
        break;
      case 'straight':
        multiplier = 4;
        break;
      case 'three_of_a_kind':
        multiplier = 3;
        break;
      case 'two_pair':
        multiplier = 2;
        break;
      case 'one_pair':
        // Jacks or better
        const pairCards = finalHand.filter((c, i) => finalHand.some((o, oi) => oi !== i && o.value === c.value));
        if (pairCards.length > 0 && pairCards[0].value >= 11) {
          multiplier = 1;
        }
        break;
      default:
        multiplier = 0;
    }

    const winAmount = vpBet * multiplier;
    if (winAmount > 0) {
      sound.playVictoryFanfare();
    } else {
      sound.playDefeat();
    }

    setVpHand(finalHand);
    setVpCredits(prev => prev + winAmount);
    setVpPhase('deal');
    setVpMessage(
      winAmount > 0
        ? `🎉 ${evalResult.name}! Won $${winAmount} (${multiplier}x)`
        : `Game Over. ${evalResult.name}. Try again!`
    );
  };

  const userPlayer = gameState.players[0];
  const isUserTurn = gameState.activePlayerIndex === 0 && gameState.phase !== 'round_over';
  const callCost = Math.max(0, gameState.currentBet - userPlayer.currentBet);
  const userCurrentEval = evaluatePokerHand([...userPlayer.cards, ...gameState.communityCards]);

  // Felt styling
  const feltBg =
    gameState.feltColor === 'emerald'
      ? 'from-emerald-950 via-green-900 to-slate-950 border-emerald-500/40 shadow-emerald-950/60'
      : gameState.feltColor === 'blue'
      ? 'from-blue-950 via-indigo-900 to-slate-950 border-blue-500/40 shadow-blue-950/60'
      : gameState.feltColor === 'crimson'
      ? 'from-rose-950 via-red-900 to-slate-950 border-red-500/40 shadow-red-950/60'
      : 'from-slate-900 via-neutral-900 to-black border-slate-700/40 shadow-black/80';

  return (
    <div className="w-full max-w-6xl px-2 sm:px-4 py-3 flex flex-col items-center select-none animate-in fade-in duration-300">
      {/* Top Bar Header & Tabs */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 mb-3">
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 border border-amber-300/40 flex items-center justify-center text-white font-bold shadow-lg">
              ♠️
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                TEXAS HOLD’EM POKER LOUNGE
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-mono">
                  Pot: ${gameState.pot}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Hand #{gameState.roundNumber} • Blinds ${gameState.smallBlind}/${gameState.bigBlind}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Tabs & Actions */}
        <div className="flex items-center gap-2">
          {/* Felt Color Selector */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            {(['emerald', 'blue', 'crimson', 'midnight'] as const).map(color => (
              <button
                key={color}
                onClick={() => {
                  sound.playButtonClick();
                  setGameState(prev => ({ ...prev, feltColor: color }));
                }}
                className={`w-5 h-5 rounded-full border transition-all ${
                  gameState.feltColor === color ? 'scale-110 ring-2 ring-white' : 'opacity-60 hover:opacity-100'
                } ${
                  color === 'emerald'
                    ? 'bg-emerald-600 border-emerald-400'
                    : color === 'blue'
                    ? 'bg-blue-600 border-blue-400'
                    : color === 'crimson'
                    ? 'bg-rose-600 border-rose-400'
                    : 'bg-slate-700 border-slate-500'
                }`}
                title={`Switch felt to ${color}`}
              />
            ))}
          </div>

          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => {
                sound.playButtonClick();
                setGameModeTab('holdem');
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                gameModeTab === 'holdem' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              4P Table
            </button>
            <button
              onClick={() => {
                sound.playButtonClick();
                setGameModeTab('videopoker');
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                gameModeTab === 'videopoker' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              5-Card Video Poker
            </button>
          </div>

          {onOpenRules && (
            <button
              onClick={onOpenRules}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white"
              title="Poker Rules & Hand Rankings"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. TEXAS HOLD'EM 4-PLAYER TABLE VIEW */}
      {/* ---------------------------------------------------- */}
      {gameModeTab === 'holdem' && (
        <div className="w-full flex flex-col items-center">
          {/* Main Oval Poker Table */}
          <div
            className={`w-full max-w-4xl relative rounded-[60px] sm:rounded-[100px] border-8 sm:border-[12px] border-[#3b2111] bg-gradient-to-b ${feltBg} p-4 sm:p-8 shadow-2xl transition-all duration-500 min-h-[460px] sm:min-h-[500px] flex flex-col justify-between items-center`}
            style={{
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), inset 0 0 40px rgba(0,0,0,0.8)'
            }}
          >
            {/* Top Bot: Lucky Lisa */}
            <div className="flex flex-col items-center relative -top-2">
              <BotPlayerTag
                player={gameState.players[2]}
                isTurn={gameState.activePlayerIndex === 2}
                isDealer={gameState.dealerIndex === 2}
              />
            </div>

            {/* Middle Section: Left Bot, Center Pot & Community Cards, Right Bot */}
            <div className="w-full flex items-center justify-between px-2 sm:px-6 my-auto">
              {/* Left Bot: Bluffing Bob */}
              <div className="flex flex-col items-center">
                <BotPlayerTag
                  player={gameState.players[1]}
                  isTurn={gameState.activePlayerIndex === 1}
                  isDealer={gameState.dealerIndex === 1}
                />
              </div>

              {/* Center Community Cards & Pot Chip Tray */}
              <div className="flex flex-col items-center justify-center p-3 sm:p-5 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl">
                {/* Pot Display */}
                <div className="flex items-center gap-2 mb-3 bg-amber-950/80 border border-amber-500/40 px-4 py-1.5 rounded-full shadow-lg">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                    Total Pot: ${gameState.pot}
                  </span>
                </div>

                {/* 5 Community Cards Grid */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 min-h-[88px]">
                  {[0, 1, 2, 3, 4].map(idx => {
                    const card = gameState.communityCards[idx];
                    return (
                      <div key={idx} className="relative">
                        {card ? (
                          <PokerCardView card={card} />
                        ) : (
                          <div className="w-12 h-18 sm:w-14 sm:h-20 rounded-xl border-2 border-dashed border-white/20 bg-black/20 flex items-center justify-center text-white/30 text-xs font-mono">
                            {idx < 3 ? 'FLOP' : idx === 3 ? 'TURN' : 'RIVER'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Status / Announcement Marquee */}
                <div className="mt-3 text-center">
                  <p className="text-[11px] sm:text-xs font-medium text-slate-200 bg-black/50 px-3 py-1 rounded-full border border-white/10">
                    {gameState.lastActionMessage}
                  </p>
                </div>
              </div>

              {/* Right Bot: HighRoller Dave */}
              <div className="flex flex-col items-center">
                <BotPlayerTag
                  player={gameState.players[3]}
                  isTurn={gameState.activePlayerIndex === 3}
                  isDealer={gameState.dealerIndex === 3}
                />
              </div>
            </div>

            {/* Bottom: Player Area (You) */}
            <div className="flex flex-col items-center relative -bottom-2">
              <div
                className={`p-3 rounded-2xl border-2 flex items-center gap-3 backdrop-blur-md transition-all shadow-xl ${
                  isUserTurn
                    ? 'bg-amber-950/80 border-amber-400 ring-4 ring-amber-400/30'
                    : 'bg-slate-900/90 border-slate-700'
                }`}
              >
                {/* Avatar & Player Info */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 border-2 border-white/40 flex items-center justify-center text-xl shadow">
                      {userPlayer.avatar}
                    </div>
                    {gameState.dealerIndex === 0 && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white text-black font-bold text-[10px] flex items-center justify-center shadow border border-slate-300">
                        D
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{userPlayer.name}</span>
                      {userPlayer.hasFolded && (
                        <span className="text-[9px] font-bold text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded">
                          FOLDED
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                      <Coins className="w-3 h-3 text-emerald-400" />
                      ${userPlayer.chips}
                    </p>
                    {userPlayer.currentBet > 0 && (
                      <p className="text-[10px] font-mono text-amber-300">Bet: ${userPlayer.currentBet}</p>
                    )}
                  </div>
                </div>

                {/* Hole Cards */}
                <div className="flex items-center gap-2 ml-2">
                  {userPlayer.cards.map((c, i) => (
                    <PokerCardView key={i} card={c} />
                  ))}
                </div>
              </div>

              {/* Hand Strength Live Readout */}
              {!userPlayer.hasFolded && (
                <div className="mt-1.5 bg-black/70 px-3 py-0.5 rounded-full border border-amber-500/30 text-[11px] font-semibold text-amber-300">
                  ✨ Hand: {userCurrentEval.name}
                </div>
              )}
            </div>
          </div>

          {/* Action Control Bar (User Controls or Next Hand) */}
          <div className="w-full max-w-4xl mt-3 p-3.5 rounded-2xl bg-slate-900/95 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl backdrop-blur">
            {gameState.phase === 'round_over' ? (
              <div className="w-full flex items-center justify-between">
                <div className="text-left">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Round Complete</h4>
                  <p className="text-xs text-slate-300">{gameState.lastActionMessage}</p>
                </div>
                <button
                  onClick={handleNextHand}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                  <RotateCcw className="w-4 h-4" />
                  Deal Next Hand
                </button>
              </div>
            ) : (
              <>
                {/* Left: Raise Slider & Bet Sizing */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Raise:</span>
                  <input
                    type="range"
                    min={gameState.currentBet + gameState.minRaise}
                    max={userPlayer.chips}
                    step={10}
                    value={Math.min(userPlayer.chips, raiseAmount)}
                    onChange={e => setRaiseAmount(Number(e.target.value))}
                    disabled={!isUserTurn || userPlayer.chips <= callCost}
                    className="w-28 sm:w-36 accent-amber-500"
                  />
                  <span className="text-xs font-mono font-bold text-amber-400 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                    ${Math.min(userPlayer.chips, raiseAmount)}
                  </span>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setRaiseAmount(gameState.currentBet + gameState.minRaise)}
                      disabled={!isUserTurn}
                      className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      Min
                    </button>
                    <button
                      onClick={() => setRaiseAmount(Math.min(userPlayer.chips, Math.max(gameState.bigBlind * 2, gameState.pot)))}
                      disabled={!isUserTurn}
                      className="text-[10px] font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    >
                      Pot
                    </button>
                  </div>
                </div>

                {/* Right: Fold / Check / Call / Raise / All-in Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Fold */}
                  <button
                    onClick={() => executePlayerAction(0, 'fold')}
                    disabled={!isUserTurn}
                    className="px-4 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                  >
                    Fold
                  </button>

                  {/* Check / Call */}
                  {callCost === 0 ? (
                    <button
                      onClick={() => executePlayerAction(0, 'check')}
                      disabled={!isUserTurn}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-900/40 active:scale-95"
                    >
                      Check
                    </button>
                  ) : (
                    <button
                      onClick={() => executePlayerAction(0, 'call', callCost)}
                      disabled={!isUserTurn || userPlayer.chips === 0}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-900/40 active:scale-95"
                    >
                      Call ${Math.min(userPlayer.chips, callCost)}
                    </button>
                  )}

                  {/* Raise */}
                  <button
                    onClick={() => executePlayerAction(0, 'raise', raiseAmount)}
                    disabled={!isUserTurn || userPlayer.chips <= callCost}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-900/40 active:scale-95"
                  >
                    Raise to ${Math.min(userPlayer.chips, raiseAmount)}
                  </button>

                  {/* All In */}
                  <button
                    onClick={() => executePlayerAction(0, 'allin')}
                    disabled={!isUserTurn || userPlayer.chips === 0}
                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
                  >
                    All In!
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. 5-CARD VIDEO POKER MINI-GAME */}
      {/* ---------------------------------------------------- */}
      {gameModeTab === 'videopoker' && (
        <div className="w-full max-w-3xl flex flex-col items-center animate-in zoom-in-95 duration-200">
          {/* Arcade Cabinet Style Frame */}
          <div className="w-full bg-slate-900 border-4 border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center">
            {/* Paytable Header */}
            <div className="w-full bg-slate-950 p-3 rounded-2xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono mb-6 text-slate-300">
              <div className="flex justify-between px-2 py-1 bg-slate-900 rounded">
                <span>Royal Flush</span> <span className="text-amber-400 font-bold">800x</span>
              </div>
              <div className="flex justify-between px-2 py-1 bg-slate-900 rounded">
                <span>Straight Flush</span> <span className="text-amber-400 font-bold">50x</span>
              </div>
              <div className="flex justify-between px-2 py-1 bg-slate-900 rounded">
                <span>4 of a Kind</span> <span className="text-amber-400 font-bold">25x</span>
              </div>
              <div className="flex justify-between px-2 py-1 bg-slate-900 rounded">
                <span>Full House</span> <span className="text-amber-400 font-bold">9x</span>
              </div>
              <div className="flex justify-between px-2 py-1 bg-slate-900 rounded">
                <span>Flush</span> <span className="text-amber-400 font-bold">6x</span>
              </div>
              <div className="flex justify-between px-2 py-1 bg-slate-900 rounded">
                <span>Straight</span> <span className="text-amber-400 font-bold">4x</span>
              </div>
              <div className="flex justify-between px-2 py-1 bg-slate-900 rounded">
                <span>3 of a Kind</span> <span className="text-amber-400 font-bold">3x</span>
              </div>
              <div className="flex justify-between px-2 py-1 bg-slate-900 rounded">
                <span>Jacks or Better</span> <span className="text-amber-400 font-bold">1x</span>
              </div>
            </div>

            {/* 5 Card Slots */}
            <div className="flex items-center gap-3 sm:gap-4 my-4">
              {[0, 1, 2, 3, 4].map(idx => {
                const card = vpHand[idx];
                const isHeld = vpHeld[idx];
                return (
                  <div
                    key={idx}
                    onClick={() => handleVpToggleHold(idx)}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                  >
                    {/* Hold Badge */}
                    <div
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-all ${
                        isHeld
                          ? 'bg-amber-500 text-black font-extrabold scale-105'
                          : 'bg-slate-800 text-slate-500 opacity-40 group-hover:opacity-100'
                      }`}
                    >
                      {isHeld ? 'HELD' : 'HOLD'}
                    </div>

                    {card ? (
                      <div className={`transition-all ${isHeld ? 'ring-4 ring-amber-400 rounded-xl -translate-y-1' : ''}`}>
                        <PokerCardView card={card} />
                      </div>
                    ) : (
                      <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl border-2 border-slate-700 bg-slate-950/80 flex items-center justify-center text-slate-600 text-xs font-mono">
                        ?
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Message Bar */}
            <div className="my-3 px-4 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-xs font-semibold text-amber-300">
              {vpMessage}
            </div>

            {/* Controls Bar */}
            <div className="w-full mt-4 flex items-center justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Credits</span>
                  <p className="text-base font-mono font-bold text-emerald-400">${vpCredits}</p>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div className="text-left">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Bet</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {[5, 10, 25, 50].map(b => (
                      <button
                        key={b}
                        onClick={() => {
                          sound.playButtonClick();
                          setVpBet(b);
                        }}
                        disabled={vpPhase === 'draw'}
                        className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all ${
                          vpBet === b ? 'bg-amber-500 text-black' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        ${b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {vpPhase === 'deal' ? (
                <button
                  onClick={handleVpDeal}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 transition-all hover:scale-105 active:scale-95"
                >
                  Deal ($ {vpBet})
                </button>
              ) : (
                <button
                  onClick={handleVpDraw}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-950/50 transition-all hover:scale-105 active:scale-95"
                >
                  Draw Cards
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-Component: Bot Player Badge & Tag
const BotPlayerTag: React.FC<{
  player: PokerPlayer;
  isTurn: boolean;
  isDealer: boolean;
}> = ({ player, isTurn, isDealer }) => {
  return (
    <div className="flex flex-col items-center relative">
      {/* Speech / Action Bubble */}
      {player.lastAction && (
        <div className="absolute -top-7 px-2.5 py-0.5 rounded-full bg-black/90 border border-amber-400 text-amber-300 text-[10px] font-bold shadow-lg animate-in zoom-in-75 duration-150 whitespace-nowrap z-10">
          {player.lastAction}
        </div>
      )}

      {/* Bot Card Holder */}
      <div
        className={`p-2 sm:p-2.5 rounded-2xl border flex items-center gap-2 backdrop-blur-md transition-all shadow-lg ${
          isTurn
            ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/40 scale-105'
            : 'bg-black/60 border-white/10'
        } ${player.hasFolded ? 'opacity-40 grayscale' : ''}`}
      >
        <div className="relative">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800 border border-white/20 flex items-center justify-center text-base sm:text-lg">
            {player.avatar}
          </div>
          {isDealer && (
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white text-black font-bold text-[9px] flex items-center justify-center shadow">
              D
            </span>
          )}
        </div>

        <div className="text-left">
          <span className="text-[11px] font-bold text-white block leading-tight">{player.name}</span>
          <span className="text-[10px] font-mono text-emerald-400 font-bold">${player.chips}</span>
        </div>

        {/* 2 Face Down Cards (or Face Up if Showdown) */}
        <div className="flex items-center gap-1 ml-1">
          {player.cards.map((c, i) =>
            c.faceUp ? (
              <PokerCardView key={i} card={c} isMini />
            ) : (
              <div
                key={i}
                className="w-7 h-10 sm:w-8 sm:h-11 rounded-lg bg-gradient-to-br from-red-800 to-rose-950 border border-rose-500/40 flex items-center justify-center shadow text-[9px] text-white/40 font-mono"
              >
                🂠
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// Sub-Component: High-detail Poker Card View
export const PokerCardView: React.FC<{
  card: PokerCard;
  isMini?: boolean;
}> = ({ card, isMini }) => {
  const isRed = card.suit === '♥' || card.suit === '♦';

  if (isMini) {
    return (
      <div
        className={`w-7 h-10 rounded-lg bg-white border border-slate-300 flex flex-col items-center justify-between p-0.5 shadow select-none ${
          isRed ? 'text-rose-600' : 'text-slate-900'
        }`}
      >
        <span className="text-[9px] font-bold leading-none">{card.rank}</span>
        <span className="text-[11px] leading-none">{card.suit}</span>
      </div>
    );
  }

  return (
    <div
      className={`w-12 h-18 sm:w-14 sm:h-20 rounded-xl bg-white border-2 border-slate-200 shadow-md flex flex-col justify-between p-1.5 select-none transition-all hover:-translate-y-1 hover:shadow-xl ${
        isRed ? 'text-rose-600' : 'text-slate-900'
      }`}
    >
      <div className="flex justify-between items-start leading-none">
        <span className="text-xs sm:text-sm font-extrabold">{card.rank}</span>
        <span className="text-xs">{card.suit}</span>
      </div>

      <div className="text-center text-lg sm:text-xl leading-none">{card.suit}</div>

      <div className="flex justify-between items-end leading-none rotate-180">
        <span className="text-xs sm:text-sm font-extrabold">{card.rank}</span>
        <span className="text-xs">{card.suit}</span>
      </div>
    </div>
  );
};
