import React, { useState, useEffect } from 'react';
import { HostCharacter, HostExpression } from '../../types/trivia';

interface AnimatedHostProps {
  host: HostCharacter;
  expression?: HostExpression;
  quipText?: string;
  isSpeaking?: boolean;
  compact?: boolean;
}

export const AnimatedHost: React.FC<AnimatedHostProps> = ({
  host,
  expression = 'happy',
  quipText,
  isSpeaking = false,
  compact = false
}) => {
  const [mouthOpen, setMouthOpen] = useState<boolean>(false);
  const [eyeBlink, setEyeBlink] = useState<boolean>(false);

  // Talking mouth animation loop
  useEffect(() => {
    if (!isSpeaking) {
      setMouthOpen(false);
      return;
    }
    const interval = setInterval(() => {
      setMouthOpen(prev => !prev);
    }, 140);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  // Periodic blinking loop
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyeBlink(true);
      setTimeout(() => setEyeBlink(false), 160);
    }, 3500 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div className={`relative flex items-center ${compact ? 'gap-2' : 'flex-col sm:flex-row gap-4'} select-none`}>
      {/* Host Stage Spotlight & Avatar Character Box */}
      <div className="relative group">
        {/* Ambient Glow */}
        <div
          className={`absolute -inset-2 rounded-3xl bg-gradient-to-r ${host.themeColor} opacity-50 blur-lg group-hover:opacity-80 transition duration-500 animate-pulse`}
        />

        {/* Character Stage Pod */}
        <div
          className={`relative ${
            compact ? 'w-14 h-14' : 'w-24 h-24 sm:w-28 sm:h-28'
          } rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 ${
            host.accentGlow
          } p-2 shadow-2xl flex flex-col items-center justify-center overflow-hidden`}
        >
          {/* Animated Puppet Vector Graphic */}
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Host Specific Vector Puppets */}
            {host.id === 'mortimer' ? (
              // Lord Mortimer: Victorian Ghost
              <div className="relative flex flex-col items-center transform transition-transform duration-300">
                {/* Top Hat */}
                <div className="w-8 h-4 bg-slate-950 border border-purple-400/50 rounded-t-sm relative -mb-1 shadow">
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-rose-600" />
                  <div className="w-12 h-1 bg-slate-900 border border-purple-400/40 -ml-2 rounded-full" />
                </div>
                {/* Ghost Face */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-b from-slate-200 to-purple-300 border-2 border-purple-900 shadow-inner flex flex-col items-center justify-center relative">
                  {/* Eyes */}
                  <div className="flex gap-2.5 -mt-1">
                    <div
                      className={`w-2.5 h-3 bg-rose-950 rounded-full transition-all ${
                        eyeBlink ? 'h-0.5 mt-1.5' : ''
                      } ${expression === 'spooky' ? 'shadow-[0_0_8px_#f43f5e]' : ''}`}
                    />
                    <div
                      className={`w-2.5 h-3 bg-rose-950 rounded-full transition-all ${
                        eyeBlink ? 'h-0.5 mt-1.5' : ''
                      } ${expression === 'spooky' ? 'shadow-[0_0_8px_#f43f5e]' : ''}`}
                    />
                  </div>
                  {/* Mouth */}
                  <div
                    className={`mt-1 bg-purple-950 transition-all rounded-full ${
                      mouthOpen ? 'w-4 h-3 bg-rose-900 border border-black' : 'w-3 h-1'
                    }`}
                  />
                </div>
              </div>
            ) : host.id === 'pixel8' ? (
              // Pixel-8: Hologram Arcade AI
              <div className="relative flex flex-col items-center">
                <div className="w-14 h-12 bg-slate-900 border-2 border-cyan-400 rounded-lg shadow-[0_0_12px_#06b6d4] flex flex-col items-center justify-center p-1 font-mono text-cyan-300 text-xs">
                  <div className="flex gap-2 font-black text-sm">
                    <span>{eyeBlink ? '--' : '■'}</span>
                    <span>{eyeBlink ? '--' : '■'}</span>
                  </div>
                  <div
                    className={`transition-all text-cyan-400 font-bold ${
                      mouthOpen ? 'text-sm' : 'text-xs'
                    }`}
                  >
                    {mouthOpen ? '▲▼▲' : '═══'}
                  </div>
                </div>
                {/* CRT Scanline */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent pointer-events-none animate-pulse" />
              </div>
            ) : (
              // Buzz Sparkler & Director Scarlett (Showman)
              <div className="relative flex flex-col items-center">
                <div className="text-3xl sm:text-4xl animate-bounce">
                  {host.avatar}
                </div>
                {isSpeaking && (
                  <div className="flex gap-1 mt-1">
                    <span className="w-1 h-2 bg-amber-400 rounded-full animate-ping" />
                    <span className="w-1 h-3 bg-yellow-400 rounded-full animate-pulse" />
                    <span className="w-1 h-2 bg-amber-400 rounded-full animate-ping" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mini Name Badge */}
          <div className="absolute bottom-1 bg-black/80 px-2 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider">
            {host.name.split(' ')[0]}
          </div>
        </div>
      </div>

      {/* Host Dialogue Speech Bubble */}
      {quipText && (
        <div
          className={`flex-1 ${
            compact ? 'max-w-xs' : 'max-w-xl'
          } relative bg-slate-900/95 border border-slate-700/80 p-3 sm:p-4 rounded-2xl shadow-xl backdrop-blur animate-in fade-in slide-in-from-left duration-300`}
        >
          {/* Speech Bubble Arrow */}
          <div className="hidden sm:block absolute top-6 -left-2 w-4 h-4 bg-slate-900 border-l border-b border-slate-700 transform rotate-45" />

          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wide">
              <span>{host.avatar}</span> {host.name}
              <span className="text-[10px] text-slate-400 font-normal">({host.title})</span>
            </span>
            {isSpeaking && (
              <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">
                HOST ON AIR
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed font-sans">
            "{quipText}"
          </p>
        </div>
      )}
    </div>
  );
};
