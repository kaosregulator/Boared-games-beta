import * as THREE from 'three';
import { CEILING, floorAt, pushOut, roofAt } from './town';

/**
 * The toy helicopter. Arcade flying that a kid can pick up in ten seconds:
 * it holds its height on its own, stops when you let go, and turns on the
 * spot. The body tilts and banks for show; the controls never fight you.
 * Runs in Node (no DOM), so the feel can be checked with a script.
 */

export interface HeliInput {
  /** -1..1, W/S. */
  forward: number;
  /** -1..1, D/A. Positive turns right. */
  turn: number;
  /** -1..1, Space/Shift. */
  lift: number;
  /** -1..1, E/Q. */
  strafe: number;
  /** Mouse drag, radians this frame, added straight onto the heading. */
  yawNudge: number;
  boost: boolean;
}

export const NO_INPUT: HeliInput = { forward: 0, turn: 0, lift: 0, strafe: 0, yawNudge: 0, boost: false };

export const HELI = {
  /** Collision radius of the body (the rotor is soft plastic: it ignores walls). */
  radius: 0.06,
  height: 0.06,
  /** Skids sit this far below the body's origin. */
  skid: 0.006,
  topSpeed: 0.95,
  boostSpeed: 1.6,
  reverseSpeed: 0.45,
  strafeSpeed: 0.55,
  climb: 0.7,
  /** How fast the velocity catches up with the stick (1/s). */
  accel: 2.6,
  /** Hands off: it settles into a hover a bit quicker than it speeds up. */
  settle: 3.4,
  climbAccel: 5,
  /** Turn rate at a hover and at top speed (rad/s). Wide turns when fast. */
  turnSlow: 2.5,
  turnFast: 1.9,
  /** How quickly the turn rate follows the stick: high is snappy, still smooth. */
  turnResponse: 9,
  maxBank: 0.5,
  maxPitch: 0.32,
};

export interface HeliState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  yawRate: number;
  /** For drawing only. */
  bank: number;
  pitch: number;
  grounded: boolean;
  rotor: number;
  /** Seconds since takeoff, for the start-up spin. */
  spin: number;
}

export function newHeli(x: number, y: number, z: number, yaw: number): HeliState {
  return { pos: new THREE.Vector3(x, y, z), vel: new THREE.Vector3(), yaw, yawRate: 0, bank: 0, pitch: 0, grounded: true, rotor: 0, spin: 0 };
}

export function placeHeli(h: HeliState, x: number, y: number, z: number, yaw: number) {
  h.pos.set(x, y, z);
  h.vel.set(0, 0, 0);
  h.yaw = yaw;
  h.yawRate = 0;
  h.bank = 0;
  h.pitch = 0;
  h.grounded = true;
}

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _want = new THREE.Vector3();
const _prev = new THREE.Vector3();

export function heliForward(yaw: number, out = _fwd) {
  return out.set(Math.sin(yaw), 0, Math.cos(yaw));
}

const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

export type HeliEvent = 'bump' | 'land' | 'takeoff';

export function stepHeli(h: HeliState, input: HeliInput, dt: number): HeliEvent[] {
  const events: HeliEvent[] = [];
  const T = HELI;
  h.rotor = Math.min(1, h.rotor + dt * 0.9);
  const ready = h.rotor > 0.35;

  // Turning: rate follows the stick, slower turns at speed so it carves.
  const flat = Math.hypot(h.vel.x, h.vel.z);
  const speedT = Math.min(1, flat / T.topSpeed);
  const maxRate = T.turnSlow + (T.turnFast - T.turnSlow) * speedT;
  h.yawRate += (-input.turn * maxRate - h.yawRate) * ease(T.turnResponse, dt);
  if (!h.grounded || Math.abs(input.lift) > 0 || Math.abs(input.forward) > 0) {
    h.yaw += h.yawRate * dt - input.yawNudge;
  } else {
    h.yaw -= input.yawNudge;
  }

  // Horizontal: the wanted velocity is along the nose, so turning swings it round.
  const fwd = heliForward(h.yaw, _fwd);
  _right.set(-fwd.z, 0, fwd.x);
  const top = input.boost ? T.boostSpeed : T.topSpeed;
  const along = input.forward >= 0 ? input.forward * top : input.forward * T.reverseSpeed;
  _want.copy(fwd).multiplyScalar(along).addScaledVector(_right, input.strafe * T.strafeSpeed);
  const hands = Math.abs(input.forward) < 0.05 && Math.abs(input.strafe) < 0.05;
  const k = ease(hands ? T.settle : T.accel * (input.boost ? 1.3 : 1), dt);
  if (h.grounded) _want.set(0, 0, 0);
  h.vel.x += (_want.x - h.vel.x) * k;
  h.vel.z += (_want.z - h.vel.z) * k;

  // Vertical: holds height when the stick is centred; a gentle hover bob.
  const wantVy = ready ? input.lift * T.climb : 0;
  h.vel.y += (wantVy - h.vel.y) * ease(T.climbAccel, dt);

  _prev.copy(h.pos);
  h.pos.addScaledVector(h.vel, dt);

  // Floor and whatever's under us: land on tops, take off with lift.
  const ground = floorAt(h.pos.x, h.pos.z, _prev.y + 0.02);
  if (h.pos.y <= ground + T.skid) {
    h.pos.y = ground + T.skid;
    if (h.vel.y < 0) h.vel.y = 0;
    if (!h.grounded) {
      h.grounded = true;
      events.push('land');
    }
  } else if (h.grounded && h.pos.y > ground + T.skid + 0.004) {
    h.grounded = false;
    events.push('takeoff');
  }
  if (h.grounded && input.lift > 0.1 && ready) {
    h.grounded = false;
    h.pos.y += 0.002;
    events.push('takeoff');
  }
  // Ceiling and undersides (the desk top, the bed frame).
  const roof = Math.min(CEILING, roofAt(h.pos.x, h.pos.z, _prev.y + T.height * 0.5));
  if (h.pos.y + T.height > roof) {
    h.pos.y = roof - T.height;
    if (h.vel.y > 0) h.vel.y = 0;
  }

  // Walls and furniture: slide along them.
  const before = h.pos.clone();
  const hit = pushOut(h.pos, T.radius, h.pos.y + 0.005, h.pos.y + T.height);
  if (hit || before.x !== h.pos.x || before.z !== h.pos.z) {
    const nx = h.pos.x - before.x;
    const nz = h.pos.z - before.z;
    const n = Math.hypot(nx, nz);
    if (n > 1e-6) {
      const dot = (h.vel.x * nx + h.vel.z * nz) / n;
      if (dot < 0) {
        h.vel.x -= (dot * nx) / n * 1.25;
        h.vel.z -= (dot * nz) / n * 1.25;
        if (dot < -0.25) events.push('bump');
      }
    }
  }

  // Looks: nose down when speeding up, bank into turns.
  const fwdSpeed = h.vel.x * fwd.x + h.vel.z * fwd.z;
  const side = h.vel.x * _right.x + h.vel.z * _right.z;
  const wantPitch = h.grounded ? 0 : Math.max(-T.maxPitch, Math.min(T.maxPitch, (fwdSpeed / T.boostSpeed) * T.maxPitch * 1.3 + (along - fwdSpeed) * 0.12));
  const wantBank = h.grounded ? 0 : Math.max(-T.maxBank, Math.min(T.maxBank, -h.yawRate * speedT * 0.32 + side * 0.4));
  h.pitch += (wantPitch - h.pitch) * ease(5, dt);
  h.bank += (wantBank - h.bank) * ease(5, dt);
  if (!h.grounded) h.spin += dt;
  return events;
}
