import React, { useEffect, useState } from 'react';
import { ANCHORS } from './anchors';
import { setAdaptive, setGraphicsPreset, type GraphicsPreset } from '../engine/graphics';
import { useGraphics } from '../engine/useGraphics';
import { setControlPreset, setInvertLook, setLookSensitivity, useControlSettings, type ControlPreset } from './controls';
import { MOOD_LABEL, type RoomMood } from './moods';
import { sound, MUSIC_CREDITS, ROOM_TRACKS, type RoomTrackId } from '../utils/audio';
import { setHoloBeeps, setHoloVoice, useHoloBeeps, useHoloVoice, VOICES, type VoiceId } from './capsule/holoVoice';

interface RoomStudioProps {
  open: boolean;
  mood: RoomMood;
  music: boolean;
  musicVolume: number;
  track: RoomTrackId;
  /** Walking field of view, degrees. */
  fov: number;
  onFov: (fov: number) => void;
  placing: boolean;
  placeName: string;
  anchorId: string;
  height: number;
  lift: number;
  shadow: boolean;
  saved: { id: string; name: string }[];
  onClose: () => void;
  onMood: (mood: RoomMood) => void;
  onMusic: (on: boolean) => void;
  onMusicVolume: (volume: number) => void;
  onTrack: (id: RoomTrackId) => void;
  onFile: (file: File) => void;
  onAnchor: (id: string) => void;
  onHeight: (n: number) => void;
  onLift: (n: number) => void;
  onShadow: (on: boolean) => void;
  onCommit: () => void;
  onCancelPlace: () => void;
  onDelete: (id: string) => void;
}

const GRAPHICS_PRESETS: { id: GraphicsPreset; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'high', label: 'High' },
];

const DEVICE_PRESETS: { id: Exclude<ControlPreset, 'custom'>; label: string }[] = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'phone', label: 'Phone' },
];

const TABS = [
  { id: 'look', label: 'Look' },
  { id: 'sound', label: 'Sound' },
  { id: 'picture', label: 'Picture' },
  { id: 'place', label: 'Place' },
  { id: 'keys', label: 'Keys' },
] as const;
type StudioTab = (typeof TABS)[number]['id'];

const KEYS: { key: string; what: string }[] = [
  { key: 'W A S D', what: 'Walk. The stick does this on a phone.' },
  { key: 'Arrows · drag', what: 'Look. A laptop can also swipe with two fingers.' },
  { key: 'Click', what: 'Use whatever the dot is on.' },
  { key: 'C', what: 'Duck, and press it again to stand. Space stands you up at a table.' },
  { key: 'Pinch · + −', what: 'Zoom. Field of view is on the Look tab.' },
  { key: 'Esc', what: 'Close this menu, step back from the TV, or stand up.' },
  { key: 'F', what: 'Big screen on the TV, the computer, and the consoles.' },
  { key: 'V', what: 'Change the camera once a board is on the table.' },
];

/**
 * The room menu, as a sidebar. Look, sound, picture, and placement each get
 * their own page so the list is not one long scroll.
 */
export function RoomStudio(props: RoomStudioProps) {
  const controls = useControlSettings();
  const gfx = useGraphics();
  const [tab, setTab] = useState<StudioTab>('look');
  const [shuffle, setShuffle] = useState(() => sound.getShuffle());

  useEffect(() => {
    if (props.placing) setTab('place');
  }, [props.placing]);

  useEffect(() => {
    if (!props.open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      props.onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  const pick = (id: StudioTab) => {
    sound.playButtonClick();
    setTab(id);
  };

  return (
    <aside
      data-ui="studio"
      className="absolute bottom-0 left-0 top-0 z-40 flex w-[min(22rem,100%)] min-w-0 flex-col overflow-x-hidden border-r border-white/15 bg-[#140c14]/88 text-white shadow-2xl backdrop-blur-2xl"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))]">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Room</p>
        <button
          type="button"
          onClick={() => {
            sound.playButtonClick();
            props.onClose();
          }}
          className="min-h-11 rounded-xl border border-white/20 px-3 text-xs font-bold uppercase tracking-wider text-white/80 hover:text-white"
        >
          Close
        </button>
      </div>
      <div className="grid grid-cols-5 gap-0.5 border-b border-white/10 px-2 py-2" role="tablist">
        {TABS.map(item => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => pick(item.id)}
            className={`min-h-11 rounded-lg px-0.5 text-[10px] font-bold uppercase leading-none tracking-wide ${
              tab === item.id ? 'bg-amber-200/20 text-amber-50' : 'text-white/65 hover:bg-white/10'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-sm">
        {tab === 'picture' && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-bold">Mood</span>
              <select
                value={props.mood}
                onChange={e => props.onMood(e.target.value as RoomMood)}
                className="min-h-11 rounded-xl border border-white/15 bg-black/40 px-3 py-2"
              >
                {(Object.keys(MOOD_LABEL) as RoomMood[]).map(id => (
                  <option key={id} value={id}>
                    {MOOD_LABEL[id]}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-bold">
                Graphics {gfx.adaptive && gfx.effective !== gfx.preset ? `· eased to ${gfx.effective}` : ''}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {GRAPHICS_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={gfx.preset === preset.id}
                    onClick={() => {
                      sound.playButtonClick();
                      setGraphicsPreset(preset.id);
                    }}
                    className={`min-h-11 rounded-full border px-3 text-[10px] font-bold uppercase tracking-[0.14em] ${
                      gfx.preset === preset.id ? 'border-amber-200/80 bg-amber-200/20 text-amber-50' : 'border-white/20 text-white/75'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <span>Ease off when the room stutters</span>
                <input type="checkbox" className="h-5 w-5" checked={gfx.adaptive} onChange={e => setAdaptive(e.target.checked)} />
              </label>
              <span className="text-[10px] leading-relaxed text-white/40">
                High stays sharp while the frame rate holds. A slow machine steps the picture down on its own and does not bounce back and forth.
              </span>
            </div>
          </>
        )}

        {tab === 'look' && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-bold">Field of view {props.fov}°</span>
              <input
                type="range"
                min={50}
                max={110}
                step={1}
                value={props.fov}
                onChange={e => props.onFov(Number(e.target.value))}
                className="h-11 w-full min-w-0 accent-amber-200"
              />
              <span className="text-[10px] text-white/40">Wider sees more of the room. Narrower feels closer. Pinch still zooms.</span>
            </label>
            <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-bold">
            Controls {controls.preset === 'custom' ? '· custom' : ''}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {DEVICE_PRESETS.map(preset => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={controls.preset === preset.id}
                onClick={() => {
                  sound.playButtonClick();
                  setControlPreset(preset.id);
                }}
                className={`min-h-11 rounded-full border px-3 text-[10px] font-bold uppercase tracking-[0.14em] ${
                  controls.preset === preset.id ? 'border-amber-200/80 bg-amber-200/20 text-amber-50' : 'border-white/20 text-white/75'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-bold">
              Look sensitivity {controls.sensitivity.toFixed(2)}
            </span>
            <input
              type="range"
              min={0.4}
              max={2}
              step={0.05}
              value={controls.sensitivity}
              onChange={e => setLookSensitivity(Number(e.target.value))}
              className="h-11 w-full min-w-0 accent-amber-200"
            />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-black/30 border border-white/10 px-3 py-2">
            <span>Invert look left / right</span>
            <input type="checkbox" className="h-5 w-5" checked={controls.invertX} onChange={e => setInvertLook('x', e.target.checked)} />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-black/30 border border-white/10 px-3 py-2">
            <span>Invert look up / down</span>
            <input type="checkbox" className="h-5 w-5" checked={controls.invertY} onChange={e => setInvertLook('y', e.target.checked)} />
          </label>
          <span className="text-[10px] text-white/40">A preset sets look speed. W A S D still walks, and C still ducks.</span>
            </div>
          </>
        )}

        {tab === 'sound' && (
          <>
        <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
          <span>Bedroom music</span>
          <input type="checkbox" className="h-5 w-5" checked={props.music} onChange={e => props.onMusic(e.target.checked)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-bold">Track</span>
          <select
            value={props.track}
            onChange={e => props.onTrack(e.target.value as RoomTrackId)}
            className="min-h-11 rounded-xl border border-white/15 bg-black/40 px-3 py-2"
          >
            {ROOM_TRACKS.map(t => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playButtonClick();
              sound.skipTrack();
            }}
            className="min-h-11 flex-1 rounded-xl border border-white/20 text-[11px] font-bold uppercase tracking-[0.16em] text-white/85 hover:bg-white/10"
          >
            Skip ›
          </button>
          <label className="flex min-h-11 flex-1 items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/85">Shuffle</span>
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={shuffle}
              onChange={e => {
                sound.setShuffle(e.target.checked);
                setShuffle(e.target.checked);
              }}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-bold">
            Volume {Math.round(props.musicVolume * 100)}
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={props.musicVolume}
            onChange={e => props.onMusicVolume(Number(e.target.value))}
            className="h-11 w-full min-w-0 accent-amber-200"
          />
        </label>
        <HoloVoicePicker />
        <div className="flex flex-col gap-1 text-[10px] leading-relaxed text-white/45">
          <span className="font-bold uppercase tracking-[0.18em] text-white/50">Music credits</span>
          {MUSIC_CREDITS.map(c => (
            <span key={c.title}>
              “{c.title}” by {c.artist} ·{' '}
              <a href={c.source} target="_blank" rel="noreferrer" className="underline decoration-white/30 hover:text-white/80">
                source
              </a>{' '}
              ·{' '}
              {c.licenseUrl ? (
                <a href={c.licenseUrl} target="_blank" rel="noreferrer" className="underline decoration-white/30 hover:text-white/80">
                  {c.license}
                </a>
              ) : (
                c.license
              )}
            </span>
          ))}
        </div>
          </>
        )}

        {tab === 'keys' && (
          <ul className="flex flex-col gap-2">
            {KEYS.map(row => (
              <li key={row.key} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200">{row.key}</p>
                <p className="mt-1 text-sm leading-snug text-white/85">{row.what}</p>
              </li>
            ))}
          </ul>
        )}

        {tab === 'place' && (
          <>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-bold">Upload a GLB</span>
          <input
            type="file"
            accept=".glb,model/gltf-binary"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) props.onFile(file);
              e.target.value = '';
            }}
            className="text-xs text-white/80"
          />
        </label>

        {props.placing && (
          <div className="rounded-2xl border border-amber-200/30 bg-amber-200/10 p-3 flex flex-col gap-3">
            <p className="font-display text-lg">{props.placeName}</p>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/60 font-bold">Anchor</span>
              <select
                value={props.anchorId}
                onChange={e => props.onAnchor(e.target.value)}
                className="min-h-11 rounded-xl border border-white/15 bg-black/40 px-3 py-2"
              >
                {ANCHORS.map(anchor => (
                  <option key={anchor.id} value={anchor.id}>
                    {anchor.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/60 font-bold">
                Height {props.height.toFixed(2)} m
              </span>
              <input
                type="range"
                min={0.08}
                max={2.2}
                step={0.02}
                value={props.height}
                onChange={e => props.onHeight(Number(e.target.value))}
                className="h-11 w-full min-w-0 accent-amber-200"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/60 font-bold">
                Stack lift {props.lift.toFixed(2)} m
              </span>
              <input
                type="range"
                min={0}
                max={1.2}
                step={0.02}
                value={props.lift}
                onChange={e => props.onLift(Number(e.target.value))}
                className="h-11 w-full min-w-0 accent-amber-200"
              />
            </label>
            <label className="flex items-center justify-between">
              <span>Cast shadow</span>
              <input type="checkbox" checked={props.shadow} onChange={e => props.onShadow(e.target.checked)} />
            </label>
            <p className="text-[11px] text-white/60">Gold pads in the room are the same anchors. Enter keeps it.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={props.onCommit}
                className="min-h-11 flex-1 rounded-xl bg-gradient-to-r from-fuchsia-600 to-amber-500 py-2 font-display"
              >
                Enter — keep it
              </button>
              <button
                type="button"
                onClick={props.onCancelPlace}
                className="min-h-11 rounded-xl border border-white/20 px-3 py-2 text-xs uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {props.saved.length > 0 && (
          <ul className="flex flex-col gap-1">
            {props.saved.map(item => (
              <li key={item.id} className="flex items-center justify-between rounded-lg bg-black/30 px-2 py-1.5 text-xs">
                <span className="truncate">{item.name}</span>
                <button type="button" onClick={() => props.onDelete(item.id)} className="min-h-11 px-2 text-amber-200">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
          </>
        )}
      </div>
    </aside>
  );
}

/** Which voice reads a time capsule aloud when you press Listen, and the beeps when one opens. */
function HoloVoicePicker() {
  const voice = useHoloVoice();
  const beeps = useHoloBeeps();
  return (
    <>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-bold">Hologram voice</span>
        <select
          value={voice}
          onChange={e => {
            sound.playButtonClick();
            setHoloVoice(e.target.value as VoiceId | 'off');
          }}
          className="min-h-11 rounded-xl border border-white/15 bg-black/40 px-3 py-2"
        >
          {VOICES.map(v => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
          <option value="off">Off</option>
        </select>
        <span className="text-[10px] text-white/40">{VOICES.find(v => v.id === voice)?.blurb ?? 'Cards stay quiet. Press Listen on a card to hear it read.'}</span>
      </label>
      <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
        <span>Beeps when a card opens</span>
        <input type="checkbox" className="h-5 w-5" checked={beeps} onChange={e => setHoloBeeps(e.target.checked)} />
      </label>
    </>
  );
}
