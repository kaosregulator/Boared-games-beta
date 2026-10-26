import * as THREE from 'three';
import type { DuckKind } from './range';

/**
 * Art for the pop-up duck range, all drawn here (nothing downloaded): chunky
 * pixel ducks in three colours, tall cartoon grass, and a sky board with
 * clouds. It follows the look of the Unity Duck Hunt clone, which ships
 * without a licence, so none of its images are used.
 */

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  // willReadFrequently keeps the canvas on the CPU. pixelate() reads it back,
  // and reading back a GPU canvas waits for everything the GPU has queued:
  // landing in the town, that was every shader being built, a long freeze.
  return { c, g: c.getContext('2d', { willReadFrequently: true })! };
}

function texture(c: HTMLCanvasElement, pixel = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (pixel) {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
  } else {
    t.anisotropy = 4;
  }
  return t;
}

// ---------------------------------------------------------------------------
// Ducks: a sheet of five frames (three wingbeats, the "got me" face, falling).

export const DUCK_FRAMES = 5;
const FW = 40;
const FH = 32;

const PALETTE: Record<DuckKind, { body: string; back: string; head: string; wing: string; belly: string }> = {
  mallard: { body: '#2b2b2b', back: '#4a4a4a', head: '#1c7a2a', wing: '#6a6a6a', belly: '#d8cdb4' },
  blue: { body: '#2c4f9e', back: '#4d74c9', head: '#1f3170', wing: '#8fb0f0', belly: '#e9e4d0' },
  red: { body: '#8c2f1e', back: '#b2482c', head: '#4c1a10', wing: '#e08a5a', belly: '#f0dcb8' },
};

function duckFrame(g: CanvasRenderingContext2D, ox: number, frame: number, kind: DuckKind) {
  const p = PALETTE[kind];
  g.save();
  g.translate(ox, 0);
  const ell = (x: number, y: number, rx: number, ry: number, rot: number, color: string) => {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    g.fill();
  };
  if (frame === 3) {
    // Shot: facing you, eyes wide, wings out.
    ell(20, 19, 9, 8, 0, p.body);
    ell(20, 21, 6, 5, 0, p.belly);
    ell(8, 16, 7, 3, -0.6, p.wing);
    ell(32, 16, 7, 3, 0.6, p.wing);
    ell(20, 9, 6, 6, 0, p.head);
    g.fillStyle = '#fff';
    g.fillRect(16, 7, 3, 3);
    g.fillRect(21, 7, 3, 3);
    g.fillStyle = '#000';
    g.fillRect(17, 8, 1, 1);
    g.fillRect(22, 8, 1, 1);
    g.fillStyle = '#f28a3a';
    g.fillRect(18, 11, 4, 3);
    g.restore();
    return;
  }
  if (frame === 4) {
    // Falling: upside down, feet up.
    g.translate(20, 16);
    g.rotate(Math.PI);
    g.translate(-20, -16);
  }
  // Tail, body, belly.
  g.fillStyle = p.back;
  g.beginPath();
  g.moveTo(5, 15);
  g.lineTo(12, 13);
  g.lineTo(12, 19);
  g.closePath();
  g.fill();
  ell(19, 18, 10, 6, -0.12, p.body);
  ell(20, 21, 7, 3, -0.12, p.belly);
  // Wing: up, level, down.
  const wingRot = [-1.1, -0.15, 0.75][frame === 4 ? 1 : frame];
  ell(17, 15 + (frame === 2 ? 3 : 0), 9, 3.2, wingRot, p.wing);
  // Neck ring, head, beak, eye.
  ell(28, 13, 3.4, 3, 0, '#f2f2f2');
  ell(30, 9, 5, 4.6, 0, p.head);
  g.fillStyle = '#f28a3a';
  g.beginPath();
  g.moveTo(34, 8);
  g.lineTo(39, 10);
  g.lineTo(34, 11.5);
  g.closePath();
  g.fill();
  g.fillStyle = '#fff';
  g.fillRect(30, 6, 3, 3);
  g.fillStyle = '#000';
  g.fillRect(31, 7, 2, 2);
  // Feet tucked under.
  g.fillStyle = '#f28a3a';
  g.fillRect(14, 24, 3, 2);
  g.fillRect(19, 24, 3, 2);
  g.restore();
}

/** Hard pixel edges plus a dark outline, like an 8-bit sprite. */
function pixelate(g: CanvasRenderingContext2D, w: number, h: number) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    solid[i] = d[i * 4 + 3] > 110 ? 1 : 0;
    d[i * 4 + 3] = solid[i] ? 255 : 0;
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (solid[i]) continue;
      const near =
        (x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w]);
      if (near && x % FW !== 0) {
        d[i * 4] = 12;
        d[i * 4 + 1] = 12;
        d[i * 4 + 2] = 12;
        d[i * 4 + 3] = 255;
      }
    }
  }
  g.putImageData(img, 0, 0);
}

const duckSheets = new Map<DuckKind, THREE.CanvasTexture>();

export function duckSheet(kind: DuckKind) {
  let t = duckSheets.get(kind);
  if (t) return t;
  const { c, g } = canvas(FW * DUCK_FRAMES, FH);
  for (let f = 0; f < DUCK_FRAMES; f++) duckFrame(g, f * FW, f, kind);
  pixelate(g, c.width, c.height);
  t = texture(c, true);
  t.repeat.set(1 / DUCK_FRAMES, 1);
  duckSheets.set(kind, t);
  return t;
}

export const DUCK_ASPECT = FW / FH;

// ---------------------------------------------------------------------------
// Grass rows and the sky board.

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A strip of tall pointy grass. `dirt` adds the brown band along the bottom. */
export function grassTexture(seed: number, dirt: boolean) {
  const W = 1024;
  const H = 192;
  const { c, g } = canvas(W, H);
  const r = seeded(seed);
  const base = dirt ? H - 34 : H;
  const greens = ['#3f9e2a', '#57bd34', '#6fd641', '#86e24f', '#4daa2e'];
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < 260; i++) {
      const x = r() * W;
      const h = (0.45 + r() * 0.55) * (base - 6) * (0.75 + layer * 0.12);
      const lean = (r() - 0.5) * 40;
      const w = 5 + r() * 7;
      g.fillStyle = greens[Math.floor(r() * greens.length)];
      g.beginPath();
      g.moveTo(x - w, base);
      g.quadraticCurveTo(x - w * 0.3 + lean * 0.3, base - h * 0.55, x + lean, base - h);
      g.quadraticCurveTo(x + w * 0.3 + lean * 0.3, base - h * 0.55, x + w, base);
      g.closePath();
      g.fill();
    }
  }
  if (dirt) {
    g.fillStyle = '#7a4a20';
    g.fillRect(0, base - 2, W, H - base + 2);
    g.fillStyle = '#5c3414';
    g.fillRect(0, base - 2, W, 5);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = r() < 0.5 ? '#8f5a2a' : '#6a3d18';
      g.fillRect(r() * W, base + 6 + r() * 24, 6 + r() * 14, 3);
    }
  }
  const t = texture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function skyTexture() {
  const W = 512;
  const H = 448;
  const { c, g } = canvas(W, H);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#3f9fff');
  grad.addColorStop(1, '#8fd0ff');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const r = seeded(7);
  for (let i = 0; i < 5; i++) {
    const cx = 40 + r() * (W - 80);
    const cy = 40 + r() * (H * 0.45);
    g.fillStyle = 'rgba(255,255,255,0.92)';
    for (let k = 0; k < 5; k++) {
      g.beginPath();
      g.arc(cx + (k - 2) * 16, cy + Math.sin(k * 1.7) * 6, 14 + r() * 10, 0, Math.PI * 2);
      g.fill();
    }
  }
  // Cardboard edge, like the board was cut out of a cereal box.
  g.strokeStyle = '#c9a46a';
  g.lineWidth = 10;
  g.strokeRect(5, 5, W - 10, H - 10);
  return texture(c);
}

/** The white star of a muzzle flash. */
export function flashTexture() {
  const { c, g } = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,230,1)');
  grad.addColorStop(0.25, 'rgba(255,210,90,0.9)');
  grad.addColorStop(1, 'rgba(255,120,0,0)');
  g.fillStyle = grad;
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rr = i % 2 ? 26 : 64;
    g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
  return texture(c);
}
