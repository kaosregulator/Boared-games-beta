import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { GoogleGenAI } from '@google/genai';

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

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), geminiTriviaPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
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
