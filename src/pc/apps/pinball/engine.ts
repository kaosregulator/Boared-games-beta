/**
 * The pinball table: geometry, physics and scoring, with no drawing.
 *
 * Units are table pixels (380 × 480). Gravity pulls toward +y (the table's
 * tilt). The ball is a circle; walls are segments and circles; flippers are
 * tapered capsules that sweep, and a ball they hit picks up the speed of the
 * flipper's surface at the contact point. Ten substeps a frame keep a fast
 * ball from tunnelling through anything.
 */

export const TW = 380;
export const TH = 480;
const R = 7;
const GRAVITY = 820;
const MAX_SPEED = 1500;

export interface Seg {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  e: number;
  kick?: number;
  /** One-way: only blocks a ball on this side (the normal points at it). */
  oneWay?: [number, number];
  kind?: 'wall' | 'sling' | 'target' | 'standup' | 'gate';
  idx?: number;
}

export interface Circ {
  x: number;
  y: number;
  r: number;
  e: number;
  kick?: number;
  kind: 'bumper' | 'post';
  idx?: number;
}

export interface Flipper {
  px: number;
  py: number;
  len: number;
  rest: number;
  up: number;
  angle: number;
  omega: number;
  held: boolean;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Sitting on the plunger. */
  onPlunger: boolean;
  /** Held in the hyperspace hole until this time. */
  heldUntil: number;
  trail: { x: number; y: number }[];
}

export interface Popup {
  x: number;
  y: number;
  text: string;
  born: number;
  color: string;
}

export type SoundKey = 'flipper' | 'bumper' | 'sling' | 'target' | 'hole' | 'launch' | 'drain' | 'rollover' | 'wall' | 'bonus' | 'save' | 'gameover' | 'rank';

export const RANKS = ['Cadet', 'Ensign', 'Lieutenant', 'Captain', 'Lt. Commander', 'Commander', 'Commodore', 'Admiral', 'Fleet Admiral'];
const RANK_AT = [0, 25_000, 60_000, 120_000, 200_000, 320_000, 480_000, 700_000, 1_000_000];

export interface Game {
  ball: Ball;
  balls: number;
  score: number;
  multiplier: number;
  rank: number;
  over: boolean;
  plunger: number;
  plungerHeld: boolean;
  saveUntil: number;
  message: string;
  messageUntil: number;
  bumperFlash: number[];
  slingFlash: number[];
  targets: boolean[];
  standups: boolean[];
  lanes: boolean[];
  holeFlash: number;
  popups: Popup[];
  flippers: [Flipper, Flipper];
  time: number;
  nudge: { x: number; y: number; until: number };
  nudges: number[];
  tilted: boolean;
}

// --- geometry --------------------------------------------------------------

const segs: Seg[] = [];
const circs: Circ[] = [];
const wall = (ax: number, ay: number, bx: number, by: number, e = 0.45, extra: Partial<Seg> = {}) => segs.push({ ax, ay, bx, by, e, kind: 'wall', ...extra });

// the top arch, from the left wall around to the right wall
const ARCH = { cx: 190, cy: 190, r: 180 };
{
  const n = 28;
  for (let i = 0; i < n; i += 1) {
    const a0 = Math.PI + (i / n) * Math.PI;
    const a1 = Math.PI + ((i + 1) / n) * Math.PI;
    wall(ARCH.cx + Math.cos(a0) * ARCH.r, ARCH.cy + Math.sin(a0) * ARCH.r, ARCH.cx + Math.cos(a1) * ARCH.r, ARCH.cy + Math.sin(a1) * ARCH.r, 0.35);
  }
}
// side walls
wall(10, 190, 10, 372);
wall(370, 190, 370, 480);
// the shooter lane's inner wall, and its one-way gate at the top
export const LANE_X = 344;
wall(LANE_X, 480, LANE_X, 168);
segs.push({ ax: LANE_X, ay: 168, bx: 370, by: 150, e: 0.3, oneWay: [-0.57, -0.82], kind: 'gate' });
// guides down to the flippers
export const FLIP_L = { x: 120, y: 428 };
export const FLIP_R = { x: 234, y: 428 };
wall(10, 372, FLIP_L.x - 4, FLIP_L.y - 2, 0.3);
wall(LANE_X, 372, FLIP_R.x + 4, FLIP_R.y - 2, 0.3);
// slingshots: the long faces kick, the short sides are walls
export const SLINGS: [number, number, number, number][] = [
  [40, 318, 86, 392],
  [314, 318, 268, 392],
];
segs.push({ ax: 40, ay: 318, bx: 86, by: 392, e: 0.9, kick: 260, kind: 'sling', idx: 0 });
segs.push({ ax: 314, ay: 318, bx: 268, by: 392, e: 0.9, kick: 260, kind: 'sling', idx: 1 });
wall(40, 318, 40, 372, 0.3);
wall(40, 372, 86, 392, 0.3);
wall(314, 318, 314, 372, 0.3);
wall(314, 372, 268, 392, 0.3);
// drop targets on the left
export const TARGETS: [number, number, number, number][] = [
  [26, 240, 26, 262],
  [26, 266, 26, 288],
  [26, 292, 26, 314],
];
TARGETS.forEach(([ax, ay, bx, by], idx) => segs.push({ ax, ay, bx, by, e: 0.5, kind: 'target', idx }));
wall(10, 236, 22, 236, 0.3);
// stand-up targets on the right
export const STANDUPS: [number, number, number, number][] = [
  [328, 214, 328, 236],
  [328, 244, 328, 266],
];
STANDUPS.forEach(([ax, ay, bx, by], idx) => segs.push({ ax, ay, bx, by, e: 0.6, kind: 'standup', idx }));
// bumpers
export const BUMPERS: [number, number, number][] = [
  [140, 168, 19],
  [222, 152, 19],
  [190, 228, 19],
];
BUMPERS.forEach(([x, y, r], idx) => circs.push({ x, y, r, e: 1, kick: 330, kind: 'bumper', idx }));
// rollover lane posts at the top
export const LANE_POSTS = [128, 168, 208, 248];
export const LANES = [148, 188, 228];
LANE_POSTS.forEach(x => {
  circs.push({ x, y: 70, r: 4, e: 0.5, kind: 'post' });
  segs.push({ ax: x, ay: 70, bx: x, by: 94, e: 0.4, kind: 'wall' });
  circs.push({ x, y: 94, r: 4, e: 0.5, kind: 'post' });
});
// posts above the flippers' outer ends
circs.push({ x: 26, y: 380, r: 5, e: 0.5, kind: 'post' });
circs.push({ x: 328, y: 380, r: 5, e: 0.5, kind: 'post' });

export const HOLE = { x: 64, y: 136, r: 11 };
export const GEOMETRY = { segs, circs };

const FLIPPER_LEN = 48;

export function newGame(): Game {
  const g: Game = {
    ball: freshBall(),
    balls: 3,
    score: 0,
    multiplier: 1,
    rank: 0,
    over: false,
    plunger: 0,
    plungerHeld: false,
    saveUntil: 0,
    message: 'Welcome, Cadet! Hold SPACE to launch.',
    messageUntil: Infinity,
    bumperFlash: [0, 0, 0],
    slingFlash: [0, 0],
    targets: [true, true, true],
    standups: [false, false],
    lanes: [false, false, false],
    holeFlash: 0,
    popups: [],
    flippers: [
      { px: FLIP_L.x, py: FLIP_L.y, len: FLIPPER_LEN, rest: 0.52, up: -0.48, angle: 0.52, omega: 0, held: false },
      { px: FLIP_R.x, py: FLIP_R.y, len: FLIPPER_LEN, rest: Math.PI - 0.52, up: Math.PI + 0.48, angle: Math.PI - 0.52, omega: 0, held: false },
    ],
    time: 0,
    nudge: { x: 0, y: 0, until: 0 },
    nudges: [],
    tilted: false,
  };
  return g;
}

function freshBall(): Ball {
  return { x: 357, y: 452, vx: 0, vy: 0, onPlunger: true, heldUntil: 0, trail: [] };
}

function say(g: Game, text: string, seconds = 2.5) {
  g.message = text;
  g.messageUntil = g.time + seconds;
}

function add(g: Game, points: number, x: number, y: number, color = '#ffe14d', sound?: SoundKey, play?: (s: SoundKey) => void) {
  const p = points * g.multiplier;
  g.score += p;
  g.popups.push({ x, y, text: `+${p.toLocaleString()}`, born: g.time, color });
  if (g.popups.length > 14) g.popups.shift();
  if (sound && play) play(sound);
  while (g.rank < RANKS.length - 1 && g.score >= RANK_AT[g.rank + 1]) {
    g.rank += 1;
    say(g, `Promotion! Rank: ${RANKS[g.rank]}`, 3);
    play?.('rank');
  }
}

// --- physics -------------------------------------------------------------

function collideSeg(b: Ball, s: Seg): number {
  const dx = s.bx - s.ax;
  const dy = s.by - s.ay;
  const len2 = dx * dx + dy * dy;
  let t = ((b.x - s.ax) * dx + (b.y - s.ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = s.ax + dx * t;
  const cy = s.ay + dy * t;
  let nx = b.x - cx;
  let ny = b.y - cy;
  const d = Math.hypot(nx, ny);
  if (d >= R || d === 0) return 0;
  nx /= d;
  ny /= d;
  if (s.oneWay && nx * s.oneWay[0] + ny * s.oneWay[1] <= 0) return 0;
  b.x += nx * (R - d);
  b.y += ny * (R - d);
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return 0;
  b.vx -= (1 + s.e) * vn * nx;
  b.vy -= (1 + s.e) * vn * ny;
  if (s.kick) {
    b.vx += nx * s.kick;
    b.vy += ny * s.kick;
  }
  return -vn;
}

function collideCirc(b: Ball, c: Circ): number {
  let nx = b.x - c.x;
  let ny = b.y - c.y;
  const d = Math.hypot(nx, ny);
  const min = R + c.r;
  if (d >= min || d === 0) return 0;
  nx /= d;
  ny /= d;
  b.x = c.x + nx * min;
  b.y = c.y + ny * min;
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return 0;
  b.vx -= (1 + c.e) * vn * nx;
  b.vy -= (1 + c.e) * vn * ny;
  if (c.kick) {
    b.vx += nx * c.kick;
    b.vy += ny * c.kick;
  }
  return -vn;
}

function collideFlipper(b: Ball, f: Flipper): number {
  const tx = f.px + Math.cos(f.angle) * f.len;
  const ty = f.py + Math.sin(f.angle) * f.len;
  const dx = tx - f.px;
  const dy = ty - f.py;
  let t = ((b.x - f.px) * dx + (b.y - f.py) * dy) / (f.len * f.len);
  t = Math.max(0, Math.min(1, t));
  const cx = f.px + dx * t;
  const cy = f.py + dy * t;
  const rad = 8 - 4 * t;
  let nx = b.x - cx;
  let ny = b.y - cy;
  const d = Math.hypot(nx, ny);
  const min = R + rad;
  if (d >= min || d === 0) return 0;
  nx /= d;
  ny /= d;
  b.x += nx * (min - d);
  b.y += ny * (min - d);
  // surface velocity of the flipper at the contact point
  const sx = -f.omega * (cy - f.py);
  const sy = f.omega * (cx - f.px);
  const rvx = b.vx - sx;
  const rvy = b.vy - sy;
  const vn = rvx * nx + rvy * ny;
  if (vn >= 0) return 0;
  const e = 0.28;
  b.vx -= (1 + e) * vn * nx;
  b.vy -= (1 + e) * vn * ny;
  return -vn;
}

export function step(g: Game, dt: number, play: (s: SoundKey) => void) {
  g.time += dt;
  const sub = 10;
  const h = dt / sub;
  const b = g.ball;

  // plunger
  if (g.plungerHeld && b.onPlunger) g.plunger = Math.min(1, g.plunger + dt * 1.1);

  for (let k = 0; k < sub; k += 1) {
    // flippers sweep toward where they're held
    for (const f of g.flippers) {
      const target = f.held && !g.tilted ? f.up : f.rest;
      const speed = 26;
      const prev = f.angle;
      const dir = Math.sign(target - f.angle);
      f.angle += dir * speed * h;
      if ((dir > 0 && f.angle > target) || (dir < 0 && f.angle < target)) f.angle = target;
      f.omega = (f.angle - prev) / h;
    }

    if (b.heldUntil) {
      if (g.time >= b.heldUntil) {
        b.heldUntil = 0;
        b.x = HOLE.x + 4;
        b.y = HOLE.y + 14;
        b.vx = 260 + Math.random() * 80;
        b.vy = 160;
        play('launch');
      } else continue;
    }

    if (b.onPlunger) {
      b.x = 357;
      b.y = 452 + g.plunger * 16;
      b.vx = 0;
      b.vy = 0;
      continue;
    }

    b.vy += GRAVITY * h;
    if (g.nudge.until > g.time) {
      b.vx += g.nudge.x * h;
      b.vy += g.nudge.y * h;
    }
    b.x += b.vx * h;
    b.y += b.vy * h;

    for (const s of segs) {
      if (s.kind === 'target' && !g.targets[s.idx!]) continue;
      const hit = collideSeg(b, s);
      if (!hit) continue;
      if (s.kind === 'sling') {
        g.slingFlash[s.idx!] = g.time;
        add(g, 100, (s.ax + s.bx) / 2, (s.ay + s.by) / 2, '#7df', 'sling', play);
      } else if (s.kind === 'target') {
        g.targets[s.idx!] = false;
        add(g, 1000, s.ax + 14, (s.ay + s.by) / 2, '#ff8a3d', 'target', play);
        if (g.targets.every(t => !t)) {
          add(g, 5000, 80, 270, '#ff8a3d', 'bonus', play);
          say(g, 'Attack bombers cleared! Targets reset.');
          window.setTimeout(() => (g.targets = [true, true, true]), 1200);
        }
      } else if (s.kind === 'standup') {
        g.standups[s.idx!] = true;
        add(g, 750, s.ax - 22, (s.ay + s.by) / 2, '#9f9', 'target', play);
        if (g.standups.every(Boolean)) {
          g.standups = [false, false];
          g.saveUntil = g.time + 10;
          say(g, 'Re-entry shield up: ball save for 10 seconds!');
          play('bonus');
        }
      } else if (hit > 220) play('wall');
    }
    for (const c of circs) {
      const hit = collideCirc(b, c);
      if (!hit) continue;
      if (c.kind === 'bumper') {
        g.bumperFlash[c.idx!] = g.time;
        add(g, 500, c.x, c.y - c.r - 6, '#ff5ad0', 'bumper', play);
      } else if (hit > 200) play('wall');
    }
    for (const f of g.flippers) collideFlipper(b, f);

    const speed = Math.hypot(b.vx, b.vy);
    if (speed > MAX_SPEED) {
      b.vx *= MAX_SPEED / speed;
      b.vy *= MAX_SPEED / speed;
    }

    // hyperspace hole
    if (Math.hypot(b.x - HOLE.x, b.y - HOLE.y) < HOLE.r && speed < 1100) {
      b.heldUntil = g.time + 1.1;
      b.x = HOLE.x;
      b.y = HOLE.y;
      b.vx = 0;
      b.vy = 0;
      g.holeFlash = g.time;
      add(g, 2500, HOLE.x + 10, HOLE.y - 16, '#b48cff', 'hole', play);
      say(g, 'Hyperspace jump!');
    }

    // rollover lanes
    LANES.forEach((x, i) => {
      if (!g.lanes[i] && Math.abs(b.x - x) < 9 && Math.abs(b.y - 82) < 9) {
        g.lanes[i] = true;
        add(g, 250, x, 60, '#fff', 'rollover', play);
        if (g.lanes.every(Boolean)) {
          g.lanes = [false, false, false];
          g.multiplier = Math.min(8, g.multiplier + 1);
          say(g, `Bonus multiplier ×${g.multiplier}!`);
          play('bonus');
        }
      }
    });
  }

  b.trail.unshift({ x: b.x, y: b.y });
  if (b.trail.length > 6) b.trail.pop();

  // drained
  if (b.y > TH + 20) {
    if (g.time < g.saveUntil) {
      g.ball = freshBall();
      say(g, 'Ball saved!');
      play('save');
    } else {
      g.balls -= 1;
      g.tilted = false;
      play('drain');
      if (g.balls <= 0) {
        g.over = true;
        say(g, `Game over. Final rank: ${RANKS[g.rank]}`, Infinity);
        play('gameover');
      } else {
        g.ball = freshBall();
        g.multiplier = 1;
        say(g, `Ball ${4 - g.balls}. Hold SPACE to launch.`);
      }
    }
  }
}

export function release(g: Game, play: (s: SoundKey) => void) {
  const b = g.ball;
  if (!b.onPlunger || g.over) {
    g.plunger = 0;
    return;
  }
  b.onPlunger = false;
  b.vy = -(520 + g.plunger * 980);
  b.y = 450;
  g.plunger = 0;
  g.saveUntil = g.time + 6;
  if (g.messageUntil === Infinity || g.message.includes('launch')) say(g, 'Mission: light the three lanes at the top.', 3);
  play('launch');
}

/** Bump the table. Three bumps in two seconds tilts it: flippers die for this ball. */
export function nudge(g: Game, play: (s: SoundKey) => void) {
  if (g.tilted || g.over) return;
  g.nudge = { x: (Math.random() - 0.5) * 900, y: -1600, until: g.time + 0.06 };
  g.nudges = [...g.nudges.filter(t => g.time - t < 2), g.time];
  play('wall');
  if (g.nudges.length >= 3) {
    g.tilted = true;
    say(g, 'TILT!', 3);
    play('drain');
  }
}

export const messageVisible = (g: Game) => g.time < g.messageUntil;
