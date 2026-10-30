import React, { useEffect } from 'react';
import { restart, startRound } from './game';
import { desk, quitSandwich, useSandwichHud } from './store';
import { duckMusic, sfx } from './sound';

/**
 * Score, level and the icky meter over the desk game, the round-end and
 * game-over cards, and the controls: arrows or A/D on a keyboard, two big
 * hold buttons on a touch screen.
 */

const FONT = { fontFamily: '"Trebuchet MS", "Comic Sans MS", system-ui, sans-serif' };

function nextRound() {
  const g = desk.game;
  if (!g) return;
  sfx('click');
  if (g.phase === 'won') startRound(g);
  else if (g.phase === 'lost') restart(g);
}

function togglePause() {
  const g = desk.game;
  if (!g || (g.phase !== 'play' && !g.paused)) return;
  g.paused = !g.paused;
  duckMusic(g.paused);
  sfx('click');
}

export function SandwichHud({ touch }: { touch: boolean }) {
  const hud = useSandwichHud();
  const playing = hud.stage === 'on';

  useEffect(() => {
    desk.touch = touch;
  }, [touch]);

  useEffect(() => {
    if (hud.stage === 'off') return;
    const set = (code: string, on: boolean) => {
      if (code === 'ArrowLeft' || code === 'KeyA') desk.keys.left = on;
      else if (code === 'ArrowRight' || code === 'KeyD') desk.keys.right = on;
      else return false;
      return true;
    };
    const down = (e: KeyboardEvent) => {
      // Every key is the game's while it's up: the room's Escape (step back) and F (big screen) never see them.
      e.stopPropagation();
      if (set(e.code, true)) {
        e.preventDefault();
        return;
      }
      if (e.repeat) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        quitSandwich();
      } else if (e.code === 'KeyP') togglePause();
      else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        const g = desk.game;
        if (g?.phase === 'won' || g?.phase === 'lost') nextRound();
        else togglePause();
      }
    };
    const up = (e: KeyboardEvent) => {
      e.stopPropagation();
      set(e.code, false);
    };
    const blur = () => {
      desk.keys.left = desk.keys.right = false;
      desk.touchMove = 0;
    };
    window.addEventListener('keydown', down, true);
    window.addEventListener('keyup', up, true);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down, true);
      window.removeEventListener('keyup', up, true);
      window.removeEventListener('blur', blur);
      blur();
    };
  }, [hud.stage]);

  if (hud.stage === 'off') return null;
  const ick = Array.from({ length: 4 }, (_, i) => i < hud.ick);

  return (
    <div data-ui="sandwich" className="pointer-events-none absolute inset-0 z-30 select-none" style={FONT}>
      <style>{`
        @keyframes sw-shout { 0% { transform: translate(-50%,-50%) scale(0) rotate(-8deg); opacity: 0 }
          18% { transform: translate(-50%,-50%) scale(1.15) rotate(3deg); opacity: 1 }
          70% { transform: translate(-50%,-50%) scale(1) rotate(0); opacity: 1 }
          100% { transform: translate(-50%,-50%) scale(0) rotate(360deg); opacity: 0 } }
        @keyframes sw-points { 0% { transform: translate(-50%,0); opacity: 0 } 20% { opacity: 1 } 100% { transform: translate(-50%,-40px); opacity: 0 } }
        @keyframes sw-card { from { transform: translate(-50%,-50%) scale(.85); opacity: 0 } to { transform: translate(-50%,-50%) scale(1); opacity: 1 } }
      `}</style>

      {playing && (
        <div className="absolute left-4 top-16 flex items-center gap-3 sm:top-4 rounded-2xl border border-amber-200/30 bg-black/60 px-3 py-2 text-amber-50 shadow-lg">
          <div className="hidden pr-1 text-center text-[13px] font-black uppercase leading-[0.95] text-amber-300 sm:block" style={{ textShadow: '0 2px 0 #7a2e00' }}>
            Sandwich
            <br />
            Stacker
          </div>
          <div className="leading-tight">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/80">Level {hud.round}</div>
            <div className="text-xl font-black tabular-nums">{hud.score.toLocaleString()}</div>
          </div>
          <div className="leading-tight">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-lime-200/80">Ick</div>
            <div className="mt-1 flex gap-1">
              {ick.map((on, i) => (
                <span
                  key={i}
                  className={`h-3 w-3 rounded-full border ${on ? 'border-lime-200 bg-lime-400' : 'border-white/30 bg-white/10'} ${on && hud.ick === 3 ? 'animate-pulse' : ''}`}
                />
              ))}
            </div>
          </div>
          {touch && (
            <button
              type="button"
              onClick={togglePause}
              className="pointer-events-auto ml-1 rounded-lg border border-white/30 bg-white/10 px-2 py-1 text-xs font-bold"
            >
              {hud.paused ? '▶' : 'II'}
            </button>
          )}
        </div>
      )}

      {hud.shout && (
        <div
          key={hud.shout.key}
          className={`absolute left-1/2 top-[38%] whitespace-nowrap font-black ${
            hud.shout.tone === 'level' ? 'text-5xl text-amber-100 sm:text-6xl' : 'text-4xl text-lime-200 sm:text-5xl'
          }`}
          style={{
            animation: `sw-shout ${hud.shout.tone === 'level' ? 1.9 : 1.1}s ease-in-out forwards`,
            textShadow: '0 4px 0 rgba(0,0,0,.55), 0 0 24px rgba(0,0,0,.6)',
            WebkitTextStroke: '1.5px rgba(60,30,0,.65)',
          }}
        >
          {hud.shout.text}
        </div>
      )}

      {hud.points && hud.phase === 'eating' && (
        <div
          key={hud.points.key}
          className="absolute left-1/2 top-[30%] text-3xl font-black text-white"
          style={{ animation: 'sw-points .9s ease-out forwards', textShadow: '0 3px 0 rgba(0,0,0,.6)' }}
        >
          +{hud.points.n.toLocaleString()}
        </div>
      )}

      {playing && hud.paused && <Card title="Paused" lines={['take a sandwich break!']} action="Keep stacking" onAction={togglePause} />}

      {playing && hud.phase === 'won' && (
        <Card
          title={`Level ${hud.round - 1} done!`}
          lines={[hud.flavor[0], hud.flavor[1], `Score: ${hud.score.toLocaleString()}`]}
          action="Next sandwich"
          onAction={nextRound}
        />
      )}

      {playing && hud.phase === 'lost' && (
        <Card
          title="Game over"
          lines={[hud.flavor[0], `${hud.caught.toLocaleString()} ${hud.caught === 1 ? 'ingredient' : 'ingredients'} caught`, `Final score: ${hud.score.toLocaleString()}`]}
          favs={hud.favs}
          action="Play again"
          onAction={nextRound}
        />
      )}

      {playing && touch && (
        <>
          <HoldButton dir={-1} className="left-4" />
          <HoldButton dir={1} className="right-4" />
        </>
      )}

      {playing && !touch && hud.phase === 'play' && !hud.paused && (
        <p className="absolute bottom-3 left-1/2 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">
          ← → or A D move · catch the food, dodge the icky stuff · P pause · Esc back to Windows
        </p>
      )}
    </div>
  );
}

function Card({ title, lines, favs, action, onAction }: { title: string; lines: string[]; favs?: string[]; action: string; onAction: () => void }) {
  return (
    <div
      className="pointer-events-auto absolute left-1/2 top-1/2 w-[min(92vw,380px)] rounded-3xl border-4 border-amber-300 bg-[#2b1a3a]/95 px-6 py-5 text-center text-amber-50 shadow-2xl"
      style={{ animation: 'sw-card .35s ease-out forwards' }}
    >
      <h2 className="text-3xl font-black text-amber-200">{title}</h2>
      {lines.filter(Boolean).map(line => (
        <p key={line} className="mt-2 text-base font-bold leading-snug">
          {line}
        </p>
      ))}
      {favs && favs.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/70">Favourite ingredients</p>
          <div className="mt-1 flex items-end justify-center gap-3">
            {favs.map(k => (
              <img key={k} src={`/sandwich/img/${k}-1.png`} alt={k} className="h-12 w-auto" draggable={false} />
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 flex justify-center gap-2">
        <button type="button" onClick={onAction} className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-black uppercase tracking-wide text-[#2b1a3a] hover:bg-amber-200">
          {action}
        </button>
        <button
          type="button"
          onClick={() => quitSandwich()}
          className="rounded-xl border border-white/30 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white/90 hover:bg-white/10"
        >
          Back to Windows
        </button>
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Space for {action.toLowerCase()} · Esc for Windows</p>
    </div>
  );
}

function HoldButton({ dir, className }: { dir: -1 | 1; className: string }) {
  const hold = (on: boolean) => {
    if (on) desk.touchMove = dir;
    else if (desk.touchMove === dir) desk.touchMove = 0;
  };
  return (
    <button
      type="button"
      aria-label={dir < 0 ? 'Move left' : 'Move right'}
      onPointerDown={e => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        hold(true);
      }}
      onPointerUp={() => hold(false)}
      onPointerCancel={() => hold(false)}
      onContextMenu={e => e.preventDefault()}
      className={`pointer-events-auto absolute bottom-5 ${className} flex h-24 w-24 items-center justify-center rounded-full border-4 border-amber-200/70 bg-black/55 text-4xl font-black text-amber-100 active:bg-amber-300/40`}
      style={{ touchAction: 'none' }}
    >
      {dir < 0 ? '◀' : '▶'}
    </button>
  );
}
