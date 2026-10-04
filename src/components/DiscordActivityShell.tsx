import React, { useState, useEffect } from 'react';
import { DiscordUser } from '../types';
import { MOCK_DISCORD_USERS } from '../utils/gameData';
import { sound } from '../utils/audio';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Share2,
  Maximize2,
  Minimize2,
  Terminal,
  Grid,
  Sparkles,
  Users,
  Copy,
  Check,
  Activity,
  Cpu,
  Home
} from 'lucide-react';

interface DiscordActivityShellProps {
  children: React.ReactNode;
  activeGameTitle?: string;
  onOpenShelf: () => void;
  onToggleBotConsole: () => void;
  isBotConsoleOpen: boolean;
}

export const DiscordActivityShell: React.FC<DiscordActivityShellProps> = ({
  children,
  activeGameTitle,
  onOpenShelf,
  onToggleBotConsole,
  isBotConsoleOpen
}) => {
  const [users, setUsers] = useState<DiscordUser[]>(MOCK_DISCORD_USERS);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [copiedInvite, setCopiedInvite] = useState<boolean>(false);
  const [turnTimerSeconds, setTurnTimerSeconds] = useState<number>(42);

  useEffect(() => {
    const interval = setInterval(() => {
      setTurnTimerSeconds(prev => (prev > 0 ? prev - 1 : 45));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleMute = () => {
    sound.playButtonClick();
    setIsMuted(!isMuted);
    setUsers(prev =>
      prev.map((u, i) => (i === 0 ? { ...u, isSpeaking: isMuted ? true : false } : u))
    );
  };

  const toggleSound = () => {
    sound.playButtonClick();
    const nextDeaf = !isDeafened;
    setIsDeafened(nextDeaf);
    sound.setMuted(nextDeaf);
  };

  const handleCopyInvite = () => {
    sound.playButtonClick();
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const toggleFullscreenMode = () => {
    sound.playButtonClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-[#f8fafc] flex flex-col font-sans select-none overflow-x-hidden">
      {/* Sleek Header */}
      <header className="h-16 bg-slate-900/95 border-b border-slate-800 px-4 sm:px-8 flex items-center justify-between z-30 shrink-0 shadow-lg backdrop-blur">
        {/* Left: App & Game Info */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onOpenShelf}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl px-3 py-2 font-bold text-white shadow-md shadow-blue-900/40 cursor-pointer transition-all hover:scale-105 active:scale-95 border border-blue-400/40"
            title="Return to Home Shelf"
          >
            <Home className="w-4 h-4 text-white" />
            <span className="text-xs font-black uppercase tracking-wider">Home</span>
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-bold leading-tight tracking-wide text-white flex items-center gap-2">
              PARTY PACK 01
              {activeGameTitle && (
                <span className="text-[10px] font-mono font-normal uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60">
                  {activeGameTitle}
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Discord Board Game Collection</p>
          </div>

          <button
            onClick={onOpenShelf}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 ml-2"
          >
            <Grid className="w-3.5 h-3.5 text-blue-400" />
            <span>Shelf</span>
          </button>
        </div>

        {/* Center: Turn Timer & Voice Room */}
        <div className="hidden md:flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Turn Timer</p>
            <p className="font-mono text-blue-400 font-bold text-sm tracking-wider">{formatTimer(turnTimerSeconds)}</p>
          </div>

          <div className="h-8 w-px bg-slate-800"></div>

          {/* User Avatars */}
          <div className="flex items-center -space-x-2">
            {users.map((user, idx) => (
              <div
                key={user.id}
                title={`${user.name} ${user.isSpeaking ? '(Speaking)' : ''}`}
                className={`relative w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white transition-all ${
                  idx === 0
                    ? 'bg-blue-600'
                    : idx === 1
                    ? 'bg-amber-600'
                    : idx === 2
                    ? 'bg-emerald-600'
                    : 'bg-purple-600'
                } ${user.isSpeaking ? 'ring-2 ring-emerald-400' : ''}`}
              >
                {user.avatar}
                {user.isSpeaking && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-slate-900 animate-pulse" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Discord Quick Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-blue-900/40 transition-all hover:scale-105 active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </button>

          <button
            onClick={toggleMute}
            className={`p-2 rounded-xl border text-xs transition-all ${
              isMuted
                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl border text-xs transition-all ${
              isDeafened
                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title={isDeafened ? 'Enable Sound FX' : 'Mute Sound FX'}
          >
            {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
          </button>

          <button
            onClick={onToggleBotConsole}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              isBotConsoleOpen
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/40'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="Open Discord Bot Slash Command Console"
          >
            <Terminal className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Bot</span>
          </button>

          <button
            onClick={toggleFullscreenMode}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-all hidden sm:block"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Game Stage with Sleek Radial Slate Backdrop */}
      <main className="flex-1 flex flex-col justify-start items-center relative overflow-y-auto game-table-bg">
        {children}
      </main>

      {/* Sleek Technical Status Footer */}
      <footer className="h-10 bg-slate-900 border-t border-slate-800 flex items-center px-4 sm:px-8 justify-between text-[10px] text-slate-400 shrink-0 select-none">
        <div className="flex items-center gap-3 sm:gap-6">
          <span className="uppercase tracking-[2px] font-bold text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-blue-400" />
            Engine: Phaser 4 (Simulated)
          </span>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <span className="uppercase tracking-[2px] text-slate-400 font-mono hidden sm:inline flex items-center gap-1">
            <Activity className="w-3 h-3 text-emerald-400" />
            Latency: 24ms
          </span>
          <span className="text-slate-700 hidden sm:inline">|</span>
          <span className="uppercase tracking-[2px] text-slate-400 hidden md:inline">
            Status: Synchronized
          </span>
        </div>
        <div className="font-bold text-slate-400 tracking-wider">
          CONNECTED AS <span className="text-blue-400 font-mono">@CAPTAIN_X</span>
        </div>
      </footer>

      {/* Invite Friends Modal with Sleek Styling */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="sleek-card border-slate-700/80 rounded-2xl p-6 max-w-md w-full text-white shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-wide">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Invite Friends to Session
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Share this Activity link with your voice channel or direct message friends to join your table:
            </p>

            <div className="mt-4 flex items-center gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-slate-700">
              <span className="text-xs font-mono text-blue-300 truncate flex-1">
                https://discord.gg/activities/mini-games?room=tabletop-9982
              </span>
              <button
                onClick={handleCopyInvite}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all shadow-md shadow-blue-900/40"
              >
                {copiedInvite ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedInvite ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <button
              onClick={() => setShowInviteModal(false)}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase tracking-wider transition-colors border border-slate-700 text-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

