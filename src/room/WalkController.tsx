import { useCallback, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PLAYER, WALL } from './videoRoom';
import { LAYOUT, ROOM_COLLIDERS, TABLE_COLLIDER } from './roomLayout';
import { controlSettings, lookTurn } from './controls';
import { crouchKeyAction } from './crouch';
import { aim, emitRoomTap, fitFov, pad } from './input';
import { resumedSession, savePose, type SavedPose } from './session';
import { setWalkZoom, walkView, ZOOM_MAX } from './walkView';

/**
 * Outside control of the walking body: the table session sets the player
 * down crouched at the table, and the crouch stays latched until they stand.
 */
export const walkRig = {
  teleport: null as null | { at: [number, number, number]; look: [number, number, number] },
  crouchLock: false,
  /** The spawned card table blocks walking only while it exists. */
  tableActive: false,
  /** Where the player stands, for cards that close when you walk off. */
  pos: { x: 0, z: 0 },
  /** Extra eye height while standing on the high-shelf stool, metres. */
  eyeBoost: 0,
  /** Look up at the high shelf once, after the second step onto the stool. */
  glance: false,
  /** Last full pose, so a rebuilt canvas (or a reloaded page) puts you back. */
  lastPose: null as SavedPose | null,
  listeners: new Set<(crouched: boolean) => void>(),
  setCrouch(on: boolean) {
    if (walkRig.crouchLock === on) return;
    walkRig.crouchLock = on;
    walkRig.listeners.forEach(fn => fn(on));
  },
};

// Capture scripts move the player with window.__walkRig.teleport.
if (import.meta.env.DEV && typeof window !== 'undefined') (window as unknown as { __walkRig: typeof walkRig }).__walkRig = walkRig;

const FORWARD = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const WISH = new THREE.Vector3();
const LOOK = new THREE.Euler(0, 0, 0, 'YXZ');

/** A press that moves less than this is a click or tap, not a look-drag. */
const TAP_SLOP = { mouse: 6, touch: 12 };

interface WalkControllerProps {
  enabled: boolean;
  /** True once the player has stepped in. */
  engaged: boolean;
  /** Fires when the player's footfall lands, for step audio. */
  onStep?: () => void;
  /** Crouched at a 3D table: walking is off, but Space or C still stands. */
  atTable?: boolean;
}

function turn(camera: THREE.Camera, yaw: number, pitch: number) {
  LOOK.setFromQuaternion(camera.quaternion, 'YXZ');
  LOOK.y -= yaw;
  LOOK.x = THREE.MathUtils.clamp(LOOK.x - pitch, -1.2, 1.2);
  LOOK.z = 0;
  camera.quaternion.setFromEuler(LOOK);
}

/**
 * Free-roam first-person movement with real furniture collision.
 *
 * No pointer lock: the cursor stays free so a click lands on what it points
 * at. Drag (or swipe on a touch screen, or two-finger swipe on a trackpad) to
 * look around.
 *
 * The player is a circle of PLAYER.radius on the floor plane. Each frame the
 * desired position is resolved against the room walls and every furniture box,
 * pushing out along whichever axis has the smaller overlap so you slide along
 * the bed and the dresser instead of sticking to them.
 */
export function WalkController({ enabled, engaged, onStep, atTable = false }: WalkControllerProps) {
  const { camera, gl, size } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const velocity = useRef(new THREE.Vector3());
  const bobPhase = useRef(0);
  const stepArmed = useRef(false);
  const eyeHeight = useRef(PLAYER.height);
  const engagedRef = useRef(engaged);
  engagedRef.current = engaged;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const atTableRef = useRef(atTable);
  atTableRef.current = atTable;

  useEffect(() => {
    const pose = walkRig.lastPose ?? resumedSession()?.pose ?? null;
    if (pose) {
      camera.position.set(...pose.p);
      camera.quaternion.set(...pose.q);
      return;
    }
    camera.position.set(...PLAYER.spawn);
    camera.lookAt(...PLAYER.spawnLook);
  }, [camera]);

  // Remember the pose: in memory every frame, in the tab every couple of seconds.
  const lastSave = useRef(0);


  useEffect(() => {
    const blocked = new Set([
      'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyC', 'KeyQ',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract',
    ]);
    const typing = (e: KeyboardEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      return Boolean(el?.closest('input, textarea, select, iframe, [data-ui="studio"], [data-ui="table"]'));
    };
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      // The table camera has the view, so the HUD's "Stand up (Space)" is handled here.
      if (atTableRef.current && walkRig.crouchLock && (e.code === 'Space' || e.code === 'KeyC') && !e.repeat) {
        walkRig.setCrouch(false);
        e.preventDefault();
        return;
      }
      // C toggles a crouch. Space only stands. Ignored while a game owns the keys.
      if (enabledRef.current && engagedRef.current) {
        const crouch = crouchKeyAction(walkRig.crouchLock, e.code, e.repeat);
        if (crouch === 'stand') {
          walkRig.setCrouch(false);
          e.preventDefault();
          return;
        }
        if (crouch === 'toggle') {
          walkRig.setCrouch(!walkRig.crouchLock);
          e.preventDefault();
          return;
        }
      }
      keys.current[e.code] = true;
      if (e.code.startsWith('Arrow')) aim.mode = 'center';
      if (blocked.has(e.code) && enabledRef.current) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const blur = () => {
      keys.current = {};
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;
    let press: null | { id: number; x: number; y: number; lastX: number; lastY: number; touch: boolean; moved: boolean } = null;
    // Two fingers on the room: pinch to zoom, like squinting across it.
    const touches = new Map<number, { x: number; y: number }>();
    let pinch: null | { dist: number; zoom: number } = null;
    const spread = () => {
      const [a, b] = [...touches.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };

    const live = () => enabledRef.current && engagedRef.current;
    const setCursor = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      aim.px.x = event.clientX;
      aim.px.y = event.clientY;
      aim.ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      aim.ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const down = (event: PointerEvent) => {
      const touch = event.pointerType !== 'mouse';
      if (touch) {
        touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (touches.size === 2) {
          // The first finger was going to look around; it's a pinch now.
          pinch = { dist: spread(), zoom: walkView.zoom };
          press = null;
          aim.dragging = false;
          return;
        }
      }
      if (pinch) return;
      if (touch) aim.mode = 'center';
      else {
        aim.mode = 'cursor';
        setCursor(event);
      }
      if (press || (!touch && event.button !== 0 && event.button !== 2)) return;
      press = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, touch, moved: false };
    };
    const move = (event: PointerEvent) => {
      if (touches.has(event.pointerId)) touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pinch && touches.size >= 2) {
        if (live()) setWalkZoom((pinch.zoom * spread()) / Math.max(1, pinch.dist));
        return;
      }
      if (event.pointerType === 'mouse' && !press) {
        aim.mode = 'cursor';
        setCursor(event);
      }
      if (!press || event.pointerId !== press.id) return;
      const dx = event.clientX - press.lastX;
      const dy = event.clientY - press.lastY;
      press.lastX = event.clientX;
      press.lastY = event.clientY;
      if (!press.moved) {
        const slop = press.touch ? TAP_SLOP.touch : TAP_SLOP.mouse;
        if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < slop) return;
        press.moved = true;
        aim.dragging = true;
        try {
          canvas.setPointerCapture(event.pointerId);
        } catch {
          // The pointer may already be gone; the drag still works without capture.
        }
      }
      if (!live()) return;
      // A full swipe across a phone is about a half turn; a mouse is finer.
      // Zoomed in, the same swipe turns less, so aiming stays steady.
      const base = (press.touch ? 3.4 / Math.max(window.innerWidth, window.innerHeight) : 0.0032) / walkView.zoom;
      const look = lookTurn(dx, dy, base, controlSettings);
      turn(camera, look.yaw, look.pitch);
    };
    const up = (event: PointerEvent) => {
      touches.delete(event.pointerId);
      if (pinch) {
        if (touches.size < 2) pinch = null;
        return;
      }
      if (!press || event.pointerId !== press.id) return;
      const tapped = !press.moved;
      press = null;
      aim.dragging = false;
      if (event.pointerType === 'mouse') setCursor(event);
      if (tapped && event.type === 'pointerup') emitRoomTap(event.clientX, event.clientY);
    };
    const leave = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && !press) aim.mode = 'center';
    };
    // Two-finger swipe on a trackpad (or a scroll wheel) looks around;
    // a trackpad pinch (which browsers send as ctrl+wheel) zooms.
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (!live()) return;
      if (event.ctrlKey) {
        setWalkZoom(walkView.zoom * Math.exp(-event.deltaY * 0.01));
        return;
      }
      const scale = event.deltaMode === 1 ? 16 : 1;
      const clamp = (v: number) => THREE.MathUtils.clamp(v * scale, -60, 60);
      turn(camera, (clamp(event.deltaX) * 0.0042) / walkView.zoom, (clamp(event.deltaY) * 0.0032) / walkView.zoom);
    };
    const menu = (event: Event) => event.preventDefault();

    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('wheel', wheel, { passive: false });
    canvas.addEventListener('contextmenu', menu);
    return () => {
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('wheel', wheel);
      canvas.removeEventListener('contextmenu', menu);
    };
  }, [camera, gl]);

  const resolve = useCallback((x: number, z: number, eye: number) => {
    const r = PLAYER.radius;
    let px = THREE.MathUtils.clamp(x, -WALL.halfWidth + r, WALL.halfWidth - r);
    let pz = THREE.MathUtils.clamp(z, -WALL.halfDepth + r, WALL.halfDepth - r);

    const colliders = walkRig.tableActive ? [...ROOM_COLLIDERS, TABLE_COLLIDER] : ROOM_COLLIDERS;
    for (const box of colliders) {
      // Anything shorter than the player's knees is walked over, not into.
      if (box.top < 0.22) continue;
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
    const jump = walkRig.teleport;
    if (jump) {
      walkRig.teleport = null;
      velocity.current.set(0, 0, 0);
      eyeHeight.current = (walkRig.crouchLock ? PLAYER.crouchHeight : PLAYER.height) + walkRig.eyeBoost;
      camera.position.set(jump.at[0], eyeHeight.current, jump.at[2]);
      camera.lookAt(jump.look[0], jump.look[1], jump.look[2]);
    }
    walkRig.pos.x = camera.position.x;
    walkRig.pos.z = camera.position.z;
    // Only while actually walking: device close-ups and the bean bag move the camera elsewhere.
    if (enabled && engagedRef.current && !walkRig.crouchLock && walkRig.eyeBoost === 0) {
      const p = camera.position;
      const q = camera.quaternion;
      walkRig.lastPose = { p: [p.x, eyeHeight.current, p.z], q: [q.x, q.y, q.z, q.w] };
      const now = performance.now();
      if (now - lastSave.current > 2000) {
        lastSave.current = now;
        savePose(walkRig.lastPose);
      }
    }
    if (!enabled || !engagedRef.current) {
      velocity.current.multiplyScalar(0.8);
      return;
    }

    const k = keys.current;
    const crouching = walkRig.crouchLock;
    const targetEye = (crouching ? PLAYER.crouchHeight : PLAYER.height) + walkRig.eyeBoost;
    eyeHeight.current += (targetEye - eyeHeight.current) * Math.min(1, delta * 9);

    const speed = crouching ? PLAYER.crouchSpeed : PLAYER.walkSpeed;

    camera.getWorldDirection(FORWARD);
    FORWARD.y = 0;
    FORWARD.normalize();
    RIGHT.crossVectors(FORWARD, camera.up).normalize();

    WISH.set(0, 0, 0);
    if (k.KeyW) WISH.add(FORWARD);
    if (k.KeyS) WISH.sub(FORWARD);
    if (k.KeyD) WISH.add(RIGHT);
    if (k.KeyA) WISH.sub(RIGHT);
    if (WISH.lengthSq() > 0) WISH.normalize().multiplyScalar(speed);
    // The thumb stick is analog: push it a little to creep.
    if (pad.x !== 0 || pad.y !== 0) {
      WISH.addScaledVector(FORWARD, pad.y * speed).addScaledVector(RIGHT, pad.x * speed);
      if (WISH.length() > speed) WISH.setLength(speed);
    }

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
      bobPhase.current += delta * 7.4;
      const sin = Math.sin(bobPhase.current);
      if (sin < -0.9 && stepArmed.current) {
        stepArmed.current = false;
        onStep?.();
      }
      if (sin > 0) stepArmed.current = true;
      camera.position.y = eyeHeight.current + sin * 0.022;
    } else {
      bobPhase.current = 0;
      const t = performance.now() * 0.001;
      camera.position.y = eyeHeight.current + Math.sin(t * 1.25) * 0.008;
    }

    if (walkRig.glance) {
      walkRig.glance = false;
      camera.lookAt(LAYOUT.teddy.x, 2.28, LAYOUT.teddy.z);
    }

    // Arrows look: left / right turn, up / down look up and down.
    const yaw = (k.ArrowLeft ? -1 : 0) + (k.ArrowRight ? 1 : 0);
    const pitch = (k.ArrowUp ? 1 : 0) - (k.ArrowDown ? 1 : 0);
    if (yaw || pitch) turn(camera, (yaw * 1.9 * delta) / walkView.zoom, (-pitch * 1.3 * delta) / walkView.zoom);

    // + / - hold to zoom.
    const zoomKey = (k.Equal || k.NumpadAdd ? 1 : 0) - (k.Minus || k.NumpadSubtract ? 1 : 0);
    if (zoomKey) setWalkZoom(Math.min(ZOOM_MAX, walkView.zoom * Math.exp(zoomKey * 1.6 * delta)));

    // The lens: the player's field of view (widened for portrait screens),
    // narrowed by the zoom. Eased so a pinch or a preset change glides.
    const cam = camera as THREE.PerspectiveCamera;
    const base = fitFov(walkView.fov, cam.aspect, 1.5, 120);
    const tan = Math.tan(THREE.MathUtils.degToRad(base / 2)) / walkView.zoom;
    const target = THREE.MathUtils.radToDeg(2 * Math.atan(tan));
    if (Math.abs(cam.fov - target) > 0.01) {
      cam.fov += (target - cam.fov) * Math.min(1, delta * 14);
      cam.updateProjectionMatrix();
    }
  });

  return null;
}
