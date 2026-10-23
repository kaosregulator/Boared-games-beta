/**
 * Original 8-bit cues for Throwback Trivia. These are written for this room.
 * They borrow the *feeling* of a platformer, a cave, a boss, a Saturday bumper —
 * not the notes of anyone's published theme.
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

const lead = (f: number, t: number, d: number, gain = 0.16): ChipNote => ({ f, t, d, wave: 'square', gain, filter: 1400 });
const soft = (f: number, t: number, d: number, gain = 0.1): ChipNote => ({ f, t, d, wave: 'triangle', gain, filter: 900 });
const bass = (f: number, t: number, d: number): ChipNote => ({ f, t, d, wave: 'triangle', gain: 0.2, filter: 420 });
const sine = (f: number, t: number, d: number, gain = 0.14): ChipNote => ({ f, t, d, wave: 'sine', gain, filter: 2200 });

/** A bouncy hop. Not the plumber's song — a new one, in that shoes-off feeling. */
const platformHop: ChipNote[] = [
  lead(392, 0, 0.16),
  lead(440, 0.18, 0.16),
  lead(523.25, 0.36, 0.18),
  lead(659.25, 0.56, 0.26, 0.18),
  lead(587.33, 0.86, 0.16),
  lead(523.25, 1.04, 0.16),
  lead(440, 1.22, 0.3),
  lead(392, 1.56, 0.16),
  lead(659.25, 1.76, 0.34, 0.18),
  lead(523.25, 2.16, 0.42),
  soft(329.63, 0.56, 0.26, 0.07),
  soft(293.66, 1.22, 0.3, 0.07),
  soft(523.25, 1.76, 0.34, 0.07),
  bass(130.81, 0, 0.34),
  bass(196, 0.56, 0.28),
  bass(174.61, 1.22, 0.3),
  bass(130.81, 1.76, 0.7),
];

/**
 * The old cave arpeggio, kept and thickened: a drone under it, a softer second
 * voice, and an answering phrase that wanders back down.
 */
const zeldaCave: ChipNote[] = [
  sine(440, 0, 0.22, 0.13),
  sine(493.88, 0.24, 0.22, 0.13),
  sine(523.25, 0.48, 0.22, 0.14),
  sine(659.25, 0.72, 0.42, 0.15),
  sine(587.33, 1.18, 0.22, 0.13),
  sine(523.25, 1.42, 0.22, 0.13),
  sine(493.88, 1.66, 0.5, 0.14),
  soft(220, 0, 2.2, 0.08),
  soft(329.63, 0.72, 0.42, 0.06),
  sine(392, 2.3, 0.24, 0.12),
  sine(440, 2.56, 0.24, 0.12),
  sine(493.88, 2.82, 0.28, 0.13),
  sine(523.25, 3.14, 0.36, 0.14),
  sine(440, 3.54, 0.7, 0.13),
  bass(110, 2.3, 1.9),
];

/** Fast minor bass from the old boss cue, now with a lead stabbing over it. */
const cyberBoss: ChipNote[] = [
  bass(110, 0, 0.12),
  bass(220, 0.14, 0.12),
  bass(164.81, 0.28, 0.12),
  bass(329.63, 0.42, 0.12),
  bass(293.66, 0.58, 0.18),
  bass(220, 0.8, 0.28),
  bass(110, 1.16, 0.12),
  bass(220, 1.3, 0.12),
  bass(164.81, 1.44, 0.12),
  bass(329.63, 1.58, 0.12),
  bass(246.94, 1.74, 0.16),
  bass(196, 1.94, 0.36),
  lead(440, 0.14, 0.1, 0.1),
  lead(466.16, 0.42, 0.1, 0.11),
  lead(523.25, 0.58, 0.16, 0.12),
  lead(392, 1.3, 0.1, 0.1),
  lead(493.88, 1.58, 0.18, 0.12),
  lead(311.13, 1.94, 0.28, 0.1),
];

/** The old rising run, played twice, the second time with a friend a fourth below. */
const arcadeRush: ChipNote[] = [
  lead(523.25, 0, 0.09, 0.14),
  lead(587.33, 0.1, 0.09, 0.14),
  lead(659.25, 0.2, 0.09, 0.14),
  lead(783.99, 0.3, 0.09, 0.15),
  lead(880, 0.4, 0.09, 0.15),
  lead(1046.5, 0.5, 0.22, 0.16),
  soft(392, 0.1, 0.09, 0.07),
  soft(440, 0.2, 0.09, 0.07),
  soft(523.25, 0.3, 0.09, 0.07),
  soft(587.33, 0.4, 0.09, 0.07),
  soft(659.25, 0.5, 0.22, 0.08),
  lead(523.25, 0.86, 0.09, 0.14),
  lead(659.25, 0.96, 0.09, 0.14),
  lead(783.99, 1.06, 0.09, 0.15),
  lead(1046.5, 1.16, 0.28, 0.16),
  bass(130.81, 0, 0.4),
  bass(196, 0.5, 0.3),
  bass(261.63, 1.16, 0.4),
];

/** A little organ in a minor key. For the hallway after the porch light. */
const spookyOrgan: ChipNote[] = [
  sine(146.83, 0, 1.1, 0.12),
  sine(174.61, 0, 1.1, 0.08),
  sine(220, 0, 1.1, 0.07),
  sine(220, 1.2, 1.2, 0.12),
  sine(261.63, 1.2, 1.2, 0.08),
  sine(329.63, 1.2, 1.2, 0.06),
  sine(174.61, 2.5, 1.4, 0.12),
  sine(220, 2.5, 1.4, 0.08),
  sine(261.63, 2.5, 1.4, 0.07),
  soft(73.42, 0, 3.9, 0.1),
];

/** Two close sines beating, the way a sodium lamp hums when it catches. */
const duskHum: ChipNote[] = [
  sine(174, 0, 4.2, 0.1),
  sine(178, 0, 4.2, 0.08),
  sine(87, 0, 4.2, 0.12),
  { f: 800, t: 0.4, d: 0.35, wave: 'noise', gain: 0.04, filter: 1400 },
  { f: 800, t: 1.6, d: 0.5, wave: 'noise', gain: 0.035, filter: 1600 },
  { f: 800, t: 2.8, d: 0.7, wave: 'noise', gain: 0.04, filter: 1800 },
];

/** Metal bell, then the lower one that means line up. */
const recessBell: ChipNote[] = [
  sine(880, 0, 0.55, 0.16),
  sine(882.5, 0, 0.55, 0.08),
  sine(1760, 0, 0.2, 0.05),
  sine(659.25, 0.7, 0.7, 0.15),
  sine(661, 0.7, 0.7, 0.07),
  sine(1318.5, 0.7, 0.18, 0.04),
];

/** Chirps and a sweep. An impression of a modem, not a recording of one. */
const dialup: ChipNote[] = [
  { f: 900, t: 0, d: 0.12, wave: 'sawtooth', gain: 0.08, filter: 2400, slide: 1800 },
  { f: 1400, t: 0.16, d: 0.1, wave: 'square', gain: 0.06, filter: 2600 },
  { f: 700, t: 0.32, d: 0.18, wave: 'sawtooth', gain: 0.07, filter: 2000, slide: 2200 },
  { f: 400, t: 0.2, d: 0.5, wave: 'noise', gain: 0.05, filter: 3000 },
  { f: 1200, t: 0.7, d: 0.25, wave: 'square', gain: 0.06, filter: 2800, slide: 600 },
  { f: 500, t: 1.05, d: 0.3, wave: 'noise', gain: 0.05, filter: 3200 },
  { f: 1800, t: 1.4, d: 0.2, wave: 'sawtooth', gain: 0.05, filter: 3000, slide: 900 },
  { f: 440, t: 1.7, d: 0.45, wave: 'triangle', gain: 0.08, filter: 800 },
];

/** Slow, on purpose. The porch light, the walk back. */
const heartPorch: ChipNote[] = [
  sine(261.63, 0, 0.55, 0.14),
  sine(329.63, 0.6, 0.5, 0.14),
  sine(392, 1.15, 0.75, 0.15),
  sine(329.63, 2.0, 0.45, 0.13),
  sine(440, 2.55, 0.55, 0.14),
  sine(392, 3.2, 0.5, 0.13),
  sine(349.23, 3.8, 0.45, 0.13),
  sine(293.66, 4.35, 0.9, 0.14),
  sine(261.63, 5.4, 1.3, 0.15),
  soft(130.81, 0, 6.6, 0.07),
  soft(196, 2.55, 1.2, 0.05),
];

/** A made-up Saturday ident. Bright, short, then it's gone. */
const saturday: ChipNote[] = [
  lead(523.25, 0, 0.12, 0.14),
  lead(659.25, 0.14, 0.12, 0.14),
  lead(783.99, 0.28, 0.12, 0.15),
  lead(1046.5, 0.42, 0.28, 0.16),
  soft(261.63, 0, 0.7, 0.08),
  soft(329.63, 0.14, 0.56, 0.06),
  bass(130.81, 0, 0.28),
  bass(196, 0.42, 0.4),
  lead(783.99, 0.85, 0.12, 0.13),
  lead(1046.5, 0.99, 0.35, 0.15),
];

export const CHIP_TUNES: Record<string, ChipNote[]> = {
  platform_hop: platformHop,
  mario_run: platformHop,
  zelda_cave: zeldaCave,
  cyber_boss: cyberBoss,
  arcade_rush: arcadeRush,
  spooky_organ: spookyOrgan,
  dusk_hum: duskHum,
  recess_bell: recessBell,
  dialup,
  heart_porch: heartPorch,
  saturday,
};

export function tuneLength(id: string): number {
  const notes = CHIP_TUNES[id] ?? CHIP_TUNES.platform_hop;
  return notes.reduce((max, note) => Math.max(max, note.t + note.d), 0);
}
