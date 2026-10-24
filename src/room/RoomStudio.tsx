import React from 'react';
import { ANCHORS } from './anchors';
import { setAdaptive, setGraphicsPreset, type GraphicsPreset } from '../engine/graphics';
import { useGraphics } from '../engine/useGraphics';
import { setControlPreset, setInvertLook, setLookSensitivity, useControlSettings, type ControlPreset } from './controls';
import { MOOD_LABEL, type RoomMood } from './moods';
import { ROOM_TRACKS, type RoomTrackId } from '../utils/audio';

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

/** Pause menu: mood, music, and anchored GLB placement. */
export function RoomStudio(props: RoomStudioProps) {
  const controls = useControlSettings();
  const gfx = useGraphics();
  if (!props.open) return null;
  return (
    <div data-ui="studio" className="absolute left-4 top-16 z-40 max-h-[calc(100dvh-5rem)] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain rounded-3xl border border-white/25 bg-[#140c14]/75 text-white shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">Room studio</p>
        <button type="button" onClick={props.onClose} className="text-xs text-white/70 hover:text-white">
          Close
        </button>
      </div>
      <div className="p-4 flex flex-col gap-4 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-bold">Mood</span>
          <select
            value={props.mood}
            onChange={e => props.onMood(e.target.value as RoomMood)}
            className="rounded-xl bg-black/40 border border-white/15 px-3 py-2"
          >
            {(Object.keys(MOOD_LABEL) as RoomMood[]).map(id => (
              <option key={id} value={id}>
                {MOOD_LABEL[id]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-bold">
            Field of view {props.fov}°
          </span>
          <input
            type="range"
            min={50}
            max={110}
            step={1}
            value={props.fov}
            onChange={e => props.onFov(Number(e.target.value))}
          />
          <span className="text-[10px] text-white/40">Wider sees more of the room; narrower feels closer. Pinch to zoom any time.</span>
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
                onClick={() => setGraphicsPreset(preset.id)}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                  gfx.preset === preset.id ? 'border-amber-200/80 bg-amber-200/20 text-amber-50' : 'border-white/20 text-white/75'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-black/30 border border-white/10 px-3 py-2">
            <span>Ease off when the room stutters</span>
            <input type="checkbox" checked={gfx.adaptive} onChange={e => setAdaptive(e.target.checked)} />
          </label>
        </div>

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
                onClick={() => setControlPreset(preset.id)}
                className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
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
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-black/30 border border-white/10 px-3 py-2">
            <span>Invert look left / right</span>
            <input type="checkbox" checked={controls.invertX} onChange={e => setInvertLook('x', e.target.checked)} />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl bg-black/30 border border-white/10 px-3 py-2">
            <span>Invert look up / down</span>
            <input type="checkbox" checked={controls.invertY} onChange={e => setInvertLook('y', e.target.checked)} />
          </label>
          <span className="text-[10px] text-white/40">C ducks and stands. WASD still walks. A preset sets look speed and leaves the keys on.</span>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-xl bg-black/30 border border-white/10 px-3 py-2">
          <span>Bedroom music</span>
          <input type="checkbox" checked={props.music} onChange={e => props.onMusic(e.target.checked)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-bold">Track</span>
          <select
            value={props.track}
            onChange={e => props.onTrack(e.target.value as RoomTrackId)}
            className="rounded-xl bg-black/40 border border-white/15 px-3 py-2"
          >
            {ROOM_TRACKS.map(t => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
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
          />
        </label>

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
                className="rounded-xl bg-black/40 border border-white/15 px-3 py-2"
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
                className="flex-1 rounded-xl bg-gradient-to-r from-fuchsia-600 to-amber-500 py-2 font-display"
              >
                Enter — keep it
              </button>
              <button
                type="button"
                onClick={props.onCancelPlace}
                className="rounded-xl border border-white/20 px-3 py-2 text-xs uppercase tracking-wider"
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
                <button type="button" onClick={() => props.onDelete(item.id)} className="text-amber-200">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
