import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PLAY_TABLE, TABLE_SEAT } from '../roomLayout';
import { walkRig } from '../WalkController';
import { setTriviaTableRect } from './triviaTable';

const GOAL = new THREE.Vector3();
const CORNER = new THREE.Vector3();

/**
 * Trivia only. Stands above the card table and looks straight down, so the
 * throwback board can lie flat on the wood. Other games keep the seat camera.
 */
export function TriviaTableCam({ active }: { active: boolean }) {
  const { camera, gl } = useThree();
  const was = useRef(false);
  const settled = useRef(false);
  const viewSize = useRef({ w: 0, h: 0 });

  useEffect(() => {
    return () => {
      if (!was.current) return;
      was.current = false;
      camera.up.set(0, 1, 0);
      setTriviaTableRect(null);
    };
  }, [camera]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    if (!active) {
      if (was.current) {
        was.current = false;
        settled.current = false;
        camera.up.set(0, 1, 0);
        walkRig.teleport = { at: TABLE_SEAT.at, look: TABLE_SEAT.look };
        setTriviaTableRect(null);
      }
      return;
    }
    if (!was.current) {
      was.current = true;
      settled.current = false;
    }

    const view = gl.domElement.getBoundingClientRect();
    const resized = view.width !== viewSize.current.w || view.height !== viewSize.current.h;
    if (resized) {
      viewSize.current = { w: view.width, h: view.height };
      settled.current = false;
    }
    // Once the shot has landed, leave the camera alone so the board stays put.
    if (settled.current) return;

    const persp = camera as THREE.PerspectiveCamera;
    const aspect = Math.max(0.3, persp.aspect || 1);
    const vHalf = Math.tan(THREE.MathUtils.degToRad(persp.fov / 2));
    const hHalf = vHalf * aspect;
    // The table top fills most of the frame, with a rim of the room around it.
    const fill = 0.9;
    const dist = Math.max((PLAY_TABLE.d / 2) / (vHalf * fill), (PLAY_TABLE.w / 2) / (hHalf * fill));
    GOAL.set(PLAY_TABLE.x, PLAY_TABLE.h + dist, PLAY_TABLE.z);

    const glide = 1 - Math.exp(-dt * 7);
    if (camera.position.distanceTo(GOAL) < 0.01) {
      camera.position.copy(GOAL);
      settled.current = true;
    } else camera.position.lerp(GOAL, glide);
    // South edge of the table (the player's seat) sits at the bottom of the screen.
    camera.up.set(0, 0, -1);
    camera.lookAt(PLAY_TABLE.x, PLAY_TABLE.h, PLAY_TABLE.z);
    camera.updateMatrixWorld();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const y = PLAY_TABLE.h + 0.004;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        CORNER.set(PLAY_TABLE.x + (sx * PLAY_TABLE.w) / 2, y, PLAY_TABLE.z + (sz * PLAY_TABLE.d) / 2);
        CORNER.project(camera);
        const px = view.left + (CORNER.x * 0.5 + 0.5) * view.width;
        const py = view.top + (-CORNER.y * 0.5 + 0.5) * view.height;
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
      }
    }
    const width = maxX - minX;
    const height = maxY - minY;
    if (width < 80 || height < 48) return;
    setTriviaTableRect({
      left: Math.round(minX),
      top: Math.round(minY),
      width: Math.round(width),
      height: Math.round(height),
    });
  });

  return null;
}
