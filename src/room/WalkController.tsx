import { useCallback, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { PLAYER, WALL } from './videoRoom';
import { ROOM_COLLIDERS as COLLIDERS } from './roomLayout';

const FORWARD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const WISH = new THREE.Vector3();
const LOOK = new THREE.Euler(0, 0, 0, 'YXZ');

interface WalkControllerProps {
  enabled: boolean;
  /** True once the player has stepped in. Movement does not require pointer lock. */
  engaged: boolean;
  onLockChange?: (locked: boolean) => void;
  /** Fires when the player's footfall lands, for step audio. */
  onStep?: () => void;
}

/**
 * Free-roam first-person movement with real furniture collision.
 *
 * The player is a circle of PLAYER.radius on the floor plane. Each frame the
 * desired position is resolved against the room walls and every furniture box,
 * pushing out along whichever axis has the smaller overlap so you slide along
 * the bed and the dresser instead of sticking to them.
 */
export function WalkController({ enabled, engaged, onLockChange, onStep }: WalkControllerProps) {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const controls = useRef<any>(null);
  const velocity = useRef(new THREE.Vector3());
  const bobPhase = useRef(0);
  const stepArmed = useRef(false);
  const eyeHeight = useRef(PLAYER.height);
  const dragging = useRef(false);
  const engagedRef = useRef(engaged);
  engagedRef.current = engaged;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    camera.position.set(...PLAYER.spawn);
    camera.lookAt(...PLAYER.spawnLook);
  }, [camera]);

  useEffect(() => {
    const blocked = new Set([
      'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyC',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
    ]);
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (blocked.has(e.code)) e.preventDefault();
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
    const node = controls.current;
    if (!node) return;
    const lock = () => onLockChange?.(true);
    const unlock = () => onLockChange?.(false);
    node.addEventListener('lock', lock);
    node.addEventListener('unlock', unlock);
    return () => {
      node.removeEventListener('lock', lock);
      node.removeEventListener('unlock', unlock);
    };
  }, [onLockChange]);

  useEffect(() => {
    const canvas = gl.domElement;
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || !enabledRef.current || !engagedRef.current) return;
      dragging.current = true;
    };
    const up = () => {
      dragging.current = false;
    };
    const move = (event: PointerEvent) => {
      if (!enabledRef.current || !engagedRef.current || controls.current?.isLocked || !dragging.current) return;
      LOOK.setFromQuaternion(camera.quaternion, 'YXZ');
      LOOK.y -= event.movementX * 0.0022;
      LOOK.x = THREE.MathUtils.clamp(LOOK.x - event.movementY * 0.0022, -1.15, 1.15);
      LOOK.z = 0;
      camera.quaternion.setFromEuler(LOOK);
    };
    const click = () => {
      if (!enabledRef.current || !engagedRef.current || controls.current?.isLocked) return;
      controls.current?.lock();
    };
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointermove', move);
    canvas.addEventListener('click', click);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointermove', move);
      canvas.removeEventListener('click', click);
    };
  }, [camera, gl]);

  const resolve = useCallback((x: number, z: number, eye: number) => {
    const r = PLAYER.radius;
    let px = THREE.MathUtils.clamp(x, -WALL.halfWidth + r, WALL.halfWidth - r);
    let pz = THREE.MathUtils.clamp(z, -WALL.halfDepth + r, WALL.halfDepth - r);

    for (const box of COLLIDERS) {
      // Anything shorter than the player's knees is walked over, not into.
      if (box.top < 0.22) continue;
      // Desk tops and shelves above head height never block the floor.
      const dx = px - box.x;
      const dz = pz - box.z;
      const overlapX = box.hx + r - Math.abs(dx);
      const overlapZ = box.hz + r - Math.abs(dz);
      if (overlapX <= 0 || overlapZ <= 0) continue;
      // Duck under a desk if the player is crouched and the surface is high.
      if (eye < PLAYER.height * 0.75 && box.top > 0.68 && box.top < 0.9) continue;
      if (overlapX < overlapZ) {
        px += Math.sign(dx || 1) * overlapX;
      } else {
        pz += Math.sign(dz || 1) * overlapZ;
      }
    }
    return [px, pz] as const;
  }, []);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    if (!enabled || !engagedRef.current) {
      dragging.current = false;
      velocity.current.multiplyScalar(0.8);
      return;
    }

    const crouching = keys.current.ControlLeft || keys.current.ControlRight || keys.current.KeyC;
    const sprinting = (keys.current.ShiftLeft || keys.current.ShiftRight) && !crouching;
    const targetEye = crouching ? PLAYER.crouchHeight : PLAYER.height;
    eyeHeight.current += (targetEye - eyeHeight.current) * Math.min(1, delta * 9);

    const speed = crouching ? PLAYER.crouchSpeed : sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;

    camera.getWorldDirection(FORWARD);
    FORWARD.y = 0;
    FORWARD.normalize();
    RIGHT.crossVectors(FORWARD, camera.up).normalize();

    WISH.set(0, 0, 0);
    if (keys.current.KeyW) WISH.add(FORWARD);
    if (keys.current.KeyS) WISH.sub(FORWARD);
    if (keys.current.KeyD) WISH.add(RIGHT);
    if (keys.current.KeyA) WISH.sub(RIGHT);
    if (WISH.lengthSq() > 0) WISH.normalize().multiplyScalar(speed);

    velocity.current.x += (WISH.x - velocity.current.x) * Math.min(1, delta * PLAYER.accel);
    velocity.current.z += (WISH.z - velocity.current.z) * Math.min(1, delta * PLAYER.accel);

    const [nx, nz] = resolve(
      camera.position.x + velocity.current.x * delta,
      camera.position.z + velocity.current.z * delta,
      eyeHeight.current,
    );
    camera.position.x = nx;
    camera.position.z = nz;

    // Footstep bob, with a step event at the bottom of each stride.
    const moving = velocity.current.lengthSq() > 0.09;
    if (moving) {
      bobPhase.current += delta * (sprinting ? 11 : 7.4);
      const sin = Math.sin(bobPhase.current);
      if (sin < -0.9 && stepArmed.current) {
        stepArmed.current = false;
        onStep?.();
      }
      if (sin > 0) stepArmed.current = true;
      camera.position.y = eyeHeight.current + sin * (sprinting ? 0.035 : 0.022);
    } else {
      bobPhase.current = 0;
      const t = performance.now() * 0.001;
      camera.position.y = eyeHeight.current + Math.sin(t * 1.25) * 0.008;
    }

    LOOK.setFromQuaternion(camera.quaternion, 'YXZ');
    if (keys.current.ArrowLeft) LOOK.y += 1.6 * delta;
    if (keys.current.ArrowRight) LOOK.y -= 1.6 * delta;
    if (keys.current.ArrowUp) LOOK.x += 1.2 * delta;
    if (keys.current.ArrowDown) LOOK.x -= 1.2 * delta;
    LOOK.x = THREE.MathUtils.clamp(LOOK.x, -1.15, 1.15);
    LOOK.z = 0;
    camera.quaternion.setFromEuler(LOOK);
  });

  return <PointerLockControls ref={controls} selector="#enter-room" />;
}
