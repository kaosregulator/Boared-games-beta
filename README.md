# Game Room Beta

First-person interactive mini-game menu demo. The **whole room is the menu** — walk around a midnight 90s bedroom, aim at glowing hotspots, pull a board-game box off the shelf, and jump into a mini-game.

This project is intentionally branded as a **public beta**, end to end.

## What works in the room

- **TV** (lean in with E): power-on menu with *Watch TV* or *Gaming*. Watch TV is a
  cable lineup — channel 2 runs archived SNICK broadcasts back to back (data from
  [chairpants/snick-tv](https://github.com/chairpants/snick-tv)), every other channel
  is a Golden Age cartoon streamed from the Internet Archive (the Cartoon Vault
  shorts). Static between channels, a scrolling cable guide (G), and 3D buttons on
  the set and the cable box. Gaming plays the NES carts in `public/roms`.
- **NES** next to the TV: Tetris and Pac-Man in EmulatorJS (self-hosted in `public/emu`).
- **Boombox**: an FM tuner — live SomaFM stations and real 80s/90s airchecks from the
  Internet Archive, with static, signal bleed, SEEK and SCAN.
- **Game Boy** on the bean bag: sit down and play the owner's Game Boy Tetris.
- **Board games**: pick any game and the card table spawns on the rug, you crouch at
  it, and the box unfolds. Monopoly, Connect Four and Battleship play in 3D with
  real assets (credits in `public/games/CREDITS.md`); the rest open their board over
  the room. Space stands you up; Pack up puts it all away.
- **Neon wall**: the smaller games hang on the east wall as neon signs.

Capture links: `?cam=x,y,z,lx,ly,lz`, `?device=crt|nes|boombox`, `?seat=gameboy`,
`?play=<game id>`, `?probe=<model>`.

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
