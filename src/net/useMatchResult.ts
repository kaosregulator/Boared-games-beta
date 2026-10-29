import { useEffect, useRef } from 'react';
import { reportEvent } from './roomApi';

/**
 * Reports a table game's result once per match. Pass 'won' or 'lost' when the
 * match ends and null while it's being played; going back to null (a new
 * game) arms it for the next result. A draw or stalemate stays null.
 */
export function useMatchResult(game: string, outcome: 'won' | 'lost' | null) {
  const last = useRef<'won' | 'lost' | null>(null);
  useEffect(() => {
    if (outcome && last.current !== outcome) reportEvent(game, outcome);
    last.current = outcome;
  }, [game, outcome]);
}
