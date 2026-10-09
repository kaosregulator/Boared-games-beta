import * as THREE from 'three';
import { PALETTE } from './videoRoom';

const cache = new Map<string, THREE.Texture>();

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

function finish(c: HTMLCanvasElement, repeat: [number, number] = [1, 1]) {
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 8;
  return tex;
}

function memo(key: string, make: () => THREE.Texture) {
  const hit = cache.get(key);
  if (hit) return hit;
  const tex = make();
  cache.set(key, tex);
  return tex;
}

function grain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, alpha: number) {
  for (let i = 0; i < amount; i += 1) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * alpha})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1);
  }
}

/** Dark reddish-brown plank floor matching the clip's bedroom boards. */
export function floorTexture() {
  return memo('floor', () => {
    const { c, ctx } = canvas(512, 512);
    ctx.fillStyle = PALETTE.floorDark;
    ctx.fillRect(0, 0, 512, 512);
    const plank = 512 / 6;
    for (let i = 0; i < 6; i += 1) {
      const shade = 0.78 + Math.random() * 0.4;
      const r = Math.round(0x3c * shade);
      const g = Math.round(0x27 * shade);
      const b = Math.round(0x21 * shade);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, i * plank, 512, plank - 2);
      // grain streaks along the plank
      for (let s = 0; s < 26; s += 1) {
        ctx.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.12})`;
        ctx.lineWidth = 0.6 + Math.random();
        ctx.beginPath();
        const y = i * plank + Math.random() * plank;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(170, y + (Math.random() - 0.5) * 5, 340, y + (Math.random() - 0.5) * 5, 512, y);
        ctx.stroke();
      }
      // board seams
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, i * plank + plank - 2, 512, 2);
      const seam = Math.floor(Math.random() * 3) * 170 + 60;
      ctx.fillRect(seam, i * plank, 2, plank);
    }
    grain(ctx, 512, 512, 2600, 0.1);
    return finish(c, [5, 5]);
  });
}

/** Dusty mauve plaster for the bedroom walls. */
export function wallTexture() {
  return memo('wall', () => {
    const { c, ctx } = canvas(512, 512);
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, PALETTE.wallWarm);
    grad.addColorStop(1, PALETTE.wall);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 260; i += 1) {
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '235,210,240' : '18,8,22'},${0.008 + Math.random() * 0.016})`;
      const r = 4 + Math.random() * 22;
      ctx.beginPath();
      ctx.arc(Math.random() * 512, Math.random() * 512, r, 0, Math.PI * 2);
      ctx.fill();
    }
    grain(ctx, 512, 512, 4200, 0.04);
    return finish(c, [4, 2]);
  });
}

/** Warm stained ceiling boards with the clip's dark beams. */
export function ceilingTexture() {
  return memo('ceiling', () => {
    const { c, ctx } = canvas(512, 512);
    ctx.fillStyle = PALETTE.ceiling;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 10; i += 1) {
      ctx.fillStyle = `rgba(0,0,0,${0.1 + Math.random() * 0.1})`;
      ctx.fillRect(0, i * 51, 512, 3);
    }
    grain(ctx, 512, 512, 1500, 0.07);
    return finish(c, [3, 3]);
  });
}

/** Oval rug with the concentric purple swirls from the floor of the clip. */
export function rugTexture() {
  return memo('rug', () => {
    const { c, ctx } = canvas(512, 512);
    ctx.clearRect(0, 0, 512, 512);
    const rings = ['#2b1a38', '#452a51', '#2e1c3a', '#4e3059', '#271634', '#553765', '#20122b'];
    rings.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(256, 256, 250 - i * 34, 0, Math.PI * 2);
      ctx.fill();
    });
    // worn fibre noise
    for (let i = 0; i < 9000; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 250;
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,220,255' : '0,0,0'},${Math.random() * 0.12})`;
      ctx.fillRect(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 1.5, 1.5);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  });
}

/** Night city seen through the blinds. */
export function nightSkyTexture() {
  return memo('nightsky', () => {
    const { c, ctx } = canvas(256, 256);
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1b1742');
    grad.addColorStop(0.55, '#3b2a60');
    grad.addColorStop(1, '#6b3f63');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 90; i += 1) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.7})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 120, 1, 1);
    }
    // treeline + distant windows
    ctx.fillStyle = '#140f26';
    for (let x = 0; x < 256; x += 10) {
      const h = 40 + Math.random() * 50;
      ctx.beginPath();
      ctx.moveTo(x - 6, 256);
      ctx.lineTo(x + 5, 256 - h);
      ctx.lineTo(x + 16, 256);
      ctx.fill();
    }
    for (let i = 0; i < 24; i += 1) {
      ctx.fillStyle = `rgba(255,200,120,${0.3 + Math.random() * 0.5})`;
      ctx.fillRect(Math.random() * 256, 180 + Math.random() * 50, 2, 3);
    }
    return finish(c);
  });
}

/** Horizontal venetian blinds. */
export function blindsTexture() {
  return memo('blinds', () => {
    const { c, ctx } = canvas(256, 256);
    ctx.clearRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 11) {
      ctx.fillStyle = 'rgba(214,196,200,0.92)';
      ctx.fillRect(0, y, 256, 7);
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(0, y + 7, 256, 4);
    }
    ctx.fillStyle = 'rgba(80,60,70,0.8)';
    ctx.fillRect(120, 0, 3, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  });
}

/** Generic warm wood for carcasses and table tops. */
export function woodTexture(base = PALETTE.wood, repeat: [number, number] = [2, 2]) {
  return memo(`wood:${base}:${repeat.join('x')}`, () => {
    const { c, ctx } = canvas(256, 256);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 140; i += 1) {
      ctx.strokeStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.09})`;
      ctx.lineWidth = 0.6 + Math.random() * 1.6;
      ctx.beginPath();
      const y = Math.random() * 256;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(80, y + (Math.random() - 0.5) * 8, 170, y + (Math.random() - 0.5) * 8, 256, y);
      ctx.stroke();
    }
    grain(ctx, 256, 256, 900, 0.07);
    return finish(c, repeat);
  });
}

/** The CRT's standby card: PLAY with a blinking cursor, as seen in the clip. */
export function crtScreenTexture(line: string) {
  return memo(`crt:${line}`, () => {
    const { c, ctx } = canvas(512, 384);
    ctx.fillStyle = '#17171f';
    ctx.fillRect(0, 0, 512, 384);
    ctx.fillStyle = '#e8e8f2';
    ctx.font = '900 92px Helvetica, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(line, 256, 200);
    ctx.fillRect(176, 236, 44, 10);
    ctx.fillRect(248, 236, 44, 10);
    ctx.fillRect(320, 236, 44, 10);
    for (let y = 0; y < 384; y += 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, y, 512, 1);
    }
    return finish(c);
  });
}
