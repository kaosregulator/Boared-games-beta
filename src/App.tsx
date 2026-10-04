import React, { useState } from 'react';
import { GameId, GameMetadata, ViewMode, UserProfile } from './types';
import { GAME_CATALOG, INITIAL_USER_PROFILE, LEADERBOARD_DATA } from './utils/gameData';
import { sound } from './utils/audio';

import { DiscordActivityShell } from './components/DiscordActivityShell';
import { DiscordBotConsole } from './components/DiscordBotConsole';
import { DiscordEmbedCanvas } from './components/DiscordEmbedCanvas';
import { ShelfUnboxing } from './components/ShelfUnboxing';
import { RetroBookshelfMenu } from './components/RetroBookshelfMenu';
import { DemoLanding } from './components/DemoLanding';
import { FirstPersonGameRoom } from './room/FirstPersonGameRoom';
import { RulesModal } from './components/RulesModal';
import { AvatarMakerModal } from './components/AvatarMakerModal';
import { LeaderboardModal } from './components/LeaderboardModal';

import { PokerGame } from './games/poker/PokerGame';
import { CasinoLoungeGame } from './games/casino/CasinoLoungeGame';
import { BattleshipGame } from './games/battleship/BattleshipGame';
import { Connect4Game } from './games/connect4/Connect4Game';
import { ChessGame } from './games/chess/ChessGame';
import { CheckersGame } from './games/checkers/CheckersGame';
import { BlackjackGame } from './games/blackjack/BlackjackGame';
import { GoFishGame } from './games/gofish/GoFishGame';
import { PawnRushGame } from './games/pawnrush/PawnRushGame';
import { LiarsDiceGame } from './games/liarsdice/LiarsDiceGame';
import { TriviaPartyGame } from './games/trivia/TriviaPartyGame';

import { Sparkles, Terminal, Trophy, Hash, Coins } from 'lucide-react';

type HubMode = 'landing' | 'room' | 'classic';

export default function App() {
  const [hubMode, setHubMode] = useState<HubMode>('landing');
  const [activeGame, setActiveGame] = useState<GameMetadata | null>(null);
  const [isUnboxing, setIsUnboxing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('isometric');
  const [isBotConsoleOpen, setIsBotConsoleOpen] = useState<boolean>(false);
  const [isEmbedCanvasOpen, setIsEmbedCanvasOpen] = useState<boolean>(false);
  const [showRulesForGame, setShowRulesForGame] = useState<GameMetadata | null>(null);

  // Profile & Leaderboard Modals
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [isAvatarMakerOpen, setIsAvatarMakerOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);

  // User picks game from shelf
  const handleSelectGame = (game: GameMetadata) => {
    setActiveGame(game);
    setIsUnboxing(true);
  };

  // Switch game directly via bot command, embed canvas, or quick menu
  const handleLaunchGameById = (id: GameId) => {
    const found = GAME_CATALOG.find(g => g.id === id);
    if (found) {
      setActiveGame(found);
      setIsUnboxing(false);
      sound.playVictoryFanfare();
    }
  };

  const handleToggleViewMode = () => {
    sound.playButtonClick();
    setViewMode(prev => (prev === 'isometric' ? '2d' : 'isometric'));
  };

  const handleBackToShelf = () => {
    sound.playShelfSlide();
    setActiveGame(null);
    setIsUnboxing(false);
    setHubMode(prev => (prev === 'landing' ? 'room' : prev));
  };

  if (hubMode === 'landing' && !activeGame) {
    return (
      <DemoLanding
        onEnterDemo={() => {
          sound.playVictoryFanfare();
          setHubMode('room');
        }}
      />
    );
  }

  const handleUpdateChips = (amount: number) => {
    setUserProfile(prev => ({
      ...prev,
      chips: (prev.chips || 1000) + amount
    }));
  };

  return (
    <DiscordActivityShell
      activeGameTitle={activeGame?.title}
      onOpenShelf={handleBackToShelf}
      onToggleBotConsole={() => {
        sound.playButtonClick();
        setIsBotConsoleOpen(!isBotConsoleOpen);
      }}
      isBotConsoleOpen={isBotConsoleOpen}
    >
      {/* Top Floating Action Bar for Profile Customizer, Chips, & Leaderboard */}
      <div className={`w-full max-w-6xl px-4 pt-3 flex items-center justify-between z-20 gap-2 ${hubMode === 'room' && !activeGame ? 'hidden sm:flex opacity-90' : ''}`}>
        {/* Left: User Profile Pill & Chips */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playButtonClick();
              setIsAvatarMakerOpen(true);
            }}
            className="flex items-center gap-2.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 px-3 py-1.5 rounded-2xl shadow-lg backdrop-blur transition-all hover:scale-105"
          >
            <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${userProfile.avatarBg} border border-white/40 flex items-center justify-center text-sm shadow`}>
              {userProfile.avatarEmoji}
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-white block leading-tight">{userProfile.name}</span>
              <span className="text-[9px] font-mono text-blue-400 font-bold">{userProfile.rank} Rank</span>
            </div>
          </button>

          {/* Chips balance button */}
          <button
            onClick={() => handleLaunchGameById('casino')}
            className="hidden sm:flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 px-3 py-1.5 rounded-2xl shadow-lg backdrop-blur text-xs font-mono font-bold text-emerald-400 transition-all hover:scale-105"
            title="Casino Chips - Click to visit Lounge"
          >
            <Coins className="w-4 h-4 text-emerald-400" />
            <span>${userProfile.chips || 1500}</span>
          </button>
        </div>

        {/* Right: Discord Embed Canvas Button & Leaderboard */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sound.playButtonClick();
              setIsEmbedCanvasOpen(!isEmbedCanvasOpen);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all hover:scale-105 shadow-lg ${
              isEmbedCanvasOpen
                ? 'bg-[#5865F2] text-white border-white/40'
                : 'bg-slate-900/90 hover:bg-slate-800 text-[#5865F2] border-[#5865F2]/40'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Discord</span> Embed Canvas
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setIsLeaderboardOpen(true);
            }}
            className="flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 px-3.5 py-1.5 rounded-2xl shadow-lg backdrop-blur text-xs font-bold text-amber-300 font-mono transition-all hover:scale-105"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Season Ranks</span>
          </button>
        </div>
      </div>

      {/* 1. Hub: first-person Game Room Beta (default) or classic shelf fallback */}
      {!activeGame && hubMode === 'room' && (
        <FirstPersonGameRoom
          games={GAME_CATALOG}
          onSelectGame={handleSelectGame}
          onOpenClassicShelf={() => setHubMode('classic')}
          onOpenBotConsole={() => setIsBotConsoleOpen(true)}
          onOpenRulesForGame={game => setShowRulesForGame(game)}
        />
      )}

      {!activeGame && hubMode === 'classic' && (
        <div className="w-full max-w-6xl px-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.25em] text-fuchsia-300 font-bold">
              Classic Shelf · Beta Fallback
            </p>
            <button
              type="button"
              onClick={() => {
                sound.playButtonClick();
                setHubMode('room');
              }}
              className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white"
            >
              Back to 3D Room
            </button>
          </div>
          <RetroBookshelfMenu
            games={GAME_CATALOG}
            onSelectGame={handleSelectGame}
            onOpenBotConsole={() => setIsBotConsoleOpen(true)}
            onOpenRulesForGame={game => setShowRulesForGame(game)}
          />
        </div>
      )}

      {/* 2. If a game is selected and currently unboxing: Show 3D Shelf Unboxing Sequence */}
      {activeGame && isUnboxing && (
        <ShelfUnboxing
          game={activeGame}
          onComplete={() => setIsUnboxing(false)}
          onBackToShelf={handleBackToShelf}
        />
      )}

      {/* 3. If a game is active and unboxed: Render the respective Game Board */}
      {activeGame && !isUnboxing && (
        <div className="w-full flex-1 flex flex-col items-center justify-start py-2">
          {activeGame.id === 'trivia' && (
            <TriviaPartyGame
              onGameOver={(winnerName, isRealMatch) => {
                if (isRealMatch && winnerName.includes('You')) {
                  setUserProfile(prev => ({
                    ...prev,
                    wins: prev.wins + 1,
                    seasonScore: prev.seasonScore + 250,
                    winStreak: prev.winStreak + 1
                  }));
                }
              }}
              onExitToShelf={handleBackToShelf}
            />
          )}

          {activeGame.id === 'poker' && (
            <PokerGame
              viewMode={viewMode}
              onToggleViewMode={handleToggleViewMode}
              onOpenRules={() => setShowRulesForGame(activeGame)}
              onBackToShelf={handleBackToShelf}
              onUpdateUserChips={handleUpdateChips}
            />
          )}

          {activeGame.id === 'casino' && (
            <CasinoLoungeGame
              onBackToShelf={handleBackToShelf}
              onOpenPoker={() => handleLaunchGameById('poker')}
            />
          )}

          {activeGame.id === 'battleship' && (
            <BattleshipGame
              viewMode={viewMode}
              onToggleViewMode={handleToggleViewMode}
              onOpenRules={() => setShowRulesForGame(activeGame)}
              onBackToShelf={handleBackToShelf}
            />
          )}

          {activeGame.id === 'connect4' && (
            <Connect4Game
              viewMode={viewMode}
              onToggleViewMode={handleToggleViewMode}
              onOpenRules={() => setShowRulesForGame(activeGame)}
              onBackToShelf={handleBackToShelf}
              userProfile={userProfile}
              onUpdateUserProfile={setUserProfile}
            />
          )}

          {activeGame.id === 'chess' && (
            <ChessGame
              viewMode={viewMode}
              onToggleViewMode={handleToggleViewMode}
              onOpenRules={() => setShowRulesForGame(activeGame)}
              onBackToShelf={handleBackToShelf}
            />
          )}

          {activeGame.id === 'checkers' && (
            <CheckersGame onBackToShelf={handleBackToShelf} />
          )}

          {activeGame.id === 'blackjack' && (
            <BlackjackGame onBackToShelf={handleBackToShelf} />
          )}

          {activeGame.id === 'gofish' && (
            <GoFishGame onBackToShelf={handleBackToShelf} />
          )}

          {activeGame.id === 'pawnrush' && (
            <PawnRushGame
              viewMode={viewMode}
              onToggleViewMode={handleToggleViewMode}
              onOpenRules={() => setShowRulesForGame(activeGame)}
            />
          )}

          {activeGame.id === 'liarsdice' && (
            <LiarsDiceGame
              viewMode={viewMode}
              onToggleViewMode={handleToggleViewMode}
              onOpenRules={() => setShowRulesForGame(activeGame)}
            />
          )}
        </div>
      )}

      {/* Rules Modal */}
      {showRulesForGame && (
        <RulesModal
          game={showRulesForGame}
          onClose={() => setShowRulesForGame(null)}
        />
      )}

      {/* Avatar Maker Modal */}
      {isAvatarMakerOpen && (
        <AvatarMakerModal
          profile={userProfile}
          onSave={updated => setUserProfile(updated)}
          onClose={() => setIsAvatarMakerOpen(false)}
        />
      )}

      {/* Leaderboard Modal */}
      {isLeaderboardOpen && (
        <LeaderboardModal
          userProfile={userProfile}
          leaderboard={LEADERBOARD_DATA}
          onClose={() => setIsLeaderboardOpen(false)}
        />
      )}

      {/* Bot Console Drawer Modal */}
      {isBotConsoleOpen && (
        <DiscordBotConsole
          onClose={() => setIsBotConsoleOpen(false)}
          onLaunchGame={handleLaunchGameById}
        />
      )}

      {/* Discord Embed Canvas Sidepanel */}
      <DiscordEmbedCanvas
        activeGame={activeGame}
        isOpen={isEmbedCanvasOpen}
        onToggle={() => setIsEmbedCanvasOpen(!isEmbedCanvasOpen)}
        onLaunchGame={handleLaunchGameById}
      />
    </DiscordActivityShell>
  );
}
