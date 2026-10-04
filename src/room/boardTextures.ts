import * as THREE from 'three';
import { GameId } from '../types';

function canvas(w = 512, h = 512) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return { c, ctx };
}

function texture(c: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
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

function grid(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, cells: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = 0; i <= cells; i++) {
    const p = x + (size * i) / cells;
    ctx.beginPath();
    ctx.moveTo(p, y);
    ctx.lineTo(p, y + size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y + (size * i) / cells);
    ctx.lineTo(x + size, y + (size * i) / cells);
    ctx.stroke();
  }
}

function ocean(ctx: CanvasRenderingContext2D, label: string) {
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#0e7490');
  g.addColorStop(1, '#082f49');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = '#e0f2fe';
  ctx.font = '700 36px sans-serif';
  ctx.fillText(label, 28, 52);
  grid(ctx, 48, 80, 400, 10, 'rgba(224,242,254,0.55)');
  ctx.fillStyle = '#1e293b';
  roundRect(ctx, 70, 200, 150, 36, 8);
  ctx.fill();
  roundRect(ctx, 240, 280, 110, 34, 8);
  ctx.fill();
  roundRect(ctx, 140, 340, 80, 32, 6);
  ctx.fill();
}

function checker(ctx: CanvasRenderingContext2D, light: string, dark: string) {
  ctx.fillStyle = '#3f2a1d';
  ctx.fillRect(0, 0, 512, 512);
  const o = 36;
  const s = 55;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? light : dark;
      ctx.fillRect(o + x * s, o + y * s, s, s);
    }
  }
}

function felt(ctx: CanvasRenderingContext2D, color: string, title: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 10;
  ctx.strokeRect(28, 28, 456, 456);
  ctx.fillStyle = '#fef3c7';
  ctx.font = '700 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 256, 270);
  ctx.textAlign = 'left';
}

export function makePanelTexture(gameId: GameId, panel: 'left' | 'center' | 'right') {
  const { c, ctx } = canvas();

  if (gameId === 'battleship') {
    if (panel === 'center') {
      ocean(ctx, 'BATTLESHIP');
      ctx.fillStyle = '#f8fafc';
      ctx.font = '700 28px sans-serif';
      ctx.fillText('FLEET', 40, 470);
    } else {
      ocean(ctx, panel === 'left' ? 'YOUR WATERS' : 'ENEMY WATERS');
    }
    return texture(c);
  }

  if (gameId === 'chess' || gameId === 'checkers') {
    if (panel === 'center') {
      checker(ctx, gameId === 'chess' ? '#f3e6d0' : '#f8d7c4', gameId === 'chess' ? '#6b3f2a' : '#7f1d1d');
    } else {
      ctx.fillStyle = '#5c3b28';
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = '#3b2418';
      for (let i = 0; i < 8; i++) {
        roundRect(ctx, 70, 40 + i * 56, 370, 40, 8);
        ctx.fill();
      }
      ctx.fillStyle = '#f5e6d3';
      ctx.font = '700 28px sans-serif';
      ctx.fillText(panel === 'left' ? 'WHITE' : 'BLACK', 40, 480);
    }
    return texture(c);
  }

  if (gameId === 'connect4') {
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, 512, 512);
    if (panel === 'center') {
      for (let y = 0; y < 6; y++) {
        for (let x = 0; x < 7; x++) {
          ctx.fillStyle = '#dbeafe';
          ctx.beginPath();
          ctx.arc(70 + x * 58, 70 + y * 64, 22, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      ctx.fillStyle = panel === 'left' ? '#ef4444' : '#facc15';
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.arc(120 + (i % 2) * 180, 60 + i * 42, 28, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return texture(c);
  }

  if (gameId === 'pawnrush') {
    const colors = ['#ef4444', '#eab308', '#22c55e', '#3b82f6'];
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = colors[i % 4];
      const x = 36 + (i % 4) * 110;
      const y = 36 + Math.floor(i / 4) * 100;
      roundRect(ctx, x, y, 96, 80, 10);
      ctx.fill();
    }
    ctx.fillStyle = '#111827';
    ctx.font = '800 32px sans-serif';
    ctx.fillText(panel === 'center' ? 'SORRY!' : panel === 'left' ? 'START' : 'HOME', 36, 490);
    return texture(c);
  }

  if (gameId === 'poker' || gameId === 'blackjack' || gameId === 'gofish' || gameId === 'casino') {
    const title =
      gameId === 'poker' ? 'HOLD EM' : gameId === 'blackjack' ? '21' : gameId === 'gofish' ? 'GO FISH' : 'CASINO';
    felt(ctx, gameId === 'gofish' ? '#0e7490' : '#166534', panel === 'center' ? title : panel === 'left' ? 'ANTE' : 'POT');
    if (panel === 'center' && gameId !== 'casino') {
      ctx.fillStyle = '#b91c1c';
      roundRect(ctx, 150, 300, 90, 130, 8);
      ctx.fill();
      ctx.fillStyle = '#1e3a8a';
      roundRect(ctx, 270, 300, 90, 130, 8);
      ctx.fill();
    }
    return texture(c);
  }

  if (gameId === 'yahtzee') {
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#fef3c7';
    ctx.font = '800 36px sans-serif';
    ctx.fillText(panel === 'center' ? 'YAHTZEE' : panel === 'left' ? 'DICE' : 'SCORE', 36, 64);
    for (let i = 0; i < 5; i++) {
      roundRect(ctx, 40 + i * 90, 180, 76, 76, 12);
      ctx.fill();
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.arc(78 + i * 90, 218, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef3c7';
    }
    return texture(c);
  }

  if (gameId === 'clue') {
    const rooms = ['KITCHEN', 'HALL', 'LOUNGE', 'STUDY'];
    ctx.fillStyle = '#14532d';
    ctx.fillRect(0, 0, 512, 512);
    rooms.forEach((room, i) => {
      ctx.fillStyle = ['#f87171', '#facc15', '#4ade80', '#c084fc'][i];
      roundRect(ctx, 36, 40 + i * 110, 440, 90, 12);
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.font = '800 28px sans-serif';
      ctx.fillText(panel === 'center' ? room : panel === 'left' ? 'WHO' : 'HOW', 56, 96 + i * 110);
    });
    return texture(c);
  }

  if (gameId === 'life') {
    ctx.fillStyle = '#ecfccb';
    ctx.fillRect(0, 0, 512, 512);
    const colors = ['#f97316', '#22c55e', '#3b82f6', '#eab308'];
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = colors[i % 4];
      roundRect(ctx, 28 + (i % 4) * 118, 28 + Math.floor(i / 4) * 140, 100, 110, 14);
      ctx.fill();
    }
    ctx.fillStyle = '#14532d';
    ctx.font = '800 32px sans-serif';
    ctx.fillText(panel === 'center' ? 'LIFE' : 'SPIN', 36, 490);
    return texture(c);
  }

  if (gameId === 'monopoly') {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, 432, 432);
    const deeds = ['#cbd5e1', '#f472b6', '#fb923c', '#4ade80', '#60a5fa', '#facc15'];
    deeds.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(70, 70 + i * 58, 370, 42);
    });
    ctx.fillStyle = '#111827';
    ctx.font = '800 28px sans-serif';
    ctx.fillText('MONOPOLY', 150, 490);
    return texture(c);
  }

  if (gameId === 'liarsdice') {
    ctx.fillStyle = '#7c4a2d';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#f5e6c8';
    const spots = panel === 'center' ? [1, 1, 1, 1, 1] : [1, 1, 1];
    spots.forEach((_, i) => {
      const x = 70 + (i % 3) * 130;
      const y = 80 + Math.floor(i / 3) * 150;
      roundRect(ctx, x, y, 100, 100, 16);
      ctx.fill();
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(x + 50, y + 50, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f5e6c8';
    });
    return texture(c);
  }

  // Trivia and fallback: a party card board, still a physical board.
  ctx.fillStyle = '#4c1d95';
  ctx.fillRect(0, 0, 512, 512);
  ctx.fillStyle = '#fbbf24';
  ctx.font = '800 40px sans-serif';
  ctx.fillText(panel === 'center' ? 'TRIVIA' : panel === 'left' ? 'Q' : 'A', 40, 80);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = i % 2 ? '#f97316' : '#22d3ee';
    roundRect(ctx, 40, 120 + i * 85, 430, 70, 12);
    ctx.fill();
  }
  return texture(c);
}

export function makeLidTexture(title: string, face: string, ink: string) {
  const { c, ctx } = canvas(1024, 512);
  ctx.fillStyle = face;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 16;
  ctx.strokeRect(24, 24, 976, 464);
  ctx.fillStyle = ink;
  ctx.font = '800 92px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const line = title.length > 16 ? title.slice(0, 16) : title;
  ctx.fillText(line.toUpperCase(), 512, 250);
  ctx.textAlign = 'left';
  return texture(c);
}

export const BOX_FACE: Record<string, { card: string; face: string; ink: string }> = {
  battleship: { card: '#a16245', face: '#0c4a6e', ink: '#e0f2fe' },
  chess: { card: '#8a5a3b', face: '#292524', ink: '#f5f5f4' },
  checkers: { card: '#8a5a3b', face: '#7f1d1d', ink: '#fee2e2' },
  connect4: { card: '#a16245', face: '#1d4ed8', ink: '#fef9c3' },
  pawnrush: { card: '#a16245', face: '#be123c', ink: '#fff1f2' },
  poker: { card: '#a16245', face: '#7f1d1d', ink: '#fef3c7' },
  blackjack: { card: '#a16245', face: '#14532d', ink: '#dcfce7' },
  gofish: { card: '#a16245', face: '#0e7490', ink: '#ecfeff' },
  casino: { card: '#a16245', face: '#065f46', ink: '#d1fae5' },
  liarsdice: { card: '#a16245', face: '#854d0e', ink: '#fef9c3' },
  trivia: { card: '#a16245', face: '#4c1d95', ink: '#fde68a' },
  yahtzee: { card: '#a16245', face: '#7f1d1d', ink: '#fef3c7' },
  clue: { card: '#a16245', face: '#14532d', ink: '#fef9c7' },
  life: { card: '#a16245', face: '#166534', ink: '#ecfccb' },
  monopoly: { card: '#a16245', face: '#1d4ed8', ink: '#ffffff' },
};
