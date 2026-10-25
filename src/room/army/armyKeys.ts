/**
 * The army town's keys, laid out like the main room's: WASD moves (W/S
 * forward and back, A/D step sideways) and the arrow keys look (left and
 * right turn, up and down tilt the view). The same split works on foot and
 * in the chopper, in every camera. Q/E also turn, for one hand on WASD.
 */

export interface ArmyKeyInput {
  /** -1 back … 1 forward. */
  forward: number;
  /** -1 left … 1 right, sideways. */
  strafe: number;
  /** -1 left … 1 right, turning. */
  turn: number;
  /** -1 look down … 1 look up. */
  look: number;
}

export interface TouchPad {
  fwd: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
}

export function readArmyKeys(k: Record<string, boolean | undefined>, touch?: TouchPad): ArmyKeyInput {
  const on = (code: string) => (k[code] ? 1 : 0);
  return {
    forward: on('KeyW') - on('KeyS') + (touch?.fwd ? 1 : 0) - (touch?.back ? 1 : 0),
    strafe: on('KeyD') - on('KeyA'),
    turn: on('ArrowRight') - on('ArrowLeft') + on('KeyE') - on('KeyQ') + (touch?.right ? 1 : 0) - (touch?.left ? 1 : 0),
    look: on('ArrowUp') - on('ArrowDown'),
  };
}

/** How far the view can tilt, in radians: a bit down at your boots, well up at the ceiling. */
export const LOOK_MIN = -0.7;
export const LOOK_MAX = 1.05;
/** Radians a second while an arrow is held. */
export const LOOK_RATE = 1.3;

export function stepLook(pitch: number, look: number, dt: number) {
  return Math.max(LOOK_MIN, Math.min(LOOK_MAX, pitch + look * LOOK_RATE * dt));
}
