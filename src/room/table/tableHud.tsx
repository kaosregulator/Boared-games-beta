import React, { useEffect, useState } from 'react';

/**
 * DOM side of a match at the table. Kept outside the canvas so a <p> never
 * reaches the WebGL reconciler; the 3D match pushes its state in here.
 */

export interface HudAction {
  label: string;
  onClick: () => void;
  tone?: 'amber' | 'ghost';
}

export interface HudModel {
  title: string;
  note: string;
  onLeave: () => void;
  actions: HudAction[];
  /** Small print under the note, e.g. cash on hand. */
  detail?: string;
}

let hudModel: HudModel | null = null;
const hudSubs = new Set<(model: HudModel | null) => void>();

export function pushHud(next: HudModel | null) {
  hudModel = next;
  hudSubs.forEach(fn => fn(next));
}

export function TableHudOverlay({
  crouched,
  onStand,
  onCrouch,
}: {
  crouched: boolean;
  onStand: () => void;
  onCrouch: () => void;
}) {
  const [model, setModel] = useState<HudModel | null>(hudModel);
  useEffect(() => {
    hudSubs.add(setModel);
    setModel(hudModel);
    return () => {
      hudSubs.delete(setModel);
    };
  }, []);
  if (!model) return null;
  return (
    <div className="pointer-events-none absolute right-4 top-16 z-30 w-[min(23rem,calc(100vw-7rem))]">
      <div data-ui="table" className="pointer-events-auto rounded-2xl border border-white/15 bg-black/75 px-4 py-3 text-white shadow-2xl backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">{model.title}</p>
            <p className="mt-1 text-sm text-white/90">{model.note}</p>
            {model.detail && <p className="mt-1 text-[11px] text-white/60">{model.detail}</p>}
          </div>
          <button
            type="button"
            onClick={model.onLeave}
            className="shrink-0 rounded-xl bg-amber-400 px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-black"
          >
            Pack up
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {model.actions.map(action => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                action.tone === 'ghost' ? 'border border-white/20 bg-white/10 text-white' : 'bg-amber-400 text-black'
              }`}
            >
              {action.label}
            </button>
          ))}
          <button
            type="button"
            onClick={crouched ? onStand : onCrouch}
            className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80"
          >
            {crouched ? 'Stand up (Space)' : 'Crouch back at the table'}
          </button>
        </div>
      </div>
    </div>
  );
}
