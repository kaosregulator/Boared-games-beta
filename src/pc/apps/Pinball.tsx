import React, { useEffect, useRef } from 'react';
import type { WinState } from '../os/wm';
import { audio, out } from '../os/sound';

/**
 * 3D Pinball for Windows - Space Cadet, the real one: alula's decompiled
 * port built for the web (public/pc/spacecadet), with Microsoft's original
 * table and sounds. It runs in its own frame; clicking the window hands it
 * the keyboard (Z and / flippers, Space plunger, F2 new game).
 */
export function Pinball({ win }: { win: WinState }) {
  const ref = useRef<HTMLIFrameElement>(null);

  // The table plays through the PC's sound (already allowed to play, and out
  // of the desk speaker at the tray's volume); its page picks these up.
  const host = window as Window & { __pcAudio?: AudioContext; __pcAudioOut?: AudioNode };
  host.__pcAudio = audio();
  host.__pcAudioOut = out();

  // Give the table the keys when the window comes up.
  useEffect(() => {
    const id = window.setTimeout(() => ref.current?.focus(), 300);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <iframe
      ref={ref}
      key={win.id}
      title="3D Pinball for Windows - Space Cadet"
      src="/pc/spacecadet/index.html"
      className="app-frame"
      data-cursor="arrow"
      allow="autoplay; fullscreen"
    />
  );
}
