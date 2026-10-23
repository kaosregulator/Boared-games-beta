import { createContext, useContext, useEffect, useState } from 'react';

/** Screen rectangle of the card-table top, in viewport pixels. */
export interface TriviaTableRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

type Listener = (rect: TriviaTableRect | null) => void;

let current: TriviaTableRect | null = null;
const listeners = new Set<Listener>();

function same(a: TriviaTableRect | null, b: TriviaTableRect | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

/** The overhead trivia camera publishes this every time the table moves on screen. */
export function setTriviaTableRect(next: TriviaTableRect | null) {
  if (same(current, next)) return;
  current = next;
  listeners.forEach(fn => fn(current));
}

export function useTriviaTableRect() {
  const [rect, setRect] = useState<TriviaTableRect | null>(current);
  useEffect(() => {
    const fn: Listener = next => setRect(next);
    listeners.add(fn);
    setRect(current);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return rect;
}

/** True while Throwback Trivia is drawn on the table instead of a side card. */
export const TriviaOnTableContext = createContext(false);

export function useTriviaOnTable() {
  return useContext(TriviaOnTableContext);
}
