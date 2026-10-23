import React, { useEffect, useRef, useState } from 'react';
import { resolveArchive } from '../../tv/archive';

/** A still that comes into focus on a timer. Answering snaps it clear. */
export function FadePicture({
  src,
  alt,
  credit,
  seconds,
  revealed,
  fill = false,
}: {
  src: string;
  alt: string;
  credit: string;
  seconds: number;
  revealed: boolean;
  /** Stretch to the card on the table. */
  fill?: boolean;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    if (revealed) return;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const next = Math.min(1, (now - started) / (seconds * 1000));
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [src, seconds, revealed]);

  const shown = revealed ? 1 : progress;
  // Ease the last part so the subject arrives late, the way a memory does.
  const eased = shown * shown * (3 - 2 * shown);

  return (
    <figure className={`w-full overflow-hidden bg-black ${fill ? 'h-full' : 'rounded-2xl border border-amber-200/30'}`}>
      <div className={`relative w-full ${fill ? 'h-full' : 'h-44 sm:h-52'}`}>
        <img
          key={src}
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: 0.08 + eased * 0.92,
            filter: `blur(${(1 - eased) * 18}px) saturate(${0.2 + eased * 0.8}) brightness(${0.35 + eased * 0.65})`,
            transform: `scale(${1.08 - eased * 0.08})`,
          }}
        />
        {!revealed && (
          <div className={fill
            ? 'absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-left'
            : 'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-left'}>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
              Coming into focus · {Math.round(eased * 100)}%
            </p>
          </div>
        )}
        {fill && (
          <figcaption className="absolute right-2 top-2 max-w-[40%] truncate rounded-full bg-black/45 px-2 py-0.5 text-[9px] text-white/70">
            {credit}
          </figcaption>
        )}
      </div>
      {!fill && <figcaption className="px-3 py-1.5 text-[9px] leading-snug text-white/55">{credit}</figcaption>}
    </figure>
  );
}

/** Start a clip at `start` and stop it at `end`, so only the few seconds the question is about play. */
function trimHandlers(start?: number, end?: number) {
  return {
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLMediaElement>) => {
      if (start) e.currentTarget.currentTime = start;
    },
    onTimeUpdate: (e: React.SyntheticEvent<HTMLMediaElement>) => {
      const el = e.currentTarget;
      if (end && el.currentTime >= end) {
        el.pause();
        el.currentTime = start ?? 0;
      }
    },
  };
}

/**
 * A real recording from the Internet Archive (NASA, a modem), shown as a
 * tape in a boombox. Streams from archive.org; nothing is stored here.
 */
export function ArchiveSound({
  archiveId,
  title,
  credit,
  file,
  start,
  end,
}: {
  archiveId: string;
  title: string;
  credit: string;
  file?: string;
  start?: number;
  end?: number;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [missed, setMissed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let dead = false;
    setUrl(null);
    setMissed(false);
    resolveArchive(archiveId, 'audio', file).then(found => {
      if (dead) return;
      if (!found) setMissed(true);
      else setUrl(found.url);
    });
    return () => {
      dead = true;
    };
  }, [archiveId, file]);

  useEffect(() => {
    const node = ref.current;
    if (!node || !url) return;
    void node.play().catch(() => setPlaying(false));
  }, [url]);

  const replay = () => {
    const node = ref.current;
    if (!node) return;
    node.currentTime = start ?? 0;
    void node.play().catch(() => {});
  };

  return (
    <div className="tt-boombox">
      <div className="tt-boombox-speaker" data-on={playing || undefined} />
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
        <div className="tt-cassette">
          <span className="tt-cassette-label">{title}</span>
          <span className="tt-reel" data-on={playing || undefined} />
          <span className="tt-reel" data-on={playing || undefined} />
        </div>
        {url && (
          <audio
            key={url}
            ref={ref}
            src={url}
            data-throwback-cue="true"
            preload="auto"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onError={() => setMissed(true)}
            {...trimHandlers(start, end)}
          />
        )}
        <button type="button" onClick={replay} disabled={!url} className="tt-key">
          {missed ? 'Tape is missing' : !url ? 'Finding the tape…' : playing ? '▶ Playing' : '▶ Play it again'}
        </button>
        <p className="max-w-full truncate text-[9px] text-[#3a2a1a]/70">{credit}</p>
      </div>
      <div className="tt-boombox-speaker" data-on={playing || undefined} />
    </div>
  );
}

/** A short commercial from the Internet Archive. The room is already quiet. */
export function ArchiveClip({
  archiveId,
  title,
  file,
  start,
  end,
  fill = false,
}: {
  archiveId: string;
  title: string;
  file?: string;
  start?: number;
  end?: number;
  fill?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [missed, setMissed] = useState(false);
  const [needTap, setNeedTap] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let dead = false;
    setUrl(null);
    setMissed(false);
    setNeedTap(false);
    resolveArchive(archiveId, 'video', file).then(found => {
      if (dead) return;
      if (!found) setMissed(true);
      else setUrl(found.url);
    });
    return () => {
      dead = true;
    };
  }, [archiveId, file]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || !url) return;
    void node.play().catch(() => setNeedTap(true));
  }, [url]);

  return (
    <figure className={`w-full overflow-hidden bg-black ${fill ? 'flex h-full flex-col' : 'rounded-2xl border border-amber-200/30'}`}>
      <div className={`relative w-full bg-black ${fill ? 'min-h-0 flex-1' : 'aspect-video'}`}>
        {url ? (
          <video
            key={url}
            data-throwback-cue="true"
            src={url}
            playsInline
            controls
            autoPlay
            className="h-full w-full object-contain"
            onPlay={() => setNeedTap(false)}
            onError={() => setMissed(true)}
            {...trimHandlers(start, end)}
            ref={videoRef}
          />
        ) : (
          <div className="flex h-full min-h-28 items-center justify-center px-4 text-center text-[11px] text-amber-100/80">
            {missed ? 'That tape is not on the shelf right now. Guess from the question.' : 'Finding the tape on the Internet Archive…'}
          </div>
        )}
        {needTap && url && (
          <p className="pointer-events-none absolute inset-x-0 bottom-8 text-center text-[10px] font-bold uppercase tracking-wider text-amber-200">
            Press play — the browser wants a tap
          </p>
        )}
        {fill && (
          <figcaption className="pointer-events-none absolute left-2 top-2 max-w-[70%] truncate rounded-full bg-black/50 px-2 py-0.5 text-[9px] text-white/75">
            {title} · Internet Archive
          </figcaption>
        )}
      </div>
      {!fill && <figcaption className="px-3 py-1.5 text-[9px] text-white/55">{title} · Internet Archive</figcaption>}
    </figure>
  );
}
