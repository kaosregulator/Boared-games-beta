import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SafeRoomModel } from '../room/RoomModel';
import { BEANBAG_SEAT } from '../room/roomLayout';
import { GlassAnchor } from './GlassScreen';
import { PAD } from './cartridges';
import { sendPad } from './gameboyBus';
import { frameSubject, resetView, viewRig } from './viewRig';
import { DemandTicker } from '../engine/DemandTicker';

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
/** Held up at eye level, a little closer than a lap. */
const HOLD = new THREE.Vector3(0, 0.028, -0.3);
const GLANCE = new THREE.Euler(0, 0, 0, 'YXZ');
const GB_CENTRE = new THREE.Vector3();
/**
 * Half the held Game Boy's width and height, plus a little room, in metres at
 * the hold point (HOLD, 0.3 m out; the tilted face itself comes up to about
 * 0.21 m, so these read larger than the shell). The width takes in the neon
 * labels either side, wider with the key caps; measured off screenshots so
 * the outer label edges just fit a 390 px portrait phone.
 */
const GB_HALF_LABELLED = { w: 0.138, h: 0.092 };
const GB_HALF_KEYS = { w: 0.16, h: 0.092 };

function SeatRig({ keys }: { keys: boolean }) {
  const { camera, size } = useThree();
  const saved = useRef<{ pos: THREE.Vector3; quat: THREE.Quaternion; fov: number } | null>(null);
  const glance = useRef({ yaw: 0, pitch: 0, drag: false });
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
  useEffect(() => {
    let drag: null | { x: number; y: number; moved: boolean } = null;
    const down = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest('button, a, input, textarea, [data-ui="gamepad"]')) return;
      drag = { x: e.clientX, y: e.clientY, moved: false };
    };
    const move = (e: PointerEvent) => {
      if (!drag || viewRig.zoom > 1.05) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 8) return;
      drag.moved = true;
      glance.current.drag = true;
      glance.current.yaw = THREE.MathUtils.clamp(glance.current.yaw - dx * 0.004, -0.7, 0.7);
      glance.current.pitch = THREE.MathUtils.clamp(glance.current.pitch + dy * 0.003, -0.4, 0.35);
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const up = () => {
      drag = null;
      glance.current.drag = false;
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, []);
  useFrame((_, dt) => {
    seat.pos.set(...BEANBAG_SEAT.at);
    camera.position.copy(seat.pos);
    camera.lookAt(...BEANBAG_SEAT.look);
    seat.quat.copy(camera.quaternion);
    // Frame the Game Boy in whatever the thumb pad leaves free, then zoom/pan.
    GB_CENTRE.copy(HOLD).applyQuaternion(seat.quat).add(seat.pos);
    frameSubject(camera as THREE.PerspectiveCamera, GB_CENTRE, keys ? GB_HALF_KEYS : GB_HALF_LABELLED, viewRig.insets, size, 1.06);
    if (!glance.current.drag) {
      const back = 1 - Math.exp(-dt * 3);
      glance.current.yaw += (0 - glance.current.yaw) * back;
      glance.current.pitch += (0 - glance.current.pitch) * back;
    }
    if (Math.abs(glance.current.yaw) > 0.001 || Math.abs(glance.current.pitch) > 0.001) {
      GLANCE.setFromQuaternion(camera.quaternion, 'YXZ');
      GLANCE.y += glance.current.yaw;
      GLANCE.x = THREE.MathUtils.clamp(GLANCE.x + glance.current.pitch, -1.1, 1.1);
      GLANCE.z = 0;
      camera.quaternion.setFromEuler(GLANCE);
    }
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

/**
 * The neon sticker labels from the owner's mockup, stuck in the air beside
 * the shell: MOVE pointing at the D-pad and SELECT at Select on the left; A
 * SELECT, B BACK and START on the right. They sit in the shell's own plane
 * (so they tilt with it) and only ever outside its edge, never over the
 * screen or a button. On a keyboard each one also shows its key.
 */
export interface GbLabel {
  text: string;
  /** The key on a keyboard (public/emu/play.html: Z = A, X = B, Shift = Select, Enter = Start). */
  key: string;
  /** -1 left of the shell, pointing right; 1 right of it, pointing left. */
  side: -1 | 1;
  /** Height on the shell, fitted units (level with the button it names). */
  y: number;
  color: string;
  tilt: number;
}

export const GB_LABELS: GbLabel[] = [
  { text: 'MOVE', key: '↑↓←→', side: -1, y: 0.409, color: '#5ef2ff', tilt: 0.04 },
  { text: 'SELECT', key: 'SHIFT', side: -1, y: 0.256, color: '#c9a2ff', tilt: -0.03 },
  { text: 'A SELECT', key: 'Z', side: 1, y: 0.478, color: '#ff5fb8', tilt: -0.04 },
  { text: 'B BACK', key: 'X', side: 1, y: 0.367, color: '#ffd84a', tilt: 0.03 },
  { text: 'START', key: 'ENTER', side: 1, y: 0.256, color: '#8dff6a', tilt: -0.02 },
];

/** Where the labels start, just clear of the shell's edge, and how tall they are (fitted units). */
const LABEL_EDGE = 0.36;
const LABEL_H = 0.066;
/** Without key caps (touch screens) they're a touch smaller, so the Game Boy stays big on a phone. */
const LABEL_H_TOUCH = 0.058;
const LABEL_FONT = '800 64px Syne, "Bricolage Grotesque", sans-serif';
const ARROW_FONT = '800 54px sans-serif';
const KEY_FONT = '700 40px "IBM Plex Mono", monospace';

function drawLabel(label: GbLabel, keys: boolean) {
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  if (!g) return null;
  const H = 128;
  const arrow = label.side === -1 ? '▶' : '◀';
  g.font = LABEL_FONT;
  const textW = g.measureText(label.text).width;
  g.font = ARROW_FONT;
  const arrowW = g.measureText(arrow).width;
  g.font = KEY_FONT;
  const keyW = keys ? g.measureText(label.key).width + 28 : 0;
  const gap = 18;
  const pad = 34;
  const W = Math.ceil(pad * 2 + textW + gap + arrowW + (keys ? gap + keyW : 0));
  c.width = W;
  c.height = H;
  // a die-cut sticker: white edge, dark body, neon rim
  const r = 40;
  g.beginPath();
  g.roundRect(5, 5, W - 10, H - 10, r);
  g.fillStyle = '#fdfaff';
  g.fill();
  g.beginPath();
  g.roundRect(14, 14, W - 28, H - 28, r - 9);
  g.fillStyle = '#170a22';
  g.fill();
  g.shadowColor = label.color;
  g.shadowBlur = 14;
  g.strokeStyle = label.color;
  g.lineWidth = 4;
  g.stroke();
  // reading order, with the arrow on the button's side
  type Part = { kind: 'text' | 'arrow' | 'key'; w: number };
  const word: Part = { kind: 'text', w: textW };
  const tip: Part = { kind: 'arrow', w: arrowW };
  const cap: Part[] = keys ? [{ kind: 'key', w: keyW }] : [];
  const parts: Part[] = label.side === -1 ? [...cap, word, tip] : [tip, word, ...cap];
  let x = pad;
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  for (const p of parts) {
    if (p.kind === 'text') {
      g.font = LABEL_FONT;
      g.shadowColor = label.color;
      g.shadowBlur = 20;
      g.fillStyle = label.color;
      g.fillText(label.text, x, H / 2 + 3);
      g.shadowBlur = 0;
      g.fillStyle = 'rgba(255,255,255,0.45)';
      g.fillText(label.text, x - 1, H / 2 + 1);
      g.globalAlpha = 0.65;
      g.fillStyle = label.color;
      g.fillText(label.text, x, H / 2 + 3);
      g.globalAlpha = 1;
    } else if (p.kind === 'arrow') {
      g.font = ARROW_FONT;
      g.shadowColor = label.color;
      g.shadowBlur = 16;
      g.fillStyle = '#ffffff';
      g.fillText(arrow, x, H / 2 + 2);
    } else {
      g.shadowBlur = 0;
      g.beginPath();
      g.roundRect(x, H / 2 - 28, p.w, 56, 10);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 3;
      g.stroke();
      g.font = KEY_FONT;
      g.fillStyle = '#ffffff';
      g.fillText(label.key, x + 14, H / 2 + 2);
    }
    x += p.w + gap;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: W / H };
}

function NeonLabel({ label, keys }: { label: GbLabel; keys: boolean }) {
  // redraw once the word-art fonts are in
  const [fontsIn, setFontsIn] = useState(0);
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return;
    let live = true;
    void Promise.all([document.fonts.load(LABEL_FONT), document.fonts.load(KEY_FONT)]).then(
      () => live && setFontsIn(n => n + 1),
      () => {},
    );
    return () => {
      live = false;
    };
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const art = useMemo(() => drawLabel(label, keys), [label, keys, fontsIn]);
  useEffect(() => () => art?.tex.dispose(), [art]);
  if (!art) return null;
  const h = keys ? LABEL_H : LABEL_H_TOUCH;
  const w = h * art.aspect;
  // anchored at the shell's edge, reaching outwards
  const x = label.side * (LABEL_EDGE + w / 2);
  return (
    <mesh position={at(x, label.y, 0.03)} rotation={[-LEAN, 0, label.tilt]} renderOrder={5}>
      <planeGeometry args={[w * M, h * M]} />
      <meshBasicMaterial map={art.tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** The Game Boy held in both hands, kept in front of the camera. */
function HeldGameBoy({ keys }: { keys: boolean }) {
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
        {/* Beside the shell, never on the screen or a button. */}
        {GB_LABELS.map(l => (
          <NeonLabel key={l.text} label={l} keys={keys} />
        ))}
      </group>
    </group>
  );
}

/**
 * While seated the room canvas draws on demand (see WalkRoom), so the
 * emulator, which shares this tab's main thread, keeps its frame rate and its
 * sound doesn't crackle. The lamps and the TV in the background tick at 15 a second.
 */
const IDLE_FPS = 15;

export function GameBoySeat({ keys = true }: { keys?: boolean }) {
  return (
    <>
      <DemandTicker idleFps={IDLE_FPS} />
      <SeatRig keys={keys} />
      <HeldGameBoy keys={keys} />
    </>
  );
}

export const GB_SCREEN_ASPECT = SCREEN.h / SCREEN.w;
