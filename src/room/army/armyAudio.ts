/**
 * Synthesized army-town sounds, all made on the fly (nothing to download):
 * the radio alarm, toy cap-gun pops, a plastic clack when a soldier tips
 * over, the rotor chop, and a chime for each ring.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let rotor: { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode; lfo: OscillatorNode; lfoGain: GainNode } | null = null;

function ensure() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.45;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function wakeArmyAudio() {
  ensure();
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
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function burst(dur: number, freq: number, vol: number, at = 0, q = 1) {
  const c = ensure();
  if (!c || !master || !noise) return;
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

export const armySfx = {
  /** Walkie-talkie squelch and a two-tone alarm. */
  alarm() {
    burst(0.25, 2400, 0.25, 0, 0.7);
    for (let i = 0; i < 3; i++) {
      tone(880, 0.22, 'square', 0.08, 0.3 + i * 0.5);
      tone(660, 0.22, 'square', 0.08, 0.55 + i * 0.5);
    }
  },
  radio() {
    burst(0.12, 2600, 0.18, 0, 0.8);
    tone(1200, 0.06, 'square', 0.05, 0.12);
  },
  /** A cap gun, quieter the further away it is. */
  pop(distance = 0.3) {
    const v = Math.max(0.03, 0.32 - distance * 0.18);
    burst(0.08, 1800, v, 0, 0.6);
    tone(180, 0.06, 'triangle', v * 0.4);
  },
  /** Hollow plastic hitting carpet. */
  clack(distance = 0.3) {
    const v = Math.max(0.03, 0.22 - distance * 0.12);
    tone(1400, 0.05, 'square', v * 0.5);
    tone(520, 0.09, 'triangle', v, 0.04);
  },
  ring() {
    tone(988, 0.18, 'triangle', 0.16);
    tone(1319, 0.3, 'triangle', 0.14, 0.08);
  },
  finish() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'square', 0.08, i * 0.12));
  },
  bump() {
    tone(220, 0.1, 'square', 0.12, 0, 120);
  },
  wave() {
    tone(392, 0.16, 'sawtooth', 0.07);
    tone(523, 0.3, 'sawtooth', 0.07, 0.16);
  },
  victory() {
    [392, 523, 659, 784, 659, 784].forEach((f, i) => tone(f, i === 5 ? 0.6 : 0.16, 'square', 0.08, i * 0.15));
  },
};

/** The rotor: filtered noise chopped by a low oscillator. Speed 0..1. */
export function rotorOn() {
  const c = ensure();
  if (!c || !master || !noise || rotor) return;
  const src = c.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 700;
  const gain = c.createGain();
  gain.gain.value = 0;
  const chop = c.createGain();
  chop.gain.value = 0.5;
  const lfo = c.createOscillator();
  lfo.type = 'square';
  lfo.frequency.value = 9;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.5;
  lfo.connect(lfoGain).connect(chop.gain);
  src.connect(filter).connect(chop).connect(gain).connect(master);
  src.start();
  lfo.start();
  rotor = { src, gain, filter, lfo, lfoGain };
}

export function rotorLevel(spin: number, speed: number) {
  if (!rotor || !ctx) return;
  const t = ctx.currentTime;
  rotor.gain.gain.setTargetAtTime(0.05 + spin * 0.13, t, 0.1);
  rotor.lfo.frequency.setTargetAtTime(4 + spin * 12 + speed * 5, t, 0.15);
  rotor.filter.frequency.setTargetAtTime(500 + speed * 700, t, 0.2);
}

export function rotorOff() {
  if (!rotor) return;
  const r = rotor;
  rotor = null;
  try {
    r.src.stop();
    r.lfo.stop();
  } catch {
    // already stopped
  }
  r.gain.disconnect();
}
