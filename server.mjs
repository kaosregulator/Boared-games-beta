import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '1mb' }));

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

app.use(express.static(distDir, { maxAge: '1h', index: false }));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Game Room Beta listening on http://0.0.0.0:${port}`);
});
