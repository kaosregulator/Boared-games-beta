import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameMetadata } from '../types';
import type { CardVideo, PropCard } from './propCards';
import { GAME_PHOTOS } from './gamePhotos';
import { BookOpen, ChevronLeft, ChevronRight, Maximize2, Play, X } from 'lucide-react';
import { capsule, setCapsuleStage, useCapsulePiece } from './capsule/capsuleBus';
import './holoCard.css';

/** Board games that already have a real in-room engine vs coming-soon shells. */
const ONLINE_READY = new Set([
  'monopoly',
  'clue',
  'yahtzee',
  'checkers',
  'chess',
  'connect4',
  'gofish',
  'poker',
  'blackjack',
  'battleship',
  'life',
  'pawnrush',
  'guesswho',
  'mousetrap',
]);

type Tab = 'history' | 'video' | 'images';

interface Shot {
  src: string;
  credit: string;
  alt: string;
}

interface GameCardProps {
  kind: 'game';
  game: GameMetadata;
  /** Left out for the box beside the table: that game is already being played. */
  onPlay?: () => void;
  onRules: () => void;
  onClose: () => void;
}

interface PropCardProps {
  kind: 'prop';
  prop: PropCard;
  onClose: () => void;
  /** The card's own action: turn on the TV, sit down with the Game Boy... */
  onAction?: () => void;
  /** An old commercial started or stopped, so the room music can step aside. */
  onVideo?: (playing: boolean) => void;
}

export type MemoryFlashCardProps = GameCardProps | PropCardProps;

/**
 * Every card in the room is a time capsule: the real thing, cut out of the
 * room and turning as a blue hologram over a little projector, with a
 * holographic card sliding out beside it. History, Video and Images are tabs
 * on the card; History has pages.
 */
export function MemoryFlashCard(props: MemoryFlashCardProps) {
  if (props.kind === 'game') {
    const g = props.game;
    const photo = GAME_PHOTOS[g.id];
    const online = ONLINE_READY.has(g.id);
    return (
      <Capsule
        title={g.title}
        kindLine={[g.subtitle || 'Board game', online ? 'Plays in the room' : 'Coming soon']}
        pages={[
          {
            story: { label: 'The Game', text: g.description },
            facts: [
              { label: 'Players', value: g.players },
              { label: 'Takes', value: g.duration },
              ...(g.rating ? [{ label: 'Rated', value: g.rating }] : []),
            ],
          },
          { list: { label: 'How It Plays', items: g.rules } },
        ]}
        photos={photo ? [{ src: photo.src, credit: photo.credit, alt: g.title }] : []}
        onClose={props.onClose}
        primary={props.onPlay ? { label: 'Play', onClick: props.onPlay } : { label: 'Already on the table' }}
        secondary={{ label: 'Rules', onClick: props.onRules }}
      />
    );
  }
  const prop = props.prop;
  const pages: Page[] = [];
  const kindLine = [prop.kind, prop.year ?? prop.era, prop.maker].filter((x): x is string => !!x);
  if (prop.history) {
    pages.push({ joke: prop.joke, story: { label: 'The Real Story', text: prop.history }, facts: prop.facts });
    pages.push({ story: { label: 'In This Room', text: prop.story }, list: prop.memories.length ? { label: 'You Had To Be There', items: prop.memories } : undefined });
  } else {
    pages.push({ joke: prop.joke, story: { label: 'The Story', text: prop.story }, facts: prop.facts });
    if (prop.memories.length) pages.push({ list: { label: 'You Had To Be There', items: prop.memories } });
  }
  return (
    <Capsule
      title={prop.title}
      kindLine={kindLine.length ? kindLine : [prop.era]}
      pages={pages}
      photos={(prop.photos ?? []).map(photo => ({ src: photo.src, credit: photo.credit, alt: photo.alt }))}
      video={prop.video}
      onVideo={props.onVideo}
      onClose={props.onClose}
      primary={props.onAction && prop.action ? { label: prop.action.label, onClick: props.onAction } : undefined}
    />
  );
}

interface Page {
  joke?: string;
  story?: { label: string; text: string };
  facts?: { label: string; value: string }[];
  list?: { label: string; items: string[] };
}

function initials(title: string) {
  const words = title.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w && !/^(the|a|an|of|and)$/i.test(w));
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase();
}

function Capsule({
  title,
  kindLine,
  pages,
  photos,
  video,
  onVideo,
  onClose,
  primary,
  secondary,
}: {
  title: string;
  kindLine: string[];
  pages: Page[];
  photos: Shot[];
  video?: CardVideo;
  onVideo?: (playing: boolean) => void;
  onClose: () => void;
  primary?: { label: string; onClick?: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  const [tab, setTab] = useState<Tab>('history');
  const [page, setPage] = useState(0);
  const piece = useCapsulePiece();
  const stageWrap = useRef<HTMLDivElement>(null);
  // Images can show the hologram big, in the card: then the projector beside it steps aside.
  const [bigPiece, setBigPiece] = useState(false);
  const showBig = tab === 'images' && (bigPiece || !photos.length) && piece === true;
  const at = Math.min(page, pages.length - 1);
  const current = pages[at];

  return (
    <div
      data-ui="card"
      className="hc pointer-events-auto"
      role="dialog"
      aria-label={`${title} time capsule`}
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
      onContextMenu={e => e.preventDefault()}
    >
      <Beam to={stageWrap} />
      <div className="hc-proj" ref={stageWrap} data-off={showBig ? '1' : '0'}>
        {!showBig && <Stage className="hc-stage" />}
        {piece === false && <span className="hc-proj-note">{title}</span>}
        {piece === null && <span className="hc-proj-note">Tuning in…</span>}
      </div>

      <section className="hc-card">
        <header className="hc-head">
          <span className="hc-badge" aria-hidden>
            {initials(title)}
          </span>
          <div className="hc-titles">
            <p className="hc-kind">{kindLine.join(' • ')}</p>
            <h3 className="hc-title">{title}</h3>
          </div>
          <button type="button" className="hc-x" aria-label="Close the capsule" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </header>

        <nav className="hc-tabs" role="tablist">
          {(['history', 'video', 'images'] as const).map(id => {
            const off = id === 'video' ? !video : id === 'images' ? !photos.length && piece !== true : false;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                disabled={off}
                data-on={tab === id ? '1' : '0'}
                className="hc-tab"
                onClick={() => setTab(id)}
              >
                {id}
              </button>
            );
          })}
        </nav>

        <div className="hc-body" key={`${tab}-${at}`}>
          {tab === 'history' && current && (
            <>
              {current.joke && (
                <div className="hc-tip">
                  <p className="hc-label">Childhood Pro Tip</p>
                  <p className="hc-joke">{current.joke}</p>
                </div>
              )}
              {current.story && (
                <div className="hc-block">
                  <p className="hc-label">{current.story.label}</p>
                  <p className="hc-text">{current.story.text}</p>
                </div>
              )}
              {current.facts && current.facts.length > 0 && (
                <dl className="hc-facts">
                  {current.facts.map(f => (
                    <div key={f.label}>
                      <dt>{f.label}</dt>
                      <dd>{f.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {current.list && (
                <div className="hc-block">
                  <p className="hc-label">{current.list.label}</p>
                  <ul className="hc-list">
                    {current.list.items.map(line => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
          {tab === 'video' && video && <Tape video={video} onVideo={onVideo} title={title} />}
          {tab === 'images' && <Gallery photos={photos} piece={piece === true} big={showBig} onPiece={setBigPiece} />}
        </div>

        {(primary || secondary) && (
          <div className="hc-actions">
            {primary?.onClick ? (
              <button type="button" className="hc-play" onClick={primary.onClick}>
                {primary.label}
              </button>
            ) : primary ? (
              <span className="hc-kind">{primary.label}</span>
            ) : null}
            {secondary && (
              <button type="button" className="hc-ghost" onClick={secondary.onClick}>
                <BookOpen className="h-3.5 w-3.5" />
                {secondary.label}
              </button>
            )}
          </div>
        )}

        <footer className="hc-foot">
          {tab === 'history' && pages.length > 1 ? (
            <span className="hc-pages">
              <button type="button" aria-label="Previous page" disabled={at === 0} onClick={() => setPage(at - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              Page {at + 1} / {pages.length}
              <button type="button" aria-label="Next page" disabled={at >= pages.length - 1} onClick={() => setPage(at + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </span>
          ) : (
            <span />
          )}
          <button type="button" className="hc-exit" onClick={onClose}>
            ESC • EXIT
          </button>
        </footer>
      </section>
    </div>
  );
}

/** A real photo, or an empty pane. */
function Photo({ shot, children }: { shot?: Shot; children?: React.ReactNode }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [shot?.src]);
  return (
    <figure className="hc-frame">
      {shot && !broken ? (
        <img src={shot.src} alt={shot.alt} draggable={false} onError={() => setBroken(true)} />
      ) : (
        <span className="hc-empty">{shot?.alt ?? ''}</span>
      )}
      {shot && !broken && <figcaption>{shot.credit}</figcaption>}
      {children}
    </figure>
  );
}

/** The window the real piece turns in (drawn by the room, behind the page). */
function Stage({ className, caption, children }: { className?: string; caption?: string; children?: React.ReactNode }) {
  const ref = useCallback((el: HTMLDivElement | null) => setCapsuleStage(el), []);
  if (className) return <div ref={ref} className={className} />;
  return (
    <figure className="hc-frame hc-frame--stage">
      <div ref={ref} className="hc-stage-in" />
      {caption && <figcaption>{caption}</figcaption>}
      {children}
    </figure>
  );
}

/** The real photos, then the real piece turning big: next and back go round. */
function Gallery({ photos, piece, big, onPiece }: { photos: Shot[]; piece: boolean; big: boolean; onPiece: (on: boolean) => void }) {
  const count = photos.length + (piece ? 1 : 0);
  const [at, setAt] = useState(0);
  useEffect(() => onPiece(at >= photos.length), [at, photos.length, onPiece]);
  useEffect(() => () => onPiece(false), [onPiece]);
  const go = (d: number) => setAt(i => (i + d + count) % count);
  const nav = count > 1 && (
    <>
      <button type="button" className="hc-nav hc-nav--prev" aria-label="Back" onClick={() => go(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" className="hc-nav hc-nav--next" aria-label="Next" onClick={() => go(1)}>
        <ChevronRight className="h-4 w-4" />
      </button>
      <span className="hc-count">
        {at + 1} / {count}
      </span>
    </>
  );
  if (at < photos.length) return <Photo shot={photos[at]}>{nav}</Photo>;
  if (!big) return null;
  return (
    <Stage caption="The real one, from this room · turning">
      {nav}
    </Stage>
  );
}

/** The old commercial, in the capsule's own screen, from the Internet Archive. */
function Tape({ video, onVideo, title }: { video: CardVideo; onVideo?: (playing: boolean) => void; title: string }) {
  const [open, setOpen] = useState(false);
  const screen = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    onVideo?.(true);
    return () => onVideo?.(false);
  }, [open, onVideo]);
  const fullScreen = () => {
    setOpen(true);
    void screen.current?.requestFullscreen?.().catch(() => undefined);
  };
  return (
    <div className="hc-player">
      <div className="hc-screen" ref={screen}>
        {open ? (
          <iframe
            title={video.title}
            src={`https://archive.org/embed/${encodeURIComponent(video.archiveId)}${video.file ? `/${video.file.split('/').map(encodeURIComponent).join('/')}` : ''}?autoplay=1`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" className="hc-poster" onClick={() => setOpen(true)} aria-label={`Play ${video.title}`}>
            <span className="hc-poster-play">
              <Play className="h-7 w-7" />
            </span>
            <span className="hc-poster-title">{video.title}</span>
            <span className="hc-poster-note">{title} · Internet Archive</span>
          </button>
        )}
      </div>
      <div className="hc-transport">
        <span>{open ? 'Playing' : 'Ready'}</span>
        <span className="hc-transport-bar">
          <i data-on={open ? '1' : '0'} />
        </span>
        {open && (
          <button type="button" onClick={() => setOpen(false)}>
            Stop
          </button>
        )}
        <button type="button" aria-label="Full screen" onClick={fullScreen}>
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/** The beam of light from the real thing up into the capsule. */
function Beam({ to }: { to: React.RefObject<HTMLDivElement | null> }) {
  const path = useRef<SVGPathElement>(null);
  const glow = useRef<SVGPathElement>(null);
  const spot = useRef<SVGEllipseElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const from = capsule.source;
      const dock = to.current?.getBoundingClientRect();
      const show = Boolean(from && dock && from.y > dock.bottom + 12);
      for (const el of [path.current, glow.current, spot.current]) el?.setAttribute('opacity', show ? '1' : '0');
      if (!show || !from || !dock) return;
      const x1 = dock.left + dock.width / 2;
      const y1 = dock.bottom;
      const midY = (y1 + from.y) / 2;
      const d = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${x1} ${midY}, ${x1} ${y1}`;
      path.current?.setAttribute('d', d);
      glow.current?.setAttribute('d', d);
      spot.current?.setAttribute('cx', String(from.x));
      spot.current?.setAttribute('cy', String(from.y));
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return (
    <svg className="hc-beam" aria-hidden>
      <defs>
        <linearGradient id="hc-beam-grad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#5fd4ff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#9be8ff" />
        </linearGradient>
      </defs>
      <path ref={glow} className="hc-beam-glow" stroke="url(#hc-beam-grad)" opacity="0" />
      <path ref={path} className="hc-beam-line" stroke="url(#hc-beam-grad)" opacity="0" />
      <ellipse ref={spot} className="hc-beam-spot" rx="26" ry="9" opacity="0" />
    </svg>
  );
}
