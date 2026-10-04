import React, { useState, useEffect } from 'react';
import { GameId, GameMetadata } from '../types';
import { sound } from '../utils/audio';
import {
  MessageSquare,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronLeft,
  Terminal,
  Sparkles,
  Bot,
  Send,
  HelpCircle,
  Coins,
  Radio,
  Share2,
  Hash,
  Smile,
  Gift
} from 'lucide-react';

interface DiscordEmbedCanvasProps {
  activeGame: GameMetadata | null;
  isOpen: boolean;
  onToggle: () => void;
  onLaunchGame: (id: GameId) => void;
  // Optional active game state payloads to render live embed
  gameStateSummary?: {
    title: string;
    description: string;
    fields: { name: string; value: string; inline?: boolean }[];
    color: string;
    boardAscii?: string;
  };
  onEmbedAction?: (actionType: string, payload?: unknown) => void;
}

export const DiscordEmbedCanvas: React.FC<DiscordEmbedCanvasProps> = ({
  activeGame,
  isOpen,
  onToggle,
  onLaunchGame,
  gameStateSummary,
  onEmbedAction
}) => {
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLog, setChatLog] = useState<
    { id: string; sender: string; avatar: string; isBot?: boolean; text: string; time: string }[]
  >([
    {
      id: 'c1',
      sender: 'TabletopBot',
      avatar: '🤖',
      isBot: true,
      text: 'Discord Interactive Embed Canvas initialized. You can play directly using the Discord action rows below!',
      time: 'Today at 8:12 PM'
    }
  ]);

  // Quick simulated bot logs when game state changes
  useEffect(() => {
    if (activeGame) {
      sound.playDiscordPing();
      setChatLog(prev => [
        ...prev,
        {
          id: `log_${Date.now()}`,
          sender: 'TabletopBot',
          avatar: '🤖',
          isBot: true,
          text: `Loaded **${activeGame.title}** Discord Embed Canvas. Use the interactive buttons below to make your moves!`,
          time: 'Just now'
        }
      ]);
    }
  }, [activeGame?.id]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sound.playButtonClick();
    const txt = chatInput.trim();
    const userMsg = {
      id: `u_${Date.now()}`,
      sender: 'You',
      avatar: '🎮',
      text: txt,
      time: 'Just now'
    };
    setChatLog(prev => [...prev, userMsg]);
    setChatInput('');

    // Handle bot slash commands inside embed
    if (txt.startsWith('/')) {
      setTimeout(() => {
        sound.playDiscordPing();
        const cmd = txt.toLowerCase();
        if (cmd.includes('poker')) onLaunchGame('poker');
        else if (cmd.includes('casino') || cmd.includes('slots')) onLaunchGame('casino');
        else if (cmd.includes('battle')) onLaunchGame('battleship');
        else if (cmd.includes('connect')) onLaunchGame('connect4');
        else if (cmd.includes('chess')) onLaunchGame('chess');
        else if (cmd.includes('checkers')) onLaunchGame('checkers');
        else if (cmd.includes('blackjack')) onLaunchGame('blackjack');
        else if (cmd.includes('gofish')) onLaunchGame('gofish');
        else if (cmd.includes('sorry')) onLaunchGame('pawnrush');
        else if (cmd.includes('liar')) onLaunchGame('liarsdice');

        setChatLog(prev => [
          ...prev,
          {
            id: `b_${Date.now()}`,
            sender: 'TabletopBot',
            avatar: '🤖',
            isBot: true,
            text: `Executed slash command: \`${txt}\`! Updating active canvas...`,
            time: 'Just now'
          }
        ]);
      }, 400);
    }
  };

  const channelName = activeGame
    ? activeGame.id === 'trivia'
      ? '🎙️・trivia-party'
      : activeGame.id === 'poker'
      ? '♠️・poker-room'
      : activeGame.id === 'casino'
      ? '🎰・casino-lounge'
      : activeGame.id === 'battleship'
      ? '⚓・battleship'
      : activeGame.id === 'connect4'
      ? '🔴・connect-four'
      : activeGame.id === 'chess'
      ? '♟️・staunton-chess'
      : activeGame.id === 'blackjack'
      ? '🃏・blackjack-21'
      : `🎲・${activeGame.id}`
    : '🎲・tabletop-lobby';

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          sound.playButtonClick();
          onToggle();
        }}
        className="fixed bottom-14 right-4 z-40 px-3.5 py-2.5 rounded-2xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-white/20 transition-all hover:scale-105"
        title="Open Discord Embed Canvas Sidepanel"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <Hash className="w-4 h-4" />
        <span>Discord Embed Canvas</span>
      </button>
    );
  }

  return (
    <aside
      className={`fixed ${
        isFullscreenMode
          ? 'inset-0 z-50'
          : 'top-16 bottom-10 right-0 w-full sm:w-[460px] z-40'
      } bg-[#313338] text-[#dbdee1] flex flex-col border-l border-[#202225] shadow-2xl transition-all duration-300 font-sans select-none`}
    >
      {/* Discord Header Bar */}
      <div className="h-14 bg-[#2b2d31] border-b border-[#202225] px-4 flex items-center justify-between shrink-0 shadow">
        <div className="flex items-center gap-2 truncate">
          <Hash className="w-5 h-5 text-[#949ba4] shrink-0" />
          <span className="font-bold text-white text-sm truncate">{channelName}</span>
          <span className="text-[10px] bg-[#5865F2]/20 text-[#5865F2] font-bold px-2 py-0.5 rounded uppercase border border-[#5865F2]/30">
            EMBED CANVAS
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              sound.playButtonClick();
              setIsFullscreenMode(!isFullscreenMode);
            }}
            className="p-1.5 rounded-lg hover:bg-[#35373c] text-[#b5bac1] hover:text-white transition-colors"
            title={isFullscreenMode ? 'Exit Full Canvas' : 'Expand Canvas Mode'}
          >
            {isFullscreenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              sound.playButtonClick();
              onToggle();
            }}
            className="p-1.5 rounded-lg hover:bg-[#35373c] text-[#b5bac1] hover:text-white transition-colors text-xs font-bold"
            title="Close Sidepanel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Embed & Chat Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
        {/* Discord Chat Messages Log */}
        {chatLog.map(msg => (
          <div key={msg.id} className="flex gap-3 items-start group">
            <div className="w-9 h-9 rounded-full bg-[#5865F2]/30 border border-[#5865F2]/40 flex items-center justify-center text-lg shrink-0">
              {msg.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-xs">{msg.sender}</span>
                {msg.isBot && (
                  <span className="bg-[#5865F2] text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider">
                    APP
                  </span>
                )}
                <span className="text-[10px] text-[#949ba4]">{msg.time}</span>
              </div>
              <p className="text-[#dbdee1] text-xs mt-0.5 leading-relaxed break-words">{msg.text}</p>
            </div>
          </div>
        ))}

        {/* ---------------------------------------------------- */}
        {/* INTERACTIVE DISCORD RICH EMBED (Live Game Canvas) */}
        {/* ---------------------------------------------------- */}
        <div className="mt-4 p-4 rounded-xl bg-[#2b2d31] border border-[#1e1f22] border-l-4 border-l-[#5865F2] shadow-xl text-xs space-y-3">
          {/* Embed Author */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-[#5865F2] flex items-center justify-center text-[10px] text-white font-bold">
              🎮
            </div>
            <span className="font-bold text-white text-xs">
              {activeGame ? activeGame.title : 'Tabletop Game Lounge'}
            </span>
          </div>

          {/* Embed Title & Description */}
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              {activeGame?.id === 'trivia' && '🎙️ Jackbox Trivia Party & Murder Mystery'}
              {activeGame?.id === 'poker' && '♠️ Texas Hold’em Live Embed Room'}
              {activeGame?.id === 'casino' && '🎰 Royal Casino & Slots Lounge'}
              {activeGame?.id === 'battleship' && '⚓ Naval Strike: Dual Radar Target Array'}
              {activeGame?.id === 'connect4' && '🔴 Connect Four: 7x6 Gravity Grid'}
              {activeGame?.id === 'chess' && '♟️ Staunton Tournament Chess'}
              {activeGame?.id === 'checkers' && '🔴 Classic Draughts / Checkers'}
              {activeGame?.id === 'blackjack' && '🃏 Blackjack (21) Green Felt'}
              {activeGame?.id === 'gofish' && '🎣 Go Fish Lake Pond'}
              {activeGame?.id === 'pawnrush' && '🎲 4-Player Revenge Race (Sorry)'}
              {activeGame?.id === 'liarsdice' && "🏴‍☠️ Pirate's Liar's Dice (Perudo)"}
              {!activeGame && '🎮 Pick a Board Game to Play via Embed'}
            </h4>
            <p className="text-[11px] text-[#949ba4] mt-1">
              {activeGame?.description ||
                'Select any classic board game or mini casino room below to interact with real Discord Action Rows!'}
            </p>
          </div>

          {/* Custom Embed Fields */}
          <div className="grid grid-cols-2 gap-2 bg-[#1e1f22] p-2.5 rounded-lg border border-[#2b2d31] text-[11px]">
            <div>
              <span className="text-[#949ba4] font-bold block uppercase text-[10px]">Session Status</span>
              <span className="text-emerald-400 font-bold font-mono">🟢 ACTIVE STREAM</span>
            </div>
            <div>
              <span className="text-[#949ba4] font-bold block uppercase text-[10px]">Game Mode</span>
              <span className="text-white font-medium">Turn-Based Canvas</span>
            </div>
          </div>

          {/* ---------------------------------------------------- */}
          {/* DISCORD ACTION ROW BUTTONS (Specific to Active Game) */}
          {/* ---------------------------------------------------- */}
          <div className="space-y-2 pt-2 border-t border-[#35373c]">
            <span className="text-[10px] uppercase font-bold text-[#949ba4] tracking-wider block">
              Discord Action Rows:
            </span>

            {/* If Poker is active */}
            {activeGame?.id === 'poker' && (
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    onClick={() => {
                      sound.playPokerChipsBet();
                      onEmbedAction?.('poker_check_call');
                    }}
                    className="discord-btn discord-btn-primary py-2 px-2 text-[11px]"
                  >
                    Check / Call
                  </button>
                  <button
                    onClick={() => {
                      sound.playButtonClick();
                      onEmbedAction?.('poker_fold');
                    }}
                    className="discord-btn discord-btn-danger py-2 px-2 text-[11px]"
                  >
                    Fold
                  </button>
                  <button
                    onClick={() => {
                      sound.playPokerChipsBet();
                      onEmbedAction?.('poker_raise');
                    }}
                    className="discord-btn discord-btn-secondary py-2 px-2 text-[11px]"
                  >
                    Raise +$40
                  </button>
                  <button
                    onClick={() => {
                      sound.playVictoryFanfare();
                      onEmbedAction?.('poker_allin');
                    }}
                    className="discord-btn discord-btn-success py-2 px-2 text-[11px]"
                  >
                    All In! 💥
                  </button>
                </div>
              </div>
            )}

            {/* If Casino is active */}
            {activeGame?.id === 'casino' && (
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => {
                    sound.playSlotSpin();
                    onEmbedAction?.('casino_spin_slots');
                  }}
                  className="discord-btn discord-btn-success py-2 text-[11px]"
                >
                  Spin Slots 🎰
                </button>
                <button
                  onClick={() => {
                    sound.playRouletteSpin();
                    onEmbedAction?.('casino_spin_roulette');
                  }}
                  className="discord-btn discord-btn-primary py-2 text-[11px]"
                >
                  Spin Wheel 🎡
                </button>
                <button
                  onClick={() => {
                    sound.playVictoryFanfare();
                    onEmbedAction?.('casino_claim_faucet');
                  }}
                  className="discord-btn discord-btn-secondary py-2 text-[11px]"
                >
                  +1k Faucet 💰
                </button>
              </div>
            )}

            {/* If Connect 4 is active */}
            {activeGame?.id === 'connect4' && (
              <div className="grid grid-cols-7 gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map(col => (
                  <button
                    key={col}
                    onClick={() => {
                      sound.playDiscDrop();
                      onEmbedAction?.('connect4_drop', col - 1);
                    }}
                    className="discord-btn discord-btn-primary py-2 text-xs font-bold"
                  >
                    {col}
                  </button>
                ))}
              </div>
            )}

            {/* If Battleship is active */}
            {activeGame?.id === 'battleship' && (
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => {
                    sound.playArtilleryWhistle();
                    onEmbedAction?.('battleship_fire_random');
                  }}
                  className="discord-btn discord-btn-danger py-2 text-[11px] col-span-2"
                >
                  🚀 Fire Artillery Strike
                </button>
                <button
                  onClick={() => {
                    sound.playRadarPing();
                    onEmbedAction?.('battleship_radar_scan');
                  }}
                  className="discord-btn discord-btn-secondary py-2 text-[11px]"
                >
                  Radar Scan
                </button>
              </div>
            )}

            {/* Universal Game Switcher Chips */}
            <div className="pt-2 border-t border-[#35373c]">
              <span className="text-[10px] uppercase font-bold text-[#949ba4] block mb-1.5">
                Launch Embed Canvas for:
              </span>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: 'trivia', label: '🎙️ Trivia Party' },
                    { id: 'poker', label: '♠️ Poker' },
                    { id: 'casino', label: '🎰 Casino' },
                    { id: 'battleship', label: '⚓ Battleship' },
                    { id: 'connect4', label: '🔴 Connect 4' },
                    { id: 'chess', label: '♟️ Chess' },
                    { id: 'checkers', label: '🔴 Checkers' },
                    { id: 'blackjack', label: '🃏 Blackjack' },
                    { id: 'gofish', label: '🎣 Go Fish' },
                    { id: 'pawnrush', label: '🎲 Sorry' },
                    { id: 'liarsdice', label: '🏴‍☠️ Liar\'s Dice' }
                  ] as const
                ).map(g => (
                  <button
                    key={g.id}
                    onClick={() => {
                      sound.playButtonClick();
                      onLaunchGame(g.id);
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                      activeGame?.id === g.id
                        ? 'bg-[#5865F2] text-white'
                        : 'bg-[#1e1f22] text-[#949ba4] hover:text-white hover:bg-[#35373c]'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discord Message Input Bar */}
      <div className="p-3 bg-[#2b2d31] border-t border-[#202225] shrink-0">
        <div className="flex items-center bg-[#383a40] rounded-lg px-3 py-2">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendChat()}
            placeholder={`Message ${channelName} or type /poker, /casino...`}
            className="flex-1 bg-transparent text-white text-xs outline-none placeholder:text-[#949ba4] font-sans"
          />
          <button
            onClick={handleSendChat}
            className="p-1 rounded text-[#949ba4] hover:text-[#5865F2] transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
