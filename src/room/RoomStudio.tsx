import React from 'react';
import { ANCHORS } from './anchors';
import { MOOD_LABEL, type RoomMood } from './moods';

interface RoomStudioProps {
  open: boolean;
  mood: RoomMood;
  music: boolean;
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
  onFile: (file: File) => void;
  onAnchor: (id: string) => void;
  onHeight: (n: number) => void;
  onLift: (n: number) => void;
  onShadow: (on: boolean) => void;
  onCommit: () => void;
  onCancelPlace: () => void;
  onDelete: (id: string) => void;
}

/** Pause menu: mood, music, and anchored GLB placement. */
export function RoomStudio(props: RoomStudioProps) {
  if (!props.open) return null;
  return (
    <div className="absolute left-4 top-16 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-3xl border border-white/25 bg-[#140c14]/75 text-white shadow-2xl backdrop-blur-2xl">
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

        <label className="flex items-center justify-between gap-3 rounded-xl bg-black/30 border border-white/10 px-3 py-2">
          <span>Nostalgia music</span>
          <input type="checkbox" checked={props.music} onChange={e => props.onMusic(e.target.checked)} />
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
