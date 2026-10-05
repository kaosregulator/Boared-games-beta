import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { GameId, GameMetadata } from '../types';
import { sound } from '../utils/audio';
import { VideoRoomScene } from './VideoRoomScene';
import { WalkController } from './WalkController';
import { ReachRaycaster, type Aimed } from './ReachRaycaster';
import { TourCamera } from './TourCamera';
import { DESK_SLOTS, SHELF_SLOTS, SHELF_SLOTS_LOWER } from './videoRoom';

/**
 * `?tour=1` runs a hands-off dolly through the room and `?shot=N` parks the
 * camera on tour waypoint N. Both skip pointer lock so the room can be captured
 * and reviewed without a mouse.
 */
function readCameraOverride() {
  if (typeof window === 'undefined') return { tour: false, shot: undefined as number | undefined };
  const params = new URLSearchParams(window.location.search);
  const shotRaw = params.get('shot');
  return {
    tour: params.has('tour'),
    shot: shotRaw === null ? undefined : Number.parseInt(shotRaw, 10) || 0,
  };
}

interface WalkRoomProps {
  games: GameMetadata[];
  onSelectGame: (game: GameMetadata) => void;
  onOpenClassicShelf: () => void;
  onOpenLanding: () => void;
}

const ALL_SLOTS = [...SHELF_SLOTS, ...SHELF_SLOTS_LOWER, ...DESK_SLOTS];

export function WalkRoom({ games, onSelectGame, onOpenClassicShelf, onOpenLanding }: WalkRoomProps) {
  const override = useMemo(readCameraOverride, []);
  const scripted = override.tour || override.shot !== undefined;
  const [locked, setLocked] = useState(false);
  const [tourLabel, setTourLabel] = useState<string | null>(null);
  const [aimed, setAimed] = useState<Aimed | null>(null);
  const [pulledGameId, setPulledGameId] = useState<GameId | null>(null);
  const [tapeOn, setTapeOn] = useState(false);
  const [lampsWarm, setLampsWarm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
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

  const onStep = useCallback(() => {
    heavyStep.current = !heavyStep.current;
    sound.playFootstep(heavyStep.current);
  }, []);

  const handleSelect = useCallback(
    (target: Aimed) => {
      if (target.kind === 'game' && target.gameId) {
        const game = byId.get(target.gameId as GameId);
        if (!game) return;
        if (pulledGameId) return;
        setPulledGameId(target.gameId as GameId);
        sound.playShelfSlide();
        flash(`Pulling ${game.title} off the shelf`);
        pullTimer.current = window.setTimeout(() => {
          sound.playCardboardLid();
          onSelectGame(game);
        }, 620);
        return;
      }

      switch (target.id) {
        case 'crt-tv':
          sound.playButtonClick();
          onOpenClassicShelf();
          break;
        case 'boombox':
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
        case 'east-tv':
          sound.playButtonClick();
          flash('Season standings: you are 3rd this week');
          break;
        case 'bed':
          sound.playButtonClick();
          flash('Trivia night lives on the quilt');
          break;
        default:
          break;
      }
    },
    [byId, flash, lampsWarm, onOpenClassicShelf, onSelectGame, pulledGameId, tapeOn],
  );

  const aimLabel = aimed?.label ?? null;
  const aimHint = aimed?.inReach ? aimed.hint : aimed ? 'Walk closer' : null;
  const shelfTitles = SHELF_SLOTS.map(s => s.title).join(' · ');

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#140c14] select-none">
      <Canvas
        shadows
        dpr={[1, 1.9]}
        camera={{ fov: 72, near: 0.05, far: 60 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          scene.fog = new THREE.Fog('#160d15', 7, 20);
        }}
      >
        <Suspense fallback={null}>
          <VideoRoomScene
            hoveredId={aimed?.inReach ? aimed.id : null}
            pulledGameId={pulledGameId}
            tapeOn={tapeOn}
            lampsWarm={lampsWarm}
          />
        </Suspense>
        {scripted ? (
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

      {/* crosshair */}
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

      {/* look-at label */}
      {locked && aimLabel && (
        <div className="pointer-events-none absolute left-1/2 top-[56%] -translate-x-1/2 text-center">
          <p className="font-display text-xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">{aimLabel}</p>
          {aimHint && (
            <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200/90 font-bold mt-1">
              {aimed?.inReach ? `[E] ${aimHint}` : aimHint}
            </p>
          )}
        </div>
      )}

      {toast && (
        <div className="pointer-events-none absolute left-1/2 bottom-24 -translate-x-1/2 rounded-2xl bg-black/75 border border-white/15 px-4 py-2 text-sm text-white backdrop-blur">
          {toast}
        </div>
      )}

      {/* controls strip */}
      {locked && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-white/70">
          {[
            ['W A S D', 'walk'],
            ['Shift', 'run'],
            ['C', 'crouch'],
            ['Mouse', 'look'],
            ['E', 'use'],
            ['Esc', 'release'],
          ].map(([key, what]) => (
            <span key={key} className="rounded-lg bg-black/55 border border-white/10 px-2.5 py-1">
              <span className="text-amber-200">{key}</span> {what}
            </span>
          ))}
        </div>
      )}

      {/* entry overlay */}
      {!locked && !scripted && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#140c14]/80 via-[#1a0f18]/70 to-[#140c14]/90 backdrop-blur-[2px] px-6">
          <div className="max-w-xl w-full rounded-3xl border border-fuchsia-400/25 bg-black/65 p-7 text-center shadow-2xl">
            <p className="text-[10px] uppercase tracking-[0.35em] text-fuchsia-300 font-bold">Game Room · Beta</p>
            <h1 className="font-display text-4xl sm:text-5xl text-white mt-2">Walk the bedroom</h1>
            <p className="text-sm text-slate-300 mt-3 leading-relaxed">
              Free-roam first person. Walk to the shelf, aim at a box and press <span className="text-amber-200 font-bold">E</span> to
              pull it down. The board unfolds on the table in front of you.
            </p>
            <p className="text-[11px] text-slate-400 mt-3">On the shelf: {shelfTitles}</p>
            <button
              id="enter-room"
              type="button"
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
