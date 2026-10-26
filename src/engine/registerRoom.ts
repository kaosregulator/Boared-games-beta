import { MENU_TRACK, ROOM_TRACKS } from '../utils/audio';
import { MODEL_URL } from '../room/RoomModel';
import { defineAsset } from './assets';
import { pinAsset } from './cache';
import { attachGltfCache } from './gltfCache';

/**
 * Extra GLTFs the games load through useGLTF. Pinning them is belt-and-braces:
 * disposeIfUnshared already refuses every non-blob URL.
 */
const SHARED_GLTF = [
  '/models/army-man.glb',
  '/models/radio-man.glb',
  '/models/prone-sniper.glb',
  '/models/hw-racer.glb',
  '/models/furby.glb',
  '/models/furby-box.glb',
  '/models/furby-boom.glb',
  '/models/hands/left.glb',
  '/models/hands/right.glb',
  '/games/connect4/board.glb',
  '/games/monopoly/pieces/house.glb',
  '/games/monopoly/pieces/hotel.glb',
  '/games/monopoly/pieces/tokens.glb',
  '/games/monopoly/pieces/penguin.glb',
  '/games/battleship/raft.glb',
  '/games/battleship/pirate.glb',
  '/games/battleship/island.glb',
  '/games/tabletop/checkers.glb',
  '/games/tabletop/chess-pieces.glb',
  '/games/tabletop/chess-board.glb',
];

let registered = false;

export function registerRoomCatalog() {
  if (registered) return;
  registered = true;
  attachGltfCache();
  for (const [id, url] of Object.entries(MODEL_URL)) {
    defineAsset({
      id: `model:${id}`,
      url,
      kind: 'model',
      priority: 0,
      optional: false,
      dependencies: [],
    });
    pinAsset(url);
  }
  for (const url of SHARED_GLTF) {
    defineAsset({
      id: `model:${url}`,
      url,
      kind: 'model',
      priority: 2,
      optional: true,
      dependencies: [],
    });
    pinAsset(url);
  }
  for (const track of [MENU_TRACK, ...ROOM_TRACKS]) {
    defineAsset({
      id: `audio:${track.id}`,
      url: track.src,
      kind: 'audio',
      priority: 5,
      optional: true,
      dependencies: [],
    });
  }
  defineAsset({
    id: 'optional:table-games',
    url: 'module:table-games',
    kind: 'optional',
    priority: 8,
    optional: true,
    dependencies: [],
  });
  defineAsset({
    id: 'optional:cartridges',
    url: 'module:cartridges',
    kind: 'optional',
    priority: 8,
    optional: true,
    dependencies: [],
  });
}
