/**
 * Throwback Trivia's boombox. Three kinds of cue live here:
 *
 * - The original 8-bit snippets this room shipped with (mario_run, zelda_cave,
 *   cyber_boss, arcade_rush, spooky_organ), restored note for note.
 * - Public-domain melodies played on a square wave: folk songs, ragtime,
 *   Bach, Grieg, Tárrega. Old enough that anyone can play them, famous
 *   enough that a toy, a truck, or a phone made you hear them a thousand times.
 * - The real tones a 90s house made: the dial tone, the busy signal, the
 *   "number you have reached" beeps, Jenny's number on a touch-tone pad, the
 *   Emergency Broadcast System. These are built from the published
 *   frequencies, so they are the actual sound, not an impression of it.
 */

export type ChipWave = OscillatorType | 'noise';

export interface ChipNote {
  /** Hz. Ignored for noise. */
  f: number;
  /** Seconds from the downbeat. */
  t: number;
  d: number;
  wave?: ChipWave;
  /** 0..1, before the room volume. */
  gain?: number;
  /** Glide target Hz. */
  slide?: number;
  /** Low-pass cutoff. */
  filter?: number;
}

const SEMI: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

/** 'C#5' → Hz. */
function hz(name: string): number {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name);
  if (!m) return 0;
  const step = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * 2 ** (step / 12);
}

type Voice = Pick<ChipNote, 'wave' | 'gain' | 'filter'>;
const SQUARE: Voice = { wave: 'square', gain: 0.16, filter: 1700 };
const BASS: Voice = { wave: 'triangle', gain: 0.2, filter: 480 };
const ORGAN: Voice = { wave: 'sawtooth', gain: 0.09, filter: 1300 };
const CHIME: Voice = { wave: 'triangle', gain: 0.2, filter: 3200 };

/**
 * A melody from note names and beats. `null` is a rest.
 * Each note sounds for most of its beat so repeated notes stay separate.
 */
function tune(beat: number, notes: Array<[string | null, number]>, voice: Voice = SQUARE, start = 0): ChipNote[] {
  const out: ChipNote[] = [];
  let t = start;
  for (const [name, beats] of notes) {
    const len = beats * beat;
    if (name) out.push({ f: hz(name), t, d: Math.max(0.05, len * 0.88), ...voice });
    t += len;
  }
  return out;
}

/** The old one-voice format: back to back, a 20 ms breath between notes. */
function classic(melody: Array<[number, number]>): ChipNote[] {
  const out: ChipNote[] = [];
  let t = 0;
  for (const [f, d] of melody) {
    if (f > 0) out.push({ f, t, d, wave: 'square', gain: 0.22, filter: 1600 });
    t += d + 0.02;
  }
  return out;
}

/** Two sines at once, the way the phone company made every tone. */
function dual(a: number, b: number, t: number, d: number, gain = 0.12): ChipNote[] {
  return [
    { f: a, t, d, wave: 'sine', gain, filter: 4000 },
    { f: b, t, d, wave: 'sine', gain, filter: 4000 },
  ];
}

// ---------------------------------------------------------------- the originals

const marioRun = classic([
  [659.25, 0.12], [659.25, 0.12], [0, 0.1], [659.25, 0.12], [0, 0.1],
  [523.25, 0.12], [659.25, 0.12], [783.99, 0.24], [392.0, 0.24],
]);

const zeldaCave = classic([
  [440, 0.15], [493.88, 0.15], [523.25, 0.15], [659.25, 0.3],
  [587.33, 0.15], [523.25, 0.15], [493.88, 0.4],
]);

const cyberBoss = classic([
  [110, 0.1], [220, 0.1], [164.81, 0.1], [329.63, 0.1], [293.66, 0.15], [220, 0.25],
]);

const arcadeRush = classic([
  [523.25, 0.08], [587.33, 0.08], [659.25, 0.08], [783.99, 0.08], [880, 0.08], [1046.5, 0.2],
]);

const spookyOrgan = classic([
  [261.63, 0.2], [311.13, 0.2], [392.0, 0.2], [466.16, 0.4],
]);

// ------------------------------------------------- public-domain, on a square wave

/** Korobeiniki, a Russian folk song from 1861. Game Boys played it until the batteries died. */
const korobeiniki = [
  ...tune(0.2, [
    ['E5', 2], ['B4', 1], ['C5', 1], ['D5', 2], ['C5', 1], ['B4', 1],
    ['A4', 2], ['A4', 1], ['C5', 1], ['E5', 2], ['D5', 1], ['C5', 1],
    ['B4', 3], ['C5', 1], ['D5', 2], ['E5', 2],
    ['C5', 2], ['A4', 2], ['A4', 4],
  ]),
  ...tune(0.2, [
    ['E3', 1], ['E4', 1], ['E3', 1], ['E4', 1], ['A2', 1], ['A3', 1], ['A2', 1], ['A3', 1],
    ['G#2', 1], ['G#3', 1], ['G#2', 1], ['G#3', 1], ['A2', 1], ['A3', 1], ['A2', 2],
  ], BASS),
];

/** Scott Joplin's The Entertainer (1902). Half the ice cream trucks in America. */
const entertainer = [
  ...tune(0.15, [
    ['D5', 1], ['D#5', 1], ['E5', 1], ['C6', 2], ['E5', 1], ['C6', 2], ['E5', 1], ['C6', 5],
    [null, 1], ['C6', 1], ['D6', 1], ['D#6', 1], ['E6', 1], ['C6', 1], ['D6', 1], ['E6', 2],
    ['B5', 1], ['D6', 2], ['C6', 5],
  ], CHIME),
  ...tune(0.3, [['C3', 2], ['G3', 2], ['C3', 2], ['G3', 2], ['F3', 2], ['G3', 2], ['C3', 2]], BASS, 0.45),
];

/** Gran Vals, Francisco Tárrega, 1902. Four bars of it rang in every pocket in 1999. */
const granVals = tune(0.13, [
  ['E6', 1], ['D6', 1], ['F#5', 2], ['G#5', 2],
  ['C#6', 1], ['B5', 1], ['D5', 2], ['E5', 2],
  ['B5', 1], ['A5', 1], ['C#5', 2], ['E5', 2],
  ['A5', 6],
], { wave: 'square', gain: 0.13, filter: 2600 });

/** Bach's Toccata and Fugue in D minor: the spooky-organ button on every keyboard. */
const toccata: ChipNote[] = [
  ...tune(0.11, [
    ['A5', 1], ['G5', 1], ['A5', 6], [null, 2],
    ['G5', 1], ['F5', 1], ['E5', 1], ['D5', 1], ['C#5', 4], ['D5', 8], [null, 3],
    ['A4', 1], ['G4', 1], ['A4', 6], [null, 2],
    ['E4', 2], ['F4', 2], ['C#4', 2], ['D4', 8],
  ], ORGAN),
  ...tune(0.11, [['A4', 8], [null, 2], ['C#4', 4], ['D4', 8]], { ...ORGAN, gain: 0.05 }, 0.88),
  { f: hz('D2'), t: 2.2, d: 3.2, wave: 'triangle', gain: 0.18, filter: 300 },
];

/** In the Hall of the Mountain King, Grieg, 1875. Sneaking music, getting faster. */
const mountainKing = [
  ...tune(0.17, [
    ['A3', 1], ['B3', 1], ['C4', 1], ['D4', 1], ['E4', 1], ['C4', 1], ['E4', 2],
    ['D#4', 1], ['B3', 1], ['D#4', 2], ['D4', 1], ['A#3', 1], ['D4', 2],
  ], { wave: 'square', gain: 0.15, filter: 1100 }),
  ...tune(0.13, [
    ['A3', 1], ['B3', 1], ['C4', 1], ['D4', 1], ['E4', 1], ['C4', 1], ['E4', 1], ['A4', 1],
    ['G4', 1], ['E4', 1], ['C4', 1], ['E4', 1], ['G4', 4],
  ], { wave: 'square', gain: 0.17, filter: 1500 }, 2.38),
];

/** The organ at the ballgame. Everybody yells the last note. */
const charge = tune(0.16, [
  ['G4', 1], ['C5', 1], ['E5', 1], ['G5', 2], ['E5', 1], ['G5', 5],
], { wave: 'square', gain: 0.17, filter: 2200 });

/** Take Me Out to the Ball Game (1908). */
const ballGame = tune(0.22, [
  ['C5', 2], ['C6', 1], ['A5', 1], ['G5', 1], ['E5', 1], ['G5', 3], ['D5', 3],
], ORGAN);

/** Pop Goes the Weasel: the crank on the jack-in-the-box. The lid flies on POP. */
const weasel: ChipNote[] = [
  ...tune(0.17, [
    ['C5', 2], ['F5', 1], ['F5', 1], ['G5', 1], ['G5', 1], ['A5', 1], ['C6', 1], ['A5', 1], ['F5', 2],
    ['C5', 1], ['F5', 1], ['F5', 1], ['G5', 1], ['G5', 1], ['A5', 3], ['F5', 1], ['C5', 2],
    [null, 1], ['D6', 2], ['G5', 1], ['A#5', 1], ['A5', 1], ['F5', 3],
  ], CHIME),
  { f: 600, t: 4.0, d: 0.18, wave: 'noise', gain: 0.12, filter: 2400 },
];

/** La Cucaracha, the folk song that lived in somebody's uncle's car horn. */
const cucaracha = tune(0.13, [
  ['C5', 1], ['C5', 1], ['C5', 1], ['F5', 3], ['A5', 2], [null, 1],
  ['C5', 1], ['C5', 1], ['C5', 1], ['F5', 3], ['A5', 2], [null, 2],
  ['F5', 1], ['F5', 1], ['E5', 1], ['E5', 1], ['D5', 1], ['D5', 1], ['C5', 4],
], { wave: 'sawtooth', gain: 0.12, filter: 1800 });

/** Shave and a haircut… two bits. The knock that meant a cousin, never a stranger. */
const shaveHaircut = tune(0.2, [
  ['C5', 2], ['G4', 1], ['G4', 1], ['A4', 2], ['G4', 2], [null, 2], ['B4', 2], ['C5', 2],
], { wave: 'triangle', gain: 0.22, filter: 1200 });

/** Für Elise. The music box, the doorbell, the piano lesson you skipped. */
const furElise = tune(0.16, [
  ['E5', 1], ['D#5', 1], ['E5', 1], ['D#5', 1], ['E5', 1], ['B4', 1], ['D5', 1], ['C5', 1], ['A4', 3],
  [null, 1], ['C4', 1], ['E4', 1], ['A4', 1], ['B4', 3],
], CHIME);

/** Happy Birthday (in the public domain since 2016, which is why the restaurant sang something else). */
const birthday = tune(0.22, [
  ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
  ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
], { wave: 'square', gain: 0.15, filter: 1800 });

// --------------------------------------------------------- the house's real tones

/** North American dial tone: 350 Hz and 440 Hz together. */
const dialTone = dual(350, 440, 0, 3.2, 0.11);

/** Busy signal: 480 + 620 Hz, half a second on, half off. */
const busySignal = [0, 1, 2, 3].flatMap(i => dual(480, 620, i, 0.5, 0.11));

/** Somebody else's phone ringing: 440 + 480 Hz, two seconds on. */
const ringback = [...dual(440, 480, 0, 2, 0.1), ...dual(440, 480, 4, 1.2, 0.1)];

/** The three rising beeps before "we're sorry, the number you have reached…". */
const sitTones: ChipNote[] = [
  { f: 913.8, t: 0, d: 0.274, wave: 'sine', gain: 0.16 },
  { f: 1370.6, t: 0.29, d: 0.274, wave: 'sine', gain: 0.16 },
  { f: 1776.7, t: 0.58, d: 0.38, wave: 'sine', gain: 0.16 },
];

/** Left the phone off the hook too long: four tones, pulsing, and very rude about it. */
const howler = Array.from({ length: 16 }, (_, i) => i * 0.2).flatMap(t => [
  { f: 1400, t, d: 0.1, wave: 'sine' as const, gain: 0.06 },
  { f: 2060, t, d: 0.1, wave: 'sine' as const, gain: 0.06 },
  { f: 2450, t, d: 0.1, wave: 'sine' as const, gain: 0.05 },
  { f: 2600, t, d: 0.1, wave: 'sine' as const, gain: 0.05 },
]);

const DTMF: Record<string, [number, number]> = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
};

/** Touch-tone keypad: the real pair of frequencies for every digit. */
function dial(number: string, gap = 0.26): ChipNote[] {
  return [...number].filter(c => DTMF[c]).flatMap((c, i) => {
    const [low, high] = DTMF[c];
    return dual(low, high, i * gap + (i >= 3 ? 0.18 : 0), 0.16, 0.1);
  });
}

/** Emergency Broadcast System attention signal: 853 + 960 Hz. "This is only a test." */
const ebsTone = dual(853, 960, 0, 4.5, 0.09);

/** The 1 kHz tone under the color bars after the station signed off. */
const signOff: ChipNote[] = [{ f: 1000, t: 0, d: 3.5, wave: 'sine', gain: 0.1 }];

// ----------------------------------------------------- house cues for the board

/** Rerun Board: tiles flip up across the table. */
const boardFill: ChipNote[] = Array.from({ length: 12 }, (_, i) => ({
  f: hz(['C5', 'E5', 'G5', 'C6'][i % 4]) * (i >= 8 ? 2 : 1),
  t: i * 0.06,
  d: 0.08,
  wave: 'square' as const,
  gain: 0.1,
  filter: 2600,
}));

/** The hidden double tile. A siren-y laser drop, ours. */
const dailyDouble: ChipNote[] = [
  { f: 1800, t: 0, d: 0.45, wave: 'square', gain: 0.12, filter: 3000, slide: 300 },
  { f: 1200, t: 0.1, d: 0.45, wave: 'square', gain: 0.08, filter: 2500, slide: 200 },
  ...tune(0.1, [['C6', 1], ['G5', 1], ['C6', 1], ['E6', 3]], { wave: 'square', gain: 0.14, filter: 3000 }, 0.6),
];

/** Pencils-down clock while everyone writes an answer. Original, tick-tock in a major key. */
const thinkClock: ChipNote[] = Array.from({ length: 16 }, (_, i) => [
  { f: i % 2 ? 1500 : 1900, t: i * 0.25, d: 0.03, wave: 'square' as const, gain: 0.06, filter: 4000 },
  ...(i % 4 === 0
    ? [{ f: hz(['C4', 'F4', 'G4', 'C4'][i / 4]), t: i * 0.25, d: 0.9, wave: 'triangle' as const, gain: 0.12, filter: 700 }]
    : []),
]).flat();

export const CHIP_TUNES: Record<string, ChipNote[]> = {
  mario_run: marioRun,
  zelda_cave: zeldaCave,
  cyber_boss: cyberBoss,
  arcade_rush: arcadeRush,
  spooky_organ: spookyOrgan,
  korobeiniki,
  entertainer,
  gran_vals: granVals,
  toccata,
  mountain_king: mountainKing,
  charge,
  ball_game: ballGame,
  weasel,
  cucaracha,
  shave_haircut: shaveHaircut,
  fur_elise: furElise,
  birthday,
  dial_tone: dialTone,
  busy_signal: busySignal,
  ringback,
  sit_tones: sitTones,
  howler,
  jenny: dial('8675309'),
  ebs: ebsTone,
  sign_off: signOff,
  board_fill: boardFill,
  daily_double: dailyDouble,
  think_clock: thinkClock,
};

export const DEFAULT_TUNE = 'mario_run';

export function tuneLength(id: string): number {
  const notes = CHIP_TUNES[id] ?? CHIP_TUNES[DEFAULT_TUNE];
  return notes.reduce((max, note) => Math.max(max, note.t + note.d), 0);
}
