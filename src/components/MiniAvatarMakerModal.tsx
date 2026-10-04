import React, { useState } from 'react';
import { MiniAvatarConfig, UserProfile } from '../types';
import { MiniAvatarFigure, DEFAULT_AVATAR_CONFIG } from './MiniAvatarFigure';
import { sound } from '../utils/audio';
import {
  X,
  Sparkles,
  Check,
  Shuffle,
  Smile,
  Glasses,
  Shirt,
  Headphones,
  Palette,
  Eye,
  Crown
} from 'lucide-react';

interface MiniAvatarMakerModalProps {
  profile: UserProfile;
  onSave: (updated: UserProfile) => void;
  onClose: () => void;
}

const SKIN_TONES = [
  { id: '#ffedd5', label: 'Fair Peach' },
  { id: '#fcd34d', label: 'Warm Tan' },
  { id: '#fed7aa', label: 'Golden' },
  { id: '#d97706', label: 'Bronze' },
  { id: '#78350f', label: 'Espresso' },
  { id: '#38bdf8', label: 'Cyber Neon' }
];

const HAIR_STYLES = [
  { id: 'retro_shag', label: '80s Shag' },
  { id: 'pompadour', label: 'Pompadour' },
  { id: 'curly', label: 'Curly Cloud' },
  { id: 'punk_spiky', label: 'Punk Spikes' }
];

const HAIR_COLORS = [
  { id: '#451a03', label: 'Brunette' },
  { id: '#1e293b', label: 'Jet Black' },
  { id: '#f59e0b', label: 'Blonde' },
  { id: '#ea580c', label: 'Ginger' },
  { id: '#ec4899', label: 'Neon Pink' },
  { id: '#0284c7', label: 'Electric Blue' }
];

const EXPRESSIONS = [
  { id: 'focused', label: 'Focused', emoji: '👀' },
  { id: 'cool_shades', label: 'Shades', emoji: '😎' },
  { id: 'smiling', label: 'Happy', emoji: '😄' },
  { id: 'retro_glasses', label: 'Retro Specs', emoji: '👓' }
];

const OUTFITS = [
  { id: 'retro_hoodie', label: 'Retro Hoodie' },
  { id: 'leather_jacket', label: 'Leather Jacket' },
  { id: 'arcade_tee', label: 'Space Arcade Tee' },
  { id: 'varsity_jacket', label: 'Varsity Jacket' }
];

const OUTFIT_COLORS = [
  { id: '#dc2626', label: 'Ruby Red' },
  { id: '#2563eb', label: 'Ocean Blue' },
  { id: '#059669', label: 'Emerald' },
  { id: '#d97706', label: 'Amber Gold' },
  { id: '#7c3aed', label: 'Midnight Violet' },
  { id: '#0f172a', label: 'Stealth Black' }
];

const HEADWEAR_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'retro_cap_backward', label: 'Backward Cap' },
  { id: 'headphones', label: 'DJ Headphones' },
  { id: 'aviator_shades', label: 'Aviator Shades' }
];

const ACCESSORIES = [
  { id: 'none', label: 'None' },
  { id: 'gold_chain', label: 'Gold Chain' },
  { id: 'headphones', label: 'Headphones' }
];

const PRESETS: { name: string; config: MiniAvatarConfig }[] = [
  {
    name: '80s Arcade Kid',
    config: {
      skinTone: '#fcd34d',
      hairStyle: 'retro_shag',
      hairColor: '#451a03',
      faceExpression: 'focused',
      outfitType: 'retro_hoodie',
      outfitColor: '#dc2626',
      headwear: 'retro_cap_backward',
      accessory: 'headphones'
    }
  },
  {
    name: 'Cyberpunk Maverick',
    config: {
      skinTone: '#38bdf8',
      hairStyle: 'punk_spiky',
      hairColor: '#ec4899',
      faceExpression: 'cool_shades',
      outfitType: 'leather_jacket',
      outfitColor: '#0f172a',
      headwear: 'headphones',
      accessory: 'gold_chain'
    }
  },
  {
    name: 'Vintage Champion',
    config: {
      skinTone: '#ffedd5',
      hairStyle: 'pompadour',
      hairColor: '#1e293b',
      faceExpression: 'smiling',
      outfitType: 'varsity_jacket',
      outfitColor: '#2563eb',
      headwear: 'none',
      accessory: 'gold_chain'
    }
  },
  {
    name: 'Tabletop Prodigy',
    config: {
      skinTone: '#fed7aa',
      hairStyle: 'curly',
      hairColor: '#ea580c',
      faceExpression: 'retro_glasses',
      outfitType: 'arcade_tee',
      outfitColor: '#059669',
      headwear: 'none',
      accessory: 'none'
    }
  }
];

export const MiniAvatarMakerModal: React.FC<MiniAvatarMakerModalProps> = ({
  profile,
  onSave,
  onClose
}) => {
  const [avatar, setAvatar] = useState<MiniAvatarConfig>(
    profile.miniAvatar || DEFAULT_AVATAR_CONFIG
  );
  const [activeTab, setActiveTab] = useState<'head' | 'face' | 'outfit' | 'gear'>('head');

  const handleRandomize = () => {
    sound.playCardFlip();
    const randomSkin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)].id;
    const randomHair = HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)].id;
    const randomColor = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].id;
    const randomExpr = EXPRESSIONS[Math.floor(Math.random() * EXPRESSIONS.length)].id;
    const randomOutfit = OUTFITS[Math.floor(Math.random() * OUTFITS.length)].id;
    const randomOutfitCol = OUTFIT_COLORS[Math.floor(Math.random() * OUTFIT_COLORS.length)].id;
    const randomHeadwear = HEADWEAR_OPTIONS[Math.floor(Math.random() * HEADWEAR_OPTIONS.length)].id;
    const randomAccessory = ACCESSORIES[Math.floor(Math.random() * ACCESSORIES.length)].id;

    setAvatar({
      skinTone: randomSkin,
      hairStyle: randomHair,
      hairColor: randomColor,
      faceExpression: randomExpr,
      outfitType: randomOutfit,
      outfitColor: randomOutfitCol,
      headwear: randomHeadwear,
      accessory: randomAccessory
    });
  };

  const handleSave = () => {
    sound.playVictoryFanfare();
    onSave({
      ...profile,
      miniAvatar: avatar
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#081526] border-2 border-[#172e4d] rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col gap-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Mini Avatar Studio
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Used in Connect 4, FOV camera tables, Texas Hold'em, & Battleship
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

        {/* Studio Center Stage: Preview & Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Left: Live Stage Display with Chibi Avatar */}
          <div className="md:col-span-5 bg-gradient-to-b from-[#0f233d] to-[#050c18] border border-[#193a61] rounded-2xl p-4 flex flex-col items-center justify-between relative shadow-inner">
            <div className="w-full flex items-center justify-between text-[10px] font-mono text-cyan-300">
              <span>LIVE TABLE PREVIEW</span>
              <button
                onClick={handleRandomize}
                className="px-2 py-0.5 rounded bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 flex items-center gap-1 border border-cyan-500/40"
              >
                <Shuffle className="w-3 h-3" />
                Randomize
              </button>
            </div>

            {/* Avatar Preview */}
            <div className="my-auto py-2">
              <MiniAvatarFigure config={avatar} size="lg" playerName={profile.name} mood="celebrate" />
            </div>

            {/* Presets Quick Row */}
            <div className="w-full pt-2 border-t border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase font-mono">
                Style Presets:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESETS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => {
                      sound.playPieceSelect();
                      setAvatar(p.config);
                    }}
                    className="px-2 py-1 rounded bg-[#071322] hover:bg-[#0c223d] text-[10px] font-bold text-cyan-300 border border-slate-800 truncate text-left"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Customization Tabs & Options */}
          <div className="md:col-span-7 flex flex-col justify-between">
            {/* Category Switcher Tabs */}
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#040a14] rounded-xl border border-slate-800 mb-3">
              {[
                { id: 'head', label: 'Hair & Skin', icon: Palette },
                { id: 'face', label: 'Face & Eyes', icon: Smile },
                { id: 'outfit', label: 'Outfit', icon: Shirt },
                { id: 'gear', label: 'Gear', icon: Headphones }
              ].map(t => {
                const Icon = t.icon;
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      sound.playPieceSelect();
                      setActiveTab(t.id as any);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                      isActive
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Customization Options Container */}
            <div className="flex-1 max-h-[250px] overflow-y-auto pr-1 space-y-3">
              {/* TAB 1: HAIR & SKIN */}
              {activeTab === 'head' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1.5">
                      Skin Tone
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {SKIN_TONES.map(s => (
                        <button
                          key={s.id}
                          onClick={() => {
                            sound.playPieceSelect();
                            setAvatar(prev => ({ ...prev, skinTone: s.id }));
                          }}
                          className={`h-9 rounded-xl border-2 transition-all flex items-center justify-center ${
                            avatar.skinTone === s.id
                              ? 'border-white scale-110 shadow-lg'
                              : 'border-slate-800 hover:scale-105'
                          }`}
                          style={{ backgroundColor: s.id }}
                        >
                          {avatar.skinTone === s.id && <Check className="w-4 h-4 text-black" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1.5">
                      Hair Style
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {HAIR_STYLES.map(h => (
                        <button
                          key={h.id}
                          onClick={() => {
                            sound.playPieceSelect();
                            setAvatar(prev => ({ ...prev, hairStyle: h.id }));
                          }}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold text-left transition-all ${
                            avatar.hairStyle === h.id
                              ? 'bg-cyan-950/80 border-cyan-400 text-white'
                              : 'bg-[#06101e] border-slate-800 text-slate-300 hover:bg-[#0c1e36]'
                          }`}
                        >
                          {h.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1.5">
                      Hair Color
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {HAIR_COLORS.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            sound.playPieceSelect();
                            setAvatar(prev => ({ ...prev, hairColor: c.id }));
                          }}
                          className={`h-8 rounded-xl border-2 transition-all flex items-center justify-center ${
                            avatar.hairColor === c.id
                              ? 'border-white scale-110 shadow-lg'
                              : 'border-slate-800 hover:scale-105'
                          }`}
                          style={{ backgroundColor: c.id }}
                        >
                          {avatar.hairColor === c.id && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: FACE & EYES */}
              {activeTab === 'face' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1.5">
                    Facial Expression & Eyewear
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {EXPRESSIONS.map(e => (
                      <button
                        key={e.id}
                        onClick={() => {
                          sound.playPieceSelect();
                          setAvatar(prev => ({ ...prev, faceExpression: e.id }));
                        }}
                        className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                          avatar.faceExpression === e.id
                            ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-md'
                            : 'bg-[#06101e] border-slate-800 text-slate-300 hover:bg-[#0c1e36]'
                        }`}
                      >
                        <span className="text-lg">{e.emoji}</span>
                        <span>{e.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: OUTFIT */}
              {activeTab === 'outfit' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1.5">
                      Outfit Cut
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {OUTFITS.map(o => (
                        <button
                          key={o.id}
                          onClick={() => {
                            sound.playPieceSelect();
                            setAvatar(prev => ({ ...prev, outfitType: o.id }));
                          }}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold text-left transition-all ${
                            avatar.outfitType === o.id
                              ? 'bg-cyan-950/80 border-cyan-400 text-white'
                              : 'bg-[#06101e] border-slate-800 text-slate-300 hover:bg-[#0c1e36]'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1.5">
                      Fabric Color
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {OUTFIT_COLORS.map(oc => (
                        <button
                          key={oc.id}
                          onClick={() => {
                            sound.playPieceSelect();
                            setAvatar(prev => ({ ...prev, outfitColor: oc.id }));
                          }}
                          className={`h-8 rounded-xl border-2 transition-all flex items-center justify-center ${
                            avatar.outfitColor === oc.id
                              ? 'border-white scale-110 shadow-lg'
                              : 'border-slate-800 hover:scale-105'
                          }`}
                          style={{ backgroundColor: oc.id }}
                        >
                          {avatar.outfitColor === oc.id && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* TAB 4: GEAR */}
              {activeTab === 'gear' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1.5">
                      Headwear
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {HEADWEAR_OPTIONS.map(hw => (
                        <button
                          key={hw.id}
                          onClick={() => {
                            sound.playPieceSelect();
                            setAvatar(prev => ({ ...prev, headwear: hw.id }));
                          }}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold text-left transition-all ${
                            avatar.headwear === hw.id
                              ? 'bg-cyan-950/80 border-cyan-400 text-white'
                              : 'bg-[#06101e] border-slate-800 text-slate-300 hover:bg-[#0c1e36]'
                          }`}
                        >
                          {hw.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-300 mb-1.5">
                      Accessories
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {ACCESSORIES.map(ac => (
                        <button
                          key={ac.id}
                          onClick={() => {
                            sound.playPieceSelect();
                            setAvatar(prev => ({ ...prev, accessory: ac.id }));
                          }}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold text-left transition-all ${
                            avatar.accessory === ac.id
                              ? 'bg-cyan-950/80 border-cyan-400 text-white'
                              : 'bg-[#06101e] border-slate-800 text-slate-300 hover:bg-[#0c1e36]'
                          }`}
                        >
                          {ac.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-cyan-900/50 flex items-center justify-center gap-1.5 transition-all hover:scale-102"
              >
                <Check className="w-4 h-4" />
                Save & Apply Avatar
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase text-xs rounded-xl border border-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
