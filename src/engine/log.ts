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
  return asEntry(writeLog(level, message, fields));
}

export const log = {
  debug: (message: string, fields?: LogFields) => write('debug', message, fields),
  info: (message: string, fields?: LogFields) => write('info', message, fields),
  warn: (message: string, fields?: LogFields) => write('warn', message, fields),
  error: (message: string, fields?: LogFields) => write('error', message, fields),
};

let installed = false;

/** Browser faults only. Nothing here is sent to a server. */
export function installClientErrorLog() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
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
