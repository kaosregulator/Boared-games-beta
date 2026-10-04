import React, { useState } from 'react';
import { LeaderboardEntry, UserProfile } from '../types';
import { sound } from '../utils/audio';
import { X, Trophy, Medal, Crown, Flame, Shield, Sparkles, TrendingUp } from 'lucide-react';

interface LeaderboardModalProps {
  userProfile: UserProfile;
  leaderboard: LeaderboardEntry[];
  onClose: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  userProfile,
  leaderboard,
  onClose
}) => {
  const [filter, setFilter] = useState<'all' | 'grandmaster' | 'friends'>('all');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="sleek-card border-slate-700/80 rounded-3xl max-w-2xl w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                  Season 1: Retro Championship
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Compete across Battleship, Connect Four, Chess, Checkers, Blackjack & Go Fish!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Rank Card */}
        <div className="bg-gradient-to-r from-blue-950/80 to-indigo-950/80 border border-blue-500/40 rounded-2xl p-4 flex items-center justify-between mb-4 shadow-inner">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${userProfile.avatarBg} border border-white/40 flex items-center justify-center text-2xl shadow`}>
              {userProfile.avatarEmoji}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{userProfile.name}</span>
                <span className="text-[10px] font-mono text-blue-300">#3 Overall</span>
              </div>
              <span className="text-xs text-slate-300 font-mono">{userProfile.title}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Rank Tier</span>
              <span className="text-xs font-bold text-amber-300 uppercase">{userProfile.rank}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">ELO Rating</span>
              <span className="text-sm font-bold font-mono text-blue-400">{userProfile.seasonScore} pts</span>
            </div>
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Win Streak</span>
              <span className="text-xs font-bold font-mono text-emerald-400">🔥 {userProfile.winStreak}</span>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mb-3">
          {(['all', 'grandmaster', 'friends'] as const).map(f => (
            <button
              key={f}
              onClick={() => {
                sound.playButtonClick();
                setFilter(f);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                filter === f
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {f === 'all' ? 'Global Top 10' : f === 'grandmaster' ? 'Grandmasters' : 'Discord Friends'}
            </button>
          ))}
        </div>

        {/* Leaderboard Table List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {leaderboard.map((entry, idx) => {
            const isTop3 = idx < 3;
            const rankMedal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;

            return (
              <div
                key={entry.id}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  entry.name.includes('(You)')
                    ? 'bg-blue-900/30 border-blue-500/60 shadow-lg'
                    : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 font-mono font-bold text-center text-sm text-slate-300">
                    {rankMedal}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shadow">
                    {entry.avatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-white">{entry.name}</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                        {entry.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Specialty: <strong className="text-blue-300">{entry.favoriteGame}</strong> • {entry.wins}W / {entry.losses}L
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-amber-300">{entry.score} pts</span>
                  <span className="block text-[10px] text-slate-400 font-mono uppercase">{entry.rank}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Season 1 ends in: 14 days 6 hours</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold uppercase tracking-wider text-[11px] border border-slate-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
