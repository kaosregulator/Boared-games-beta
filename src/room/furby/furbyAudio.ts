/**
 * The Furby's voice: the user's own recordings of a 1998 Furby, cut into
 * single sounds, plus the named sound pack from the 1999 CD-ROM, packed by
 * scripts/split-furby-audio.py into one sprite
 * (public/audio/furby/furby.mp3 + furby.json). Loaded the first time a
 * Furby makes a sound, so the room never waits on it.
 *
 * Each clip comes with a loudness envelope at 50 Hz; `mouth()` reads it at
 * the playhead so the beak opens on every syllable, the way the real toy's
 * motor ran with the speech chip.
 */

export type FurbyTag =
  | 'talk'
  | 'chirp'
  | 'whee'
  | 'story'
  | 'laugh'
  | 'laugh-long'
  | 'yawn'
  | 'snore'
  | 'doze'
  | 'sing'
  | 'sing-long'
  | 'uhoh'
  | 'achoo'
  | 'burp'
  | 'purr'
  | 'yum'
  | 'hungry'
  | 'yuck'
  | 'kiss'
  | 'hug'
  | 'tickle'
  | 'scared'
  | 'dance'
  | 'hello'
  | 'wake'
  | 'night'
  | 'ow'
  | 'happy'
  | 'sigh';

interface Clip {
  id: string;
  tag: FurbyTag;
  start: number;
  dur: number;
  env: string;
}

export interface Voice {
  clip: Clip;
  /** AudioContext time the clip started. */
  at: number;
  stop: () => void;
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let buffer: AudioBuffer | null = null;
let clips: Clip[] = [];
let loading: Promise<void> | null = null;
const lastPlayed = new Map<FurbyTag, string[]>();

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

export function loadFurbyVoice() {
  if (loading) return loading;
  const ac = audio();
  if (!ac) return Promise.resolve();
  loading = Promise.all([
    fetch('/audio/furby/furby.json').then(r => r.json() as Promise<{ clips: Clip[] }>),
    fetch('/audio/furby/furby.mp3')
      .then(r => r.arrayBuffer())
      .then(bytes => ac.decodeAudioData(bytes)),
  ])
    .then(([index, decoded]) => {
      clips = index.clips;
      buffer = decoded;
    })
    .catch(() => {
      // No voice: the Furby still moves, it just mimes.
      loading = null;
    });
  return loading;
}

/** A clip with this tag, avoiding the last few played. */
function pick(tag: FurbyTag, maxDur = Infinity) {
  let pool = clips.filter(c => c.tag === tag && c.dur <= maxDur);
  if (!pool.length) pool = clips.filter(c => c.tag === tag);
  if (!pool.length && tag !== 'talk') return pick('talk', 3);
  if (!pool.length) return null;
  const recent = lastPlayed.get(tag) ?? [];
  const fresh = pool.filter(c => !recent.includes(c.id));
  const choice = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length ? fresh.length : pool.length))];
  lastPlayed.set(tag, [...recent, choice.id].slice(-Math.max(1, Math.floor(pool.length / 2))));
  return choice;
}

/**
 * Plays a clip with this tag. Returns null if the voice is still loading
 * (the caller mimes instead). `pitch` nudges the playback rate, so two
 * Furbies on the table don't sound like the same toy.
 */
export function speak(tag: FurbyTag, opts: { volume?: number; pitch?: number; maxDur?: number } = {}): Voice | null {
  void loadFurbyVoice();
  const ac = audio();
  if (!ac || !buffer || !master) return null;
  const clip = pick(tag, opts.maxDur);
  if (!clip) return null;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = opts.pitch ?? 1;
  const gain = ac.createGain();
  gain.gain.value = opts.volume ?? 1;
  src.connect(gain).connect(master);
  const at = ac.currentTime + 0.02;
  src.start(at, clip.start, clip.dur);
  let stopped = false;
  return {
    clip: { ...clip, dur: clip.dur / (opts.pitch ?? 1) },
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

export function voiceTime() {
  return ctx?.currentTime ?? 0;
}

/** How far the beak is open (0-1) at this moment of the voice; 0 once it's over. */
export function mouth(voice: Voice | null, pitch = 1) {
  if (!voice || !ctx) return 0;
  const t = (ctx.currentTime - voice.at) * pitch;
  if (t < 0) return 0;
  const i = Math.floor(t * 50);
  if (i >= voice.clip.env.length) return 0;
  return Number(voice.clip.env[i]) / 9;
}

export function voiceOver(voice: Voice | null) {
  return !voice || !ctx || ctx.currentTime > voice.at + voice.clip.dur;
}

/** A soft wet chomp for chewing on a finger, made on the spot. */
export function chomp(volume = 0.25) {
  const ac = audio();
  if (!ac || !master) return;
  const t = ac.currentTime;
  const len = 0.09;
  const noise = ac.createBuffer(1, Math.ceil(ac.sampleRate * len), ac.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (d.length * 0.25));
  const src = ac.createBufferSource();
  src.buffer = noise;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 900 + Math.random() * 500;
  bp.Q.value = 2.5;
  const g = ac.createGain();
  g.gain.value = volume;
  src.connect(bp).connect(g).connect(master);
  src.start(t);
}

/** The faint whirr-click of the motor under the fur. */
export function motorWhirr(volume = 0.05, seconds = 0.35) {
  const ac = audio();
  if (!ac || !master) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(95, t);
  osc.frequency.linearRampToValueAtTime(120, t + seconds);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 700;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(volume, t + 0.04);
  g.gain.linearRampToValueAtTime(0, t + seconds);
  osc.connect(lp).connect(g).connect(master);
  osc.start(t);
  osc.stop(t + seconds + 0.05);
}
