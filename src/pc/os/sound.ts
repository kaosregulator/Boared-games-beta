/**
 * Every sound the computer makes, synthesized: the CRT thunk, the POST beep,
 * the hard drive chattering through boot, the startup chime, dings, chords,
 * and the dial-up handshake. Nothing is sampled from Windows.
 *
 * The room hands us its AudioContext (window.parent.__pcAudio) when it can,
 * because the click that turned the computer on happened up there and the
 * browser only lets audio start after a click. It can also hand us where to
 * plug in (window.parent.__pcAudioOut), so the sound comes out of the
 * speaker on the desk instead of the middle of the room.
 */

type Host = Window & { __pcAudio?: AudioContext; __pcAudioOut?: AudioNode };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let verb: ConvolverNode | null = null;
let userVolume = 0.8;
let roomLevel = 1;

export function audio(): AudioContext {
  if (ctx) return ctx;
  let host: Host | undefined;
  try {
    host = window.parent !== window ? (window.parent as Host) : undefined;
  } catch {
    host = undefined;
  }
  ctx = host?.__pcAudio ?? new AudioContext();
  master = ctx.createGain();
  master.gain.value = userVolume * roomLevel;
  const dest = host?.__pcAudioOut;
  master.connect(dest && dest.context === ctx ? dest : ctx.destination);
  return ctx;
}

export function out(): GainNode {
  audio();
  return master!;
}

export function resume() {
  const c = audio();
  if (c.state === 'suspended') void c.resume();
}

function apply() {
  if (!master || !ctx) return;
  master.gain.setTargetAtTime(userVolume * roomLevel, ctx.currentTime, 0.05);
}

/** The speaker icon in the tray. */
export function setVolume(v: number) {
  userVolume = Math.max(0, Math.min(1, v));
  apply();
}
export const getVolume = () => userVolume;

/** Quieter while you're across the room, full when you lean in. */
export function setRoomLevel(v: number) {
  roomLevel = v;
  apply();
}

/** A small generated room: enough tail to make the chime feel big. */
function reverb(): ConvolverNode {
  const c = audio();
  if (verb) return verb;
  verb = c.createConvolver();
  const len = Math.floor(c.sampleRate * 3.2);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
  }
  verb.buffer = buf;
  const wet = c.createGain();
  wet.gain.value = 0.55;
  verb.connect(wet).connect(out());
  return verb;
}

export function tone(
  freq: number,
  start: number,
  dur: number,
  { type = 'sine' as OscillatorType, gain = 0.2, attack = 0.005, release = 0.08, wet = 0, detune = 0, dest }: {
    type?: OscillatorType;
    gain?: number;
    attack?: number;
    release?: number;
    wet?: number;
    detune?: number;
    dest?: AudioNode;
  } = {},
) {
  const c = audio();
  const t = c.currentTime + start;
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.setValueAtTime(gain, t + Math.max(attack, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(dest ?? out());
  if (wet > 0) {
    const w = c.createGain();
    w.gain.value = wet;
    g.connect(w).connect(reverb());
  }
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export function noise(start: number, dur: number, gain: number, filter: BiquadFilterType, freq: number, q = 1, dest?: AudioNode) {
  const c = audio();
  const t = c.currentTime + start;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(dest ?? out());
  src.start(t);
  return { src, f, g, t };
}

export const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export const sfx = {
  /** Tube warming up: a dull thunk and the 15.7 kHz whine settling in. */
  crtOn() {
    noise(0, 0.25, 0.5, 'lowpass', 140, 0.7);
    tone(55, 0, 0.3, { type: 'sine', gain: 0.35, release: 0.2 });
    tone(15600, 0.05, 2.2, { gain: 0.012, attack: 0.4, release: 1.2 });
  },
  crtOff() {
    tone(220, 0, 0.18, { type: 'triangle', gain: 0.08 });
    noise(0, 0.12, 0.25, 'highpass', 3000);
  },
  /** The single short POST beep: everything checked out. */
  post() {
    tone(1000, 0, 0.16, { type: 'square', gain: 0.06, release: 0.01 });
  },
  /** Fan spin-up hum under the BIOS screen. */
  fan(seconds = 6) {
    const c = audio();
    const t = c.currentTime;
    const n = noise(0, seconds, 0.05, 'bandpass', 220, 0.6);
    n.f.frequency.setValueAtTime(80, t);
    n.f.frequency.exponentialRampToValueAtTime(260, t + 1.5);
    n.g.gain.setValueAtTime(0.0001, t);
    n.g.gain.exponentialRampToValueAtTime(0.06, t + 1.2);
    n.g.gain.setValueAtTime(0.06, t + seconds - 1);
    n.g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  },
  /** The hard drive seeking: bursts of tiny clicks. */
  disk(seconds = 3, busy = 0.5) {
    let at = 0;
    while (at < seconds) {
      const burst = Math.random() < busy;
      if (burst) {
        const clicks = 2 + Math.floor(Math.random() * 6);
        for (let i = 0; i < clicks; i += 1) noise(at + i * (0.018 + Math.random() * 0.02), 0.012, 0.12 + Math.random() * 0.1, 'bandpass', 2400 + Math.random() * 1800, 3);
      }
      at += 0.08 + Math.random() * 0.22;
    }
  },
  /** The floppy drive grinding its head across the disk. */
  floppy() {
    for (let i = 0; i < 9; i += 1) {
      tone(180 + (i % 3) * 40, i * 0.09, 0.08, { type: 'sawtooth', gain: 0.05 });
      noise(i * 0.09, 0.06, 0.08, 'bandpass', 900, 2);
    }
  },
  click() {
    noise(0, 0.02, 0.08, 'highpass', 2500);
  },
  /** Default beep. */
  ding() {
    tone(hz(88), 0, 0.5, { type: 'sine', gain: 0.18, release: 0.4, wet: 0.2 });
    tone(hz(76), 0, 0.5, { type: 'sine', gain: 0.08, release: 0.4 });
  },
  /** Something went wrong. */
  chord() {
    [hz(72), hz(76), hz(79), hz(84)].forEach((f, i) => tone(f, i * 0.008, 0.6, { type: 'triangle', gain: 0.09, release: 0.45, wet: 0.25 }));
  },
  /** Exclamation: a quick two-note rise. */
  exclaim() {
    tone(hz(79), 0, 0.12, { type: 'triangle', gain: 0.12 });
    tone(hz(86), 0.1, 0.35, { type: 'triangle', gain: 0.12, release: 0.3, wet: 0.2 });
  },
  /** Recycle bin crunch. */
  crumple() {
    for (let i = 0; i < 7; i += 1) noise(i * 0.035 + Math.random() * 0.02, 0.05, 0.12, 'bandpass', 1500 + Math.random() * 3000, 1.5);
  },
  menu() {
    tone(hz(96), 0, 0.04, { type: 'sine', gain: 0.03 });
  },
  /** Fanfare when you win something. */
  tada() {
    const notes = [72, 76, 79, 84];
    notes.forEach((n, i) => tone(hz(n), i * 0.09, 0.9 - i * 0.1, { type: 'sawtooth', gain: 0.05, release: 0.5, wet: 0.35 }));
    tone(hz(48), 0.27, 1.0, { type: 'triangle', gain: 0.12, release: 0.7, wet: 0.3 });
  },
  /** Shutting down: a slow falling glide. */
  shutdown() {
    const notes = [79, 74, 71, 67, 62];
    notes.forEach((n, i) => tone(hz(n), i * 0.22, 1.4, { type: 'sine', gain: 0.1, attack: 0.05, release: 1, wet: 0.5 }));
    tone(hz(43), 0.6, 2.2, { type: 'triangle', gain: 0.08, attack: 0.4, release: 1.6, wet: 0.4 });
  },

  /**
   * The startup chime. An original piece in the spirit of the late-90s ones:
   * a warm pad swelling under a bell arpeggio, about five seconds, with a big
   * reverb tail. Dropping a file at /pc/sounds/startup.mp3 plays that instead.
   */
  async startup() {
    if (await playFile('/pc/sounds/startup.mp3')) return;
    const c = audio();
    const t0 = c.currentTime + 0.05;
    const pad = c.createGain();
    pad.gain.value = 1;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 2;
    lp.frequency.setValueAtTime(400, t0);
    lp.frequency.exponentialRampToValueAtTime(3800, t0 + 2.2);
    lp.frequency.exponentialRampToValueAtTime(900, t0 + 5.5);
    pad.connect(lp);
    lp.connect(out());
    const wet = c.createGain();
    wet.gain.value = 0.7;
    lp.connect(wet).connect(reverb());

    // two chords: Fmaj9 rising to a bright Cadd9/E, then home to Fmaj7
    const chords: [number, number[]][] = [
      [0, [41, 53, 57, 60, 64, 67]],
      [1.6, [40, 52, 55, 60, 62, 67]],
      [3.0, [41, 53, 57, 60, 64, 69]],
    ];
    chords.forEach(([at, notes], ci) => {
      const len = ci === chords.length - 1 ? 3.6 : 1.9;
      for (const n of notes) {
        for (const det of [-9, 7]) {
          tone(hz(n), at, len, { type: 'sawtooth', gain: 0.022, attack: ci === 0 ? 0.9 : 0.35, release: ci === chords.length - 1 ? 2.6 : 0.6, detune: det, dest: pad });
        }
      }
    });
    // the bells
    const bells = [72, 76, 79, 84, 88, 91, 88, 96];
    bells.forEach((n, i) => {
      tone(hz(n), 0.9 + i * 0.17, 1.6, { type: 'sine', gain: 0.07, release: 1.3, wet: 0.6 });
      tone(hz(n) * 2.01, 0.9 + i * 0.17, 0.5, { type: 'sine', gain: 0.018, release: 0.4 });
    });
    // shimmer at the end
    [96, 100, 103, 108].forEach((n, i) => tone(hz(n), 3.1 + i * 0.06, 2.4, { type: 'sine', gain: 0.03, attack: 0.2, release: 2, wet: 0.8 }));
    void t0;
  },

  /** Dial tone, DTMF digits, then the screech and hiss of the handshake. */
  modem(onDone?: () => void) {
    const c = audio();
    // dial tone
    tone(350, 0, 1.1, { gain: 0.06 });
    tone(440, 0, 1.1, { gain: 0.06 });
    const dtmf: Record<string, [number, number]> = {
      '5': [770, 1336], '5b': [770, 1336], '2': [697, 1336], '7': [852, 1209], '0': [941, 1336], '1': [697, 1209], '9': [852, 1477], '8': [852, 1336],
    };
    const digits = ['5', '5', '5', '2', '7', '0', '1', '9', '9', '8'];
    digits.forEach((d, i) => {
      const [a, b] = dtmf[d];
      tone(a, 1.3 + i * 0.13, 0.09, { gain: 0.05 });
      tone(b, 1.3 + i * 0.13, 0.09, { gain: 0.05 });
    });
    const s = 2.8;
    // ring back
    tone(440, s, 0.9, { gain: 0.04 });
    tone(480, s, 0.9, { gain: 0.04 });
    // answer tone and the handshake
    tone(2100, s + 1.2, 1.6, { gain: 0.05 });
    tone(1650, s + 2.9, 0.3, { type: 'square', gain: 0.025 });
    tone(1850, s + 3.2, 0.25, { type: 'square', gain: 0.025 });
    tone(980, s + 3.5, 0.6, { type: 'square', gain: 0.025 });
    const scr = noise(s + 3.6, 2.4, 0.12, 'bandpass', 1800, 4);
    scr.f.frequency.setValueAtTime(1200, c.currentTime + s + 3.6);
    scr.f.frequency.linearRampToValueAtTime(2600, c.currentTime + s + 4.6);
    for (let i = 0; i < 10; i += 1) tone(600 + Math.random() * 2400, s + 3.6 + i * 0.2, 0.18, { type: 'square', gain: 0.018 });
    noise(s + 6, 1.6, 0.1, 'highpass', 1200);
    if (onDone) window.setTimeout(onDone, (s + 7.6) * 1000);
    return s + 7.6;
  },
};

const fileCache = new Map<string, AudioBuffer | null>();

/** Plays an optional override file once it exists; false when there is none. */
async function playFile(url: string): Promise<boolean> {
  const c = audio();
  let buf = fileCache.get(url);
  if (buf === undefined) {
    try {
      const res = await fetch(url);
      const type = res.headers.get('content-type') ?? '';
      buf = res.ok && type.startsWith('audio') ? await c.decodeAudioData(await res.arrayBuffer()) : null;
    } catch {
      buf = null;
    }
    fileCache.set(url, buf);
  }
  if (!buf) return false;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(out());
  src.start();
  return true;
}
