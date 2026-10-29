import * as THREE from 'three';
import { GAME_PHOTOS } from '../gamePhotos';
import { HOTSPOTS } from '../hotspots';
import type { Piece } from './extractPiece';

/**
 * A game box on the shelf has no model to clone and its board is printed flat,
 * so a cut of it is a one-sided sliver that looks broken when it turns. Instead
 * the capsule shows a clean board: the real box art on a thin card, the same on
 * the front and the back, so it reads as a box all the way round as it spins.
 *
 * Keyed by the game, so it works both from the shelf box (box-shelf-<id>) and
 * from a game card opened straight (so captures can see it too). A game with no
 * free box photo (Life) has no entry and falls back to the room-scan cut.
 */

/** box-shelf-<hotspot id> -> gameId (Sorry's box is the pawnrush engine, etc.). */
const BOX_GAME: Record<string, string> = Object.fromEntries(
  Object.values(HOTSPOTS)
    .flat()
    .filter((s): s is NonNullable<typeof s> => Boolean(s?.gameId))
    .map(s => [s.id, s.gameId as string]),
);

/** The box-art image for a capsule id that is a game, or null if it isn't one / has no photo. */
export function boardSrcFor(id: string): string | null {
  const gameId = GAME_PHOTOS[id] ? id : BOX_GAME[id];
  const src = (gameId && GAME_PHOTOS[gameId]?.src) || null;
  // An SVG has no pixel size to size the card from; leave it to the room-scan cut.
  return src && !src.endsWith('.svg') ? src : null;
}

const cache = new Map<string, { tex: THREE.Texture; ready: boolean }>();

/** The box-art texture once it has loaded, else null (the caller retries). */
function boardTexture(src: string): THREE.Texture | null {
  let entry = cache.get(src);
  if (!entry) {
    const slot = { tex: null as unknown as THREE.Texture, ready: false };
    slot.tex = new THREE.TextureLoader().load(src, t => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      slot.ready = true;
    });
    entry = slot;
    cache.set(src, entry);
  }
  return entry.ready && entry.tex.image ? entry.tex : null;
}

/**
 * The board as a thin two-sided card at the box-art's aspect ratio. Front and
 * back carry the same art the right way round. Geometry is owned (holoOwned) so
 * the hologram frees it; the texture is cached and kept.
 */
export function buildBoardPiece(src: string): Piece | null {
  const tex = boardTexture(src);
  if (!tex) return null;
  const img = tex.image as { width?: number; height?: number };
  // No real pixel size yet (or a vector image): don't build a degenerate card.
  if (!img.width || !img.height) return null;
  const aspect = img.width / img.height;
  const h = 0.3;
  const w = h * aspect;
  const geo = new THREE.PlaneGeometry(w, h);
  geo.userData.holoOwned = true;
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const front = new THREE.Mesh(geo, mat);
  front.position.z = 0.012;
  front.frustumCulled = false;
  const back = new THREE.Mesh(geo, mat);
  back.rotation.y = Math.PI; // so the art faces out the back too, not mirrored
  back.position.z = -0.012;
  back.frustumCulled = false;
  const group = new THREE.Group();
  group.add(front, back);
  const radius = Math.hypot(w, h, 0.024) / 2;
  return { group, radius, triangles: 4, shared: true };
}
