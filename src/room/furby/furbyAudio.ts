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
  /** Playback rate the clip was played at. */
  rate: number;
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
  void loadMotor();
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
    rate: opts.pitch ?? 1,
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

interface MotorBurst {
  start: number;
  loopStart: number;
  loopEnd: number;
  end: number;
}

let motor: { buffer: AudioBuffer; bursts: MotorBurst[] } | null = null;
let motorLoading: Promise<void> | null = null;

/**
 * A real 1998 Furby's gearbox (the user's recording of one with a dead
 * speaker), cut into bursts by scripts/build-furby-motor.py: each one a
 * spin-up, a steady middle that loops, and a spin-down.
 */
function loadMotor() {
  if (motorLoading) return motorLoading;
  const ac = audio();
  if (!ac) return Promise.resolve();
  motorLoading = Promise.all([
    fetch('/audio/furby/motor.json').then(r => r.json() as Promise<{ bursts: MotorBurst[] }>),
    fetch('/audio/furby/motor.mp3')
      .then(r => r.arrayBuffer())
      .then(bytes => ac.decodeAudioData(bytes)),
  ])
    .then(([index, decoded]) => {
      motor = { buffer: decoded, bursts: index.bursts };
    })
    .catch(() => {
      motorLoading = null;
    });
  return motorLoading;
}

/** One run of the motor from `at` for `seconds`. Returns a stop. */
function motorRun(at: number, seconds: number, volume: number) {
  const ac = audio();
  if (!ac || !master || !motor?.bursts.length) return () => {};
  const b = motor.bursts[Math.floor(Math.random() * motor.bursts.length)];
  const release = b.end - b.loopEnd;
  // Spin-up, then the steady middle loops for as long as it has to run.
  const run = Math.max(seconds - release, b.loopStart - b.start + 0.02);
  const spin = ac.createBufferSource();
  spin.buffer = motor.buffer;
  spin.loop = true;
  spin.loopStart = b.loopStart;
  spin.loopEnd = b.loopEnd;
  const g = ac.createGain();
  g.gain.setValueAtTime(volume, at);
  g.gain.setValueAtTime(volume, at + run);
  g.gain.linearRampToValueAtTime(0, at + run + 0.025);
  spin.connect(g).connect(master);
  spin.start(at, b.start);
  spin.stop(at + run + 0.03);
  // Then the burst's own spin-down.
  const park = ac.createBufferSource();
  park.buffer = motor.buffer;
  const pg = ac.createGain();
  pg.gain.setValueAtTime(0, at + run);
  pg.gain.linearRampToValueAtTime(volume, at + run + 0.025);
  park.connect(pg).connect(master);
  park.start(at + run, b.loopEnd - 0.025, release + 0.025);
  return () => {
    const t = ac.currentTime;
    for (const gain of [g.gain, pg.gain]) {
      gain.cancelScheduledValues(t);
      gain.setTargetAtTime(0, t, 0.02);
    }
    spin.stop(t + 0.1);
    park.stop(t + 0.1);
  };
}

/** The motor running for `seconds`, for a movement with no voice. `volume` is relative to the voice. */
export function motorWhirr(volume = 0.3, seconds = 0.6) {
  void loadMotor();
  const ac = audio();
  if (ac) motorRun(ac.currentTime + 0.01, seconds, volume);
}

/**
 * The motor under a line of speech. In the real toy one motor turns the cam
 * that opens the beak, so it runs while the mouth moves and stops in the
 * pauses: each stretch of the clip's mouth envelope gets its own burst.
 */
export function motorFollow(voice: Voice | null, volume = 0.3) {
  if (!voice) return;
  const env = voice.clip.env;
  const frame = 1 / 50 / voice.rate;
  const runs: [number, number][] = [];
  let from = -1;
  for (let i = 0; i <= env.length; i++) {
    const open = i < env.length && Number(env[i]) >= 2;
    if (open && from < 0) from = i;
    if (!open && from >= 0) {
      // Short pauses between syllables don't stop the motor.
      const last = runs[runs.length - 1];
      if (last && from - last[1] < 5) last[1] = i;
      else runs.push([from, i]);
      from = -1;
    }
  }
  const stops = runs
    .filter(([a, b]) => b - a >= 3)
    .map(([a, b]) => motorRun(voice.at + a * frame, (b - a) * frame, volume));
  const stopVoice = voice.stop;
  voice.stop = () => {
    stopVoice();
    for (const stop of stops) stop();
  };
}
