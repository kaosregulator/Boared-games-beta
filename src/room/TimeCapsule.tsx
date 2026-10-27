import React, { useEffect, useRef, useState } from 'react';
import type { CardPhoto } from './gamePhotos';
import './timeCapsule.css';

/**
 * A game's memory, as a clear plate. The piece in the middle is drawn here,
 * not loaded from a file, so it cannot be saved out of the card. Photos
 * appear when the piece comes around, and Next walks the rest of them
 * before the piece returns.
 */

const HUE: Record<string, string> = {
  monopoly: '#3ecf8e',
  battleship: '#7ec8ff',
  clue: '#f2c14e',
  yahtzee: '#ff5a6a',
  chess: '#f4efe4',
  checkers: '#e23b3b',
  connect4: '#ffd23f',
  poker: '#ffd98a',
  blackjack: '#9ff0b8',
  gofish: '#7ee0ff',
  pawnrush: '#ff8a80',
  life: '#b6f27a',
  trivia: '#e6b0ff',
  casino: '#7dffe1',
  liarsdice: '#f5d985',
};

function drawPiece(ctx: CanvasRenderingContext2D, id: string, w: number, h: number) {
  const hue = HUE[id] ?? '#c9f6ff';
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, 'rgba(255,255,255,0.08)');
  g.addColorStop(0.5, 'rgba(10,16,28,0.15)');
  g.addColorStop(1, 'rgba(255,255,255,0.05)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w / 2, h / 2 + 6);
  ctx.strokeStyle = hue;
  ctx.fillStyle = hue;
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.shadowColor = hue;
  ctx.shadowBlur = 18;

  if (id === 'battleship') {
    ctx.beginPath();
    ctx.moveTo(-46, 10);
    ctx.lineTo(40, 10);
    ctx.quadraticCurveTo(58, 10, 58, -2);
    ctx.lineTo(20, -16);
    ctx.lineTo(-30, -16);
    ctx.quadraticCurveTo(-52, -8, -46, 10);
    ctx.fill();
    ctx.fillRect(-8, -36, 8, 22);
  } else if (id === 'chess' || id === 'checkers' || id === 'pawnrush') {
    ctx.beginPath();
    ctx.moveTo(-28, 36);
    ctx.lineTo(28, 36);
    ctx.lineTo(18, 22);
    ctx.lineTo(22, 8);
    ctx.quadraticCurveTo(0, -8, -22, 8);
    ctx.lineTo(-18, 22);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -16, 16, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'yahtzee' || id === 'liarsdice') {
    roundRect(ctx, -36, -36, 72, 72, 12);
    ctx.fill();
    ctx.fillStyle = '#1a1208';
    for (const [x, y] of [[-14, -14], [14, 0], [-14, 14]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === 'monopoly' || id === 'life') {
    ctx.beginPath();
    ctx.moveTo(0, -40);
    ctx.lineTo(40, -8);
    ctx.lineTo(26, -8);
    ctx.lineTo(26, 32);
    ctx.lineTo(-26, 32);
    ctx.lineTo(-26, -8);
    ctx.lineTo(-40, -8);
    ctx.closePath();
    ctx.fill();
  } else if (id === 'gofish') {
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.quadraticCurveTo(-10, -28, 24, -8);
    ctx.quadraticCurveTo(48, 0, 24, 10);
    ctx.quadraticCurveTo(-10, 28, -40, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(24, -6);
    ctx.lineTo(48, -18);
    ctx.lineTo(48, 16);
    ctx.closePath();
    ctx.fill();
  } else {
    roundRect(ctx, -28, -40, 56, 80, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(-16, -28, 32, 40);
  }
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = '700 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SEALED', w / 2, h - 14);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function paintPhoto(canvas: HTMLCanvasElement, src: string) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = new Image();
  img.onload = () => {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const scale = Math.max(w / img.width, h / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  };
  img.src = src;
}

export function TimeCapsule({ id, title, photos }: { id: string; title: string; photos: CardPhoto[] }) {
  const piece = useRef<HTMLCanvasElement>(null);
  const plate = useRef<HTMLCanvasElement>(null);
  const lock = useRef(false);
  const shown = useRef<number | null>(null);
  const cycle = useRef(0);
  const [hold, setHold] = useState<number | null>(null);

  useEffect(() => {
    const canvas = piece.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) drawPiece(ctx, id, canvas.width, canvas.height);
  }, [id]);

  useEffect(() => {
    if (hold === null || !photos[hold]) return;
    const canvas = plate.current;
    if (canvas) paintPhoto(canvas, photos[hold].src);
  }, [hold, photos]);

  useEffect(() => {
    if (!photos.length) return;
    const timer = window.setInterval(() => {
      if (lock.current || shown.current !== null) return;
      const index = cycle.current % photos.length;
      cycle.current += 1;
      shown.current = index;
      setHold(index);
      window.setTimeout(() => {
        if (lock.current || shown.current !== index) return;
        shown.current = null;
        setHold(null);
      }, 1400);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [photos.length]);

  const next = () => {
    if (!photos.length) return;
    lock.current = true;
    setHold(cur => {
      const n = cur === null ? 0 : cur + 1;
      if (n >= photos.length) {
        lock.current = false;
        shown.current = null;
        return null;
      }
      shown.current = n;
      return n;
    });
  };

  const showing = hold !== null && photos[hold];

  return (
    <div
      className="time-capsule"
      data-capsule={id}
      onContextMenu={e => e.preventDefault()}
      onDragStart={e => e.preventDefault()}
    >
      <div className="time-capsule__scan" />
      <div className="time-capsule__stage">
        <div className="time-capsule__spin" data-hold={showing ? '1' : '0'}>
          <div className="time-capsule__face">
            <canvas ref={piece} width={296} height={336} />
          </div>
          <div className="time-capsule__face time-capsule__face--back" />
        </div>
        <div className="time-capsule__photo" data-on={showing ? '1' : '0'}>
          <canvas ref={plate} width={360} height={240} />
        </div>
      </div>
      <div className="time-capsule__bar">
        <div>
          <p className="time-capsule__kicker">Time capsule</p>
          <p className="font-display text-sm leading-tight">{title}</p>
          {showing ? <p className="text-[9px] text-white/55">{photos[hold].credit}</p> : <p className="text-[9px] text-white/45">Sealed in the room</p>}
        </div>
        <button type="button" className="time-capsule__next" onClick={next} disabled={!photos.length}>
          Next
        </button>
      </div>
    </div>
  );
}
