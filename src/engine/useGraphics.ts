import { useEffect, useState } from 'react';
import { currentGraphics, hydrateGraphicsFromStorage, subscribeGraphics, type GraphicsSnapshot } from './graphics';

export function useGraphics(): GraphicsSnapshot {
  const [gfx, setGfx] = useState(() => {
    hydrateGraphicsFromStorage();
    return currentGraphics();
  });
  useEffect(() => subscribeGraphics(() => setGfx(currentGraphics())), []);
  return gfx;
}
