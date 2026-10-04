import React from 'react';
import { GameMetadata } from '../types';
import { sound } from '../utils/audio';
import { X, BookOpen, CheckCircle, Lightbulb, Shield } from 'lucide-react';

interface RulesModalProps {
  game: GameMetadata;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ game, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="sleek-card border-slate-700/80 rounded-2xl p-6 sm:p-8 max-w-lg w-full text-white shadow-2xl animate-in zoom-in-95 duration-200 relative">
        <button
          onClick={() => {
            sound.playButtonClick();
            onClose();
          }}
          className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-700"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">{game.title}</h3>
            <p className="text-xs text-blue-400 font-mono uppercase tracking-wider">Official Rules & Tactics</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 mb-6 leading-relaxed bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
          {game.description}
        </p>

        <div className="space-y-3 mb-6">
          <h4 className="text-xs font-bold uppercase tracking-[2px] text-slate-400 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-blue-400" /> Key Rules
          </h4>
          {game.rules.map((rule, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
              <CheckCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{rule}</span>
            </div>
          ))}
        </div>

        <div className="bg-slate-900/80 border border-slate-700/60 p-3.5 rounded-xl flex items-start gap-2.5">
          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300">
            <strong className="text-blue-300">Pro-Tip:</strong> You can toggle between 3D Isometric View and 2D Tactical View at any time using the camera button in the top bar.
          </div>
        </div>

        <button
          onClick={() => {
            sound.playButtonClick();
            onClose();
          }}
          className="mt-6 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider text-xs shadow-lg shadow-blue-900/40 transition-all hover:scale-[1.01] active:scale-98"
        >
          Got it, let's play!
        </button>
      </div>
    </div>
  );
};

