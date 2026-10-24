/**
 * Shared structured logger for the browser and for server.mjs.
 * Entries stay in a fixed ring. Secrets are redacted before anything is stored
 * or printed. This file has no dependencies so the production image can copy it
 * next to the server.
 */

const CAP = 200;
const SECRET_KEY = /key|token|secret|password|authorization|cookie|api[-_]?key/i;

/** @typedef {'debug' | 'info' | 'warn' | 'error'} LogLevel */
/** @typedef {'all' | 'warn' | 'json' | 'silent'} ConsoleMode */

/** @type {ConsoleMode} */
let consoleMode = 'warn';
let correlationId = createId();
/** @type {Array<Record<string, unknown>>} */
const history = [];

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function configureLog(opts = {}) {
  if (opts.console) consoleMode = opts.console;
  if (opts.correlationId) correlationId = String(opts.correlationId);
}

export function getCorrelationId() {
  return correlationId;
}

export function resetLogForTests() {
  history.length = 0;
  correlationId = 'test-correlation';
  consoleMode = 'silent';
}

function bound(value) {
  const str = String(value);
  return str.length > 500 ? `${str.slice(0, 500)}…` : str;
}

function redactString(value) {
  return bound(value)
    .replace(/\bAIza[0-9A-Za-z\-_]{10,}\b/g, '[redacted]')
    .replace(/\b(?:sk|pk|rk)_[A-Za-z0-9]{8,}\b/g, '[redacted]')
    .replace(/bearer\s+\S+/gi, 'bearer [redacted]')
    .replace(/((?:api[_-]?key|token|password|secret|authorization)\s*[=:]\s*)(\S+)/gi, '$1[redacted]');
}

function redact(value, depth = 0) {
  if (value == null) return value;
  if (depth > 4) return '[depth]';
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: value.stack ? redactString(value.stack) : undefined,
    };
  }
  if (Array.isArray(value)) return value.slice(0, 20).map(item => redact(item, depth + 1));
  if (typeof value === 'object') {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = SECRET_KEY.test(key) ? '[redacted]' : redact(item, depth + 1);
    }
    return out;
  }
  return bound(value);
}

function write(entry) {
  if (consoleMode === 'silent') return;
  if (consoleMode === 'json') {
    const line = JSON.stringify(entry);
    if (entry.level === 'error' || entry.level === 'warn') console.error(line);
    else console.log(line);
    return;
  }
  if (consoleMode === 'warn' && entry.level !== 'warn' && entry.level !== 'error') return;
  const fn = entry.level === 'error' ? console.error : entry.level === 'warn' ? console.warn : entry.level === 'debug' ? console.debug : console.info;
  fn.call(console, `[${entry.level}] ${entry.message}`, entry);
}

/**
 * @param {LogLevel} level
 * @param {string} message
 * @param {Record<string, unknown>} [fields]
 */
export function log(level, message, fields = {}) {
  const err = fields.err instanceof Error ? fields.err : fields.error instanceof Error ? fields.error : undefined;
  const stack =
    typeof fields.stack === 'string'
      ? redactString(fields.stack)
      : err?.stack
        ? redactString(err.stack)
        : level === 'error'
          ? redactString(new Error(String(message)).stack ?? '')
          : undefined;
  const { err: _err, error: _error, stack: _stack, source, gameId, asset, ...rest } = fields;
  const entry = {
    ts: new Date().toISOString(),
    level,
    message: bound(message),
    correlationId,
    source: typeof source === 'string' ? source : 'app',
    gameId: typeof gameId === 'string' ? gameId : undefined,
    asset: typeof asset === 'string' ? asset : undefined,
    stack,
    fields: redact(rest),
  };
  history.push(entry);
  if (history.length > CAP) history.shift();
  write(entry);
  return entry;
}

export function getLogHistory() {
  return history.slice();
}

export function exportLogReport() {
  return {
    correlationId,
    generatedAt: new Date().toISOString(),
    entries: history.slice(),
  };
}
