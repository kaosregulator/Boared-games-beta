import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { handleRadioRequest } from './radioBrowserApi.mjs';
import { configureLog, getCorrelationId, log } from './logCore.mjs';
import { createRoomApi } from './server/api.mjs';

dotenv.config();
configureLog({ console: 'json' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT) || 3000;

/**
 * Which build is running: dist/build.json from vite.config.ts, plus what
 * Railway tells the container at run time. Printed at startup, returned by
 * /api/health, and sent as x-build-id on every response.
 */
function readBuild() {
  let file = {};
  try {
    file = JSON.parse(fs.readFileSync(path.join(distDir, 'build.json'), 'utf8'));
  } catch {
    // no build yet (tests, dev)
  }
  const commit = process.env.RAILWAY_GIT_COMMIT_SHA || file.commit || null;
  return {
    id: file.id || (commit ? commit.slice(0, 12) : 'dev'),
    commit,
    branch: process.env.RAILWAY_GIT_BRANCH || file.branch || null,
    builtAt: file.builtAt || null,
    commitMessage: process.env.RAILWAY_GIT_COMMIT_MESSAGE ? process.env.RAILWAY_GIT_COMMIT_MESSAGE.split('\n')[0] : null,
    deploymentId: process.env.RAILWAY_DEPLOYMENT_ID || null,
    replicaId: process.env.RAILWAY_REPLICA_ID || null,
    environment: process.env.RAILWAY_ENVIRONMENT_NAME || process.env.NODE_ENV || null,
  };
}
const build = readBuild();
const startedAt = new Date();

/**
 * Request lines in the deploy log. LOG_REQUESTS (a Railway variable):
 *   pages (default)  pages, API calls, every 4xx/5xx and anything slow
 *   all              every file too (noisy: a room load is ~150 files)
 *   off              only errors
 * Whatever the mode, a traffic summary prints every five minutes.
 */
const requestMode = ['all', 'pages', 'off'].includes(process.env.LOG_REQUESTS) ? process.env.LOG_REQUESTS : 'pages';
const SLOW_MS = 3000;
const traffic = { requests: 0, bytes: 0, status: {}, notFound: new Map() };
setInterval(() => {
  if (!traffic.requests) return;
  const notFound = [...traffic.notFound.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  log('info', 'traffic', {
    source: 'server',
    windowMin: 5,
    requests: traffic.requests,
    mb: Number((traffic.bytes / 1e6).toFixed(1)),
    status: traffic.status,
    topNotFound: notFound.length ? Object.fromEntries(notFound) : undefined,
  });
  traffic.requests = 0;
  traffic.bytes = 0;
  traffic.status = {};
  traffic.notFound.clear();
}, 5 * 60_000).unref();

function isPage(p) {
  return p === '/' || p.endsWith('.html') || !path.extname(p);
}

const app = express();
export { app };
app.use((req, res, next) => {
  res.setHeader('x-build-id', build.id);
  if (req.path.startsWith('/api/')) res.setHeader('x-correlation-id', getCorrelationId());
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number((process.hrtime.bigint() - t0) / 1_000_000n);
    const status = res.statusCode;
    const bytes = Number(res.getHeader('content-length')) || 0;
    const cls = `${Math.floor(status / 100)}xx`;
    traffic.requests += 1;
    traffic.bytes += bytes;
    traffic.status[cls] = (traffic.status[cls] ?? 0) + 1;
    if (status === 404) traffic.notFound.set(req.path, (traffic.notFound.get(req.path) ?? 0) + 1);
    if (req.path === '/api/health' || req.path === '/api/client-log') return;
    const api = req.path.startsWith('/api/');
    const show =
      status >= 500 ||
      (requestMode !== 'off' && (status >= 400 || ms >= SLOW_MS)) ||
      requestMode === 'all' ||
      (requestMode === 'pages' && (api || isPage(req.path)));
    if (!show) return;
    log(status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info', `${req.method} ${req.path} ${status}`, {
      source: 'http',
      method: req.method,
      path: req.path,
      query: req.url.includes('?') ? req.url.slice(req.url.indexOf('?') + 1, 200) : undefined,
      status,
      ms,
      bytes,
      encoding: res.getHeader('content-encoding') || undefined,
      cache: res.getHeader('cache-control') || undefined,
      ip: req.ip,
      ua: String(req.headers['user-agent'] ?? '').slice(0, 160) || undefined,
      referer: req.headers.referer ? String(req.headers.referer).slice(0, 200) : undefined,
    });
  });
  next();
});

// Railway sits in front: trust its one proxy hop so req.ip is the player's address.
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

/**
 * A small per-address allowance for the API, so one busy tab (or many players
 * at once) can't run up Railway's CPU or hammer Radio Browser and Gemini.
 * Static files are not limited.
 */
function rateLimit(perMinute) {
  const seen = new Map();
  setInterval(() => seen.clear(), 60_000).unref();
  return (req, res, next) => {
    const n = (seen.get(req.ip) ?? 0) + 1;
    seen.set(req.ip, n);
    if (n > perMinute) {
      res.setHeader('Retry-After', '60');
      res.status(429).json({ error: 'Too many requests, try again in a minute' });
      return;
    }
    next();
  };
}
app.use('/api/generate-trivia', rateLimit(6));
app.use('/api/radio', rateLimit(120));
app.use('/api/client-log', rateLimit(30));
app.use(['/api/session', '/api/me', '/api/play', '/api/scores', '/api/leaderboard', '/api/leaderboards', '/api/admin'], rateLimit(240));
app.use('/api/auth', rateLimit(30));
// Player profiles, results and leaderboards (server/api.mjs). The database opens on first use.
app.use('/api', createRoomApi());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    name: 'Game Room Beta',
    version: '0.1.0-beta',
    build,
    uptimeSec: Math.round(process.uptime()),
  });
});

/**
 * Browser errors (src/engine/log.ts sends every log.error, uncaught errors
 * and rejected promises) and one 'page loaded' line per page, printed into the
 * deploy log. A page whose buildId isn't this server's is a browser running an
 * old cached copy: logged as a warning with stale: true.
 */
const CLIENT_LEVELS = new Set(['info', 'warn', 'error']);
app.post('/api/client-log', express.json({ limit: '32kb', type: () => true }), (req, res) => {
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const str = (v, n = 300) => (typeof v === 'string' ? v.slice(0, n) : undefined);
  const stale = typeof b.buildId === 'string' && b.buildId !== 'dev' && build.id !== 'dev' && b.buildId !== build.id;
  const level = stale ? 'warn' : CLIENT_LEVELS.has(b.level) ? b.level : 'error';
  log(level, `client ${str(b.page, 20) ?? '?'}: ${str(b.message, 300) ?? '(no message)'}`, {
    source: 'client',
    page: str(b.page, 20),
    clientSource: str(b.source, 40),
    url: str(b.url, 300),
    buildId: str(b.buildId, 40),
    stale: stale || undefined,
    clientCorrelationId: str(b.correlationId, 80),
    asset: str(b.asset, 300),
    gameId: str(b.gameId, 60),
    stack: str(b.stack, 2000),
    detail: b.fields && typeof b.fields === 'object' ? b.fields : undefined,
    ip: req.ip,
    ua: String(req.headers['user-agent'] ?? '').slice(0, 160) || undefined,
  });
  res.status(204).end();
});

app.post('/api/generate-trivia', async (req, res) => {
  try {
    const topic = req.body?.prompt || 'Pop Culture and Retro Video Games';
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      res.json({
        title: `${topic} Trivia Pack`,
        description: `Custom quiz pack on ${topic}`,
        category: topic,
        questions: [],
      });
      return;
    }

    const ai = new GoogleGenAI({});
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a fun Jackbox-style trivia pack about "${topic}". Provide a JSON object with:
      - "title": catchy pack name
      - "description": funny description
      - "category": category label
      - "questions": array of 4 objects, each containing:
        - "id": string
        - "category": string
        - "type": "multiple_choice" or "quote" or "actor_star" or "system_guess"
        - "question": witty question text
        - "options": array of 4 string options
        - "correctIndex": number (0 to 3)
        - "explanation": hilarious/educational explanation of the correct answer
        - "points": number (e.g. 1000)`,
    });

    let rawText = response.text || '';
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) rawText = match[0];
    res.json(JSON.parse(rawText));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'trivia generation failed';
    log('error', 'trivia generation failed', { source: 'server', asset: '/api/generate-trivia', detail: message });
    res.status(500).json({ error: 'Failed to generate trivia pack' });
  }
});

// The radio's backup source: Radio Browser, looked up here with a proper User-Agent.
app.all(/^\/api\/radio\//, (req, res) => {
  void handleRadioRequest(req.originalUrl, (status, body) => res.status(status).json(body));
});

/**
 * How long browsers keep a file. Vite's hashed bundles never change under the
 * same name, so they're kept for a year; everything else (models, video,
 * cores) a day, refreshed in the background for a week; the page itself is
 * always checked so a deploy shows up at once.
 */
export function cacheFor(rel) {
  if (rel.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  // Every page (index.html, pc.html, the pinball and card-game hosts) and the
  // small files that name other files must be checked on each load, or a
  // browser keeps an old page pointing at old bundles after a deploy. This is
  // what kept round two of the PC from showing: pc.html had a day's cache and
  // a week of stale-while-revalidate.
  if (rel === '/' || /\.(html|webmanifest|json)$/.test(rel)) return 'no-cache';
  return 'public, max-age=86400, stale-while-revalidate=604800';
}

/** Files that have a .br / .gz twin from scripts/precompress.mjs, by URL path. */
const encoded = new Map();
(function scan(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (entry.name.endsWith('.br') || entry.name.endsWith('.gz')) {
      const rel = '/' + path.relative(distDir, file).slice(0, -3).split(path.sep).join('/');
      const has = encoded.get(rel) ?? {};
      has[entry.name.endsWith('.br') ? 'br' : 'gz'] = true;
      encoded.set(rel, has);
    }
  }
})(distDir);

// Hand out the precompressed copy when the browser takes it: no CPU spent per request.
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  let rel;
  try {
    rel = decodeURIComponent(req.path);
  } catch {
    return next();
  }
  const has = encoded.get(rel);
  if (!has) return next();
  res.setHeader('Vary', 'Accept-Encoding');
  const accept = String(req.headers['accept-encoding'] ?? '');
  const use = has.br && /\bbr\b/.test(accept) ? 'br' : has.gz && /\bgzip\b/.test(accept) ? 'gz' : null;
  if (!use) return next();
  res.type(path.extname(rel));
  res.setHeader('Content-Encoding', use === 'br' ? 'br' : 'gzip');
  res.setHeader('Cache-Control', cacheFor(rel));
  res.sendFile(path.join(distDir, `${rel}.${use}`), { cacheControl: false, acceptRanges: false, dotfiles: 'deny' }, err => {
    if (err) next();
  });
});

app.use(
  express.static(distDir, {
    index: false,
    cacheControl: false,
    setHeaders: (res, file) => {
      res.setHeader('Cache-Control', cacheFor('/' + path.relative(distDir, file).split(path.sep).join('/')));
    },
  }),
);

app.get('*', (req, res) => {
  // a missing file (old bundle, typo'd model path) is a 404, not the room page served as JavaScript
  if (path.extname(req.path)) {
    res.status(404).type('text').send('Not found');
    return;
  }
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(distDir, 'index.html'));
});

// Anything a route throws: logged with its stack. Bad request bodies keep their 400.
app.use((err, req, res, _next) => {
  const status = Number(err?.status) >= 400 && Number(err?.status) < 500 ? Number(err.status) : 500;
  log(status >= 500 ? 'error' : 'warn', `${status === 500 ? 'unhandled' : 'bad request'} ${req.method} ${req.path}`, { source: 'server', err });
  if (!res.headersSent) res.status(status).json({ error: status === 500 ? 'Server error' : 'Bad request' });
});

/** What dist holds, for the startup line: enough to tell an empty or partial image apart. */
function distSummary() {
  const out = { exists: fs.existsSync(distDir), files: 0, precompressed: encoded.size };
  if (!out.exists) return out;
  (function count(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) count(path.join(dir, entry.name));
      else if (!entry.name.endsWith('.br') && !entry.name.endsWith('.gz')) out.files += 1;
    }
  })(distDir);
  // the bundles each page points at, so the log shows which code is live
  for (const page of ['index.html', 'pc.html']) {
    try {
      const html = fs.readFileSync(path.join(distDir, page), 'utf8');
      out[page] = (html.match(/\/assets\/[\w.-]+\.js/) ?? [null])[0];
    } catch {
      out[page] = 'missing';
    }
  }
  return out;
}

const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMain) {
  process.on('uncaughtException', err => {
    log('error', 'uncaught exception', { source: 'process', err });
  });
  process.on('unhandledRejection', reason => {
    log('error', 'unhandled rejection', { source: 'process', err: reason instanceof Error ? reason : new Error(String(reason)) });
  });
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.once(sig, () => {
      log('info', 'shutting down', { source: 'server', signal: sig, uptimeSec: Math.round(process.uptime()) });
      process.exit(0);
    });
  }
  app.listen(port, '0.0.0.0', () => {
    const mem = process.memoryUsage();
    log('info', 'listening', {
      source: 'server',
      port,
      build,
      node: process.version,
      startedAt: startedAt.toISOString(),
      requestLog: requestMode,
      gemini: Boolean(process.env.GEMINI_API_KEY),
      rssMb: Math.round(mem.rss / 1e6),
      dist: distSummary(),
    });
  });
}
