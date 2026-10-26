/**
 * Procedural art for the wallpapers and the splash screen, drawn once into a
 * canvas and cached as a data URL.
 */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function valueNoise(w: number, h: number, cell: number, rand: () => number) {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const grid = new Float32Array(gw * gh);
  for (let i = 0; i < grid.length; i += 1) grid[i] = rand();
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const gy = y / cell;
    const y0 = Math.floor(gy);
    const fy = gy - y0;
    const sy = fy * fy * (3 - 2 * fy);
    for (let x = 0; x < w; x += 1) {
      const gx = x / cell;
      const x0 = Math.floor(gx);
      const fx = gx - x0;
      const sx = fx * fx * (3 - 2 * fx);
      const a = grid[y0 * gw + x0];
      const b = grid[y0 * gw + x0 + 1];
      const c = grid[(y0 + 1) * gw + x0];
      const d = grid[(y0 + 1) * gw + x0 + 1];
      out[y * w + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
  }
  return out;
}

const cache = new Map<string, string>();

/** Blue sky with soft white clouds, brighter toward the horizon. */
export function clouds(w = 400, h = 300, seed = 98, { deep = '#2f6fd0', light = '#9cc8f5' } = {}): string {
  const key = `clouds:${w}:${h}:${seed}:${deep}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const rand = rng(seed);
  const layers = [valueNoise(w, h, 64, rand), valueNoise(w, h, 32, rand), valueNoise(w, h, 16, rand), valueNoise(w, h, 8, rand)];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  const img = g.createImageData(w, h);
  const hex = (c: string) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const top = hex(deep);
  const bot = hex(light);
  for (let y = 0; y < h; y += 1) {
    const t = y / h;
    const sky = top.map((v, i) => v + (bot[i] - v) * t);
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x;
      // squash vertically so the clouds read as banks, not blobs
      const n = layers[0][i] * 0.5 + layers[1][i] * 0.25 + layers[2][i] * 0.15 + layers[3][i] * 0.1;
      const c = Math.max(0, Math.min(1, (n - 0.48) * 3.2)) * (0.75 + t * 0.35);
      const shade = 0.85 + layers[2][i] * 0.15;
      img.data[i * 4] = sky[0] + (255 * shade - sky[0]) * c;
      img.data[i * 4 + 1] = sky[1] + (255 * shade - sky[1]) * c;
      img.data[i * 4 + 2] = sky[2] + (255 * shade - sky[2]) * c;
      img.data[i * 4 + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}

/** A small tile pattern, repeated by CSS. */
export function tile(kind: 'tiles' | 'bubbles' | 'carved'): string {
  const key = `tile:${kind}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d')!;
  if (kind === 'tiles') {
    canvas.width = canvas.height = 64;
    g.fillStyle = '#7a1f1f';
    g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 4; i += 1) {
      const x = (i % 2) * 32;
      const y = Math.floor(i / 2) * 32;
      const grad = g.createLinearGradient(x, y, x + 32, y + 32);
      grad.addColorStop(0, i % 3 === 0 ? '#c46a3a' : '#a4462a');
      grad.addColorStop(1, '#5a1414');
      g.fillStyle = grad;
      g.fillRect(x + 1, y + 1, 30, 30);
      g.fillStyle = 'rgba(255,220,180,.35)';
      g.fillRect(x + 1, y + 1, 30, 1);
      g.fillRect(x + 1, y + 1, 1, 30);
    }
  } else if (kind === 'bubbles') {
    canvas.width = canvas.height = 96;
    g.fillStyle = '#003c5a';
    g.fillRect(0, 0, 96, 96);
    const r = rng(7);
    for (let i = 0; i < 14; i += 1) {
      const x = r() * 96;
      const y = r() * 96;
      const s = 4 + r() * 12;
      const grad = g.createRadialGradient(x - s / 3, y - s / 3, 1, x, y, s);
      grad.addColorStop(0, 'rgba(255,255,255,.9)');
      grad.addColorStop(0.4, 'rgba(120,200,255,.35)');
      grad.addColorStop(1, 'rgba(120,200,255,.05)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, s, 0, Math.PI * 2);
      g.fill();
    }
  } else {
    canvas.width = canvas.height = 40;
    g.fillStyle = '#6a4a2a';
    g.fillRect(0, 0, 40, 40);
    g.strokeStyle = '#8a6a46';
    g.lineWidth = 2;
    g.strokeRect(4, 4, 32, 32);
    g.strokeStyle = '#3a2814';
    g.strokeRect(6, 6, 32, 32);
    g.fillStyle = '#7a5a36';
    g.beginPath();
    g.arc(20, 20, 7, 0, Math.PI * 2);
    g.fill();
  }
  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}

/** Orange-to-purple dusk with a low sun, for the "Sunset" wallpaper. */
export function sunset(w = 400, h = 300): string {
  const key = `sunset:${w}:${h}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#20104a');
  sky.addColorStop(0.45, '#c2367a');
  sky.addColorStop(0.7, '#ff9a3c');
  sky.addColorStop(1, '#2a0f30');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffd36a';
  g.beginPath();
  g.arc(w * 0.62, h * 0.7, h * 0.12, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1a0820';
  for (let i = 0; i < 8; i += 1) g.fillRect(0, h * 0.7 + i * 5 + i * i, w, 2 + i);
  g.fillRect(0, h * 0.86, w, h);
  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}
