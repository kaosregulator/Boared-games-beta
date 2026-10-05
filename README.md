# Game Room Beta

First-person interactive mini-game menu demo. The **whole room is the menu** — walk around a midnight 90s bedroom, aim at glowing hotspots, pull a board-game box off the shelf, and jump into a mini-game.

This project is intentionally branded as a **public beta**, end to end.

## Demo loop

1. Open the landing site → **Enter the Room**
2. You are inside the illustrated bedroom (the painting is the room)
3. **Shelf** / **A D** walks you up to the boxes. Hover outlines a box. Click to pull it.
4. Battleship, Sorry!, Clue, Life, and Yahtzee launch playable games. Monopoly opens the unbox reel.
5. **3D blockout** is the earlier prototype room. **Game list** is the old shelf.

The way out of the grey blockout is this painted first-person view: one locked illustration, camera moves between the bed, TV, door, and shelf, and the boxes are real hit targets. A free-walk mesh that matches the painting needs modeled geometry later; this is the room that actually looks like the art.

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
