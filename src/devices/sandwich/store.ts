import { useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { frameSubject, type Insets } from '../viewRig';
import { createGame, type Game } from './game';

/**
 * Sandwich Stacker on the desk: whether it's running, the camera that goes
 * with it, the keys, and what the HUD shows. The game itself is game.ts; the
 * sprites on the desk are SandwichDesk.tsx.
 *
 * intro: the camera shakes and 625 jumps out of the monitor onto the desk.
 * on:    playing, the camera locked square on to the desk.
 * outro: 625 hops back into the screen and Windows gets the keys again.
 */
export type Stage = 'off' | 'intro' | 'on' | 'outro';

/** Metres per game unit: 625 stands about 26 cm tall on the desk. */
export const U = 0.055;
/** The desk top (pcdesk.glb placed 1.65 m wide) and the strip in front of the keyboard. */
export const DESK_Y = 0.62;
export const PLANE_Z = 0.35;
export const FIELD_X = 0;
export const INTRO_S = 1.5;
export const OUTRO_S = 0.8;

export interface Hud {
  stage: Stage;
  round: number;
  score: number;
  ick: number;
  phase: Game['phase'];
  paused: boolean;
  caught: number;
  flavor: [string, string];
  /** A big line in the middle ("Level 2", "icky!"), with a key so the same text replays. */
  shout: { text: string; key: number; tone: 'level' | 'ick' } | null;
  /** The last "+N" while 625 eats. */
  points: { n: number; key: number } | null;
  favs: string[];
}

export const desk = {
  stage: 'off' as Stage,
  /** performance.now() when the stage began. */
  since: 0,
  game: null as Game | null,
  /** 0..1, decays: how hard the camera is shaking. */
  shake: 0,
  /** The camera's climb with the stack, eased. */
  lift: 0,
  touch: false,
  keys: { left: false, right: false },
  touchMove: 0,
};

let hud: Hud = {
  stage: 'off',
  round: 1,
  score: 0,
  ick: 0,
  phase: 'play',
  paused: false,
  caught: 0,
  flavor: ['', ''],
  shout: null,
  points: null,
  favs: [],
};
const listeners = new Set<() => void>();

export function setHud(next: Partial<Hud>) {
  hud = { ...hud, ...next };
  listeners.forEach(l => l());
}

export function useSandwichHud() {
  return useSyncExternalStore(
    l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => hud,
  );
}

export const sandwichActive = () => desk.stage !== 'off';
export const useSandwichStage = () => useSandwichHud().stage;

function setStage(stage: Stage) {
  desk.stage = stage;
  desk.since = performance.now();
  setHud({ stage });
}

/** The Sandwich Stacker icon on the PC: shake, and out he pops. */
export function startSandwich() {
  if (desk.stage !== 'off') return;
  desk.game = createGame();
  desk.lift = 0;
  desk.shake = 1;
  desk.keys.left = desk.keys.right = false;
  desk.touchMove = 0;
  setHud({ round: 1, score: 0, ick: 0, phase: 'play', paused: false, caught: 0, shout: null, points: null });
  setStage('intro');
}

export function introDone() {
  if (desk.stage === 'intro') setStage('on');
}

/** Back to Windows: 625 hops back into the monitor first. */
export function quitSandwich() {
  if (desk.stage === 'intro' || desk.stage === 'on') setStage('outro');
}

export function stopSandwich() {
  if (desk.stage === 'off') return;
  desk.game = null;
  setStage('off');
}

export const stageTime = () => (performance.now() - desk.since) / 1000;

// ---------- camera ----------

const smooth = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

/** How far the camera has moved from the computer close-up to the game view (0..1). */
export function cameraBlend() {
  const t = stageTime();
  if (desk.stage === 'intro') return smooth((t - 0.2) / 1.1);
  if (desk.stage === 'on') return 1;
  if (desk.stage === 'outro') return 1 - smooth(t / OUTRO_S);
  return 0;
}

const GAME_AT = new THREE.Vector3(FIELD_X, DESK_Y + 0.44, PLANE_Z + 1.3);
const GAME_CENTRE = new THREE.Vector3(FIELD_X, DESK_Y + 0.32, PLANE_Z);
const GAME_HALF = { w: 0.5, h: 0.35 };
const AT = new THREE.Vector3();
const CENTRE = new THREE.Vector3();
const FROM_AT = new THREE.Vector3();
const FROM_CENTRE = new THREE.Vector3();

/**
 * Square on to the desk front, like a side-scroller, and locked there while
 * you play; it only climbs with a tall sandwich. `from` is the computer
 * close-up it blends out of and back into. Positions are in the desk's own
 * frame; `baseY` lifts them to wherever the desk is parked.
 */
export function sandwichCamera(
  cam: THREE.PerspectiveCamera,
  size: { width: number; height: number },
  baseY: number,
  from: { at: readonly number[]; centre: readonly number[]; half: { w: number; h: number } },
  insets: Insets,
  dt: number,
) {
  const b = cameraBlend();
  const want = (desk.game?.lift ?? 0) * U;
  desk.lift += (want - desk.lift) * Math.min(1, dt * 1.5);
  FROM_AT.set(from.at[0], from.at[1], from.at[2]);
  FROM_CENTRE.set(from.centre[0], from.centre[1], from.centre[2]);
  AT.copy(GAME_AT).setY(GAME_AT.y + desk.lift).lerp(FROM_AT, 1 - b);
  CENTRE.copy(GAME_CENTRE).setY(GAME_CENTRE.y + desk.lift).lerp(FROM_CENTRE, 1 - b);
  // On a phone held upright, keep just the play strip (625's walk and the stack) in frame.
  const gameW = size.width < size.height ? 0.42 : GAME_HALF.w;
  const half = { w: THREE.MathUtils.lerp(from.half.w, gameW, b), h: THREE.MathUtils.lerp(from.half.h, GAME_HALF.h, b) };
  desk.shake = Math.max(0, desk.shake - dt * 1.6);
  const s = desk.shake * desk.shake * 0.02;
  const t = performance.now() / 1000;
  AT.x += Math.sin(t * 61) * s;
  AT.y += Math.sin(t * 53 + 1.3) * s;
  AT.y += baseY;
  CENTRE.y += baseY;
  cam.position.copy(AT);
  frameSubject(cam, CENTRE, half, insets, size, 1.04);
}

/** What the HUD and touch buttons cover. */
export function sandwichInsets(touch: boolean, width: number): Insets {
  // Under 640 px wide the score box drops below the header (top-16 in SandwichHud).
  return { top: width < 640 ? 124 : 64, right: 0, bottom: touch ? 130 : 48, left: 0 };
}
