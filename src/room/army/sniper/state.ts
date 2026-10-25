import { useEffect, useState } from 'react';
import { AIM_HOME, type Duck } from './range';
import type { Bubble } from '../SpeechBubble';

/** The radio man's briefing, one bubble at a time. Ends by sending you to the sniper. */
export const RADIO_BRIEF = [
  "Psst! Up here, soldier! Keep it down, Mom thinks we're asleep.",
  "We're under attack! The ducks came in through the window and took the beanbag.",
  "Private Scope has the only rifle on the shelf. He's been lying down since 1994.",
  "Go talk to the sniper when you're ready. He's the flat one, right next to me.",
] as const;

export const SNIPER_PITCH =
  "Private Scope, reporting. My legs fell asleep in '94. Ducks by the beanbag. Want the rifle?";

/**
 * Shared between the shelf soldiers (always in the room), the mission (only
 * while you are in the army town) and the HUD. Mutated in place every frame;
 * listeners hear about it a few times a second.
 */

export type SniperPhase =
  /** Nothing going on. The two soldiers just stand on the shelf. */
  | 'off'
  /** Landed close by: the radio man waves you over. */
  | 'near'
  /** The radio man's briefing: camera on him, a bubble over his head. */
  | 'brief'
  /** Up close with the sniper, deciding whether to take his rifle. */
  | 'talk'
  /** Camera on its way to the scope while the range folds up. */
  | 'scope-in'
  | 'play'
  /** Riding the bullet. */
  | 'bullet'
  /** Range folding away, camera on its way back to the chopper. */
  | 'leaving';

export type Zoom = 1 | 2 | 3;
/** Normal play: a gentle zoom so you can still see the ducks rise out of the grass. */
export const ZOOM_FOV: Record<Zoom, number> = { 1: 40, 2: 24, 3: 14 };
export const ZOOM_LABEL: Record<Zoom, string> = { 1: 'No zoom', 2: '2x', 3: '3x' };
/** Hard mode: the old tight scope, with the black ring round it. */
export const HARD_ZOOM_FOV: Record<Zoom, number> = { 1: 34, 2: 12, 3: 5.5 };
export const HARD_ZOOM_LABEL: Record<Zoom, string> = { 1: 'No zoom', 2: '3x', 3: '6x' };

const HARD_KEY = 'shelf-sniper-hard';

function readHard() {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(HARD_KEY) === '1';
  } catch {
    return false;
  }
}

/** Field of view for this zoom, in normal or hard mode. */
export function zoomFov(zoom: Zoom, hard = sniper.hard) {
  return (hard ? HARD_ZOOM_FOV : ZOOM_FOV)[zoom];
}

export function zoomLabel(zoom: Zoom, hard = sniper.hard) {
  return (hard ? HARD_ZOOM_LABEL : ZOOM_LABEL)[zoom];
}
export type BulletCamMode = 'hits' | 'all' | 'off';
export type WaveStage = 'launch' | 'flying' | 'tally' | 'round' | 'over';

export const sniper = {
  phase: 'off' as SniperPhase,
  /**
   * Who you're close to on the shelf: still in the chopper ('land'), on foot by the
   * radio man, or by the sniper once the radio man has briefed you.
   */
  near: null as null | 'land' | 'radio' | 'sniper',
  /** The radio man has said his piece: next stop, the sniper. */
  briefed: false,
  briefLine: 0,
  /** Speech bubble over whoever's talking, in screen space. */
  bubble: null as Bubble | null,
  /** Rifle aim, radians. */
  yaw: AIM_HOME.yaw,
  pitch: AIM_HOME.pitch,
  zoom: 2 as Zoom,
  /** Hard mode: tight zoom and the black scope ring. Off by default. */
  hard: readHard(),
  bulletCam: 'hits' as BulletCamMode,
  /** 0 flat on the carpet, 1 fully popped up. */
  rise: 0,
  /** The radio man hops when he talks. */
  hop: 0,
  /** Hide the sniper while you look through his scope. */
  scoped: false,
  round: 1,
  wave: 0,
  stage: 'launch' as WaveStage,
  shells: 3,
  score: 0,
  best: 0,
  /** This round's ten ducks: null not up yet, true hit, false got away. */
  tally: [] as (boolean | null)[],
  ducks: [] as Duck[],
  /** Holding your breath steadies the scope. 1 full. */
  breath: 1,
  holding: false,
  /** The on-screen Breath button. */
  touchBreath: false,
  banner: null as null | { text: string; sub?: string; until: number },
  /** A short line from the radio man in the corner. */
  radio: null as null | { text: string; until: number; who?: string },
  /** Black flash between cameras. */
  fade: 0,
  listeners: new Set<() => void>(),
};

export function emitSniper() {
  sniper.listeners.forEach(fn => fn());
}

export function useSniper() {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump(n => n + 1);
    sniper.listeners.add(fn);
    return () => {
      sniper.listeners.delete(fn);
    };
  }, []);
  return sniper;
}

export function setSniperHard(on: boolean) {
  sniper.hard = on;
  try {
    window.localStorage.setItem(HARD_KEY, on ? '1' : '0');
  } catch {
    // still applies for this visit
  }
  emitSniper();
}

/** The mission owns the camera and the keys from the talk onward. */
export function sniperBusy() {
  return sniper.phase !== 'off' && sniper.phase !== 'near';
}

/** Set by the mission while it is mounted. */
export const sniperControls = {
  talk: null as null | (() => void),
  /** Next line of the radio man's briefing. */
  nextBrief: null as null | (() => void),
  accept: null as null | (() => void),
  leave: null as null | (() => void),
  fire: null as null | (() => void),
  zoom: null as null | (() => void),
  cycleBulletCam: null as null | (() => void),
  again: null as null | (() => void),
};
