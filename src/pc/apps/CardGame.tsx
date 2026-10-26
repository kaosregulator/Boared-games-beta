import React, { useEffect, useRef } from 'react';
import { sfx } from '../os/sound';
import type { WinState } from '../os/wm';

/**
 * FreeCell, Hearts and Spider: the stillplay card games (btahir/stillplay,
 * MIT), vendored as-is into public/pc/stillplay/ and hosted by its play.html.
 * Each is a small C core compiled to WebAssembly with a Win98-style table.
 * The host hides stillplay's own title bar, since this window has a real one.
 */
export function CardGame({ win, game }: { win: WinState; game: 'freecell' | 'hearts' | 'spider' }) {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source === ref.current?.contentWindow && e.data?.stillplay === 'win') sfx.tada();
    };
    window.addEventListener('message', onMessage);
    const id = window.setTimeout(() => ref.current?.focus(), 300);
    return () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(id);
    };
  }, []);

  return <iframe ref={ref} key={win.id} title={win.title} src={`/pc/stillplay/play.html?game=${game}`} className="app-frame" data-cursor="arrow" />;
}
