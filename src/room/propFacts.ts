import type { CardFact, CardVideo } from './propCards';

/**
 * The hologram card's extra content, per card id: the header line (kind,
 * year, maker), the "Childhood Pro Tip", "The Real Story" and a few facts.
 * Kept apart from propCards.ts so the stories and jokes there stay as they
 * were written. Every card works without an entry here.
 */
export const PROP_FACTS: Record<string, { kind?: string; year?: string | null; maker?: string | null; joke?: string; history?: string; facts?: CardFact[] }> = {};

/** A video per card, checked against archive.org. Overrides the card's own; null means none. */
export const PROP_VIDEOS: Record<string, CardVideo | null> = {};
