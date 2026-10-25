import { useEffect, useState } from 'react';
import { AIM_HOME, type Duck } from './range';

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
  /** Up close with the radio man. */
  | 'talk'
  /** Camera on its way to the scope while the range folds up. */
  | 'scope-in'
  | 'play'
  /** Riding the bullet. */
  | 'bullet'
  /** Range folding away, camera on its way back to the chopper. */
  | 'leaving';

export type Zoom = 1 | 2 | 3;
export const ZOOM_FOV: Record<Zoom, number> = { 1: 34, 2: 12, 3: 5.5 };
export const ZOOM_LABEL: Record<Zoom, string> = { 1: 'No zoom', 2: '3x', 3: '6x' };
export type BulletCamMode = 'hits' | 'all' | 'off';
export type WaveStage = 'launch' | 'flying' | 'tally' | 'round' | 'over';

export const sniper = {
  phase: 'off' as SniperPhase,
  /** Rifle aim, radians. */
  yaw: AIM_HOME.yaw,
  pitch: AIM_HOME.pitch,
  zoom: 2 as Zoom,
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
  radio: null as null | { text: string; until: number },
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

/** The mission owns the camera and the keys from the talk onward. */
export function sniperBusy() {
  return sniper.phase !== 'off' && sniper.phase !== 'near';
}

/** Set by the mission while it is mounted. */
export const sniperControls = {
  talk: null as null | (() => void),
  accept: null as null | (() => void),
  leave: null as null | (() => void),
  fire: null as null | (() => void),
  zoom: null as null | (() => void),
  cycleBulletCam: null as null | (() => void),
  again: null as null | (() => void),
};
