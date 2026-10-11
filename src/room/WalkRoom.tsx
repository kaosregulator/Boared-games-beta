import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GameId, GameMetadata } from '../types';
import { sound } from '../utils/audio';
import { RealRoomScene, type LiveProp } from './RealRoomScene';
import { WalkController } from './WalkController';
import { ReachRaycaster, type Aimed } from './ReachRaycaster';
import { TourCamera } from './TourCamera';
import { LAYOUT } from './roomLayout';
import { DESK_SLOTS, SHELF_SLOTS, SHELF_SLOTS_LOWER } from './videoRoom';
import { MemoryFlashCard } from './MemoryFlashCard';
import { propCardFor } from './propCards';
import { RoomStudio } from './RoomStudio';
import { ANCHORS, anchorById, type Anchor } from './anchors';
import { deletePlacement, loadPlacements, savePlacement, type SavedPlacement } from './userPlacements';
import type { RoomMood } from './moods';

/**
 * `?tour=1` runs a hands-off dolly through the room and `?shot=N` parks the
 * camera on tour waypoint N. Both skip pointer lock so the room can be captured
 * and reviewed without a mouse.
 */
function readCameraOverride() {
  if (typeof window === 'undefined') {
    return { tour: false, shot: undefined as number | undefined, card: null as string | null, menu: false };
  }
  const params = new URLSearchParams(window.location.search);
  const shotRaw = params.get('shot');
  return {
    tour: params.has('tour'),
    shot: shotRaw === null ? undefined : Number.parseInt(shotRaw, 10) || 0,
    card: params.get('card'),
    menu: params.has('menu'),
  };
}

const DEMO_POSE: Record<string, { at: [number, number, number]; look: [number, number, number] }> = {
  vhs: { at: [LAYOUT.vhs_stack.x, 1.15, LAYOUT.vhs_stack.z + 0.9], look: [LAYOUT.vhs_stack.x, 0.2, LAYOUT.vhs_stack.z] },
  gameboy: { at: [LAYOUT.gameboy.x + 0.7, 1.2, LAYOUT.gameboy.z + 0.55], look: [LAYOUT.gameboy.x, 0.55, LAYOUT.gameboy.z] },
  cards: { at: [LAYOUT.cards.x + 0.15, 1.15, LAYOUT.cards.z + 0.85], look: [LAYOUT.cards.x, 0.08, LAYOUT.cards.z] },
  monopoly: { at: [LAYOUT.shelf.x + 0.9, 1.4, LAYOUT.shelf.z + 1.15], look: [LAYOUT.shelf.x, 1.15, LAYOUT.shelf.z] },
  toyshelf: { at: [LAYOUT.toyshelf.x - 1.45, 1.4, LAYOUT.toyshelf.z], look: [LAYOUT.toyshelf.x, 0.8, LAYOUT.toyshelf.z] },
  window: { at: [LAYOUT.window.x - 0.7, 1.5, LAYOUT.window.z + 1.4], look: [LAYOUT.window.x, 1.6, LAYOUT.window.z] },
  bed: { at: [LAYOUT.bed.x + 1.2, 1.35, LAYOUT.bed.z + 0.4], look: [LAYOUT.bed.x, 0.6, LAYOUT.bed.z] },
};

function DemoPose({ at, look }: { at: [number, number, number]; look: [number, number, number] }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(at[0], at[1], at[2]);
    camera.lookAt(look[0], look[1], look[2]);
  }, [camera, at, look]);
  return null;
}

interface WalkRoomProps {
  games: GameMetadata[];
  onSelectGame: (game: GameMetadata) => void;
  onOpenClassicShelf: () => void;
  onOpenLanding: () => void;
  onOpenRulesForGame?: (game: GameMetadata) => void;
}

const ALL_SLOTS = [...SHELF_SLOTS, ...SHELF_SLOTS_LOWER, ...DESK_SLOTS];

export function WalkRoom({
  games,
  onSelectGame,
  onOpenClassicShelf,
  onOpenLanding,
  onOpenRulesForGame,
}: WalkRoomProps) {
  const override = useMemo(readCameraOverride, []);
  const scripted = override.tour || override.shot !== undefined || Boolean(override.card);
  const [menuOpen, setMenuOpen] = useState(override.menu);
  const [mood, setMood] = useState<RoomMood>('warm-night');
  const [musicOn, setMusicOn] = useState(true);
  const [placed, setPlaced] = useState<LiveProp[]>([]);
  const [anchorId, setAnchorId] = useState(ANCHORS[0].id);
  const [placeHeight, setPlaceHeight] = useState(0.45);
  const [placeLift, setPlaceLift] = useState(0);
  const [placeShadow, setPlaceShadow] = useState(true);
  const [placeName, setPlaceName] = useState('');
  const placeBytes = useRef<ArrayBuffer | null>(null);
  const placeUrl = useRef<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [tourLabel, setTourLabel] = useState<string | null>(null);
  const [aimed, setAimed] = useState<Aimed | null>(null);
  const [pulledGameId, setPulledGameId] = useState<GameId | null>(null);
  const [tapeOn, setTapeOn] = useState(false);
  const [lampsWarm, setLampsWarm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const heavyStep = useRef(false);
  const pullTimer = useRef<number | null>(null);

  const byId = useMemo(() => new Map(games.map(g => [g.id, g])), [games]);

  const flash = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      if (pullTimer.current) window.clearTimeout(pullTimer.current);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    loadPlacements()
      .then(rows => {
        if (!cancelled) setPlaced(rows);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setMusic = useCallback((on: boolean) => {
    setMusicOn(on);
    if (on) sound.startNostalgia();
    else sound.stopNostalgia();
  }, []);

  const openMenu = useCallback(() => {
    document.exitPointerLock?.();
    setMenuOpen(true);
  }, []);

  const onUpload = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.glb')) {
      flash('Upload a .glb — same type as the Drive meshes');
      return;
    }
    file.arrayBuffer().then(bytes => {
      if (placeUrl.current) URL.revokeObjectURL(placeUrl.current);
      placeBytes.current = bytes;
      placeUrl.current = URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
      setPlaceName(file.name.replace(/\.glb$/i, ''));
      setPlaceHeight(0.45);
      setPlaceLift(0);
      setAnchorId('floor-center');
      flash('Pick an anchor, set the size, then press Enter');
    });
  }, [flash]);

  const commitPlace = useCallback(() => {
    const bytes = placeBytes.current;
    const anchor = anchorById(anchorId);
    if (!bytes || !anchor || !placeName) return;
    const placement: SavedPlacement = {
      id: crypto.randomUUID(),
      name: placeName,
      position: anchor.position,
      rotY: anchor.rotY,
      height: placeHeight,
      lift: placeLift,
      shadow: placeShadow,
      anchorId: anchor.id,
    };
    const url = placeUrl.current ?? URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
    savePlacement(placement, bytes)
      .then(() => {
        setPlaced(prev => [...prev, { placement, url }]);
        placeBytes.current = null;
        placeUrl.current = null;
        setPlaceName('');
        flash(`${placement.name} stays in the room`);
      })
      .catch(() => flash('Could not save that mesh'));
  }, [anchorId, flash, placeHeight, placeLift, placeName, placeShadow]);

  useEffect(() => {
    if (!placeName) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitPlace();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commitPlace, placeName]);

  const removePlaced = useCallback((id: string) => {
    deletePlacement(id).catch(() => {});
    setPlaced(prev => prev.filter(item => item.placement.id !== id));
  }, []);

  const ghost = useMemo(() => {
    const anchor = anchorById(anchorId);
    if (!placeName || !placeUrl.current || !anchor) return null;
    return {
      url: placeUrl.current,
      anchor,
      height: placeHeight,
      lift: placeLift,
      shadow: placeShadow,
    };
  }, [anchorId, placeHeight, placeLift, placeName, placeShadow]);

  // Auto-open the glass card when aiming at a game or memory prop in reach
  useEffect(() => {
    if (!aimed?.inReach) {
      setCardOpen(false);
      return;
    }
    if (aimed.kind === 'game' || propCardFor(aimed.id)) setCardOpen(true);
    else setCardOpen(false);
  }, [aimed]);

  const onStep = useCallback(() => {
    heavyStep.current = !heavyStep.current;
    sound.playFootstep(heavyStep.current);
  }, []);

  const playGame = useCallback(
    (game: GameMetadata) => {
      if (pulledGameId) return;
      setPulledGameId(game.id);
      setCardOpen(false);
      sound.playShelfSlide();
      flash(`Pulling ${game.title} off the shelf`);
      pullTimer.current = window.setTimeout(() => {
        sound.playCardboardLid();
        document.exitPointerLock?.();
        onSelectGame(game);
      }, 620);
    },
    [flash, onSelectGame, pulledGameId],
  );

  const handleSelect = useCallback(
    (target: Aimed) => {
      if (target.kind === 'game' && target.gameId) {
        const game = byId.get(target.gameId as GameId);
        if (!game) return;
        // First E opens / confirms the card; second E (or Play button) pulls
        if (!cardOpen) {
          setCardOpen(true);
          sound.playButtonClick();
          return;
        }
        playGame(game);
        return;
      }

      switch (target.id) {
        case 'crt-tv':
          if (!cardOpen) {
            setCardOpen(true);
            sound.playButtonClick();
            break;
          }
          sound.playButtonClick();
          document.exitPointerLock?.();
          onOpenClassicShelf();
          break;
        case 'boombox':
          if (!cardOpen) {
            setCardOpen(true);
            sound.playButtonClick();
            break;
          }
          sound.playButtonClick();
          setTapeOn(on => !on);
          flash(tapeOn ? 'Tape stopped' : 'Tape rolling');
          break;
        case 'lava-lamp':
          sound.playButtonClick();
          setLampsWarm(w => !w);
          flash(lampsWarm ? 'Lamp back to pink' : 'Lamp warmed up');
          break;
        case 'door':
          sound.playMoveClack();
          flash('Locked. Pack 02 is behind this door.');
          break;
        case 'gameboy':
        case 'bed':
        case 'vhs-stack':
        case 'cards':
          setCardOpen(true);
          sound.playButtonClick();
          break;
        default:
          break;
      }
    },
    [byId, cardOpen, flash, lampsWarm, onOpenClassicShelf, playGame, tapeOn],
  );

  const aimedGame =
    aimed?.kind === 'game' && aimed.gameId ? byId.get(aimed.gameId as GameId) ?? null : null;
  const aimedProp = aimed ? propCardFor(aimed.id) : null;
  const demoCardId = override.card;
  const demoPropId =
    demoCardId === 'vhs' ? 'vhs-stack' : demoCardId === 'gameboy' || demoCardId === 'cards' ? demoCardId : null;
  const demoGame = demoCardId && !demoPropId ? byId.get(demoCardId as GameId) ?? null : null;
  const demoProp = demoPropId ? propCardFor(demoPropId) : null;
  const cardGame = demoGame ?? aimedGame;
  const cardProp = demoProp ?? aimedProp;
  const showCard = Boolean(demoGame || demoProp) || (locked && cardOpen && aimed?.inReach && (aimedGame || aimedProp));

  const shelfTitles = SHELF_SLOTS.map(s => s.title).join(' · ');

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#140c14] select-none">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ fov: 72, near: 0.05, far: 60 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          scene.fog = new THREE.Fog('#1a1218', 8, 22);
        }}
      >
        <Suspense fallback={null}>
          <RealRoomScene
            hoveredId={aimed?.inReach ? aimed.id : null}
            pulledGameId={pulledGameId}
            tapeOn={tapeOn}
            lampsWarm={lampsWarm}
            mood={mood}
            placed={placed}
            showAnchors={menuOpen && Boolean(placeName)}
            ghost={ghost}
            onPickAnchor={(anchor: Anchor) => setAnchorId(anchor.id)}
          />
        </Suspense>
        {override.card && DEMO_POSE[override.card] ? (
          <DemoPose at={DEMO_POSE[override.card].at} look={DEMO_POSE[override.card].look} />
        ) : scripted ? (
          <TourCamera staticIndex={override.shot} onWaypoint={label => setTourLabel(label)} />
        ) : (
          <>
            <WalkController enabled={!pulledGameId} onLockChange={setLocked} onStep={onStep} />
            <ReachRaycaster enabled={locked && !pulledGameId} onAim={setAimed} onSelect={handleSelect} />
          </>
        )}
      </Canvas>

      {scripted && tourLabel && (
        <div className="pointer-events-none absolute left-6 bottom-6 rounded-xl bg-black/60 border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] font-bold text-amber-200">
          {tourLabel}
        </div>
      )}

      {locked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={`rounded-full border transition-all duration-150 ${
              aimed?.inReach
                ? 'w-5 h-5 border-amber-300/90 bg-amber-200/20'
                : aimed
                  ? 'w-3.5 h-3.5 border-white/60'
                  : 'w-1.5 h-1.5 border-white/70 bg-white/70'
            }`}
          />
        </div>
      )}

      {/* Glass flash card — games + nostalgia props */}
      <button
        type="button"
        onClick={openMenu}
        className="absolute left-4 top-4 z-40 rounded-xl border border-white/20 bg-black/50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-100 backdrop-blur-xl hover:bg-black/70"
      >
        Menu
      </button>
      <RoomStudio
        open={menuOpen}
        mood={mood}
        music={musicOn}
        placing={Boolean(placeName)}
        placeName={placeName}
        anchorId={anchorId}
        height={placeHeight}
        lift={placeLift}
        shadow={placeShadow}
        saved={placed.map(item => ({ id: item.placement.id, name: item.placement.name }))}
        onClose={() => setMenuOpen(false)}
        onMood={setMood}
        onMusic={setMusic}
        onFile={onUpload}
        onAnchor={setAnchorId}
        onHeight={setPlaceHeight}
        onLift={setPlaceLift}
        onShadow={setPlaceShadow}
        onCommit={commitPlace}
        onCancelPlace={() => {
          placeBytes.current = null;
          if (placeUrl.current) URL.revokeObjectURL(placeUrl.current);
          placeUrl.current = null;
          setPlaceName('');
        }}
        onDelete={removePlaced}
      />

      {showCard && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 sm:right-8">
          {cardGame ? (
            <MemoryFlashCard
              kind="game"
              game={cardGame}
              onPlay={() => playGame(cardGame)}
              onRules={() => {
                document.exitPointerLock?.();
                onOpenRulesForGame?.(cardGame);
              }}
              onClose={() => setCardOpen(false)}
            />
          ) : cardProp ? (
            <MemoryFlashCard
              kind="prop"
              prop={cardProp}
              onClose={() => setCardOpen(false)}
              onAction={
                cardProp.id === 'boombox'
                  ? () => {
                      setTapeOn(on => !on);
                      flash(tapeOn ? 'Tape stopped' : 'Tape rolling');
                    }
                  : cardProp.id === 'crt-tv'
                    ? () => {
                        document.exitPointerLock?.();
                        onOpenClassicShelf();
                      }
                    : undefined
              }
              actionLabel={
                cardProp.id === 'boombox'
                  ? tapeOn
                    ? 'Stop the tape'
                    : 'Press play'
                  : cardProp.id === 'crt-tv'
                    ? 'Open flat game list'
                    : undefined
              }
            />
          ) : null}
        </div>
      )}

      {locked && aimed && !showCard && (
        <div className="pointer-events-none absolute left-1/2 top-[56%] -translate-x-1/2 text-center">
          <p className="font-display text-xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">{aimed.label}</p>
          <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200/90 font-bold mt-1">
            {aimed.inReach ? `[E] ${aimed.hint ?? 'Inspect'}` : 'Walk closer'}
          </p>
        </div>
      )}

      {toast && (
        <div className="pointer-events-none absolute left-1/2 bottom-24 -translate-x-1/2 rounded-2xl bg-black/75 border border-white/15 px-4 py-2 text-sm text-white backdrop-blur">
          {toast}
        </div>
      )}

      {locked && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-white/70">
          {[
            ['W A S D', 'walk'],
            ['Shift', 'run'],
            ['C', 'crouch'],
            ['Mouse', 'look'],
            ['E', 'inspect / play'],
            ['Esc', 'release'],
          ].map(([key, what]) => (
            <span key={key} className="rounded-lg bg-black/55 border border-white/10 px-2.5 py-1">
              <span className="text-amber-200">{key}</span> {what}
            </span>
          ))}
        </div>
      )}

      {!locked && !scripted && !menuOpen && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#140c14]/80 via-[#1a0f18]/70 to-[#140c14]/90 backdrop-blur-[2px] px-6">
          <div className="max-w-xl w-full rounded-3xl border border-white/15 bg-black/65 p-7 text-center shadow-2xl">
            <p className="text-[10px] uppercase tracking-[0.35em] text-amber-200/90 font-bold">Game Room</p>
            <h1 className="font-display text-4xl sm:text-5xl text-white mt-2">Walk the bedroom</h1>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
              Free-roam first person — web, not VR. Aim at the shelf for a glass game card, or check
              nostalgia props like the Game Boy for a quick history flash.
            </p>
            <p className="text-[11px] text-slate-400 mt-3">On the shelf: {shelfTitles}</p>
            <button
              id="enter-room"
              type="button"
              onClick={() => {
                if (musicOn) sound.startNostalgia();
              }}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-fuchsia-600 to-amber-500 px-6 py-3.5 font-display text-lg text-white shadow-lg hover:brightness-110 active:scale-[0.99] transition"
            >
              Step into the room
            </button>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onOpenClassicShelf}
                className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-300 hover:text-white rounded-xl border border-white/15 px-3 py-1.5"
              >
                Flat game list
              </button>
              <button
                type="button"
                onClick={onOpenLanding}
                className="text-[11px] uppercase tracking-[0.18em] font-bold text-slate-300 hover:text-white rounded-xl border border-white/15 px-3 py-1.5"
              >
                Back to demo page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { ALL_SLOTS };
