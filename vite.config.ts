import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';

/** The same Radio Browser lookups server.mjs makes, for the dev server. */
function radioBrowserPlugin(): Plugin {
  return {
    name: 'radio-browser-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/radio/')) return next();
        void import('./radioBrowserApi.mjs').then(({ handleRadioRequest }) =>
          handleRadioRequest(req.url!, (status: number, body: unknown) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(body));
          }),
        );
      });
    },
  };
}

/** The same archive.org lookups server.mjs makes, for the dev server. */
function archiveMetaPlugin(): Plugin {
  return {
    name: 'archive-meta-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const m = req.url?.match(/^\/api\/archive\/([^/?#]+)/);
        if (!m) return next();
        void import('./server/archiveMeta.mjs').then(({ archiveMeta }) =>
          archiveMeta.handle(decodeURIComponent(m[1]), (status: number, body: unknown, headers: Record<string, string>) => {
            res.statusCode = status;
            for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(body));
          }),
        );
      });
    },
  };
}

/**
 * Which build this is: the git commit (Railway passes RAILWAY_GIT_COMMIT_SHA
 * as a Docker build arg), else the local checkout's, else the build time.
 * The page gets it as import.meta.env.VITE_BUILD_ID, the server reads
 * dist/build.json, so logs and /api/health say which deploy is running.
 */
function buildInfo() {
  let commit = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.SOURCE_COMMIT || '';
  if (!commit) {
    try {
      commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      commit = '';
    }
  }
  const builtAt = new Date().toISOString();
  const id = commit ? commit.slice(0, 12) : `t${Date.now().toString(36)}`;
  return { id, commit: commit || null, branch: process.env.RAILWAY_GIT_BRANCH || null, builtAt };
}

function buildInfoPlugin(info: ReturnType<typeof buildInfo>): Plugin {
  return {
    name: 'build-info',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'build.json', source: JSON.stringify(info, null, 2) });
    },
  };
}

function geminiTriviaPlugin(): Plugin {
  return {
    name: 'gemini-trivia-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/generate-trivia' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { prompt } = JSON.parse(body || '{}');
              const topic = prompt || 'Pop Culture and Retro Video Games';

              const apiKey = process.env.GEMINI_API_KEY;
              if (!apiKey) {
                // Return fallback structured payload if no key configured
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    title: `${topic} Trivia Pack`,
                    description: `Custom quiz pack on ${topic}`,
                    category: topic,
                    questions: []
                  })
                );
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
                  - "points": number (e.g. 1000)`
              });

              let rawText = response.text || '';
              // Extract JSON block if wrapped in markdown
              const match = rawText.match(/\{[\s\S]*\}/);
              if (match) {
                rawText = match[0];
              }
              const parsed = JSON.parse(rawText);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(parsed));
            } catch (err) {
              console.error('Trivia generation error:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to generate trivia pack' }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

/** react-three and what it brings along, kept in one cached chunk. */
const R3F_PACKAGES = new Set([
  '@react-three/fiber',
  '@react-three/drei',
  'three-stdlib',
  'zustand',
  'suspend-react',
  'its-fine',
  'react-use-measure',
  '@babel/runtime',
]);

export default defineConfig(() => {
  const info = buildInfo();
  // VITE_* from the environment reach the page as import.meta.env.*
  process.env.VITE_BUILD_ID = info.id;
  return {
    plugins: [react(), tailwindcss(), geminiTriviaPlugin(), radioBrowserPlugin(), archiveMetaPlugin(), buildInfoPlugin(info)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        // pc.html is the Windows 98 computer on the desk, framed into the room.
        input: {
          main: path.resolve(__dirname, 'index.html'),
          pc: path.resolve(__dirname, 'pc.html'),
        },
        output: {
          // Libraries in their own files: they rarely change, so returning
          // players keep them cached across deploys and only fetch our code.
          // React itself has to be named by path: listed by package name it
          // was pulled into r3f's chunk, so the desk PC's page, which never
          // draws 3D, loaded and ran all of three.js and react-three before
          // Windows could start.
          manualChunks(id) {
            // Vite's import helpers ride with React, which every page loads.
            if (id.includes('vite/preload-helper') || id.includes('commonjsHelpers')) return 'react';
            const m = id.match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)\//);
            if (!m) return undefined;
            const pkg = m[1];
            if (pkg === 'react' || pkg === 'react-dom' || pkg === 'scheduler' || pkg === 'use-sync-external-store') return 'react';
            if (pkg === 'three') return 'three';
            if (R3F_PACKAGES.has(pkg)) return 'r3f';
            return undefined;
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
