import React, { useState } from 'react';
import { GameId, GameMetadata, ViewMode, UserProfile } from './types';
import { GAME_CATALOG, INITIAL_USER_PROFILE } from './utils/gameData';
import { sound } from './utils/audio';

import { ShelfUnboxing } from './components/ShelfUnboxing';
import { ActiveGameSwitch } from './components/ActiveGameSwitch';
import { InRoomTable } from './components/InRoomTable';
import { WalkRoom } from './room/WalkRoom';
import { RulesModal } from './components/RulesModal';

/** `?game=<id>` opens a title on the table for capture scripts. Players enter through the room. */
function initialGame(): GameMetadata | null {
  if (typeof window === 'undefined') return null;
  const id = new URLSearchParams(window.location.search).get('game');
  if (!id) return null;
  return GAME_CATALOG.find(g => g.id === id) ?? null;
}

export default function App() {
  const [activeGame, setActiveGame] = useState<GameMetadata | null>(initialGame);
  const [isUnboxing, setIsUnboxing] = useState<boolean>(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('unbox'),
  );
  const [isPacking, setIsPacking] = useState<boolean>(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('pack'),
  );
  const [viewMode, setViewMode] = useState<ViewMode>('isometric');
  const [showRulesForGame, setShowRulesForGame] = useState<GameMetadata | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);

  const handleSelectGame = (game: GameMetadata) => {
    setActiveGame(game);
    setIsUnboxing(true);
  };

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

  const backToRoom = () => {
    sound.playShelfSlide();
    setActiveGame(null);
    setIsUnboxing(false);
    setIsPacking(false);
  };

  const exitGame = () => {
    if (activeGame) {
      setIsUnboxing(false);
      setIsPacking(true);
      return;
    }
    backToRoom();
  };

  const handleUpdateChips = (amount: number) => {
    setUserProfile(prev => ({
      ...prev,
      chips: (prev.chips || 1000) + amount,
    }));
  };

  const gameBoard = activeGame ? (
    <ActiveGameSwitch
      activeGame={activeGame}
      viewMode={viewMode}
      onToggleViewMode={handleToggleViewMode}
      onOpenRules={() => setShowRulesForGame(activeGame)}
      onExit={exitGame}
      onLaunch={handleLaunchGameById}
      userProfile={userProfile}
      onUpdateUserProfile={setUserProfile}
      onUpdateChips={handleUpdateChips}
      onGameOver={(winnerName, isRealMatch) => {
        if (isRealMatch && winnerName.includes('You')) {
          setUserProfile(prev => ({
            ...prev,
            wins: prev.wins + 1,
            seasonScore: prev.seasonScore + 250,
            winStreak: prev.winStreak + 1,
          }));
        }
      }}
    />
  ) : null;

  return (
    <>
      {!activeGame && (
        <WalkRoom
          games={GAME_CATALOG}
          onSelectGame={handleSelectGame}
          onOpenRulesForGame={game => setShowRulesForGame(game)}
        />
      )}

      {activeGame && isPacking && (
        <ShelfUnboxing direction="pack" game={activeGame} onComplete={backToRoom} onBackToShelf={backToRoom} />
      )}

      {activeGame && isUnboxing && (
        <ShelfUnboxing
          direction="open"
          game={activeGame}
          onComplete={() => setIsUnboxing(false)}
          onBackToShelf={() => {
            setIsUnboxing(false);
            setIsPacking(true);
          }}
        />
      )}

      {activeGame && !isUnboxing && !isPacking && (
        <InRoomTable game={activeGame} onPackUp={exitGame}>
          {gameBoard}
        </InRoomTable>
      )}

      {showRulesForGame && (
        <RulesModal game={showRulesForGame} onClose={() => setShowRulesForGame(null)} />
      )}
    </>
  );
}
