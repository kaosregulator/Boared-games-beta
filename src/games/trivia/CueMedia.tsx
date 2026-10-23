import React, { useEffect, useRef, useState } from 'react';
import { resolveArchive } from '../../tv/archive';

/** A still that comes into focus on a timer. Answering snaps it clear. */
export function FadePicture({
  src,
  alt,
  credit,
  seconds,
  revealed,
}: {
  src: string;
  alt: string;
  credit: string;
  seconds: number;
  revealed: boolean;
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
    <figure className="w-full overflow-hidden rounded-2xl border border-amber-200/30 bg-black">
      <div className="relative h-44 sm:h-52 w-full">
        <img
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
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
              Coming into focus · {Math.round(eased * 100)}%
            </p>
          </div>
        )}
      </div>
      <figcaption className="px-3 py-1.5 text-[9px] leading-snug text-white/55">{credit}</figcaption>
    </figure>
  );
}

/** A short commercial from the Internet Archive. The room is already quiet. */
export function ArchiveClip({ archiveId, title }: { archiveId: string; title: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [missed, setMissed] = useState(false);
  const [needTap, setNeedTap] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let dead = false;
    setUrl(null);
    setMissed(false);
    setNeedTap(false);
    resolveArchive(archiveId, 'video').then(file => {
      if (dead) return;
      if (!file) setMissed(true);
      else setUrl(file.url);
    });
    return () => {
      dead = true;
    };
  }, [archiveId]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node || !url) return;
    void node.play().catch(() => setNeedTap(true));
  }, [url]);

  return (
    <figure className="w-full overflow-hidden rounded-2xl border border-amber-200/30 bg-black">
      <div className="relative aspect-video w-full bg-black">
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
      </div>
      <figcaption className="px-3 py-1.5 text-[9px] text-white/55">{title} · Internet Archive</figcaption>
    </figure>
  );
}
