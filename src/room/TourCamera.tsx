import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PLAYER } from './videoRoom';

export interface Waypoint {
  /** Eye position. */
  at: [number, number, number];
  /** Point the camera is aimed at. */
  look: [number, number, number];
  /** Seconds spent travelling to this waypoint. */
  travel: number;
  /** Seconds held once arrived. */
  hold: number;
  label: string;
}

/**
 * Standing camera marks around the room, used for the scripted walkthrough and
 * for deterministic screenshots while checking the art.
 */
export const TOUR: Waypoint[] = [
  { at: [0.0, PLAYER.height, 1.85], look: [0.15, 1.2, -2.4], travel: 0, hold: 2.0, label: 'Doorway view' },
  { at: [-0.35, PLAYER.height, 0.45], look: [0.05, 1.25, -2.45], travel: 2.6, hold: 1.6, label: 'CRT and posters' },
  { at: [-1.2, PLAYER.height, 0.15], look: [-2.2, 0.85, -1.0], travel: 2.2, hold: 1.6, label: 'Bed and quilt' },
  { at: [0.55, PLAYER.height, -0.35], look: [1.85, 1.35, -2.35], travel: 2.4, hold: 1.4, label: 'Turning to the shelf' },
  // Face the shelf front — look at the game-box face, not the side wall
  { at: [1.35, PLAYER.height, -1.05], look: [1.95, 1.25, -2.35], travel: 2.2, hold: 1.8, label: 'At the shelf' },
  { at: [1.55, 1.35, -1.55], look: [1.95, 1.35, -2.35], travel: 1.8, hold: 2.2, label: 'Reaching the boxes' },
  { at: [1.55, PLAYER.height, -0.55], look: [2.35, 1.0, -1.15], travel: 2.0, hold: 1.4, label: 'Computer desk' },
  { at: [0.25, PLAYER.height, 0.95], look: [0.9, 1.15, -2.4], travel: 2.4, hold: 2.0, label: 'Back to idle' },
];

const EASE = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const POS = new THREE.Vector3();
const LOOK = new THREE.Vector3();

interface TourCameraProps {
  /** Freeze on a single waypoint instead of animating; used for screenshots. */
  staticIndex?: number;
  onWaypoint?: (label: string, index: number) => void;
  onDone?: () => void;
  loop?: boolean;
}

export function TourCamera({ staticIndex, onWaypoint, onDone, loop = true }: TourCameraProps) {
  const { camera } = useThree();
  const clock = useRef(0);
  const announced = useRef(-1);

  const legs = useMemo(() => {
    let t = 0;
    return TOUR.map((wp, i) => {
      const start = t;
      t += wp.travel + wp.hold;
      return { wp, prev: TOUR[Math.max(0, i - 1)], start, end: t };
    });
  }, []);
  const total = legs[legs.length - 1].end;

  useEffect(() => {
    if (staticIndex === undefined) return;
    const wp = TOUR[Math.min(staticIndex, TOUR.length - 1)];
    camera.position.set(...wp.at);
    camera.lookAt(...wp.look);
  }, [camera, staticIndex]);

  useFrame((_, delta) => {
    if (staticIndex !== undefined) return;

    // The capture harness drives the tour frame by frame so the recording is
    // smooth regardless of how slowly software rendering actually runs.
    const driven = (window as unknown as { __tourTime?: number }).__tourTime;
    if (typeof driven === 'number') clock.current = driven;
    else clock.current += Math.min(delta, 0.05);

    if (clock.current > total) {
      if (!loop) {
        onDone?.();
        return;
      }
      clock.current = 0;
      announced.current = -1;
    }
    const t = clock.current;
    const leg = legs.find(l => t >= l.start && t < l.end) ?? legs[legs.length - 1];
    const idx = legs.indexOf(leg);
    if (idx !== announced.current) {
      announced.current = idx;
      onWaypoint?.(leg.wp.label, idx);
    }
    const travelled = leg.wp.travel > 0 ? Math.min(1, (t - leg.start) / leg.wp.travel) : 1;
    const k = EASE(travelled);
    POS.set(...leg.prev.at).lerp(new THREE.Vector3(...leg.wp.at), k);
    LOOK.set(...leg.prev.look).lerp(new THREE.Vector3(...leg.wp.look), k);
    // walking sway so the dolly reads as footsteps rather than a crane
    const sway = travelled > 0 && travelled < 1 ? Math.sin(t * 7.2) * 0.018 : Math.sin(t * 1.2) * 0.005;
    camera.position.set(POS.x, POS.y + sway, POS.z);
    camera.lookAt(LOOK);
  });

  return null;
}
