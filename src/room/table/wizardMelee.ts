import type { ChessPieceType } from '../../types';

/**
 * The move and capture choreography from the owner's wizards-chess engine
 * (`executeChessMove`, `spawnStoneShatter` and the debris step in
 * wizardChessEngine.js), lifted out of its scene so the table can drive it.
 *
 * Everything here is in the source's units: metres on its cathedral board,
 * 0.34 m squares, y measured up from the board surface, white at +z. The
 * table multiplies by its own square size. Nothing here touches three.js, so
 * a whole capture can be sampled and tested without a renderer.
 *
 * A quiet move glides the statue to its square (knights arc round or vault
 * over blockers, bystanders lean aside). A capture is a melee: the attacker
 * walks to a standoff in front of the defender, the defender turns to face it,
 * the attack clip winds up and lands, the defender flinches into its shatter
 * clip, bursts into stone shards, and the attacker follows through onto the
 * square.
 */

export const SRC_SQ = 0.34;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Square {
  r: number;
  c: number;
}

export interface Stand extends Square {
  id: number;
  type: ChessPieceType;
}

export const boardToWorld = (r: number, c: number): Vec3 => ({ x: (c - 3.5) * SRC_SQ, y: 0, z: (r - 3.5) * SRC_SQ });

export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Statue heights above the board, metres. */
export const PIECE_HEIGHTS: Record<ChessPieceType, number> = { p: 0.36, r: 0.46, n: 0.5, b: 0.51, q: 0.55, k: 0.59 };
/** Pedestals are ~0.29 m across; moving statues keep this far apart. */
export const MIN_PIECE_SEP = 0.318;
/** Where the attacker stops to swing: about a square short, so the blade bridges the gap. */
export const MELEE_STANDOFF = 0.36;

/**
 * Attack clip timing per piece (24 fps Blender clips): the swing starts at
 * frame 8–10, the weapon lands at frame 15, and the blow drives through at
 * frame 19–20, when the defender bursts.
 */
export const ATTACK_SYNC_PROFILES: Record<
  ChessPieceType,
  { timeScale: number; swingStartClip: number; contactClip: number; blowClip: number; maxLunge: number }
> = {
  p: { timeScale: 1.15, swingStartClip: 0.36, contactClip: 0.6, blowClip: 0.78, maxLunge: 0.095 },
  k: { timeScale: 1.1, swingStartClip: 0.34, contactClip: 0.56, blowClip: 0.75, maxLunge: 0.08 },
  q: { timeScale: 1.08, swingStartClip: 0.35, contactClip: 0.58, blowClip: 0.77, maxLunge: 0.065 },
  r: { timeScale: 1.06, swingStartClip: 0.35, contactClip: 0.58, blowClip: 0.77, maxLunge: 0.055 },
  n: { timeScale: 1.08, swingStartClip: 0.35, contactClip: 0.58, blowClip: 0.77, maxLunge: 0.06 },
  b: { timeScale: 1.08, swingStartClip: 0.35, contactClip: 0.58, blowClip: 0.77, maxLunge: 0.065 },
};
/** Idle breathing and the stone stride play at this speed in the source. */
export const CLIP_SPEED = 0.81;

export interface ChoreoPlan {
  mover: Stand;
  to: Square;
  /** The piece taken, where it stands (en passant takes beside the landing square). */
  victim: Stand | null;
  /** Castling's rook, which slides with the king. */
  rook: { id: number; from: Square; to: Square } | null;
  /** Every other piece on the board. */
  bystanders: Stand[];
  /** How far the camera has to come back after a capture (source metres); sets the return's length. */
  camReturnDist?: number;
}

export type Phase = 'walk' | 'approach' | 'strike' | 'return' | 'done';

export interface ChoreoFrame {
  phase: Phase;
  mover: Vec3;
  /** Where the defender stands; null once it has shattered. */
  victim: Vec3 | null;
  rook: Vec3 | null;
  /** Bystanders that have leaned out of the way, by id. */
  nudged: Map<number, Vec3>;
}

export interface Choreo {
  plan: ChoreoPlan;
  capture: boolean;
  start: Vec3;
  end: Vec3;
  /** The defender's square, and the spot the attacker swings from. */
  target: Vec3;
  strike: Vec3;
  /** Unit direction of the attack (or the move), on the board plane. */
  dir: { x: number; z: number };
  /** Which way the mover faces while it moves: rotation about y for a statue that faces +z. */
  heading: number;
  /** The defender turns to meet the attacker. */
  victimHeading: number;
  tApproach: number;
  tContact: number;
  tImpact: number;
  tStrikeDone: number;
  duration: number;
  sample(t: number): ChoreoFrame;
}

interface Bystander {
  id: number;
  home: Vec3;
  height: number;
}

/** Plan a move. Times are seconds from the start. */
export function planChoreo(plan: ChoreoPlan): Choreo {
  const { mover, to, victim, rook } = plan;
  const capture = Boolean(victim);
  const start = boardToWorld(mover.r, mover.c);
  const end = boardToWorld(to.r, to.c);
  const target = victim ? boardToWorld(victim.r, victim.c) : end;
  const dx = target.x - start.x;
  const dz = target.z - start.z;
  const dist = Math.hypot(dx, dz) || 1;
  const dirX = dx / dist;
  const dirZ = dz / dist;
  const heading = Math.atan2(end.x - start.x, end.z - start.z);
  const victimHeading = Math.atan2(-dx, -dz);

  const stopOffset = capture ? Math.min(MELEE_STANDOFF, dist * 0.76) : 0;
  const strike: Vec3 = { x: target.x - dirX * stopOffset, y: 0, z: target.z - dirZ * stopOffset };

  const bystanders: Bystander[] = plan.bystanders
    .filter(b => b.id !== mover.id && b.id !== victim?.id)
    .map(b => ({ id: b.id, home: boardToWorld(b.r, b.c), height: PIECE_HEIGHTS[b.type] ?? 0.45 }));

  // Knights skirt a single blocker through the open side of the L, or vault a wall of them.
  const segEnd = capture ? strike : end;
  const segDx = segEnd.x - start.x;
  const segDz = segEnd.z - start.z;
  const segLen = Math.hypot(segDx, segDz) || 0.001;
  const segUx = segDx / segLen;
  const segUz = segDz / segLen;
  const segPerpX = -segUz;
  const segPerpZ = segUx;
  let knightLateralSign = 0;
  let knightVaultPeak = 0;
  if (mover.type === 'n') {
    let blockedPos = false;
    let blockedNeg = false;
    let maxBlocker = 0;
    for (const b of bystanders) {
      const relX = b.home.x - start.x;
      const relZ = b.home.z - start.z;
      const proj = relX * segUx + relZ * segUz;
      if (proj > 0.04 && proj < segLen - 0.04) {
        const perp = relX * segPerpX + relZ * segPerpZ;
        if (Math.abs(perp) < MIN_PIECE_SEP) {
          if (perp >= 0) blockedPos = true;
          if (perp <= 0) blockedNeg = true;
          maxBlocker = Math.max(maxBlocker, b.height);
        }
      }
    }
    if (blockedPos && !blockedNeg) knightLateralSign = -1;
    else if (blockedNeg && !blockedPos) knightLateralSign = 1;
    else if (blockedPos && blockedNeg) knightVaultPeak = maxBlocker + 0.09;
  }

  const fromR = mover.r;
  const fromC = mover.c;
  const isDiagonalSlide = Math.abs(to.r - fromR) === Math.abs(to.c - fromC) && Math.abs(to.r - fromR) >= 1 && mover.type !== 'n';
  const minSep = isDiagonalSlide ? 0.262 : MIN_PIECE_SEP;

  /** The source's trajectory solver: never passes through another statue. Writes nudged bystanders. */
  function trajectory(u: number, from: Vec3, toVec: Vec3, nudged: Map<number, Vec3>): Vec3 {
    const ease = capture ? 0.28 * u + 0.72 * easeInOutCubic(u) : easeInOutCubic(u);
    let bx = from.x + (toVec.x - from.x) * ease;
    let bz = from.z + (toVec.z - from.z) * ease;
    let by = 0;
    const arch = Math.sin(u * Math.PI);
    if (mover.type === 'n') {
      if (knightLateralSign !== 0) {
        bx += segPerpX * knightLateralSign * 0.165 * arch;
        bz += segPerpZ * knightLateralSign * 0.165 * arch;
        by = arch * 0.06;
      } else if (knightVaultPeak > 0) by = Math.pow(arch, 0.65) * knightVaultPeak;
      else by = arch * 0.06;
    }
    for (const b of bystanders) {
      const hx = b.home.x;
      const hz = b.home.z;
      if (by >= b.height + 0.025) continue; // already above its crown
      const dHx = bx - hx;
      const dHz = bz - hz;
      const dHome = Math.hypot(dHx, dHz);
      let cx = hx;
      let cz = hz;
      // Squeezing past: the neighbour leans out within its own square.
      if (dHome < 0.36 && dHome > 0.001 && knightVaultPeak === 0) {
        const yieldDist = Math.min(0.068, Math.max(0, (0.36 - dHome) / 0.36) * arch * 0.082);
        cx = hx - (dHx / dHome) * yieldDist;
        cz = hz - (dHz / dHome) * yieldDist;
        nudged.set(b.id, { x: cx, y: 0, z: cz });
      }
      const sx = bx - cx;
      const sz = bz - cz;
      const sep = Math.hypot(sx, sz);
      if (sep < minSep) {
        if (mover.type === 'n' && knightVaultPeak > 0) by = Math.max(by, b.height + 0.03);
        else if (sep > 0.0001) {
          bx += (sx / sep) * (minSep - sep);
          bz += (sz / sep) * (minSep - sep);
        } else {
          bx += segPerpX * minSep;
          bz += segPerpZ * minSep;
        }
      }
    }
    return { x: bx, y: by, z: bz };
  }

  const squares = Math.max(1, Math.hypot(to.r - fromR, to.c - fromC));
  const walkTime = 0.64 + Math.max(0, squares - 1) * 0.14;
  const prof = ATTACK_SYNC_PROFILES[mover.type];
  const tApproach = capture ? 0.66 + Math.max(0, squares - 1) * 0.125 : walkTime;
  const tContact = capture ? tApproach + prof.contactClip / prof.timeScale : walkTime;
  const tImpact = capture ? tApproach + prof.blowClip / prof.timeScale : walkTime;
  const tStrikeDone = capture ? tImpact + 0.48 : walkTime;
  const returnTime = capture ? 1.18 + Math.min(0.42, (plan.camReturnDist ?? 3) * 0.1) : 0;
  const duration = capture ? tStrikeDone + returnTime : walkTime;

  /** How far past the standoff the attacker has stepped at a point in its attack clip. */
  const lunge = (clip: number) => {
    const stalk = 0.028;
    if (clip < prof.swingStartClip) return Math.min(1, clip / Math.max(0.05, prof.swingStartClip)) * stalk;
    const slash = Math.min(1, (clip - prof.swingStartClip) / Math.max(0.05, prof.blowClip - prof.swingStartClip));
    return stalk + Math.sin(slash * Math.PI * 0.85) * Math.max(0.018, prof.maxLunge - stalk);
  };
  const atLunge = (clip: number): Vec3 => {
    const l = lunge(clip);
    return { x: strike.x + dirX * l, y: 0, z: strike.z + dirZ * l };
  };
  const lerp = (a: Vec3, b: Vec3, k: number): Vec3 => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k });
  const postShatter = atLunge(prof.blowClip);
  const postStrike = lerp(postShatter, end, 0.38);
  const rookFrom = rook ? boardToWorld(rook.from.r, rook.from.c) : null;
  const rookTo = rook ? boardToWorld(rook.to.r, rook.to.c) : null;

  /** During the swing, statues right beside the attacker lean away from the blade. */
  function strikeNudge(nudged: Map<number, Vec3>, k = 1) {
    for (const b of bystanders) {
      const dxB = strike.x - b.home.x;
      const dzB = strike.z - b.home.z;
      const dB = Math.hypot(dxB, dzB);
      if (dB < 0.42 && dB > 0.001) {
        const y = ((0.42 - dB) / 0.42) * 0.068 * k;
        nudged.set(b.id, { x: b.home.x - (dxB / dB) * y, y: 0, z: b.home.z - (dzB / dB) * y });
      }
    }
  }

  function sample(rawT: number): ChoreoFrame {
    const t = Math.max(0, rawT);
    const nudged = new Map<number, Vec3>();
    if (!capture) {
      const u = Math.min(1, t / walkTime);
      const mv = u >= 1 ? { ...end } : trajectory(u, start, end, nudged);
      let rk: Vec3 | null = null;
      if (rookFrom && rookTo) {
        rk = lerp(rookFrom, rookTo, easeInOutCubic(u));
        rk.y = Math.sin(u * Math.PI) * 0.05;
      }
      return { phase: u >= 1 ? 'done' : 'walk', mover: mv, victim: null, rook: rk, nudged };
    }
    if (t <= tApproach) {
      const u = Math.min(1, t / tApproach);
      return { phase: 'approach', mover: trajectory(u, start, strike, nudged), victim: { ...target }, rook: null, nudged };
    }
    if (t <= tStrikeDone) {
      strikeNudge(nudged);
      const clip = (t - tApproach) * prof.timeScale;
      if (t < tImpact) {
        let vic = { ...target };
        if (clip >= prof.contactClip) {
          // The blade lands and shoves the defender back before it bursts.
          const shove = Math.min(1, (clip - prof.contactClip) / Math.max(0.04, prof.blowClip - prof.contactClip)) * 0.045;
          vic = { x: target.x + dirX * shove, y: 0, z: target.z + dirZ * shove };
        }
        return { phase: 'strike', mover: atLunge(clip), victim: vic, rook: null, nudged };
      }
      // Burst: the attacker carries straight on toward the square, no freeze.
      const u = Math.min(1, Math.max(0, (t - tImpact) / Math.max(0.08, tStrikeDone - tImpact)));
      return { phase: 'strike', mover: lerp(postShatter, end, u * 0.38), victim: null, rook: null, nudged };
    }
    const u = Math.min(1, (t - tStrikeDone) / Math.max(0.1, duration - tStrikeDone));
    // The source leaves the neighbours leaning until the move ends; here they settle back as it finishes.
    strikeNudge(nudged, 1 - easeInOutCubic(u));
    const mv = lerp(postStrike, end, 0.35 * u + 0.65 * easeInOutCubic(u));
    return { phase: u >= 1 ? 'done' : 'return', mover: mv, victim: null, rook: null, nudged };
  }

  return {
    plan,
    capture,
    start,
    end,
    target,
    strike,
    dir: { x: dirX, z: dirZ },
    heading,
    victimHeading,
    tApproach,
    tContact,
    tImpact,
    tStrikeDone,
    duration,
    sample,
  };
}

/**
 * The source's duel camera: a three-quarter view from whichever side of the
 * fight has fewer statues in the way, first wide (`mid`) and then close in
 * (`close`), looking from just behind the attacker's standoff toward the
 * defender. `camera` is where the camera is now, in the same board space.
 */
export function duelCamera(ch: Choreo, camera: Vec3, bystanders: Vec3[]) {
  const { strike, target, dir } = ch;
  const mid: Vec3 = { x: (strike.x + target.x) * 0.5, y: 0.32, z: (strike.z + target.z) * 0.5 };
  const perpA = { x: -dir.z, z: dir.x };
  const perpB = { x: dir.z, z: -dir.x };
  const toCam = { x: camera.x - mid.x, z: camera.z - mid.z };
  const pref = toCam.x * perpA.x + toCam.z * perpA.z >= 0 ? perpA : perpB;
  const alt = pref === perpA ? perpB : perpA;
  const occlusion = (perp: { x: number; z: number }) => {
    let penalty = 0;
    for (const probe of [
      { p: 1.24, d: -0.34 },
      { p: 0.92, d: 0.14 },
    ]) {
      const camX = mid.x + perp.x * probe.p + dir.x * probe.d;
      const camZ = mid.z + perp.z * probe.p + dir.z * probe.d;
      const rayX = mid.x - camX;
      const rayZ = mid.z - camZ;
      const len2 = Math.max(0.0001, rayX * rayX + rayZ * rayZ);
      for (const b of bystanders) {
        const t = ((b.x - camX) * rayX + (b.z - camZ) * rayZ) / len2;
        if (t > 0.1 && t < 0.98) {
          const d = Math.hypot(b.x - (camX + rayX * t), b.z - (camZ + rayZ * t));
          if (d < 0.44) penalty += (0.44 - d) * 12;
        }
      }
    }
    return penalty;
  };
  const perp = occlusion(pref) > occlusion(alt) + 0.25 ? alt : pref;
  return {
    perp,
    wide: { x: mid.x + perp.x * 1.34 - dir.x * 0.44, y: 0.96, z: mid.z + perp.z * 1.34 - dir.z * 0.44 },
    close: { x: mid.x + perp.x * 0.92 + dir.x * 0.18, y: 0.74, z: mid.z + perp.z * 0.92 + dir.z * 0.18 },
    lookStart: { x: strike.x + dir.x * 0.1, y: 0.34, z: strike.z + dir.z * 0.1 },
    lookEnd: { x: target.x - dir.x * 0.05, y: 0.3, z: target.z - dir.z * 0.05 },
  };
}

// ---------------------------------------------------------------------------
// Stone shatter
// ---------------------------------------------------------------------------

export interface Shard {
  pos: Vec3;
  vel: Vec3;
  rot: Vec3;
  rotVel: Vec3;
  size: number;
  /** Seconds left. */
  life: number;
  /** Current scale (shrinks over the last half second). */
  scale: number;
}

export const SHARD_COUNT = 32;
export const SHARD_LIFE = 2.2;
/** How high above the board a shard rests (its own radius, more or less). */
export const SHARD_REST = 0.03;

/** The source's burst: 32 dodecahedral chips flung up and out from where the defender stood. */
export function spawnShards(at: Vec3, random: () => number = Math.random): Shard[] {
  const out: Shard[] = [];
  for (let i = 0; i < SHARD_COUNT; i++) {
    const size = 0.024 + random() * 0.048;
    out.push({
      pos: { x: at.x + (random() - 0.5) * 0.16, y: at.y + 0.1 + random() * 0.28, z: at.z + (random() - 0.5) * 0.16 },
      vel: { x: (random() - 0.5) * 2.2, y: 1.2 + random() * 2.0, z: (random() - 0.5) * 2.2 },
      rot: { x: 0, y: 0, z: 0 },
      rotVel: { x: random() * 9, y: random() * 9, z: random() * 9 },
      size,
      life: SHARD_LIFE,
      scale: size,
    });
  }
  return out;
}

/**
 * One physics step for the shards, in place: gravity, a damped bounce on the
 * floor, and a bounce off any statue still standing (`statues`, board-plane
 * centres). `floor(x, z)` is the height they land on: the board, or lower if
 * they fly off the plinth. Spent shards are removed.
 */
export function stepShards(shards: Shard[], dt: number, statues: { x: number; z: number }[], floor: (x: number, z: number) => number = () => 0) {
  for (let i = shards.length - 1; i >= 0; i--) {
    const d = shards[i];
    d.life -= dt;
    if (d.life <= 0) {
      shards.splice(i, 1);
      continue;
    }
    d.vel.y -= 9.8 * dt;
    d.pos.x += d.vel.x * dt;
    d.pos.y += d.vel.y * dt;
    d.pos.z += d.vel.z * dt;
    const ground = floor(d.pos.x, d.pos.z) + SHARD_REST;
    if (d.pos.y < ground) {
      d.pos.y = ground;
      d.vel.y *= -0.35;
      d.vel.x *= 0.72;
      d.vel.z *= 0.72;
    }
    if (d.pos.y < 0.48) {
      for (const p of statues) {
        const rx = d.pos.x - p.x;
        const rz = d.pos.z - p.z;
        const rd = Math.hypot(rx, rz);
        if (rd < 0.165 && rd > 0.0001) {
          const nx = rx / rd;
          const nz = rz / rd;
          d.pos.x = p.x + nx * 0.165;
          d.pos.z = p.z + nz * 0.165;
          const vn = d.vel.x * nx + d.vel.z * nz;
          if (vn < 0) {
            d.vel.x -= 1.55 * vn * nx;
            d.vel.z -= 1.55 * vn * nz;
          }
        }
      }
    }
    d.rot.x += d.rotVel.x * dt;
    d.rot.y += d.rotVel.y * dt;
    d.rot.z += d.rotVel.z * dt;
    d.scale = d.life < 0.5 ? d.size * Math.max(0.01, d.life * 2) : d.size;
  }
}
