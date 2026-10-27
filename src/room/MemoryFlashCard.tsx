import React, { useEffect, useState } from 'react';
import type { GameMetadata } from '../types';
import type { CardVideo, PropCard } from './propCards';
import { GAME_PHOTOS } from './gamePhotos';
import { BookOpen, ChevronLeft, ChevronRight, Clock, Film, Images, Pause, PersonStanding, Play, SkipBack, SkipForward, X } from 'lucide-react';
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
  'liarsdice',
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

function brandOf(id: string, title: string): { movie: boolean; line: string; bananas: boolean } {
  if (id === 'cd-vhs') return { movie: true, line: 'The Movie Row', bananas: false };
  if (id === 'cd-snes') return { movie: false, line: 'SNES', bananas: true };
  return { movie: false, line: title, bananas: false };
}

/**
 * Every card in the room is a time capsule: a clear glass plate in the middle
 * of the screen, with History, Video, Images, and Animations along the bottom.
 * The plate shows a real photo or stays clear. It does not draw a picture of its own.
 */
export function MemoryFlashCard(props: MemoryFlashCardProps) {
  if (props.kind === 'game') {
    const photo = GAME_PHOTOS[props.game.id];
    const online = ONLINE_READY.has(props.game.id);
    const brand = brandOf(props.game.id, props.game.title);
    return (
      <CapsuleShell
        movie={brand.movie}
        line={brand.line}
        bananas={brand.bananas}
        era={online ? 'Online ready' : 'Local'}
        headline={props.game.title}
        story={props.game.description}
        notes={[`${props.game.players} · ${props.game.duration}`, ...props.game.rules.slice(0, 2)]}
        photos={photo ? [{ src: photo.src, credit: photo.credit, alt: props.game.title }] : []}
        onClose={props.onClose}
        primary={props.onPlay ? { label: 'Play', onClick: props.onPlay } : { label: 'Already on the table' }}
        secondary={{ label: 'Rules', onClick: props.onRules }}
      />
    );
  }
  const brand = brandOf(props.prop.id, props.prop.title);
  return (
    <CapsuleShell
      movie={brand.movie}
      line={brand.line}
      bananas={brand.bananas}
      era={props.prop.era}
      headline={props.prop.title}
      story={props.prop.story}
      notes={props.prop.memories}
      photos={(props.prop.photos ?? []).map(photo => ({ src: photo.src, credit: photo.credit, alt: photo.alt }))}
      video={props.prop.video}
      onVideo={props.onVideo}
      onClose={props.onClose}
      primary={props.onAction && props.prop.action ? { label: props.prop.action.label, onClick: props.onAction } : undefined}
    />
  );
}

function CapsuleShell({
  movie,
  line,
  bananas,
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
  movie: boolean;
  line: string;
  bananas: boolean;
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
  const [tab, setTab] = useState<Tab>(movie ? 'images' : 'history');
  const [shot, setShot] = useState(0);
  const photo = photos[shot] ?? photos[0];

  return (
    <div
      data-ui="card"
      data-capsule={movie ? 'movie' : 'object'}
      className="capsule-card pointer-events-auto"
      onClick={e => e.stopPropagation()}
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="capsule-card__top">
        <div className={`capsule-card__logo${movie ? ' capsule-card__logo--movie' : ''}`}>
          {bananas && <span className="capsule-card__banana" aria-hidden>🍌</span>}
          {movie ? (
            <>
              <span className="capsule-card__the">The</span>
              <span className="capsule-card__word">Movie Row</span>
            </>
          ) : (
            <>
              <span className="capsule-card__word">{line}</span>
              <span className="capsule-card__sub">TIME CAPSULE</span>
            </>
          )}
          {bananas && <span className="capsule-card__banana" aria-hidden>🍌</span>}
        </div>
        <div className="capsule-card__win">
          <button type="button" aria-label="Close card" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="capsule-card__body">
        {tab === 'history' && (
          <div className="capsule-card__split">
            <Plate photo={photo} />
            <div className="capsule-card__copy">
              <p className="capsule-card__era">{era}</p>
              <h3 className="capsule-card__headline">{headline}</h3>
              <p className="capsule-card__story">{story}</p>
              {notes.length > 0 && (
                <ul className="capsule-card__notes">
                  {notes.map(lineItem => (
                    <li key={lineItem}>▸ {lineItem}</li>
                  ))}
                </ul>
              )}
              <div className="capsule-card__actions">
                {primary?.onClick ? (
                  <button type="button" className="capsule-card__play" onClick={primary.onClick}>
                    {primary.label}
                  </button>
                ) : primary ? (
                  <p className="capsule-card__era">{primary.label}</p>
                ) : null}
                {secondary && (
                  <button type="button" className="capsule-card__rules" onClick={secondary.onClick}>
                    <BookOpen className="mr-1 inline h-3.5 w-3.5" />
                    {secondary.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'video' && (
          <div className="capsule-card__screen capsule-card__screen--wide">
            {video ? (
              <Tape video={video} onVideo={onVideo} />
            ) : (
              <div className="capsule-card__clear">
                <span>No tape in this capsule</span>
              </div>
            )}
            <div className="capsule-card__scan" />
          </div>
        )}

        {tab === 'images' && (
          <>
            <Plate
              photo={photo}
              wide
              onPrev={photos.length > 1 ? () => setShot(i => (i + photos.length - 1) % photos.length) : undefined}
              onNext={photos.length > 1 ? () => setShot(i => (i + 1) % photos.length) : undefined}
            />
            {movie && (
              <div className="capsule-card__transport">
                <span>{photos.length ? String(shot + 1).padStart(2, '0') : '00'}</span>
                <button type="button" aria-label="Previous photo" onClick={() => photos.length > 1 && setShot(i => (i + photos.length - 1) % photos.length)}>
                  <SkipBack className="h-4 w-4" />
                </button>
                <button type="button" aria-label={video ? 'Play the tape' : 'Pause'} onClick={() => video && setTab('video')}>
                  {video ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
                <button type="button" aria-label="Next photo" onClick={() => photos.length > 1 && setShot(i => (i + 1) % photos.length)}>
                  <SkipForward className="h-4 w-4" />
                </button>
                <span style={{ marginLeft: 'auto' }}>{String(photos.length).padStart(2, '0')}</span>
              </div>
            )}
          </>
        )}

        {tab === 'animations' && <Plate photo={photo} wide drift />}
      </div>

      <div className="capsule-card__dock" role="tablist">
        <DockButton id="history" on={tab === 'history'} tone="cyan" icon={<Clock className="h-4 w-4" />} label="History" onPick={setTab} />
        <DockButton id="video" on={tab === 'video'} tone="pink" icon={<Film className="h-4 w-4" />} label="Video" onPick={setTab} />
        <DockButton id="images" on={tab === 'images'} tone="green" icon={<Images className="h-4 w-4" />} label="Images" onPick={setTab} />
        <DockButton id="animations" on={tab === 'animations'} tone="amber" icon={<PersonStanding className="h-4 w-4" />} label="Animations" onPick={setTab} />
      </div>
    </div>
  );
}

function DockButton({
  id,
  on,
  tone,
  icon,
  label,
  onPick,
}: {
  id: Tab;
  on: boolean;
  tone: string;
  icon: React.ReactNode;
  label: string;
  onPick: (tab: Tab) => void;
}) {
  return (
    <button type="button" role="tab" aria-selected={on} data-on={on ? '1' : '0'} className="capsule-card__tab" onClick={() => onPick(id)}>
      <span className="capsule-card__glyph" data-tone={tone}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function Plate({
  photo,
  wide,
  drift,
  onPrev,
  onNext,
}: {
  photo?: Shot;
  wide?: boolean;
  drift?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [photo?.src]);
  return (
    <div className={`capsule-card__screen${wide ? ' capsule-card__screen--wide' : ''}`}>
      {photo && !broken ? (
        <img
          src={photo.src}
          alt={photo.alt}
          className={drift ? 'is-drift' : undefined}
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="capsule-card__clear">{photo ? <span>{photo.alt}</span> : null}</div>
      )}
      {photo && !broken && <p className="capsule-card__credit">{photo.credit}</p>}
      {onPrev && (
        <button type="button" className="capsule-card__nav capsule-card__nav--prev" aria-label="Previous photo" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {onNext && (
        <button type="button" className="capsule-card__nav capsule-card__nav--next" aria-label="Next photo" onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      <div className="capsule-card__scan" />
    </div>
  );
}

/** The old commercial, from archive.org's own player, loaded only when asked. */
function Tape({ video, onVideo }: { video: CardVideo; onVideo?: (playing: boolean) => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    onVideo?.(true);
    return () => onVideo?.(false);
  }, [open, onVideo]);
  if (!open) {
    return (
      <button type="button" className="capsule-card__tape" onClick={() => setOpen(true)}>
        <Play className="h-8 w-8" />
        <strong>PLAY</strong>
        <span className="px-6 text-center text-xs text-white/80">{video.title}</span>
      </button>
    );
  }
  return (
    <div className="capsule-card__frame">
      <iframe
        title={video.title}
        src={`https://archive.org/embed/${encodeURIComponent(video.archiveId)}?autoplay=1`}
        allow="autoplay; fullscreen"
        allowFullScreen
      />
      <button type="button" className="capsule-card__stop" onClick={() => setOpen(false)}>
        Stop
      </button>
    </div>
  );
}
