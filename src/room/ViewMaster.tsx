import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../utils/audio';
import { REELS, paintLayer, type LayerName } from './viewmasterReels';
import './viewMaster.css';

/**
 * The View-Master off the high shelf. Two eyes, one drawn scene, shifted in
 * opposite directions so it reads as depth. The lever advances the reel.
 * Nothing here is fetched, and nothing is a scan of a real reel.
 */

const LAYERS: LayerName[] = ['sky', 'ground', 'subject'];

function paint(reel: number, frame: number) {
  const slide = REELS[reel].scenes[frame];
  const out: Record<LayerName, string> = { sky: '', ground: '', subject: '' };
  for (const layer of LAYERS) {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx || !slide) continue;
    paintLayer(ctx, canvas.width, canvas.height, layer, slide);
    out[layer] = canvas.toDataURL('image/png');
  }
  return out;
}

export function ViewMaster({ onClose }: { onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const look = useRef({ x: 0.45, y: 0 });
  const [reel, setReel] = useState(0);
  const [frame, setFrame] = useState(0);
  const [down, setDown] = useState(false);
  const [pics, setPics] = useState<Record<LayerName, string> | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    setPics(paint(reel, frame));
  }, [reel, frame]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const loop = (t: number) => {
      const el = root.current;
      if (el) {
        const drift = reduced ? 0 : Math.sin(t / 1400) * 0.06;
        el.style.setProperty('--px', (look.current.x + drift).toFixed(3));
        el.style.setProperty('--py', (look.current.y + (reduced ? 0 : Math.cos(t / 1700) * 0.04)).toFixed(3));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const advance = () => {
    if (busy.current) return;
    busy.current = true;
    setDown(true);
    sound.playButtonClick();
    window.setTimeout(() => {
      setFrame(value => (value + 1) % REELS[reel].scenes.length);
      setDown(false);
      busy.current = false;
    }, 150);
  };

  const insert = (index: number) => {
    sound.playButtonClick();
    setReel(index);
    setFrame(0);
  };

  const current = REELS[reel];
  const scene = current.scenes[frame];

  return (
    <div
      ref={root}
      data-ui="viewmaster"
      className="vm-root"
      onPointerMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        look.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        look.current.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      }}
    >
      <div className="vm-top">
        <div>
          <p className="vm-kicker">View-Master</p>
          <h2 className="vm-title font-display">{current.title}</h2>
        </div>
        <button type="button" className="vm-close" onClick={onClose}>
          Put it down
        </button>
      </div>
      <div className="vm-body">
        <div className="vm-eyes">
          {(['l', 'r'] as const).map(eye => (
            <div key={eye} className="vm-eye" data-eye={eye}>
              {pics &&
                LAYERS.map(layer => (
                  <img key={layer} className="vm-layer" data-d={layer} alt="" src={pics[layer]} draggable={false} />
                ))}
            </div>
          ))}
        </div>
        <div className="vm-side">
          <div className="vm-slot">{current.title}</div>
          <button type="button" className="vm-lever" data-down={down ? '1' : '0'} aria-label="Advance the reel" onClick={advance} />
        </div>
      </div>
      <div className="vm-caption">
        <p className="font-display">{scene.caption}</p>
        <span className="vm-count">
          {frame + 1} / {current.scenes.length}
        </span>
      </div>
      <div className="vm-reels" role="listbox" aria-label="Reels">
        {REELS.map((item, index) => (
          <button key={item.title} type="button" className="vm-reel" data-on={index === reel ? '1' : '0'} onClick={() => insert(index)}>
            {item.title}
          </button>
        ))}
      </div>
    </div>
  );
}
