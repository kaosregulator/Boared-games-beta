import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameMetadata, GameId } from '../types';
import { sound } from '../utils/audio';
import { BedroomScene } from './BedroomScene';
import { PlayerController } from './PlayerController';
import { HoverTarget } from './Interactable';
import {
  Crosshair,
  Gamepad2,
  Keyboard,
  MousePointer2,
  Sparkles,
  Volume2,
  VolumeX,
  DoorOpen,
  Library,
} from 'lucide-react';

interface FirstPersonGameRoomProps {
  games: GameMetadata[];
  onSelectGame: (game: GameMetadata) => void;
  onOpenClassicShelf: () => void;
  onOpenBotConsole: () => void;
  onOpenRulesForGame: (game: GameMetadata) => void;
}

export function FirstPersonGameRoom({
  games,
  onSelectGame,
  onOpenClassicShelf,
  onOpenBotConsole,
}: FirstPersonGameRoomProps) {
  const [locked, setLocked] = useState(false);
  const [hover, setHover] = useState<HoverTarget | null>(null);
  const [doorOpen, setDoorOpen] = useState(false);
  const [ambienceOn, setAmbienceOn] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [pullingId, setPullingId] = useState<string | null>(null);

  const gameById = useMemo(() => {
    const map = new Map<GameId, GameMetadata>();
    games.forEach(g => map.set(g.id, g));
    return map;
  }, [games]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const handleSelect = useCallback(
    (target: HoverTarget) => {
      sound.playButtonClick();

      if (target.kind === 'game' && target.gameId) {
        const game = gameById.get(target.gameId as GameId);
        if (!game) {
          showToast('That box is empty in this beta build.');
          return;
        }
        setPullingId(target.id);
        setDoorOpen(true);
        sound.playShelfSlide();
        showToast(`Pulling ${game.title} from the shelf…`);
        window.setTimeout(() => {
          document.exitPointerLock?.();
          onSelectGame(game);
        }, 700);
        return;
      }

      if (target.id === 'crt-tv') {
        document.exitPointerLock?.();
        onOpenClassicShelf();
        return;
      }
      if (target.id === 'portal-door') {
        setDoorOpen(prev => !prev);
        showToast(doorOpen ? 'Door closed.' : 'Pack 02 portal peek — coming soon.');
        return;
      }
      if (target.id === 'boombox') {
        const next = !ambienceOn;
        setAmbienceOn(next);
        sound.setMuted(!next);
        showToast(next ? 'Boombox on.' : 'Boombox muted.');
        return;
      }
      if (target.id === 'gameboy') {
        showToast('No cartridge loaded — beta tease.');
      }
    },
    [ambienceOn, doorOpen, gameById, onOpenClassicShelf, onSelectGame, showToast]
  );

  return (
    <div className="relative w-full flex-1 h-[calc(100vh-6.5rem)] min-h-[560px] rounded-2xl overflow-hidden border border-fuchsia-500/20 shadow-[0_0_60px_-20px_rgba(192,38,255,0.45)] bg-[#0a0612] my-2 mx-2 sm:mx-4">
      {/* 3D viewport */}
      <Canvas
        shadows
        camera={{ fov: 70, near: 0.08, far: 40, position: [0, 1.55, 2.4] }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        className="absolute inset-0"
        style={{ width: '100%', height: '100%' }}
        onPointerMissed={() => setHover(null)}
      >
        <color attach="background" args={['#09050f']} />
        <fog attach="fog" args={['#09050f', 6, 16]} />
        <Suspense fallback={null}>
          <BedroomScene
            activeId={hover?.id ?? pullingId}
            onHover={setHover}
            onSelect={handleSelect}
            doorOpen={doorOpen}
          />
          <PlayerController enabled={!pullingId} onLockChange={setLocked} />
        </Suspense>
      </Canvas>

      {/* Crosshair */}
      {locked && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
          <div className={`w-5 h-5 border rounded-full transition-colors ${hover ? 'border-fuchsia-300 bg-fuchsia-400/20' : 'border-white/50'}`}>
            <div className="absolute inset-0 m-auto w-1 h-1 rounded-full bg-white/80" />
          </div>
        </div>
      )}

      {/* Top beta brand strip */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-start justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto bg-black/55 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-fuchsia-300" />
            <div>
              <p className="text-[11px] font-black tracking-[0.22em] text-fuchsia-200 uppercase">Game Room Beta</p>
              <p className="text-[10px] text-slate-300">The whole room is the menu — walk, look, pick a box</p>
            </div>
          </div>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playButtonClick();
              onOpenClassicShelf();
            }}
            className="bg-black/55 backdrop-blur-md border border-white/10 hover:border-cyan-400/40 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-cyan-200 flex items-center gap-1.5"
          >
            <Library className="w-3.5 h-3.5" />
            Classic Shelf
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playButtonClick();
              onOpenBotConsole();
            }}
            className="bg-black/55 backdrop-blur-md border border-white/10 hover:border-amber-400/40 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-200 flex items-center gap-1.5"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            Bot
          </button>
        </div>
      </div>

      {/* Interaction prompt */}
      {locked && hover && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-black/70 border border-fuchsia-400/40 rounded-2xl px-4 py-3 text-center shadow-xl min-w-[240px]">
            <p className="text-sm font-bold text-white">{hover.label}</p>
            {hover.hint && <p className="text-[11px] text-slate-300 mt-0.5">{hover.hint}</p>}
            <p className="text-[10px] uppercase tracking-widest text-fuchsia-300 mt-2">
              {hover.kind === 'game' ? 'Click to unbox & play' : 'Click to interact'}
            </p>
          </div>
        </div>
      )}

      {/* Click to enter overlay */}
      {!locked && !pullingId && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-gradient-to-b from-black/70 via-black/40 to-black/75 backdrop-blur-[2px]">
          <div className="max-w-lg mx-4 text-center">
            <p className="text-[11px] font-black tracking-[0.35em] text-fuchsia-300 uppercase mb-2">Midnight Bedroom · Pack 01</p>
            <h2 className="font-display text-4xl sm:text-5xl text-white leading-none mb-3">
              Game Room <span className="text-fuchsia-300">Beta</span>
            </h2>
            <p className="text-sm text-slate-300 mb-6">
              Walk the room. Look at anything interactive — shelf boxes glow when you aim. Pull a game to play.
            </p>
            <button
              id="enter-game-room"
              type="button"
              className="inline-flex items-center gap-2 rounded-2xl bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-black uppercase tracking-wider px-6 py-3.5 shadow-lg shadow-fuchsia-900/50 transition-transform hover:scale-105 active:scale-95"
            >
              <MousePointer2 className="w-4 h-4" />
              Click to Enter Room
            </button>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1.5"><Keyboard className="w-3.5 h-3.5" /> WASD move · Shift sprint</span>
              <span className="inline-flex items-center gap-1.5"><Crosshair className="w-3.5 h-3.5" /> Mouse look · Click interact</span>
              <span className="inline-flex items-center gap-1.5"><DoorOpen className="w-3.5 h-3.5" /> Esc unlock cursor</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom storyboard strip */}
      <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none">
        <div className="bg-black/55 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 flex flex-wrap gap-2 justify-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-300">
          {['Walk to shelf', 'Aim at a game', 'Highlight glow', 'Click to pull', 'Unbox', 'Play', 'Return home'].map((step, i) => (
            <span key={step} className="inline-flex items-center gap-2">
              <span className="text-fuchsia-300/90">{step}</span>
              {i < 6 && <span className="text-slate-600">›</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Ambience indicator */}
      <div className="absolute top-16 right-3 z-20 pointer-events-none">
        <div className="bg-black/45 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-slate-300 inline-flex items-center gap-1">
          {ambienceOn ? <Volume2 className="w-3 h-3 text-cyan-300" /> : <VolumeX className="w-3 h-3 text-slate-500" />}
          {ambienceOn ? 'Room live' : 'Muted'}
        </div>
      </div>

      {toast && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="bg-fuchsia-950/90 border border-fuchsia-400/50 text-fuchsia-100 text-xs font-bold px-4 py-2 rounded-full shadow-xl">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
