import { GameMetadata, UserProfile, ViewMode } from '../types';
import { BattleshipGame } from '../games/battleship/BattleshipGame';
import { BlackjackGame } from '../games/blackjack/BlackjackGame';
import { CasinoLoungeGame } from '../games/casino/CasinoLoungeGame';
import { CheckersGame } from '../games/checkers/CheckersGame';
import { ChessGame } from '../games/chess/ChessGame';
import { ClueGame } from '../games/clue/ClueGame';
import { Connect4Game } from '../games/connect4/Connect4Game';
import { GoFishGame } from '../games/gofish/GoFishGame';
import { LiarsDiceGame } from '../games/liarsdice/LiarsDiceGame';
import { LifeGame } from '../games/life/LifeGame';
import { MonopolyGame } from '../games/monopoly/MonopolyGame';
import { PawnRushGame } from '../games/pawnrush/PawnRushGame';
import { PokerGame } from '../games/poker/PokerGame';
import { TriviaPartyGame } from '../games/trivia/TriviaPartyGame';
import { YahtzeeGame } from '../games/yahtzee/YahtzeeGame';

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
    <>
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
      {activeGame.id === 'pawnrush' && (
        <PawnRushGame viewMode={viewMode} onToggleViewMode={onToggleViewMode} onOpenRules={onOpenRules} />
      )}
      {activeGame.id === 'liarsdice' && (
        <LiarsDiceGame viewMode={viewMode} onToggleViewMode={onToggleViewMode} onOpenRules={onOpenRules} />
      )}
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
    </>
  );
}
