# Mapping the room: video, Blender, Phaser, Discord

The painting and the clip are the prop list and the camera feeling. The playable loop does not follow the door shot. That beat is trimmed. The door stays a prop in the room.

## Simulator steps

| Step | What the player does | Clip to match |
| --- | --- | --- |
| Idle | Stands in the wide bedroom, hands down | Opening wide shot, CRT says PLAY |
| Walk to shelf | Look and move to the boxes | Pan from the TV toward the shelf |
| Choose | A box gets the white edge | Hand points at a box |
| Take the box | Box leaves the shelf | Box pulls forward and glows |
| Open | Lid creaks on the table | Open-the-box storyboard frame |
| Set up | Board unfolds in front of them | Game-sets-up frame |
| Play | The real game stays on the table in the room | Play-the-game frame |
| Pack up | Panels fold, lid closes, the box is shown | Pack-up frame |
| Away | Box slides back, idle stance | Back-to-room frame |

Shelf boxes that must stay real games, matching the painting: Monopoly, Battleship, Sorry, Clue, The Game of Life, Yahtzee.

## Blender, to the painting

1. One blend file, units in meters. Camera at eye height, about 1.6 m, matching the wide shot.
2. Block out from the painting: bed left, dresser and CRT center, door, shelf right. Name every prop the picture shows (lava lamp, boombox, game boy, rug, posters).
3. Each game is its own collection: closed box, hinged lid, folded board, unfolded board. The hinge empties are the same pivots the web unfold uses.
4. Export glTF (`.glb`) per prop. Keep the painted textures as the first material pass, then replace them with baked maps from the same camera.
5. Do not model the door as the way into a game. The shelf is the only play path.

## Phaser 4 and Discord Activities

Discord Activities run inside an iframe with the Embedded App SDK. Phaser 4 can be that iframe. The current site is the playable beta of the same loop. The move later is:

- Phaser scene `Room` plays the Blender glTF and the step list above.
- Phaser scene `Table` is the unfolded board.
- Each game is a Phaser scene or an HTML overlay on the table, then `Pack` plays the fold and returns to `Room` idle.
- The Discord SDK only handles participants, voice, and the activity frame. It does not replace the room.

Until those glTF files exist, the site keeps using the painting as the room and the hinged board as the table.
