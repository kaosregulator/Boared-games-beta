import React, { useEffect, useRef } from 'react';
import { aim } from './input';
import type { Aimed } from './ReachRaycaster';
import { labelledIds } from './HoverGlow';

/**
 * The dot in the middle of the screen and the name of what you're pointing
 * at. With a mouse the name follows the cursor and the dot hides; on a touch
 * screen or with the arrow keys the dot in the middle is the aim.
 */
export function AimReticle({ aimed, showDot, touch }: { aimed: Aimed | null; showDot: boolean; touch: boolean }) {
  const dot = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const aimedRef = useRef(aimed);
  aimedRef.current = aimed;

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const cursor = aim.mode === 'cursor';
      if (dot.current) dot.current.style.opacity = cursor ? '0' : '1';
      if (label.current) {
        const x = cursor ? aim.px.x : window.innerWidth / 2;
        const y = cursor ? aim.px.y + 26 : window.innerHeight / 2 + 30;
        label.current.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translateX(-50%)`;
        // Things that show their own floating name card don't need this one too.
        const own = Boolean(aimedRef.current?.inReach && labelledIds.has(aimedRef.current.id));
        label.current.style.visibility = own ? 'hidden' : 'visible';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      {showDot && (
        <div ref={dot} className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div
            className={`rounded-full border transition-all duration-150 ${
              aimed?.inReach
                ? 'h-5 w-5 border-amber-300/90 bg-amber-200/20'
                : aimed
                  ? 'h-3.5 w-3.5 border-white/60'
                  : 'h-1.5 w-1.5 border-white/70 bg-white/70'
            }`}
          />
        </div>
      )}
      <div ref={label} className="pointer-events-none fixed left-0 top-0 z-20 text-center" style={{ display: aimed ? 'block' : 'none' }}>
        {aimed && (
          <>
            <p className="whitespace-nowrap font-display text-lg text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-xl">{aimed.label}</p>
            <p className="mt-0.5 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/90">
              {aimed.inReach ? (touch ? 'Tap it' : `Click · E · ${aimed.hint ?? 'Inspect'}`) : 'Walk closer'}
            </p>
          </>
        )}
      </div>
    </>
  );
}
