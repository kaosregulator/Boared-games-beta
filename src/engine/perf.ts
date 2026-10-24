export interface RendererSample {
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
}

export interface PerfSnapshot {
  frames: number;
  /** Mean of recorded frame deltas. Exact for those samples, not a guess. */
  avgFrameMs: number;
  p95FrameMs: number;
  /** Derived from the recorded frame deltas. */
  fps: number;
  /** Last WebGLRenderer.info sample. Null until the bridge has sampled. */
  renderer: RendererSample | null;
  rendererMeasurement: 'exact' | 'unavailable';
  longTasks: {
    count: number;
    ms: number;
    measurement: 'exact' | 'unsupported';
  };
  loads: { id: string; ms: number }[];
}

const FRAME_CAP = 120;
const frames: number[] = [];
let renderer: RendererSample | null = null;
let longTaskCount = 0;
let longTaskMs = 0;
let longTaskSupported = false;
let observer: PerformanceObserver | null = null;
const loads: { id: string; ms: number }[] = [];

export function noteFrame(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return;
  frames.push(ms);
  if (frames.length > FRAME_CAP) frames.shift();
}

export function noteRenderer(sample: RendererSample) {
  renderer = sample;
}

export function noteLoadDuration(id: string, ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return;
  loads.push({ id, ms });
  if (loads.length > 50) loads.shift();
}

export function frameFps(): number {
  if (!frames.length) return 0;
  const avg = frames.reduce((sum, ms) => sum + ms, 0) / frames.length;
  return avg > 0 ? 1000 / avg : 0;
}

/** Long-task timing exists only where the browser exposes it. */
export function startPerfObservers() {
  if (observer || typeof PerformanceObserver === 'undefined') return;
  try {
    observer = new PerformanceObserver(list => {
      longTaskSupported = true;
      for (const entry of list.getEntries()) {
        longTaskCount += 1;
        longTaskMs += entry.duration;
      }
    });
    observer.observe({ type: 'longtask', buffered: true });
    longTaskSupported = true;
  } catch {
    observer = null;
    longTaskSupported = false;
  }
}

export function perfSnapshot(): PerfSnapshot {
  const samples = frames.slice();
  const sum = samples.reduce((total, ms) => total + ms, 0);
  const avg = samples.length ? sum / samples.length : 0;
  const sorted = samples.slice().sort((a, b) => a - b);
  const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;
  return {
    frames: samples.length,
    avgFrameMs: avg,
    p95FrameMs: p95,
    fps: avg > 0 ? 1000 / avg : 0,
    renderer,
    rendererMeasurement: renderer ? 'exact' : 'unavailable',
    longTasks: {
      count: longTaskCount,
      ms: longTaskMs,
      measurement: longTaskSupported ? 'exact' : 'unsupported',
    },
    loads: loads.slice(),
  };
}

export function resetPerfForTests() {
  frames.length = 0;
  loads.length = 0;
  renderer = null;
  longTaskCount = 0;
  longTaskMs = 0;
  observer?.disconnect();
  observer = null;
  longTaskSupported = false;
}
