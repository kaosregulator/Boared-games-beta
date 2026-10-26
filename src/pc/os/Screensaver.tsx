import React, { useEffect, useRef } from 'react';
import type { Saver } from './settings';

/**
 * Screen savers: 3D Pipes (three.js), Starfield, Mystify and Flying Flags.
 * Any mouse movement or key ends it (the Shell listens).
 */
export function Screensaver({ kind, preview = false }: { kind: Saver; preview?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || kind === 'none') return;
    let stop = () => {};
    let cancelled = false;
    if (kind === 'pipes') {
      void import('./pipes').then(m => {
        if (!cancelled) stop = m.startPipes(canvas);
      });
    } else {
      stop = start2d(canvas, kind);
    }
    return () => {
      cancelled = true;
      stop();
    };
  }, [kind]);

  return <canvas ref={ref} className={preview ? 'saver-preview' : 'saver'} width={preview ? 160 : 800} height={preview ? 120 : 600} />;
}

function start2d(canvas: HTMLCanvasElement, kind: Saver) {
  const g = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  let raf = 0;

  if (kind === 'starfield') {
    const stars = Array.from({ length: 220 }, () => ({ x: (Math.random() - 0.5) * W, y: (Math.random() - 0.5) * H, z: Math.random() * W }));
    const loop = () => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, H);
      for (const s of stars) {
        s.z -= W * 0.006;
        if (s.z <= 1) {
          s.x = (Math.random() - 0.5) * W;
          s.y = (Math.random() - 0.5) * H;
          s.z = W;
        }
        const k = (W * 0.5) / s.z;
        const x = W / 2 + s.x * k;
        const y = H / 2 + s.y * k;
        const r = Math.max(0.5, (1 - s.z / W) * (W / 260));
        const c = Math.floor(255 * (1 - s.z / W));
        g.fillStyle = `rgb(${c},${c},${c})`;
        g.fillRect(x, y, r, r);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  } else if (kind === 'mystify') {
    const shapes = [0, 1].map(i => ({
      pts: Array.from({ length: 4 }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() * 2 + 1) * (Math.random() < 0.5 ? -1 : 1) * (W / 400), vy: (Math.random() * 2 + 1) * (Math.random() < 0.5 ? -1 : 1) * (W / 400) })),
      hue: i * 160,
      trail: [] as { x: number; y: number }[][],
    }));
    const loop = () => {
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, H);
      for (const s of shapes) {
        for (const p of s.pts) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
        }
        s.trail.unshift(s.pts.map(p => ({ x: p.x, y: p.y })));
        if (s.trail.length > 7) s.trail.pop();
        s.hue = (s.hue + 0.4) % 360;
        s.trail.forEach((poly, i) => {
          if (i % 2) return;
          g.strokeStyle = `hsl(${s.hue},100%,${60 - i * 5}%)`;
          g.beginPath();
          poly.forEach((p, j) => (j ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
          g.closePath();
          g.stroke();
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  } else if (kind === 'flags') {
    const COL = ['#f24f1c', '#80bb00', '#00a2ed', '#ffb900'];
    const flags = Array.from({ length: 26 }, () => ({ x: (Math.random() - 0.5) * W, y: (Math.random() - 0.5) * H, z: Math.random() * W, ph: Math.random() * 6 }));
    let t = 0;
    const loop = () => {
      t += 0.12;
      g.fillStyle = '#000';
      g.fillRect(0, 0, W, H);
      flags.sort((a, b) => b.z - a.z);
      for (const f of flags) {
        f.z -= W * 0.004;
        if (f.z <= 4) {
          f.x = (Math.random() - 0.5) * W;
          f.y = (Math.random() - 0.5) * H;
          f.z = W;
        }
        const k = (W * 0.5) / f.z;
        const cx = W / 2 + f.x * k;
        const cy = H / 2 + f.y * k;
        const s = 14 * k;
        for (let q = 0; q < 4; q += 1) {
          const qx = (q % 2) * s * 1.05;
          const qy = Math.floor(q / 2) * s * 1.05;
          g.fillStyle = COL[q];
          g.beginPath();
          for (let i = 0; i <= 6; i += 1) {
            const u = i / 6;
            const wave = Math.sin(t + f.ph + (qx + u * s) / (s * 0.8)) * s * 0.12;
            const px = cx - s + qx + u * s;
            const py = cy - s + qy + wave;
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
          }
          for (let i = 6; i >= 0; i -= 1) {
            const u = i / 6;
            const wave = Math.sin(t + f.ph + (qx + u * s) / (s * 0.8)) * s * 0.12;
            g.lineTo(cx - s + qx + u * s, cy - s + qy + s + wave);
          }
          g.fill();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  return () => cancelAnimationFrame(raf);
}
