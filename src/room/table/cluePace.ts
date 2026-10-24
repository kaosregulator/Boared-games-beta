/**
 * How the Clue paperwork moves. The board camera is not in here.
 * A row of cards used to stand up 50 ms apart, so the top of the fan
 * was a blur. The gap is long enough to see each card and short enough
 * that nine rooms are still up in well under two seconds.
 */
export const FAN_CARD_GAP = 0.14;

export function fanCardDelay(index: number) {
  return Math.max(0, index) * FAN_CARD_GAP;
}

/** The flip up into your hand. Slow enough to read as a card, not a cut. */
export const CARD_RISE_S = 0.62;

/**
 * Milliseconds between letters. A line finishes in about 0.7 s.
 * A short line does not crawl, and a long one does not dump in one frame.
 */
export function typeCharMs(length: number) {
  if (length <= 1) return 0;
  return Math.max(12, Math.min(28, Math.round(700 / length)));
}

/** How many letters are on screen after `elapsedMs`. A hitch shows the letters that were due, so the line still finishes in about 0.7 s. */
export function typedCount(elapsedMs: number, length: number) {
  const step = typeCharMs(length);
  if (step === 0) return length;
  if (elapsedMs <= 0) return 0;
  return Math.min(length, Math.floor(elapsedMs / step));
}
