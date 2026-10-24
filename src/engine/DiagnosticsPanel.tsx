import { useEffect, useState } from 'react';
import { buildDiagnosticsReport } from './report';
import { currentGraphics, setAdaptive, setGraphicsPreset, type GraphicsPreset } from './graphics';
import { useGraphics } from './useGraphics';

function download(report: unknown) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'boared-engine-report.json';
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Dev overlay. The room stays on High until someone opens this and chooses
 * otherwise. Adaptive is off until that choice is made here.
 */
export function DiagnosticsPanel() {
  const gfx = useGraphics();
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(n => n + 1), 500);
    return () => window.clearInterval(id);
  }, []);
  const report = open ? buildDiagnosticsReport() : null;
  void tick;

  return (
    <div className="pointer-events-auto absolute top-3 left-1/2 z-[70] w-[min(28rem,calc(100vw-1.5rem))] -translate-x-1/2 font-mono text-[11px] text-white">
      <button
        type="button"
        className="rounded-full border border-white/30 bg-black/70 px-3 py-1"
        onClick={() => setOpen(value => !value)}
      >
        {open ? 'Hide engine' : 'Engine'}
      </button>
      {report && (
        <div className="mt-2 max-h-[42vh] overflow-auto rounded-lg border border-white/20 bg-black/80 p-3 leading-relaxed">
          <p>game {report.games.map(game => `${game.id}:${game.phase}`).join(', ') || 'room'}</p>
          <p>
            graphics showing {gfx.effective}
            {gfx.effective !== gfx.preset ? ` (choice ${gfx.preset})` : ''} dpr {gfx.dpr} adaptive {gfx.adaptive ? 'on' : 'off'}
          </p>
          <p className="flex flex-wrap gap-1">
            {(['high', 'balanced', 'low'] as GraphicsPreset[]).map(preset => (
              <button
                key={preset}
                type="button"
                aria-pressed={preset === gfx.effective}
                className={`rounded border px-2 py-0.5 ${preset === gfx.effective ? 'border-white bg-white/20' : 'border-white/30'}`}
                onClick={() => setGraphicsPreset(preset)}
              >
                {preset}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={gfx.adaptive}
              className="rounded border border-white/30 px-2 py-0.5"
              onClick={() => setAdaptive(!currentGraphics().adaptive)}
            >
              adaptive {gfx.adaptive ? 'on' : 'off'}
            </button>
          </p>
          <p>
            preload {report.preload.done}/{report.preload.total} failed {report.preload.failed} loading {report.preload.loading}
          </p>
          <p>
            cache hit {report.cache.hits} miss {report.cache.misses} pins {report.cache.pins} retained {report.cache.retained}
          </p>
          <p>
            fps {report.perf.fps.toFixed(1)} frame {report.perf.avgFrameMs.toFixed(1)}ms p95 {report.perf.p95FrameMs.toFixed(1)}ms draws{' '}
            {report.perf.renderer?.calls ?? 'n/a'} tris {report.perf.renderer?.triangles ?? 'n/a'} ({report.perf.rendererMeasurement})
          </p>
          <p>
            long tasks {report.perf.longTasks.count} ({report.perf.longTasks.measurement}) memory{' '}
            {report.memory.usedBytes === null ? 'unavailable' : `${Math.round(report.memory.usedBytes / 1048576)}MB estimate`}
          </p>
          <p>
            context lost {report.recovery.losses} restored {report.recovery.restores}
          </p>
          <p>assets failed {report.assets.filter(asset => asset.state === 'failed').length}</p>
          <ul className="mt-1 max-h-24 overflow-auto text-amber-200">
            {report.warnings.slice(-8).map(entry => (
              <li key={`${entry.ts}-${entry.message}`}>
                {entry.level} {entry.source} {entry.message}
              </li>
            ))}
          </ul>
          <button type="button" className="mt-2 rounded border border-white/30 px-2 py-0.5" onClick={() => download(buildDiagnosticsReport())}>
            Export report
          </button>
          <p className="mt-1 text-white/50">{report.correlationId}</p>
        </div>
      )}
    </div>
  );
}
