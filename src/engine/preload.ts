import { setAssetState } from './assets';
import { log } from './log';
import { noteLoadDuration } from './perf';
import { warmCartridges } from '../devices/cartridges';
import { warmTableGames } from '../room/table/tableGames';

export type PreloadStage = 'required' | 'prioritized' | 'optional';
export type PreloadState = 'queued' | 'loading' | 'ready' | 'failed' | 'cancelled';

interface Job {
  id: string;
  stage: PreloadStage;
  attempts: number;
  /** Bumped when a run is replaced, so a cancelled attempt cannot overwrite the next one. */
  generation: number;
  state: PreloadState;
  error?: string;
  run: (signal: AbortSignal) => Promise<void>;
  promise: Promise<void>;
}

const jobs = new Map<string, Job>();
let controller = new AbortController();

function nowMs() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function current(job: Job, generation: number) {
  return jobs.get(job.id) === job && job.generation === generation;
}

async function runJob(job: Job, signal: AbortSignal, generation: number): Promise<void> {
  if (!current(job, generation) || signal.aborted) {
    if (current(job, generation)) {
      job.state = 'cancelled';
      setAssetState(job.id, 'idle');
    }
    return;
  }
  job.attempts += 1;
  job.state = 'loading';
  setAssetState(job.id, 'loading');
  const started = nowMs();
  try {
    await job.run(signal);
    if (!current(job, generation)) return;
    if (signal.aborted) {
      job.state = 'cancelled';
      setAssetState(job.id, 'idle');
      return;
    }
    job.state = 'ready';
    setAssetState(job.id, 'ready');
    noteLoadDuration(job.id, nowMs() - started);
  } catch (err) {
    if (!current(job, generation)) return;
    const aborted = signal.aborted || (err instanceof DOMException && err.name === 'AbortError');
    if (aborted) {
      job.state = 'cancelled';
      setAssetState(job.id, 'idle');
      return;
    }
    if (job.attempts < 3) return runJob(job, signal, generation);
    job.state = 'failed';
    job.error = err instanceof Error ? err.message : 'failed';
    setAssetState(job.id, 'failed', job.error);
    log.warn('preload failed', { source: 'preload', asset: job.id, detail: job.error });
  }
}

function startJob(job: Job, signal: AbortSignal) {
  const generation = job.generation + 1;
  job.generation = generation;
  job.promise = runJob(job, signal, generation);
  return job.promise;
}

/** Starts a job once. A second call with the same id reuses the first run. */
export function enqueuePreload(id: string, stage: PreloadStage, run: (signal: AbortSignal) => Promise<void>): Promise<void> {
  const existing = jobs.get(id);
  if (existing && (existing.state === 'queued' || existing.state === 'loading' || existing.state === 'ready')) {
    return existing.promise;
  }
  if (existing) existing.generation += 1;
  const signal = controller.signal;
  const job: Job = {
    id,
    stage,
    attempts: 0,
    generation: 0,
    state: 'queued',
    run,
    promise: Promise.resolve(),
  };
  jobs.set(id, job);
  setAssetState(id, 'queued');
  return startJob(job, signal);
}

export function cancelPreloads() {
  controller.abort();
  for (const job of jobs.values()) {
    if (job.state !== 'queued' && job.state !== 'loading') continue;
    job.generation += 1;
    job.state = 'cancelled';
    setAssetState(job.id, 'idle');
  }
  controller = new AbortController();
}

export function retryFailed() {
  const pending: Promise<void>[] = [];
  for (const job of jobs.values()) {
    if (job.state !== 'failed' && job.state !== 'cancelled') continue;
    job.attempts = 0;
    job.error = undefined;
    job.state = 'queued';
    pending.push(startJob(job, controller.signal));
  }
  return Promise.all(pending);
}

export function preloadSnapshot() {
  const list = [...jobs.values()];
  const done = list.filter(job => job.state === 'ready').length;
  return {
    total: list.length,
    done,
    failed: list.filter(job => job.state === 'failed').length,
    loading: list.filter(job => job.state === 'loading').length,
    queued: list.filter(job => job.state === 'queued').length,
    cancelled: list.filter(job => job.state === 'cancelled').length,
    progress: list.length ? done / list.length : 1,
    jobs: list.map(job => ({
      id: job.id,
      stage: job.stage,
      state: job.state,
      attempts: job.attempts,
      error: job.error,
    })),
  };
}

/**
 * Optional bundles only. The bedroom's GLBs stay on the scene's own useGLTF
 * preload, so this never holds the playable room.
 */
export function bootOptionalContent() {
  void enqueuePreload('optional:table-games', 'optional', signal => warmTableGames(signal));
  void enqueuePreload('optional:cartridges', 'optional', signal => warmCartridges(signal));
}

export function resetPreloadForTests() {
  for (const job of jobs.values()) job.generation += 1;
  controller.abort();
  controller = new AbortController();
  jobs.clear();
}
