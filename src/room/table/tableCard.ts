/**
 * Where the table play card sits.
 *
 * The card is at most 23rem and pinned to the right. The toys on a table sit
 * in the middle of the view, and the far side of the table is the top of the
 * screen. Once the card reaches the middle it lies on those toys.
 */

/** 23rem. */
export const TABLE_CARD_MAX = 368;
/** `right-3`. */
export const TABLE_CARD_EDGE = 12;

/** The grey Furby in front ended at 60% of a 844px-tall phone screen. */
const TOY_SCREEN_BOTTOM = 0.6;
const TOY_GAP = 16;

export function cardCrossesTable(viewportWidth: number): boolean {
  const width = Math.min(TABLE_CARD_MAX, Math.max(0, viewportWidth - TABLE_CARD_EDGE * 2));
  const left = viewportWidth - TABLE_CARD_EDGE - width;
  // Forty pixels past the centre still covers a toy that straddles the middle.
  return left < viewportWidth * 0.5 + 40;
}

/**
 * How tall a bottom card may grow before it meets the toy in front.
 * `chrome` is the camera row and the gap under the card.
 */
export function bottomCardLimit(viewportHeight: number, chrome: number): number {
  return Math.max(132, Math.floor(viewportHeight * (1 - TOY_SCREEN_BOTTOM) - chrome - TOY_GAP));
}
