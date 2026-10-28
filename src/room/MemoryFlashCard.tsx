import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { GameMetadata } from '../types';
import type { CardVideo, PropCard } from './propCards';
import { GAME_PHOTOS } from './gamePhotos';
import { BookOpen, ChevronLeft, ChevronRight, Maximize2, Minimize2, Minus, Play, Square, X } from 'lucide-react';
import { capsule, setCapsuleStage, useCapsulePiece } from './capsule/capsuleBus';
import { capsuleLine } from './capsule/capsuleLine';
import './timeCapsule.css';

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

type Tab = 'history' | 'video' | 'images' | 'animations';

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
 * Every card in the room is a time capsule: a clear hologram of glass over the
 * room, rising out of the thing itself on a beam of light. History, Video,
 * Images and Animations sit on a glass bar underneath. Images ends on the real
 * piece of the room, cut out of the scan and turning on a stand, and that is
 * what Animations shows too.
 */
export function MemoryFlashCard(props: MemoryFlashCardProps) {
  if (props.kind === 'game') {
    const photo = GAME_PHOTOS[props.game.id];
    const online = ONLINE_READY.has(props.game.id);
    const brand = capsuleLine(props.game.id, props.game.title);
    return (
      <Capsule
        brand={{ ...brand, line: props.game.title.length <= 16 ? props.game.title : brand.line }}
        era={`${props.game.players} · ${online ? 'Plays in the room' : 'Coming soon'}`}
        headline={props.game.title}
        story={props.game.description}
        notes={props.game.rules.slice(0, 2)}
        photos={photo ? [{ src: photo.src, credit: photo.credit, alt: props.game.title }] : []}
        onClose={props.onClose}
        primary={props.onPlay ? { label: 'Play', onClick: props.onPlay } : { label: 'Already on the table' }}
        secondary={{ label: 'Rules', onClick: props.onRules }}
      />
    );
  }
  const prop = props.prop;
  return (
    <Capsule
      brand={capsuleLine(prop.id, prop.title, prop.era)}
      era={prop.era}
      headline={prop.title}
      story={prop.story}
      notes={prop.memories}
      photos={(prop.photos ?? []).map(photo => ({ src: photo.src, credit: photo.credit, alt: photo.alt }))}
      video={prop.video}
      onVideo={props.onVideo}
      onClose={props.onClose}
      primary={props.onAction && prop.action ? { label: prop.action.label, onClick: props.onAction } : undefined}
    />
  );
}

function Capsule({
  brand,
  era,
  headline,
  story,
  notes,
  photos,
  video,
  onVideo,
  onClose,
  primary,
  secondary,
}: {
  brand: { line: string; movie: boolean; bananas: boolean };
  era: string;
  headline: string;
  story: string;
  notes: string[];
  photos: Shot[];
  video?: CardVideo;
  onVideo?: (playing: boolean) => void;
  onClose: () => void;
  primary?: { label: string; onClick?: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  const [tab, setTab] = useState<Tab>(brand.movie && video ? 'video' : 'history');
  const [folded, setFolded] = useState(false);
  const [big, setBig] = useState(false);
  const piece = useCapsulePiece() === true;
  const dock = useRef<HTMLDivElement>(null);

  return (
    <div
      data-ui="card"
      data-capsule={brand.movie ? 'movie' : 'object'}
      data-big={big ? '1' : '0'}
      className="tc pointer-events-auto"
      role="dialog"
      aria-label={`${headline} time capsule`}
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
      onContextMenu={e => e.preventDefault()}
    >
      <Beam to={dock} />
      <section className="tc-glass">
        <header className="tc-head">
          <Logo brand={brand} />
          <div className="tc-win">
            <button type="button" aria-label={folded ? 'Open the capsule' : 'Fold the capsule'} onClick={() => setFolded(f => !f)}>
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label={big ? 'Smaller' : 'Bigger'} onClick={() => setBig(b => !b)}>
              {big ? <Minimize2 className="h-3 w-3" /> : <Square className="h-3 w-3" />}
            </button>
            <button type="button" aria-label="Close the capsule" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>
        <div className="tc-rule">
          <span />
          <i />
        </div>

        {!folded && (
          <div className="tc-body" data-tab={tab}>
            {tab === 'history' && (
              <div className="tc-split">
                {photos[0] ? <Photo shot={photos[0]} /> : piece ? <Stage /> : <Photo />}
                <div className="tc-copy">
                  <p className="tc-era">{era}</p>
                  <h3 className="tc-headline">{headline}</h3>
                  <p className="tc-story">{story}</p>
                  {notes.length > 0 && (
                    <ul className="tc-notes">
                      {notes.map(line => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  )}
                  {(primary || secondary) && (
                    <div className="tc-actions">
                      {primary?.onClick ? (
                        <button type="button" className="tc-play" onClick={primary.onClick}>
                          {primary.label}
                        </button>
                      ) : primary ? (
                        <span className="tc-era">{primary.label}</span>
                      ) : null}
                      {secondary && (
                        <button type="button" className="tc-ghost" onClick={secondary.onClick}>
                          <BookOpen className="h-3.5 w-3.5" />
                          {secondary.label}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {tab === 'video' && video && <Tape video={video} onVideo={onVideo} title={headline} />}
            {tab === 'images' && <Gallery photos={photos} piece={piece} />}
            {tab === 'animations' && (piece ? <Stage wide caption="The real one, from this room" /> : <Photo shot={photos[0]} wide />)}
          </div>
        )}
      </section>

      <nav className="tc-dock" role="tablist" ref={dock}>
        <DockTab id="history" on={tab === 'history'} label="History" onPick={setTab} icon={<HistoryIcon />} />
        <DockTab id="video" on={tab === 'video'} label="Video" onPick={setTab} icon={<VideoIcon />} off={!video} />
        <DockTab id="images" on={tab === 'images'} label="Images" onPick={setTab} icon={<ImagesIcon />} off={!photos.length && !piece} />
        <DockTab id="animations" on={tab === 'animations'} label="Animations" onPick={setTab} icon={<RunnerIcon />} off={!piece && !photos.length} />
      </nav>
    </div>
  );
}

function Logo({ brand }: { brand: { line: string; movie: boolean; bananas: boolean } }) {
  if (brand.movie) {
    return (
      <div className="tc-logo tc-logo--movie" aria-label="The Movie Row">
        <span className="tc-logo-the">The</span>
        <span className="tc-logo-script">Movie Row</span>
      </div>
    );
  }
  return (
    <div className="tc-logo">
      {brand.bananas && <span className="tc-banana" aria-hidden>🍌</span>}
      <span className="tc-logo-stack">
        <span className="tc-logo-main" data-long={brand.line.length > 10 ? '1' : '0'}>
          {brand.line}
        </span>
        <span className="tc-logo-sub">Time Capsule</span>
      </span>
      {brand.bananas && <span className="tc-banana" aria-hidden>🍌</span>}
    </div>
  );
}

function DockTab({
  id,
  on,
  off,
  label,
  icon,
  onPick,
}: {
  id: Tab;
  on: boolean;
  off?: boolean;
  label: string;
  icon: React.ReactNode;
  onPick: (tab: Tab) => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={on}
      aria-disabled={off}
      disabled={off}
      data-on={on ? '1' : '0'}
      className="tc-tab"
      onClick={() => onPick(id)}
    >
      <span className="tc-tab-icon">{icon}</span>
      <span className="tc-tab-label">{label}</span>
    </button>
  );
}

/** A real photo in a gold frame, or an empty pane of glass. */
function Photo({ shot, wide, children }: { shot?: Shot; wide?: boolean; children?: React.ReactNode }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [shot?.src]);
  return (
    <figure className={`tc-frame${wide ? ' tc-frame--wide' : ''}`}>
      {shot && !broken ? (
        <img src={shot.src} alt={shot.alt} draggable={false} onError={() => setBroken(true)} />
      ) : (
        <span className="tc-empty">{shot?.alt ?? ''}</span>
      )}
      {shot && !broken && <figcaption>{shot.credit}</figcaption>}
      {children}
    </figure>
  );
}

/** The window the real piece turns in (drawn by the room behind the glass). */
function Stage({ wide, caption, children }: { wide?: boolean; caption?: string; children?: React.ReactNode }) {
  const ref = useCallback((el: HTMLDivElement | null) => setCapsuleStage(el), []);
  return (
    <figure className={`tc-frame tc-frame--stage${wide ? ' tc-frame--wide' : ''}`}>
      <div ref={ref} className="tc-stage" />
      {caption && <figcaption>{caption}</figcaption>}
      {children}
    </figure>
  );
}

/** The real photos, then the real piece: next and back go round. */
function Gallery({ photos, piece }: { photos: Shot[]; piece: boolean }) {
  const count = photos.length + (piece ? 1 : 0);
  const [at, setAt] = useState(0);
  const go = (d: number) => setAt(i => (i + d + count) % count);
  const nav = count > 1 && (
    <>
      <button type="button" className="tc-nav tc-nav--prev" aria-label="Back" onClick={() => go(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" className="tc-nav tc-nav--next" aria-label="Next" onClick={() => go(1)}>
        <ChevronRight className="h-4 w-4" />
      </button>
      <span className="tc-count">
        {at + 1} / {count}
      </span>
    </>
  );
  if (at < photos.length) return <Photo shot={photos[at]} wide>{nav}</Photo>;
  return (
    <Stage wide caption="The real one, from this room">
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
    <div className="tc-player">
      <div className="tc-screen" ref={screen}>
        {open ? (
          <iframe
            title={video.title}
            src={`https://archive.org/embed/${encodeURIComponent(video.archiveId)}?autoplay=1`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" className="tc-poster" onClick={() => setOpen(true)} aria-label={`Play ${video.title}`}>
            <span className="tc-poster-play">
              <Play className="h-7 w-7" />
            </span>
            <span className="tc-poster-title">{video.title}</span>
            <span className="tc-poster-note">{title} · Internet Archive</span>
          </button>
        )}
      </div>
      <div className="tc-transport">
        <span>{open ? 'Playing' : 'Ready'}</span>
        <span className="tc-transport-bar">
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
    <svg className="tc-beam" aria-hidden>
      <defs>
        <linearGradient id="tc-beam-grad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffd36b" />
          <stop offset="0.5" stopColor="#ff6bd6" />
          <stop offset="1" stopColor="#9b6bff" />
        </linearGradient>
      </defs>
      <path ref={glow} className="tc-beam-glow" stroke="url(#tc-beam-grad)" opacity="0" />
      <path ref={path} className="tc-beam-line" stroke="url(#tc-beam-grad)" opacity="0" />
      <ellipse ref={spot} className="tc-beam-spot" rx="26" ry="9" opacity="0" />
    </svg>
  );
}

// Little pixel-art tab icons, drawn on a 16-unit grid like the mockup's.
function Px({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" width="26" height="26" shapeRendering="crispEdges" aria-hidden>
      {children}
    </svg>
  );
}
function HistoryIcon() {
  return (
    <Px>
      <rect x="3" y="2" width="10" height="12" fill="#3b1d6e" />
      <rect x="2" y="3" width="12" height="10" fill="#3b1d6e" />
      <rect x="4" y="3" width="8" height="10" fill="#cdb6ff" />
      <rect x="3" y="4" width="10" height="8" fill="#cdb6ff" />
      <rect x="7" y="4" width="2" height="5" fill="#3b1d6e" />
      <rect x="8" y="8" width="3" height="1" fill="#3b1d6e" />
      <rect x="2" y="1" width="2" height="2" fill="#ff6bd6" />
      <rect x="12" y="1" width="2" height="2" fill="#ff6bd6" />
    </Px>
  );
}
function VideoIcon() {
  return (
    <Px>
      <rect x="1" y="3" width="14" height="10" fill="#1f3550" />
      <rect x="2" y="4" width="12" height="8" fill="#7fd3ff" />
      <rect x="1" y="3" width="1" height="1" fill="#e6f6ff" />
      <rect x="6" y="5" width="1" height="6" fill="#1f3550" />
      <rect x="7" y="6" width="1" height="4" fill="#1f3550" />
      <rect x="8" y="7" width="1" height="2" fill="#1f3550" />
      <rect x="2" y="4" width="1" height="1" fill="#1f3550" />
      <rect x="2" y="11" width="1" height="1" fill="#1f3550" />
      <rect x="13" y="4" width="1" height="1" fill="#1f3550" />
      <rect x="13" y="11" width="1" height="1" fill="#1f3550" />
    </Px>
  );
}
function ImagesIcon() {
  return (
    <Px>
      <rect x="3" y="1" width="12" height="10" fill="#f2f2f2" />
      <rect x="1" y="4" width="12" height="11" fill="#ffffff" />
      <rect x="2" y="5" width="10" height="7" fill="#4fa8ff" />
      <rect x="2" y="10" width="10" height="2" fill="#3fbf5f" />
      <rect x="4" y="8" width="3" height="2" fill="#3fbf5f" />
      <rect x="8" y="9" width="3" height="1" fill="#3fbf5f" />
      <rect x="9" y="6" width="2" height="2" fill="#ffd23f" />
    </Px>
  );
}
function RunnerIcon() {
  return (
    <Px>
      <rect x="9" y="1" width="3" height="3" fill="#ffd23f" />
      <rect x="6" y="4" width="5" height="2" fill="#ff8a1f" />
      <rect x="7" y="6" width="3" height="3" fill="#ff8a1f" />
      <rect x="4" y="5" width="2" height="1" fill="#ffd23f" />
      <rect x="11" y="6" width="2" height="1" fill="#ffd23f" />
      <rect x="6" y="9" width="2" height="2" fill="#c0392b" />
      <rect x="9" y="9" width="2" height="3" fill="#c0392b" />
      <rect x="4" y="11" width="3" height="2" fill="#c0392b" />
      <rect x="10" y="12" width="2" height="3" fill="#c0392b" />
    </Px>
  );
}
