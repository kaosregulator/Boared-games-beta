/**
 * Poo-Chi's voice: the user's own recording of the toy being played, cut by
 * scripts/split-poochi-audio.py into one sprite
 * (public/audio/poochi/poochi.mp3 + poochi.json). What each clip is, and
 * how it was told apart, is written at the top of that script:
 *
 *   press   the head button clicking down and up (how he starts)
 *   bark    his bark (bark4, bark2, and four single ones)
 *   beep    the two beeps he gives before every song
 *   whir    his gearbox while he walks
 *   song    the six songs, song1 to song6
 *
 * Every clip carries a 50 Hz loudness envelope; `level()` reads it at the
 * playhead so the eyes and the mouth move with the sound.
 *
 * The propeller and the jet pack are not in the recording (the real toy
 * never had them), so they are made here on the spot.
 */

export type PoochiTag = 'press' | 'bark' | 'beep' | 'whir' | 'song';

export interface PoochiClip {
  id: string;
  tag: PoochiTag;
  start: number;
  dur: number;
  env: string;
}

export interface PoochiVoice {
  clip: PoochiClip;
  at: number;
  stop: () => void;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let buffer: AudioBuffer | null = null;
let clips: PoochiClip[] = [];
let loading: Promise<void> | null = null;
let lastBark = '';

function audio() {
  if (!ctx && typeof window !== 'undefined') {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx?.state === 'suspended') void ctx.resume();
  return ctx;
}

export function loadPoochiVoice() {
  if (loading) return loading;
  const ac = audio();
  if (!ac) return Promise.resolve();
  loading = Promise.all([
    fetch('/audio/poochi/poochi.json').then(r => r.json() as Promise<{ clips: PoochiClip[] }>),
    fetch('/audio/poochi/poochi.mp3')
      .then(r => r.arrayBuffer())
      .then(bytes => ac.decodeAudioData(bytes)),
  ])
    .then(([index, decoded]) => {
      clips = index.clips;
      buffer = decoded;
    })
    .catch(() => {
      // No voice: he still lights up and moves.
      loading = null;
    });
  return loading;
}

export function poochiClip(id: string) {
  return clips.find(c => c.id === id) ?? null;
}

/** A clip by id ('song3', 'press'), or by tag for a bark ('bark' picks a fresh one). */
export function poochiSay(idOrTag: string, opts: { volume?: number; delay?: number } = {}): PoochiVoice | null {
  void loadPoochiVoice();
  const ac = audio();
  if (!ac || !buffer || !master) return null;
  let clip = poochiClip(idOrTag);
  if (!clip) {
    const pool = clips.filter(c => c.tag === idOrTag && c.id !== lastBark);
    clip = pool[Math.floor(Math.random() * pool.length)] ?? null;
  }
  if (!clip) return null;
  if (clip.tag === 'bark') lastBark = clip.id;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.value = opts.volume ?? 1;
  src.connect(gain).connect(master);
  const at = ac.currentTime + 0.02 + (opts.delay ?? 0);
  src.start(at, clip.start, clip.dur);
  let stopped = false;
  return {
    clip,
    at,
    stop: () => {
      if (stopped) return;
      stopped = true;
      const t = ac.currentTime;
      gain.gain.setTargetAtTime(0, t, 0.03);
      src.stop(t + 0.15);
    },
  };
}

/** How loud the voice is right now (0-1); 0 before it starts and once it's over. */
export function level(voice: PoochiVoice | null) {
  if (!voice || !ctx) return 0;
  const t = ctx.currentTime - voice.at;
  if (t < 0) return 0;
  const i = Math.floor(t * 50);
  if (i >= voice.clip.env.length) return 0;
  return Number(voice.clip.env[i]) / 9;
}

export function voiceOver(voice: PoochiVoice | null) {
  return !voice || !ctx || ctx.currentTime > voice.at + voice.clip.dur;
}

/** Seconds into the voice, or -1 when nothing is playing. */
export function voiceAt(voice: PoochiVoice | null) {
  if (!voice || !ctx) return -1;
  return ctx.currentTime - voice.at;
}

/**
 * The add-ons' motors: a buzzing propeller and a jet pack's roar. Each is a
 * loop that is always running once started, with its volume and pitch set
 * every frame from 0 (off) to 1 (flat out).
 */
interface Motor {
  set: (amount: number) => void;
  stop: () => void;
}

function noiseBuffer(ac: AudioContext) {
  const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

export function propellerMotor(): Motor {
  const ac = audio();
  if (!ac || !master) return { set: () => {}, stop: () => {} };
  const osc = ac.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 70;
  // The blades chop the buzz: a fast tremolo on top.
  const chop = ac.createOscillator();
  chop.frequency.value = 24;
  const chopDepth = ac.createGain();
  chopDepth.gain.value = 0.5;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  const gain = ac.createGain();
  gain.gain.value = 0;
  const vca = ac.createGain();
  vca.gain.value = 0.5;
  chop.connect(chopDepth).connect(vca.gain);
  osc.connect(lp).connect(vca).connect(gain).connect(master);
  osc.start();
  chop.start();
  return {
    set: amount => {
      const t = ac.currentTime;
      gain.gain.setTargetAtTime(amount * 0.11, t, 0.06);
      osc.frequency.setTargetAtTime(60 + amount * 70, t, 0.1);
      chop.frequency.setTargetAtTime(14 + amount * 26, t, 0.1);
    },
    stop: () => {
      gain.gain.setTargetAtTime(0, ac.currentTime, 0.05);
      osc.stop(ac.currentTime + 0.3);
      chop.stop(ac.currentTime + 0.3);
    },
  };
}

export function jetMotor(): Motor {
  const ac = audio();
  if (!ac || !master) return { set: () => {}, stop: () => {} };
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  src.loop = true;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 400;
  bp.Q.value = 0.8;
  const gain = ac.createGain();
  gain.gain.value = 0;
  src.connect(bp).connect(gain).connect(master);
  src.start();
  return {
    set: amount => {
      const t = ac.currentTime;
      gain.gain.setTargetAtTime(amount * 0.22, t, 0.05);
      bp.frequency.setTargetAtTime(300 + amount * 900, t, 0.08);
    },
    stop: () => {
      gain.gain.setTargetAtTime(0, ac.currentTime, 0.05);
      src.stop(ac.currentTime + 0.3);
    },
  };
}

/** A little mechanical clunk for the add-ons popping out of his back. */
export function popOut(up = true) {
  const ac = audio();
  if (!ac || !master) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  o.type = 'square';
  o.frequency.setValueAtTime(up ? 320 : 640, t);
  o.frequency.exponentialRampToValueAtTime(up ? 760 : 260, t + 0.12);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.2);
}
