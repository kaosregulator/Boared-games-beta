import React, { useState } from 'react';
import { UserProfile } from '../types';
import { sound } from '../utils/audio';
import { X, Sparkles, Check, User, Crown, Flame, Shield, Palette } from 'lucide-react';

interface AvatarMakerModalProps {
  profile: UserProfile;
  onSave: (updated: UserProfile) => void;
  onClose: () => void;
}

const EMOJI_OPTIONS = ['🎮', '👑', '⚓', '♟️', '🎲', '♠️', '🎣', '⚡', '🛡️', '🤖', '👾', '🚀', '🔥', '🦊', '🐉', '🐯'];
const BG_GRADIENTS = [
  { name: 'Deep Indigo', class: 'from-blue-600 to-indigo-700' },
  { name: 'Emerald Forest', class: 'from-emerald-600 to-teal-800' },
  { name: 'Crimson Flame', class: 'from-rose-600 to-red-800' },
  { name: 'Golden Sun', class: 'from-amber-500 to-yellow-600' },
  { name: 'Cyber Purple', class: 'from-purple-600 to-fuchsia-800' },
  { name: 'Dark Void', class: 'from-slate-800 to-black' }
];

const TITLE_OPTIONS = [
  'Naval Grandmaster',
  'Disc Tactician',
  'Draughts Champion',
  'Card Shark 21',
  'Pond Fisher Extraordinaire',
  'Revenge Master',
  'Pirate Bluffer',
  'Tabletop Legend'
];

export const AvatarMakerModal: React.FC<AvatarMakerModalProps> = ({ profile, onSave, onClose }) => {
  const [name, setName] = useState(profile.name);
  const [avatarEmoji, setAvatarEmoji] = useState(profile.avatarEmoji);
  const [avatarBg, setAvatarBg] = useState(profile.avatarBg);
  const [title, setTitle] = useState(profile.title);
  const [tag, setTag] = useState(profile.tag);

  const handleSave = () => {
    sound.playVictory();
    onSave({
      ...profile,
      name,
      avatarEmoji,
      avatarBg,
      title,
      tag
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="sleek-card border-slate-700/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">Avatar & Profile Studio</h3>
              <p className="text-xs text-slate-400 font-mono">Customize your Discord persona & gamer card</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 mb-5 shadow-inner">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${avatarBg} border-2 border-white/40 flex items-center justify-center text-3xl shadow-xl`}>
            {avatarEmoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-base font-bold text-white">{name}</h4>
              <span className="text-xs font-mono text-slate-400">{tag}</span>
            </div>
            <p className="text-xs text-blue-400 font-mono font-medium">{title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {profile.rank} Rank
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Score: {profile.seasonScore} ELO</span>
            </div>
          </div>
        </div>

        {/* Form Controls */}
        <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
          {/* Player Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
              Player Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          {/* Emoji Avatar Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
              Choose Avatar Icon
            </label>
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_OPTIONS.map(em => (
                <button
                  key={em}
                  onClick={() => {
                    sound.playPieceSelect();
                    setAvatarEmoji(em);
                  }}
                  className={`w-9 h-9 rounded-xl border text-lg flex items-center justify-center transition-all ${
                    avatarEmoji === em
                      ? 'bg-blue-600 border-blue-400 scale-110 shadow-md'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Background Gradient */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
              Avatar Color Glow
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BG_GRADIENTS.map(bg => (
                <button
                  key={bg.name}
                  onClick={() => {
                    sound.playPieceSelect();
                    setAvatarBg(bg.class);
                  }}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                    avatarBg === bg.class
                      ? 'border-blue-400 bg-slate-800 text-white ring-2 ring-blue-500/40'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-br ${bg.class}`} />
                  <span className="truncate">{bg.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
              Gamer Title
            </label>
            <select
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-blue-300 font-bold focus:outline-none focus:border-blue-500"
            >
              {TITLE_OPTIONS.map(t => (
                <option key={t} value={t} className="bg-slate-900 text-white">
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider text-xs border border-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-blue-900/50 flex items-center gap-2 transition-all hover:scale-105"
          >
            <Check className="w-4 h-4" />
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
};
