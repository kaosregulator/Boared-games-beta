/**
 * The army man's parachute, and the chopper you can call in when you've left
 * it somewhere silly. Step off anything taller than a few soldiers (the wall
 * shelf is nearly two metres up) or jump out of the chopper in the air, and the
 * chute opens with a quick movie shot: slow-mo, a close-up while he yanks the
 * cord, then a wide shot looking up as the canopy pops. Runs in Node, so the
 * timing can be checked with a script.
 */

export const CHUTE = {
  /** Drops shorter than this (blocks, the HQ roof) are just a hop down. */
  minDrop: 0.2,
  /** Toy terminal speed with the chute shut, m/s. */
  terminal: 1.1,
  /** Sink rate under the canopy, and with Shift held to spill air. */
  sink: 0.36,
  sinkFast: 0.8,
  /** Under the canopy you fly it: WASD push it any way at up to this, hands off it hangs still. */
  drift: 0.17,
  driftSide: 0.14,
  driftBack: 0.11,
  /** Never open later than this far off the ground. */
  lastChance: 0.12,
  /** Canopy folding up after touchdown. */
  fold: 0.5,
};

/** The movie shot, in real seconds from the jump. */
export const CINE = {
  /** He grabs and yanks the cord here; the canopy takes `deploy` to fill. */
  pull: 0.6,
  deploy: 0.45,
  /** Cut from the close-up to the wide shot looking up at the canopy. */
  wide: 0.8,
  /** Start gliding back to the follow camera, and the end of the shot. */
  back: 1.85,
  end: 2.25,
  /** Slow motion during the yank. */
  slow: 0.3,
};

/** What he shouts on the way down. The first is the one everybody asked for. */
export const CHUTE_LINES = [
  "We're going down! We're going down!",
  'Mayday! Mayday! Tell Mom I cleaned my room!',
  'Nobody said the shelf had no railing!',
  "Pull the cord! Pull the cord! ...Which one's the cord?!",
  "I'm plastic, I'll bounce! ...I hope!",
  'This was NOT in the training!',
  'Geronimooo! Wait, who is Geronimo?',
  'Ripcord! Ripcord! RIPCORD!',
] as const;

export const BAIL_LINES = [
  "Chopper's on autopilot! I'm out!",
  "We're going down! We're going down!",
  "Who's flying this thing?! Oh right. Me. Bye!",
  'Eject! Eject! There is no eject button! JUMP!',
] as const;

export const LAND_LINES = [
  'Touchdown. Totally meant to do that.',
  'The eagle has landed. On the carpet.',
  'Nailed it. Nobody saw that, right?',
  'Feet down, helmet on. Still got it.',
] as const;

/** A line from the list, never the same one twice running. */
export function pickLine(lines: readonly string[], last: string | null, rand = Math.random) {
  if (lines.length < 2) return lines[0] ?? '';
  let i = Math.floor(rand() * lines.length) % lines.length;
  if (lines[i] === last) i = (i + 1) % lines.length;
  return lines[i];
}

/** True when stepping off here is a long enough drop to need the chute. */
export function needsChute(drop: number) {
  return drop >= CHUTE.minDrop;
}

/** Game speed during the shot: slow-mo for the yank, easing back to full speed. */
export function cineTimeScale(t: number) {
  if (t <= 0 || t >= CINE.back) return 1;
  const inT = 0.12;
  const outT = CINE.wide + 0.3;
  if (t < inT) return 1 + (CINE.slow - 1) * (t / inT);
  if (t < outT) return CINE.slow;
  const k = Math.min(1, (t - outT) / (CINE.back - outT));
  return CINE.slow + (1 - CINE.slow) * k * k * (3 - 2 * k);
}

/** How full the canopy is, 0..1 with a little overshoot as it bangs open. */
export function canopyOpen(sincePull: number) {
  if (sincePull <= 0) return 0;
  const t = Math.min(1, sincePull / CINE.deploy);
  if (t >= 1) return 1;
  // Back-out ease: fills past 1, settles back.
  const s = 2.2;
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
}

/**
 * One step of the fall. Shut: gravity up to toy terminal speed. Open: eases to
 * the sink rate (faster with Shift), so the canopy opening is a jolt, not a stop.
 */
export function stepFall(vy: number, dt: number, open: number, fast: boolean) {
  if (open <= 0) return Math.max(-CHUTE.terminal, vy - 9.8 * dt);
  const sink = -(fast ? CHUTE.sinkFast : CHUTE.sink);
  const pull = 1 - Math.exp(-dt * 7 * Math.min(1, open));
  return vy + (sink - vy) * pull;
}

/**
 * Where the canopy wants to go for this stick: W/S forward and back along your
 * heading, A/D sideways. Hands off, it just sinks. Metres a second, room x/z.
 */
export function chuteDrift(forward: number, strafe: number, heading: number) {
  const along = forward >= 0 ? forward * CHUTE.drift : forward * CHUTE.driftBack;
  const side = strafe * CHUTE.driftSide;
  const s = Math.sin(heading);
  const c = Math.cos(heading);
  return { x: s * along - c * side, z: c * along + s * side };
}

/**
 * Somewhere to set the chopper down next to you: a ring of spots round you on
 * the same floor you're standing on, clear of furniture. Null if nothing fits
 * (the caller sends it back to the pad).
 */
export function chopperSpot(
  x: number,
  y: number,
  z: number,
  heading: number,
  floorAt: (x: number, z: number, maxY: number) => number,
  blocked: (x: number, y: number, z: number) => boolean,
) {
  for (const r of [0.15, 0.22, 0.3]) {
    for (let i = 0; i < 12; i++) {
      // Start off to your right-front, where you'll see it come down.
      const a = heading - 0.9 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * (Math.PI / 6);
      const cx = x + Math.sin(a) * r;
      const cz = z + Math.cos(a) * r;
      const g = floorAt(cx, cz, y + 0.01);
      if (Math.abs(g - y) > 0.01) continue;
      if (blocked(cx, g, cz)) continue;
      return { x: cx, y: g, z: cz, yaw: heading };
    }
  }
  return null;
}
