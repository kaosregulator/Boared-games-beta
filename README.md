# Boared Games Beta: the 90s room

**A 90s bedroom that preserves the feeling of being there.** This is an interactive 3D room you can walk around in the browser, built to bring back that nostalgia and keep the history of the decade alive. The whole room is the menu. Turn on the TV and flip through real broadcasts, tune the boombox, sit at the Windows 98 PC, play a board game on the card table, race Hot Wheels across the floor, or shrink down into an army men war on the rug.

## Why it exists

The idea behind this room is to bring back the feeling of being a kid in the 90s, and to **preserve that history**. The shows, the commercials, the radio, the toys, the games and the computer you grew up with are kept here in one place, so anyone can step back into that room. Every object has a memory card with its story, real photos, and often an old commercial for it.

> **No video is stored in this repo.** All of the TV shows, cartoons, commercials and old clips stream straight from the [Internet Archive](https://archive.org). (The only video file here is the menu's short trailer, which was recorded inside the room itself.)

## What's in the room

- **Walk around** a midnight 90s bedroom: thumb stick and drag to look on phones and tablets, WASD and arrow keys on a laptop. Field of view, zoom and full screen are in the corner.
- **Memory cards and time capsule cards** for everything in the room: lamps, clocks, tapes, the Walkman, POGs, View-Master, posters and more, each with a story, photos and old commercials.
- **TV**: a full cable lineup of real broadcasts streamed from the Internet Archive, including SNICK, Toonami, Saturday morning cartoons, MTV, PBS Kids, TGIF and more, plus a channel that is nothing but 90s commercials. There's static between channels and a scrolling cable guide.
- **Boombox**: an FM tuner with live SomaFM stations and real 80s and 90s radio airchecks, with SEEK, SCAN and static.
- **Windows 98 PC** on the corner desk: boot it up and play Space Cadet Pinball, Minesweeper, Solitaire, FreeCell, Hearts, Spider, Tetris, TaiPei and Pegged, or use Paint, WordArt, Media Player, and Internet Explorer on 1998 to 2003 web pages from the Wayback Machine. Sandwich Stacker, Thing-Thing and Cartoon Network games play in their own windows.
- **NES and Game Boy**: Tetris and Pac-Man on the NES, Game Boy Tetris on the bean bag.
- **Board games on the card table**: Monopoly, Wizard Chess, Checkers, Blackjack, Battleship, Connect Four and more play in 3D, with Clue, Sorry!, Yahtzee, Guess Who, Mouse Trap, The Game of Life, Go Fish, Poker, a casino and Throwback Trivia too.
- **Army men**: shrink into a toy town on the rug, fight off the tan army in waves, or fly the toy helicopter through a ring course.
- **Hot Wheels**: race the orange track over the ramp, across the bed and onto the desk, or free roam the floor.
- **Toys that come alive**: a Tamagotchi, a Furby (and a Furby Boom), Poo-Chi the robot dog and his bone hunt, a Rubik's Cube you can twist, the View-Master in 3D, and four live lava lamps.
- **Music** in the room, with a shuffle and a Sound menu.

## What it runs on

| Part | Used for |
|---|---|
| **React 19** + **Vite** + **TypeScript** | the app and the build |
| **Three.js**, **React Three Fiber**, **drei** | the 3D room |
| **Rapier** and **cannon-es** | physics |
| **Tailwind CSS** and **98.css** | the menus and the Windows 98 look |
| **Howler** | sound |
| **EmulatorJS** | the NES and Game Boy |
| **Express** on **Node 24** | the server (`server.mjs`) |
| **Railway** | hosting, deployed from the `Dockerfile` |
| **GitHub Actions** | tests and checks on every pull request |

## Run it

You need Node 24 or newer.

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`. To test the production build:

```bash
npm run build
npm start
```

Run the tests with `npm test` and the type check with `npm run lint`.

## Deploy on Railway

The repo is ready for Railway:

- The `Dockerfile` builds the Vite client and runs `server.mjs` on Node 24.
- `railway.toml` sets the health check at `/api/health`.
- `PORT` is read from the environment, which Railway sets for you.

Create a Railway project from this GitHub repo and deploy. Setting `GEMINI_API_KEY` is optional; it turns on trivia pack generation. The server writes JSON logs to stdout. See `docs/ENGINE.md` and `docs/deploy-logs.md` for more.

## For developers

Test links: `?cam=x,y,z,lx,ly,lz`, `?device=crt|nes|boombox`, `?seat=gameboy`, `?play=<game id>`, `?card=<card id>`, `?probe=<model>`, `?hotspots` (outline every hotspot), `?pick-probe=<prop>&pick=x,y`, `?army=1`, `?army=heli&ring=N`, `&calm=1`, `&armyCam=birdseye`.

Where things live: hotspots are in `src/room/hotspots.ts`, card text is in `src/room/propCards.ts`, the TV lineup is in `src/tv/channels.ts`, the radio dial is in `src/radio/stations.ts`, and the PC is in `src/pc/`. Detailed asset credits for the table games are in `public/games/CREDITS.md`.

---

## ❤️ Thank you

This room would not exist without the people and projects below. They made, saved and shared the things that bring it to life. Thank you, all of you.

### ❤️ The Internet Archive

A huge thank you to **Brewster Kahle**, founder of the Internet Archive, and the whole Internet Archive team for preserving these amazing pieces of history. Every TV show, cartoon, commercial and radio aircheck in this room, plus the Wayback Machine pages on the PC, comes from them.

- [archive.org](https://archive.org) · [Wayback Machine](https://web.archive.org)
- If you'd like to support them: [archive.org/donate](https://archive.org/donate)

### ❤️ Music and radio

- **SomaFM**, the listener-supported radio stations on the boombox (Left Coast 70s, Underground 80s, Seven Inch Soul, PopTron, Secret Agent, Groove Salad). If you'd like to support them: [somafm.com/support](https://somafm.com/support/)
- **Radio Browser**, the free open radio directory the boombox falls back on. If you'd like to support them: [radio-browser.info](https://www.radio-browser.info)
- **junguler/m3u-radio-music-playlists**, daily radio playlists used as a last backup: [github.com/junguler/m3u-radio-music-playlists](https://github.com/junguler/m3u-radio-music-playlists)
- **Punch Deck**, for "Brahe" (CC BY 4.0), the title screen song and the PC's Media Player track. If you'd like to support them: [punch-deck.com](https://punch-deck.com)
- **Scott Buckley**, for "Growing Up". If you'd like to support him: [scottbuckley.com.au](https://www.scottbuckley.com.au)
- **Hayden Folker**, for "To See The Past" (CC BY 3.0). If you'd like to support him: [his song page on Breaking Copyright](https://breakingcopyright.com/song/hayden-folker-to-see-the-past)

### ❤️ Open-source projects

**The Windows 98 PC**
- **Sandwich Stacker** by elan-rubin: [github.com/elan-rubin/Sandwich-Stacker](https://github.com/elan-rubin/Sandwich-Stacker)
- **Space Cadet Pinball** by alula, from the decompilation by Andrey Muzychenko (MIT): [github.com/alula/SpaceCadetPinball](https://github.com/alula/SpaceCadetPinball)
- **stillplay** by btahir, for FreeCell, Hearts and Spider (MIT): [github.com/btahir/stillplay](https://github.com/btahir/stillplay)
- **Win95** by wieslawsoltes, for the Windows icons: [github.com/wieslawsoltes/Win95](https://github.com/wieslawsoltes/Win95)
- **all-windows-sounds** by MCPlayer2015, for the Windows 98 sounds: [github.com/MCPlayer2015/all-windows-sounds](https://github.com/MCPlayer2015/all-windows-sounds)
- **98.css** by Jordan Scales (MIT): [github.com/jdan/98.css](https://github.com/jdan/98.css)
- **Flashpoint Archive**, which saved the old Flash games, played through **9o3o** by Dri0m: [github.com/Dri0m/9o3o](https://github.com/Dri0m/9o3o). If you'd like to support them: [flashpointarchive.org](https://flashpointarchive.org)

**Toys, TV and consoles**
- **Dammagotchi** by dammafra, the Tamagotchi (AGPL-3.0): [github.com/dammafra/dammagotchi](https://github.com/dammafra/dammagotchi)
- **snick-tv** by chairpants, the SNICK channel data: [github.com/chairpants/snick-tv](https://github.com/chairpants/snick-tv)
- **EmulatorJS**, the NES and Game Boy (GPL-3.0). If you'd like to support them: [emulatorjs.org](https://emulatorjs.org)
- **MiDaS** by isl-org, the depth for the View-Master's 3D (MIT): [github.com/isl-org/MiDaS](https://github.com/isl-org/MiDaS)
- **webxr-input-profiles** by the Immersive Web group, the hand models (MIT): [github.com/immersive-web/webxr-input-profiles](https://github.com/immersive-web/webxr-input-profiles)

**Board games**
- **threejs-3d-game-battleships** by Arrq54 (Arkadiusz Wojdyla, Michał Frączek): [github.com/Arrq54/threejs-3d-game-battleships](https://github.com/Arrq54/threejs-3d-game-battleships)
- **3D-Connect-Four** by BertovDev (GPL-3.0): [github.com/BertovDev/3D-Connect-Four](https://github.com/BertovDev/3D-Connect-Four)
- **MonopolyClone** by Bizangel (MIT): [github.com/Bizangel/MonopolyClone](https://github.com/Bizangel/MonopolyClone)
- **3d-monopoly** by DanielGRasmussen (CMU Team16): [github.com/DanielGRasmussen/3d-monopoly](https://github.com/DanielGRasmussen/3d-monopoly)
- **Tabletop Club** by drwhut (MIT), whose camera the table camera is modeled on: [github.com/drwhut/tabletop-club](https://github.com/drwhut/tabletop-club). If you'd like to support them: [tabletopclub.net](https://tabletopclub.net)
- **market-assets** by pmndrs, for the Monopoly tokens: [github.com/pmndrs/market-assets](https://github.com/pmndrs/market-assets)
- **glTF Sample Assets** by Khronos, for the rubber ducky: [github.com/KhronosGroup/glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets)

**The engine**
- **three.js** (MIT), including the soldier model from its examples: [github.com/mrdoob/three.js](https://github.com/mrdoob/three.js). If you'd like to support them: [threejs.org](https://threejs.org)
- **React Three Fiber**, **drei** and the rest of **pmndrs**: [github.com/pmndrs](https://github.com/pmndrs). If you'd like to support them: [opencollective.com/pmndrs](https://opencollective.com/pmndrs)
- **Rapier** by Dimforge: [rapier.rs](https://rapier.rs)

### ❤️ Artists and asset makers

- **Kenney**, for the race car, ship and cannon tokens (CC0). If you'd like to support him: [kenney.nl](https://kenney.nl)
- **Kytric**, for the Voxel Board Games checkers set (CC0). If you'd like to support them: [kytric.itch.io](https://kytric.itch.io/board-game-assets)
- **OpenGameArt** artists rehcub, Thane "pennomi" Brimhall, Tiziana and jeffshee, for the chess set, board and cards. If you'd like to support them: [opengameart.org](https://opengameart.org)
- **Sketchfab** artists Feraxion, davevink and Ana Vassallo, for the Battleship models (CC BY 4.0): [sketchfab.com](https://sketchfab.com)
- **MarkLaBarr** for the horse token ([Blend Swap](https://blendswap.com)), and Reuben Sotomayor and Alejandro León for the dog token
- **Lentikula**, for the "Sci-Fi Ship Voices" sound (CC0): [lentikula.itch.io](https://lentikula.itch.io)

### ❤️ Websites that keep history alive

- **Wikimedia Commons** and **Wikipedia**, for the photos on the memory cards. If you'd like to support them: [donate.wikimedia.org](https://donate.wikimedia.org)
- **View-Master Database** and Dave Machin's collection, for the reel scans: [vm.vmdatabase.com](https://vm.vmdatabase.com)
- **IMP Awards**, for the movie poster scans: [impawards.com](http://www.impawards.com)
- **Geek Guilt**, whose Retro Viewer inspired the 90s commercials channel: [geekguilt.com](https://geekguilt.com)
- **itch.io**, which hosts the Sandwich Stacker web build: [itch.io](https://itch.io)

### ❤️ Hosting

- **Railway**, which keeps the room online: [railway.com](https://railway.com)

---

The toys, shows, games, songs and brands in this room belong to their owners. They're here as a tribute, to remember them and to keep that history from being lost.
