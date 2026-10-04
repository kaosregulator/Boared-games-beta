import React, { useState } from 'react';
import { GameMetadata, ShelfCustomArtConfig, GameBoxArtOverride } from '../types';
import { GameBoxArtGraphic } from './GameBoxArtGraphic';
import { sound } from '../utils/audio';
import {
  X,
  Sparkles,
  Check,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Palette,
  Eye,
  Tv,
  Layers,
  Save,
  Film,
  Sparkle
} from 'lucide-react';

interface CustomShelfStudioModalProps {
  games: GameMetadata[];
  config: ShelfCustomArtConfig;
  onSaveConfig: (updated: ShelfCustomArtConfig) => void;
  onClose: () => void;
}

const PRESET_THEMES: { id: ShelfCustomArtConfig['theme']; label: string; desc: string }[] = [
  { id: 'wood_1989', label: '1989 Vintage Bedroom', desc: 'Classic mahogany wood & warm banker lamp glow' },
  { id: 'neon_arcade', label: '80s Neon Arcade', desc: 'Purple/cyan fluorescent tubes & synthwave glow' },
  { id: 'retro_lounge', label: '70s Woodgrain Den', desc: 'Rich walnut paneling & velvet ambient tone' },
  { id: 'cyberpunk', label: 'Cyber Deck Vault', desc: 'High-tech alloy shelf with holographic accents' }
];

const TOP_LEFT_PROPS = [
  { label: '🚗 Die-Cast DeLorean', val: '🚗 Die-Cast DeLorean' },
  { label: '🏎️ Ferrari Testarossa', val: '🏎️ Ferrari 1986' },
  { label: '🤖 Retro Robot Toy', val: '🤖 Tin Robot' },
  { label: '📻 80s Boombox Radio', val: '📻 Stereo Boombox' },
  { label: '🏆 Champion Trophy', val: '🏆 Arcade Trophy' }
];

const TOP_RIGHT_PROPS = [
  { label: '🌍 Antique Globe', val: '🌍 Antique Globe' },
  { label: '📼 Star Trek VCR Tape', val: '📼 STAR TREK VCR TAPE' },
  { label: '💡 Retro Lava Lamp', val: '💡 Lava Lamp' },
  { label: '🕹️ 1989 Game Boy', val: '🕹️ Handheld Console' },
  { label: '☕ Warm Coffee Mug', val: '☕ Coffee Mug' }
];

const VHS_PRESETS = [
  '📼 BACK TO FUTURE',
  '📼 TOP GUN',
  '📼 GHOSTBUSTERS',
  '📼 JURASSIC PARK',
  '📼 THE MATRIX',
  '📼 BLADE RUNNER',
  '📼 INDIANA JONES',
  '📼 TERMINATOR 2'
];

export const CustomShelfStudioModal: React.FC<CustomShelfStudioModalProps> = ({
  games,
  config,
  onSaveConfig,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'box_art' | 'shelf_theme' | 'shelf_decor'>('box_art');
  const [currentConfig, setCurrentConfig] = useState<ShelfCustomArtConfig>(config);
  const [selectedGameId, setSelectedGameId] = useState<string>('battleship');
  const [inputUrl, setInputUrl] = useState<string>('');

  const selectedOverride = currentConfig.boxArtOverrides[selectedGameId] || {};

  const handleUpdateOverride = (gameId: string, updates: Partial<GameBoxArtOverride>) => {
    setCurrentConfig(prev => ({
      ...prev,
      boxArtOverrides: {
        ...prev.boxArtOverrides,
        [gameId]: {
          ...(prev.boxArtOverrides[gameId] || {}),
          ...updates
        }
      }
    }));
  };

  const handleApplyUrl = () => {
    if (!inputUrl.trim()) return;
    sound.playButtonClick();
    handleUpdateOverride(selectedGameId, { coverImageUrl: inputUrl.trim() });
    setInputUrl('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    sound.playCardFlip();
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      if (result) {
        handleUpdateOverride(selectedGameId, { coverImageUrl: result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetToDefault = (gameId: string) => {
    sound.playButtonClick();
    setCurrentConfig(prev => {
      const nextOverrides = { ...prev.boxArtOverrides };
      delete nextOverrides[gameId];
      return { ...prev, boxArtOverrides: nextOverrides };
    });
  };

  const handleSave = () => {
    sound.playVictoryFanfare();
    onSaveConfig(currentConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#081526] border-2 border-[#172e4d] rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col gap-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Image 1 Shelf & Box Art Studio
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Customize box art images, titles, shelf theme finish, and room decor props
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => {
              sound.playButtonClick();
              setActiveTab('box_art');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeTab === 'box_art'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>1. Box Cover Art</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setActiveTab('shelf_theme');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeTab === 'shelf_theme'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Shelf Theme & Room</span>
          </button>

          <button
            onClick={() => {
              sound.playButtonClick();
              setActiveTab('shelf_decor');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeTab === 'shelf_decor'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>3. Props & VHS Tapes</span>
          </button>
        </div>

        {/* TAB 1: BOX ART */}
        {activeTab === 'box_art' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-1">
            {/* Left: Game List Selector */}
            <div className="md:col-span-5 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">
                Select Game Box to Edit:
              </span>
              <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-1">
                {games.map(game => {
                  const isSelected = selectedGameId === game.id;
                  const hasCustomArt = !!currentConfig.boxArtOverrides[game.id]?.coverImageUrl;

                  return (
                    <button
                      key={game.id}
                      onClick={() => {
                        sound.playPieceSelect();
                        setSelectedGameId(game.id);
                      }}
                      className={`p-2.5 rounded-xl text-left flex items-center justify-between border transition-all ${
                        isSelected
                          ? 'bg-cyan-950/90 border-cyan-400 text-white shadow-md'
                          : 'bg-[#040a14] border-slate-800 text-slate-300 hover:bg-[#081526]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {game.id === 'battleship' && '⚓'}
                          {game.id === 'connect4' && '🔴'}
                          {game.id === 'trivia' && '🎙️'}
                          {game.id === 'poker' && '♠️'}
                          {game.id === 'casino' && '🎰'}
                          {game.id === 'chess' && '♟️'}
                          {game.id === 'checkers' && '🔴'}
                          {game.id === 'blackjack' && '🃏'}
                        </span>
                        <div>
                          <div className="text-xs font-bold truncate max-w-[140px]">{game.title}</div>
                          <div className="text-[9px] text-slate-400">
                            {hasCustomArt ? '✨ Custom Image Active' : 'Default Classic Box'}
                          </div>
                        </div>
                      </div>

                      {hasCustomArt && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold">
                          Custom
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Box Preview & Image Upload Inputs */}
            <div className="md:col-span-7 bg-[#040a14] border border-[#193a61] rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider font-mono">
                    Cover Art Preview:
                  </span>
                  {selectedOverride.coverImageUrl && (
                    <button
                      onClick={() => handleResetToDefault(selectedGameId)}
                      className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 underline font-mono"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset to Classic
                    </button>
                  )}
                </div>

                {/* Live 3D Box Graphic Display */}
                <div className="w-full h-28 flex items-center justify-center bg-black/60 rounded-xl border border-slate-800 p-2 mb-2">
                  <GameBoxArtGraphic
                    gameId={selectedGameId as any}
                    title={selectedOverride.customTitle || games.find(g => g.id === selectedGameId)?.title || ''}
                    customImageUrl={selectedOverride.coverImageUrl}
                    className="w-48 h-24"
                  />
                </div>

                {/* Upload Input & URL Field */}
                <div className="space-y-2">
                  {/* Custom Title Override Field */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1 font-mono">
                      Custom Title / Edition (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder={games.find(g => g.id === selectedGameId)?.title}
                      value={selectedOverride.customTitle || ''}
                      onChange={e => handleUpdateOverride(selectedGameId, { customTitle: e.target.value })}
                      className="w-full bg-[#071322] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>

                  {/* 1. Direct Image URL Input */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1 font-mono">
                      Paste Cover / Spine Image URL:
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        placeholder="https://example.com/box-art.png"
                        value={inputUrl}
                        onChange={e => setInputUrl(e.target.value)}
                        className="flex-1 bg-[#071322] border border-slate-700 rounded-lg px-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                      />
                      <button
                        onClick={handleApplyUrl}
                        disabled={!inputUrl.trim()}
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  {/* 2. Upload from Computer Input */}
                  <div>
                    <label className="w-full py-1.5 px-3 rounded-lg border-2 border-dashed border-slate-700 hover:border-cyan-500/80 bg-[#071322] flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs text-slate-300 font-bold">
                      <Upload className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Choose File (.PNG, .JPG, .WEBP)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SHELF THEME & ROOM */}
        {activeTab === 'shelf_theme' && (
          <div className="flex flex-col gap-3 pt-1">
            <label className="text-[11px] font-bold uppercase text-slate-300 font-mono">
              Choose Shelf Finish & Room Atmosphere:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => {
                    sound.playPieceSelect();
                    setCurrentConfig(prev => ({ ...prev, theme: theme.id }));
                  }}
                  className={`p-3 rounded-2xl text-left border transition-all ${
                    currentConfig.theme === theme.id
                      ? 'bg-amber-950/80 border-amber-400 text-white ring-2 ring-amber-400 shadow-xl'
                      : 'bg-[#040a14] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-200">{theme.label}</span>
                    {currentConfig.theme === theme.id && (
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[9px] font-black uppercase">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{theme.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PROPS & VHS TAPES */}
        {activeTab === 'shelf_decor' && (
          <div className="flex flex-col gap-4 pt-1 max-h-[320px] overflow-y-auto pr-1">
            {/* Top Shelf Props */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Top Left Prop */}
              <div className="bg-[#040a14] border border-slate-800 rounded-xl p-3">
                <label className="block text-[10px] font-bold uppercase text-slate-300 font-mono mb-2">
                  Top Shelf Left Prop:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TOP_LEFT_PROPS.map(p => (
                    <button
                      key={p.val}
                      onClick={() => {
                        sound.playPieceSelect();
                        setCurrentConfig(prev => ({ ...prev, topItemLeft: p.val }));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                        (currentConfig.topItemLeft || '🚗 Die-Cast DeLorean') === p.val
                          ? 'bg-amber-600 text-white border-amber-400'
                          : 'bg-[#071322] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Top Right Prop */}
              <div className="bg-[#040a14] border border-slate-800 rounded-xl p-3">
                <label className="block text-[10px] font-bold uppercase text-slate-300 font-mono mb-2">
                  Top Shelf Right Prop:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TOP_RIGHT_PROPS.map(p => (
                    <button
                      key={p.val}
                      onClick={() => {
                        sound.playPieceSelect();
                        setCurrentConfig(prev => ({ ...prev, topItemRight: p.val }));
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                        (currentConfig.topItemRight || 'STAR TREK VCR TAPE') === p.val
                          ? 'bg-amber-600 text-white border-amber-400'
                          : 'bg-[#071322] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Shelf VHS Tapes */}
            <div className="bg-[#040a14] border border-slate-800 rounded-xl p-3">
              <label className="block text-[10px] font-bold uppercase text-slate-300 font-mono mb-2">
                Bottom Shelf VHS Cassettes (Choose 3 or more):
              </label>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {VHS_PRESETS.map(tape => {
                  const currentTapes = currentConfig.vhsTapes || [
                    '📼 BACK TO FUTURE',
                    '📼 TOP GUN',
                    '📼 GHOSTBUSTERS'
                  ];
                  const isSelected = currentTapes.includes(tape);

                  return (
                    <button
                      key={tape}
                      onClick={() => {
                        sound.playPieceSelect();
                        if (isSelected) {
                          if (currentTapes.length > 1) {
                            setCurrentConfig(prev => ({
                              ...prev,
                              vhsTapes: currentTapes.filter(t => t !== tape)
                            }));
                          }
                        } else {
                          setCurrentConfig(prev => ({
                            ...prev,
                            vhsTapes: [...currentTapes, tape]
                          }));
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
                        isSelected
                          ? 'bg-amber-600 text-white border-amber-400 shadow'
                          : 'bg-[#071322] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {tape}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="pt-3 border-t border-slate-800 flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-xs rounded-xl shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-1.5 transition-all hover:scale-102"
          >
            <Save className="w-4 h-4" />
            Save & Apply Custom Shelf
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
  );
};

