import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { ROOM } from './roomConfig';

const FORWARD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const MOVE = new THREE.Vector3();
const LOOK_EULER = new THREE.Euler(0, 0, 0, 'YXZ');

interface PlayerControllerProps {
  enabled: boolean;
  onLockChange?: (locked: boolean) => void;
}

export function PlayerController({ enabled, onLockChange }: PlayerControllerProps) {
  const { camera } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    camera.position.set(...ROOM.spawn.position);
    camera.lookAt(...ROOM.spawn.lookAt);
  }, [camera]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const onLock = () => onLockChange?.(true);
    const onUnlock = () => onLockChange?.(false);
    controls.addEventListener('lock', onLock);
    controls.addEventListener('unlock', onUnlock);
    return () => {
      controls.removeEventListener('lock', onLock);
      controls.removeEventListener('unlock', onUnlock);
    };
  }, [onLockChange]);

  useFrame((_, delta) => {
    if (!enabled) return;
    const locked = controlsRef.current?.isLocked;
    if (!locked) return;

    const sprint = keys.current.ShiftLeft || keys.current.ShiftRight;
    const speed = ROOM.walkSpeed * (sprint ? ROOM.sprintMultiplier : 1) * Math.min(delta, 0.05);

    camera.getWorldDirection(FORWARD);
    FORWARD.y = 0;
    FORWARD.normalize();
    RIGHT.crossVectors(FORWARD, camera.up).normalize();

    MOVE.set(0, 0, 0);
    if (keys.current.KeyW || keys.current.ArrowUp) MOVE.add(FORWARD);
    if (keys.current.KeyS || keys.current.ArrowDown) MOVE.sub(FORWARD);
    if (keys.current.KeyD || keys.current.ArrowRight) MOVE.add(RIGHT);
    if (keys.current.KeyA || keys.current.ArrowLeft) MOVE.sub(RIGHT);

    if (MOVE.lengthSq() > 0) {
      MOVE.normalize().multiplyScalar(speed);
      camera.position.add(MOVE);
    }

    camera.position.x = THREE.MathUtils.clamp(camera.position.x, ROOM.bounds.minX, ROOM.bounds.maxX);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, ROOM.bounds.minZ, ROOM.bounds.maxZ);

    // Keep look pitch from flipping into floor/ceiling blackness
    LOOK_EULER.setFromQuaternion(camera.quaternion, 'YXZ');
    LOOK_EULER.x = THREE.MathUtils.clamp(LOOK_EULER.x, -1.1, 1.1);
    camera.quaternion.setFromEuler(LOOK_EULER);

    // Subtle breathing sway while idle
    const t = performance.now() * 0.001;
    camera.position.y = ROOM.playerHeight + Math.sin(t * 1.4) * 0.012;
  });

  return <PointerLockControls ref={controlsRef} selector="#enter-game-room" />;
}
