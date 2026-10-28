import React, { Suspense, lazy } from 'react';
import { GameMetadata, UserProfile, ViewMode } from '../types';

// Each board is its own download, fetched when it's opened (or warmed in the
// background once the room is up), so opening one game never pulls in all fifteen.
const BattleshipGame = lazy(() => import('../games/battleship/BattleshipGame').then(m => ({ default: m.BattleshipGame })));
const BlackjackGame = lazy(() => import('../games/blackjack/BlackjackGame').then(m => ({ default: m.BlackjackGame })));
const CasinoLoungeGame = lazy(() => import('../games/casino/CasinoLoungeGame').then(m => ({ default: m.CasinoLoungeGame })));
const CheckersGame = lazy(() => import('../games/checkers/CheckersGame').then(m => ({ default: m.CheckersGame })));
const ChessGame = lazy(() => import('../games/chess/ChessGame').then(m => ({ default: m.ChessGame })));
const ClueGame = lazy(() => import('../games/clue/ClueGame').then(m => ({ default: m.ClueGame })));
const Connect4Game = lazy(() => import('../games/connect4/Connect4Game').then(m => ({ default: m.Connect4Game })));
const GoFishGame = lazy(() => import('../games/gofish/GoFishGame').then(m => ({ default: m.GoFishGame })));
const LifeGame = lazy(() => import('../games/life/LifeGame').then(m => ({ default: m.LifeGame })));
const MonopolyGame = lazy(() => import('../games/monopoly/MonopolyGame').then(m => ({ default: m.MonopolyGame })));
const PokerGame = lazy(() => import('../games/poker/PokerGame').then(m => ({ default: m.PokerGame })));
const TriviaPartyGame = lazy(() => import('../games/trivia/TriviaPartyGame').then(m => ({ default: m.TriviaPartyGame })));
const YahtzeeGame = lazy(() => import('../games/yahtzee/YahtzeeGame').then(m => ({ default: m.YahtzeeGame })));


export function ActiveGameSwitch({
  activeGame,
  viewMode,
  onToggleViewMode,
  onOpenRules,
  onExit,
  onLaunch,
  userProfile,
  onUpdateUserProfile,
  onUpdateChips,
  onGameOver,
}: {
  activeGame: GameMetadata;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onOpenRules: () => void;
  onExit: () => void;
  onLaunch: (id: GameMetadata['id']) => void;
  userProfile: UserProfile;
  onUpdateUserProfile: (profile: UserProfile) => void;
  onUpdateChips: (amount: number) => void;
  onGameOver: (winnerName: string, isRealMatch: boolean) => void;
}) {
  return (
    <Suspense fallback={null}>
      {activeGame.id === 'trivia' && <TriviaPartyGame onGameOver={onGameOver} onExitToShelf={onExit} />}
      {activeGame.id === 'poker' && (
        <PokerGame viewMode={viewMode} onToggleViewMode={onToggleViewMode} onOpenRules={onOpenRules} onBackToShelf={onExit} onUpdateUserChips={onUpdateChips} />
      )}
      {activeGame.id === 'casino' && <CasinoLoungeGame onBackToShelf={onExit} onOpenPoker={() => onLaunch('poker')} />}
      {activeGame.id === 'battleship' && (
        <BattleshipGame viewMode={viewMode} onToggleViewMode={onToggleViewMode} onOpenRules={onOpenRules} onBackToShelf={onExit} />
      )}
      {activeGame.id === 'connect4' && (
        <Connect4Game viewMode={viewMode} onToggleViewMode={onToggleViewMode} onOpenRules={onOpenRules} onBackToShelf={onExit} userProfile={userProfile} onUpdateUserProfile={onUpdateUserProfile} />
      )}
      {activeGame.id === 'chess' && (
        <ChessGame viewMode={viewMode} onToggleViewMode={onToggleViewMode} onOpenRules={onOpenRules} onBackToShelf={onExit} />
      )}
      {activeGame.id === 'checkers' && <CheckersGame onBackToShelf={onExit} />}
      {activeGame.id === 'blackjack' && <BlackjackGame onBackToShelf={onExit} />}
      {activeGame.id === 'gofish' && <GoFishGame onBackToShelf={onExit} />}
      {activeGame.id === 'yahtzee' && (
        <YahtzeeGame onBackToShelf={onExit} onGameOver={onGameOver} playerName={userProfile.name} />
      )}
      {activeGame.id === 'clue' && (
        <ClueGame onBackToShelf={onExit} onGameOver={onGameOver} playerName={userProfile.name} />
      )}
      {activeGame.id === 'life' && (
        <LifeGame onBackToShelf={onExit} onGameOver={onGameOver} playerName={userProfile.name} />
      )}
      {activeGame.id === 'monopoly' && (
        <MonopolyGame onBackToShelf={onExit} onGameOver={onGameOver} playerName={userProfile.name} />
      )}
    </Suspense>
  );
}
