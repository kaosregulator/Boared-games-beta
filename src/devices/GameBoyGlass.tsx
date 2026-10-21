import React, { useEffect, useRef, useState } from 'react';
import { GlassSurface } from './GlassScreen';
import { GAME_PAKS, cartridgeSrc, type Cartridge } from './cartridges';
import { GB_SCREEN_ASPECT, GB_SCREEN_PX } from './GameBoySeat';
import { setGameBoyFrame } from './gameboyBus';

const DOT = '#9bbc0f';
const INK = '#0f380f';

/** What shows on the Game Boy's screen: a cartridge picker, then the game. */
export function GameBoyGlass() {
  // One Game Pak in the slot means it just boots, like flipping the power switch.
  const [cart, setCart] = useState<Cartridge | null>(GAME_PAKS.length === 1 ? GAME_PAKS[0] : null);
  const [pick, setPick] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const width = GB_SCREEN_PX;
  const height = Math.round(GB_SCREEN_PX * GB_SCREEN_ASPECT);

  useEffect(() => {
    setGameBoyFrame(frame.current);
    const focus = window.setTimeout(() => frame.current?.focus(), 500);
    return () => {
      window.clearTimeout(focus);
      setGameBoyFrame(null);
    };
  }, [cart]);

  useEffect(() => {
    if (cart) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        setPick(i => (i + GAME_PAKS.length + (e.code === 'ArrowDown' ? 1 : -1)) % GAME_PAKS.length);
      }
      if (e.code === 'Enter' || e.code === 'KeyZ') setCart(GAME_PAKS[pick]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cart, pick]);

  return (
    <GlassSurface id="gameboy" zIndex={12}>
      <div
        data-ui="gameboy"
        style={{
          width,
          height,
          background: DOT,
          color: INK,
          fontFamily: '"IBM Plex Mono", monospace',
          overflow: 'hidden',
          position: 'relative',
          borderRadius: 4,
        }}
      >
        {cart ? (
          <iframe
            ref={frame}
            title={cart.title}
            src={cartridgeSrc(cart)}
            style={{ width: '100%', height: '100%', border: 0, background: '#000' }}
            allow="autoplay; gamepad"
          />
        ) : (
          <div style={{ padding: '18px 22px' }}>
            <p style={{ fontSize: 15, fontWeight: 800, letterSpacing: 2 }}>INSERT GAME PAK</p>
            {GAME_PAKS.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCart(c)}
                onPointerEnter={() => setPick(i)}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 10,
                  padding: '6px 10px',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  fontSize: 20,
                  fontWeight: 800,
                  color: pick === i ? DOT : INK,
                  background: pick === i ? INK : 'transparent',
                  border: `3px solid ${INK}`,
                  cursor: 'pointer',
                }}
              >
                {pick === i ? '▶ ' : '  '}
                {c.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </GlassSurface>
  );
}
