import React, { useState } from 'react';
import { GameId, GameMetadata, ViewMode, UserProfile } from './types';
import { GAME_CATALOG, INITIAL_USER_PROFILE } from './utils/gameData';
import { sound } from './utils/audio';

import { ActiveGameSwitch } from './components/ActiveGameSwitch';
import { InRoomTable } from './components/InRoomTable';
import { WalkRoom } from './room/WalkRoom';
import { RulesModal } from './components/RulesModal';

/** Monopoly, Connect Four, and Battleship are played in 3D on the table itself. */
const IN_ROOM_TABLE = new Set<GameId>(['monopoly', 'connect4', 'battleship']);

/** `?game=<id>` opens a 2D title straight away for capture scripts. */
function initialGame(): GameMetadata | null {
  if (typeof window === 'undefined') return null;
  const id = new URLSearchParams(window.location.search).get('game');
  if (!id || IN_ROOM_TABLE.has(id as GameId)) return null;
  return GAME_CATALOG.find(g => g.id === id) ?? null;
}

/**
 * The room is always mounted. Every game starts at the card table: the room
 * spawns it, unfolds the box, and either plays the match in 3D or opens the
 * game's own board over the live room. Pack up closes it and the room packs
 * the box away.
 */
export default function App() {
  const [activeGame, setActiveGame] = useState<GameMetadata | null>(initialGame);
  const [viewMode, setViewMode] = useState<ViewMode>('isometric');
  const [showRulesForGame, setShowRulesForGame] = useState<GameMetadata | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);

  const handleLaunchGameById = (id: GameId) => {
    const found = GAME_CATALOG.find(g => g.id === id);
    if (found) {
      setActiveGame(found);
      sound.playVictoryFanfare();
    }
  };

  const handleToggleViewMode = () => {
    sound.playButtonClick();
    setViewMode(prev => (prev === 'isometric' ? '2d' : 'isometric'));
  };

  const exitGame = () => {
    sound.playShelfSlide();
    setActiveGame(null);
  };

  const handleUpdateChips = (amount: number) => {
    setUserProfile(prev => ({
      ...prev,
      chips: (prev.chips || 1000) + amount,
    }));
  };

  return (
    <>
      <WalkRoom
        games={GAME_CATALOG}
        overlayGame={activeGame}
        onOpenBoard={game => {
          if (!IN_ROOM_TABLE.has(game.id)) setActiveGame(game);
        }}
        onOpenRulesForGame={game => setShowRulesForGame(game)}
      />

      {activeGame && (
        <InRoomTable game={activeGame} onPackUp={exitGame}>
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
        </InRoomTable>
      )}

      {showRulesForGame && <RulesModal game={showRulesForGame} onClose={() => setShowRulesForGame(null)} />}
    </>
  );
}
