export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type ConsoleMode = 'all' | 'warn' | 'json' | 'silent';

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

export function configureLog(opts?: { console?: ConsoleMode; correlationId?: string }): void;
export function getCorrelationId(): string;
export function resetLogForTests(): void;
export function log(level: LogLevel, message: string, fields?: LogFields): LogEntry;
export function getLogHistory(): LogEntry[];
export function exportLogReport(): { correlationId: string; generatedAt: string; entries: LogEntry[] };
