/**
 * Which card shows a real scanned model as its hologram, cloned straight from
 * the room, instead of a box cut out of the room's scan. A prop placed as its
 * own GLB (gushers, the Game Boy, the loose tapes...) is marked in the room
 * with `userData.holoRoot = <card id>`; the hologram clones that, so the piece
 * is the thing itself with none of the shelf or desk around it.
 *
 * Two kinds of entry live here:
 *   borrow  — a card baked into a furniture mesh (no model of its own) that
 *             should still clone a real standalone model, e.g. the backup Game
 *             Boy on the nightstand borrows the Game Boy model.
 *   pose    — an extra rotation (radians) so the clone stands the way you'd
 *             expect to see it held up, not the way it happens to lie in the room.
 */

/** Card id -> the holoRoot id to clone instead (for baked-in cards with no model of their own). */
export const HOLO_BORROW: Record<string, string> = {
  // The spare Game Boy baked into the nightstand: show the real Game Boy model.
  'ns-gameboy': 'gameboy',
};

/** Card id -> extra rotation for the clone, so it's posed the way you'd hold it up. */
export const HOLO_POSE: Record<string, [number, number, number]> = {
  // The loose tapes lie flat on the shelf; stand them on their side for the capsule.
  'vhs-loose': [Math.PI / 2, 0, 0],
};
