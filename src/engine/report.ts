import { listAssets } from './assets';
import { cacheSnapshot } from './cache';
import { currentGraphics } from './graphics';
import { listMiniGames } from './lifecycle';
import { exportLogReport } from './log';
import { perfSnapshot } from './perf';
import { preloadSnapshot } from './preload';
import { contextRecoverySnapshot, memoryEstimate } from './recovery';

export function buildDiagnosticsReport() {
  const logReport = exportLogReport();
  return {
    generatedAt: new Date().toISOString(),
    correlationId: logReport.correlationId,
    graphics: currentGraphics(),
    preload: preloadSnapshot(),
    cache: cacheSnapshot(),
    perf: perfSnapshot(),
    games: listMiniGames(),
    recovery: contextRecoverySnapshot(),
    memory: memoryEstimate(),
    assets: listAssets(),
    warnings: logReport.entries.filter(entry => entry.level === 'warn' || entry.level === 'error'),
  };
}
