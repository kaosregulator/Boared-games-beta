import * as THREE from 'three';
import { GUESS_WHO_CHARACTERS } from '../guesswho/guessWhoRules';
import {
  createGuessWhoCharacterTexture,
  createGuessWhoStandBackTexture,
} from './boardTextures';

export interface GuessWhoBoardScene {
  root: THREE.Group;
  portraits: Map<string, THREE.CanvasTexture>;
  playerPivots: Map<string, THREE.Group>;
  aiPivots: Map<string, THREE.Group>;
  playerMystery: THREE.MeshStandardMaterial;
  aiMystery: THREE.MeshStandardMaterial;
}

/**
 * Their two Guess Who trays: red facing the seat, blue across the table,
 * twenty-four hinged stands on each. Taken from SorryRoomCanvas.buildGuessWhoTray.
 */
export function buildGuessWhoBoardScene(): GuessWhoBoardScene {
  const root = new THREE.Group();
  const charTextures = new Map<string, THREE.CanvasTexture>();
  for (const character of GUESS_WHO_CHARACTERS) {
    charTextures.set(character.id, createGuessWhoCharacterTexture(character, false, 4));
  }
  const redBack = createGuessWhoStandBackTexture('red', 4);
  const blueBack = createGuessWhoStandBackTexture('blue', 4);
  const yellow = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.32,
    metalness: 0.05,
  });

  const playerPivots = new Map<string, THREE.Group>();
  const aiPivots = new Map<string, THREE.Group>();

  const buildTray = (
    trayType: 'red' | 'blue',
    standMap: Map<string, THREE.Group>,
  ) => {
    const tray = new THREE.Group();
    const plastic = new THREE.MeshStandardMaterial({
      color: trayType === 'red' ? 0xdc2626 : 0x0284c7,
      roughness: 0.35,
      metalness: 0.06,
    });
    const slotMat = new THREE.MeshStandardMaterial({
      color: trayType === 'red' ? 0x7f1d1d : 0x0c4a6e,
      roughness: 0.7,
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.026, 0.48), plastic);
    base.position.y = 0.013;
    base.castShadow = true;
    base.receiveShadow = true;
    tray.add(base);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.042, 0.48), plastic);
      rail.position.set(side * 0.396, 0.021, 0);
      tray.add(rail);
    }
    const peg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.024, 12), yellow);
    peg.position.set(-0.22, 0.03, 0.21);
    tray.add(peg);

    const cols = 6;
    const standW = 0.098;
    const standH = 0.118;
    GUESS_WHO_CHARACTERS.forEach((character, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = (col - 2.5) * 0.122;
      const z = -0.165 + row * 0.092;
      const well = new THREE.Mesh(new THREE.PlaneGeometry(standW * 0.95, 0.068), slotMat);
      well.rotateX(-Math.PI / 2);
      well.position.set(x, 0.0265, z - 0.025);
      tray.add(well);

      const pivot = new THREE.Group();
      pivot.position.set(x, 0.026, z);
      pivot.rotation.x = -0.16;
      pivot.userData = { characterId: character.id, tray: trayType };
      tray.add(pivot);
      standMap.set(character.id, pivot);

      const stand = new THREE.Mesh(new THREE.BoxGeometry(standW, standH, 0.008), [
        yellow,
        yellow,
        yellow,
        yellow,
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: charTextures.get(character.id),
          roughness: 0.28,
        }),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: trayType === 'red' ? redBack : blueBack,
          roughness: 0.38,
        }),
      ]);
      stand.position.y = standH / 2;
      stand.castShadow = true;
      stand.userData = { characterId: character.id, tray: trayType };
      pivot.add(stand);
    });
    return tray;
  };

  const red = buildTray('red', playerPivots);
  const blue = buildTray('blue', aiPivots);
  red.position.set(0, 0, 0.31);
  blue.position.set(0, 0, -0.31);
  blue.rotation.y = Math.PI;
  root.add(red, blue);

  const playerMystery = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: charTextures.get('mike'),
    roughness: 0.28,
  });
  const playerCard = new THREE.Mesh(new THREE.BoxGeometry(0.118, 0.148, 0.008), [
    yellow,
    yellow,
    yellow,
    yellow,
    playerMystery,
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: redBack }),
  ]);
  playerCard.position.set(0.16, 0.1, 0.205);
  playerCard.rotation.x = -0.12;
  playerCard.castShadow = true;
  red.add(playerCard);

  const aiMystery = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: charTextures.get('emma'),
    roughness: 0.28,
  });
  const aiCard = new THREE.Mesh(new THREE.BoxGeometry(0.118, 0.148, 0.008), [
    yellow,
    yellow,
    yellow,
    yellow,
    aiMystery,
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: blueBack }),
  ]);
  aiCard.position.set(0, 0.1, 0.205);
  aiCard.rotation.x = -0.12;
  aiCard.castShadow = true;
  blue.add(aiCard);

  return { root, portraits: charTextures, playerPivots, aiPivots, playerMystery, aiMystery };
}
