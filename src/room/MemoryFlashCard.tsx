import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameMetadata } from '../types';
import type { CardVideo, PropCard } from './propCards';
import { GAME_PHOTOS } from './gamePhotos';
import { ChevronLeft, ChevronRight, Play, Radio, Square, X } from 'lucide-react';
import { capsule, setCapsuleMode, setCapsuleStage, useCapsulePiece } from './capsule/capsuleBus';
import { sound } from '../utils/audio';
import { loadVoiceManifest, playOpenBeeps, useHoloVoice, useVoiceManifest, voiceFile } from './capsule/holoVoice';
import { gameKindLine, gamePages, narrate, propKindLine, propPages, voiceKey, type CapsuleNode, type CapsulePage } from './capsuleText';
import './holoCard.css';

type Tab = 'history' | 'video' | 'images';

interface Shot {
  src: string;
  credit: string;
  alt: string;
}

type Node = CapsuleNode;
type Page = CapsulePage;

interface GameCardProps {
  kind: 'game';
  game: GameMetadata;
  /** Left out for the box beside the table: that game is already being played. */
  onPlay?: () => void;
  onRules: () => void;
  onClose: () => void;
  /** The hologram voice started or stopped, so the room music can step aside. */
  onSound?: (playing: boolean) => void;
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
 * Every card in the room is a time capsule, laid out like a history map: the
 * real thing turning as a blue hologram in the middle of a ring of light, its
 * name around the top, and what there is to know about it in blocks wired to
 * the ring. History, Video and Images are buttons on the ring; the Images tab
 * shows the real thing in its own colours, then 90s photos.
 */
export function MemoryFlashCard(props: MemoryFlashCardProps) {
  if (props.kind === 'game') {
    const g = props.game;
    const photo = GAME_PHOTOS[g.id];
    return (
      <Capsule
        title={g.title}
        kindLine={gameKindLine(g)}
        pages={gamePages(g)}
        voice={voiceKey('game', g.id)}
        photos={photo ? [{ src: photo.src, credit: photo.credit, alt: g.title }] : []}
        onClose={props.onClose}
        onSound={props.onSound}
        primary={props.onPlay ? { label: 'Play', onClick: props.onPlay } : { label: 'On the table' }}
        secondary={{ label: 'Rules', onClick: props.onRules }}
      />
    );
  }
  const prop = props.prop;
  return (
    <Capsule
      title={prop.title}
      kindLine={propKindLine(prop)}
      pages={propPages(prop)}
      voice={voiceKey('prop', prop.id)}
      photos={(prop.photos ?? []).map(photo => ({ src: photo.src, credit: photo.credit, alt: photo.alt }))}
      video={prop.video}
      onSound={props.onVideo}
      onClose={props.onClose}
      primary={props.onAction && prop.action ? { label: prop.action.label, onClick: props.onAction } : undefined}
    />
  );
}

const click = () => sound.playButtonClick();

/** A button you can press: it sinks in, lights up and clicks. */
function Key({
  className = '',
  on,
  children,
  onClick,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  return (
    <button
      type="button"
      className={`hm-key ${className}`}
      data-on={on ? '1' : '0'}
      onPointerDown={e => {
        if (!e.currentTarget.disabled) click();
      }}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Where the four blocks sit, and the wire from each back to the ring around the hologram (viewBox units). */
const WIRES = ['M34 27 H38.5 L41.5 32.3', 'M66 27 H61.5 L58.5 32.3', 'M34 58 H37.5 L40.2 60.9', 'M66 58 H62.5 L59.8 60.9'];
const SLOTS = ['tl', 'tr', 'bl', 'br'];

/** An arc of the ring, from angle a to b (degrees, 0 = right, clockwise), for text to run along. */
function arc(r: number, a: number, b: number, sweep: 0 | 1) {
  const p = (deg: number) => {
    const t = (deg * Math.PI) / 180;
    return `${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`;
  };
  return `M ${p(a)} A ${r} ${r} 0 0 ${sweep} ${p(b)}`;
}

function initials(title: string) {
  const words = title.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w && !/^(the|a|an|of|and)$/i.test(w));
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase();
}

function Capsule({
  title,
  kindLine,
  pages,
  voice,
  photos,
  video,
  onSound,
  onClose,
  primary,
  secondary,
}: {
  title: string;
  kindLine: string[];
  pages: Page[];
  /** The card's key in the hologram voice files. */
  voice: string;
  photos: Shot[];
  video?: CardVideo;
  /** A video or the voice started or stopped, so the room music can step aside. */
  onSound?: (playing: boolean) => void;
  onClose: () => void;
  primary?: { label: string; onClick?: () => void };
  secondary?: { label: string; onClick: () => void };
}) {
  const [tab, setTab] = useState<Tab>('history');
  const [page, setPage] = useState(0);
  const [slide, setSlide] = useState(0);
  const [screen, setScreen] = useState(false);
  // The hologram stays while the screen stands up out of it, and steps aside while the video plays.
  const [screenLive, setScreenLive] = useState(false);
  const piece = useCapsulePiece();
  const core = useRef<HTMLDivElement>(null);
  const at = Math.min(page, pages.length - 1);
  const nodes = pages[at] ?? [];
  // The Images tab starts on the real thing itself, then the photos.
  const slides = (piece === true ? 1 : 0) + photos.length;
  const realSlide = piece === true && slide === 0;
  const onImages = tab === 'images';

  // The card picks how the room draws the piece.
  useEffect(() => {
    setCapsuleMode(screenLive ? 'off' : onImages && realSlide ? 'real' : 'holo');
  }, [screenLive, onImages, realSlide]);
  useEffect(() => () => setCapsuleMode('holo'), []);
  useEffect(() => setSlide(0), [tab]);

  const go = (t: Tab) => {
    setTab(t);
    if (t !== 'video') setScreen(false);
  };

  // The video and the voice each say when they start and stop; the room music steps aside while either plays.
  const playing = useRef(0);
  const hold = useCallback(
    (on: boolean) => {
      playing.current = Math.max(0, playing.current + (on ? 1 : -1));
      onSound?.(playing.current > 0);
    },
    [onSound],
  );

  // A capsule opens with a little burst of beeps.
  useEffect(() => {
    playOpenBeeps();
    void loadVoiceManifest();
  }, []);

  // Listen: the whole card read aloud by the hologram voice picked in the menu.
  const holoVoice = useHoloVoice();
  useVoiceManifest();
  const voiceSrc = voiceFile(holoVoice, voice);
  const [listening, setListening] = useState(false);
  const speaker = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!listening || !voiceSrc) return;
    const audio = new Audio(voiceSrc);
    audio.volume = sound.isMuted() ? 0 : 1;
    speaker.current = audio;
    audio.onended = () => setListening(false);
    audio.onerror = () => setListening(false);
    void audio.play().catch(() => setListening(false));
    hold(true);
    return () => {
      audio.pause();
      audio.removeAttribute('src');
      speaker.current = null;
      hold(false);
    };
  }, [listening, voiceSrc, hold]);
  // The video and the voice don't talk over each other.
  useEffect(() => {
    if (screen) setListening(false);
  }, [screen]);
  const id = useMemo(() => `hm-${Math.random().toString(36).slice(2, 8)}`, []);
  const titleSize = Math.max(3, Math.min(5.6, 92 / Math.max(8, title.length * 0.95)));
  const kindText = kindLine.join(' • ');
  // The kind line fits the arc between the tabs and the title: about 59 units long, each character about 0.9 of the size.
  const kindSize = Math.max(1.35, Math.min(2.4, 57 / Math.max(10, kindText.length * 0.9)));

  return (
    <div
      data-ui="card"
      className="hc pointer-events-auto"
      data-tab={tab}
      data-listening={listening ? '1' : '0'}
      role="dialog"
      aria-label={`${title} time capsule`}
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
      onContextMenu={e => e.preventDefault()}
    >
      <Beam to={core} />
      <div className="hm">
        <svg className="hm-ring" viewBox="0 0 100 100" aria-hidden>
          <defs>
            <path id={`${id}-top`} d={arc(43.2, 196, 344, 1)} />
            <path id={`${id}-top2`} d={arc(38.4, 226, 314, 1)} />
            <radialGradient id={`${id}-fill`}>
              <stop offset="0.36" stopColor="#04121f" stopOpacity="0" />
              <stop offset="0.5" stopColor="#04121f" stopOpacity="0.55" />
              <stop offset="1" stopColor="#030d17" stopOpacity="0.82" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="49" fill={`url(#${id}-fill)`} />
          <circle className="hm-line hm-line--bright" cx="50" cy="50" r="49" />
          <circle className="hm-line" cx="50" cy="50" r="47.6" />
          <circle className="hm-ticks" cx="50" cy="50" r="46.2" />
          <circle className="hm-line hm-spin" cx="50" cy="50" r="40.6" strokeDasharray="10 3 1 3" />
          <circle className="hm-line hm-spin hm-spin--back" cx="50" cy="50" r="36" strokeDasharray="0.6 1.6" />
          <text className="hm-arc-title" style={{ fontSize: titleSize }}>
            <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
              {title}
            </textPath>
          </text>
          <text className="hm-arc-kind" style={{ fontSize: kindSize }}>
            <textPath href={`#${id}-top2`} startOffset="50%" textAnchor="middle">
              {kindText}
            </textPath>
          </text>
          {/* The ring around the hologram, and the wires out to each block. */}
          <circle className="hm-line hm-line--bright hm-core-ring" cx="50" cy="47" r="17.4" />
          <circle className="hm-line hm-spin hm-core-ring" cx="50" cy="47" r="19.2" strokeDasharray="6 2.4" style={{ transformOrigin: '50px 47px' }} />
          {tab === 'history' &&
            nodes.map((_, i) => (
              <g key={`${at}-${i}`} className="hm-wire">
                <path className="hm-line hm-line--bright" d={WIRES[i]} />
                <path className="hm-flow" d={WIRES[i]} />
              </g>
            ))}
          <path className="hm-line" d="M50 64.4 V71.5" />
        </svg>

        <Key className="hm-x" aria-label="Close the capsule" onClick={onClose}>
          <X className="h-4 w-4" />
        </Key>

        <nav className="hm-tabs" role="tablist">
          {(['history', 'video', 'images'] as const).map((t, i) => {
            const off = t === 'video' ? !video : t === 'images' ? slides === 0 : false;
            return (
              <Key
                key={t}
                role="tab"
                aria-selected={tab === t}
                disabled={off}
                on={tab === t}
                className="hm-tab"
                style={{ '--a': `${(i - 1) * 19}deg` } as React.CSSProperties}
                onClick={() => go(t)}
              >
                {t}
              </Key>
            );
          })}
        </nav>

        {/* The middle: the hologram turns here (drawn by the room behind the card). */}
        <div className="hm-core" ref={core}>
          {!onImages && !screenLive && <Stage className="hm-stage" />}
          {piece === null && <span className="hm-note">Tuning in…</span>}
          {piece === false && !onImages && (
            <span className="hm-emblem" aria-hidden>
              {initials(title)}
            </span>
          )}
          {tab === 'video' && video && !screen && (
            <button
              type="button"
              className="hm-playbtn"
              onPointerDown={click}
              onClick={() => setScreen(true)}
              aria-label={`Play ${video.title}`}
            >
              <Play className="h-6 w-6" />
              <span>Play</span>
            </button>
          )}
        </div>

        {onImages && (
          <Gallery
            photos={photos}
            real={piece === true}
            at={Math.min(slide, Math.max(0, slides - 1))}
            onAt={setSlide}
            title={title}
          />
        )}

        {tab === 'video' && video && !screen && (
          <p className="hm-caption">
            {video.title}
            <span> · Internet Archive</span>
          </p>
        )}

        {(primary || secondary) && (
          <div className="hm-actions" data-two={primary && secondary ? '1' : '0'}>
            {primary?.onClick ? (
              <Key className="hm-big" onClick={primary.onClick}>
                {primary.label}
              </Key>
            ) : primary ? (
              <span className="hm-big hm-big--off">{primary.label}</span>
            ) : null}
            {secondary && (
              <Key className="hm-big hm-big--ghost" onClick={secondary.onClick}>
                {secondary.label}
              </Key>
            )}
          </div>
        )}

        <footer className="hm-foot">
          {tab === 'history' && pages.length > 1 ? (
            <span className="hm-pages">
              <Key aria-label="Previous page" disabled={at === 0} onClick={() => setPage(at - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Key>
              <span>
                Page {at + 1} / {pages.length}
              </span>
              <Key aria-label="Next page" disabled={at >= pages.length - 1} onClick={() => setPage(at + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Key>
            </span>
          ) : null}
        </footer>
        {voiceSrc && (
          <Key
            className="hm-listen"
            on={listening}
            aria-label={listening ? 'Stop the transmission' : 'Listen to this card'}
            onClick={() => setListening(l => !l)}
          >
            {listening ? <Square className="h-3 w-3" /> : <Radio className="h-3.5 w-3.5" />}
            {listening ? 'Stop' : 'Listen'}
          </Key>
        )}
        <Key className="hm-exit" onClick={onClose}>
          ESC • Exit
        </Key>

        {screen && video && (
          <Screen
            video={video}
            onVideo={hold}
            onLive={setScreenLive}
            onGone={() => {
              setScreenLive(false);
              setScreen(false);
              setTab('history');
            }}
          />
        )}
      </div>

      {tab === 'history' && (
        <div className="hm-nodes" key={at}>
          {nodes.map((n, i) => (
            <section key={n.label + i} className="hm-node" data-slot={SLOTS[i]} data-tip={n.tip ? '1' : '0'} style={{ '--i': i } as React.CSSProperties}>
              <p className="hm-label">{n.label}</p>
              {n.text && <p className="hm-text">{n.text}</p>}
              {n.items && (
                <ul className="hm-list">
                  {n.items.map(line => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** The window the real piece turns in (drawn by the room, behind the page). */
function Stage({ className }: { className: string }) {
  const ref = useCallback((el: HTMLDivElement | null) => setCapsuleStage(el), []);
  return <div ref={ref} className={className} />;
}

/** Images: the real thing itself first (full colour, turning), then the 90s photos. Back and next go round. */
function Gallery({ photos, real, at, onAt, title }: { photos: Shot[]; real: boolean; at: number; onAt: (i: number) => void; title: string }) {
  const count = photos.length + (real ? 1 : 0);
  const photo = real ? (at > 0 ? photos[at - 1] : null) : photos[at];
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  const go = (d: number) => onAt((at + d + count) % count);
  return (
    <div className="hm-gallery">
      <figure className="hm-view">
        {photo ? (
          broken.has(photo.src) ? (
            <span className="hm-note">{photo.alt}</span>
          ) : (
            <img
              key={photo.src}
              src={photo.src}
              alt={photo.alt}
              draggable={false}
              referrerPolicy="no-referrer"
              onError={() => setBroken(b => new Set(b).add(photo.src))}
            />
          )
        ) : (
          <Stage className="hm-stage hm-stage--real" />
        )}
        <figcaption>{photo ? photo.credit : `The real ${title}, from this room · turning`}</figcaption>
        {count > 1 && (
          <>
            <Key className="hm-nav hm-nav--prev" aria-label="Back" onClick={() => go(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Key>
            <Key className="hm-nav hm-nav--next" aria-label="Next" onClick={() => go(1)}>
              <ChevronRight className="h-4 w-4" />
            </Key>
          </>
        )}
      </figure>
      {count > 1 && (
        <div className="hm-thumbs">
          {real && (
            <Key className="hm-thumb hm-thumb--3d" on={at === 0} aria-label="The real one, in 3D" onClick={() => onAt(0)}>
              3D
            </Key>
          )}
          {photos.map((p, i) => {
            const n = i + (real ? 1 : 0);
            return (
              <Key key={p.src} className="hm-thumb" on={at === n} aria-label={p.alt} onClick={() => onAt(n)}>
                {!broken.has(p.src) && <img src={p.src} alt="" draggable={false} referrerPolicy="no-referrer" />}
              </Key>
            );
          })}
        </div>
      )}
    </div>
  );
}

const archiveFile = (video: CardVideo) =>
  `https://archive.org/download/${encodeURIComponent(video.archiveId)}/${(video.file ?? '').split('/').map(encodeURIComponent).join('/')}`;

/**
 * The old commercial: a holographic screen that appears lying flat on the
 * projector, stands up out of the hologram, plays, and the moment it ends
 * folds back down the way it came and is gone, leaving the hologram.
 */
function Screen({
  video,
  onVideo,
  onLive,
  onGone,
}: {
  video: CardVideo;
  onVideo?: (playing: boolean) => void;
  /** True once it's standing and playing, false as it starts to fold away. */
  onLive: (live: boolean) => void;
  onGone: () => void;
}) {
  const [phase, setPhase] = useState<'rise' | 'play' | 'fall'>('rise');
  useEffect(() => onLive(phase === 'play'), [phase, onLive]);
  const [useEmbed, setUseEmbed] = useState(!video.file);
  const [progress, setProgress] = useState(0);
  const player = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    onVideo?.(true);
    return () => onVideo?.(false);
  }, [onVideo]);

  // Start it from the press that opened the screen, so it plays with sound.
  useEffect(() => {
    void player.current?.play().catch(() => undefined);
  }, [useEmbed]);

  // The archive's own player can't say when it's done: fold away after the clip's length.
  useEffect(() => {
    if (!useEmbed || phase === 'fall' || !video.length) return;
    const t = window.setTimeout(() => setPhase('fall'), (video.length + 3) * 1000);
    return () => window.clearTimeout(t);
  }, [useEmbed, phase, video.length]);

  const fall = () => {
    player.current?.pause();
    setPhase('fall');
  };

  return (
    <div
      className="hm-screen"
      data-phase={phase}
      onAnimationEnd={e => {
        if (e.target !== e.currentTarget) return;
        if (phase === 'rise') setPhase('play');
        else if (phase === 'fall') onGone();
      }}
    >
      <div className="hm-screen-glass">
        {useEmbed ? (
          <iframe
            title={video.title}
            src={`https://archive.org/embed/${encodeURIComponent(video.archiveId)}${video.file ? `/${video.file.split('/').map(encodeURIComponent).join('/')}` : ''}?autoplay=1`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            ref={player}
            src={archiveFile(video)}
            autoPlay
            playsInline
            preload="auto"
            onEnded={() => setPhase('fall')}
            onError={() => setUseEmbed(true)}
            onTimeUpdate={e => {
              const v = e.currentTarget;
              if (v.duration) setProgress(v.currentTime / v.duration);
            }}
          />
        )}
        <span className="hm-screen-flash" aria-hidden />
      </div>
      <div className="hm-screen-bar">
        <span className="hm-screen-title">{video.title}</span>
        <span className="hm-screen-track">
          <i style={{ transform: `scaleX(${useEmbed ? 1 : progress})` }} data-embed={useEmbed ? '1' : '0'} />
        </span>
        <Key className="hm-stop" aria-label="Stop" onClick={fall} disabled={phase === 'fall'}>
          <Square className="h-3 w-3" />
        </Key>
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
