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
