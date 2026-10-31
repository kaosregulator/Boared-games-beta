import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { netProgress, onNetProgress, type NetProgress } from '../engine/netQueue';
import { onRoomPrep, roomPrepared } from '../engine/roomPrep';

/**
 * How far the room's loading is, for the title screen, the wait after Play
 * and the cover after a reload. The bytes come from the model download line
 * (src/engine/netQueue.ts); after the bytes, the models still have to be
 * parsed, placed, compiled and sent to the GPU (src/engine/roomPrep.ts).
 */

/** Quiet this long with everything in before the room counts as loaded. */
const SETTLE_MS = 700;
/** No new bytes for this long and the player may go in without waiting. */
const STALL_MS = 20_000;
/**
 * Longest the room waits, after the last byte, for parsing and the GPU
 * warm-up. A slow GPU without parallel shader compile can take a while; past
 * this the room opens anyway and the first-draw gate covers the rest.
 */
const PREP_MAX_MS = 15_000;

export function useNetProgress(): NetProgress {
  return useSyncExternalStore(onNetProgress, netProgress, netProgress);
}

/** Every model asked for is parsed, in the scene, compiled and on the GPU. */
export function useRoomPrepared(): boolean {
  return useSyncExternalStore(onRoomPrep, roomPrepared, roomPrepared);
}

/** 0..1, by bytes when the sizes are known, by files otherwise. */
export function loadedShare(p: NetProgress) {
  if (p.total > 0) return Math.min(1, p.loaded / p.total);
  return p.files ? p.done / p.files : 0;
}

/**
 * True once everything the room asked for is in and ready to draw: downloaded,
 * then parsed, placed, compiled and uploaded (or PREP_MAX_MS after the last
 * byte, whichever comes first). It stays true: something downloaded later (a
 * game's pieces) has its own loading, not this one. `preparing` is the part
 * after the downloads. `stalled` turns on if nothing has arrived for a while,
 * or a model gave up after its retries, so nobody is ever stuck behind a bar
 * that won't move.
 */
export function useRoomReady() {
  const p = useNetProgress();
  const prepared = useRoomPrepared();
  const [downloaded, setDownloaded] = useState(false);
  const [prepTimedOut, setPrepTimedOut] = useState(false);
  const [stalled, setStalled] = useState(false);
  const lastMove = useRef({ at: Date.now(), key: '' });

  // A model that never came (after its retries) keeps the room covered: the
  // player gets "Go in anyway" at once instead of a room with a hole in it.
  const settled = p.open && p.idle && p.files > 0 && p.failed === 0;
  const gaveUp = p.open && p.idle && p.failed > 0;
  useEffect(() => {
    if (downloaded || !settled) return;
    const id = window.setTimeout(() => setDownloaded(true), SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [downloaded, settled]);
  useEffect(() => {
    if (!downloaded || prepTimedOut) return;
    const id = window.setTimeout(() => setPrepTimedOut(true), PREP_MAX_MS);
    return () => window.clearTimeout(id);
  }, [downloaded, prepTimedOut]);

  const [ready, setReady] = useState(false);
  const nowReady = downloaded && (prepared || prepTimedOut);
  useEffect(() => {
    if (nowReady && !ready) setReady(true);
  }, [nowReady, ready]);

  const key = `${p.loaded}/${p.done}/${p.files}`;
  if (key !== lastMove.current.key) lastMove.current = { at: Date.now(), key };
  useEffect(() => {
    if (ready) return;
    const id = window.setInterval(() => setStalled(Date.now() - lastMove.current.at > STALL_MS), 1000);
    return () => window.clearInterval(id);
  }, [ready]);

  const isReady = ready || nowReady;
  return { ready: isReady, preparing: downloaded && !isReady, stalled: (stalled || gaveUp) && !isReady, progress: p };
}

const mb = (bytes: number) => (bytes / 1e6).toFixed(bytes < 1e7 ? 1 : 0);

/** The bar and the line under it. `ready` fills it and says so (the title screen keeps it up once the room is in). */
export function LoadingMeter({
  progress,
  label = 'Loading the room',
  ready = false,
  preparing = false,
  className = 'w-[min(22rem,80vw)]',
  lineClassName = 'tracking-[0.24em]',
}: {
  progress: NetProgress;
  label?: string;
  ready?: boolean;
  /** Downloaded; parsing, compiling and uploading to the GPU. */
  preparing?: boolean;
  className?: string;
  lineClassName?: string;
}) {
  const pct = ready || preparing ? 100 : Math.floor(loadedShare(progress) * 100);
  return (
    <div className={`flex flex-col items-center gap-2 ${className}`} style={{ fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}>
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
      <p className={`text-center text-[10px] font-semibold uppercase text-white/70 ${lineClassName}`}>
        {ready ? 'Room ready' : preparing ? 'Preparing the room' : `${label} · ${pct}%`}
        {!ready && !preparing && progress.total > 0 && (
          <span className="text-white/45">
            {' '}
            · {mb(progress.loaded)}/{mb(progress.total)} MB
          </span>
        )}
      </p>
      {progress.failed > 0 && progress.idle && (
        <p className="text-[10px] text-amber-200/70">
          {progress.failed === 1 ? 'One piece' : `${progress.failed} pieces`} of the room didn't come through. Refresh to try again.
        </p>
      )}
    </div>
  );
}

/**
 * Over the room after a reload (the title is skipped and you come back where
 * you were): the room stays covered until it's all in, instead of filling in
 * around you.
 */
export function RoomLoadingCover() {
  const { ready, preparing, stalled, progress } = useRoomReady();
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
      <LoadingMeter progress={progress} preparing={preparing} />
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
