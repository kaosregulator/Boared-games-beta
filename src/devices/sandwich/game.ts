/**
 * Sandwich Stacker, played on the desk in front of the computer.
 *
 * The rules are ported from elan-rubin/Sandwich-Stacker (Unity, C#):
 * GameManager, IngredientSpawner, Ingredient, IngredientManager and Player.
 * Same spawn odds, fall speed, catch box, icky meter, top-bread timing and
 * scoring. No three.js in here: SandwichDesk draws it and plays the sounds.
 *
 * Units are the original's world units (100 px of the walk sprite = 1),
 * with x = 0 in the middle of the play area and y = 0 on the desk top.
 */

export type Good = 'bacon' | 'cheese' | 'lettuce' | 'mayo' | 'meat' | 'mustard' | 'onion' | 'pepper' | 'pickles' | 'tomato';
export type Icky = 'boot' | 'can' | 'eye' | 'fish' | 'goop' | 'mushroom';
export type Kind = Good | Icky | 'bread';

export const GOOD: Good[] = ['bacon', 'cheese', 'lettuce', 'mayo', 'meat', 'mustard', 'onion', 'pepper', 'pickles', 'tomato'];
export const ICKY: Icky[] = ['boot', 'can', 'eye', 'fish', 'goop', 'mushroom'];

/** Falling animation frames per ingredient (public/sandwich/img/<kind>-<n>.png). */
export const FRAMES: Record<Kind, number> = {
  bacon: 1, bread: 4, cheese: 8, lettuce: 1, mayo: 3, meat: 4, mustard: 3, onion: 4, pepper: 8, pickles: 4, tomato: 4,
  boot: 5, can: 3, eye: 6, fish: 1, goop: 3, mushroom: 1,
};

/** Particle colour for a splat, from the ScriptableObjects. */
export const COLOR: Record<Good | 'bread', string> = {
  bacon: '#91220b', bread: '#ecbe89', cheese: '#ffd841', lettuce: '#a7b83f', mayo: '#e6d8a5', meat: '#f2c8bf',
  mustard: '#e0b525', onion: '#fff9d8', pepper: '#5d8619', pickles: '#6f8537', tomato: '#ec452c',
};

export function isIcky(kind: Kind): kind is Icky {
  return (ICKY as string[]).includes(kind);
}

// ---------- layout (original units) ----------

/** Player.cs clamps. The plate is held 2 units to the left of the player's pivot. */
export const PLAYER_MIN_X = -5.11;
export const PLAYER_MAX_X = 6.43;
export const PLAYER_SPEED = 10;
export const PLATE_DX = -2;
/** The 625 sprite (299×313 px at 100 px/unit, scaled 1.5) sits on the desk with its feet at y = 0. */
export const SPRITE_W = 2.99 * 1.5;
export const SPRITE_H = 3.13 * 1.5;
export const SPRITE_DX = -0.66;
export const SPRITE_Y = SPRITE_H / 2;
/** Plate edge collider, and the stack: each layer 0.2 above the last. */
export const PLATE_Y = SPRITE_Y + 0.07;
export const PLATE_HALF = 0.85;
export const layerY = (h: number) => SPRITE_Y - 0.03 + h * 0.2;
/** Landed layer box collider (1.76 × 0.26, offset 0.15): its top above the layer's pivot. */
const LAYER_TOP = 0.28;
/** Falling box collider half size (1.425 × 1.3). */
const FALL_HALF_W = 0.7125;
const FALL_HALF_H = 0.65;
/** IngredientSpawner sits at y 5.59 on a 10-unit-tall screen whose bottom is the desk. */
export const SPAWN_Y = 10.59;
const SPAWN_MIN_X = -5.5;
const SPAWN_MAX_X = 4;
/** Where the toaster fires the top bread from (Bread Launcher). */
export const LAUNCH_X = -0.63;
const GRAVITY = 9.81;
const TIME_TO_WAIT = 1;
const SCORES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 75, 100, 150, 200, 250, 300, 350, 400, 500];
const ICKS_TO_LOSE = 4;

export const FLAVOR_WIN = ['nice sandwich work!', '625 is still hungry!', 'sandwich break!', 'excellent sandwich!', 'sandwich time!', 'did someone say sandwich?', "let's get sandwiching!"];
export const FLAVOR_MORE = ['keep it up!', 'keep it going!', 'yum!', 'make another one!', 'make one more!', "let's keep going!", "don't stop now!", 'yummy!', 'delicious!', 'good work!'];
export const FLAVOR_ICK = ['icky!', 'ick!', 'gross!', 'oops.', 'ick.'];
export const FLAVOR_LOSE = [
  'ah blitznak! looks like you need to work on your sandwich-stacking skills!',
  'ah darn it! better work on your sandwich-stacking skills!',
];

// ---------- state ----------

export interface Falling {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  vy: number;
  flip: boolean;
  /** Seconds alive; the sprite pops in from nothing (DOScale after 0.15 s). */
  age: number;
  /** Top bread waits out of sight while the toaster fires it (StallBread). */
  hidden: number;
}

export interface Layer {
  id: number;
  kind: Good | 'bread';
  /** Height in the stack, 1 = on the plate. */
  h: number;
  x: number;
  flip: boolean;
  /** Squash on landing (DOPunchScale). */
  punch: number;
}

export interface Splat {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  flip: boolean;
  age: number;
}

export type GameEvent =
  | { type: 'land'; kind: Kind }
  | { type: 'icky'; text: string }
  | { type: 'miss'; kind: Kind }
  | { type: 'toaster' }
  | { type: 'eat'; n: number; points: number }
  | { type: 'level'; round: number }
  | { type: 'won' }
  | { type: 'lost' };

export type Phase = 'play' | 'eating' | 'won' | 'lost';

export interface Game {
  phase: Phase;
  round: number;
  score: number;
  ick: number;
  totalCaught: number;
  paused: boolean;
  /** Player pivot x, its speed this frame, walk animation. */
  x: number;
  vx: number;
  walk: number;
  walkT: number;
  /** -1..1, how far the stack leans from the last change of direction. */
  sway: number;
  /** Seconds left on 625's grumpy face after an icky catch. */
  grump: number;
  falling: Falling[];
  stack: Layer[];
  splats: Splat[];
  /** Seconds since the toaster fired, or -1. */
  launch: number;
  /** How far the view has climbed with the stack, in units. */
  lift: number;
  spawning: boolean;
  spawnT: number;
  counter: number;
  breadMissed: number;
  prev: Kind | null;
  /** Seconds until the next bite while eating. */
  eatT: number;
  eaten: number;
  /** What the round-end card says. */
  flavor: [string, string];
  /** Ingredients caught by kind, for the favourites on the lose card. */
  caught: Partial<Record<Good, number>>;
  events: GameEvent[];
  nextId: number;
  rand: () => number;
}

const pick = <T,>(g: Game, list: readonly T[]) => list[Math.floor(g.rand() * list.length)];
/** Random.Range(int a, int b): a..b-1. */
const rangeInt = (g: Game, a: number, b: number) => a + Math.floor(g.rand() * (b - a));
const range = (g: Game, a: number, b: number) => a + g.rand() * (b - a);

export function createGame(rand: () => number = Math.random): Game {
  const g: Game = {
    phase: 'play',
    round: 1,
    score: 0,
    ick: 0,
    totalCaught: 0,
    paused: false,
    x: 1.2,
    vx: 0,
    walk: 0,
    walkT: 0,
    sway: 0,
    grump: 0,
    falling: [],
    stack: [],
    splats: [],
    launch: -1,
    lift: 0,
    spawning: false,
    spawnT: -1,
    counter: 0,
    breadMissed: 0,
    prev: null,
    eatT: 0,
    eaten: 0,
    flavor: ['', ''],
    caught: {},
    events: [],
    nextId: 1,
    rand,
  };
  return g;
}

/** GameManager.StartRoundCoroutine: clear the plate and start the spawner. */
export function startRound(g: Game) {
  g.phase = 'play';
  g.stack = [];
  g.falling = [];
  g.breadMissed = 0;
  g.spawnT = -1;
  g.counter = 0;
  g.spawning = true;
  g.launch = -1;
  g.events.push({ type: 'level', round: g.round });
}

/** After a loss: back to level 1 with an empty meter. */
export function restart(g: Game) {
  g.round = 1;
  g.score = 0;
  g.ick = 0;
  g.totalCaught = 0;
  g.caught = {};
  g.lift = 0;
  g.splats = [];
  g.grump = 0;
  startRound(g);
}

export const plateX = (g: Game) => g.x + PLATE_DX;

/** The surface a falling thing lands on: the top layer, or the plate. */
export function topSurface(g: Game) {
  const top = g.stack[g.stack.length - 1];
  return top ? { x: top.x, y: layerY(top.h) + LAYER_TOP, half: 0.88, h: top.h } : { x: plateX(g), y: PLATE_Y, half: PLATE_HALF, h: 0 };
}

export interface Input {
  /** -1 left, 0, 1 right. */
  move: number;
}

export function step(g: Game, dt: number, input: Input) {
  for (const s of g.splats) s.age += dt;
  g.splats = g.splats.filter(s => s.age < 0.6);
  if (g.paused) return;
  if (g.grump > 0) g.grump = Math.max(0, g.grump - dt);
  if (g.launch >= 0) {
    g.launch += dt;
    if (g.launch > 2.2) g.launch = -1;
  }
  for (const l of g.stack) l.punch = Math.max(0, l.punch - dt);

  if (g.phase === 'play') {
    movePlayer(g, dt, input.move);
    spawn(g, dt);
    fall(g, dt);
  } else {
    g.vx = 0;
    g.walk = 0;
    if (g.phase === 'eating') eat(g, dt);
  }
  settleStack(g, dt);
}

function movePlayer(g: Game, dt: number, move: number) {
  const dx = move * PLAYER_SPEED * dt;
  const blocked = (g.x > PLAYER_MAX_X && dx > 0) || (g.x < PLAYER_MIN_X && dx < 0);
  if (dx !== 0 && !blocked) {
    g.x += dx;
    g.vx = move;
    g.walkT += dt;
    if (g.walkT > 0.1) {
      g.walkT = 0;
      g.walk = (g.walk + 1) % 8;
    }
    // The stack leans against the walk and springs back when you stop.
    g.sway += (-move - g.sway) * Math.min(1, dt * 6);
  } else {
    g.vx = 0;
    g.walk = 0;
    g.sway += (0 - g.sway) * Math.min(1, dt * 3);
  }
}

/** IngredientSpawner.Update. */
function spawn(g: Game, dt: number) {
  if (!g.spawning) return;
  g.spawnT += dt;
  if (g.spawnT <= TIME_TO_WAIT) return;
  const x = g.round;
  g.counter += 1;
  g.spawnT = 0;

  let reps = 1;
  for (let i = 0; i < 2; i += 1) if (rangeInt(g, x, 50) > 40 + 2 * i) reps += 1;

  const threshold = Math.min(20, Math.max(4, -20 / (x + 1) + 14));
  const interval = Math.min(8, Math.max(2, Math.trunc(0.5 * x + 2)));
  if (g.stack.length > threshold && g.counter % (interval + 2 * g.breadMissed) === 0) {
    // The toaster fires the top bread; nothing else comes down with it.
    g.launch = 0;
    g.events.push({ type: 'toaster' });
    g.spawnT = -2.5;
    g.breadMissed += 1;
    g.falling.push(newFalling(g, 'bread', range(g, SPAWN_MIN_X, SPAWN_MAX_X), 1.75));
    return;
  }

  const xs: number[] = [];
  const badOdds = Math.min(0.5, Math.max(0.1, Math.log(x) / 3.5 + 0.1));
  for (let i = 0; i < reps; i += 1) {
    let nx = 0;
    for (let tries = 0; tries < 40; tries += 1) {
      nx = range(g, SPAWN_MIN_X, SPAWN_MAX_X);
      if (xs.every(p => Math.abs(nx - p) >= 2.3)) break;
    }
    xs.push(nx);
    let kind: Kind;
    do {
      kind = g.rand() > badOdds ? pick(g, GOOD) : pick(g, ICKY);
    } while (kind === g.prev);
    g.prev = kind;
    g.falling.push(newFalling(g, kind, nx, 0));
  }
}

function newFalling(g: Game, kind: Kind, x: number, hidden: number): Falling {
  return { id: g.nextId++, kind, x, y: SPAWN_Y, vy: 0, flip: g.rand() > 0.5, age: 0, hidden };
}

/** Ingredient.Start: heavier gravity each round. */
export function gravityScale(round: number) {
  return Math.min(2, Math.max(0.4, Math.log(round + 1.5) / 2.5 + 0.4));
}

function fall(g: Game, dt: number) {
  const gs = gravityScale(g.round);
  const keep: Falling[] = [];
  for (const f of g.falling) {
    if (f.hidden > 0) {
      f.hidden -= dt;
      keep.push(f);
      continue;
    }
    f.age += dt;
    const before = f.y - FALL_HALF_H;
    f.vy -= GRAVITY * gs * dt;
    f.y += f.vy * dt;
    const bottom = f.y - FALL_HALF_H;
    const surf = topSurface(g);
    if (before >= surf.y - 0.05 && bottom <= surf.y && Math.abs(f.x - surf.x) < surf.half + FALL_HALF_W) {
      catchIt(g, f, surf);
      // The top bread ends the round and four icky things end the game: the rest stop here.
      if (g.phase !== 'play') return;
      continue;
    }
    if (bottom <= 0) {
      // Missed: a good ingredient splats on the desk, an icky one just drops away.
      g.splats.push({ id: f.id, kind: f.kind, x: f.x, y: 0.4, flip: f.flip, age: 0 });
      g.events.push({ type: 'miss', kind: f.kind });
      continue;
    }
    keep.push(f);
  }
  g.falling = keep;
}

/** Ingredient.OnCollisionEnter2D with the sandwich. */
function catchIt(g: Game, f: Falling, surf: { x: number; h: number }) {
  if (isIcky(f.kind)) {
    g.ick += 1;
    g.grump = 1;
    g.events.push({ type: 'icky', text: pick(g, FLAVOR_ICK) });
    if (g.ick >= ICKS_TO_LOSE) lose(g);
    return;
  }
  g.events.push({ type: 'land', kind: f.kind });
  g.totalCaught += 1;
  if (f.kind !== 'bread') g.caught[f.kind] = (g.caught[f.kind] ?? 0) + 1;
  g.stack.push({ id: f.id, kind: f.kind, h: surf.h + 1, x: surf.x, flip: f.flip, punch: 0.25 });
  // The camera climbs with the stack between 8 and 29 layers.
  if (surf.h + 1 > 7 && surf.h + 1 < 30) g.lift += 0.2;
  if (f.kind === 'bread') endRound(g, f);
}

function lose(g: Game) {
  g.phase = 'lost';
  g.spawning = false;
  g.falling = [];
  g.flavor = [pick(g, FLAVOR_LOSE), ''];
  g.events.push({ type: 'lost' });
}

/** GameManager.EndRound: stop spawning, then 625 eats it from the top down. */
function endRound(g: Game, bread: Falling) {
  g.round += 1;
  g.spawning = false;
  g.phase = 'eating';
  // Whatever else is still in the air is cleared, as the original does when the round ends.
  for (const f of g.falling) if (!f.hidden && f !== bread) g.splats.push({ id: f.id, kind: f.kind, x: f.x, y: f.y, flip: f.flip, age: 0.3 });
  g.falling = [];
  g.eatT = 0.5;
  g.eaten = 0;
}

function eat(g: Game, dt: number) {
  g.eatT -= dt;
  if (g.eatT > 0) return;
  const top = g.stack.pop();
  if (!top) {
    g.phase = 'won';
    g.flavor = [pick(g, FLAVOR_WIN), pick(g, FLAVOR_MORE)];
    g.events.push({ type: 'won' });
    return;
  }
  g.eaten += 1;
  const points = SCORES[Math.min(g.eaten, SCORES.length - 1)] * (g.round - 1);
  g.score += points;
  g.events.push({ type: 'eat', n: g.eaten, points });
  const size = g.stack.length + g.eaten;
  if (g.eaten <= size - 7 && size >= 7 && g.eaten <= 23) g.lift = Math.max(0, g.lift - 0.2);
  g.eatT = g.stack.length ? 0.25 : 0.5;
  if (!g.stack.length) g.lift = 0;
}

/** IngredientManager.Update: each layer chases the one below, the higher ones more lazily. */
function settleStack(g: Game, dt: number) {
  let below = plateX(g);
  g.stack.forEach((l, i) => {
    if (i === 0) {
      l.x += (below - l.x) * Math.min(1, dt * 40);
    } else {
      const target = l.x + (below - l.x) * 0.9 + (2 * g.sway) / (50 - Math.min(i, 49));
      const rate = l.h > 30 ? Math.max(1, 10 - 0.5 * Math.abs(30 - l.h)) : Math.min(40, Math.max(10, 40 - l.h));
      l.x += (target - l.x) * Math.min(1, dt * rate);
    }
    below = l.x;
  });
}

/** The ingredients you caught most, for the lose card. */
export function favourites(g: Game, n = 3): Good[] {
  return (Object.entries(g.caught) as [Good, number][])
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}
