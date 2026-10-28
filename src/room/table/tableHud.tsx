import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MARKER_H, MARKER_KINDS, MARKER_LABEL, MARKER_W, drawMarker, onMarkerArt, type MarkerKind } from './battleshipMarkers';
import { typeCharMs, typedCount } from './cluePace';
import { bottomCardLimit, cardCrossesTable } from './tableCard';
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

/** A small pick in a row, e.g. one title deed. */
export interface HudChip {
  label: string;
  onClick: () => void;
  /** Picked or showing now. */
  active?: boolean;
  /** A colour dot before the label, e.g. the deed's colour group. */
  swatch?: string;
  /** Greyed, e.g. a mortgaged deed. */
  muted?: boolean;
}

export interface HudModel {
  title: string;
  note: string;
  onLeave: () => void;
  actions: HudAction[];
  /** Labelled rows of chips between the note and the buttons. */
  lists?: { label: string; chips: HudChip[] }[];
  /** Small print under the note, e.g. cash on hand. */
  detail?: string;
  /** Clue types the note. Other tables leave it off. */
  typed?: boolean;
  /** Sit below the toys when the card would cover the middle of the table. */
  dock?: 'bottom';
  /** A corner key that stays readable no matter the camera or the room lights. */
  legend?: 'battleship';
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
  const [viewport, setViewport] = useState(readViewport);
  useEffect(() => {
    const onResize = () => setViewport(readViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  if (!model) return null;
  const low = model.dock === 'bottom' && cardCrossesTable(viewport.w);
  // Camera row is 31px, `bottom-3` is 12px, and the card keeps 8px above that row.
  const limit = bottomCardLimit(viewport.h, crouched ? 51 : 12);
  const pill =
    'pointer-events-auto rounded-xl border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/85 backdrop-blur hover:bg-black/80 active:scale-95';
  const card = (
    <div
      data-ui="table"
      data-table-dock={low ? 'bottom' : 'top'}
      style={low ? { maxHeight: limit } : undefined}
      className="pointer-events-auto overflow-y-auto rounded-2xl border border-white/15 bg-black/75 px-4 py-3 text-white shadow-2xl backdrop-blur"
    >
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
          className="min-h-11 shrink-0 rounded-xl bg-amber-400 px-3 text-[11px] font-black uppercase tracking-wider text-black"
        >
          Pack up
        </button>
      </div>
      {model.lists?.map(list => (
        <div key={list.label} className="mt-2.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">{list.label}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {list.chips.length === 0 && <span className="text-[11px] text-white/40">Nothing</span>}
            {list.chips.map(chip => (
              <button
                key={chip.label}
                type="button"
                onClick={chip.onClick}
                aria-pressed={chip.active}
                className={`flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-bold ${
                  chip.active ? 'bg-amber-400 text-black' : 'border border-white/20 bg-white/10 text-white'
                } ${chip.muted && !chip.active ? 'opacity-55' : ''}`}
              >
                {chip.swatch && <span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-black/40" style={{ background: chip.swatch }} />}
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="mt-3 flex flex-wrap gap-2">
        {model.actions.map(action => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={`min-h-11 rounded-xl px-3 text-xs font-bold ${
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
            className="min-h-11 rounded-xl border border-white/20 bg-white/5 px-3 text-xs font-bold text-white/80"
          >
            {crouched ? 'Stand up (Space)' : 'Back to the table'}
          </button>
        )}
      </div>
    </div>
  );
  const pills = crouched && (
    <div data-ui="table" className="pointer-events-none flex flex-wrap items-center gap-1.5">
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
  );
  const legend = model.legend === 'battleship' ? <BattleshipKey /> : null;
  if (low) {
    return (
      <div className="pointer-events-none absolute bottom-3 right-3 z-30 flex w-[min(23rem,calc(100vw-1.5rem))] flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
        {legend}
        {card}
        {pills}
      </div>
    );
  }
  return (
    <>
      {legend}
      <div className="pointer-events-none absolute right-3 top-16 z-30 w-[min(23rem,calc(100vw-1.5rem))] pt-[env(safe-area-inset-top)]">
        {card}
      </div>
      {pills && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-30 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
          {pills}
        </div>
      )}
    </>
  );
}

/** One marker drawn by the same code that draws the pegs on the table. */
function MarkerIcon({ kind }: { kind: MarkerKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => {
      const g = ref.current?.getContext('2d');
      if (g) drawMarker(g, kind);
    };
    draw();
    return onMarkerArt(draw);
  }, [kind]);
  return <canvas ref={ref} width={MARKER_W} height={MARKER_H} className="h-9 w-6 shrink-0" aria-hidden />;
}

function BattleshipKey() {
  return (
    <div
      data-ui="table-key"
      className="pointer-events-none fixed bottom-16 left-3 z-30 rounded-2xl border border-white/30 bg-black/80 px-3 py-2 text-white shadow-xl"
    >
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-100">Key</p>
      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
        {MARKER_KINDS.map(kind => (
          <span key={kind} className="flex items-center gap-1.5 text-[11px] font-bold">
            <MarkerIcon kind={kind} />
            {MARKER_LABEL[kind]}
          </span>
        ))}
      </div>
    </div>
  );
}

function readViewport() {
  if (typeof window === 'undefined') return { w: 1280, h: 800 };
  return { w: window.innerWidth, h: window.innerHeight };
}
