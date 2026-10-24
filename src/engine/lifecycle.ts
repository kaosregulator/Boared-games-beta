import { log } from './log';

export type MiniGamePhase = 'initialize' | 'load' | 'start' | 'pause' | 'resume' | 'reset' | 'unload';

export interface MiniGameSnapshot {
  id: string;
  phase: MiniGamePhase;
  startedAt: number;
}

interface OpenGame {
  id: string;
  phase: MiniGamePhase;
  startedAt: number;
  cleanups: Array<() => void>;
}

const games = new Map<string, OpenGame>();

export interface MiniGameHandle {
  id: string;
  addCleanup: (fn: () => void) => void;
  close: () => void;
}

function runCleanups(game: OpenGame) {
  const fns = game.cleanups.splice(0);
  for (const fn of fns) {
    try {
      fn();
    } catch (err) {
      log.warn('mini-game cleanup failed', {
        source: 'lifecycle',
        gameId: game.id,
        detail: err instanceof Error ? err.message : 'cleanup failed',
      });
    }
  }
}

export function openMiniGame(id: string): MiniGameHandle {
  const prev = games.get(id);
  if (prev) {
    prev.phase = 'unload';
    runCleanups(prev);
    games.delete(id);
  }
  const game: OpenGame = { id, phase: 'start', startedAt: Date.now(), cleanups: [] };
  games.set(id, game);
  log.info('mini-game start', { source: 'lifecycle', gameId: id });
  return {
    id,
    addCleanup(fn) {
      const current = games.get(id);
      if (current) current.cleanups.push(fn);
    },
    close() {
      unloadMiniGame(id);
    },
  };
}

export function setMiniGamePhase(id: string, phase: MiniGamePhase) {
  const game = games.get(id);
  if (!game || phase === 'unload') return;
  game.phase = phase;
}

export function unloadMiniGame(id: string) {
  const game = games.get(id);
  if (!game) return;
  game.phase = 'unload';
  runCleanups(game);
  games.delete(id);
  log.info('mini-game unload', { source: 'lifecycle', gameId: id });
}

export function listMiniGames(): MiniGameSnapshot[] {
  return [...games.values()].map(game => ({ id: game.id, phase: game.phase, startedAt: game.startedAt }));
}

export function resetLifecycleForTests() {
  for (const game of [...games.values()]) {
    game.phase = 'unload';
    runCleanups(game);
  }
  games.clear();
}
