import React, { useState, useEffect, useRef } from 'react';
import { GameMetadata, GameId, ShelfCustomArtConfig } from '../types';
import { sound } from '../utils/audio';
import { BoardGameSpineBox } from './BoardGameSpineBox';
import { GameHoverPopoutCard } from './GameHoverPopoutCard';
import { CustomShelfStudioModal } from './CustomShelfStudioModal';
import { ComingSoonSpineBox, ComingSoonBoxMeta } from './ComingSoonSpineBox';
import { ComingSoonModal } from './ComingSoonModal';
import {
  Sparkles,
  Users,
  Clock,
  Play,
  RotateCw,
  Terminal,
  Trophy,
  Library,
  Tv,
  Disc,
  Flame,
  Gamepad2,
  Anchor,
  HelpCircle,
  Palette,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Layers,
  Film,
  Radio,
  Sliders,
  Lamp
} from 'lucide-react';

interface RetroBookshelfMenuProps {
  games: GameMetadata[];
  onSelectGame: (game: GameMetadata) => void;
  onOpenBotConsole: () => void;
  onOpenRulesForGame: (game: GameMetadata) => void;
}

const DEFAULT_SHELF_CONFIG: ShelfCustomArtConfig = {
  theme: 'wood_1989',
  boxArtOverrides: {}
};

// ---------------------------------------------------------------------------
// SHELF DEFINITIONS (ROOM EXPANSION PACKS)
// ---------------------------------------------------------------------------
interface ShelfPack {
  id: 'pack1' | 'pack2' | 'pack3';
  packNumber: number;
  badge: string;
  name: string;
  roomAngleTitle: string;
  desc: string;
  themeClass: string;
  shelfBorder: string;
  shelfBeamBg: string;
  topBeamClass: string;
  bottomBeamClass: string;
  topItemLeft: { icon: string; name: string };
  topItemRight: { icon: string; name: string };
  bottomDeckTitle: string;
  bottomDeckSub: string;
  bottomCassettes: string[];
}

const SHELF_PACKS: ShelfPack[] = [
  {
    id: 'pack1',
    packNumber: 1,
    badge: '★ ACTIVE PLAYABLE PACK ★',
    name: 'PARTY PACK 01',
    roomAngleTitle: '1989 Vintage Bedroom Tabletop Shelf',
    desc: 'The complete classic 6-game board game collection unboxed in authentic retro oak',
    themeClass: 'bg-gradient-to-b from-[#18110b] via-[#100b07] to-[#080503] border-[#3d2716]',
    shelfBorder: 'border-[#2e1c10]',
    shelfBeamBg: 'bg-[#1a0f08]/95',
    topBeamClass: 'border-b-8 border-[#2e1c10] bg-[#1a0f08]/90',
    bottomBeamClass: 'border-t-8 border-[#2e1c10] bg-[#1a0f08]',
    topItemLeft: { icon: '🚗', name: 'Die-Cast DeLorean' },
    topItemRight: { icon: '🌍', name: 'STAR TREK VCR TAPE' },
    bottomDeckTitle: 'VCR CASSETTE DECK [REC ● 12:00]',
    bottomDeckSub: 'HI-FI STEREO AUTO-TRACKING',
    bottomCassettes: ['📼 BACK TO FUTURE', '📼 TOP GUN', '📼 GHOSTBUSTERS']
  },
  {
    id: 'pack2',
    packNumber: 2,
    badge: '🕹️ COMING SOON EXPANSION 🕹️',
    name: 'PARTY PACK 02',
    roomAngleTitle: '80s Neon Arcade Cabinet Shelf',
    desc: 'Upcoming synthwave arcade multi-pack, high-score pinball, and tabletop dungeon crawlers',
    themeClass: 'bg-gradient-to-b from-[#120726] via-[#090317] to-[#03010a] border-[#6b21a8]',
    shelfBorder: 'border-[#3b1261]',
    shelfBeamBg: 'bg-[#15072b]/95',
    topBeamClass: 'border-b-8 border-[#3b1261] bg-[#15072b]/90',
    bottomBeamClass: 'border-t-8 border-[#3b1261] bg-[#15072b]',
    topItemLeft: { icon: '🕹️', name: 'Sanwa Arcade Joystick' },
    topItemRight: { icon: '📻', name: '80s STEREO BOOMBOX' },
    bottomDeckTitle: 'ARCADE CRT CABINET [INSERT COIN 02]',
    bottomDeckSub: '60FPS DUAL JOYSTICK INTERFACE',
    bottomCassettes: ['💾 DOOM 1993', '💾 MONKEY ISLAND', '💾 PRINCE OF PERSIA']
  },
  {
    id: 'pack3',
    packNumber: 3,
    badge: '♟️ STRATEGY VAULT EXPANSION ♟️',
    name: 'PARTY PACK 03',
    roomAngleTitle: '70s Strategy Vault & Velvet Lounge Shelf',
    desc: 'Grand conquest strategy editions, classic mansion detective deduction, and military war games',
    themeClass: 'bg-gradient-to-b from-[#0a2318] via-[#05140e] to-[#020805] border-[#14532d]',
    shelfBorder: 'border-[#0e3b23]',
    shelfBeamBg: 'bg-[#0b271b]/95',
    topBeamClass: 'border-b-8 border-[#0e3b23] bg-[#0b271b]/90',
    bottomBeamClass: 'border-t-8 border-[#0e3b23] bg-[#0b271b]',
    topItemLeft: { icon: '🏆', name: 'Grandmaster Cup' },
    topItemRight: { icon: '💡', name: 'RETRO LAVA LAMP' },
    bottomDeckTitle: 'REEL-TO-REEL AUDIO DECK [HI-FI PLAY]',
    bottomDeckSub: 'STUDIO 2-TRACK MASTER TAPE',
    bottomCassettes: ['💽 THE GODFATHER', '💽 PINK FLOYD 1973', '💽 LED ZEPPELIN']
  }
];

// ---------------------------------------------------------------------------
// COMING SOON EXPANSION BOXES FOR PACK 2 & PACK 3
// ---------------------------------------------------------------------------
const PACK_2_BOXES: ComingSoonBoxMeta[] = [
  {
    id: 'p2_arcade',
    packId: 'pack2',
    brand: 'ARCADE',
    brandSub: 'MULTI',
    title: 'SPACE INVADERS & 80s PINBALL',
    subtitle: 'Authentic Multi-Table Physics, Tilt Sensors & Global High Scores',
    themeColor: 'bg-[#0f172a]',
    borderColor: 'border-cyan-500/50',
    accentGradient: 'from-[#0284c7] via-[#0f172a] to-[#3b0764]',
    badge: 'ARCADE CLASSIC',
    players: '1-4 Players',
    age: 'All Ages'
  },
  {
    id: 'p2_dungeon',
    packId: 'pack2',
    brand: 'HERO',
    brandSub: 'QUEST',
    title: 'DUNGEON CRAWLER: VAULT OF RUNES',
    subtitle: 'Co-Op Grid Tabletop RPG with Dice Rolling & Custom Minis',
    themeColor: 'bg-[#2e1065]',
    borderColor: 'border-purple-500/50',
    accentGradient: 'from-[#581c87] via-[#2e1065] to-[#1e1b4b]',
    badge: 'TACTICAL RPG',
    players: '1-4 Players',
    age: 'Ages 10+'
  },
  {
    id: 'p2_cyber_trivia',
    packId: 'pack2',
    brand: 'CYBER',
    brandSub: '2088',
    title: 'CYBER TRIVIA 2088 & SYNTH PARTY',
    subtitle: '80s Pop Culture, Synthwave, Sci-Fi Movies & Sound Quests',
    themeColor: 'bg-[#1e1b4b]',
    borderColor: 'border-pink-500/50',
    accentGradient: 'from-[#be185d] via-[#1e1b4b] to-[#0f172a]',
    badge: 'PARTY MULTIPLAYER',
    players: '1-10 Players',
    age: 'Party & Co-Op'
  },
  {
    id: 'p2_air_hockey',
    packId: 'pack2',
    brand: 'SPORTS',
    brandSub: 'DELUXE',
    title: 'RETRO AIR HOCKEY & TABLETOP FOOSBALL',
    subtitle: 'Fast-Paced 60FPS Elastic Physics & Discord Head-to-Head',
    themeColor: 'bg-[#082f49]',
    borderColor: 'border-blue-500/50',
    accentGradient: 'from-[#0369a1] via-[#082f49] to-[#0284c7]',
    badge: 'FAST ARCADE',
    players: '2 Players',
    age: 'All Ages'
  },
  {
    id: 'p2_mystery_5',
    packId: 'pack2',
    brand: 'VAULT',
    brandSub: 'SECRET',
    title: 'UNANNOUNCED EXPANSION TITLE #5',
    subtitle: 'Secret Tabletop Board Game in Active Engineering',
    themeColor: 'bg-[#18181b]',
    borderColor: 'border-slate-600',
    accentGradient: 'from-[#3f3f46] via-[#18181b] to-[#09090b]',
    badge: 'CLASSIFIED',
    players: '1-4 Players',
    age: 'Coming Soon'
  },
  {
    id: 'p2_grand_finale',
    packId: 'pack2',
    brand: 'PACK 02',
    brandSub: 'FINALE',
    title: 'EXPANSION PACK 02 GRAND FINALE',
    subtitle: 'Complete Cross-Platform Discord Activity Experience',
    themeColor: 'bg-[#311042]',
    borderColor: 'border-fuchsia-500/50',
    accentGradient: 'from-[#86198f] via-[#311042] to-[#1a0524]',
    badge: 'SPECIAL EDITION',
    players: 'Multiplayer',
    age: 'Party'
  }
];

const PACK_3_BOXES: ComingSoonBoxMeta[] = [
  {
    id: 'p3_risk',
    packId: 'pack3',
    brand: 'PARKER',
    brandSub: 'BROTHERS',
    title: 'RISK: GLOBAL CONQUEST DELUXE',
    subtitle: 'World Map Territory Warfare, Dice Armies & Seasonal Leagues',
    themeColor: 'bg-[#1c1917]',
    borderColor: 'border-amber-600/50',
    accentGradient: 'from-[#451a03] via-[#1c1917] to-[#14532d]',
    badge: 'WORLD CONQUEST',
    players: '2-6 Players',
    age: 'Ages 10+'
  },
  {
    id: 'p3_clue',
    packId: 'pack3',
    brand: 'DETECTIVE',
    brandSub: 'CLASSIC',
    title: 'CLUE: VINTAGE MANSION MYSTERY',
    subtitle: 'Suspect Cards, Murder Weapons, Secret Passages & AI Deduction',
    themeColor: 'bg-[#2e1065]',
    borderColor: 'border-amber-500/50',
    accentGradient: 'from-[#78350f] via-[#2e1065] to-[#1e1b4b]',
    badge: 'MANSION MYSTERY',
    players: '3-6 Players',
    age: 'Ages 8+'
  },
  {
    id: 'p3_stratego',
    packId: 'pack3',
    brand: 'MILITARY',
    brandSub: 'TACTICS',
    title: 'STRATEGO: RANK WARFARE 1982',
    subtitle: 'Hidden Rank Battlefield Tactics, Spy Assassinations & Bomb Flags',
    themeColor: 'bg-[#14532d]',
    borderColor: 'border-emerald-500/50',
    accentGradient: 'from-[#064e3b] via-[#14532d] to-[#0f172a]',
    badge: 'HIDDEN COMBAT',
    players: '2 Players',
    age: 'Ages 8+'
  },
  {
    id: 'p3_backgammon',
    packId: 'pack3',
    brand: 'ROYAL',
    brandSub: 'ANTIQUE',
    title: 'BACKGAMMON & MAH JONGG TOURNAMENT',
    subtitle: 'Ancient Strategic Checkers, Doubling Cube & Authentic Tile Sets',
    themeColor: 'bg-[#3b0f0f]',
    borderColor: 'border-amber-600/50',
    accentGradient: 'from-[#7f1d1d] via-[#3b0f0f] to-[#1c1917]',
    badge: 'ANCIENT CLASSIC',
    players: '2-4 Players',
    age: 'All Ages'
  },
  {
    id: 'p3_mystery_5',
    packId: 'pack3',
    brand: 'STRATEGY',
    brandSub: 'SECRET',
    title: 'CLASSIFIED STRATEGY TITLE #5',
    subtitle: 'Grandmaster Tactics Board Game in Active Development',
    themeColor: 'bg-[#18181b]',
    borderColor: 'border-slate-600',
    accentGradient: 'from-[#3f3f46] via-[#18181b] to-[#09090b]',
    badge: 'CLASSIFIED',
    players: '2-4 Players',
    age: 'Coming Soon'
  },
  {
    id: 'p3_grand_finale',
    packId: 'pack3',
    brand: 'PACK 03',
    brandSub: 'FINALE',
    title: 'STRATEGY VAULT 03 GRAND FINALE',
    subtitle: 'Seasonal Tournament Rankings & Trophy Leaderboards',
    themeColor: 'bg-[#0f291e]',
    borderColor: 'border-emerald-500/50',
    accentGradient: 'from-[#047857] via-[#0f291e] to-[#022c22]',
    badge: 'SEASON TROPHY',
    players: 'Competitive',
    age: 'Ranked'
  }
];

export const RetroBookshelfMenu: React.FC<RetroBookshelfMenuProps> = ({
  games,
  onSelectGame,
  onOpenBotConsole,
  onOpenRulesForGame
}) => {
  const [activePackIndex, setActivePackIndex] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  const [hoveredGameId, setHoveredGameId] = useState<string | null>(null);
  const [popoutGameId, setPopoutGameId] = useState<string | null>(null);
  const [showCustomArtStudio, setShowCustomArtStudio] = useState<boolean>(false);
  const [selectedComingSoonBox, setSelectedComingSoonBox] = useState<ComingSoonBoxMeta | null>(null);

  const [shelfConfig, setShelfConfig] = useState<ShelfCustomArtConfig>(() => {
    try {
      const saved = localStorage.getItem('retro_shelf_config');
      return saved ? JSON.parse(saved) : DEFAULT_SHELF_CONFIG;
    } catch {
      return DEFAULT_SHELF_CONFIG;
    }
  });

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const popoutLeaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentPack = SHELF_PACKS[activePackIndex];

  // 6 Playable Games for Pack 1
  const pack1StackGames = [
    { id: 'battleship', brand: 'MB', brandSub: 'GAMES', title: 'BATTLESHIP' },
    { id: 'connect4', brand: 'MB', brandSub: 'GAMES', title: 'CONNECT 4' },
    { id: 'trivia', brand: 'JACKBOX', brandSub: 'PARTY', title: 'TRIVIA PARTY & MURDER MYSTERY' },
    { id: 'poker', brand: 'ROYAL', brandSub: 'LOUNGE', title: "TEXAS HOLD'EM POKER" },
    { id: 'casino', brand: 'CASINO', brandSub: 'DELUXE', title: 'ROYAL CASINO & SLOTS' },
    { id: 'chess', brand: 'CLASSIC', brandSub: 'EDITION', title: 'CHESS & CHECKERS' }
  ];

  // Switch Room Shelf
  const handleSwitchShelf = (targetIndex: number) => {
    if (targetIndex === activePackIndex || isTransitioning) return;
    sound.playShelfSlide();
    setSlideDirection(targetIndex > activePackIndex ? 'right' : 'left');
    setIsTransitioning(true);
    setHoveredGameId(null);
    setPopoutGameId(null);

    setTimeout(() => {
      setActivePackIndex(targetIndex);
      setIsTransitioning(false);
    }, 280);
  };

  const handleNextShelf = () => {
    const nextIdx = (activePackIndex + 1) % SHELF_PACKS.length;
    handleSwitchShelf(nextIdx);
  };

  const handlePrevShelf = () => {
    const prevIdx = (activePackIndex - 1 + SHELF_PACKS.length) % SHELF_PACKS.length;
    handleSwitchShelf(prevIdx);
  };

  const handleMouseEnterBox = (gameId: string) => {
    if (popoutLeaveTimerRef.current) {
      clearTimeout(popoutLeaveTimerRef.current);
      popoutLeaveTimerRef.current = null;
    }

    setHoveredGameId(gameId);
    sound.playShelfSlide();

    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setPopoutGameId(gameId);
    }, 60);
  };

  const handleMouseLeaveBox = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

    popoutLeaveTimerRef.current = setTimeout(() => {
      setHoveredGameId(null);
      setPopoutGameId(null);
    }, 250);
  };

  const handlePopoutMouseEnter = () => {
    if (popoutLeaveTimerRef.current) {
      clearTimeout(popoutLeaveTimerRef.current);
      popoutLeaveTimerRef.current = null;
    }
  };

  const handlePopoutMouseLeave = () => {
    popoutLeaveTimerRef.current = setTimeout(() => {
      setHoveredGameId(null);
      setPopoutGameId(null);
    }, 200);
  };

  const handleSaveCustomShelfConfig = (updated: ShelfCustomArtConfig) => {
    setShelfConfig(updated);
    try {
      localStorage.setItem('retro_shelf_config', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-3 flex flex-col items-center select-none text-white font-sans relative">
      {/* Custom Shelf Studio Modal */}
      {showCustomArtStudio && (
        <CustomShelfStudioModal
          games={games}
          config={shelfConfig}
          onSaveConfig={handleSaveCustomShelfConfig}
          onClose={() => setShowCustomArtStudio(false)}
        />
      )}

      {/* Coming Soon Teaser Modal */}
      {selectedComingSoonBox && (
        <ComingSoonModal
          box={selectedComingSoonBox}
          onClose={() => setSelectedComingSoonBox(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* ROOM HEADER: SHELF PACK SELECTOR & ROOM ANGLE TABS                        */}
      {/* ========================================================================= */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-3 mb-4 bg-[#081526]/95 border border-[#172e4d] rounded-2xl p-3 sm:p-4 backdrop-blur shadow-2xl z-20">
        {/* Left: Pack Badge & Title */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {currentPack.badge}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Shelf {activePackIndex + 1} of {SHELF_PACKS.length}
              </span>
            </div>
            <h2 className="text-sm sm:text-base md:text-lg font-black tracking-wider text-white uppercase mt-0.5">
              {currentPack.name} • {currentPack.roomAngleTitle}
            </h2>
          </div>
        </div>

        {/* Right: Room Navigation Carousel Tabs + Customizer */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Room Shelf Navigation Tabs */}
          <div className="flex items-center gap-1 bg-[#040a14] p-1 rounded-xl border border-slate-800 shadow-inner">
            <button
              onClick={handlePrevShelf}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Previous Room Shelf"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {SHELF_PACKS.map((pack, idx) => (
              <button
                key={pack.id}
                onClick={() => handleSwitchShelf(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  activePackIndex === idx
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <span>{idx === 0 ? '📦' : idx === 1 ? '🕹️' : '♟️'}</span>
                <span className="hidden sm:inline">Shelf {idx + 1}</span>
              </button>
            ))}

            <button
              onClick={handleNextShelf}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Next Room Shelf"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Customize Shelf Studio Button */}
          <button
            onClick={() => {
              sound.playButtonClick();
              setShowCustomArtStudio(true);
            }}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-950/50 transition-all hover:scale-105 border border-amber-400/40 shrink-0"
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Customize</span> Studio
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROOM ATMOSPHERE & ANIMATED 3D PHYSICAL BOOKSHELF CONTAINER                */}
      {/* ========================================================================= */}
      <div
        className={`w-full relative rounded-3xl border-4 shadow-[0_30px_90px_rgba(0,0,0,0.95)] p-3 sm:p-6 md:p-8 overflow-visible transition-all duration-500 ${
          currentPack.themeClass
        }`}
      >
        {/* Room Ambient Lighting & Spotlights */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-10 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Vintage Bedroom Posters (Back to Future & Space Invaders) */}
        <div className="absolute top-4 left-6 hidden lg:flex items-center gap-4 opacity-40 pointer-events-none">
          <div className="w-20 h-28 rounded border border-amber-500/40 bg-amber-950/40 p-1 rotate-[-3deg] shadow-lg flex flex-col items-center justify-center text-center">
            <span className="text-[8px] font-black text-amber-300">BACK TO THE FUTURE</span>
            <span className="text-[6px] text-slate-400">OUTATIME 1985</span>
          </div>
          <div className="w-16 h-20 rounded border border-cyan-500/40 bg-cyan-950/40 p-1 rotate-[4deg] shadow-lg flex flex-col items-center justify-center text-center">
            <span className="text-[7px] font-black text-cyan-300">SPACE INVADERS</span>
            <span className="text-[6px] text-slate-400">ARCADE</span>
          </div>
        </div>

        {/* Room Right Wall Poster */}
        <div className="absolute top-6 right-6 hidden lg:flex flex-col items-center opacity-35 pointer-events-none">
          <div className="w-20 h-26 rounded border border-emerald-500/40 bg-emerald-950/40 p-1 rotate-[3deg] shadow-lg flex flex-col items-center justify-center text-center">
            <span className="text-[8px] font-black text-emerald-300">GHOSTBUSTERS</span>
            <span className="text-[6px] text-slate-400">WHO YA GONNA CALL</span>
          </div>
        </div>

        {/* Animated Room Shelf Main Content */}
        <div
          className={`relative z-10 flex flex-col items-center max-w-4xl mx-auto transition-all duration-300 ${
            isTransitioning
              ? slideDirection === 'right'
                ? 'opacity-0 translate-x-8 scale-98'
                : 'opacity-0 -translate-x-8 scale-98'
              : 'opacity-100 translate-x-0 scale-100'
          }`}
        >
          {/* Top Shelf Beam: Model Car / Radio, Globe / Lava Lamp */}
          <div className={`w-full flex items-end justify-between px-6 pb-2 rounded-t-2xl shadow-md ${currentPack.topBeamClass}`}>
            <div
              onClick={() => {
                sound.playButtonClick();
                setShowCustomArtStudio(true);
              }}
              className="flex items-center gap-3 cursor-pointer group"
              title="Click to customize shelf props"
            >
              <span className="text-2xl filter drop-shadow group-hover:rotate-12 transition-transform">
                {activePackIndex === 0
                  ? (shelfConfig.topItemLeft || currentPack.topItemLeft.icon).split(' ')[0]
                  : currentPack.topItemLeft.icon}
              </span>
              <span className="text-xs font-mono text-amber-300/80 group-hover:text-amber-200 font-bold uppercase tracking-widest hidden sm:inline">
                {activePackIndex === 0
                  ? (shelfConfig.topItemLeft || currentPack.topItemLeft.name).replace(/^[^\s]+\s*/, '') || currentPack.topItemLeft.name
                  : currentPack.topItemLeft.name}
              </span>
            </div>

            <div
              onClick={() => {
                sound.playButtonClick();
                setShowCustomArtStudio(true);
              }}
              className="flex items-center gap-3 cursor-pointer group"
              title="Click to customize shelf props"
            >
              <span className="text-2xl filter drop-shadow group-hover:scale-110 transition-transform">
                {activePackIndex === 0
                  ? (shelfConfig.topItemRight || currentPack.topItemRight.icon).split(' ')[0]
                  : currentPack.topItemRight.icon}
              </span>
              <div className="px-3 py-1 bg-[#120904] border border-[#3d2716] group-hover:border-amber-500/40 rounded text-[10px] font-mono text-amber-400/90 font-bold uppercase transition-colors">
                {activePackIndex === 0
                  ? (shelfConfig.topItemRight || currentPack.topItemRight.name).replace(/^[^\s]+\s*/, '') || currentPack.topItemRight.name
                  : currentPack.topItemRight.name}
              </div>
            </div>
          </div>

          {/* MAIN SHELF INTERIOR: Stack of Physical Board Game Boxes */}
          <div className={`w-full bg-[#100703] border-x-8 ${currentPack.shelfBorder} p-3 sm:p-5 flex flex-col gap-2 shadow-inner relative`}>
            {/* ------------------------------------------------------------- */}
            {/* SHELF 1: THE 6 ACTIVE PLAYABLE CLASSIC BOARD GAMES            */}
            {/* ------------------------------------------------------------- */}
            {activePackIndex === 0 &&
              pack1StackGames.map(stackItem => {
                const gameMeta = games.find(g => g.id === stackItem.id);
                if (!gameMeta) return null;

                const override = shelfConfig.boxArtOverrides[stackItem.id] || {};
                const isHovered = hoveredGameId === stackItem.id;
                const isPopoutActive = popoutGameId === stackItem.id;

                return (
                  <div
                    key={stackItem.id}
                    onMouseEnter={() => handleMouseEnterBox(stackItem.id)}
                    onMouseLeave={handleMouseLeaveBox}
                    className="relative"
                  >
                    {/* The Full-Wrap Realistic 3D Board Game Box Spine */}
                    <BoardGameSpineBox
                      game={gameMeta}
                      override={override}
                      isHovered={isHovered}
                      onUnbox={() => {
                        sound.playBoxOpen();
                        onSelectGame(gameMeta);
                      }}
                    />

                    {/* HOVER SCREEN POP-OUT CARD OVERLAY */}
                    {isPopoutActive && (
                      <div
                        onMouseEnter={handlePopoutMouseEnter}
                        onMouseLeave={handlePopoutMouseLeave}
                        className="absolute left-1/2 -translate-x-1/2 md:left-full md:translate-x-4 top-1/2 -translate-y-1/2 z-50 pointer-events-auto"
                      >
                        <GameHoverPopoutCard
                          game={gameMeta}
                          artOverride={override}
                          onPlay={() => {
                            sound.playBoxOpen();
                            onSelectGame(gameMeta);
                          }}
                          onOpenRules={() => onOpenRulesForGame(gameMeta)}
                          onOpenCustomArt={() => setShowCustomArtStudio(true)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

            {/* ------------------------------------------------------------- */}
            {/* SHELF 2: PARTY PACK 02 (80s ARCADE EXPANSION) COMING SOON     */}
            {/* ------------------------------------------------------------- */}
            {activePackIndex === 1 && (
              <>
                <div className="px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-center mb-1">
                  <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-widest flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    PARTY PACK 02 • IN ACTIVE DEVELOPMENT • CLICK TO PREVIEW
                  </span>
                </div>
                {PACK_2_BOXES.map(box => (
                  <ComingSoonSpineBox
                    key={box.id}
                    box={box}
                    onClick={() => setSelectedComingSoonBox(box)}
                  />
                ))}
              </>
            )}

            {/* ------------------------------------------------------------- */}
            {/* SHELF 3: PARTY PACK 03 (70s STRATEGY VAULT) COMING SOON       */}
            {/* ------------------------------------------------------------- */}
            {activePackIndex === 2 && (
              <>
                <div className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-center mb-1">
                  <span className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-widest flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    PARTY PACK 03 • STRATEGY VAULT • CLICK TO PREVIEW
                  </span>
                </div>
                {PACK_3_BOXES.map(box => (
                  <ComingSoonSpineBox
                    key={box.id}
                    box={box}
                    onClick={() => setSelectedComingSoonBox(box)}
                  />
                ))}
              </>
            )}
          </div>

          {/* Bottom Shelf Beam: VCR / CRT / Reel-to-Reel Cassette Deck */}
          <div className={`w-full rounded-b-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl ${currentPack.bottomBeamClass}`}>
            <div
              onClick={() => {
                sound.playButtonClick();
                setShowCustomArtStudio(true);
              }}
              className="flex items-center gap-3 bg-[#0a0603] border border-[#2e1c10] hover:border-amber-500/40 rounded-lg px-4 py-2 shadow-inner cursor-pointer transition-colors"
              title="Click to customize shelf decor"
            >
              <Tv className="w-5 h-5 text-amber-500/80" />
              <div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold block leading-none">
                  {currentPack.bottomDeckTitle}
                </span>
                <span className="text-[9px] font-mono text-slate-500">{currentPack.bottomDeckSub}</span>
              </div>
            </div>

            {/* Stacked Media Tapes / Floppies / Vinyls */}
            <div
              onClick={() => {
                sound.playButtonClick();
                setShowCustomArtStudio(true);
              }}
              className="flex items-center gap-1.5 font-mono text-[9px] text-amber-300/80 font-bold overflow-x-auto cursor-pointer"
              title="Click to customize cassette library"
            >
              {(activePackIndex === 0 && shelfConfig.vhsTapes
                ? shelfConfig.vhsTapes
                : currentPack.bottomCassettes
              ).map((media, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-[#100b07] border border-[#3d2716] hover:border-amber-500/50 hover:text-amber-200 rounded transition-colors whitespace-nowrap"
                >
                  {media}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sleek Bot Terminal Banner */}
      <div className="w-full bg-[#081526]/95 border border-[#172e4d] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl mt-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-lg font-mono font-bold shadow-inner">
            /
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Discord Slash Commands Active
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Execute <span className="font-mono text-cyan-400 font-semibold">/battleship</span>,{' '}
              <span className="font-mono text-purple-400 font-semibold">/trivia</span>,{' '}
              <span className="font-mono text-amber-400 font-semibold">/poker</span>,{' '}
              <span className="font-mono text-emerald-400 font-semibold">/casino</span>, or{' '}
              <span className="font-mono text-blue-400 font-semibold">/connect4</span>.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenBotConsole}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider text-xs flex items-center gap-2 shadow-lg shadow-blue-900/40 transition-all hover:scale-105"
        >
          <Terminal className="w-4 h-4" />
          Open Terminal
        </button>
      </div>
    </div>
  );
};
