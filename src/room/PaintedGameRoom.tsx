import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GameId, GameMetadata } from '../types';
import { sound } from '../utils/audio';
import {
  PAINTED_HOTSPOTS,
  PaintedHotspot,
  ROOM_ART,
  ROOM_ART_RATIO,
  STATIONS,
  STORY_STEPS,
  RoomStation,
} from './paintedRoom';

interface PaintedGameRoomProps {
  games: GameMetadata[];
  onSelectGame: (game: GameMetadata) => void;
  onOpenClassicShelf: () => void;
  onOpenBlockout: () => void;
  onOpenLanding: () => void;
}

export function PaintedGameRoom({
  games,
  onSelectGame,
  onOpenClassicShelf,
  onOpenBlockout,
  onOpenLanding,
}: PaintedGameRoomProps) {
  const [station, setStation] = useState<RoomStation>('wide');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pullId, setPullId] = useState<string | null>(null);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [muted, setMuted] = useState(false);
  const [reelOpen, setReelOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const gameById = useMemo(() => {
    const map = new Map<GameId, GameMetadata>();
    games.forEach(g => map.set(g.id, g));
    return map;
  }, [games]);

  const view = STATIONS[station];
  const hover = PAINTED_HOTSPOTS.find(h => h.id === hoverId) ?? null;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const go = useCallback((next: RoomStation) => {
    sound.playShelfSlide();
    setStation(next);
    setReelOpen(false);
  }, []);

  const launch = useCallback(
    (spot: PaintedHotspot) => {
      if (!spot.gameId) {
        setPullId(spot.id);
        setReelOpen(true);
        sound.playButtonClick();
        return;
      }
      const game = gameById.get(spot.gameId);
      if (!game) {
        showToast('That box is empty.');
        return;
      }
      setPullId(spot.id);
      sound.playShelfSlide();
      showToast(spot.launchNote || `Taking ${spot.label}…`);
      window.setTimeout(() => onSelectGame(game), 650);
    },
    [gameById, onSelectGame, showToast]
  );

  const activate = useCallback(
    (spot: PaintedHotspot) => {
      if (spot.id === 'boombox') {
        const next = !muted;
        setMuted(next);
        sound.setMuted(next);
        showToast(next ? 'Boombox hushed.' : 'Boombox back on.');
        return;
      }
      if (spot.id === 'door') {
        if (station !== 'door') {
          go('door');
          return;
        }
        showToast('Portal’s shut for now. The shelf is where you play.');
        return;
      }
      if (station !== spot.station) {
        go(spot.station);
        setHoverId(spot.id);
        return;
      }
      launch(spot);
    },
    [go, launch, muted, showToast, station]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (reelOpen) setReelOpen(false);
        else if (station !== 'wide') go('wide');
        else onOpenLanding();
        return;
      }
      const map: Record<string, RoomStation> = {
        ArrowLeft: 'bed',
        KeyA: 'bed',
        ArrowRight: 'shelf',
        KeyD: 'shelf',
        ArrowUp: 'tv',
        KeyW: 'tv',
        ArrowDown: 'wide',
        KeyS: 'wide',
      };
      if (e.code === 'KeyE' && hover) {
        e.preventDefault();
        activate(hover);
        return;
      }
      const next = map[e.code];
      if (next) {
        e.preventDefault();
        go(next);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activate, go, hover, onOpenLanding, reelOpen, station]);

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    setLook({ x: nx * -1.6, y: ny * -1.1 });
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#07060b] text-white overflow-hidden" onPointerMove={onPointerMove}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{
            height: `${view.height}%`,
            aspectRatio: `${ROOM_ART_RATIO}`,
            transform: `translate(${view.tx + look.x}%, ${view.ty + look.y}%)`,
            transition: 'height 850ms cubic-bezier(.22,.8,.3,1), transform 850ms cubic-bezier(.22,.8,.3,1)',
            maxWidth: 'none',
          }}
        >
          <img
            src={ROOM_ART}
            alt="Illustrated first-person game room"
            className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none"
            draggable={false}
          />

          {PAINTED_HOTSPOTS.map(spot => {
            const hot = hoverId === spot.id || pullId === spot.id;
            return (
              <button
                key={spot.id}
                type="button"
                aria-label={spot.label}
                className="absolute rounded-md transition-all duration-200"
                style={{
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  width: `${spot.w}%`,
                  height: `${spot.h}%`,
                  boxShadow: hot
                    ? '0 0 0 3px rgba(255,255,255,0.95), 0 0 24px 6px rgba(255,255,255,0.45)'
                    : '0 0 0 0 rgba(255,255,255,0)',
                  background: hot ? 'rgba(255,255,255,0.14)' : 'transparent',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => setHoverId(spot.id)}
                onMouseLeave={() => setHoverId(prev => (prev === spot.id ? null : prev))}
                onFocus={() => setHoverId(spot.id)}
                onBlur={() => setHoverId(prev => (prev === spot.id ? null : prev))}
                onClick={() => activate(spot)}
              />
            );
          })}
        </div>
      </div>

      <header className="absolute top-0 left-0 right-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4 pointer-events-none">
        <div className="pointer-events-auto bg-black/55 backdrop-blur-md border border-white/10 rounded-2xl px-3 py-2">
          <p className="text-[10px] font-black tracking-[0.28em] uppercase text-fuchsia-200">Game Room</p>
          <p className="text-xs text-slate-200">{view.label} · A/D walk · W TV · click a box</p>
        </div>
        <div className="pointer-events-auto flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => go('wide')} className="room-chip">
            Wide
          </button>
          <button type="button" onClick={() => go('shelf')} className="room-chip">
            Shelf
          </button>
          <button type="button" onClick={onOpenClassicShelf} className="room-chip">
            Game list
          </button>
          <button type="button" onClick={onOpenBlockout} className="room-chip">
            3D blockout
          </button>
        </div>
      </header>

      {hover && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-24 z-20 pointer-events-none">
          <div className="bg-black/75 border border-white/70 rounded-2xl px-4 py-3 text-center min-w-[220px] shadow-2xl">
            <p className="font-black tracking-wide">{hover.label}</p>
            <p className="text-[11px] text-slate-300 mt-1">{hover.hint}</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-fuchsia-200 mt-2">
              {station === hover.station ? 'Click to take it' : 'Click to walk over'}
            </p>
          </div>
        </div>
      )}

      {station !== 'wide' && (
        <footer className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex flex-wrap gap-x-3 justify-center text-[10px] font-bold uppercase tracking-wider text-slate-200">
            {STORY_STEPS.map((step, i) => (
              <span key={step} className="inline-flex items-center gap-2">
                <span>{step}</span>
                {i < STORY_STEPS.length - 1 && <span className="text-slate-600">›</span>}
              </span>
            ))}
          </div>
        </footer>
      )}

      {toast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-fuchsia-950/90 border border-fuchsia-300/50 text-fuchsia-50 text-xs font-bold px-4 py-2 rounded-full">
            {toast}
          </div>
        </div>
      )}

      {reelOpen && (
        <div className="absolute inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-[#120c18] border border-white/15 rounded-3xl overflow-hidden shadow-2xl">
            <img src={ROOM_ART} alt="" className="w-full h-40 object-cover object-bottom" />
            <div className="p-5">
              <p className="text-[10px] uppercase tracking-[0.28em] text-fuchsia-300 font-bold">Box pulled</p>
              <h2 className="font-display text-3xl mt-1">Monopoly</h2>
              <p className="text-sm text-slate-300 mt-2 max-w-xl">
                This is the hero box in the painting. The full Monopoly table is the next game to build.
                Battleship and Sorry! on the same shelf already play.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-black uppercase tracking-wider"
                  onClick={() => {
                    const game = gameById.get('battleship');
                    if (game) onSelectGame(game);
                  }}
                >
                  Play Battleship
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-black uppercase tracking-wider"
                  onClick={() => {
                    const game = gameById.get('pawnrush');
                    if (game) onSelectGame(game);
                  }}
                >
                  Play Sorry!
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wider"
                  onClick={() => {
                    setReelOpen(false);
                    go('shelf');
                  }}
                >
                  Back to shelf
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
