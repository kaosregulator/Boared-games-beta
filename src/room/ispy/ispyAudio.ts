/**
 * I Spy sounds. The toy noises (heartbeat, rolling marble, jump rope,
 * Tamagotchi beeps, the shake) come from the Cake Jam toy box; the chimes,
 * page turns and the "no peeking" whoosh are made on the fly.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buffers = new Map<string, AudioBuffer | null>();

function ensure() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function wakeISpyAudio() {
  ensure();
  for (const name of ['heartbeat', 'rolling', 'jumprope', 'tamagotchi', 'shake']) void load(name);
}

async function load(name: string) {
  if (buffers.has(name)) return buffers.get(name) ?? null;
  buffers.set(name, null);
  const c = ensure();
  if (!c) return null;
  try {
    const res = await fetch(`/ispy/${name}.mp3`);
    const buf = await c.decodeAudioData(await res.arrayBuffer());
    buffers.set(name, buf);
    return buf;
  } catch {
    return null;
  }
}

function playFile(name: string, vol = 0.8, maxSeconds = 2.2) {
  const c = ensure();
  const buf = buffers.get(name);
  if (!c || !master || !buf) {
    void load(name);
    return;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const g = c.createGain();
  const t = c.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.setValueAtTime(vol, t + maxSeconds - 0.3);
  g.gain.linearRampToValueAtTime(0.0001, t + maxSeconds);
  src.connect(g).connect(master);
  src.start(t);
  src.stop(t + maxSeconds);
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, at = 0, slideTo?: number) {
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol: number, from: number, to: number, at = 0) {
  const c = ensure();
  if (!c || !master) return;
  const t = c.currentTime + at;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 0.8;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

export const ispySfx = {
  /** The cover creaks open and the pages flutter. */
  open() {
    noise(0.5, 0.25, 400, 1800);
    noise(0.25, 0.18, 2000, 900, 0.45);
    noise(0.25, 0.18, 2000, 900, 0.7);
  },
  /** Paper pop-ups standing up. */
  pop(i: number) {
    tone(520 + i * 90, 0.09, 'triangle', 0.18);
  },
  pageTurn() {
    noise(0.35, 0.3, 3000, 700);
  },
  /** Eyes shut: the pile gets dumped out. */
  dump() {
    playFile('shake', 0.7, 1.6);
    noise(1.2, 0.12, 200, 600, 0.2);
  },
  eyesOpen() {
    tone(392, 0.16, 'sine', 0.2);
    tone(523, 0.16, 'sine', 0.2, 0.12);
    tone(784, 0.3, 'sine', 0.22, 0.24);
  },
  found(sfx?: string) {
    tone(880, 0.12, 'triangle', 0.22);
    tone(1175, 0.12, 'triangle', 0.22, 0.08);
    tone(1568, 0.28, 'sine', 0.2, 0.16);
    if (sfx) playFile(sfx, 0.75);
  },
  wrong() {
    tone(220, 0.16, 'square', 0.08);
    tone(180, 0.22, 'square', 0.08, 0.12);
  },
  hint() {
    for (let i = 0; i < 5; i++) tone(1200 + i * 220, 0.08, 'sine', 0.1, i * 0.05);
  },
  /** The whole page found. */
  done() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.22, i * 0.12));
  },
  /** The library date stamp: ka-chunk. */
  stamp() {
    noise(0.08, 0.5, 300, 120);
    tone(90, 0.12, 'sine', 0.4, 0.02);
  },
};
