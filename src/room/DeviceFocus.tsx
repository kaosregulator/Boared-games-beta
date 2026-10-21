import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SafeRoomModel } from './RoomModel';
import type { DeviceId, RadioStation } from './devices';
import { TvSet } from '../tv/TvSet';

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
};

interface DeviceFocusProps {
  device: DeviceId | null;
  stationLabel: string;
  radioOn: boolean;
  stations: RadioStation[];
  stationIndex: number;
  radioVolume: number;
  onTune: (index: number, play: boolean) => void;
  onVolume: () => void;
}

/**
 * Smaller clone of the CRT, NES, or boombox, plus a close camera.
 * The meshes in the bedroom are left alone.
 */
export function DeviceFocus({
  device,
  stationLabel,
  radioOn,
  stations,
  stationIndex,
  radioVolume,
  onTune,
  onVolume,
}: DeviceFocusProps) {
  return (
    <>
      <FocusRig device={device} />
      {device && (
        <Studio
          device={device}
          stationLabel={stationLabel}
          radioOn={radioOn}
          stations={stations}
          stationIndex={stationIndex}
          radioVolume={radioVolume}
          onTune={onTune}
          onVolume={onVolume}
        />
      )}
    </>
  );
}

function applyPose(cam: THREE.PerspectiveCamera, device: DeviceId) {
  const pose = POSE[device];
  cam.position.set(pose.at[0], STUDIO_Y + pose.at[1], pose.at[2]);
  cam.lookAt(pose.look[0], STUDIO_Y + pose.look[1], pose.look[2]);
  if (cam.fov !== pose.fov) {
    cam.fov = pose.fov;
    cam.updateProjectionMatrix();
  }
}

function FocusRig({ device }: { device: DeviceId | null }) {
  const { camera } = useThree();
  const saved = useRef<{ pos: THREE.Vector3; quat: THREE.Quaternion; fov: number } | null>(null);

  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    if (device) {
      if (!saved.current) {
        saved.current = { pos: cam.position.clone(), quat: cam.quaternion.clone(), fov: cam.fov };
      }
      applyPose(cam, device);
      return;
    }
    if (!saved.current) return;
    cam.position.copy(saved.current.pos);
    cam.quaternion.copy(saved.current.quat);
    cam.fov = saved.current.fov;
    cam.updateProjectionMatrix();
    saved.current = null;
  }, [camera, device]);

  // Hold the close-up every frame. The walk controller also writes the camera
  // on mount, and a one-shot lookAt loses that race.
  // Priority must stay 0. A positive priority tells fiber to skip its own
  // gl.render, which leaves the canvas blank for the whole room.
  useFrame(() => {
    if (!device) return;
    applyPose(camera as THREE.PerspectiveCamera, device);
  });

  return null;
}

function Studio({
  device,
  stationLabel,
  radioOn,
  stations,
  stationIndex,
  radioVolume,
  onTune,
  onVolume,
}: {
  device: DeviceId;
  stationLabel: string;
  radioOn: boolean;
  stations: RadioStation[];
  stationIndex: number;
  radioVolume: number;
  onTune: (index: number, play: boolean) => void;
  onVolume: () => void;
}) {
  const pose = POSE[device];
  return (
    <group position={[0, STUDIO_Y, 0]}>
      <ambientLight intensity={0.55} color="#f0e2d4" />
      <pointLight position={[0.4, 0.8, 0.7]} color="#fff2e0" intensity={6} distance={3.2} decay={2} />
      <pointLight position={[-0.5, 0.4, 0.4]} color="#c9a0ff" intensity={2.2} distance={2.4} decay={2} />
      {device === 'crt' || device === 'nes' ? (
        <TvSet />
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
          <RadioScreen label={stationLabel} on={radioOn} />
          <RadioDeck
            stations={stations}
            stationIndex={stationIndex}
            radioOn={radioOn}
            radioVolume={radioVolume}
            onTune={onTune}
            onVolume={onVolume}
          />
        </>
      )}
    </group>
  );
}

function RadioScreen({ label, on }: { label: string; on: boolean }) {
  const surface = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { canvas, texture };
  }, []);

  useLayoutEffect(() => {
    return () => surface.texture.dispose();
  }, [surface]);

  useFrame(({ clock }) => {
    const ctx = surface.canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#160c08';
    ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = on ? '#ffb45a' : '#5a4030';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(on ? label.slice(0, 16) : 'STOPPED', 128, 42);
    if (on) {
      const level = 0.35 + Math.sin(clock.elapsedTime * 7) * 0.15;
      ctx.fillStyle = '#ff7ad8';
      ctx.fillRect(36, 62, 184 * level, 8);
    }
    surface.texture.needsUpdate = true;
  });

  return (
    <mesh position={[0, 0.155, 0.11]}>
      <planeGeometry args={[0.052, 0.015]} />
      <meshBasicMaterial map={surface.texture} toneMapped={false} transparent opacity={0.92} />
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
}: {
  position: [number, number, number];
  label: string;
  active?: boolean;
  onClick: () => void;
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
    el.addEventListener('click', event => {
      event.stopPropagation();
      click.current();
    });
    host.appendChild(el);
    button.current = el;
    return () => {
      el.remove();
      button.current = null;
    };
  }, [gl]);

  useEffect(() => {
    const el = button.current;
    if (!el) return;
    el.textContent = label;
    el.className = `pointer-events-auto absolute left-0 top-0 z-50 rounded-md border px-1.5 py-1 text-[9px] font-bold uppercase leading-none tracking-wide shadow-md ${
      active
        ? 'border-amber-100 bg-amber-300 text-black'
        : 'border-white/40 bg-black/75 text-white hover:bg-black/90'
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
 * Mini controls sitting on the boombox face: volume knob, power switch,
 * the cassette-key row as station presets, and the tuning knob.
 */
function RadioDeck({
  stations,
  stationIndex,
  radioOn,
  radioVolume,
  onTune,
  onVolume,
}: {
  stations: RadioStation[];
  stationIndex: number;
  radioOn: boolean;
  radioVolume: number;
  onTune: (index: number, play: boolean) => void;
  onVolume: () => void;
}) {
  const meters = POSE.boombox.meters;
  const scale = meters / 0.98;
  const sx = 0.98 * scale;
  const sy = 0.661 * scale;
  const sz = 0.477 * scale;
  const z = sz * 0.5 + 0.01;
  const spot = (across: number, up: number): [number, number, number] => [
    across * sx * 0.5,
    up * sy,
    z,
  ];
  const presets = stations.slice(0, 4);
  // Fitted local space: across -1..1 is the width, up 0..1 is the height
  // including the antennas. Knobs sit under the handle; presets sit on the
  // cassette-key row.
  const presetX = [-0.16, -0.05, 0.06, 0.17];

  return (
    <group>
      <RadioHotspot
        position={spot(-0.72, 0.6)}
        label={radioVolume >= 0.95 ? 'VOL+' : radioVolume <= 0.4 ? 'VOL-' : 'VOL'}
        onClick={onVolume}
      />
      <RadioHotspot
        position={spot(-0.5, 0.585)}
        label={radioOn ? 'ON' : 'PWR'}
        active={radioOn}
        onClick={() => onTune(stationIndex, !radioOn)}
      />
      {presets.map((station, index) => (
        <RadioHotspot
          key={station.id}
          position={spot(presetX[index] ?? 0, 0.22)}
          label={station.freq}
          active={radioOn && index === stationIndex}
          onClick={() => onTune(index, true)}
        />
      ))}
      <RadioHotspot
        position={spot(0.71, 0.6)}
        label="TUNE"
        onClick={() => onTune((stationIndex + 1) % Math.max(stations.length, 1), true)}
      />
    </group>
  );
}
