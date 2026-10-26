import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SafeRoomModel } from './RoomModel';
import { frameSubject, freeArea, resetView, viewRig } from '../devices/viewRig';
import type { DeviceId } from './devices';
import { TvSet } from '../tv/TvSet';
import { MONITOR, PC_SUBJECT, PcStudio } from '../devices/PcScreen';
import { radio, useRadio, type RadioSnapshot } from '../radio/radioEngine';
import { FM_MAX, FM_MIN, STATIONS } from '../radio/stations';

/** Parked above the bedroom so the walk camera can cut here without seeing the room. */
const STUDIO_Y = 48;

const POSE: Record<
  DeviceId,
  { meters: number; axis: 'x' | 'y' | 'z'; fov: number; at: [number, number, number]; look: [number, number, number] }
> = {
  // Pulled well back: the whole set, the cable box, and the NES in frame.
  crt: { meters: 0.62, axis: 'x', fov: 40, at: [0.04, 0.58, 1.72], look: [0.04, 0.22, 0] },
  nes: { meters: 0.62, axis: 'x', fov: 40, at: [0.04, 0.58, 1.72], look: [0.04, 0.22, 0] },
  boombox: { meters: 0.38, axis: 'x', fov: 32, at: [0, 0.15, 0.72], look: [0, 0.12, 0] },
  // Sat at the desk, square on to the tube (it leans back a touch).
  pc: { meters: 1.65, axis: 'x', fov: 36, at: [MONITOR.x, MONITOR.y + 0.1, 0.62], look: [MONITOR.x, MONITOR.y, MONITOR.z] },
};

/**
 * Close-ups. The room copies of the CRT, NES, and boombox stay where they are;
 * leaning in swaps the camera onto a clone parked above the room.
 */
export function DeviceFocus({ device }: { device: DeviceId | null }) {
  return (
    <>
      <FocusRig device={device} />
      {device && <Studio device={device} />}
    </>
  );
}

/**
 * What to keep in frame for each close-up, in the studio's own coordinates.
 * The TV shows the whole set (NES, VCR, cable box) when the free area is
 * wide, and just the TV when it's tall and narrow.
 */
const SUBJECT: Record<'wide' | 'tv' | 'boombox', { centre: [number, number, number]; w: number; h: number }> = {
  wide: { centre: [0.03, 0.31, 0], w: 0.68, h: 0.35 },
  tv: { centre: [0.01, 0.33, 0], w: 0.36, h: 0.35 },
  boombox: { centre: [0, 0.13, 0], w: 0.21, h: 0.15 },
};

const CENTRE = new THREE.Vector3();

function applyPose(cam: THREE.PerspectiveCamera, device: DeviceId, size: { width: number; height: number }) {
  const pose = POSE[device];
  cam.position.set(pose.at[0], STUDIO_Y + pose.at[1], pose.at[2]);
  const free = freeArea(viewRig.insets, size.width, size.height);
  const freeAspect = (free.fw * size.width) / Math.max(1, free.fh * size.height);
  const subject =
    device === 'pc' ? PC_SUBJECT : device === 'boombox' ? SUBJECT.boombox : freeAspect < 1.15 ? SUBJECT.tv : SUBJECT.wide;
  CENTRE.set(subject.centre[0], STUDIO_Y + subject.centre[1], subject.centre[2]);
  frameSubject(cam, CENTRE, subject, viewRig.insets, size);
}

function FocusRig({ device }: { device: DeviceId | null }) {
  const { camera, size } = useThree();
  const saved = useRef<{ pos: THREE.Vector3; quat: THREE.Quaternion; fov: number } | null>(null);

  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (device) {
      if (!saved.current) {
        saved.current = { pos: cam.position.clone(), quat: cam.quaternion.clone(), fov: cam.fov };
      }
      resetView();
      applyPose(cam, device, size);
      return;
    }
    if (!saved.current) return;
    cam.position.copy(saved.current.pos);
    cam.quaternion.copy(saved.current.quat);
    cam.fov = saved.current.fov;
    cam.updateProjectionMatrix();
    saved.current = null;
    // size is read live in useFrame; the pose only needs resetting per device.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, device]);

  // Hold the close-up every frame (it follows rotation, pinch and pan). The
  // walk controller also writes the camera on mount, and a one-shot lookAt
  // loses that race.
  // Priority must stay 0. A positive priority tells fiber to skip its own
  // gl.render, which leaves the canvas blank for the whole room.
  useFrame(() => {
    if (!device) return;
    applyPose(camera as THREE.PerspectiveCamera, device, size);
  });

  return null;
}

function Studio({ device }: { device: DeviceId }) {
  const pose = POSE[device];
  return (
    <group position={[0, STUDIO_Y, 0]}>
      <ambientLight intensity={0.55} color="#f0e2d4" />
      <pointLight position={[0.4, 0.8, 0.7]} color="#fff2e0" intensity={6} distance={3.2} decay={2} />
      <pointLight position={[-0.5, 0.4, 0.4]} color="#c9a0ff" intensity={2.2} distance={2.4} decay={2} />
      {device === 'crt' || device === 'nes' ? (
        <TvSet />
      ) : device === 'pc' ? (
        <PcStudio />
      ) : (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
            <circleGeometry args={[0.7, 40]} />
            <meshBasicMaterial color="#100910" />
          </mesh>
          <SafeRoomModel id={device} position={[0, 0, 0]} axis={pose.axis} meters={pose.meters} tintAmount={0} />
        </>
      )}
      {device === 'boombox' && (
        <>
          <RadioDial />
          <RadioDeck />
        </>
      )}
    </group>
  );
}

const DIAL_W = 1024;
const DIAL_H = 150;

function paintDial(g: CanvasRenderingContext2D, s: RadioSnapshot, t: number) {
  const on = s.power;
  // backlit amber glass
  const glass = g.createLinearGradient(0, 0, 0, DIAL_H);
  glass.addColorStop(0, on ? '#2a1606' : '#0e0a07');
  glass.addColorStop(0.5, on ? '#4a2a0a' : '#16100b');
  glass.addColorStop(1, on ? '#2a1606' : '#0e0a07');
  g.fillStyle = glass;
  g.fillRect(0, 0, DIAL_W, DIAL_H);

  const left = 40;
  const right = 720;
  const x = (f: number) => left + ((f - FM_MIN) / (FM_MAX - FM_MIN)) * (right - left);
  const ink = on ? '#ffcf7a' : '#5a4630';

  g.strokeStyle = ink;
  g.fillStyle = ink;
  g.lineWidth = 2;
  g.font = '700 22px "IBM Plex Mono", monospace';
  g.textAlign = 'center';
  g.fillText('FM', 18, 42);
  for (let f = 88; f <= 108; f += 1) {
    const major = f % 2 === 0;
    g.beginPath();
    g.moveTo(x(f), 62);
    g.lineTo(x(f), major ? 34 : 48);
    g.stroke();
    if (major) g.fillText(String(f), x(f), 26);
  }
  // station marks with their call letters
  g.font = '700 13px "IBM Plex Mono", monospace';
  for (const st of STATIONS) {
    g.fillStyle = on ? (st.call === 'SOMA' ? '#7ad7ff' : '#ff9ad5') : '#3a3028';
    g.beginPath();
    g.arc(x(st.freq), 74, 4, 0, Math.PI * 2);
    g.fill();
    g.fillText(st.call, x(st.freq), 96);
  }
  // needle
  g.strokeStyle = on ? '#ff3b2f' : '#5a1c16';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(x(s.freq), 8);
  g.lineTo(x(s.freq), 106);
  g.stroke();

  // LED readout
  g.fillStyle = '#0a0503';
  g.fillRect(744, 10, 268, 96);
  g.textAlign = 'right';
  g.fillStyle = on ? '#ff6a3a' : '#2a120c';
  g.font = '800 58px "IBM Plex Mono", monospace';
  g.fillText(on ? s.freq.toFixed(1) : '', 960, 76);
  g.font = '700 18px "IBM Plex Mono", monospace';
  g.fillText(on ? 'MHz' : '', 1004, 76);
  g.textAlign = 'left';
  g.fillStyle = on ? (s.scanning ? '#7aff8a' : '#ff6a3a') : '#2a120c';
  g.fillText(on ? (s.scanning ? 'SCAN' : s.seeking ? 'SEEK' : s.strength > 0.97 ? 'STEREO' : 'TUNING') : '', 756, 32);

  // signal bars
  for (let i = 0; i < 8; i += 1) {
    const lit = on && s.strength * 8 > i + 0.2;
    g.fillStyle = lit ? (i < 5 ? '#7aff8a' : '#ffcf4a') : '#1b1410';
    g.fillRect(756 + i * 30, 112, 22, 26 - i);
  }

  // station name ticker
  g.fillStyle = on ? '#ffcf7a' : '#3a3028';
  g.font = '700 22px "IBM Plex Mono", monospace';
  g.textAlign = 'left';
  const name = !on ? 'POWER OFF' : s.error ? s.error.toUpperCase() : s.station && s.strength > 0.5 ? s.station.name.toUpperCase() : '· · · STATIC · · ·';
  const room = right - left;
  g.save();
  g.beginPath();
  g.rect(left, 106, room, 40);
  g.clip();
  const width = g.measureText(name).width;
  const offset = width > room ? ((t * 60) % (width + 60)) : 0;
  g.fillText(name, left - offset, 136);
  if (width > room) g.fillText(name, left - offset + width + 60, 136);
  g.restore();
}

/** Backlit FM dial laid over the boombox's own tuning window. */
function RadioDial() {
  const surface = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = DIAL_W;
    canvas.height = DIAL_H;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return { canvas, texture };
  }, []);
  useLayoutEffect(() => () => surface.texture.dispose(), [surface]);
  useFrame(({ clock }) => {
    const g = surface.canvas.getContext('2d');
    if (!g) return;
    paintDial(g, radio.state, clock.elapsedTime);
    surface.texture.needsUpdate = true;
  });
  return (
    <mesh position={[0.0096, 0.1555, 0.1102]}>
      <planeGeometry args={[0.178, 0.026]} />
      <meshBasicMaterial map={surface.texture} toneMapped={false} />
    </mesh>
  );
}

const PROJECT = new THREE.Vector3();

/** A tiny button glued to a point on the close-up mesh. DOM, not a three object. */
function RadioHotspot({
  position,
  label,
  active,
  onClick,
  repeat = false,
}: {
  position: [number, number, number];
  label: string;
  active?: boolean;
  onClick: () => void;
  /** Keep firing while held, like turning a knob. */
  repeat?: boolean;
}) {
  const { camera, gl } = useThree();
  const button = useRef<HTMLButtonElement | null>(null);
  const click = useRef(onClick);
  click.current = onClick;
  const spot = useRef(position);
  spot.current = position;

  useEffect(() => {
    const host = gl.domElement.parentElement;
    if (!host) return;
    const el = document.createElement('button');
    el.type = 'button';
    el.dataset.ui = 'radio';
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.top = '0';
    el.style.zIndex = '50';
    let hold: number | null = null;
    let delay: number | null = null;
    const stop = () => {
      if (hold) window.clearInterval(hold);
      if (delay) window.clearTimeout(delay);
      hold = null;
      delay = null;
    };
    el.addEventListener('pointerdown', event => {
      event.stopPropagation();
      click.current();
      if (!repeat) return;
      delay = window.setTimeout(() => {
        hold = window.setInterval(() => click.current(), 90);
      }, 320);
    });
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointerleave', stop);
    host.appendChild(el);
    button.current = el;
    return () => {
      stop();
      el.remove();
      button.current = null;
    };
  }, [gl, repeat]);

  useEffect(() => {
    const el = button.current;
    if (!el) return;
    el.textContent = label;
    el.className = `pointer-events-auto absolute left-0 top-0 z-50 rounded-md border px-1.5 py-1 text-[9px] font-bold uppercase leading-none tracking-wide shadow-md select-none ${
      active ? 'border-amber-100 bg-amber-300 text-black' : 'border-white/40 bg-black/75 text-white hover:bg-black/90'
    }`;
  }, [label, active]);

  useFrame(() => {
    const el = button.current;
    if (!el) return;
    const [x, y, z] = spot.current;
    PROJECT.set(x, STUDIO_Y + y, z);
    PROJECT.project(camera);
    const width = gl.domElement.clientWidth;
    const height = gl.domElement.clientHeight;
    const sx = (PROJECT.x * 0.5 + 0.5) * width;
    const sy = (-PROJECT.y * 0.5 + 0.5) * height;
    el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
    el.style.visibility = PROJECT.z < 1 ? 'visible' : 'hidden';
  });

  return null;
}

/**
 * Controls on the boombox face: volume knob, power, the tuning knob (hold to
 * keep turning), and the cassette keys as SEEK / SCAN / SEEK.
 */
function RadioDeck() {
  const r = useRadio();
  const meters = POSE.boombox.meters;
  const scale = meters / 0.98;
  const sx = 0.98 * scale;
  const sy = 0.661 * scale;
  const sz = 0.477 * scale;
  const z = sz * 0.5 + 0.01;
  const spot = (across: number, up: number): [number, number, number] => [across * sx * 0.5, up * sy, z];
  const keyX = [-0.16, -0.05, 0.06, 0.17];

  return (
    <group>
      <RadioHotspot position={spot(-0.8, 0.6)} label="VOL −" onClick={() => radio.setVolume(r.volume - 0.1)} repeat />
      <RadioHotspot position={spot(-0.64, 0.6)} label="VOL +" onClick={() => radio.setVolume(r.volume + 0.1)} repeat />
      <RadioHotspot position={spot(-0.5, 0.585)} label={r.power ? 'ON' : 'PWR'} active={r.power} onClick={() => radio.setPower(!radio.state.power)} />
      <RadioHotspot position={spot(0.64, 0.6)} label="◀ TUNE" onClick={() => radio.nudge(-1)} repeat />
      <RadioHotspot position={spot(0.82, 0.6)} label="TUNE ▶" onClick={() => radio.nudge(1)} repeat />
      <RadioHotspot position={spot(keyX[0], 0.22)} label="◀◀ SEEK" onClick={() => radio.seek(-1)} />
      <RadioHotspot position={spot(keyX[1], 0.22)} label="SCAN" active={r.scanning} onClick={() => radio.toggleScan()} />
      <RadioHotspot position={spot(keyX[2], 0.22)} label="SEEK ▶▶" onClick={() => radio.seek(1)} />
      <RadioHotspot position={spot(keyX[3], 0.22)} label="■ OFF" onClick={() => radio.setPower(false)} />
    </group>
  );
}
