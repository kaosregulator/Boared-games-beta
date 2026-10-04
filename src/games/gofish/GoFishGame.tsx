import React, { useState, useEffect, useRef } from 'react';
import { PlayingCard, CardRank, GoFishPlayer } from '../../types';
import { createGoFishDeck, checkForBooks } from './goFishLogic';
import { sound } from '../../utils/audio';
import { AnimatedHand } from '../../components/HandCursor';
import { RotateCcw, HelpCircle, Sparkles, User, Bot, Waves, Trophy } from 'lucide-react';
import { RulesModal } from '../../components/RulesModal';
import { GAME_CATALOG } from '../../utils/gameData';

interface GoFishGameProps {
  onBackToShelf: () => void;
}

export const GoFishGame: React.FC<GoFishGameProps> = ({ onBackToShelf }) => {
  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const [players, setPlayers] = useState<GoFishPlayer[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [selectedRank, setSelectedRank] = useState<CardRank | null>(null);
  const [gameMessage, setGameMessage] = useState<string>('Select an opponent and a card rank from your hand to ask!');
  const [showRules, setShowRules] = useState<boolean>(false);
  const [winner, setWinner] = useState<GoFishPlayer | null>(null);

  // Animated Hand state
  const [handState, setHandState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    holdingItem?: 'card';
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

  const goFishMetadata = GAME_CATALOG.find(g => g.id === 'gofish')!;

  // Initialize Game
  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    const fullDeck = createGoFishDeck();
    const initialPlayers: GoFishPlayer[] = [
      { id: 'p1', name: 'You', avatar: '🎣', isBot: false, hand: [], books: [] },
      { id: 'p2', name: 'Alice Bot', avatar: '🌸', isBot: true, hand: [], books: [] },
      { id: 'p3', name: 'Bob Bot', avatar: '🧢', isBot: true, hand: [], books: [] },
      { id: 'p4', name: 'Charlie Bot', avatar: '🕶️', isBot: true, hand: [], books: [] }
    ];

    // Deal 5 cards each
    for (let i = 0; i < 5; i++) {
      for (const p of initialPlayers) {
        p.hand.push(fullDeck.pop()!);
      }
    }

    // Check initial books
    for (const p of initialPlayers) {
      const { newBooks, remainingHand } = checkForBooks(p.hand);
      p.books = newBooks;
      p.hand = remainingHand;
    }

    setDeck(fullDeck);
    setPlayers(initialPlayers);
    setCurrentTurnIndex(0);
    setSelectedTargetId('p2');
    setSelectedRank(null);
    setWinner(null);
    setGameMessage('Your turn! Ask an opponent for a card rank you hold.');
  };

  const currentPlayer = players[currentTurnIndex];

  // Unique ranks in player's hand
  const playerRanks = currentPlayer && !currentPlayer.isBot
    ? Array.from(new Set(currentPlayer.hand.map(c => c.rank)))
    : [];

  // Player Asks
  const handleAsk = () => {
    if (!selectedRank || !selectedTargetId || currentPlayer.isBot) return;
    executeTurn(currentPlayer, selectedTargetId, selectedRank);
  };

  const executeTurn = (asker: GoFishPlayer, targetId: string, rank: CardRank) => {
    sound.playButtonClick();
    const target = players.find(p => p.id === targetId)!;
    const matchingCards = target.hand.filter(c => c.rank === rank);

    if (matchingCards.length > 0) {
      // Success! Cards transferred
      sound.playVictory();
      setGameMessage(`${asker.name} asked ${target.name} for ${rank}s and got ${matchingCards.length} card(s)! (Take another turn!)`);

      setPlayers(prev =>
        prev.map(p => {
          if (p.id === targetId) {
            return { ...p, hand: p.hand.filter(c => c.rank !== rank) };
          }
          if (p.id === asker.id) {
            const combined = [...p.hand, ...matchingCards];
            const { newBooks, remainingHand } = checkForBooks(combined);
            if (newBooks.length > 0) sound.playVictory();
            return { ...p, hand: remainingHand, books: [...p.books, ...newBooks] };
          }
          return p;
        })
      );
      // Asker goes again!
    } else {
      // Go Fish!
      sound.playSplash();
      setGameMessage(`${target.name} shouted "GO FISH!" ${asker.name} fishes a card from the pond.`);

      if (deck.length > 0) {
        const drawnCard = deck[deck.length - 1];
        const newDeck = deck.slice(0, -1);
        setDeck(newDeck);

        setPlayers(prev =>
          prev.map(p => {
            if (p.id === asker.id) {
              const combined = [...p.hand, drawnCard];
              const { newBooks, remainingHand } = checkForBooks(combined);
              return { ...p, hand: remainingHand, books: [...p.books, ...newBooks] };
            }
            return p;
          })
        );

        if (drawnCard.rank === rank) {
          sound.playVictory();
          setGameMessage(`${asker.name} fished the ${rank}! Lucky catch—take another turn!`);
          return;
        }
      }

      // Next Player's Turn
      advanceTurn();
    }
  };

  const advanceTurn = () => {
    // Check if total 13 books reached
    const totalBooks = players.reduce((sum, p) => sum + p.books.length, 0);
    if (totalBooks >= 13 || deck.length === 0) {
      // Game over
      const sorted = [...players].sort((a, b) => b.books.length - a.books.length);
      setWinner(sorted[0]);
      sound.playVictory();
      return;
    }

    const nextIndex = (currentTurnIndex + 1) % players.length;
    setCurrentTurnIndex(nextIndex);
    setSelectedRank(null);
  };

  // Bot Turn Automation
  useEffect(() => {
    if (currentPlayer && currentPlayer.isBot && !winner) {
      const timer = setTimeout(() => {
        if (currentPlayer.hand.length === 0 && deck.length > 0) {
          // Draw from pond
          const drawn = deck[deck.length - 1];
          setDeck(deck.slice(0, -1));
          setPlayers(prev =>
            prev.map(p => (p.id === currentPlayer.id ? { ...p, hand: [drawn] } : p))
          );
          advanceTurn();
          return;
        }

        if (currentPlayer.hand.length === 0) {
          advanceTurn();
          return;
        }

        // Pick random rank from bot's hand
        const botRanks = currentPlayer.hand.map(c => c.rank);
        const chosenRank = botRanks[Math.floor(Math.random() * botRanks.length)];

        // Pick random other player with cards
        const validTargets = players.filter(p => p.id !== currentPlayer.id && p.hand.length > 0);
        if (validTargets.length === 0) {
          advanceTurn();
          return;
        }

        const chosenTarget = validTargets[Math.floor(Math.random() * validTargets.length)];
        executeTurn(currentPlayer, chosenTarget.id, chosenRank);
      }, 1400);

      return () => clearTimeout(timer);
    }
  }, [currentTurnIndex, players, deck, winner]);

  return (
    <div className="w-full max-w-5xl px-2 sm:px-6 py-4 flex flex-col items-center select-none animate-in fade-in duration-300">
      {/* Top Header */}
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
              <span>GO FISH!</span>
              <span className="text-[10px] font-mono uppercase bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                4-Player Classic
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-mono">
              Pond Cards Left: <span className="text-cyan-400 font-bold">{deck.length}</span> / 52
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowRules(true)}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
        >
          <HelpCircle className="w-4 h-4 text-amber-400" />
        </button>
      </div>

      {/* Main Pond Table Stage */}
      <div className="w-full max-w-4xl min-h-[420px] rounded-3xl bg-gradient-to-b from-sky-950 via-slate-900 to-blue-950 border-8 border-[#1e293b] shadow-[0_30px_60px_rgba(0,0,0,0.9)] p-4 sm:p-6 flex flex-col justify-between relative overflow-hidden my-2">
        {/* Pond Water Ripple Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15),transparent_70%)] pointer-events-none" />

        {/* Other 3 Players (Bots) across top */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 relative z-10">
          {players.slice(1).map(bot => {
            const isTurn = players[currentTurnIndex]?.id === bot.id;
            const isTargeted = selectedTargetId === bot.id;

            return (
              <div
                key={bot.id}
                onClick={() => !currentPlayer?.isBot && setSelectedTargetId(bot.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  isTargeted
                    ? 'bg-blue-600/30 border-blue-400 ring-2 ring-blue-400/50 shadow-lg'
                    : isTurn
                    ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/40'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{bot.avatar}</span>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-none">{bot.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {bot.hand.length} Cards
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-wider text-cyan-400 font-bold block">Books</span>
                    <span className="font-mono text-xs font-bold text-white">{bot.books.length}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center Fishing Pond Deck */}
        <div className="relative z-10 flex flex-col items-center my-4">
          <div className="w-24 h-32 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-900 border-2 border-white/60 shadow-2xl flex flex-col items-center justify-center text-white relative">
            <Waves className="w-8 h-8 text-cyan-300 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider mt-1">Pond Deck</span>
            <span className="font-mono text-xs text-cyan-200 mt-0.5">{deck.length} Left</span>
          </div>

          <div className="mt-3 px-4 py-1.5 rounded-full bg-slate-950/90 border border-cyan-500/40 text-xs font-mono text-cyan-300 shadow-md text-center max-w-lg">
            {gameMessage}
          </div>
        </div>

        {/* Player's Hand & Books at Bottom */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Your Hand ({players[0]?.hand.length} Cards)</span>
            </span>
            <span className="text-xs font-mono text-cyan-300 font-bold">
              Your Books: {players[0]?.books.join(', ') || '0'}
            </span>
          </div>

          {/* Cards Carousel */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto max-w-full p-2">
            {players[0]?.hand.map((card, idx) => {
              const isSelected = selectedRank === card.rank;
              return (
                <div
                  key={card.id || idx}
                  onClick={() => !currentPlayer?.isBot && setSelectedRank(card.rank)}
                  className={`w-12 sm:w-16 h-18 sm:h-24 rounded-lg bg-white border cursor-pointer flex flex-col justify-between p-1 shadow-lg transition-transform transform ${
                    isSelected
                      ? 'border-blue-500 ring-4 ring-blue-400 -translate-y-3 scale-105'
                      : 'border-slate-300 hover:-translate-y-1'
                  }`}
                >
                  <span className={`text-[10px] sm:text-xs font-bold ${['♥', '♦'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}>
                    {card.rank}{card.suit}
                  </span>
                  <span className="text-base sm:text-2xl self-center leading-none">
                    {card.suit}
                  </span>
                  <span className={`text-[10px] sm:text-xs font-bold self-end ${['♥', '♦'].includes(card.suit) ? 'text-red-600' : 'text-slate-900'}`}>
                    {card.rank}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Player Action Button */}
          {currentTurnIndex === 0 && (
            <div className="mt-3 flex items-center gap-3">
              <button
                disabled={!selectedRank || !selectedTargetId}
                onClick={handleAsk}
                className="px-8 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-cyan-900/50 transition-all hover:scale-105"
              >
                Ask {players.find(p => p.id === selectedTargetId)?.name} for {selectedRank || '...'}s!
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Game Over Winner Overlay */}
      {winner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="sleek-card border-slate-700/80 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center mx-auto mb-4 text-3xl">
              🏆
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-wider">
              {winner.name} WINS GO FISH!
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Final Books: {winner.books.length} Books Scored
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={startNewGame}
                className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-cyan-900/40 transition-all hover:scale-105"
              >
                Play Again
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

      {showRules && <RulesModal game={goFishMetadata} onClose={() => setShowRules(false)} />}
    </div>
  );
};
