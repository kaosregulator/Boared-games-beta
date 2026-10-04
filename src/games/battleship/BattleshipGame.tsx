import React, { useState, useEffect, useRef } from 'react';
import { BattleshipState, ShipType, ViewMode, Ship } from '../../types';
import {
  GRID_SIZE,
  SHIP_DEFINITIONS,
  createEmptyGrid,
  isValidPlacement,
  generateRandomFleet,
  initializeBattleshipGame,
  getSmartAIMove
} from './battleshipLogic';
import { sound } from '../../utils/audio';
import { RealisticWarship, ShipSilhouetteSideView, SegmentedHealthBar } from './ShipRenders';
import { AnimatedHand } from '../../components/HandCursor';
import {
  Anchor,
  Crosshair,
  RotateCw,
  Shuffle,
  Send,
  Smile,
  MessageSquare,
  Settings,
  Volume2,
  VolumeX,
  HelpCircle,
  Flame,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface BattleshipGameProps {
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onOpenRules: () => void;
  onBackToShelf: () => void;
}

interface ChatMessage {
  id: string;
  sender: string;
  senderColor: string;
  text: string;
}

export const BattleshipGame: React.FC<BattleshipGameProps> = ({
  viewMode,
  onToggleViewMode,
  onOpenRules,
  onBackToShelf
}) => {
  const [gameState, setGameState] = useState<BattleshipState>(() => {
    // Start with auto-generated placement for immediate visual fidelity
    const initial = initializeBattleshipGame();
    const { grid, ships } = generateRandomFleet();
    return {
      ...initial,
      playerBoard: grid,
      playerShips: ships,
      placementPhase: false,
      currentTurn: 'player'
    };
  });

  const [selectedCoord, setSelectedCoord] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<{ x: number; y: number } | null>(null);
  const [hoveredPlacement, setHoveredPlacement] = useState<{ x: number; y: number } | null>(null);
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('hard');
  const [muted, setMuted] = useState<boolean>(false);
  const [showOptionsModal, setShowOptionsModal] = useState<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  // Turn counter and Match Timer (MM:SS)
  const [turnCount, setTurnCount] = useState<number>(1);
  const [timerSeconds, setTimerSeconds] = useState<number>(18 * 60 + 45); // 18:45 initial
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Chat Feed matching screenshot
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'Commander', senderColor: 'text-cyan-400', text: 'Good luck!' },
    { id: '2', sender: 'Keen Negotiator', senderColor: 'text-rose-400', text: 'You too!' },
    { id: '3', sender: 'AI (Hard)', senderColor: 'text-purple-400', text: 'Target locked.' }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Firing animation state
  const [artilleryInFlight, setArtilleryInFlight] = useState<{
    target: { x: number; y: number };
    hit: boolean;
    by: 'player' | 'enemy';
  } | null>(null);

  // Hand Cursor State for realistic interaction
  const [handState, setHandState] = useState<{
    visible: boolean;
    x: number;
    y: number;
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

  const enemyBoardRef = useRef<HTMLDivElement>(null);

  // Live Game Timer effect
  useEffect(() => {
    if (!isTimerRunning || gameState.winner) return;
    const interval = setInterval(() => {
      setTimerSeconds(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, gameState.winner]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Send player chat
  const handleSendChat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'Commander',
      senderColor: 'text-cyan-400',
      text: chatInput.trim()
    };

    setChatMessages(prev => [...prev, newMsg]);
    setChatInput('');
    sound.playButtonClick();

    // AI Tactical Radio Response
    setTimeout(() => {
      const aiReplies = [
        'Adjusting firing azimuth.',
        'Sonar array scanning sector.',
        'Incoming shells detected on radar!',
        'Battlestations, all hands on deck!',
        'Counter-battery salvo primed.'
      ];
      const reply = aiReplies[Math.floor(Math.random() * aiReplies.length)];
      setChatMessages(prev => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'AI (Admiral)',
          senderColor: 'text-purple-400',
          text: reply
        }
      ]);
      sound.playRadarPing();
    }, 1200);
  };

  // Quick Emoji reaction
  const handleSendEmoji = (emoji: string) => {
    setShowEmojiPicker(false);
    const newMsg: ChatMessage = {
      id: `emoji_${Date.now()}`,
      sender: 'Commander',
      senderColor: 'text-cyan-400',
      text: emoji
    };
    setChatMessages(prev => [...prev, newMsg]);
    sound.playButtonClick();
  };

  // Placement Phase handlers
  const handlePlacementClick = (x: number, y: number) => {
    if (!gameState.placementPhase || !gameState.selectedShip) return;

    const shipDef = SHIP_DEFINITIONS.find(s => s.type === gameState.selectedShip);
    if (!shipDef) return;

    if (isValidPlacement(gameState.playerBoard, x, y, shipDef.size, gameState.shipOrientation)) {
      sound.playShipPlaced();

      const newPositions: { x: number; y: number }[] = [];
      for (let i = 0; i < shipDef.size; i++) {
        const px = gameState.shipOrientation === 'horizontal' ? x + i : x;
        const py = gameState.shipOrientation === 'horizontal' ? y : y + i;
        newPositions.push({ x: px, y: py });
      }

      const newShip: Ship = {
        id: `${shipDef.type}-${Date.now()}`,
        type: shipDef.type,
        name: shipDef.name,
        size: shipDef.size,
        positions: newPositions,
        hits: 0,
        sunk: false,
        color: shipDef.color
      };

      setGameState(prev => {
        const nextBoard = prev.playerBoard.map(row => [...row]);
        newPositions.forEach(p => {
          nextBoard[p.y][p.x] = 'ship';
        });

        const nextShips = [...prev.playerShips, newShip];
        const placedTypes = nextShips.map(s => s.type);
        const unplaced = SHIP_DEFINITIONS.find(d => !placedTypes.includes(d.type));

        return {
          ...prev,
          playerBoard: nextBoard,
          playerShips: nextShips,
          selectedShip: unplaced ? unplaced.type : null,
          placementPhase: unplaced ? true : false,
          currentTurn: 'player'
        };
      });
    } else {
      sound.playDefeat();
    }
  };

  const handleEnterSetupMode = () => {
    sound.playButtonClick();
    setGameState(prev => ({
      ...prev,
      playerBoard: createEmptyGrid(),
      playerShips: [],
      selectedShip: 'carrier',
      placementPhase: true
    }));
  };

  const handleClearBoard = () => {
    sound.playButtonClick();
    setGameState(prev => ({
      ...prev,
      playerBoard: createEmptyGrid(),
      playerShips: [],
      selectedShip: 'carrier',
      placementPhase: true
    }));
  };

  const handleStartBattle = () => {
    if (gameState.playerShips.length < 5) return;
    sound.playVictoryFanfare();
    setGameState(prev => ({
      ...prev,
      placementPhase: false,
      selectedShip: null,
      currentTurn: 'player'
    }));
  };

  const handleAutoDeploy = () => {
    sound.playShipPlaced();
    const { grid: newBoard, ships: fleet } = generateRandomFleet();
    setGameState(prev => ({
      ...prev,
      playerBoard: newBoard,
      playerShips: fleet,
      selectedShip: null,
      placementPhase: false,
      currentTurn: 'player'
    }));
  };

  // Targeting click on enemy board: locks coordinate in TARGET scope
  const handleSelectCoordinate = (x: number, y: number) => {
    if (gameState.placementPhase || gameState.currentTurn !== 'player' || gameState.winner || artilleryInFlight) {
      return;
    }
    if (gameState.enemyBoard[y][x] !== 'empty') return;

    sound.playRadarPing();
    setSelectedCoord({ x, y });
  };

  // Fire missile at selected coordinate
  const handleFireSelectedTarget = () => {
    if (!selectedCoord) return;
    const { x, y } = selectedCoord;

    if (gameState.placementPhase || gameState.currentTurn !== 'player' || gameState.winner || artilleryInFlight) {
      return;
    }
    if (gameState.enemyBoard[y][x] !== 'empty') return;

    // Trigger Hand Cursor animation
    if (enemyBoardRef.current) {
      const rect = enemyBoardRef.current.getBoundingClientRect();
      const cellSize = rect.width / 11;
      const targetX = rect.left + (x + 1) * cellSize + cellSize / 2;
      const targetY = rect.top + (y + 1) * cellSize + cellSize / 2;

      setHandState({
        visible: true,
        x: targetX,
        y: targetY,
        action: 'hover',
        label: `Fire [${String.fromCharCode(65 + y)}${x + 1}]`,
        isEnemy: false
      });

      setTimeout(() => {
        setHandState(prev => ({ ...prev, visible: false }));
      }, 500);
    }

    const hitShip = gameState.enemyShips.find(ship =>
      ship.positions.some(pos => pos.x === x && pos.y === y)
    );
    const isHit = !!hitShip;

    sound.playArtilleryWhistle();
    setArtilleryInFlight({
      target: { x, y },
      hit: isHit,
      by: 'player'
    });

    setTimeout(() => {
      if (isHit) {
        sound.playExplosionHit();
      } else {
        sound.playWaterSplashMiss();
      }

      setGameState(prev => {
        const nextEnemyBoard = prev.enemyBoard.map(row => [...row]);
        nextEnemyBoard[y][x] = isHit ? 'hit' : 'miss';

        const nextEnemyShips = prev.enemyShips.map(ship => {
          if (ship.positions.some(pos => pos.x === x && pos.y === y)) {
            const hits = ship.hits + 1;
            const sunk = hits >= ship.size;
            if (sunk) sound.playShipSunkAlarm();
            return { ...ship, hits, sunk };
          }
          return ship;
        });

        const justSunk = nextEnemyShips.find(
          s => s.sunk && !prev.enemyShips.find(es => es.type === s.type)?.sunk
        );

        let winStatus: 'player' | 'enemy' | null = null;
        if (nextEnemyShips.every(s => s.sunk)) {
          winStatus = 'player';
          sound.playVictory();
        }

        return {
          ...prev,
          enemyBoard: nextEnemyBoard,
          enemyShips: nextEnemyShips,
          currentTurn: winStatus ? 'player' : 'enemy',
          winner: winStatus,
          shotsFired: { ...prev.shotsFired, player: prev.shotsFired.player + 1 },
          hitsLanded: { ...prev.hitsLanded, player: prev.hitsLanded.player + (isHit ? 1 : 0) }
        };
      });

      setSelectedCoord(null);
      setArtilleryInFlight(null);
      setTurnCount(c => c + 1);
    }, 600);
  };

  // AI Turn Execution
  useEffect(() => {
    if (gameState.placementPhase || gameState.currentTurn !== 'enemy' || gameState.winner || artilleryInFlight) {
      return;
    }

    const aiTimer = setTimeout(() => {
      const move = getSmartAIMove(gameState.playerBoard, gameState.playerShips, aiDifficulty);
      const hitShip = gameState.playerShips.find(ship =>
        ship.positions.some(pos => pos.x === move.x && pos.y === move.y)
      );
      const isHit = !!hitShip;

      sound.playArtilleryWhistle();
      setArtilleryInFlight({
        target: { x: move.x, y: move.y },
        hit: isHit,
        by: 'enemy'
      });

      setTimeout(() => {
        if (isHit) {
          sound.playExplosionHit();
        } else {
          sound.playWaterSplashMiss();
        }

        setGameState(prev => {
          const nextPlayerBoard = prev.playerBoard.map(row => [...row]);
          nextPlayerBoard[move.y][move.x] = isHit ? 'hit' : 'miss';

          const nextPlayerShips = prev.playerShips.map(ship => {
            if (ship.positions.some(pos => pos.x === move.x && pos.y === move.y)) {
              const hits = ship.hits + 1;
              const sunk = hits >= ship.size;
              if (sunk) sound.playShipSunkAlarm();
              return { ...ship, hits, sunk };
            }
            return ship;
          });

          let winStatus: 'player' | 'enemy' | null = null;
          if (nextPlayerShips.every(s => s.sunk)) {
            winStatus = 'enemy';
            sound.playDefeat();
          }

          return {
            ...prev,
            playerBoard: nextPlayerBoard,
            playerShips: nextPlayerShips,
            currentTurn: 'player',
            winner: winStatus,
            shotsFired: { ...prev.shotsFired, enemy: prev.shotsFired.enemy + 1 },
            hitsLanded: { ...prev.hitsLanded, enemy: prev.hitsLanded.enemy + (isHit ? 1 : 0) }
          };
        });

        setArtilleryInFlight(null);
      }, 600);
    }, 1000);

    return () => clearTimeout(aiTimer);
  }, [gameState.currentTurn, gameState.placementPhase, gameState.winner, artilleryInFlight, aiDifficulty]);

  // Restart match
  const handleRestart = () => {
    sound.playButtonClick();
    const initial = initializeBattleshipGame();
    const { grid, ships } = generateRandomFleet();
    setGameState({
      ...initial,
      playerBoard: grid,
      playerShips: ships,
      placementPhase: false,
      currentTurn: 'player'
    });
    setSelectedCoord(null);
    setTurnCount(1);
    setTimerSeconds(18 * 60 + 45);
  };

  const yourShipsSunk = gameState.playerShips.filter(s => s.sunk).length;
  const enemyShipsSunk = gameState.enemyShips.filter(s => s.sunk).length;
  const yourHits = gameState.hitsLanded.player;
  const enemyHits = gameState.hitsLanded.enemy;

  // Ocean Cell pixel width for realistic ship absolute positioning
  const CELL_PX = 32;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-start text-white select-none py-1 sm:py-2 px-1 sm:px-2 font-sans">
      <AnimatedHand
        x={handState.x}
        y={handState.y}
        visible={handState.visible}
        action={handState.action}
        label={handState.label}
        isEnemy={handState.isEnemy}
      />

      {/* Main Tactical Command Console Card */}
      <div className="w-full bg-[#050d1a] border border-[#172e4d] rounded-2xl p-2.5 sm:p-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-3 relative overflow-hidden backdrop-blur-xl">
        {/* Subtle Radar Wave Grid Texture Background */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, #38bdf8 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
            backgroundSize: '30px 30px'
          }}
        />

        {/* TOP HEADER BAR (Exact match to screenshot) */}
        <div className="w-full grid grid-cols-12 items-center gap-2 relative z-10 border-b border-[#172e4d]/80 pb-2.5">
          {/* FLEET Label on left */}
          <div className="col-span-2 text-left">
            <span className="text-xs sm:text-sm font-black tracking-widest text-slate-300 uppercase">
              FLEET
            </span>
          </div>

          {/* YOUR BOARD Label */}
          <div className="col-span-3 text-center">
            <span className="text-xs sm:text-sm font-black tracking-widest text-slate-300 uppercase">
              YOUR BOARD
            </span>
          </div>

          {/* Centered Anchor & BATTLESHIP Title + YOUR TURN */}
          <div className="col-span-2 flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5">
              <Anchor className="w-4 h-4 text-cyan-400" />
              <h1 className="text-sm sm:text-base font-black tracking-widest text-white uppercase drop-shadow">
                BATTLESHIP
              </h1>
            </div>
            <div className="mt-0.5">
              <span
                className={`text-[11px] sm:text-xs font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full ${
                  gameState.winner === 'player'
                    ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.6)]'
                    : gameState.winner === 'enemy'
                    ? 'text-rose-400 bg-rose-950/80 border border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]'
                    : gameState.currentTurn === 'player'
                    ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/80 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse'
                    : 'text-amber-400 bg-amber-950/60 border border-amber-500/60'
                }`}
              >
                {gameState.winner === 'player'
                  ? 'VICTORY'
                  : gameState.winner === 'enemy'
                  ? 'DEFEAT'
                  : gameState.currentTurn === 'player'
                  ? 'YOUR TURN'
                  : 'ENEMY FIRING...'}
              </span>
            </div>
          </div>

          {/* ENEMY BOARD Label */}
          <div className="col-span-3 text-center">
            <span className="text-xs sm:text-sm font-black tracking-widest text-slate-300 uppercase">
              ENEMY BOARD
            </span>
          </div>

          {/* GAME INFO Label on right */}
          <div className="col-span-2 text-right">
            <span className="text-xs sm:text-sm font-black tracking-widest text-slate-300 uppercase">
              GAME INFO
            </span>
          </div>
        </div>

        {/* MAIN GAMEPLAY ARENA: 5 Columns (Fleet, Your Board, Center Target HUD, Enemy Board, Game Info/Chat) */}
        <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-3 relative z-10 items-start">
          {/* ========================================================================= */}
          {/* 1. LEFT SIDEBAR: FLEET STATUS ROSTER & REALISTIC SHIP SILHOUETTES */}
          {/* ========================================================================= */}
          <div className="xl:col-span-2 bg-[#081526]/90 border border-[#172e4d] rounded-xl p-3 flex flex-col gap-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-[#172e4d] pb-1.5">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                {gameState.placementPhase ? 'DEPLOYMENT' : 'Fleet Roster'}
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                {gameState.playerShips.length}/5 Deployed
              </span>
            </div>

            {/* If NOT in placement phase: show ships with health bars and a Redeploy button */}
            {!gameState.placementPhase && (
              <>
                {/* Ship 1: Aircraft Carrier (5) */}
                {(() => {
                  const carrier = gameState.playerShips.find(s => s.type === 'carrier');
                  return (
                    <div className="flex flex-col gap-1 bg-[#040a14]/60 p-2 rounded-lg border border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                        <span>Aircraft Carrier (5)</span>
                      </div>
                      <ShipSilhouetteSideView type="carrier" sunk={carrier?.sunk} />
                      <SegmentedHealthBar size={5} hits={carrier?.hits || 0} sunk={carrier?.sunk || false} />
                    </div>
                  );
                })()}

                {/* Ship 2: Battleship (4) */}
                {(() => {
                  const bb = gameState.playerShips.find(s => s.type === 'battleship');
                  return (
                    <div className="flex flex-col gap-1 bg-[#040a14]/60 p-2 rounded-lg border border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                        <span>Battleship (4)</span>
                      </div>
                      <ShipSilhouetteSideView type="battleship" sunk={bb?.sunk} />
                      <SegmentedHealthBar size={4} hits={bb?.hits || 0} sunk={bb?.sunk || false} />
                    </div>
                  );
                })()}

                {/* Ship 3: Cruiser (3) */}
                {(() => {
                  const cruiser = gameState.playerShips.find(s => s.type === 'cruiser');
                  return (
                    <div className="flex flex-col gap-1 bg-[#040a14]/60 p-2 rounded-lg border border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                        <span>Cruiser (3)</span>
                      </div>
                      <ShipSilhouetteSideView type="cruiser" sunk={cruiser?.sunk} />
                      <SegmentedHealthBar size={3} hits={cruiser?.hits || 0} sunk={cruiser?.sunk || false} />
                    </div>
                  );
                })()}

                {/* Ship 4: Submarine (3) */}
                {(() => {
                  const sub = gameState.playerShips.find(s => s.type === 'submarine');
                  return (
                    <div className="flex flex-col gap-1 bg-[#040a14]/60 p-2 rounded-lg border border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                        <span>Submarine (3)</span>
                      </div>
                      <ShipSilhouetteSideView type="submarine" sunk={sub?.sunk} />
                      <SegmentedHealthBar size={3} hits={sub?.hits || 0} sunk={sub?.sunk || false} />
                    </div>
                  );
                })()}

                {/* Ship 5: Destroyer (2) */}
                {(() => {
                  const dd = gameState.playerShips.find(s => s.type === 'destroyer');
                  return (
                    <div className="flex flex-col gap-1 bg-[#040a14]/60 p-2 rounded-lg border border-slate-800/80">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                        <span>Destroyer (2)</span>
                      </div>
                      <ShipSilhouetteSideView type="destroyer" sunk={dd?.sunk} />
                      <SegmentedHealthBar size={2} hits={dd?.hits || 0} sunk={dd?.sunk || false} />
                    </div>
                  );
                })()}

                {/* Setup Board button to manually customize fleet */}
                <button
                  onClick={handleEnterSetupMode}
                  className="mt-1 w-full py-2 bg-[#0c1f36] hover:bg-[#142e4e] text-cyan-300 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border border-cyan-500/30 transition-all hover:scale-102"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Redeploy / Setup Board
                </button>
              </>
            )}

            {/* If IN placement phase: interactive ship pickers & placement actions */}
            {gameState.placementPhase && (
              <div className="flex flex-col gap-2">
                <div className="text-[10px] text-cyan-300 font-mono">
                  Select a ship, choose rotation, and click on your ocean board to position:
                </div>

                {SHIP_DEFINITIONS.map(def => {
                  const isPlaced = gameState.playerShips.some(s => s.type === def.type);
                  const isSelected = gameState.selectedShip === def.type;

                  return (
                    <button
                      key={def.type}
                      onClick={() => {
                        sound.playButtonClick();
                        setGameState(prev => ({ ...prev, selectedShip: def.type }));
                      }}
                      className={`p-2 rounded-lg text-left flex flex-col gap-1 border transition-all ${
                        isSelected
                          ? 'bg-cyan-950/80 border-cyan-400 text-white ring-1 ring-cyan-400'
                          : isPlaced
                          ? 'bg-[#020b17]/60 border-emerald-500/40 text-slate-300 opacity-80'
                          : 'bg-[#040a14]/60 border-slate-800 hover:border-slate-600 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>{def.name} ({def.size})</span>
                        {isPlaced ? (
                          <span className="text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Placed
                          </span>
                        ) : isSelected ? (
                          <span className="text-cyan-300 text-[10px] font-mono font-bold">
                            Selected
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px] font-mono">Ready</span>
                        )}
                      </div>
                      <ShipSilhouetteSideView type={def.type} />
                    </button>
                  );
                })}

                {/* Placement Tools: Orientation, Clear, Auto, Start */}
                <div className="pt-2 border-t border-[#172e4d] flex flex-col gap-2">
                  <button
                    onClick={() => {
                      sound.playButtonClick();
                      setGameState(prev => ({
                        ...prev,
                        shipOrientation: prev.shipOrientation === 'horizontal' ? 'vertical' : 'horizontal'
                      }));
                    }}
                    className="w-full py-2 bg-[#0f233d] hover:bg-[#1a3860] text-cyan-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border border-cyan-500/40"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Rotate: {gameState.shipOrientation.toUpperCase()}
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={handleAutoDeploy}
                      className="py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-md"
                    >
                      <Shuffle className="w-3 h-3" />
                      Auto Setup
                    </button>
                    <button
                      onClick={handleClearBoard}
                      className="py-1.5 bg-[#0b1b2d] hover:bg-[#13273e] text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border border-slate-700"
                    >
                      Clear Board
                    </button>
                  </div>

                  {/* START BATTLE BUTTON */}
                  {gameState.playerShips.length === 5 && (
                    <button
                      onClick={handleStartBattle}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/60 transition-all hover:scale-105 animate-pulse mt-1"
                    >
                      <Anchor className="w-4 h-4" />
                      Start Battle ⚔️
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 2. YOUR BOARD (OCEAN GRID WITH REAL TOP-DOWN CONTINUOUS WARSHIPS) */}
          {/* ========================================================================= */}
          <div className="xl:col-span-3 flex flex-col items-center">
            <div
              className="relative p-2 rounded-xl bg-gradient-to-b from-[#0a233f] via-[#05172d] to-[#020e1e] border-2 border-[#193a61] shadow-2xl overflow-hidden"
              style={{
                backgroundImage: `
                  radial-gradient(ellipse at center, rgba(14, 165, 233, 0.15) 0%, rgba(2, 6, 23, 0.8) 80%),
                  linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
                `,
                backgroundSize: '100% 100%, 32px 32px, 32px 32px'
              }}
            >
              {/* Realistic Ocean Water Animated Waves Overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen animate-pulse"
                style={{
                  background:
                    'radial-gradient(circle at 30% 40%, rgba(56, 189, 248, 0.15) 0%, transparent 60%), radial-gradient(circle at 70% 80%, rgba(6, 182, 212, 0.1) 0%, transparent 50%)'
                }}
              />

              {/* Coordinates Header: 1 to 10 */}
              <div className="grid grid-cols-11 gap-0 mb-1 text-center font-mono text-[10px] text-cyan-300 font-bold">
                <div className="w-6 h-5" />
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="w-7 sm:w-8 h-5 flex items-center justify-center">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* 10x10 Ocean Grid Container */}
              <div className="relative">
                {/* ------------------------------------------------------------- */}
                {/* REAL TOP-DOWN NAVAL SHIPS SITTING ON THE WATER */}
                {/* ------------------------------------------------------------- */}
                <div className="absolute inset-0 pointer-events-none z-10">
                  {gameState.playerShips.map(ship => {
                    const minX = Math.min(...ship.positions.map(p => p.x));
                    const minY = Math.min(...ship.positions.map(p => p.y));
                    const isHoriz =
                      ship.positions.length > 1
                        ? ship.positions[0].y === ship.positions[1].y
                        : true;

                    // Compute pixel coordinates
                    // Each cell in responsive view is ~28-32px
                    return (
                      <div
                        key={ship.id}
                        className="absolute"
                        style={{
                          left: `calc(${minX} * (100% / 10))`,
                          top: `calc(${minY} * (100% / 10))`,
                          width: isHoriz ? `calc(${ship.size} * (100% / 10))` : `calc(100% / 10)`,
                          height: isHoriz ? `calc(100% / 10)` : `calc(${ship.size} * (100% / 10))`
                        }}
                      >
                        <RealisticWarship
                          type={ship.type}
                          orientation={isHoriz ? 'horizontal' : 'vertical'}
                          cellSize={32}
                          sunk={ship.sunk}
                          hits={ship.hits}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* 10x10 Coordinate Cells Layer */}
                {gameState.playerBoard.map((row, y) => (
                  <div key={y} className="flex items-center">
                    {/* Row Label (A to J) */}
                    <div className="w-6 h-7 sm:h-8 flex items-center justify-center font-mono text-[10px] text-cyan-300 font-bold">
                      {String.fromCharCode(65 + y)}
                    </div>

                    {row.map((cell, x) => {
                      const isPlacementHover =
                        gameState.placementPhase &&
                        gameState.selectedShip &&
                        hoveredPlacement &&
                        (() => {
                          const def = SHIP_DEFINITIONS.find(s => s.type === gameState.selectedShip);
                          if (!def) return false;
                          if (gameState.shipOrientation === 'horizontal') {
                            return (
                              hoveredPlacement.y === y &&
                              x >= hoveredPlacement.x &&
                              x < hoveredPlacement.x + def.size
                            );
                          } else {
                            return (
                              hoveredPlacement.x === x &&
                              y >= hoveredPlacement.y &&
                              y < hoveredPlacement.y + def.size
                            );
                          }
                        })();

                      const def = SHIP_DEFINITIONS.find(s => s.type === gameState.selectedShip);
                      const isValid =
                        def && hoveredPlacement
                          ? isValidPlacement(
                              gameState.playerBoard,
                              hoveredPlacement.x,
                              hoveredPlacement.y,
                              def.size,
                              gameState.shipOrientation
                            )
                          : false;

                      return (
                        <button
                          key={x}
                          disabled={!gameState.placementPhase}
                          onMouseEnter={() => setHoveredPlacement({ x, y })}
                          onMouseLeave={() => setHoveredPlacement(null)}
                          onClick={() => handlePlacementClick(x, y)}
                          className={`w-7 sm:w-8 h-7 sm:h-8 border border-cyan-900/30 flex items-center justify-center relative transition-all ${
                            isPlacementHover
                              ? isValid
                                ? 'bg-emerald-500/40 border-emerald-400 scale-105 z-20 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                                : 'bg-rose-500/40 border-rose-400 scale-105 z-20 shadow-[0_0_10px_rgba(244,63,94,0.8)]'
                              : 'hover:bg-cyan-500/10'
                          }`}
                        >
                          {/* DIRECT HIT EXPLOSIVE FIRE & SMOKE ON REAL BOAT */}
                          {cell === 'hit' && (
                            <div className="absolute inset-0 z-30 flex items-center justify-center animate-bounce">
                              <div className="relative flex items-center justify-center">
                                {/* Expanding Fire Glow Ring */}
                                <div className="w-5 h-5 rounded-full bg-red-600/90 shadow-[0_0_14px_rgba(239,68,68,1)] border border-yellow-400 animate-ping absolute" />
                                <div className="w-4 h-4 rounded-full bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.9)] flex items-center justify-center z-10 border border-amber-300">
                                  <Flame className="w-3 h-3 text-amber-200 fill-amber-300" />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* MISS: WHITE SPLASH RIPPLE */}
                          {cell === 'miss' && (
                            <div className="z-20 flex items-center justify-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] border border-cyan-200" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. CENTER TACTICAL TARGET HUD (Exact match to screenshot) */}
          {/* ========================================================================= */}
          <div className="xl:col-span-2 bg-[#081526]/90 border border-[#172e4d] rounded-xl p-3 flex flex-col items-center justify-between gap-3 shadow-inner h-full min-h-[340px]">
            <div className="text-center">
              <span className="text-xs font-black tracking-widest text-slate-300 uppercase">
                TARGET
              </span>
            </div>

            {/* Circular Radar Scope with Warship Silhouette in Crosshairs */}
            <div className="relative w-32 h-32 rounded-full bg-[#020b17] border-2 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center overflow-hidden">
              {/* Rotating Radar Sweep Line */}
              <div
                className="absolute inset-0 pointer-events-none rounded-full origin-center animate-spin"
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(56, 189, 248, 0.4) 360deg)',
                  animationDuration: '3s'
                }}
              />

              {/* Crosshairs Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full h-[1px] bg-cyan-400/40" />
                <div className="h-full w-[1px] bg-cyan-400/40 absolute" />
                <div className="w-20 h-20 rounded-full border border-cyan-400/30" />
                <div className="w-10 h-10 rounded-full border border-cyan-400/50" />
              </div>

              {/* Silhouette of targeted Warship in Crosshairs */}
              <div className="relative z-10 w-24 h-12 flex items-center justify-center opacity-80 filter drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]">
                <svg viewBox="0 0 100 30" className="w-full h-full" fill="none">
                  <path d="M10 16 L90 16 L82 23 L16 23 Z" fill="#38bdf8" />
                  <rect x="70" y="12" width="8" height="4" fill="#0284c7" />
                  <rect x="42" y="9" width="18" height="7" fill="#0284c7" />
                  <line x1="50" y1="9" x2="50" y2="4" stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="50" cy="3" r="1.5" fill="#38bdf8" />
                </svg>
              </div>
            </div>

            {/* Target Coordinate Feedback */}
            <div className="text-center font-mono text-[11px] font-bold">
              {selectedCoord ? (
                <span className="text-emerald-400 tracking-wider animate-pulse">
                  COORDINATE [{String.fromCharCode(65 + selectedCoord.y)}
                  {selectedCoord.x + 1}] LOCKED
                </span>
              ) : (
                <span className="text-slate-400 uppercase tracking-wider">
                  CHOOSE A COORDINATE
                </span>
              )}
            </div>

            {/* Legend: HIT, MISS, SUNK */}
            <div className="w-full bg-[#030914]/80 p-2 rounded-lg border border-slate-800 text-[10px] font-mono flex flex-col gap-1 text-slate-300">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_6px_rgba(239,68,68,1)]" />
                <span className="font-bold text-red-400">HIT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-white border border-slate-400" />
                <span className="font-bold text-slate-200">MISS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-black text-red-500 text-xs">✕</span>
                <span className="font-bold text-rose-400">SUNK</span>
              </div>
            </div>

            {/* END TURN / FIRE Button (Glowing Red) */}
            <button
              disabled={
                !selectedCoord ||
                gameState.currentTurn !== 'player' ||
                !!gameState.winner ||
                !!artilleryInFlight
              }
              onClick={handleFireSelectedTarget}
              className={`w-full py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                selectedCoord && gameState.currentTurn === 'player' && !artilleryInFlight
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.8)] scale-105 active:scale-95'
                  : 'bg-red-950/40 text-red-700 border border-red-900/30 cursor-not-allowed'
              }`}
            >
              {selectedCoord ? 'FIRE MISSILE 🎯' : 'END TURN'}
            </button>
          </div>

          {/* ========================================================================= */}
          {/* 4. ENEMY BOARD (TARGETING RADAR ARRAY WITH HIT EXPLOSIONS & SUNK MODELS) */}
          {/* ========================================================================= */}
          <div className="xl:col-span-3 flex flex-col items-center">
            <div
              ref={enemyBoardRef}
              className="relative p-2 rounded-xl bg-gradient-to-b from-[#0a233f] via-[#05172d] to-[#020e1e] border-2 border-[#193a61] shadow-2xl overflow-hidden"
              style={{
                backgroundImage: `
                  radial-gradient(ellipse at center, rgba(14, 165, 233, 0.15) 0%, rgba(2, 6, 23, 0.8) 80%),
                  linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
                `,
                backgroundSize: '100% 100%, 32px 32px, 32px 32px'
              }}
            >
              {/* Coordinates Header: 1 to 10 */}
              <div className="grid grid-cols-11 gap-0 mb-1 text-center font-mono text-[10px] text-cyan-300 font-bold">
                <div className="w-6 h-5" />
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="w-7 sm:w-8 h-5 flex items-center justify-center">
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* 10x10 Ocean Grid Container */}
              <div className="relative">
                {/* SUNKEN ENEMY WARSHIPS REVEALED AS REAL BOATS */}
                <div className="absolute inset-0 pointer-events-none z-10">
                  {gameState.enemyShips
                    .filter(s => s.sunk)
                    .map(ship => {
                      const minX = Math.min(...ship.positions.map(p => p.x));
                      const minY = Math.min(...ship.positions.map(p => p.y));
                      const isHoriz =
                        ship.positions.length > 1
                          ? ship.positions[0].y === ship.positions[1].y
                          : true;

                      return (
                        <div
                          key={ship.id}
                          className="absolute border border-red-500/60 rounded bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.7)]"
                          style={{
                            left: `calc(${minX} * (100% / 10))`,
                            top: `calc(${minY} * (100% / 10))`,
                            width: isHoriz ? `calc(${ship.size} * (100% / 10))` : `calc(100% / 10)`,
                            height: isHoriz ? `calc(100% / 10)` : `calc(${ship.size} * (100% / 10))`
                          }}
                        >
                          <RealisticWarship
                            type={ship.type}
                            orientation={isHoriz ? 'horizontal' : 'vertical'}
                            cellSize={32}
                            sunk={true}
                            hits={ship.hits}
                          />
                        </div>
                      );
                    })}
                </div>

                {/* 10x10 Enemy Coordinate Array */}
                {gameState.enemyBoard.map((row, y) => (
                  <div key={y} className="flex items-center">
                    {/* Row Label (A to J) */}
                    <div className="w-6 h-7 sm:h-8 flex items-center justify-center font-mono text-[10px] text-cyan-300 font-bold">
                      {String.fromCharCode(65 + y)}
                    </div>

                    {row.map((cell, x) => {
                      const isSelected = selectedCoord?.x === x && selectedCoord?.y === y;
                      const isHovered = hoveredTarget?.x === x && hoveredTarget?.y === y;
                      const hitShip = gameState.enemyShips.find(
                        s => s.positions.some(p => p.x === x && p.y === y) && s.sunk
                      );

                      return (
                        <button
                          key={x}
                          disabled={
                            gameState.placementPhase ||
                            gameState.currentTurn !== 'player' ||
                            cell !== 'empty' ||
                            !!gameState.winner
                          }
                          onMouseEnter={() => setHoveredTarget({ x, y })}
                          onMouseLeave={() => setHoveredTarget(null)}
                          onClick={() => handleSelectCoordinate(x, y)}
                          className={`w-7 sm:w-8 h-7 sm:h-8 border border-cyan-900/30 flex items-center justify-center relative transition-all ${
                            isSelected
                              ? 'bg-cyan-500/40 border-2 border-cyan-300 scale-105 z-30 shadow-[0_0_12px_rgba(6,182,212,0.9)]'
                              : isHovered && cell === 'empty'
                              ? 'bg-cyan-500/20 border-cyan-400 scale-105 z-20'
                              : 'hover:bg-cyan-500/10'
                          }`}
                        >
                          {/* Selected crosshair animation */}
                          {isSelected && (
                            <Crosshair className="w-5 h-5 text-cyan-200 animate-spin absolute" />
                          )}

                          {/* HIT EXPLOSION & TARGET MARKER */}
                          {cell === 'hit' && (
                            <div className="z-30 flex items-center justify-center">
                              {hitShip ? (
                                <div className="w-6 h-6 rounded flex items-center justify-center font-black text-xs text-red-500 shadow-[0_0_10px_rgba(239,68,68,1)] border border-red-500 bg-red-950/80">
                                  ✕
                                </div>
                              ) : (
                                <div className="w-4 h-4 rounded-full bg-red-600 shadow-[0_0_10px_rgba(239,68,68,1)] flex items-center justify-center border border-amber-300 animate-pulse">
                                  <Flame className="w-2.5 h-2.5 text-amber-200 fill-amber-300" />
                                </div>
                              )}
                            </div>
                          )}

                          {/* MISS WATER SPLASH */}
                          {cell === 'miss' && (
                            <div className="z-20 flex items-center justify-center">
                              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] border border-cyan-200" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. RIGHT SIDEBAR: GAME INFO & LIVE TACTICAL CHAT (Exact match to screenshot) */}
          {/* ========================================================================= */}
          <div className="xl:col-span-2 flex flex-col gap-3">
            {/* GAME INFO PANEL */}
            <div className="bg-[#081526]/90 border border-[#172e4d] rounded-xl p-3 flex flex-col gap-2 shadow-inner">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider border-b border-[#172e4d] pb-1">
                Game Info
              </span>

              <div className="flex flex-col gap-1 font-mono text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Turn:</span>
                  <span className="font-bold text-white">{turnCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Your Hits:</span>
                  <span className="font-bold text-cyan-400">{yourHits}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Enemy Hits:</span>
                  <span className="font-bold text-rose-400">{enemyHits}</span>
                </div>

                {/* Ships Sunk Status */}
                <div className="mt-1 pt-1 border-t border-slate-800 flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400 uppercase">Ships Sunk:</span>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-emerald-400">You: {enemyShipsSunk}/5</span>
                    <span className="text-rose-400">Enemy: {yourShipsSunk}/5</span>
                  </div>
                </div>

                {/* GAME TIMER (Exact match: 18:45 in digital green font) */}
                <div className="mt-2 text-center bg-[#020b17] border border-emerald-500/40 rounded-lg p-2 shadow-inner">
                  <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest block mb-0.5">
                    GAME TIMER
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-widest drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">
                    {formatTimer(timerSeconds)}
                  </span>
                </div>
              </div>
            </div>

            {/* GAME CHAT PANEL */}
            <div className="bg-[#081526]/90 border border-[#172e4d] rounded-xl p-3 flex flex-col justify-between shadow-inner h-[220px]">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider border-b border-[#172e4d] pb-1">
                Game Chat
              </span>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto my-2 space-y-1.5 pr-1 font-mono text-[11px]">
                {chatMessages.map(msg => (
                  <div key={msg.id} className="leading-tight">
                    <span className={`font-bold ${msg.senderColor}`}>{msg.sender}: </span>
                    <span className="text-slate-200">{msg.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Box with Send Button */}
              <form onSubmit={handleSendChat} className="flex items-center gap-1">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-[#020b17] border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM ACTION BAR (Exact match: LEAVE GAME, SURRENDER, EMOJI, CHAT, OPTIONS) */}
        {/* ========================================================================= */}
        <div className="w-full flex items-center justify-between pt-2 border-t border-[#172e4d]/80 relative z-10 flex-wrap gap-2">
          {/* Left Buttons: LEAVE GAME & SURRENDER */}
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToShelf}
              className="px-4 py-2 rounded-lg bg-red-800/90 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider shadow-md transition-all hover:scale-105 border border-red-600/50"
            >
              LEAVE GAME
            </button>
            <button
              onClick={() => {
                sound.playDefeat();
                setGameState(prev => ({ ...prev, winner: 'enemy' }));
              }}
              className="px-4 py-2 rounded-lg bg-[#0b1b2d] hover:bg-[#122842] text-slate-300 text-xs font-black uppercase tracking-wider border border-slate-700 transition-all"
            >
              SURRENDER
            </button>
          </div>

          {/* Right Buttons: EMOJI, CHAT, OPTIONS */}
          <div className="flex items-center gap-2 relative">
            {/* Emoji Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="px-3.5 py-2 rounded-lg bg-[#0b1b2d] hover:bg-[#122842] text-slate-300 text-xs font-black uppercase tracking-wider border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                <Smile className="w-3.5 h-3.5 text-amber-400" />
                EMOJI
              </button>

              {/* Quick Tactical Emoji Popup */}
              {showEmojiPicker && (
                <div className="absolute bottom-12 right-0 bg-[#081526] border border-[#172e4d] rounded-xl p-2 shadow-2xl flex items-center gap-2 z-50 animate-in fade-in">
                  {['🎯', '💥', '⚓', '🌊', '🔥', '🏆', '👀', ' salute '].map(em => (
                    <button
                      key={em}
                      onClick={() => handleSendEmoji(em)}
                      className="p-1.5 hover:bg-slate-700/60 rounded-lg text-base"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Focus button */}
            <button
              onClick={() => handleSendEmoji('Battlestations! ⚓')}
              className="px-3.5 py-2 rounded-lg bg-[#0b1b2d] hover:bg-[#122842] text-slate-300 text-xs font-black uppercase tracking-wider border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              CHAT
            </button>

            {/* Options Trigger */}
            <button
              onClick={() => setShowOptionsModal(true)}
              className="px-3.5 py-2 rounded-lg bg-[#0b1b2d] hover:bg-[#122842] text-slate-300 text-xs font-black uppercase tracking-wider border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              OPTIONS
            </button>
          </div>
        </div>
      </div>

      {/* OPTIONS MODAL */}
      {showOptionsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#081526] border border-[#172e4d] rounded-2xl p-6 max-w-sm w-full shadow-2xl text-slate-200 animate-in zoom-in-95">
            <h3 className="text-base font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-400" />
              Battlefield Options
            </h3>

            <div className="space-y-4 text-xs font-medium">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span>Sound & Audio Effects</span>
                <button
                  onClick={() => {
                    const next = !muted;
                    setMuted(next);
                    sound.setMuted(next);
                  }}
                  className={`p-2 rounded-lg border ${
                    muted
                      ? 'bg-rose-950/60 border-rose-700 text-rose-300'
                      : 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                  }`}
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span>AI Admiral Difficulty</span>
                <select
                  value={aiDifficulty}
                  onChange={e => setAiDifficulty(e.target.value as any)}
                  className="bg-[#020b17] text-cyan-300 border border-slate-700 rounded px-2 py-1 outline-none"
                >
                  <option value="easy">Novice (Easy)</option>
                  <option value="medium">Tactical (Medium)</option>
                  <option value="hard">Admiral (Hard)</option>
                </select>
              </div>

              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span>Naval Rules of Engagement</span>
                <button
                  onClick={() => {
                    setShowOptionsModal(false);
                    onOpenRules();
                  }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-cyan-300 border border-slate-700 flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  View Rules
                </button>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={handleRestart}
                className="flex-1 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase text-xs shadow-md"
              >
                Reset Match
              </button>
              <button
                onClick={() => setShowOptionsModal(false)}
                className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase text-xs border border-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER / VICTORY OVERLAY */}
      {gameState.winner && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#081526] border-2 border-[#172e4d] rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl animate-in zoom-in-95">
            <div
              className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl border-2 ${
                gameState.winner === 'player'
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.8)]'
                  : 'bg-rose-950/80 border-rose-400 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.8)]'
              }`}
            >
              {gameState.winner === 'player' ? '🏆' : '💀'}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
              {gameState.winner === 'player' ? 'NAVAL VICTORY!' : 'FLEET DESTROYED!'}
            </h2>
            <p className="text-xs text-slate-300 mt-2 font-mono">
              {gameState.winner === 'player'
                ? `You annihilated all 5 enemy vessels in ${turnCount} turns!`
                : 'The enemy admiral sunk your entire battle fleet.'}
            </p>

            <div className="grid grid-cols-2 gap-2 my-5 bg-[#020b17] p-3 rounded-xl border border-slate-800 text-xs font-mono">
              <div>
                <span className="text-slate-500 block">Your Hits</span>
                <span className="text-cyan-400 font-bold text-sm">{yourHits}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Enemy Hits</span>
                <span className="text-rose-400 font-bold text-sm">{enemyHits}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleRestart}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-red-900/50 transition-all hover:scale-105"
              >
                Play Rematch ⚔️
              </button>
              <button
                onClick={onBackToShelf}
                className="w-full py-2.5 rounded-xl bg-[#0b1b2d] hover:bg-[#122842] text-slate-300 font-bold uppercase tracking-wider text-xs border border-slate-700"
              >
                Return to Shelf
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
