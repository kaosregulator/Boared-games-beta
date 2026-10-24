import { sound } from '../../utils/audio';
import type { ZoneId } from './world';

/**
 * Little synthesized sounds for the race: a motor whine that follows the
 * speed, and short cues for boosters, loops, landings and the hiding places.
 * Under the bed everything goes muffled; under the desk it goes hollow.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muffle: BiquadFilterNode | null = null;
let motor: OscillatorNode | null = null;
let motorGain: GainNode | null = null;
let hum: OscillatorNode | null = null;

function ensure() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    muffle = ctx.createBiquadFilter();
    muffle.type = 'lowpass';
    muffle.frequency.value = 12000;
    muffle.connect(master);
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Browsers only let audio start from a key press or tap. */
export function wakeRaceAudio() {
  ensure();
}

export function startMotor() {
  const c = ensure();
  if (!c || motor || !muffle) return;
  motor = c.createOscillator();
  motor.type = 'sawtooth';
  motor.frequency.value = 70;
  hum = c.createOscillator();
  hum.type = 'square';
  hum.frequency.value = 35;
  motorGain = c.createGain();
  motorGain.gain.value = 0;
  const tone = c.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 900;
  motor.connect(tone);
  hum.connect(tone);
  tone.connect(motorGain);
  motorGain.connect(muffle);
  motor.start();
  hum.start();
}

export function stopMotor() {
  try {
    motor?.stop();
    hum?.stop();
  } catch {
    // already stopped
  }
  motor = null;
  hum = null;
  motorGain = null;
}

/** Called every frame with the car's speed (m/s). */
export function motorSpeed(speed: number, airborne: boolean) {
  if (!ctx || !motor || !motorGain || !hum) return;
  const t = ctx.currentTime;
  const s = Math.min(2, Math.abs(speed));
  const f = 70 + s * 210 + (airborne ? 60 : 0);
  motor.frequency.setTargetAtTime(f, t, 0.06);
  hum.frequency.setTargetAtTime(f / 2, t, 0.06);
  const vol = sound.isMuted() ? 0 : 0.02 + Math.min(1, s / 1.2) * 0.06;
  motorGain.gain.setTargetAtTime(vol, t, 0.08);
}

function blip(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
  const c = ensure();
  if (!c || !muffle || sound.isMuted()) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(muffle);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol: number, from: number, to: number) {
  const c = ensure();
  if (!c || !muffle || sound.isMuted()) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(from, c.currentTime);
  bp.frequency.exponentialRampToValueAtTime(to, c.currentTime + dur);
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(bp);
  bp.connect(g);
  g.connect(muffle);
  src.start();
}

export const raceSfx = {
  boost: () => {
    noise(0.45, 0.5, 600, 3200);
    blip(220, 0.3, 'square', 0.05, 660);
  },
  nitro: () => {
    noise(0.8, 0.6, 400, 4000);
    blip(160, 0.6, 'sawtooth', 0.05, 520);
  },
  pickup: () => {
    blip(880, 0.08, 'square', 0.06);
    blip(1320, 0.12, 'square', 0.06, undefined, 0.08);
  },
  loop: () => blip(330, 0.9, 'triangle', 0.06, 990),
  launch: () => noise(0.35, 0.35, 1200, 400),
  land: () => {
    blip(90, 0.18, 'square', 0.08, 50);
    noise(0.12, 0.3, 300, 120);
  },
  bump: () => blip(120, 0.1, 'square', 0.06, 70),
  count: (n: number) => blip(n > 0 ? 440 : 880, n > 0 ? 0.18 : 0.45, 'square', 0.07),
  checkpoint: () => {
    blip(660, 0.1, 'square', 0.05);
    blip(990, 0.16, 'square', 0.05, undefined, 0.09);
  },
  lap: () => [523, 659, 784].forEach((f, i) => blip(f, 0.16, 'square', 0.06, undefined, i * 0.1)),
  finish: () => [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.22, 'square', 0.07, undefined, i * 0.13)),
  timeUp: () => [392, 330, 262].forEach((f, i) => blip(f, 0.25, 'triangle', 0.07, undefined, i * 0.18)),
  /** Entering a hiding place: a muffled thump under the bed, a hollow knock under the desk. */
  zone: (id: ZoneId | null) => {
    const c = ensure();
    if (!c || !muffle) return;
    const t = c.currentTime;
    if (id === 'bed') {
      muffle.frequency.setTargetAtTime(520, t, 0.12);
      blip(70, 0.5, 'sine', 0.12, 45);
      noise(0.6, 0.18, 200, 90);
    } else if (id === 'desk-under') {
      muffle.frequency.setTargetAtTime(2200, t, 0.12);
      blip(240, 0.12, 'triangle', 0.08, 180);
      blip(200, 0.14, 'triangle', 0.07, 150, 0.14);
    } else {
      muffle.frequency.setTargetAtTime(12000, t, 0.15);
      if (id === 'desk-top') blip(587, 0.2, 'square', 0.05, 880);
    }
  },
};

export function stopRaceAudio() {
  stopMotor();
  if (muffle && ctx) muffle.frequency.setValueAtTime(12000, ctx.currentTime);
}
