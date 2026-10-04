# Game Room Beta

First-person interactive mini-game menu demo. The **whole room is the menu** — walk around a midnight 90s bedroom, aim at glowing hotspots, pull a board-game box off the shelf, and jump into a mini-game.

This project is intentionally branded as a **public beta**, end to end.

## Demo loop

1. Open the landing site → **Enter the Room**
2. Click to pointer-lock, then **WASD** walk + mouse look
3. Aim at shelf boxes / CRT / boombox / door — they highlight
4. Click a game box → unbox → play
5. **Home / Room** returns you to the bedroom hub

Classic CSS shelf remains available as a beta fallback (CRT TV or “Classic Shelf”).

## Local

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Railway

This repo is Railway-ready:

- `Dockerfile` builds the Vite client and runs `server.mjs`
- `railway.toml` sets health check at `/api/health`
- `PORT` is read from the environment (Railway injects it)

Deploy steps:

1. Create a new Railway project from this GitHub repo
2. Ensure the service uses the Dockerfile (or Railway auto-detects `railway.toml`)
3. Optional: set `GEMINI_API_KEY` for trivia pack generation
4. Deploy — open the public URL for the demo site

```bash
npm run build
npm start
```

## Stack

- React 19 + Vite
- Three.js / React Three Fiber (first-person room)
- Existing tabletop mini-games (Battleship, Connect Four, Chess, Poker, Trivia, …)
- Express production server for Railway
