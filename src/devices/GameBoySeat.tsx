import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SafeRoomModel } from '../room/RoomModel';
import { BEANBAG_SEAT } from '../room/roomLayout';
import { GlassAnchor } from './GlassScreen';
import { PAD } from './cartridges';
import { sendPad } from './gameboyBus';
import { frameSubject, resetView, viewRig } from './viewRig';

/**
 * Sitting in the bean bag with the Game Boy. The camera drops to seat height
 * and stays put; the Game Boy is held up in front of you with the emulator on
 * its screen. Every button on the shell is pressable.
 */

/** Game Boy height when held, metres. */
const M = 0.15;
/**
 * The mesh leans back on a little stand by ~27.7 degrees; tip it upright so
 * the face points at the player. Positions below were measured off the mesh in
 * its own fitted frame (height 1).
 */
const LEAN = 0.483;
const faceZ = (y: number) => 0.329 - (y - 0.114) * 0.525;
const at = (x: number, y: number, out = 0.012): [number, number, number] => [x * M, y * M, (faceZ(y) + out) * M];

/** The screen glass, sized to cover the whole recess in the mesh so none of its rough edge shows. */
const SCREEN = { x: 0.029, y: 0.745, w: 0.392, h: 0.277 };
export const GB_SCREEN_PX = 320;

const BUTTONS: { key: keyof typeof PAD; x: number; y: number; r: number }[] = [
  { key: 'UP', x: -0.176, y: 0.455, r: 0.04 },
  { key: 'DOWN', x: -0.176, y: 0.363, r: 0.04 },
  { key: 'LEFT', x: -0.222, y: 0.409, r: 0.04 },
  { key: 'RIGHT', x: -0.13, y: 0.409, r: 0.04 },
  { key: 'A', x: 0.229, y: 0.423, r: 0.048 },
  { key: 'B', x: 0.123, y: 0.383, r: 0.048 },
  { key: 'SELECT', x: -0.098, y: 0.256, r: 0.04 },
  { key: 'START', x: 0.027, y: 0.256, r: 0.04 },
];

/**
 * Where the player's head and hands are while sitting. The Game Boy is held
 * relative to this, not to the camera, so zooming and panning the view never
 * moves it out of your hands.
 */
const seat = {
  pos: new THREE.Vector3(),
  quat: new THREE.Quaternion(),
};
const HOLD = new THREE.Vector3(0, -0.035, -0.27);
const GB_CENTRE = new THREE.Vector3();
/** Half the held Game Boy's width and height, metres, plus a little room. */
const GB_HALF = { w: 0.058, h: 0.092 };

function SeatRig() {
  const { camera, size } = useThree();
  const saved = useRef<{ pos: THREE.Vector3; quat: THREE.Quaternion; fov: number } | null>(null);
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    saved.current = { pos: cam.position.clone(), quat: cam.quaternion.clone(), fov: cam.fov };
    resetView();
    return () => {
      if (!saved.current) return;
      cam.position.copy(saved.current.pos);
      cam.quaternion.copy(saved.current.quat);
      cam.fov = saved.current.fov;
      cam.updateProjectionMatrix();
    };
  }, [camera]);
  useFrame(() => {
    seat.pos.set(...BEANBAG_SEAT.at);
    camera.position.copy(seat.pos);
    camera.lookAt(...BEANBAG_SEAT.look);
    seat.quat.copy(camera.quaternion);
    // Frame the Game Boy in whatever the thumb pad leaves free, then zoom/pan.
    GB_CENTRE.copy(HOLD).applyQuaternion(seat.quat).add(seat.pos);
    frameSubject(camera as THREE.PerspectiveCamera, GB_CENTRE, GB_HALF, viewRig.insets, size, 1.06);
  });
  return null;
}

const OFFSET = new THREE.Vector3();

function PadButton({ spec }: { spec: (typeof BUTTONS)[number] }) {
  const [down, setDown] = useState(false);
  const [hover, setHover] = useState(false);
  const press = (on: boolean) => {
    setDown(on);
    sendPad(PAD[spec.key], on);
  };
  return (
    <mesh
      position={at(spec.x, spec.y, down ? 0.004 : 0.016)}
      rotation={[-LEAN, 0, 0]}
      onPointerOver={e => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = '';
        if (down) press(false);
      }}
      onPointerDown={e => {
        e.stopPropagation();
        press(true);
      }}
      onPointerUp={e => {
        e.stopPropagation();
        press(false);
      }}
    >
      <circleGeometry args={[spec.r * M, 20]} />
      <meshBasicMaterial color="#ffe45c" transparent opacity={down ? 0.45 : hover ? 0.25 : 0} depthWrite={false} />
    </mesh>
  );
}

/** The Game Boy held in both hands, kept in front of the camera. */
function HeldGameBoy() {
  const hold = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = hold.current;
    if (!g) return;
    OFFSET.copy(HOLD).applyQuaternion(seat.quat);
    g.position.copy(seat.pos).add(OFFSET);
    g.quaternion.copy(seat.quat);
  });
  return (
    <group ref={hold}>
      {/* the player's own light on the screen and shell */}
      <pointLight position={[0, 0.06, 0.25]} color="#fff1dc" intensity={0.5} distance={0.8} decay={2} />
      <group rotation={[LEAN, 0, 0]} position={[0, -0.5 * M, 0]}>
        <SafeRoomModel id="gameboy" position={[0, 0, 0]} axis="y" meters={M} tintAmount={0} />
        <GlassAnchor
          id="gameboy"
          position={at(SCREEN.x, SCREEN.y, 0.01)}
          rotation={[-LEAN, 0, 0]}
          width={SCREEN.w * M}
          widthPx={GB_SCREEN_PX}
        />
        {BUTTONS.map(b => (
          <PadButton key={b.key} spec={b} />
        ))}
      </group>
    </group>
  );
}

/**
 * While seated the room canvas draws on demand (see WalkRoom), so the
 * emulator, which shares this tab's main thread, keeps its frame rate and its
 * sound doesn't crackle. The room still redraws at full rate while you zoom,
 * pan or resize, a frame for each button press, and a slow 15 a second for
 * the lamps and the TV in the background.
 */
const IDLE_FPS = 15;

function SeatTicker() {
  const invalidate = useThree(state => state.invalidate);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let busyUntil = 0;
    const loop = (t: number) => {
      if (t < busyUntil || t - last >= 1000 / IDLE_FPS) {
        last = t;
        invalidate();
      }
      raf = requestAnimationFrame(loop);
    };
    const busy = () => {
      busyUntil = performance.now() + 700;
    };
    const once = () => invalidate();
    const moving = ['wheel', 'touchmove', 'resize'] as const;
    moving.forEach(e => window.addEventListener(e, busy, { passive: true }));
    const drag = (e: PointerEvent) => {
      if (e.buttons) busy();
    };
    window.addEventListener('pointermove', drag, { passive: true });
    window.addEventListener('pointerdown', once);
    window.addEventListener('pointerup', once);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      moving.forEach(e => window.removeEventListener(e, busy));
      window.removeEventListener('pointermove', drag);
      window.removeEventListener('pointerdown', once);
      window.removeEventListener('pointerup', once);
    };
  }, [invalidate]);
  return null;
}

export function GameBoySeat() {
  return (
    <>
      <SeatTicker />
      <SeatRig />
      <HeldGameBoy />
    </>
  );
}

export const GB_SCREEN_ASPECT = SCREEN.h / SCREEN.w;
