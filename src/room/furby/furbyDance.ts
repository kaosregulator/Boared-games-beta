import type { FurbyTag } from './furbyAudio';

/**
 * The Furby Boom's party on the card table, as a script. The Boom is not
 * on the table until "Dance with Boom": it waddles in from the back corner,
 * the two of them talk side by side and ask each other to dance, the lights
 * go strobe red and blue while they dance, then they talk it over until
 * pack-up, when the Boom waddles back off.
 *
 * Table-local units: x right, z towards the player's seat, y up, origin at
 * the table centre. One unit is about a metre.
 */

export type Vec3 = [number, number, number];

/** Where the Boom starts its walk: the back corner of the table. */
export const BOOM_FROM: Vec3 = [0.62, 0, -0.3];
/**
 * Where the Boom stops, back and to the right of the grey Furby at
 * (0.06, 0, 0.22). The Boom rig carries its own box on its left, about 0.14
 * to 0.41 to the side; parked here that box stands behind the grey Furby
 * instead of around him, and clear of his display box.
 */
export const BOOM_SPOT: Vec3 = [0.36, 0, -0.08];

export const ENTER_SEC = 3.2;
export const LEAVE_SEC = 2.8;
export const DANCE_SEC = 8;

export interface Shot {
  target: Vec3;
  yaw: number;
  pitch: number;
  dist: number;
}

export const SHOTS = {
  /** Both Furbies in the frame. */
  wide: { target: [0.24, 0.1, 0.08], yaw: 0, pitch: 0.5, dist: 0.9 },
  /** Close on the grey Furby. */
  furby: { target: [0.06, 0.09, 0.22], yaw: 0.28, pitch: 0.2, dist: 0.3 },
  /** Close on the Boom. */
  boom: { target: [0.45, 0.09, -0.12], yaw: -0.28, pitch: 0.2, dist: 0.3 },
  /** Dolly in on the pair while they dance. */
  dance: { target: [0.25, 0.1, 0.06], yaw: 0.0, pitch: 0.32, dist: 0.62 },
  /** Slow push-in for a punchline. */
  push: { target: [0.25, 0.1, 0.07], yaw: 0.12, pitch: 0.24, dist: 0.62 },
} satisfies Record<string, Shot>;

export type ShotName = keyof typeof SHOTS;

export interface Beat {
  /** Seconds into the talk. */
  at: number;
  who: 'furby' | 'boom';
  furbish: string;
  english: string;
  tag: FurbyTag;
  cam: ShotName;
}

/** Before the dance: the hello, the feathers, the ask. */
export const TALK_BEFORE: { dur: number; beats: Beat[] } = {
  dur: 25,
  beats: [
    { at: 0, who: 'furby', furbish: 'Booo-ma! Wah-dul?', english: 'Boom! Nice entrance. Did you waddle the whole way?', tag: 'talk', cam: 'furby' },
    { at: 3.4, who: 'boom', furbish: 'Doo-doo bah! Glee-tah!', english: 'Three steps, one spin, and a sprinkle of glitter. Classic.', tag: 'chirp', cam: 'boom' },
    { at: 6.4, who: 'furby', furbish: 'Fuh-fuh? Mol-ting?', english: 'Wait, is that a feather? Are you molting?', tag: 'story', cam: 'wide' },
    { at: 9.6, who: 'boom', furbish: 'Lye-fah-styll!', english: 'Stripes are not molting. Stripes are a lifestyle.', tag: 'talk', cam: 'push' },
    { at: 12.8, who: 'furby', furbish: 'Mee grey. Box. Nope.', english: "I'm a grey Furby in a window box. Nobody asks me to be a lifestyle.", tag: 'talk', cam: 'furby' },
    { at: 16.2, who: 'boom', furbish: 'Oh-ld! Nine-tee-eight!', english: "You're from the old time, huh? Your ears still say 1998.", tag: 'laugh', cam: 'boom' },
    { at: 19.6, who: 'furby', furbish: 'Boom! Bah-nee!', english: "Your ears say BOOM. That's not a name. That's a sneeze.", tag: 'laugh', cam: 'furby' },
    { at: 23.0, who: 'boom', furbish: 'Dance? Dah-nce?', english: 'Okay, Mr. Window Box. Want to dance?', tag: 'sing', cam: 'wide' },
  ],
};

/** The dance: a strobe show and a dolly-in on the pair. Nobody talks. */
export const DANCE_CAM: ShotName = 'dance';

/** After the dance: the joke round, with camera moves between them. */
export const TALK_AFTER: { dur: number; beats: Beat[] } = {
  dur: 24,
  beats: [
    { at: 0, who: 'furby', furbish: 'Yoo-ka! Hap-pee!', english: 'Okay, be honest. Was that a dance, or did you just wobble?', tag: 'happy', cam: 'furby' },
    { at: 3.2, who: 'boom', furbish: 'Mee wob-bull!', english: 'I wobbled. Wobbling is a dance if you mean it.', tag: 'chirp', cam: 'boom' },
    { at: 6.4, who: 'furby', furbish: 'Ha-ha-ha!', english: 'Spectacular. Very wobbly. I would give you a nine.', tag: 'laugh', cam: 'push' },
    { at: 9.8, who: 'boom', furbish: 'Nine? Nine is a Furby number.', english: "Nine? That's a Furby score. I wanted a Boom score.", tag: 'talk', cam: 'boom' },
    { at: 13.2, who: 'furby', furbish: 'Oooh, uh-oh!', english: 'My ears are still ringing from the strobe lights.', tag: 'uhoh', cam: 'wide' },
    { at: 16.4, who: 'boom', furbish: 'Ha! Bring glow sticks next time.', english: 'Next time, bring glow sticks. And a bigger box.', tag: 'laugh-long', cam: 'push' },
    { at: 20.0, who: 'furby', furbish: 'Bye-bye, Boom!', english: "Okay. Pack-up is coming. Don't waddle on the way out.", tag: 'hello', cam: 'furby' },
  ],
};

/** Which strobe colour is on at this moment of the dance, or none. Three flashes a second, alternating red and blue. */
export function strobeAt(t: number): 'red' | 'blue' | null {
  const step = Math.floor(t * 6) % 4;
  if (step === 0) return 'red';
  if (step === 2) return 'blue';
  return null;
}

/**
 * The Boom's walk: it heads from the corner to its spot, swaying side to side
 * the way a waddle does. Returns where it is and which way it faces.
 */
export function boomWalk(from: Vec3, to: Vec3, p: number, t: number) {
  const k = Math.min(1, Math.max(0, p));
  const x = from[0] + (to[0] - from[0]) * k;
  const z = from[2] + (to[2] - from[2]) * k;
  const heading = Math.atan2(to[0] - from[0], to[2] - from[2]);
  // Face the way it walks, then square up to the table once it arrives.
  const yaw = k < 1 ? heading : 0;
  const sway = Math.sin(t * 9) * 0.1 * (k < 1 ? 1 : 0);
  const bob = Math.abs(Math.sin(t * 9)) * 0.012 * (k < 1 ? 1 : 0);
  return { x, z, yaw, sway, bob };
}

/** Bounce for the dance, quick on the beat; a bigger hop while the Boom talks. */
export function boomBounce(t: number, talking: boolean) {
  const hop = Math.abs(Math.sin(t * Math.PI * 2.2));
  return hop * (talking ? 0.035 : 0.02);
}
