import { useCallback, useEffect, useRef, useState } from 'react';
import { sound } from '../utils/audio';
import { FRAMES_PER_REEL, REELS, REEL_CREDIT, depthUrl, frameUrl, type Reel } from './viewmasterReels';
import { makeStereo, type Stereo } from './viewmaster/stereo';
import './viewMaster.css';

/**
 * The View-Master off the high shelf. Pick one of fifteen real 1990s reels,
 * drop it in, and look: both lenses open the scene out in 3D, and the lever
 * clicks the reel round to the next of its seven scenes.
 */
export function ViewMaster({ onClose }: { onClose: () => void }) {
  const [reel, setReel] = useState<Reel | null>(null);
  return (
    <div data-ui="viewmaster" className="vm-root" onContextMenu={e => e.preventDefault()}>
      {reel ? <Viewer reel={reel} onEject={() => setReel(null)} onClose={onClose} /> : <Picker onPick={setReel} onClose={onClose} />}
    </div>
  );
}

function Picker({ onPick, onClose }: { onPick: (reel: Reel) => void; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="vm-picker">
      <header className="vm-top">
        <div>
          <p className="vm-kicker">View-Master · pick a reel</p>
          <h2 className="vm-title">Fifteen reels from the 90s</h2>
        </div>
        <button type="button" className="vm-close" onClick={onClose}>
          Put it down
        </button>
      </header>
      <div className="vm-grid">
        {REELS.map(reel => (
          <button
            key={reel.id}
            type="button"
            className="vm-pick"
            onClick={() => {
              sound.playButtonClick();
              onPick(reel);
            }}
          >
            <ReelDisc reel={reel} />
            <span className="vm-pick-title">{reel.title}</span>
            <span className="vm-pick-year">{reel.year}</span>
          </button>
        ))}
      </div>
      <p className="vm-credit">{REEL_CREDIT}</p>
    </div>
  );
}

/** A paper reel: the white disc, its ring colour, and its scenes round the rim. */
function ReelDisc({ reel, turn = 0 }: { reel: Reel; turn?: number }) {
  return (
    <span className="vm-disc" style={{ ['--ring' as string]: reel.ring, ['--turn' as string]: `${turn}deg` }}>
      {Array.from({ length: FRAMES_PER_REEL }, (_, i) => (
        <span key={i} className="vm-slide" style={{ ['--a' as string]: `${(360 / FRAMES_PER_REEL) * i}deg` }}>
          <img src={frameUrl(reel, i)} alt="" draggable={false} loading="lazy" />
        </span>
      ))}
      <span className="vm-hub">
        <b>{reel.year}</b>
      </span>
    </span>
  );
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function Viewer({ reel, onEject, onClose }: { reel: Reel; onEject: () => void; onClose: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stereo = useRef<Stereo | null>(null);
  const [frame, setFrame] = useState(0);
  const [flat, setFlat] = useState(false);
  const [down, setDown] = useState(false);
  const blink = useRef(1);
  const sway = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const busy = useRef(false);

  // The lenses.
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    try {
      stereo.current = makeStereo(c);
    } catch (err) {
      console.warn('[viewmaster] no 3D lenses, showing the flat scans', err);
      stereo.current = null;
    }
    if (!stereo.current) setFlat(true);
    let raf = 0;
    const t0 = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const s = sway.current;
      // A slow drift when you're not moving it, so the layers always breathe a little.
      const t = (performance.now() - t0) / 1000;
      const idle = { x: Math.sin(t * 0.7) * 0.35, y: Math.sin(t * 0.5) * 0.2 };
      s.x += (s.tx + idle.x - s.x) * 0.08;
      s.y += (s.ty + idle.y - s.y) * 0.08;
      blink.current = Math.max(0, blink.current - 0.09);
      stereo.current?.draw(s, blink.current);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      stereo.current?.dispose();
      stereo.current = null;
    };
  }, []);

  // Load the scene (and the next one, so the lever never waits).
  useEffect(() => {
    let live = true;
    Promise.all([loadImage(frameUrl(reel, frame)), loadImage(depthUrl(reel, frame))])
      .then(([img, dep]) => {
        if (!live) return;
        stereo.current?.show(img, dep);
      })
      .catch(err => {
        console.warn('[viewmaster] scene failed to load', err);
        setFlat(true);
      });
    const next = (frame + 1) % FRAMES_PER_REEL;
    void loadImage(frameUrl(reel, next)).catch(() => undefined);
    void loadImage(depthUrl(reel, next)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [reel, frame]);

  const advance = useCallback(
    (dir = 1) => {
      if (busy.current) return;
      busy.current = true;
      setDown(true);
      blink.current = 1;
      sound.playButtonClick();
      window.setTimeout(() => {
        setFrame(f => (f + dir + FRAMES_PER_REEL) % FRAMES_PER_REEL);
        setDown(false);
        busy.current = false;
      }, 170);
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        advance(1);
      } else if (e.key === 'ArrowLeft') advance(-1);
      else if (e.key === 'Backspace') onEject();
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      sway.current.tx = Math.max(-1, Math.min(1, e.gamma / 25));
      sway.current.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('deviceorientation', onTilt);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('deviceorientation', onTilt);
    };
  }, [advance, onClose, onEject]);

  return (
    <div
      className="vm-view"
      onPointerMove={e => {
        const r = e.currentTarget.getBoundingClientRect();
        sway.current.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
        sway.current.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      }}
      onPointerLeave={() => {
        sway.current.tx = 0;
        sway.current.ty = 0;
      }}
    >
      <header className="vm-top">
        <div>
          <p className="vm-kicker">
            {reel.code} · {reel.year}
          </p>
          <h2 className="vm-title">{reel.title}</h2>
        </div>
        <div className="vm-top-buttons">
          <button type="button" className="vm-close" onClick={onEject}>
            Change reel
          </button>
          <button type="button" className="vm-close" onClick={onClose}>
            Put it down
          </button>
        </div>
      </header>

      <div className="vm-body">
        {/* The viewer itself: the red face, two lenses, the reel showing in the slot on top. */}
        <div className="vm-face">
          <div className="vm-slot-reel">
            <ReelDisc reel={reel} turn={-(360 / FRAMES_PER_REEL) * frame} />
          </div>
          <div className="vm-lenses">
            <canvas ref={canvas} className="vm-canvas" onClick={() => advance(1)} />
            {flat && (
              <div className="vm-flat" onClick={() => advance(1)}>
                <img src={frameUrl(reel, frame)} alt={`${reel.title}, scene ${frame + 1}`} draggable={false} />
                <img src={frameUrl(reel, frame)} alt="" draggable={false} />
              </div>
            )}
          </div>
          <span className="vm-brand">View-Master</span>
        </div>
        <button type="button" className="vm-lever" data-down={down ? '1' : '0'} aria-label="Pull the lever: next scene" onClick={() => advance(1)}>
          <span />
        </button>
      </div>

      <footer className="vm-caption">
        <span className="vm-count">
          Scene {frame + 1} / {FRAMES_PER_REEL}
        </span>
        <span className="vm-hint">Pull the lever (click, Space or →) · move the mouse or tilt the phone to look round</span>
        <span className="vm-credit">{REEL_CREDIT}</span>
      </footer>
    </div>
  );
}
