import {
  configureLog,
  exportLogReport as exportRawReport,
  getCorrelationId,
  getLogHistory as rawHistory,
  log as writeLog,
  resetLogForTests,
} from '../../logCore.mjs';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  source?: string;
  gameId?: string;
  asset?: string;
  stack?: string;
  err?: unknown;
  error?: unknown;
  [key: string]: unknown;
}

export interface LogEntry {
  ts: string;
  level: LogLevel;
  message: string;
  correlationId: string;
  source: string;
  gameId?: string;
  asset?: string;
  stack?: string;
  fields: Record<string, unknown>;
}

const env = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env;
const diagQuery = typeof location !== 'undefined' && new URLSearchParams(location.search).get('diag') === '1';
configureLog({ console: env?.DEV || diagQuery ? 'all' : 'warn' });

export { getCorrelationId, resetLogForTests };

function asEntry(value: unknown): LogEntry {
  return value as LogEntry;
}

export function getLogHistory(): LogEntry[] {
  return (rawHistory() as unknown[]).map(asEntry);
}

export function exportLogReport(): { correlationId: string; generatedAt: string; entries: LogEntry[] } {
  const report = exportRawReport() as { correlationId: string; generatedAt: string; entries: unknown[] };
  return { ...report, entries: report.entries.map(asEntry) };
}

function write(level: LogLevel, message: string, fields?: LogFields) {
  const entry = asEntry(writeLog(level, message, fields));
  if (level === 'error') reportToServer(entry);
  return entry;
}

/** Which bundle this is, stamped by vite.config.ts; the server logs a mismatch as a stale page. */
export const BUILD_ID: string = (import.meta as ImportMeta & { env?: { VITE_BUILD_ID?: string } }).env?.VITE_BUILD_ID ?? 'dev';

const REPORT_CAP = 25;
let reportPage: string | null = null;
let reported = 0;
const reportedKeys = new Set<string>();

/**
 * Sends one entry to /api/client-log, where server.mjs prints it into the
 * Railway deploy log. Off until installClientErrorLog turns it on, off in dev
 * (Vite has no such route), at most REPORT_CAP per page and each distinct
 * message once. Sending never logs, so a failure can't loop.
 */
function sendToServer(level: LogLevel, message: string, extra: Record<string, unknown>) {
  if (!reportPage || env?.DEV || typeof navigator === 'undefined') return;
  const key = `${level}:${message}`;
  if (reportedKeys.has(key) || reported >= REPORT_CAP) return;
  reportedKeys.add(key);
  reported += 1;
  const body = JSON.stringify({
    level,
    message,
    page: reportPage,
    url: location.pathname + location.search,
    buildId: BUILD_ID,
    correlationId: getCorrelationId(),
    ...extra,
  });
  try {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon?.('/api/client-log', blob)) return;
    void fetch('/api/client-log', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
  } catch {
    // reporting is best effort
  }
}

function reportToServer(entry: LogEntry) {
  sendToServer(entry.level, entry.message, { source: entry.source, asset: entry.asset, gameId: entry.gameId, stack: entry.stack, fields: entry.fields });
}

export const log = {
  debug: (message: string, fields?: LogFields) => write('debug', message, fields),
  info: (message: string, fields?: LogFields) => write('info', message, fields),
  warn: (message: string, fields?: LogFields) => write('warn', message, fields),
  error: (message: string, fields?: LogFields) => write('error', message, fields),
};

let installed = false;

/**
 * Browser faults: kept in the ring for the diagnostics panel, and (in a
 * production build) every log.error is also sent to the server's deploy log.
 * `page` names the bundle: 'room' for index.html, 'pc' for the desk computer.
 * Also sends one 'page loaded' line, which tells the server which build the
 * browser is running, so a stale cached page shows up in the logs.
 */
export function installClientErrorLog(page = 'room') {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  reportPage = page;
  sendToServer('info', 'page loaded', {
    source: 'boot',
    fields: { screen: `${window.innerWidth}x${window.innerHeight}`, dpr: window.devicePixelRatio },
  });
  window.addEventListener('error', event => {
    log.error(event.message || 'window error', {
      source: 'window',
      stack: event.error instanceof Error ? event.error.stack : undefined,
    });
  });
  window.addEventListener('unhandledrejection', event => {
    const reason = event.reason;
    if (reason instanceof Error) {
      log.error(reason.message || 'unhandled rejection', { source: 'window', stack: reason.stack });
      return;
    }
    log.error('unhandled rejection', { source: 'window' });
  });
}
