# Table game assets

Every file here was copied from a repository the room owner supplied.

## Battleship — `battleship/`
From [Arrq54/threejs-3d-game-battleships](https://github.com/Arrq54/threejs-3d-game-battleships)
(Arkadiusz Wojdyla, Michał Frączek). Field textures, water, sounds, and these models:

- `raft.glb` — "Raft 1" by Feraxion, CC-BY-4.0 — https://sketchfab.com/3d-models/raft-1-6892148bf31c4661a1d690c6206f8cbe
- `island.glb` — "Low Poly Island" by davevink, CC-BY-4.0 — https://sketchfab.com/3d-models/low-poly-island-98960ad16eae47b993b0351609e2907b
- `pirate.glb` — "Pirate Ship (Low Poly)" by Ana Vassallo, CC-BY-4.0 — https://sketchfab.com/3d-models/pirate-ship-low-poly-d9953f66583340c4879a3770f6d09a37
- `smallShip.fbx`, `largeShip2.fbx` — ship meshes shipped with the repository.

The glTF files were packed to `.glb`; the island's spec-gloss materials were
converted to metal-rough so current three.js can shade them.

## Connect Four — `connect4/`
From [BertovDev/3D-Connect-Four](https://github.com/BertovDev/3D-Connect-Four) (GPL-3.0):
`board.glb` (the repo's `scene.gltf`: `FourInARowV2` frame and both disc meshes) and `wood.jpg` (resized).

## Monopoly — `monopoly/`
- `board.jpg` and the six `dice*.jpeg` faces: [Bizangel/MonopolyClone](https://github.com/Bizangel/MonopolyClone)
  (MIT), recovered from the repository history.
- `pieces/penguin.glb`, `pieces/r2d2.glb`, `pieces/robot.glb`, `pieces/house.glb`, `pieces/hotel.glb`
  and `sound/*.mp3`: [DanielGRasmussen/3d-monopoly](https://github.com/DanielGRasmussen/3d-monopoly)
  (CMU Team16). Its README credits the meshes to clara.io (R2-D2, Penguin, Final Robot, Hotel, House).
  They were stored in the retired three.js r91 JSON format; they were converted to glTF with that
  repository's own three.js build, then welded and simplified.

MONOPOLY and the board design are trademarks of Hasbro.

## Tabletop Club — `tabletop/`
From [drwhut/tabletop-club](https://github.com/drwhut/tabletop-club) (MIT code; asset pack licences below).
Its camera and pick-up/carry/drop handling were the model for the table camera here.

- `chess-pieces.glb` — "Chess Set 1" by rehcub, CC0 — https://opengameart.org/content/chess-set-1
  (the six white pieces, merged, simplified to half and meshopt-compressed; black is the same mesh tinted).
- `chess-board.glb` — "Chess Board" by Thane 'pennomi' Brimhall and Tiziana, CC-BY 3.0 —
  https://opengameart.org/content/chess-board (textures resized).
- `cards.webp` — playing card fronts, CC0 (unknown author, modified by Benjamin 'drwhut' Beddows) —
  https://opengameart.org/content/playing-cards-vector-png; card back "Colorful poker card back" by jeffshee,
  CC-BY 3.0 — https://opengameart.org/content/colorful-poker-card-back. Packed into one 13×4 atlas.
- `chips.webp` — Tabletop Club's poker chip faces ($1, $5, $10, $25, $100), CC0, packed side by side.

## Monopoly tokens — `monopoly/pieces/tokens.glb`
Cast in pewter in the game; packed, simplified and meshopt-compressed.

- `car` (Race Car), `ship` (Ship Dark), `cannon` (Cannon) — Kenney, CC0, via [pmndrs/market-assets](https://github.com/pmndrs/market-assets).
- `horse` — "Low Poly Horse" by MarkLaBarr (https://blendswap.com/blend/13092), via pmndrs/market-assets.
- `dog` — "Dogue" by Reuben Sotomayor and Alejandro León, via pmndrs/market-assets.
- `duck` — Khronos glTF sample "Duck", SCEA Shared Source License 1.0 —
  https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Duck
- The top hat and thimble are turned (lathed) in code from the real token profiles.

## Kytric's Voxel Board Games — `tabletop/checkers.glb`
"Voxel Board Games" by Kytric, CC0 — https://kytric.itch.io/board-game-assets
The brown and tan checkers board with the red and black men (v1), packed into one file.

## Wall posters — `../room/posters/`
Promotional art used as bedroom decor; all rights belong to their owners.
- Jurassic Park (Universal, 1993) and Toy Story (Disney/Pixar, 1995) one-sheets — scans from IMP Awards (impawards.com).
- Super Mario 64 and The Legend of Zelda: Ocarina of Time box art (Nintendo), Street Fighter II flyer (Capcom),
  Nirvana "Nevermind" (DGC) and 2Pac "All Eyez on Me" (Death Row) covers — from their Wikipedia file pages.

## Army men — `../models/army-man.glb`
The soldier from three.js's examples (`examples/models/gltf/Soldier.glb`, Mixamo character and
animations), shipped in the three.js repo under the MIT licence — https://github.com/mrdoob/three.js.
Slimmed with `scripts/slim-soldier.mjs` (textures and T-pose dropped) and painted plastic green or tan in code.
The army town, the helicopter and everything else in `src/room/army/` are built from primitives in code.
