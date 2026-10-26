/**
 * Media Player visualizations, written for this project in the spirit of the
 * WMP 7-era ones: Bars, Ocean Mist, Swirl, Kaleidoscope, Plasma and
 * Particles. Each draws one frame from the analyser's spectrum and waveform.
 */

export interface VisFrame {
  g: CanvasRenderingContext2D;
  w: number;
  h: number;
  freq: Uint8Array;
  wave: Uint8Array;
  t: number;
  state: Record<string, unknown>;
}

export interface Vis {
  family: string;
  name: string;
  draw: (f: VisFrame) => void;
}

const bass = (freq: Uint8Array) => {
  let s = 0;
  for (let i = 0; i < 8; i += 1) s += freq[i];
  return s / (8 * 255);
};
const level = (freq: Uint8Array) => {
  let s = 0;
  for (let i = 0; i < freq.length; i += 1) s += freq[i];
  return s / (freq.length * 255);
};

export const VISUALIZERS: Vis[] = [
  {
    family: 'Bars and Waves',
    name: 'Bars',
    draw({ g, w, h, freq, state }) {
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
      const n = 40;
      const peaks = (state.peaks as number[]) ?? (state.peaks = new Array(n).fill(0));
      const bw = w / n;
      for (let i = 0; i < n; i += 1) {
        // log-ish spread across the spectrum
        const idx = Math.floor(Math.pow(i / n, 1.7) * freq.length * 0.7);
        const v = freq[idx] / 255;
        const bh = v * h * 0.92;
        const grd = g.createLinearGradient(0, h, 0, h - bh);
        grd.addColorStop(0, '#00ff40');
        grd.addColorStop(0.6, '#ffff00');
        grd.addColorStop(1, '#ff2020');
        g.fillStyle = grd;
        g.fillRect(i * bw + 1, h - bh, bw - 2, bh);
        peaks[i] = Math.max(peaks[i] - h * 0.006, bh);
        g.fillStyle = '#fff';
        g.fillRect(i * bw + 1, h - peaks[i] - 3, bw - 2, 2);
      }
    },
  },
  {
    family: 'Bars and Waves',
    name: 'Ocean Mist',
    draw({ g, w, h, wave, t }) {
      g.fillStyle = 'rgba(0,10,30,.18)';
      g.fillRect(0, 0, w, h);
      for (let layer = 0; layer < 3; layer += 1) {
        g.strokeStyle = `hsla(${190 + layer * 18 + Math.sin(t) * 10},90%,${55 + layer * 10}%,.9)`;
        g.lineWidth = 2 - layer * 0.4;
        g.beginPath();
        for (let i = 0; i < wave.length; i += 4) {
          const x = (i / wave.length) * w;
          const y = h / 2 + ((wave[i] - 128) / 128) * h * (0.42 - layer * 0.1) + layer * 6;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
    },
  },
  {
    family: 'Ambience',
    name: 'Swirl',
    draw({ g, w, h, freq, t }) {
      // feedback: draw the last frame back in, rotated and zoomed
      g.save();
      g.globalAlpha = 0.92;
      g.translate(w / 2, h / 2);
      g.rotate(0.02 + bass(freq) * 0.04);
      g.scale(1.03, 1.03);
      g.drawImage(g.canvas, -w / 2, -h / 2, w, h);
      g.restore();
      g.fillStyle = 'rgba(0,0,0,.06)';
      g.fillRect(0, 0, w, h);
      const lv = level(freq);
      for (let i = 0; i < 5; i += 1) {
        const a = t * (0.7 + i * 0.13) + (i * Math.PI * 2) / 5;
        const r = h * (0.12 + lv * 0.35);
        const x = w / 2 + Math.cos(a) * r;
        const y = h / 2 + Math.sin(a * 1.3) * r;
        g.fillStyle = `hsl(${(t * 40 + i * 70) % 360},100%,60%)`;
        g.beginPath();
        g.arc(x, y, 2 + freq[i * 12] / 40, 0, Math.PI * 2);
        g.fill();
      }
    },
  },
  {
    family: 'Battery',
    name: 'Kaleidoscope',
    draw({ g, w, h, freq, wave, t }) {
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.fillRect(0, 0, w, h);
      const seg = 8;
      g.save();
      g.translate(w / 2, h / 2);
      const b = bass(freq);
      for (let s = 0; s < seg; s += 1) {
        g.save();
        g.rotate((s * Math.PI * 2) / seg + t * 0.2);
        if (s % 2) g.scale(1, -1);
        g.strokeStyle = `hsl(${(t * 60 + s * 20) % 360},100%,${50 + b * 30}%)`;
        g.lineWidth = 2;
        g.beginPath();
        for (let i = 0; i < 64; i += 1) {
          const v = (wave[i * 8] - 128) / 128;
          const x = (i / 64) * h * 0.55;
          const y = v * h * 0.18 + Math.sin(i * 0.3 + t * 2) * 6;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
        g.restore();
      }
      g.restore();
    },
  },
  {
    family: 'Plenoptic',
    name: 'Plasma',
    draw({ g, w, h, freq, t, state }) {
      const sw = 80;
      const sh = 60;
      let small = state.small as HTMLCanvasElement | undefined;
      if (!small) {
        small = document.createElement('canvas');
        small.width = sw;
        small.height = sh;
        state.small = small;
      }
      const sg = small.getContext('2d')!;
      const img = sg.createImageData(sw, sh);
      const b = bass(freq) * 4;
      for (let y = 0; y < sh; y += 1)
        for (let x = 0; x < sw; x += 1) {
          const v = Math.sin(x / 7 + t * 1.3) + Math.sin(y / 5 - t) + Math.sin((x + y) / 9 + t * 0.7 + b) + Math.sin(Math.hypot(x - sw / 2, y - sh / 2) / 4 - t * 2);
          const i = (y * sw + x) * 4;
          img.data[i] = 128 + 127 * Math.sin(v * Math.PI);
          img.data[i + 1] = 128 + 127 * Math.sin(v * Math.PI + 2 + b);
          img.data[i + 2] = 128 + 127 * Math.sin(v * Math.PI + 4);
          img.data[i + 3] = 255;
        }
      sg.putImageData(img, 0, 0);
      g.imageSmoothingEnabled = true;
      g.drawImage(small, 0, 0, w, h);
    },
  },
  {
    family: 'Particle',
    name: 'Starburst',
    draw({ g, w, h, freq, state }) {
      type P = { x: number; y: number; vx: number; vy: number; life: number; hue: number };
      const ps = (state.ps as P[]) ?? (state.ps = []);
      const b = bass(freq);
      const last = (state.last as number) ?? 0;
      if (b > 0.55 && b > last * 1.08) {
        const hue = Math.random() * 360;
        for (let i = 0; i < 60; i += 1) {
          const a = Math.random() * Math.PI * 2;
          const s = 1 + Math.random() * 5;
          ps.push({ x: w / 2, y: h / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, hue });
        }
      }
      state.last = b;
      g.fillStyle = 'rgba(0,0,0,.2)';
      g.fillRect(0, 0, w, h);
      for (let i = ps.length - 1; i >= 0; i -= 1) {
        const p = ps[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.life -= 0.012;
        if (p.life <= 0) {
          ps.splice(i, 1);
          continue;
        }
        g.fillStyle = `hsla(${p.hue},100%,65%,${p.life})`;
        g.fillRect(p.x, p.y, 2.5, 2.5);
      }
      // a slow ring always there so silence isn't empty
      g.strokeStyle = `hsla(${(performance.now() / 30) % 360},80%,60%,.5)`;
      g.beginPath();
      g.arc(w / 2, h / 2, 20 + level(freq) * h * 0.4, 0, Math.PI * 2);
      g.stroke();
      if (ps.length > 1500) ps.splice(0, ps.length - 1500);
    },
  },
];
