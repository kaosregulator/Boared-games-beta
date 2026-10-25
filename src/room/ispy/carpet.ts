import * as THREE from 'three';
import { CARPET, rng, type Theme } from './puzzle';

/**
 * The carpet turning into the page's scenery: an alphabet play mat, Cake
 * Jam gingham, a treasure beach, a chalkboard, a spooky night, a patchwork
 * quilt or a starry sky. Drawn on a canvas from the page's seed, so the same
 * theme looks a little different every time.
 */

const PX_PER_M = 300;

function draw(theme: Theme['carpet'], seed: number, g: CanvasRenderingContext2D, w: number, h: number) {
  const r = rng(seed ^ 0x5eed);
  const ri = (a: number, b: number) => a + r() * (b - a);
  const pick = <T,>(l: T[]) => l[Math.floor(r() * l.length) % l.length];
  const m = PX_PER_M;
  switch (theme) {
    case 'alphabet': {
      // Foam play-mat tiles with letters, puzzle edges between them.
      const tile = 0.42 * m;
      const colors = ['#e94b3c', '#f5a623', '#f8e71c', '#5cb85c', '#3b8fe0', '#9b59b6', '#ff7eb6'];
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let n = Math.floor(r() * 26);
      for (let y = 0; y < h; y += tile) {
        for (let x = 0; x < w; x += tile) {
          g.fillStyle = pick(colors);
          g.fillRect(x, y, tile, tile);
          g.fillStyle = 'rgba(255,255,255,0.75)';
          g.font = `900 ${Math.round(tile * 0.62)}px "Arial Black", Arial, sans-serif`;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText(letters[n++ % 26], x + tile / 2, y + tile * 0.54);
          g.strokeStyle = 'rgba(0,0,0,0.18)';
          g.lineWidth = 3;
          g.strokeRect(x, y, tile, tile);
        }
      }
      break;
    }
    case 'gingham': {
      g.fillStyle = '#fff4f0';
      g.fillRect(0, 0, w, h);
      const s = 0.12 * m;
      g.fillStyle = 'rgba(242,126,181,0.35)';
      for (let x = 0; x < w; x += s * 2) g.fillRect(x, 0, s, h);
      for (let y = 0; y < h; y += s * 2) g.fillRect(0, y, w, s);
      // Sprinkles.
      const sprinkle = ['#ff5c8a', '#ffd23f', '#3bceac', '#5e60ce', '#ffffff', '#ff8c42'];
      for (let i = 0; i < 2600; i++) {
        g.save();
        g.translate(ri(0, w), ri(0, h));
        g.rotate(ri(0, Math.PI));
        g.fillStyle = pick(sprinkle);
        g.fillRect(-7, -2, 14, 4);
        g.restore();
      }
      break;
    }
    case 'beach': {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#f1d9a0');
      grad.addColorStop(1, '#e6c27d');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {
        g.fillStyle = `rgba(${pick(['120,90,40', '255,255,240', '160,120,60'])},${ri(0.08, 0.3)})`;
        g.fillRect(ri(0, w), ri(0, h), 2, 2);
      }
      // A strip of sea along the north edge.
      g.fillStyle = '#4fb3c9';
      g.beginPath();
      g.moveTo(0, 0);
      for (let x = 0; x <= w; x += 20) g.lineTo(x, 0.22 * m + Math.sin(x / 60 + seed) * 14);
      g.lineTo(w, 0);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      g.lineWidth = 6;
      g.beginPath();
      for (let x = 0; x <= w; x += 20) g.lineTo(x, 0.22 * m + Math.sin(x / 60 + seed) * 14);
      g.stroke();
      // The treasure map path, dotted, to a big red X.
      g.setLineDash([18, 16]);
      g.strokeStyle = '#8b3a1a';
      g.lineWidth = 7;
      g.beginPath();
      let px = w * 0.5;
      let py = h * 0.95;
      g.moveTo(px, py);
      for (let i = 0; i < 6; i++) {
        px = Math.min(w * 0.9, Math.max(w * 0.1, px + ri(-0.6, 0.6) * m));
        py -= h * 0.12;
        g.lineTo(px, py);
      }
      g.stroke();
      g.setLineDash([]);
      g.strokeStyle = '#c0201a';
      g.lineWidth = 16;
      g.beginPath();
      g.moveTo(px - 40, py - 40);
      g.lineTo(px + 40, py + 40);
      g.moveTo(px + 40, py - 40);
      g.lineTo(px - 40, py + 40);
      g.stroke();
      // Rope border.
      g.strokeStyle = '#b08850';
      g.lineWidth = 14;
      g.strokeRect(10, 10, w - 20, h - 20);
      break;
    }
    case 'chalkboard': {
      g.fillStyle = '#2f4f3a';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(255,255,255,${ri(0.02, 0.06)})`;
        g.beginPath();
        g.ellipse(ri(0, w), ri(0, h), ri(60, 200), ri(20, 60), ri(0, 3), 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.textAlign = 'center';
      const doodles = ['ABC', '1 + 1 = 2', '2 x 3 = 6', 'A+', 'I SPY', '★', 'BOOK FAIR FRI', 'RECESS!', 'a b c', '10 - 4 = 6', 'NO GUM', ':)', 'SPELLING TEST'];
      for (let i = 0; i < 70; i++) {
        g.save();
        g.translate(ri(0, w), ri(0, h));
        g.rotate(ri(-0.4, 0.4));
        g.font = `700 ${Math.round(ri(30, 70))}px "Comic Sans MS", "Chalkboard SE", cursive`;
        g.fillText(pick(doodles), 0, 0);
        g.restore();
      }
      // Ruled lines, like a giant sheet of handwriting paper.
      g.strokeStyle = 'rgba(255,255,255,0.12)';
      g.lineWidth = 3;
      for (let y = 60; y < h; y += 90) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
      }
      break;
    }
    case 'spooky': {
      const grad = g.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h) * 0.7);
      grad.addColorStop(0, '#3b2a5c');
      grad.addColorStop(1, '#120d1f');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      // Fallen leaves.
      for (let i = 0; i < 700; i++) {
        g.save();
        g.translate(ri(0, w), ri(0, h));
        g.rotate(ri(0, Math.PI * 2));
        g.fillStyle = pick(['#a0451f', '#c96a1b', '#6b3a1f', '#8a2b2b', '#4a3a2a']);
        g.beginPath();
        g.ellipse(0, 0, ri(10, 22), ri(5, 10), 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
      // A spider web in each corner.
      g.strokeStyle = 'rgba(220,220,255,0.35)';
      g.lineWidth = 2;
      for (const [cx, cy] of [[0, 0], [w, 0], [0, h], [w, h]]) {
        for (let a = 0; a < 7; a++) {
          const ang = (a / 6) * (Math.PI / 2);
          g.beginPath();
          g.moveTo(cx, cy);
          g.lineTo(cx + Math.cos(ang) * 260 * (cx ? -1 : 1), cy + Math.sin(ang) * 260 * (cy ? -1 : 1));
          g.stroke();
        }
        for (let ring = 50; ring < 260; ring += 50) {
          g.beginPath();
          g.arc(cx, cy, ring, 0, Math.PI * 2);
          g.stroke();
        }
      }
      break;
    }
    case 'patchwork': {
      const s = 0.3 * m;
      const fabrics = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad', '#e84393', '#16a085', '#d35400', '#7f8c8d'];
      for (let y = 0; y < h; y += s) {
        for (let x = 0; x < w; x += s) {
          const base = pick(fabrics);
          g.fillStyle = base;
          g.fillRect(x, y, s, s);
          const kind = Math.floor(r() * 4);
          g.fillStyle = 'rgba(255,255,255,0.35)';
          if (kind === 0) for (let i = 0; i < 16; i++) g.beginPath(), g.arc(x + ri(0, s), y + ri(0, s), ri(4, 9), 0, Math.PI * 2), g.fill();
          if (kind === 1) for (let i = 0; i < s; i += 16) g.fillRect(x + i, y, 7, s);
          if (kind === 2) for (let i = 0; i < s; i += 20) for (let j = 0; j < s; j += 20) if (((i + j) / 20) % 2 === 0) g.fillRect(x + i, y + j, 20, 20);
          if (kind === 3) {
            g.strokeStyle = 'rgba(255,255,255,0.4)';
            g.lineWidth = 4;
            for (let i = -s; i < s; i += 18) g.beginPath(), g.moveTo(x + i, y), g.lineTo(x + i + s, y + s), g.stroke();
          }
          // Stitching.
          g.setLineDash([10, 8]);
          g.strokeStyle = 'rgba(255,250,220,0.8)';
          g.lineWidth = 3;
          g.strokeRect(x + 6, y + 6, s - 12, s - 12);
          g.setLineDash([]);
        }
      }
      break;
    }
    case 'starry': {
      const grad = g.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0d1033');
      grad.addColorStop(0.5, '#1e1452');
      grad.addColorStop(1, '#0a0a24');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 6; i++) {
        const nx = ri(0, w);
        const ny = ri(0, h);
        const neb = g.createRadialGradient(nx, ny, 10, nx, ny, ri(150, 320));
        neb.addColorStop(0, `rgba(${pick(['180,120,255', '120,180,255', '255,140,200'])},0.35)`);
        neb.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = neb;
        g.fillRect(0, 0, w, h);
      }
      for (let i = 0; i < 1600; i++) {
        g.fillStyle = `rgba(255,255,${Math.round(ri(200, 255))},${ri(0.3, 1)})`;
        const s = ri(1, 3.5);
        g.fillRect(ri(0, w), ri(0, h), s, s);
      }
      break;
    }
  }
  // Carpet pile: a fine grain over everything so it reads as rug, not paper.
  for (let i = 0; i < 26000; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
    g.fillRect(ri(0, w), ri(0, h), 2, 2);
  }
}

export function carpetTexture(theme: Theme['carpet'], seed: number) {
  const w = Math.round(CARPET.w * PX_PER_M);
  const h = Math.round(CARPET.d * PX_PER_M);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(theme, seed, canvas.getContext('2d')!, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
