import * as THREE from 'three';
import { SUSPECTS, type Card, type RoomName } from '../../games/clue/clueData';

/**
 * Printed card for the pop-up mansion: each room's floor and wallpaper, the
 * sticker decorations stuck on its walls (portraits, windows, a fireplace, a
 * clock), die-cut standee stickers, and the Clue cards themselves. All drawn
 * on canvases, the way realBoardArt paints the board, so nothing is fetched.
 */

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, g: c.getContext('2d')! };
}

function tex(c: HTMLCanvasElement, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** A tiny seeded random, so a wall prints the same every time. */
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hash(text: string) {
  let h = 7;
  for (let i = 0; i < text.length; i += 1) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h) + 1;
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

/** Fine speckle and fibres, so a flat colour reads as printed card. */
function grain(g: CanvasRenderingContext2D, w: number, h: number, amount = 0.05, seed = 3) {
  const r = rng(seed);
  for (let i = 0; i < (w * h) / 60; i += 1) {
    g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${amount * r()})` : `rgba(0,0,0,${amount * r()})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 2, 1);
  }
}

/* --------------------------------- floors --------------------------------- */

function planks(g: CanvasRenderingContext2D, w: number, h: number, base: string, plank: number, seed: number) {
  const r = rng(seed);
  for (let y = 0; y < h; y += plank) {
    let x = -r() * 200;
    while (x < w) {
      const len = 140 + r() * 180;
      g.fillStyle = shade(base, (r() - 0.5) * 0.22);
      g.fillRect(x, y, len, plank);
      // grain lines
      g.strokeStyle = 'rgba(40,20,5,0.18)';
      g.lineWidth = 1;
      for (let k = 0; k < 3; k += 1) {
        const yy = y + 3 + r() * (plank - 6);
        g.beginPath();
        g.moveTo(x, yy);
        g.bezierCurveTo(x + len * 0.3, yy + 2, x + len * 0.6, yy - 2, x + len, yy);
        g.stroke();
      }
      g.strokeStyle = 'rgba(25,12,4,0.55)';
      g.strokeRect(x, y, len, plank);
      x += len;
    }
  }
}

function herringbone(g: CanvasRenderingContext2D, w: number, h: number, base: string, seed: number) {
  const r = rng(seed);
  const s = 22;
  for (let y = -s * 4; y < h + s * 4; y += s) {
    for (let x = -s * 4; x < w + s * 4; x += s * 2) {
      const off = ((y / s) % 2) * s;
      g.save();
      g.translate(x + off, y);
      g.rotate(Math.PI / 4);
      g.fillStyle = shade(base, (r() - 0.5) * 0.25);
      g.fillRect(0, 0, s * 2.8, s);
      g.strokeStyle = 'rgba(30,15,5,0.5)';
      g.strokeRect(0, 0, s * 2.8, s);
      g.restore();
    }
  }
}

function checker(g: CanvasRenderingContext2D, w: number, h: number, a: string, b: string, size: number, diamond = false) {
  g.save();
  if (diamond) {
    g.translate(w / 2, h / 2);
    g.rotate(Math.PI / 4);
    g.translate(-w, -h);
  }
  const span = diamond ? Math.max(w, h) * 2 : Math.max(w, h);
  for (let y = 0; y * size < span; y += 1) {
    for (let x = 0; x * size < span; x += 1) {
      g.fillStyle = (x + y) % 2 === 0 ? a : b;
      g.fillRect(x * size, y * size, size, size);
    }
  }
  g.restore();
}

function rug(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, field: string, border: string, motif: string) {
  g.fillStyle = border;
  g.fillRect(x, y, w, h);
  g.fillStyle = field;
  g.fillRect(x + 10, y + 10, w - 20, h - 20);
  g.strokeStyle = motif;
  g.lineWidth = 3;
  g.strokeRect(x + 18, y + 18, w - 36, h - 36);
  // a medallion and corner sprigs
  g.beginPath();
  g.ellipse(x + w / 2, y + h / 2, w * 0.18, h * 0.22, 0, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = motif;
  for (const [cx, cy] of [
    [x + 34, y + 34],
    [x + w - 34, y + 34],
    [x + 34, y + h - 34],
    [x + w - 34, y + h - 34],
  ]) {
    g.beginPath();
    g.arc(cx, cy, 6, 0, Math.PI * 2);
    g.fill();
  }
  // fringe
  g.strokeStyle = 'rgba(240,230,200,0.8)';
  g.lineWidth = 1.5;
  for (let i = x; i < x + w; i += 5) {
    g.beginPath();
    g.moveTo(i, y);
    g.lineTo(i, y - 6);
    g.moveTo(i, y + h);
    g.lineTo(i, y + h + 6);
    g.stroke();
  }
}

const FLOOR_CACHE = new Map<string, THREE.Texture>();

/** A room's printed floor, `w` x `h` tiles. */
export function floorTexture(room: RoomName, w: number, h: number) {
  const key = `${room}|${w}x${h}`;
  const hit = FLOOR_CACHE.get(key);
  if (hit) return hit;
  const px = 160;
  const { c, g } = canvas(w * px, h * px);
  const W = c.width;
  const H = c.height;
  const seed = hash(room);
  switch (room) {
    case 'Study':
      herringbone(g, W, H, '#6b4423', seed);
      rug(g, W * 0.12, H * 0.2, W * 0.6, H * 0.6, '#2e4a7a', '#7a1f24', '#d7b56d');
      break;
    case 'Hall':
      checker(g, W, H, '#efe9dc', '#1f1d1c', 64, true);
      rug(g, W * 0.3, H * 0.08, W * 0.4, H * 0.84, '#8c1d22', '#3d0f12', '#e5c37a');
      break;
    case 'Lounge':
      g.fillStyle = '#7d1a28';
      g.fillRect(0, 0, W, H);
      for (let y = 20; y < H; y += 48) for (let x = (y / 48) % 2 ? 44 : 20; x < W; x += 48) {
        g.fillStyle = '#a8343f';
        g.beginPath();
        g.moveTo(x, y - 9);
        g.lineTo(x + 9, y);
        g.lineTo(x, y + 9);
        g.lineTo(x - 9, y);
        g.fill();
      }
      break;
    case 'Library':
      planks(g, W, H, '#8a5a32', 36, seed);
      rug(g, W * 0.2, H * 0.22, W * 0.56, H * 0.56, '#2d5a3a', '#173322', '#c9a75a');
      break;
    case 'Billiard Room':
      planks(g, W, H, '#5b3820', 30, seed);
      break;
    case 'Dining Room':
      herringbone(g, W, H, '#8b5a2b', seed);
      rug(g, W * 0.12, H * 0.1, W * 0.76, H * 0.8, '#6b1e2a', '#2a0c10', '#d9b866');
      break;
    case 'Conservatory':
      checker(g, W, H, '#b5653a', '#c98a5a', 40);
      g.strokeStyle = 'rgba(80,40,20,0.5)';
      g.lineWidth = 2;
      for (let x = 0; x < W; x += 40) g.strokeRect(x, 0, 40, H);
      break;
    case 'Ballroom': {
      // inlaid parquet: light and dark squares of short boards
      const s = 64;
      for (let y = 0; y < H; y += s) for (let x = 0; x < W; x += s) {
        const dark = ((x + y) / s) % 2 === 0;
        g.fillStyle = dark ? '#8a5a2c' : '#c99a5c';
        g.fillRect(x, y, s, s);
        g.strokeStyle = 'rgba(40,20,5,0.35)';
        for (let k = 1; k < 4; k += 1) {
          g.beginPath();
          if (dark) {
            g.moveTo(x + (k * s) / 4, y);
            g.lineTo(x + (k * s) / 4, y + s);
          } else {
            g.moveTo(x, y + (k * s) / 4);
            g.lineTo(x + s, y + (k * s) / 4);
          }
          g.stroke();
        }
      }
      g.strokeStyle = '#e8c977';
      g.lineWidth = 6;
      g.beginPath();
      g.arc(W / 2, H / 2, Math.min(W, H) * 0.3, 0, Math.PI * 2);
      g.stroke();
      break;
    }
    case 'Kitchen':
      checker(g, W, H, '#f2efe6', '#3b6ea8', 48);
      break;
  }
  grain(g, W, H, 0.06, seed);
  // the printed border every room has on a real board
  g.strokeStyle = 'rgba(20,12,6,0.55)';
  g.lineWidth = 8;
  g.strokeRect(0, 0, W, H);
  const t = tex(c);
  FLOOR_CACHE.set(key, t);
  return t;
}

/* ------------------------------- wallpaper -------------------------------- */

interface Paper {
  base: string;
  pattern: 'damask' | 'stripes' | 'panel' | 'trellis' | 'tile' | 'books' | 'glass';
  ink: string;
  dado?: string;
}

export const WALLPAPER: Record<RoomName, Paper> = {
  Study: { base: '#2f4a3a', pattern: 'panel', ink: '#c7a35a', dado: '#4a2c17' },
  Hall: { base: '#d9c9a0', pattern: 'stripes', ink: '#b59a62', dado: '#5a3a20' },
  Lounge: { base: '#7a1e2b', pattern: 'damask', ink: '#b8434f', dado: '#3e1d10' },
  Library: { base: '#5a3a20', pattern: 'books', ink: '#c9a75a' },
  'Billiard Room': { base: '#2c5a3e', pattern: 'panel', ink: '#9cc4a0', dado: '#3b2414' },
  'Dining Room': { base: '#6b2f38', pattern: 'damask', ink: '#c99a5c', dado: '#3a1f12' },
  Conservatory: { base: '#cfe6d6', pattern: 'glass', ink: '#2f5a3a' },
  Ballroom: { base: '#e7dcc0', pattern: 'trellis', ink: '#c9a75a', dado: '#f4ecd8' },
  Kitchen: { base: '#f1ead6', pattern: 'tile', ink: '#3b6ea8', dado: '#7a5a3a' },
};

function damask(g: CanvasRenderingContext2D, W: number, H: number, ink: string) {
  g.fillStyle = ink;
  g.globalAlpha = 0.55;
  for (let y = 18; y < H; y += 56) {
    for (let x = ((y - 18) / 56) % 2 ? 36 : 8; x < W + 40; x += 56) {
      g.beginPath();
      g.ellipse(x, y, 9, 15, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(x - 11, y + 4, 4, 8, -0.6, 0, Math.PI * 2);
      g.ellipse(x + 11, y + 4, 4, 8, 0.6, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.globalAlpha = 1;
}

function bookshelf(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number) {
  const r = rng(seed);
  g.fillStyle = '#3e2412';
  g.fillRect(x, y, w, h);
  const shelves = Math.max(2, Math.round(h / 46));
  const sh = h / shelves;
  const spines = ['#7a1f24', '#1f4a7a', '#2d5a3a', '#c9a75a', '#4a2a5a', '#8a5a2c', '#20302a', '#b8434f'];
  for (let s = 0; s < shelves; s += 1) {
    let bx = x + 4;
    const by = y + s * sh + 4;
    while (bx < x + w - 8) {
      const bw = 5 + r() * 7;
      const bh = sh - 8 - r() * 10;
      g.fillStyle = spines[Math.floor(r() * spines.length)];
      g.fillRect(bx, by + (sh - 8 - bh), bw, bh);
      g.fillStyle = 'rgba(255,220,140,0.5)';
      g.fillRect(bx, by + (sh - 8 - bh) + 4, bw, 2);
      bx += bw + 1;
    }
    g.fillStyle = '#5a3a20';
    g.fillRect(x, y + (s + 1) * sh - 4, w, 4);
  }
}

/** Sticker decorations, drawn with a white die-cut edge and a soft shadow. */
function sticker(g: CanvasRenderingContext2D, draw: () => void) {
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.35)';
  g.shadowBlur = 6;
  g.shadowOffsetY = 2;
  draw();
  g.restore();
}

function frame(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, art: (x: number, y: number, w: number, h: number) => void) {
  sticker(g, () => {
    g.fillStyle = '#fff';
    g.fillRect(x - 4, y - 4, w + 8, h + 8);
  });
  g.fillStyle = '#b8892f';
  g.fillRect(x, y, w, h);
  g.fillStyle = '#7a5418';
  g.fillRect(x + 4, y + 4, w - 8, h - 8);
  art(x + 7, y + 7, w - 14, h - 14);
}

function portrait(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, coat: string, seed: number) {
  const r = rng(seed);
  g.fillStyle = shade('#3a4a3a', (r() - 0.5) * 0.4);
  g.fillRect(x, y, w, h);
  g.fillStyle = coat;
  g.beginPath();
  g.ellipse(x + w / 2, y + h, w * 0.42, h * 0.42, 0, Math.PI, 0);
  g.fill();
  g.fillStyle = '#e8c8a8';
  g.beginPath();
  g.arc(x + w / 2, y + h * 0.45, w * 0.18, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = r() > 0.5 ? '#3a2412' : '#8a8a8a';
  g.beginPath();
  g.arc(x + w / 2, y + h * 0.4, w * 0.19, Math.PI, 0);
  g.fill();
}

function landscape(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const sky = g.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, '#8fb3c9');
  sky.addColorStop(1, '#e8d9b0');
  g.fillStyle = sky;
  g.fillRect(x, y, w, h);
  g.fillStyle = '#4a6a3a';
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x, y + h * 0.6);
  g.quadraticCurveTo(x + w * 0.3, y + h * 0.4, x + w * 0.6, y + h * 0.62);
  g.quadraticCurveTo(x + w * 0.8, y + h * 0.5, x + w, y + h * 0.6);
  g.lineTo(x + w, y + h);
  g.fill();
}

function windowSticker(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, curtain: string) {
  sticker(g, () => {
    g.fillStyle = '#fff';
    g.fillRect(x - 10, y - 4, w + 20, h + 8);
  });
  const night = g.createLinearGradient(0, y, 0, y + h);
  night.addColorStop(0, '#1b2a4a');
  night.addColorStop(1, '#3a4a6a');
  g.fillStyle = night;
  g.fillRect(x, y, w, h);
  g.fillStyle = '#f4eecd';
  g.beginPath();
  g.arc(x + w * 0.7, y + h * 0.25, w * 0.1, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#f2ead8';
  g.lineWidth = 4;
  g.strokeRect(x, y, w, h);
  g.beginPath();
  g.moveTo(x + w / 2, y);
  g.lineTo(x + w / 2, y + h);
  g.moveTo(x, y + h / 2);
  g.lineTo(x + w, y + h / 2);
  g.stroke();
  g.fillStyle = curtain;
  g.fillRect(x - 10, y - 4, 12, h + 8);
  g.fillRect(x + w - 2, y - 4, 12, h + 8);
}

function fireplace(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  sticker(g, () => {
    g.fillStyle = '#fff';
    g.fillRect(x - 4, y - 4, w + 8, h + 4);
  });
  g.fillStyle = '#d8cfc0';
  g.fillRect(x, y, w, h);
  g.fillStyle = '#b8ad9a';
  g.fillRect(x - 2, y, w + 4, 10);
  g.fillStyle = '#1a1210';
  g.fillRect(x + w * 0.2, y + h * 0.35, w * 0.6, h * 0.65);
  const fire = g.createRadialGradient(x + w / 2, y + h, 2, x + w / 2, y + h, h * 0.5);
  fire.addColorStop(0, '#ffd27a');
  fire.addColorStop(0.5, '#e8652a');
  fire.addColorStop(1, 'rgba(120,20,10,0)');
  g.fillStyle = fire;
  g.fillRect(x + w * 0.2, y + h * 0.45, w * 0.6, h * 0.55);
}

function clock(g: CanvasRenderingContext2D, cx: number, cy: number, rad: number) {
  sticker(g, () => {
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(cx, cy, rad + 4, 0, Math.PI * 2);
    g.fill();
  });
  g.fillStyle = '#b8892f';
  g.beginPath();
  g.arc(cx, cy, rad, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#f6efdc';
  g.beginPath();
  g.arc(cx, cy, rad * 0.8, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#222';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(cx, cy - rad * 0.6);
  g.moveTo(cx, cy);
  g.lineTo(cx + rad * 0.4, cy + rad * 0.1);
  g.stroke();
}

function pans(g: CanvasRenderingContext2D, x: number, y: number, w: number) {
  g.fillStyle = '#5a3a20';
  g.fillRect(x, y, w, 6);
  for (let i = 0; i < 4; i += 1) {
    const px = x + 14 + i * (w / 4);
    g.strokeStyle = '#444';
    g.beginPath();
    g.moveTo(px, y + 6);
    g.lineTo(px, y + 16);
    g.stroke();
    g.fillStyle = i % 2 ? '#b87333' : '#8a8f96';
    g.beginPath();
    g.arc(px, y + 28, 12, 0, Math.PI * 2);
    g.fill();
  }
}

const WALL_CACHE = new Map<string, THREE.Texture>();

/**
 * Wallpaper for one wall panel `len` tiles long, with the room's stickers on
 * it. `key` names the panel so each one prints the same each time.
 */
export function wallpaperTexture(room: RoomName, len: number, key: string, decorate: boolean) {
  const id = `${room}|${key}|${len}|${decorate}`;
  const hit = WALL_CACHE.get(id);
  if (hit) return hit;
  const px = 128;
  const W = Math.max(64, Math.round(len * px));
  const H = 192;
  const { c, g } = canvas(W, H);
  const p = WALLPAPER[room];
  const seed = hash(id);
  const r = rng(seed);
  g.fillStyle = p.base;
  g.fillRect(0, 0, W, H);
  switch (p.pattern) {
    case 'damask':
      damask(g, W, H, p.ink);
      break;
    case 'stripes':
      for (let x = 0; x < W; x += 24) {
        g.fillStyle = p.ink;
        g.globalAlpha = 0.45;
        g.fillRect(x, 0, 8, H);
        g.globalAlpha = 1;
      }
      break;
    case 'panel':
      for (let x = 10; x < W - 30; x += 70) {
        g.strokeStyle = p.ink;
        g.globalAlpha = 0.6;
        g.lineWidth = 2;
        g.strokeRect(x, 24, 56, H * 0.48);
        g.globalAlpha = 1;
      }
      break;
    case 'trellis':
      g.strokeStyle = p.ink;
      g.globalAlpha = 0.5;
      g.lineWidth = 2;
      for (let x = -H; x < W + H; x += 36) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + H, H);
        g.moveTo(x + H, 0);
        g.lineTo(x, H);
        g.stroke();
      }
      g.globalAlpha = 1;
      break;
    case 'tile':
      for (let y = 0; y < H * 0.62; y += 22) for (let x = 0; x < W; x += 22) {
        g.fillStyle = (x / 22 + y / 22) % 2 ? '#f6f2e8' : '#e8f0f6';
        g.fillRect(x + 1, y + 1, 20, 20);
      }
      g.fillStyle = p.ink;
      g.fillRect(0, H * 0.62, W, 6);
      break;
    case 'books':
      bookshelf(g, 0, 8, W, H - 8, seed);
      break;
    case 'glass': {
      // glasshouse panes with garden behind
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#a8d0e0');
      sky.addColorStop(1, '#d9eecf');
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#3f7a46';
      for (let x = 0; x < W; x += 18) {
        g.beginPath();
        g.ellipse(x + r() * 10, H * 0.75, 14 + r() * 10, 30 + r() * 20, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = '#f2f2ea';
      g.lineWidth = 5;
      for (let x = 0; x <= W; x += 42) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, H);
        g.stroke();
      }
      g.beginPath();
      g.moveTo(0, H * 0.35);
      g.lineTo(W, H * 0.35);
      g.stroke();
      break;
    }
  }
  if (p.dado) {
    g.fillStyle = p.dado;
    g.fillRect(0, H * 0.72, W, H * 0.28);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(0, H * 0.72, W, 3);
  }
  // skirting board and cornice
  g.fillStyle = '#2a1a0e';
  g.fillRect(0, H - 10, W, 10);
  g.fillStyle = 'rgba(255,245,220,0.5)';
  g.fillRect(0, 0, W, 5);

  if (decorate && W >= 110) {
    const kinds: Record<RoomName, string[]> = {
      Study: ['portrait', 'clock', 'landscape'],
      Hall: ['portrait', 'portrait', 'window'],
      Lounge: ['fireplace', 'portrait', 'window'],
      Library: [],
      'Billiard Room': ['landscape', 'window', 'portrait'],
      'Dining Room': ['portrait', 'window', 'landscape'],
      Conservatory: [],
      Ballroom: ['window', 'portrait', 'window'],
      Kitchen: ['pans', 'window', 'clock'],
    };
    const list = kinds[room];
    if (list.length > 0) {
      const slots = Math.max(1, Math.floor(W / 150));
      for (let i = 0; i < slots; i += 1) {
        const kind = list[Math.floor(r() * list.length)];
        const cx = (W / slots) * (i + 0.5);
        if (kind === 'portrait') frame(g, cx - 22, 34, 44, 56, (x, y, w, h) => portrait(g, x, y, w, h, SUSPECTS[Math.floor(r() * 6)].colour, seed + i));
        else if (kind === 'landscape') frame(g, cx - 38, 40, 76, 48, landscape.bind(null, g));
        else if (kind === 'window') windowSticker(g, cx - 26, 26, 52, 80, shade(p.base, -0.3));
        else if (kind === 'fireplace') fireplace(g, cx - 40, H - 10 - 70, 80, 70);
        else if (kind === 'clock') clock(g, cx, 60, 20);
        else if (kind === 'pans') pans(g, cx - 50, 30, 100);
      }
    }
  }
  grain(g, W, H, 0.05, seed);
  const t = tex(c);
  WALL_CACHE.set(id, t);
  return t;
}

let kraftTex: THREE.Texture | null = null;

/** Plain chipboard for the backs and cut edges of the pop-up walls. */
export function kraftTexture() {
  if (kraftTex) return kraftTex;
  const { c, g } = canvas(256, 256);
  g.fillStyle = '#b89a72';
  g.fillRect(0, 0, 256, 256);
  grain(g, 256, 256, 0.18, 11);
  kraftTex = tex(c, true);
  return kraftTex;
}

/* ------------------------------- standees -------------------------------- */

export type StandeeKind = 'palm' | 'fern' | 'armour' | 'lamp' | 'vase' | 'harp';

const STANDEE_CACHE = new Map<string, THREE.Texture>();

/** A die-cut sticker on a card stand: the art with a thick white border. */
export function standeeTexture(kind: StandeeKind) {
  const hit = STANDEE_CACHE.get(kind);
  if (hit) return hit;
  const { c, g } = canvas(256, 384);
  const art = canvas(256, 384);
  const a = art.g;
  const leaf = (x: number, y: number, len: number, ang: number, col: string) => {
    a.save();
    a.translate(x, y);
    a.rotate(ang);
    a.fillStyle = col;
    a.beginPath();
    a.ellipse(len / 2, 0, len / 2, len * 0.12, 0, 0, Math.PI * 2);
    a.fill();
    a.restore();
  };
  const pot = (col: string) => {
    a.fillStyle = col;
    a.beginPath();
    a.moveTo(78, 290);
    a.lineTo(178, 290);
    a.lineTo(162, 370);
    a.lineTo(94, 370);
    a.fill();
    a.fillStyle = shade(col, -0.25);
    a.fillRect(72, 282, 112, 16);
  };
  if (kind === 'palm') {
    a.fillStyle = '#6a4a2a';
    a.fillRect(122, 150, 12, 140);
    for (let i = 0; i < 9; i += 1) leaf(128, 150, 110, -Math.PI + (i / 8) * Math.PI, i % 2 ? '#3f8a4a' : '#2f6e3a');
    pot('#b5653a');
  } else if (kind === 'fern') {
    for (let i = 0; i < 14; i += 1) leaf(128, 280, 120 + (i % 3) * 20, -Math.PI * 0.95 + (i / 13) * Math.PI * 0.9, i % 2 ? '#4a9a4a' : '#357a3a');
    pot('#2f5a7a');
  } else if (kind === 'armour') {
    a.fillStyle = '#9aa3ad';
    a.fillRect(100, 60, 56, 60);
    a.beginPath();
    a.arc(128, 60, 30, Math.PI, 0);
    a.fill();
    a.fillStyle = '#1a1a1a';
    a.fillRect(108, 66, 40, 6);
    a.fillStyle = '#b8c0c8';
    a.fillRect(92, 120, 72, 110);
    a.fillStyle = '#8a929a';
    a.fillRect(98, 230, 24, 120);
    a.fillRect(134, 230, 24, 120);
    a.fillRect(70, 124, 20, 100);
    a.fillRect(166, 124, 20, 100);
    a.fillStyle = '#7a1f24';
    a.fillRect(186, 40, 6, 320);
    a.fillStyle = '#c0c0c0';
    a.beginPath();
    a.moveTo(189, 20);
    a.lineTo(200, 50);
    a.lineTo(178, 50);
    a.fill();
    a.fillStyle = '#5a3a20';
    a.fillRect(80, 350, 96, 20);
  } else if (kind === 'lamp') {
    a.fillStyle = '#b8892f';
    a.fillRect(124, 140, 8, 210);
    a.fillRect(96, 350, 64, 14);
    a.fillStyle = '#e8c977';
    a.beginPath();
    a.moveTo(84, 150);
    a.lineTo(172, 150);
    a.lineTo(150, 70);
    a.lineTo(106, 70);
    a.fill();
    a.fillStyle = 'rgba(255,240,180,0.6)';
    a.beginPath();
    a.arc(128, 155, 22, 0, Math.PI);
    a.fill();
  } else if (kind === 'vase') {
    a.fillStyle = '#2f4f8a';
    a.beginPath();
    a.ellipse(128, 300, 50, 66, 0, 0, Math.PI * 2);
    a.fill();
    a.fillRect(110, 200, 36, 60);
    a.fillStyle = '#f2ead8';
    a.fillRect(96, 290, 64, 8);
    for (let i = 0; i < 7; i += 1) {
      const x = 80 + i * 16;
      a.strokeStyle = '#2f6e3a';
      a.lineWidth = 3;
      a.beginPath();
      a.moveTo(128, 210);
      a.lineTo(x, 100 + (i % 2) * 30);
      a.stroke();
      a.fillStyle = ['#d7263d', '#f2c14e', '#f4f1e8'][i % 3];
      a.beginPath();
      a.arc(x, 100 + (i % 2) * 30, 14, 0, Math.PI * 2);
      a.fill();
    }
  } else if (kind === 'harp') {
    a.strokeStyle = '#c9a227';
    a.lineWidth = 12;
    a.beginPath();
    a.moveTo(90, 360);
    a.lineTo(90, 60);
    a.quadraticCurveTo(180, 60, 190, 160);
    a.lineTo(110, 360);
    a.stroke();
    a.strokeStyle = '#f2ead8';
    a.lineWidth = 2;
    for (let i = 0; i < 10; i += 1) {
      a.beginPath();
      a.moveTo(96, 90 + i * 26);
      a.lineTo(110 + (10 - i) * 7, 100 + i * 26);
      a.stroke();
    }
  }
  // white die-cut border: the art, fattened and filled white, under the art
  g.save();
  for (let dx = -8; dx <= 8; dx += 4) for (let dy = -8; dy <= 8; dy += 4) {
    if (dx * dx + dy * dy > 72) continue;
    g.drawImage(art.c, dx, dy);
  }
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 256, 384);
  g.restore();
  g.drawImage(art.c, 0, 0);
  const t = tex(c);
  STANDEE_CACHE.set(kind, t);
  return t;
}

/* --------------------------------- cards ---------------------------------- */

export const CLUE_CARD = { w: 0.036, h: 0.054 };

/** Logical card, before the 1.5× canvas scale. The name plaque starts at y 268. */
const CARD_PX = { w: 240, h: 360 };
const WINDOW_PX = { x: 36, y: 34, w: 168, h: 216 };
/** Pixel row where the name plaque starts, measured from the top of the logical card. */
export const CLUE_PLAQUE_TOP = 268;

function cardLocalY(pixelFromTop: number) {
  return ((CARD_PX.h / 2 - pixelFromTop) / CARD_PX.h) * CLUE_CARD.h;
}

/**
 * The picture window inside the classic frame. A spinning figure stands here;
 * the painted card keeps the border, the cream mat, and the name plaque.
 * +y is toward the top of the card, +z comes out of the face.
 */
export const CLUE_PORTRAIT = {
  y: cardLocalY(WINDOW_PX.y + WINDOW_PX.h / 2),
  z: 0.0045,
  w: (WINDOW_PX.w / CARD_PX.w) * CLUE_CARD.w,
  h: (WINDOW_PX.h / CARD_PX.h) * CLUE_CARD.h,
};

const CARD_CACHE = new Map<string, THREE.Texture>();

/**
 * A Clue card in the classic deck layout: a coloured border, a picture window,
 * the name in black on a cream plaque. Suspects and weapons leave that window
 * empty so a spinning figure can stand in it. Rooms still show their floor.
 * Null is the back. The canvas is 1.5× so the plaque stays sharp when held up.
 */
export function clueCardTexture(card: Card | null) {
  const id = card ? `${card.kind}:${card.value}` : 'back';
  const hit = CARD_CACHE.get(id);
  if (hit) return hit;
  const { c, g } = canvas(360, 540);
  g.scale(1.5, 1.5);
  if (!card) {
    g.fillStyle = '#14532d';
    g.fillRect(0, 0, 240, 360);
    g.strokeStyle = '#e8d9a0';
    g.lineWidth = 4;
    for (let y = 18; y < 342; y += 22) {
      for (let x = 18; x < 222; x += 22) {
        g.beginPath();
        g.moveTo(x + 8, y);
        g.lineTo(x + 16, y + 8);
        g.lineTo(x + 8, y + 16);
        g.lineTo(x, y + 8);
        g.closePath();
        g.stroke();
      }
    }
    g.lineWidth = 6;
    g.strokeRect(14, 14, 212, 332);
    g.fillStyle = '#e8d9a0';
    g.font = '900 64px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('?', 120, 168);
    g.font = '700 28px Georgia, serif';
    g.fillText('CLUE', 120, 250);
  } else {
    const border = card.kind === 'suspect' ? SUSPECTS.find(s => s.id === card.value)!.colour : card.kind === 'weapon' ? '#3e4654' : '#1d4e32';
    const inkOnBorder = card.kind === 'suspect' && card.value === 'White' ? '#1a140c' : '#fffaf1';
    g.fillStyle = border;
    g.fillRect(0, 0, 240, 360);
    g.fillStyle = '#f7f1e4';
    g.fillRect(14, 14, 212, 332);
    g.strokeStyle = '#c6a15a';
    g.lineWidth = 2;
    g.strokeRect(20, 20, 200, 320);
    g.fillStyle = inkOnBorder;
    g.font = '700 13px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // The category sits in the coloured margin, above the cream.
    g.save();
    g.beginPath();
    g.rect(0, 0, 240, 16);
    g.clip();
    g.fillStyle = border;
    g.fillRect(0, 0, 240, 16);
    g.fillStyle = inkOnBorder;
    g.fillText(card.kind.toUpperCase(), 120, 8);
    g.restore();
    g.fillStyle = '#efe6d2';
    g.fillRect(32, 28, 176, 228);
    if (card.kind === 'room') {
      const floor = floorTexture(card.value, 3, 3).image as HTMLCanvasElement;
      g.drawImage(floor, 36, 32, 168, 220);
    } else {
      // Empty stage. The real portrait is a mesh in front of this window.
      g.fillStyle = '#f4ecda';
      g.fillRect(WINDOW_PX.x, WINDOW_PX.y, WINDOW_PX.w, WINDOW_PX.h);
      const vig = g.createRadialGradient(120, 148, 18, 120, 148, 108);
      vig.addColorStop(0, 'rgba(255,252,245,0)');
      vig.addColorStop(1, 'rgba(92, 64, 32, 0.22)');
      g.fillStyle = vig;
      g.fillRect(WINDOW_PX.x, WINDOW_PX.y, WINDOW_PX.w, WINDOW_PX.h);
      g.strokeStyle = '#c6a15a';
      g.lineWidth = 1.5;
      g.strokeRect(WINDOW_PX.x, WINDOW_PX.y, WINDOW_PX.w, WINDOW_PX.h);
    }
    const name = card.kind === 'suspect' ? SUSPECTS.find(x => x.id === card.value)!.full : card.value;
    g.fillStyle = '#fffaf1';
    g.fillRect(28, 268, 184, 64);
    g.strokeStyle = border;
    g.lineWidth = 3;
    g.strokeRect(28, 268, 184, 64);
    g.fillStyle = '#1a140c';
    g.font = `700 ${name.length > 14 ? 16 : 20}px Georgia, serif`;
    g.fillText(name, 120, 300);
  }
  g.strokeStyle = 'rgba(0,0,0,0.4)';
  g.lineWidth = 4;
  g.strokeRect(2, 2, 236, 356);
  const t = tex(c);
  CARD_CACHE.set(id, t);
  return t;
}
