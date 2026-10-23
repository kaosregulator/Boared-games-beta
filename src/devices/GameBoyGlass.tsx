import React, { useEffect, useRef, useState } from 'react';
import { GlassSurface } from './GlassScreen';
import { GAME_PAKS, cartridgeSrc, type Cartridge } from './cartridges';
import { GB_SCREEN_ASPECT, GB_SCREEN_PX } from './GameBoySeat';
import { setGameBoyFrame } from './gameboyBus';

const DOT = '#9bbc0f';
const INK = '#0f380f';
/** The dark frame around the picture on a real Game Boy's LCD. */
const FRAME = '#33323b';

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
          background: cart ? FRAME : DOT,
          color: INK,
          fontFamily: '"IBM Plex Mono", monospace',
          overflow: 'hidden',
          position: 'relative',
          borderRadius: 3,
        }}
      >
        {cart ? (
          <iframe
            ref={frame}
            title={cart.title}
            src={cartridgeSrc(cart)}
            // the Game Boy's own 10:9 picture, centred in the LCD's dark frame
            style={{
              position: 'absolute',
              top: 0,
              left: (width - Math.round((height * 10) / 9)) / 2,
              width: Math.round((height * 10) / 9),
              height,
              border: 0,
              background: FRAME,
            }}
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
        {/* a crisp, slightly sunken edge where the glass meets the shell */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 3,
            pointerEvents: 'none',
            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6), inset 0 3px 6px rgba(0,0,0,0.4)',
          }}
        />
      </div>
    </GlassSurface>
  );
}
