import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { netProgress, onNetProgress, type NetProgress } from '../engine/netQueue';

/**
 * How far the room's download is, for the title screen, the wait after Play
 * and the cover after a reload. The numbers come from the model download line
 * (src/engine/netQueue.ts).
 */

/** Quiet this long with everything in before the room counts as loaded. */
const SETTLE_MS = 700;
/** No new bytes for this long and the player may go in without waiting. */
const STALL_MS = 20_000;

export function useNetProgress(): NetProgress {
  return useSyncExternalStore(onNetProgress, netProgress, netProgress);
}

/** 0..1, by bytes when the sizes are known, by files otherwise. */
export function loadedShare(p: NetProgress) {
  if (p.total > 0) return Math.min(1, p.loaded / p.total);
  return p.files ? p.done / p.files : 0;
}

/**
 * True once everything the room asked for is in. It stays true: something
 * downloaded later (a game's pieces) has its own loading, not this one.
 * `stalled` turns on if nothing has arrived for a while, so nobody is ever
 * stuck behind a bar that won't move.
 */
export function useRoomReady() {
  const p = useNetProgress();
  const [ready, setReady] = useState(false);
  const [stalled, setStalled] = useState(false);
  const lastMove = useRef({ at: Date.now(), key: '' });

  const settled = p.open && p.idle && p.files > 0;
  useEffect(() => {
    if (ready || !settled) return;
    const id = window.setTimeout(() => setReady(true), SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [ready, settled]);

  const key = `${p.loaded}/${p.done}/${p.files}`;
  if (key !== lastMove.current.key) lastMove.current = { at: Date.now(), key };
  useEffect(() => {
    if (ready) return;
    const id = window.setInterval(() => setStalled(Date.now() - lastMove.current.at > STALL_MS), 1000);
    return () => window.clearInterval(id);
  }, [ready]);

  return { ready, stalled: stalled && !ready, progress: p };
}

const mb = (bytes: number) => (bytes / 1e6).toFixed(bytes < 1e7 ? 1 : 0);

/** The bar and the line under it. */
export function LoadingMeter({ progress, label = 'Loading the room' }: { progress: NetProgress; label?: string }) {
  const share = loadedShare(progress);
  const pct = Math.floor(share * 100);
  return (
    <div className="flex w-[min(22rem,80vw)] flex-col items-center gap-2" style={{ fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-white/15"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="h-full rounded-full bg-amber-200/90 transition-[width] duration-300 ease-out" style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">
        {label} · {pct}%
        {progress.total > 0 && (
          <span className="text-white/45">
            {' '}
            · {mb(progress.loaded)} of {mb(progress.total)} MB
          </span>
        )}
      </p>
      {progress.failed > 0 && <p className="text-[10px] text-amber-200/70">Retrying a piece that didn't come through…</p>}
    </div>
  );
}

/**
 * Over the room after a reload (the title is skipped and you come back where
 * you were): the room stays covered until it's all in, instead of filling in
 * around you.
 */
export function RoomLoadingCover() {
  const { ready, stalled, progress } = useRoomReady();
  const [gone, setGone] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const up = !ready && !skipped;
  useEffect(() => {
    if (up) return;
    const id = window.setTimeout(() => setGone(true), 700);
    return () => window.clearTimeout(id);
  }, [up]);
  if (gone) return null;
  return (
    <div
      className="absolute inset-0 z-[85] flex flex-col items-center justify-center gap-5 bg-[#0b0710]"
      style={{ opacity: up ? 1 : 0, transition: 'opacity 650ms ease-in-out', pointerEvents: up ? 'auto' : 'none' }}
    >
      <LoadingMeter progress={progress} />
      {stalled && (
        <button
          type="button"
          onClick={() => setSkipped(true)}
          className="rounded-full border border-white/30 bg-white/[0.08] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80 hover:bg-white/[0.16]"
          style={{ fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}
        >
          Go in anyway
        </button>
      )}
    </div>
  );
}
