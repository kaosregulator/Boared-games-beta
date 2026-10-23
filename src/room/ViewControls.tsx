import React from 'react';
import { cycleWalkFov, setWalkZoom, useWalkView } from './walkView';
import { canFullscreen, enterFullscreen, exitFullscreen, useFullscreen } from './immersive';

/**
 * Top-right while walking: the field of view (tap to step through the
 * presets, fine-tune it in the menu), the zoom when you've pinched in (tap
 * to go back to 1x), and full screen.
 */
export function ViewControls({ immersive, onImmersive }: { immersive: boolean; onImmersive: (on: boolean) => void }) {
  const view = useWalkView();
  const fullscreen = useFullscreen();
  const pill =
    'pointer-events-auto rounded-xl border border-white/20 bg-black/50 px-2.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white/85 backdrop-blur-xl hover:bg-black/70 active:scale-95';
  const on = immersive || fullscreen;
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-40 flex items-center gap-1.5 pt-[env(safe-area-inset-top)]">
      {view.zoom > 1.02 && (
        <button type="button" onClick={() => setWalkZoom(1)} className={`${pill} !text-amber-200`} title="Back to 1x">
          {view.zoom.toFixed(1)}× ✕
        </button>
      )}
      <button type="button" onClick={cycleWalkFov} className={pill} title="Field of view">
        FOV {view.fov}°
      </button>
      <button
        type="button"
        onClick={() => {
          if (on) {
            void exitFullscreen();
            onImmersive(false);
          } else {
            if (canFullscreen()) void enterFullscreen(false);
            onImmersive(true);
          }
        }}
        className={pill}
        title={on ? 'Leave full screen' : 'Full screen'}
        aria-label={on ? 'Leave full screen' : 'Full screen'}
      >
        {on ? '⤡' : '⤢'}
      </button>
    </div>
  );
}
