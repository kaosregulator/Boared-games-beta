import React from 'react';
import { ComingSoonBoxMeta } from './ComingSoonSpineBox';
import { sound } from '../utils/audio';
import { X, Sparkles, Clock, Lock, Bell, Users, CheckCircle2 } from 'lucide-react';

interface ComingSoonModalProps {
  box: ComingSoonBoxMeta;
  onClose: () => void;
}

export const ComingSoonModal: React.FC<ComingSoonModalProps> = ({ box, onClose }) => {
  const [subscribed, setSubscribed] = React.useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gradient-to-b from-[#0e1d32] via-[#091424] to-[#040912] border-2 border-cyan-500/80 rounded-3xl p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(6,182,212,0.3)] text-white relative flex flex-col gap-4 ring-1 ring-white/20 select-none animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-500/30 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300 block">
                {box.packId === 'pack2' ? 'PARTY PACK 02 • ARCADE EXPANSION' : 'PARTY PACK 03 • STRATEGY VAULT'}
              </span>
              <h3 className="text-sm font-black uppercase text-white">UPCOMING RELEASE</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Box Art Teaser Preview */}
        <div className="w-full h-32 rounded-2xl bg-black/80 border border-cyan-500/40 relative overflow-hidden flex flex-col items-center justify-center text-center p-4 shadow-inner">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/40 via-transparent to-purple-950/40" />
          <div className="relative z-10">
            <span className="px-2.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-400/50 text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5 inline-block">
              {box.badge}
            </span>
            <h4 className="text-lg sm:text-xl font-black uppercase tracking-wide text-white drop-shadow">
              {box.title}
            </h4>
            <p className="text-xs text-slate-300 font-mono mt-0.5">{box.subtitle}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2 bg-[#050c18] p-3 rounded-2xl border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>{box.players}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{box.age}</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-[#0a182d]/60 p-3 rounded-xl border border-cyan-900/50">
          This board game is actively being crafted for this expansion shelf. All mechanics, minimax AI, and full tabletop physics will arrive with the pack drop.
        </p>

        {/* Notification Action */}
        <button
          onClick={() => {
            sound.playVictoryFanfare();
            setSubscribed(true);
          }}
          className={`w-full py-2.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all ${
            subscribed
              ? 'bg-emerald-600 text-white'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-amber-950/50 hover:scale-102'
          }`}
        >
          {subscribed ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Notified for Pack Release!</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              <span>Notify Me on Pack Launch</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
