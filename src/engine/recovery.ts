import { log } from './log';

let losses = 0;
let restores = 0;
let lastLossAt: number | null = null;

export function noteContextLoss() {
  losses += 1;
  lastLossAt = Date.now();
  log.warn('webgl context lost', { source: 'recovery', losses });
}

export function noteContextRestored() {
  restores += 1;
  log.info('webgl context restored', { source: 'recovery', restores });
}

export function contextRecoverySnapshot() {
  return { losses, restores, lastLossAt };
}

/**
 * Chrome exposes performance.memory. Other browsers do not.
 * The number is an estimate of the JS heap, not GPU memory.
 */
export function memoryEstimate(): {
  usedBytes: number | null;
  measurement: 'estimate' | 'unavailable';
  source: 'performance.memory';
} {
  const perf = globalThis.performance as Performance & { memory?: { usedJSHeapSize?: number } };
  const bytes = perf?.memory?.usedJSHeapSize;
  if (typeof bytes === 'number' && Number.isFinite(bytes)) {
    return { usedBytes: bytes, measurement: 'estimate', source: 'performance.memory' };
  }
  return { usedBytes: null, measurement: 'unavailable', source: 'performance.memory' };
}

export function resetRecoveryForTests() {
  losses = 0;
  restores = 0;
  lastLossAt = null;
}
