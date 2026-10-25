/**
 * The endless I Spy book. Every time it is opened a new page is made from a
 * seed: a theme for the difficulty, a carpet full of toys scattered the way
 * a kid would dump a toy box, and a riddle naming the ones to find. The same
 * seed always makes the same page, so a page can be shared or tested.
 *
 * Pure data, no three.js: the 3D side (items.ts, ISpyGame.tsx) reads this.
 */

export type Difficulty = 'easy' | 'medium' | 'hard';

export type ColorName =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'white'
  | 'black'
  | 'gold'
  | 'silver'
  | 'brown';

export const COLORS: Record<ColorName, string> = {
  red: '#d7263d',
  orange: '#f28c28',
  yellow: '#f6d32d',
  green: '#3fa34d',
  blue: '#2f6fd6',
  purple: '#7d4cc2',
  pink: '#f27eb5',
  white: '#f3efe6',
  black: '#26232b',
  gold: '#d4a531',
  silver: '#b9c0c8',
  brown: '#8a5a33',
};

export type KindId =
  | 'marble'
  | 'yoyo'
  | 'die'
  | 'crayon'
  | 'block'
  | 'ball'
  | 'car'
  | 'duck'
  | 'robot'
  | 'cube'
  | 'tamagotchi'
  | 'etch'
  | 'jumprope'
  | 'top'
  | 'jack'
  | 'domino'
  | 'button'
  | 'key'
  | 'coin'
  | 'star'
  | 'heart'
  | 'egg'
  | 'cake'
  | 'cupcake'
  | 'lollipop'
  | 'candy'
  | 'cherry'
  | 'eightball'
  | 'number'
  | 'crown'
  | 'rocket'
  | 'pencil'
  | 'spool'
  | 'thimble'
  | 'bell'
  | 'shell'
  | 'fish'
  | 'apple'
  | 'mushroom'
  | 'pumpkin'
  | 'ghost'
  | 'bat'
  | 'moon'
  | 'gem'
  | 'compass'
  | 'anchor'
  | 'boat'
  | 'whistle'
  | 'libraryBook';

export interface KindInfo {
  id: KindId;
  noun: string;
  /** Footprint radius on the carpet, metres, at scale 1. */
  r: number;
  /** Colours it comes in. One colour means the colour never needs saying. */
  colors: ColorName[];
  /** 'letter' and 'number' kinds carry a printed label. */
  label?: 'letter' | 'number';
  /** A sound from the Cake Jam toy box, when the toy has one. */
  sfx?: 'heartbeat' | 'rolling' | 'jumprope' | 'tamagotchi' | 'shake';
}

const K = (id: KindId, noun: string, r: number, colors: ColorName[], extra: Partial<KindInfo> = {}): KindInfo => ({
  id,
  noun,
  r,
  colors,
  ...extra,
});

const BRIGHT: ColorName[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];

export const KINDS: Record<KindId, KindInfo> = {
  marble: K('marble', 'marble', 0.014, ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'white'], { sfx: 'rolling' }),
  yoyo: K('yoyo', 'yo-yo', 0.03, BRIGHT),
  die: K('die', 'die', 0.02, ['white', 'red', 'green', 'black']),
  crayon: K('crayon', 'crayon', 0.04, BRIGHT),
  block: K('block', 'block', 0.026, BRIGHT, { label: 'letter' }),
  ball: K('ball', 'bouncy ball', 0.024, BRIGHT, { sfx: 'rolling' }),
  car: K('car', 'toy car', 0.045, ['red', 'blue', 'yellow', 'green', 'black', 'silver']),
  duck: K('duck', 'rubber duck', 0.035, ['yellow', 'pink', 'blue']),
  robot: K('robot', 'wind-up robot', 0.035, ['silver', 'red', 'blue']),
  cube: K('cube', "Rubik's cube", 0.025, ['white']),
  tamagotchi: K('tamagotchi', 'Tamagotchi', 0.03, ['pink', 'blue', 'purple', 'yellow'], { sfx: 'tamagotchi' }),
  etch: K('etch', 'Etch A Sketch', 0.06, ['red']),
  jumprope: K('jumprope', 'jump rope', 0.07, ['pink', 'blue', 'green', 'yellow'], { sfx: 'jumprope' }),
  top: K('top', 'spinning top', 0.025, BRIGHT),
  jack: K('jack', 'jack', 0.016, ['silver', 'red', 'gold']),
  domino: K('domino', 'domino', 0.025, ['white', 'black']),
  button: K('button', 'button', 0.014, ['red', 'blue', 'yellow', 'white', 'black', 'green', 'pink', 'brown']),
  key: K('key', 'key', 0.03, ['gold', 'silver']),
  coin: K('coin', 'coin', 0.014, ['gold', 'silver']),
  star: K('star', 'star', 0.03, ['yellow', 'gold', 'blue', 'red', 'silver']),
  heart: K('heart', 'heart', 0.025, ['red', 'pink', 'purple'], { sfx: 'heartbeat' }),
  egg: K('egg', 'egg', 0.022, ['white', 'brown', 'blue']),
  cake: K('cake', 'piece of cake', 0.04, ['pink', 'yellow', 'brown']),
  cupcake: K('cupcake', 'cupcake', 0.028, ['pink', 'blue', 'yellow', 'brown']),
  lollipop: K('lollipop', 'lollipop', 0.04, ['red', 'green', 'purple', 'orange']),
  candy: K('candy', 'wrapped candy', 0.025, ['red', 'green', 'yellow', 'purple', 'orange']),
  cherry: K('cherry', 'cherry', 0.016, ['red']),
  eightball: K('eightball', 'Magic 8 Ball', 0.03, ['black']),
  number: K('number', 'number block', 0.024, ['red', 'blue', 'green', 'yellow', 'orange'], { label: 'number' }),
  crown: K('crown', 'crown', 0.035, ['gold', 'silver']),
  rocket: K('rocket', 'rocket', 0.04, ['red', 'white', 'blue']),
  pencil: K('pencil', 'pencil', 0.05, ['yellow', 'red', 'blue', 'green']),
  spool: K('spool', 'spool of thread', 0.02, BRIGHT),
  thimble: K('thimble', 'thimble', 0.012, ['silver', 'gold']),
  bell: K('bell', 'bell', 0.022, ['gold', 'silver', 'red']),
  shell: K('shell', 'seashell', 0.026, ['white', 'pink', 'orange']),
  fish: K('fish', 'fish', 0.035, ['orange', 'blue', 'yellow', 'green']),
  apple: K('apple', 'apple', 0.025, ['red', 'green', 'yellow']),
  mushroom: K('mushroom', 'mushroom', 0.024, ['red', 'brown', 'purple']),
  pumpkin: K('pumpkin', 'pumpkin', 0.03, ['orange', 'white']),
  ghost: K('ghost', 'ghost', 0.025, ['white']),
  bat: K('bat', 'bat', 0.04, ['black', 'purple']),
  moon: K('moon', 'moon', 0.03, ['yellow', 'silver', 'white']),
  gem: K('gem', 'jewel', 0.018, ['red', 'blue', 'green', 'purple', 'pink']),
  compass: K('compass', 'compass', 0.025, ['gold', 'silver']),
  anchor: K('anchor', 'anchor', 0.035, ['black', 'silver', 'gold']),
  boat: K('boat', 'sailboat', 0.045, ['red', 'blue', 'white', 'yellow']),
  whistle: K('whistle', 'whistle', 0.025, ['silver', 'red', 'blue']),
  libraryBook: K('libraryBook', 'library book', 0.045, ['blue']),
};

export interface Theme {
  id: string;
  title: string;
  difficulty: Difficulty;
  /** What the carpet turns into (see carpet.ts). */
  carpet: 'alphabet' | 'gingham' | 'beach' | 'chalkboard' | 'spooky' | 'patchwork' | 'starry';
  kinds: KindId[];
  /** Room lights go out and only the carpet light is left. */
  dim: boolean;
  /** Colour of the lamp pulled down over the carpet. */
  light: string;
  openers: string[];
  closers: string[];
}

const TOYS: KindId[] = ['marble', 'yoyo', 'die', 'crayon', 'block', 'ball', 'car', 'duck', 'robot', 'cube', 'top', 'star', 'heart', 'button', 'jumprope', 'etch', 'tamagotchi', 'eightball'];

export const THEMES: Theme[] = [
  {
    id: 'toybox',
    title: 'I Spy Toy Box',
    difficulty: 'easy',
    carpet: 'alphabet',
    kinds: TOYS,
    dim: false,
    light: '#fff1dc',
    openers: ['Dump out the toy box all over the floor,', 'Blocks on the play mat and toys by the door,', 'Look on the carpet, look all around,'],
    closers: ['and the library book that never got found!', 'and a library book that is way overdue!', 'and the book from the library, still not returned!'],
  },
  {
    id: 'cakejam',
    title: 'I Spy Cake Jam',
    difficulty: 'easy',
    carpet: 'gingham',
    kinds: ['cake', 'cupcake', 'egg', 'heart', 'eightball', 'marble', 'lollipop', 'candy', 'cherry', 'tamagotchi', 'robot', 'jumprope', 'etch', 'cube', 'yoyo', 'star'],
    dim: false,
    light: '#ffe4ef',
    openers: ['Robert the Robot spilled the whole jar,', 'Frosting and sprinkles, how sticky things are,', 'Sweets on the carpet from the bake sale today,'],
    closers: ['and a library book with frosting on page two!', 'and the library book you said you returned in May!', 'and a library book that is sticky and late!'],
  },
  {
    id: 'treasure',
    title: 'I Spy Treasure Hunt',
    difficulty: 'medium',
    carpet: 'beach',
    kinds: ['coin', 'gem', 'key', 'compass', 'anchor', 'shell', 'fish', 'boat', 'crown', 'bell', 'marble', 'die', 'button', 'spool', 'thimble', 'star', 'whistle', 'jack'],
    dim: false,
    light: '#ffe2a8',
    openers: ['X marks the spot on the rug by the bed,', 'Shiver me timbers, a map in my head,', 'Dig through the sand where the pirates have been,'],
    closers: ['and a library book buried since 1998!', 'and the library book that the pirates stole too!', 'and a library book worth more than the gold!'],
  },
  {
    id: 'school',
    title: 'I Spy School Days',
    difficulty: 'medium',
    carpet: 'chalkboard',
    kinds: ['pencil', 'crayon', 'block', 'number', 'button', 'apple', 'bell', 'spool', 'die', 'domino', 'marble', 'whistle', 'star', 'key', 'jack', 'top', 'yoyo', 'ball'],
    dim: false,
    light: '#f2fff0',
    openers: ['Pencils are sharpened, the bell is about to ring,', 'Recess is over, so put down that swing,', 'Book fair is Friday and you have no money,'],
    closers: ['and the library book from the book fair, still due!', 'and the library book that the teacher wants too!', 'and a library book with your name in it, overdue!'],
  },
  {
    id: 'spooky',
    title: 'I Spy Spooky Night',
    difficulty: 'hard',
    carpet: 'spooky',
    kinds: ['pumpkin', 'ghost', 'bat', 'moon', 'key', 'candy', 'marble', 'bell', 'mushroom', 'spool', 'coin', 'eightball', 'star', 'button', 'jack', 'gem', 'lollipop', 'cherry'],
    dim: true,
    light: '#9fb6ff',
    openers: ['The lights are all out and the floorboards creak,', 'Something is under the bed, do not peek,', 'A ghost at the window, a bat on the stair,'],
    closers: ['and the library book the librarian haunts for!', 'and a library book that is ten years late, BOO!', 'and the library book... she is coming for you!'],
  },
  {
    id: 'challenger',
    title: 'I Spy Super Challenger',
    difficulty: 'hard',
    carpet: 'patchwork',
    kinds: [...TOYS, 'jack', 'domino', 'key', 'coin', 'spool', 'thimble', 'bell', 'gem', 'pencil', 'whistle', 'number', 'candy', 'shell'],
    dim: false,
    light: '#fff5e6',
    openers: ['Everything, everywhere, all on the floor,', 'The toughest page yet, and there is so much more,', 'Squint really hard at the patchwork below,'],
    closers: ['and the library book that you hid long ago!', 'and a library book with a fine you can not pay!', 'and the library book, now a thousand days late!'],
  },
  {
    id: 'fantasy',
    title: 'I Spy Fantasy',
    difficulty: 'hard',
    carpet: 'starry',
    kinds: ['crown', 'gem', 'moon', 'star', 'rocket', 'mushroom', 'key', 'bell', 'marble', 'heart', 'egg', 'compass', 'coin', 'robot', 'top', 'cube', 'thimble', 'spool'],
    dim: true,
    light: '#c9b8ff',
    openers: ['Out past the moon where the toy rockets fly,', 'A castle of blocks and a dragon nearby,', 'Close your eyes, wish, and then open them wide,'],
    closers: ['and a library book from another galaxy, overdue!', 'and the library book the dragon checked out too!', 'and the library book lost in space since grade two!'],
  },
];

export interface Rules {
  items: number;
  targets: number;
  /** Item scale range. */
  scale: [number, number];
  /** Extra look-alikes made for each target (same toy, other colours). */
  lookAlikes: number;
  /** How much of the carpet the toys spread over (0..1 of each side). */
  spread: number;
  /** Chance a toy lies tipped over. */
  tipped: number;
}

export const RULES: Record<Difficulty, Rules> = {
  easy: { items: 42, targets: 5, scale: [1.9, 2.3], lookAlikes: 0, spread: 0.5, tipped: 0 },
  medium: { items: 96, targets: 7, scale: [1.45, 1.8], lookAlikes: 1, spread: 0.74, tipped: 0.15 },
  hard: { items: 180, targets: 9, scale: [1.1, 1.4], lookAlikes: 2, spread: 0.96, tipped: 0.35 },
};

/**
 * The carpet the game takes over: the open floor between the bed, the
 * dressers, the toy shelf and the bean bag. Room metres; the walk is
 * clamped inside it.
 */
export const CARPET = { x: 0.2, z: -0.45, w: 3.3, d: 3.2 };

/** Where you open your eyes: the south edge of the carpet, looking north. */
export const START = { x: CARPET.x, z: CARPET.z + CARPET.d / 2 - 0.22, heading: Math.PI };

export interface PlacedItem {
  id: number;
  kind: KindId;
  color: ColorName;
  /** Letter or number printed on it. */
  label?: string;
  x: number;
  z: number;
  yaw: number;
  /** Tipped onto its side (radians about its own x). */
  tip: number;
  scale: number;
  radius: number;
}

export interface Puzzle {
  seed: number;
  difficulty: Difficulty;
  theme: Theme;
  items: PlacedItem[];
  /** Item ids in riddle order; the library book is always last. */
  targets: number[];
  /** "a red yo-yo", "the letter Q", ... in riddle order. */
  phrases: string[];
  opener: string;
  closer: string;
}

/** Small fast seeded random (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
const pick = <T,>(r: Rand, list: readonly T[]): T => list[Math.floor(r() * list.length) % list.length];

function shuffle<T>(r: Rand, list: T[]): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

const LETTERS = 'ABCDEFGHIJKLMNOPRSTUVWXYZ'.split('');
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

function article(word: string) {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

/** How the riddle names an item, as specific as it needs to be on this page. */
export function phraseFor(item: PlacedItem, needsColor: boolean): string {
  const info = KINDS[item.kind];
  if (item.kind === 'libraryBook') return 'the overdue library book';
  if (info.label === 'letter' && item.label) return `the letter ${item.label}`;
  if (info.label === 'number' && item.label) return `the number ${NUMBER_WORDS[Number(item.label)] ?? item.label}`;
  if (item.kind === 'eightball') return 'the number eight';
  const noun = info.noun;
  if (!needsColor) return `${article(noun)} ${noun}`;
  return `${article(item.color)} ${item.color} ${noun}`;
}

export function themesFor(difficulty: Difficulty) {
  return THEMES.filter(t => t.difficulty === difficulty);
}

export interface PageOptions {
  /** Where the pile goes (defaults to the bedroom carpet). */
  area?: { x: number; z: number; w: number; d: number };
  rules?: Partial<Rules>;
  /** Pick from every theme, not just the difficulty's. */
  anyTheme?: boolean;
  /** Keep the spot where you open your eyes clear (carpet mode). */
  clearStart?: boolean;
}

/** Lay out one page. Same seed and difficulty, same page. */
export function makePuzzle(seed: number, difficulty: Difficulty, opts: PageOptions = {}): Puzzle {
  const r = rng(seed);
  const rules = { ...RULES[difficulty], ...opts.rules };
  const theme = pick(r, opts.anyTheme ? THEMES : themesFor(difficulty));
  const area = opts.area ?? { x: CARPET.x, z: CARPET.z - 0.08, w: CARPET.w - 0.24, d: CARPET.d - 0.24 };
  const clearStart = opts.clearStart ?? !opts.area;

  // 1. Decide what goes in the pile.
  type Spec = Omit<PlacedItem, 'id' | 'x' | 'z' | 'yaw' | 'tip' | 'scale' | 'radius'>;
  const specs: Spec[] = [];
  const usedLabels = new Set<string>();
  /** A fresh letter or number for a block; null once they have all been used. */
  const newLabel = (kind: KindId): string | undefined | null => {
    const info = KINDS[kind];
    if (!info.label) return undefined;
    // No number 8 block: "the number eight" is the Magic 8 Ball, like in Cake Jam.
    const pool = info.label === 'letter' ? LETTERS : NUMBER_WORDS.map((_, i) => String(i)).filter(n => n !== '8');
    for (let tries = 0; tries < 40; tries++) {
      const l = pick(r, pool);
      if (!usedLabels.has(`${kind}:${l}`)) {
        usedLabels.add(`${kind}:${l}`);
        return l;
      }
    }
    const left = pool.find(l => !usedLabels.has(`${kind}:${l}`));
    if (left === undefined) return null;
    usedLabels.add(`${kind}:${left}`);
    return left;
  };
  // The targets first, each a different toy, then their look-alikes.
  const kindOrder = shuffle(r, theme.kinds.slice());
  const targetKinds = kindOrder.slice(0, rules.targets - 1);
  const targetSpecs: Spec[] = targetKinds.map(kind => ({ kind, color: pick(r, KINDS[kind].colors), label: newLabel(kind) ?? undefined }));
  specs.push(...targetSpecs);
  for (const t of targetSpecs) {
    const colors = KINDS[t.kind].colors.filter(c => c !== t.color);
    const extra = KINDS[t.kind].label ? rules.lookAlikes + 1 : Math.min(rules.lookAlikes, colors.length);
    for (let i = 0; i < extra; i++) {
      const color = colors.length ? colors[i % colors.length] : t.color;
      // A look-alike block or number has another label; a look-alike toy has another colour.
      const label = newLabel(t.kind);
      if (label === null) break;
      specs.push({ kind: t.kind, color: KINDS[t.kind].label ? pick(r, KINDS[t.kind].colors) : color, label });
    }
  }
  // The rest of the pile from the theme, never another copy of a target in its colour.
  const targetKey = new Set(targetSpecs.map(t => `${t.kind}:${t.color}`));
  let guard = 0;
  while (specs.length < rules.items - 1 && guard++ < rules.items * 20) {
    const kind = pick(r, theme.kinds);
    const color = pick(r, KINDS[kind].colors);
    if (!KINDS[kind].label && targetKey.has(`${kind}:${color}`)) continue;
    const label = newLabel(kind);
    if (label === null) continue;
    specs.push({ kind, color, label });
  }
  // The running joke: the library book you never returned is on every page.
  specs.push({ kind: 'libraryBook', color: 'blue' });

  // 2. Scatter it over the carpet, biggest first so the small stuff fills the gaps.
  const halfW = (area.w / 2) * rules.spread;
  const halfD = (area.d / 2) * rules.spread;
  const cx = area.x;
  const cz = area.z;
  const order = specs.map((s, i) => ({ s, i, r: KINDS[s.kind].r })).sort((a, b) => b.r - a.r);
  const placed: PlacedItem[] = new Array(specs.length);
  const done: PlacedItem[] = [];
  const startClear = 0.22;
  for (const { s, i } of order) {
    const info = KINDS[s.kind];
    const scale = rules.scale[0] + r() * (rules.scale[1] - rules.scale[0]);
    const radius = info.r * scale;
    let best: { x: number; z: number; gap: number } | null = null;
    for (let tries = 0; tries < 24; tries++) {
      const x = cx + (r() * 2 - 1) * halfW;
      const z = cz + (r() * 2 - 1) * halfD;
      if (clearStart && Math.hypot(x - START.x, z - START.z) < startClear + radius) continue;
      let gap = Infinity;
      for (const o of done) gap = Math.min(gap, Math.hypot(o.x - x, o.z - z) - o.radius - radius);
      if (gap > 0.004) {
        best = { x, z, gap };
        break;
      }
      if (!best || gap > best.gap) best = { x, z, gap };
    }
    const at = best ?? { x: cx, z: cz };
    const item: PlacedItem = {
      id: i,
      kind: s.kind,
      color: s.color,
      label: s.label,
      x: at.x,
      z: at.z,
      yaw: r() * Math.PI * 2,
      tip: s.kind !== 'libraryBook' && r() < rules.tipped ? (r() < 0.5 ? 1 : -1) * Math.PI / 2 : 0,
      scale,
      radius,
    };
    placed[i] = item;
    done.push(item);
  }

  // 3. The riddle: each target named exactly as specifically as it has to be.
  const targets = [...targetSpecs.map((_, i) => i), specs.length - 1];
  const phrases = targets.map(id => {
    const item = placed[id];
    const sameKind = placed.filter(o => o.kind === item.kind && o.id !== id);
    return phraseFor(item, sameKind.length > 0);
  });
  return {
    seed,
    difficulty,
    theme,
    items: placed,
    targets,
    phrases,
    opener: pick(r, theme.openers),
    closer: pick(r, theme.closers),
  };
}

/** How many items on the page the riddle's words for target `index` fit. 1 is fair. */
export function matchesFor(puzzle: Puzzle, index: number) {
  const phrase = puzzle.phrases[index];
  return puzzle.items.filter(o => phraseFor(o, true) === phrase || phraseFor(o, false) === phrase).length;
}

/** "I spy a heart, an egg, the number eight, ... and the overdue library book." */
export function riddleText(p: Puzzle) {
  const list = p.phrases.slice(0, -1);
  return `I spy ${list.join(', ')}, ${p.closer}`;
}

/** The fine on a library book due back the day you were supposed to return it. */
export function lateFee(now = new Date(), due = new Date(1998, 9, 23)) {
  const days = Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86_400_000));
  return days * 0.1;
}

export function money(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
