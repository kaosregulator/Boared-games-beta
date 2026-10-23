import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { handleRadioRequest } from './radioBrowserApi.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT) || 3000;

const app = express();
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

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    name: 'Game Room Beta',
    version: '0.1.0-beta',
  });
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
    console.error('Trivia generation error:', err);
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
function cacheFor(rel) {
  if (rel.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  if (rel === '/index.html' || rel === '/') return 'no-cache';
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

app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Game Room Beta listening on http://0.0.0.0:${port}`);
});
