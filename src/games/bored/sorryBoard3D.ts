import * as THREE from 'three';
import { PLAYER_COLORS, PLAYER_META, type CardRank } from '../sorry/sorryRules';
import {
  createCardBackTexture,
  createCardFrontTexture,
  createSorryBoardTexture,
} from './boardTextures';

/** Same board width their Sorry room uses. */
export const SORRY_BOARD_SIZE = 1.16;

/** Board-local point. u/v are the normalized coords from their rules, centered on the board. */
export function sorryBoardPoint(u: number, v: number, y = 0): THREE.Vector3 {
  return new THREE.Vector3(u * SORRY_BOARD_SIZE, 0.016 + y, v * SORRY_BOARD_SIZE);
}

/** Their five-part Sorry pawn, from SorryRoomCanvas.createPawnGroup. */
export function createSorryPawn(colorHex: string): THREE.Group {
  const group = new THREE.Group();
  const points: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.021, 0.0),
    new THREE.Vector2(0.022, 0.005),
    new THREE.Vector2(0.017, 0.011),
    new THREE.Vector2(0.012, 0.024),
    new THREE.Vector2(0.009, 0.044),
    new THREE.Vector2(0.013, 0.049),
    new THREE.Vector2(0.008, 0.053),
    new THREE.Vector2(0.0, 0.054),
  ];
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.16,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 1,
    ior: 1.5,
  });
  const bodyMesh = new THREE.Mesh(new THREE.LatheGeometry(points, 20), bodyMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.0135, 18, 16), bodyMat);
  head.position.y = 0.063;
  head.castShadow = true;
  group.add(head);

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.42,
    metalness: 0.65,
  });
  const ringGeo = new THREE.TorusGeometry(0.0195, 0.0022, 10, 20);
  ringGeo.rotateX(Math.PI / 2);
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.004;
  group.add(ring);

  const neckGeo = new THREE.TorusGeometry(0.0115, 0.0018, 8, 18);
  neckGeo.rotateX(Math.PI / 2);
  const neck = new THREE.Mesh(neckGeo, ringMat);
  neck.position.y = 0.05;
  group.add(neck);

  const shadowGeo = new THREE.CircleGeometry(0.025, 16);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  shadow.position.y = 0.001;
  group.add(shadow);
  return group;
}

export interface SorryBoardScene {
  root: THREE.Group;
  pawns: Map<string, THREE.Group>;
  discardFront: THREE.MeshStandardMaterial;
}

/** Their hinged-board mesh, deck, discard, and sixteen pawns. */
export function buildSorryBoardScene(): SorryBoardScene {
  const root = new THREE.Group();
  const boardTexture = createSorryBoardTexture(4);
  const side = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 });
  const top = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: boardTexture,
    roughness: 0.28,
    metalness: 0.04,
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(SORRY_BOARD_SIZE, 0.016, SORRY_BOARD_SIZE), [
    side,
    side,
    top,
    side,
    side,
    side,
  ]);
  board.position.y = 0.008;
  board.receiveShadow = true;
  board.castShadow = true;
  root.add(board);

  const deck = sorryBoardPoint(0.44 - 0.5, 0.63 - 0.5);
  const discard = sorryBoardPoint(0.56 - 0.5, 0.37 - 0.5);
  const cardSide = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
  const cardBack = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: createCardBackTexture(4),
    roughness: 0.32,
  });
  const drawDeck = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.024, 0.168), [
    cardSide,
    cardSide,
    cardBack,
    cardSide,
    cardSide,
    cardSide,
  ]);
  drawDeck.position.set(deck.x, 0.028, deck.z);
  drawDeck.rotation.y = -0.18;
  drawDeck.castShadow = true;
  root.add(drawDeck);

  const discardFront = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: createCardFrontTexture('1', 4),
    roughness: 0.32,
  });
  const discardCard = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.008, 0.168), [
    cardSide,
    cardSide,
    discardFront,
    cardBack,
    cardSide,
    cardSide,
  ]);
  discardCard.position.set(discard.x, 0.02, discard.z);
  discardCard.rotation.y = -0.18;
  discardCard.castShadow = true;
  root.add(discardCard);

  const pawns = new Map<string, THREE.Group>();
  for (const color of PLAYER_COLORS) {
    for (let i = 0; i < 4; i++) {
      const id = `${color}-${i}`;
      const pawn = createSorryPawn(PLAYER_META[color].hex);
      pawn.userData = { pawnId: id };
      root.add(pawn);
      pawns.set(id, pawn);
    }
  }

  return { root, pawns, discardFront };
}

const fronts = new Map<CardRank, THREE.CanvasTexture>();

export function sorryCardFront(rank: CardRank): THREE.CanvasTexture {
  let tex = fronts.get(rank);
  if (!tex) {
    tex = createCardFrontTexture(rank, 4);
    fronts.set(rank, tex);
  }
  return tex;
}
