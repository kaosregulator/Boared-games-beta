/**
 * Receiver static for the TV and the radio. White noise through a band-pass,
 * the hiss between stations, plus the faint 15.7 kHz line whine a CRT makes.
 */

let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function noise(ac: AudioContext) {
  if (noiseBuffer) return noiseBuffer;
  const length = ac.sampleRate * 2;
  noiseBuffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

export interface StaticHandle {
  /** 0..1 */
  setLevel: (level: number, seconds?: number) => void;
  stop: (fadeSeconds?: number) => void;
}

export function startStatic(level = 0.5, flavour: 'tv' | 'radio' = 'tv'): StaticHandle | null {
  const ac = audio();
  if (!ac) return null;
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  src.loop = true;
  const band = ac.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = flavour === 'radio' ? 1800 : 3200;
  band.Q.value = flavour === 'radio' ? 0.55 : 0.4;
  const out = ac.createGain();
  out.gain.value = 0;
  src.connect(band).connect(out).connect(ac.destination);

  let whine: OscillatorNode | null = null;
  if (flavour === 'tv') {
    whine = ac.createOscillator();
    whine.frequency.value = 15734;
    const wg = ac.createGain();
    wg.gain.value = 0.004;
    whine.connect(wg).connect(out);
    whine.start();
  } else {
    // AM-style flutter so the hiss swims while the dial moves.
    const lfo = ac.createOscillator();
    lfo.frequency.value = 7;
    const depth = ac.createGain();
    depth.gain.value = 600;
    lfo.connect(depth).connect(band.frequency);
    lfo.start();
  }
  src.start();
  const peak = flavour === 'radio' ? 0.22 : 0.18;
  out.gain.linearRampToValueAtTime(level * peak, ac.currentTime + 0.04);

  let stopped = false;
  return {
    setLevel: (next, seconds = 0.08) => {
      if (stopped) return;
      out.gain.cancelScheduledValues(ac.currentTime);
      out.gain.setValueAtTime(out.gain.value, ac.currentTime);
      out.gain.linearRampToValueAtTime(Math.max(0, next) * peak, ac.currentTime + seconds);
    },
    stop: (fade = 0.12) => {
      if (stopped) return;
      stopped = true;
      out.gain.cancelScheduledValues(ac.currentTime);
      out.gain.setValueAtTime(out.gain.value, ac.currentTime);
      out.gain.linearRampToValueAtTime(0, ac.currentTime + fade);
      window.setTimeout(() => {
        src.stop();
        whine?.stop();
        src.disconnect();
        out.disconnect();
      }, fade * 1000 + 60);
    },
  };
}

/** The relay clunk of a cable box changing channel. */
export function channelClick() {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(140, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ac.currentTime + 0.05);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.08, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.07);
  osc.connect(g).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.08);
}

/** Paint one frame of snow into a canvas. */
export function paintSnow(canvas: HTMLCanvasElement, roll = 0) {
  const g = canvas.getContext('2d');
  if (!g) return;
  const { width: w, height: h } = canvas;
  const img = g.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() * 255) | 0;
    d[i] = d[i + 1] = d[i + 2] = n;
    d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // the rolling hum bar of an untuned set
  const bar = ((roll * 90) % (h + 40)) - 20;
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(0, bar, w, 18);
}
