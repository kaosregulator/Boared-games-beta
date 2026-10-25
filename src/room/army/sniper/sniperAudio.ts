import { burst, tone } from '../armyAudio';

/** Made-up sounds for the shelf sniper, synthesized like the rest of the army town. */
export const sniperSfx = {
  /** Walkie-talkie squelch when the radio man spots you. */
  hail() {
    burst(0.18, 2600, 0.2, 0, 0.8);
    tone(1150, 0.07, 'square', 0.05, 0.16);
    tone(1150, 0.07, 'square', 0.05, 0.28);
  },
  /** The crack, the thump, and the echo off the far wall. */
  crack() {
    burst(0.06, 3200, 0.55, 0, 0.5);
    tone(110, 0.32, 'sine', 0.34, 0, 38);
    burst(0.45, 700, 0.08, 0.14, 0.7);
  },
  /** Low rush while the bullet crawls across the room. */
  slowmo(seconds: number) {
    burst(seconds, 260, 0.14, 0, 0.6);
    tone(58, seconds, 'sine', 0.12, 0, 42);
  },
  thwack() {
    burst(0.1, 1300, 0.32, 0, 0.9);
    tone(240, 0.12, 'square', 0.07, 0, 110);
  },
  poof() {
    burst(0.35, 4200, 0.07, 0, 0.6);
  },
  quack() {
    const f = 470 + Math.random() * 120;
    tone(f, 0.08, 'sawtooth', 0.06, 0, f * 0.7);
    tone(f * 0.92, 0.11, 'sawtooth', 0.05, 0.09, f * 0.6);
  },
  flap() {
    burst(0.05, 900, 0.035, 0, 1.2);
  },
  /** A plop into the grass. */
  land() {
    tone(150, 0.12, 'triangle', 0.12, 0, 80);
  },
  flyAway() {
    [660, 784, 988].forEach((f, i) => tone(f, 0.12, 'triangle', 0.07, i * 0.09));
  },
  bolt() {
    tone(1900, 0.025, 'square', 0.06, 0.25);
    tone(1300, 0.03, 'square', 0.06, 0.4);
  },
  dry() {
    tone(2200, 0.02, 'square', 0.05);
  },
  round() {
    [523, 587, 659, 880].forEach((f, i) => tone(f, i === 3 ? 0.4 : 0.13, 'square', 0.07, i * 0.13));
  },
  perfect() {
    [659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i === 5 ? 0.5 : 0.12, 'square', 0.07, i * 0.11));
  },
  over() {
    [392, 349, 311, 262].forEach((f, i) => tone(f, i === 3 ? 0.6 : 0.2, 'triangle', 0.09, i * 0.22));
  },
  zoom() {
    tone(900, 0.04, 'triangle', 0.04);
  },
};
