# Game Room Beta

First-person interactive mini-game menu demo. The **whole room is the menu** — walk around a midnight 90s bedroom, aim at glowing hotspots, pull a board-game box off the shelf, and jump into a mini-game.

This project is intentionally branded as a **public beta**, end to end.

## What works in the room

- **Controls**: phone and tablet — left thumb stick walks, drag to look, tap things;
  the TV gets an on-screen remote and the NES / Game Boy get a thumb pad. Laptop —
  WASD walks, arrow keys look (up/down too), two-finger swipe to look, click things.
  Mouse — drag to look, the cursor aims. No pointer lock, no run key.
- **View**: top right while walking — *FOV* steps the field of view (fine-tune it in
  the menu; it's remembered), pinch / ctrl+scroll / + − zooms in without leaving the
  first-person view, and ⤢ goes full screen. Close up on the TV, NES, boombox or
  Game Boy: pinch or scroll to zoom, drag to pan, double-tap to reset, and *Big
  screen* (F) lays the picture over the whole display. The framing follows the phone
  when it turns, so the remote and thumb pad never cover the screen. On iPhone, Add
  to Home Screen for a true full screen (Safari only lets videos go full screen).
- **Stability**: the room's textures are GPU-compressed KTX2 (about a tenth of the
  graphics memory), a lost graphics context rebuilds the room in place, and a reload
  puts you back where you were instead of the intro.
- **Memory cards**: everything in the room has one, including the things baked into
  the desks and shelves (lamps, clocks, tapes, the Walkman, POGs, View-Master,
  stickers, posters). Each has a story, swipeable photos from Wikimedia Commons and,
  for a lot of them, an old commercial from the Internet Archive. Hotspot boxes are in
  `src/room/hotspots.ts`; the copy is in `src/room/propCards.ts`.
- **Lava lamps**: the four lamps baked into the props are live — raymarched wax
  (`src/room/LavaLamp.tsx`). The desk lamps light their desks. Menu → Mood → *Lamps
  only* turns the ceiling light down.
- **Tamagotchi** on the bed: its card opens Dammagotchi
  ([dammafra/dammagotchi](https://github.com/dammafra/dammagotchi), AGPL-3.0, built
  into `public/tamagotchi`; our changes are in `public/tamagotchi/CHANGES.patch`).
  Big A / B / C buttons sit beside it on phones; on a computer Tab, Enter and
  Backspace press them.
- **Rubik's Cube**: its card (wall shelf, or the little cube on the game closet) has
  *Pick it up & twist it* — swipe a sticker to turn that layer, drag around it to
  look, U D L R F B keys or buttons, Scramble, timer, and a solved check.
- **Music**: *Snowfall (slowed, birds)* is the default track; *Bedroom tape* is in the
  menu.
- **TV** (click it, then Turn it on): power-on menu with *Watch TV* or *Gaming*. Watch TV is a
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
  it, and the box unfolds. Seven games play in 3D on the table:
  - **Monopoly** (US / Atlantic City board printed from the rules engine's data): choose
    your silver token up close (top hat, race car, dog, battleship, thimble, cannon,
    horse, rubber ducky, penguin) and one to three opponents; title deeds, paper money,
    Chance and Community Chest cards lie on the table; houses and hotels go on the board.
  - **Chess** (Tabletop Club's set) and **Checkers** (Kytric's voxel set): pick a piece up
    and carry it, or tap it then a glowing square; the opponent's ghost hand moves its pieces.
  - **Blackjack** with real cards and poker chips, dealt by a ghost hand.
  - **Battleship** and **Connect Four**.

  The table camera works like Tabletop Club's: drag (or two fingers) to orbit, scroll or
  pinch to zoom, arrows/Q/E/+/- on a keyboard, V or the *Game view* button for overhead,
  side and seat views, and *Follow action* swings the camera to each roll, shot and
  move. The other games open their board over the room. Space stands you up; Pack up
  puts it all away. Asset credits are in `public/games/CREDITS.md`.
- **Army men**: click the army men tin: "We're under attack! Send the troops!" shrinks you into a
  toy town on the road rug (`src/room/army/`). Green plastic patrols, a drill squad, guards and a
  tower lookout run the town; the tan army attacks in three waves from behind a wall of books, and
  hit soldiers tip over like real toys. Walk as a green soldier (W/S, A/D turn, Shift run, Space
  fire), or press F at the helipad for the toy helicopter: a ten-ring course round the room, or free
  flight (W/S, A/D, Space up, Shift down, Q/E slide, Tab boost, drag to turn). C switches third
  person, first person and bird's-eye. Test links: `?army=1`, `?army=heli&ring=N`, `&calm=1`, `&armyCam=birdseye`.
- **Posters**: seven on the walls, in `src/room/WallPosters.tsx` (one line each to swap).
- **Neon wall**: the smaller games hang on the east wall as neon signs.

Capture links: `?cam=x,y,z,lx,ly,lz`, `?device=crt|nes|boombox`, `?seat=gameboy`,
`?play=<game id>`, `?card=<card id>`, `?probe=<model>`, `?hotspots` (outline every
hotspot), `?pick-probe=<prop>&pick=x,y` (read a point off a mesh, for placing hotspots).

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
