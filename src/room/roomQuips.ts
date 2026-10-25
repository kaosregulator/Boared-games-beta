import { LAYOUT } from './roomLayout';
import { BED_BOUNDS, BED_CLEAR } from './hotwheels/world';

/**
 * Things you say to yourself while you're a toy in the room: an army man
 * walking the floor or flying the chopper, a Hot Wheels car under the bed,
 * a sniper glassing the room through his scope. Each spot has a handful of
 * lines; they come out now and then, never the same one twice running, and
 * a spot goes quiet for a while after it's had its say.
 */

export type QuipWho = 'walk' | 'fly' | 'car' | 'scope';

export interface QuipSpot {
  id: string;
  /** Which kinds of toy say these. */
  who: QuipWho[];
  /** Inside this box on the floor plan (x, z), between these heights. Null: anywhere. */
  area: null | { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number };
  /** Some lines come in two parts: the joke, then the catch a beat later. */
  lines: (string | [string, string])[];
}

const plate = LAYOUT.hotpockets;
const PLATE_R = 0.32;

/** The usual suspects in a 90s bedroom. */
const LOST = ['Game Boy', 'Tamagotchi', 'other Jordan', 'Pog slammer', 'Ninja Turtle', 'Super Soaker cap'];

export const QUIP_SPOTS: QuipSpot[] = [
  {
    id: 'under-bed',
    who: ['walk', 'car'],
    area: { minX: BED_BOUNDS.minX, maxX: BED_BOUNDS.maxX, minZ: BED_BOUNDS.minZ, maxZ: BED_BOUNDS.maxZ, minY: -1, maxY: BED_CLEAR },
    lines: [
      ...LOST.slice(0, 3).map(thing => `Oh, THAT's where my ${thing} went! I've been looking everywhere for that.`),
      [
        "Man, hope Mom doesn't see this. I told her I cleaned my room last week. Really I just swept it all under here… and some in the closet.",
        "Oh yeah. I keep forgetting. We don't have a closet.",
      ],
      "Is that a sock or a creature? …It's both. It's a sock creature.",
      "It's like an archaeological dig under here. Hello, 1997.",
      [`Found a ${LOST[3]}! Finders keepers.`, "Wait, it's sticky. Finders… weepers."],
      'A dust bunny the size of a tank. Nobody make any sudden moves.',
    ],
  },
  {
    id: 'hot-pockets',
    who: ['walk', 'car'],
    area: { minX: plate.x - PLATE_R, maxX: plate.x + PLATE_R, minZ: plate.z - PLATE_R, maxZ: plate.z + PLATE_R, minY: -1, maxY: 0.4 },
    lines: [
      ["Ewww. I wonder how long that's been there.", "Oh well. I'll still eat it. It's a pizza roll."],
      'Is that a Hot Pocket or a fossil? Either way, dibs.',
      'Day three of the Hot Pocket. I think it is watching me.',
      'Lava on the edges, ice in the middle. A classic.',
      'Five-second rule. In army-man time that was four days ago. Still counts.',
      ["Smells like pepperoni and bad decisions.", 'My favorite kind.'],
    ],
  },
  {
    id: 'flying',
    who: ['fly'],
    area: null,
    lines: [
      ['Man, this room needs some cleaning. Better shove it all in the closet.', "Wait… we don't have a closet."],
      "Is that the floor down there? I haven't seen the floor since 1996.",
      'Note to self: never fly low over the laundry pile again.',
      'From up here the mess looks almost organized. …Nope.',
      'If Mom asks, the chopper came like this.',
      ["Okay, plan: we hide everything under the bed.", "The bed is full. The bed has been full since Christmas."],
    ],
  },
  {
    id: 'scope',
    who: ['scope'],
    area: null,
    lines: [
      'Through this scope I can see every crumb in the carpet. There are a LOT of crumbs.',
      "I spy, with my little scope, a sock that's been there since Christmas.",
      'Duck or dust bunny? Shoot first, vacuum later.',
      ['Scanning the room… mess, mess, more mess.', 'Oh hey, a Hot Pocket.'],
      'I can see the closet from here. Oh wait. We still don’t have one.',
    ],
  },
  {
    id: 'car',
    who: ['car'],
    area: null,
    lines: [
      'Zero to sixty in a bedroom. Nobody tell Mom about the burnout marks.',
      'I am speed. I am also two inches long.',
      'Watch out for the LEGO. The LEGO always wins.',
      ['This room is a racetrack if you squint.', 'And ignore the laundry.'],
    ],
  },
];

export interface QuipLine {
  spot: string;
  text: string;
  /** The catch, said a beat after the first part. */
  then?: string;
}

export interface QuipOptions {
  /** Least seconds between any two quips. */
  gap: number;
  /** A spot stays quiet this long after it speaks. */
  cooldown: number;
  /** Chance per second of speaking once the gap is up (so it isn't clockwork). */
  chance: number;
  /** Random source, swappable for tests. */
  random?: () => number;
}

const DEFAULTS: QuipOptions = { gap: 14, cooldown: 40, chance: 0.18 };

function inside(spot: QuipSpot, x: number, y: number, z: number) {
  const a = spot.area;
  if (!a) return true;
  return x >= a.minX && x <= a.maxX && z >= a.minZ && z <= a.maxZ && y >= a.minY && y <= a.maxY;
}

/** Hands out quips as you move about. One per toy (army man, car…). */
export class Quipper {
  private opts: QuipOptions;
  private since = 0;
  private quiet = new Map<string, number>();
  /** Lines still unsaid in this pass through each spot. */
  private bags = new Map<string, number[]>();
  private last = new Map<string, number>();
  private wasIn = new Set<string>();

  constructor(opts: Partial<QuipOptions> = {}) {
    this.opts = { ...DEFAULTS, ...opts };
    // Don't open with a joke the moment you arrive.
    this.since = this.opts.gap * 0.5;
  }

  private rand() {
    return (this.opts.random ?? Math.random)();
  }

  private draw(spot: QuipSpot) {
    let bag = this.bags.get(spot.id);
    if (!bag || bag.length === 0) {
      bag = spot.lines.map((_, i) => i);
      // Shuffle; never start a new pass on the line that ended the last one.
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.rand() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      const prev = this.last.get(spot.id);
      if (bag.length > 1 && bag[bag.length - 1] === prev) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      this.bags.set(spot.id, bag);
    }
    const i = bag.pop()!;
    this.last.set(spot.id, i);
    const line = spot.lines[i];
    return typeof line === 'string' ? { spot: spot.id, text: line } : { spot: spot.id, text: line[0], then: line[1] };
  }

  /** Call every frame. Returns a quip when it's time to say one. */
  tick(dt: number, who: QuipWho, x: number, y: number, z: number): QuipLine | null {
    this.since += dt;
    for (const [id, t] of this.quiet) this.quiet.set(id, t - dt);
    const here = QUIP_SPOTS.filter(s => s.who.includes(who) && inside(s, x, y, z));
    // Walking into a place is the moment to say something about it.
    const fresh = here.filter(s => s.area && !this.wasIn.has(s.id));
    this.wasIn = new Set(here.map(s => s.id));
    if (this.since < this.opts.gap) return null;
    const ready = here.filter(s => (this.quiet.get(s.id) ?? 0) <= 0);
    if (!ready.length) return null;
    const placed = ready.filter(s => s.area);
    const pool = fresh.length ? fresh.filter(s => ready.includes(s)) : placed.length ? placed : ready;
    if (!pool.length) return null;
    if (!fresh.length && this.rand() > this.opts.chance * dt) return null;
    const spot = pool[Math.floor(this.rand() * pool.length)];
    this.since = 0;
    this.quiet.set(spot.id, this.opts.cooldown);
    return this.draw(spot);
  }
}

/** Seconds a quip stays up, long enough to read. */
export function quipSeconds(text: string) {
  return Math.min(7, 2 + text.length * 0.045);
}
