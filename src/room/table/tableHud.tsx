import React, { useEffect, useLayoutEffect, useState } from 'react';
import { typeCharMs, typedCount } from './cluePace';
import { PRESET_LABEL, cyclePreset, resetUserView, setFollow, useTableCam } from './tableCam';

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
  /** Clue types the note. Other tables leave it off. */
  typed?: boolean;
}

let hudModel: HudModel | null = null;
const hudSubs = new Set<(model: HudModel | null) => void>();

export function pushHud(next: HudModel | null) {
  hudModel = next;
  hudSubs.forEach(fn => fn(next));
}

/** About 0.7 s for a whole line. A short line does not crawl. Reduced motion shows it at once. */
function TypedLine({ text, typed }: { text: string; typed?: boolean }) {
  // Start empty when the line will type, so the first paint is not the whole sentence.
  const [count, setCount] = useState(() => (typed ? 0 : text.length));
  useLayoutEffect(() => {
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!typed || reduce || typeCharMs(text.length) === 0) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const step = typeCharMs(text.length);
    const started = performance.now();
    let id = 0;
    id = window.setInterval(() => {
      const n = typedCount(performance.now() - started, text.length);
      setCount(n);
      if (n >= text.length) window.clearInterval(id);
    }, step);
    return () => window.clearInterval(id);
  }, [text, typed]);
  return <>{text.slice(0, count)}</>;
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
  const cam = useTableCam();
  const [open, setOpen] = useState(true);
  if (!model) return null;
  const pill =
    'pointer-events-auto rounded-xl border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/85 backdrop-blur hover:bg-black/80 active:scale-95';
  return (
    <>
      <div className="pointer-events-none absolute right-3 top-16 z-30 w-[min(23rem,calc(100vw-1.5rem))] pt-[env(safe-area-inset-top)]">
        <div data-ui="table" className="pointer-events-auto rounded-2xl border border-white/15 bg-black/75 px-4 py-3 text-white shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <button type="button" onClick={() => setOpen(o => !o)} className="min-w-0 text-left" aria-expanded={open}>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200">
                {model.title} <span className="text-white/40">{open ? '▾' : '▸'}</span>
              </p>
              <p className={`mt-1 text-sm leading-snug text-white/90 ${open ? '' : 'line-clamp-2'}`}>
                <TypedLine text={model.note} typed={model.typed} />
              </p>
              {open && model.detail && <p className="mt-1 text-[11px] text-white/60">{model.detail}</p>}
            </button>
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
            {open && (
              <button
                type="button"
                onClick={crouched ? onStand : onCrouch}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80"
              >
                {crouched ? 'Stand up (Space)' : 'Back to the table'}
              </button>
            )}
          </div>
        </div>
      </div>
      {crouched && (
        <div
          data-ui="table"
          className="pointer-events-none absolute bottom-3 left-3 z-30 flex flex-wrap items-center gap-1.5 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]"
        >
          <button type="button" onClick={cyclePreset} className={pill} title="Step through the camera views (V)">
            ◎ {PRESET_LABEL[cam.preset]}
          </button>
          <button
            type="button"
            onClick={() => setFollow(!cam.follow)}
            className={`${pill} ${cam.follow ? '!text-amber-200' : ''}`}
            title="Swing the camera to show each move"
          >
            {cam.follow ? '● Follow action' : '○ Follow action'}
          </button>
          <button type="button" onClick={resetUserView} className={pill} title="Back to the game's view">
            ⟲
          </button>
          <span className="hidden rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/60 sm:inline">
            Drag to orbit · scroll or pinch to zoom · V views
          </span>
        </div>
      )}
    </>
  );
}
