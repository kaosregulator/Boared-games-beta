import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { sound } from '../../utils/audio';

const DIE = 0.28;
const TRAY = { w: 2.5, d: 1.7, wall: 0.14, lip: 0.34 };
const HOLD_Y = 0.16;

/**
 * Local face normals of a standard die, matched to BoxGeometry's material order
 * (+X, -X, +Y, -Y, +Z, -Z). Opposite faces sum to seven.
 */
const FACE_AXES: { value: number; axis: THREE.Vector3 }[] = [
  { value: 1, axis: new THREE.Vector3(1, 0, 0) },
  { value: 6, axis: new THREE.Vector3(-1, 0, 0) },
  { value: 2, axis: new THREE.Vector3(0, 1, 0) },
  { value: 5, axis: new THREE.Vector3(0, -1, 0) },
  { value: 3, axis: new THREE.Vector3(0, 0, 1) },
  { value: 4, axis: new THREE.Vector3(0, 0, -1) },
];

const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

function pipTexture(value: number, body: string, pip: string) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, size, size);

  // subtle moulded edge so the face is not flat
  const grad = ctx.createRadialGradient(size * 0.4, size * 0.35, 10, size / 2, size / 2, size * 0.78);
  grad.addColorStop(0, 'rgba(255,255,255,0.3)');
  grad.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const step = size * 0.26;
  ctx.fillStyle = pip;
  PIPS[value].forEach(([gx, gy]) => {
    ctx.beginPath();
    ctx.arc(size / 2 + gx * step, size / 2 + gy * step, size * 0.085, 0, Math.PI * 2);
    ctx.fill();
  });
  // ink bleed
  ctx.globalAlpha = 0.18;
  PIPS[value].forEach(([gx, gy]) => {
    ctx.beginPath();
    ctx.arc(size / 2 + gx * step, size / 2 + gy * step, size * 0.105, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function feltTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1f4433';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 24000; i += 1) {
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.07})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

function woodTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 150; i += 1) {
    ctx.strokeStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.1})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.8;
    ctx.beginPath();
    const y = Math.random() * 256;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(80, y + (Math.random() - 0.5) * 9, 170, y + (Math.random() - 0.5) * 9, 256, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/* -------------------------------------------------------------------------- */

interface DieProps {
  index: number;
  held: boolean;
  holdSlot: number;
  rollToken: number;
  materials: THREE.Material[];
  onSettle: (index: number, value: number) => void;
  onToggleHold: (index: number) => void;
}

const UP = new THREE.Vector3(0, 1, 0);
const scratchQ = new THREE.Quaternion();
const scratchV = new THREE.Vector3();

function Die({ index, held, holdSlot, rollToken, materials, onSettle, onToggleHold }: DieProps) {
  const body = useRef<RapierRigidBody>(null);
  const settleTimer = useRef(0);
  const reported = useRef(-1);
  const lastToken = useRef(-1);
  const landed = useRef(false);
  /** Dice spawn at rest, so a face is only reported after a real throw. */
  const thrown = useRef(false);

  /** Face value currently pointing up, or 0 if the die is cocked. */
  const readTop = useCallback(() => {
    const node = body.current;
    if (!node) return 0;
    const r = node.rotation();
    scratchQ.set(r.x, r.y, r.z, r.w);
    let best = 0;
    let bestDot = -2;
    for (const face of FACE_AXES) {
      scratchV.copy(face.axis).applyQuaternion(scratchQ);
      const dot = scratchV.dot(UP);
      if (dot > bestDot) {
        bestDot = dot;
        best = face.value;
      }
    }
    return bestDot > 0.86 ? best : 0;
  }, []);

  const throwDie = useCallback(() => {
    const node = body.current;
    if (!node) return;
    node.setTranslation(
      { x: -TRAY.w / 2 + 0.45 + index * 0.1, y: 1.5 + index * 0.22, z: 0.55 + (Math.random() - 0.5) * 0.3 },
      true,
    );
    node.setRotation(
      new THREE.Quaternion().setFromEuler(
        new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2),
      ),
      true,
    );
    node.setLinvel({ x: 2.3 + Math.random() * 1.6, y: 0.4, z: -1.0 - Math.random() * 0.9 }, true);
    node.setAngvel(
      { x: (Math.random() - 0.5) * 26, y: (Math.random() - 0.5) * 26, z: (Math.random() - 0.5) * 26 },
      true,
    );
    settleTimer.current = 0;
    reported.current = -1;
    landed.current = false;
    thrown.current = true;
  }, [index]);

  useEffect(() => {
    if (rollToken === lastToken.current) return;
    lastToken.current = rollToken;
    if (rollToken === 0 || held) return;
    throwDie();
  }, [held, rollToken, throwDie]);

  useFrame((_, delta) => {
    const node = body.current;
    if (!node) return;

    if (held) {
      // Held dice sit on the tray's front rail.
      const target = new THREE.Vector3(-0.78 + holdSlot * 0.39, HOLD_Y, TRAY.d / 2 + 0.3);
      const t = node.translation();
      node.setTranslation(
        {
          x: t.x + (target.x - t.x) * Math.min(1, delta * 10),
          y: t.y + (target.y - t.y) * Math.min(1, delta * 10),
          z: t.z + (target.z - t.z) * Math.min(1, delta * 10),
        },
        true,
      );
      return;
    }

    if (!thrown.current) return;

    const vel = node.linvel();
    const ang = node.angvel();
    const speed = Math.hypot(vel.x, vel.y, vel.z) + Math.hypot(ang.x, ang.y, ang.z) * 0.1;

    if (!landed.current && speed > 1.2 && node.translation().y < DIE * 1.4) {
      landed.current = true;
      sound.playDieLand();
    }

    if (speed < 0.22) {
      settleTimer.current += delta;
      if (settleTimer.current > 0.26) {
        const value = readTop();
        if (value === 0) {
          // Cocked against a wall: flick it back into the tray.
          node.setLinvel({ x: (Math.random() - 0.5) * 1.4, y: 1.5, z: (Math.random() - 0.5) * 1.4 }, true);
          node.setAngvel(
            { x: (Math.random() - 0.5) * 14, y: (Math.random() - 0.5) * 14, z: (Math.random() - 0.5) * 14 },
            true,
          );
          settleTimer.current = 0;
          return;
        }
        if (value !== reported.current) {
          reported.current = value;
          onSettle(index, value);
        }
      }
    } else {
      settleTimer.current = 0;
    }
  });

  return (
    <RigidBody
      ref={body}
      type={held ? 'kinematicPosition' : 'dynamic'}
      colliders="cuboid"
      restitution={0.38}
      friction={0.7}
      linearDamping={0.22}
      angularDamping={0.3}
      position={[-0.78 + index * 0.39, DIE, 0]}
    >
      <mesh
        castShadow
        receiveShadow
        material={materials}
        onPointerDown={e => {
          e.stopPropagation();
          onToggleHold(index);
        }}
      >
        <boxGeometry args={[DIE, DIE, DIE]} />
      </mesh>
      {held && (
        <mesh position={[0, -DIE / 2 - 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[DIE * 0.78, 20]} />
          <meshBasicMaterial color="#ffd24a" transparent opacity={0.4} />
        </mesh>
      )}
    </RigidBody>
  );
}

function Tray() {
  const felt = useMemo(feltTexture, []);
  const wood = useMemo(woodTexture, []);
  const wallH = 0.5;
  return (
    <group>
      <mesh position={[0, -0.03, 0]} receiveShadow>
        <boxGeometry args={[TRAY.w, 0.06, TRAY.d]} />
        <meshStandardMaterial map={felt} roughness={0.95} />
      </mesh>
      {/* rails */}
      {[
        { p: [0, wallH / 2 - 0.03, -TRAY.d / 2 - TRAY.wall / 2], s: [TRAY.w + TRAY.wall * 2, wallH, TRAY.wall] },
        { p: [0, wallH / 2 - 0.03, TRAY.d / 2 + TRAY.wall / 2 + TRAY.lip], s: [TRAY.w + TRAY.wall * 2, wallH, TRAY.wall] },
        { p: [-TRAY.w / 2 - TRAY.wall / 2, wallH / 2 - 0.03, TRAY.lip / 2], s: [TRAY.wall, wallH, TRAY.d + TRAY.lip + TRAY.wall * 2] },
        { p: [TRAY.w / 2 + TRAY.wall / 2, wallH / 2 - 0.03, TRAY.lip / 2], s: [TRAY.wall, wallH, TRAY.d + TRAY.lip + TRAY.wall * 2] },
      ].map((r, i) => (
        <mesh key={i} position={r.p as [number, number, number]} castShadow receiveShadow>
          <boxGeometry args={r.s as [number, number, number]} />
          <meshStandardMaterial map={wood} roughness={0.72} />
        </mesh>
      ))}
      {/* front rail the held dice rest on */}
      <mesh position={[0, -0.03, TRAY.d / 2 + TRAY.lip / 2]} receiveShadow>
        <boxGeometry args={[TRAY.w, 0.06, TRAY.lip]} />
        <meshStandardMaterial map={wood} roughness={0.7} />
      </mesh>

      {/* static colliders */}
      <CuboidCollider args={[TRAY.w / 2, 0.03, (TRAY.d + TRAY.lip) / 2]} position={[0, -0.03, TRAY.lip / 2]} />
      <CuboidCollider args={[TRAY.w / 2 + TRAY.wall, 0.3, TRAY.wall / 2]} position={[0, 0.3, -TRAY.d / 2 - TRAY.wall / 2]} />
      <CuboidCollider
        args={[TRAY.w / 2 + TRAY.wall, 0.3, TRAY.wall / 2]}
        position={[0, 0.3, TRAY.d / 2 + TRAY.wall / 2 + TRAY.lip]}
      />
      <CuboidCollider
        args={[TRAY.wall / 2, 0.3, (TRAY.d + TRAY.lip) / 2 + TRAY.wall]}
        position={[-TRAY.w / 2 - TRAY.wall / 2, 0.3, TRAY.lip / 2]}
      />
      <CuboidCollider
        args={[TRAY.wall / 2, 0.3, (TRAY.d + TRAY.lip) / 2 + TRAY.wall]}
        position={[TRAY.w / 2 + TRAY.wall / 2, 0.3, TRAY.lip / 2]}
      />
      {/* ceiling so a hard throw cannot escape the tray */}
      <CuboidCollider args={[TRAY.w / 2, 0.05, TRAY.d / 2]} position={[0, 2.4, 0]} />
    </group>
  );
}

export interface DiceTrayProps {
  dice: number[];
  held: boolean[];
  rollToken: number;
  /** True while the dice are still in the air. */
  rolling: boolean;
  canHold: boolean;
  onSettle: (values: number[]) => void;
  onToggleHold: (index: number) => void;
  bodyColor?: string;
  pipColor?: string;
}

/**
 * Five real dice in a felt tray. Values are read off the physics bodies once
 * they stop moving, so what the scorecard shows is literally what landed.
 */
export function DiceTray({
  dice,
  held,
  rollToken,
  rolling,
  canHold,
  onSettle,
  onToggleHold,
  bodyColor = '#f4ece0',
  pipColor = '#1d1b1a',
}: DiceTrayProps) {
  const materials = useMemo(
    () =>
      FACE_AXES.map(
        face =>
          new THREE.MeshStandardMaterial({
            map: pipTexture(face.value, bodyColor, pipColor),
            roughness: 0.42,
            metalness: 0.02,
          }),
      ),
    [bodyColor, pipColor],
  );

  // Thrown dice report 0 until they come to rest, so a roll is only "settled"
  // once every die that was actually thrown has a face up.
  const pending = useRef<number[]>([...dice]);
  const heldAtRoll = useRef<boolean[]>([...held]);

  useEffect(() => {
    if (rollToken === 0) return;
    heldAtRoll.current = [...held];
    pending.current = dice.map((v, i) => (held[i] ? v : 0));
  }, [rollToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSettle = useCallback(
    (index: number, value: number) => {
      pending.current[index] = value;
      const allSettled = pending.current.every((v, i) => heldAtRoll.current[i] || v > 0);
      if (allSettled) onSettle([...pending.current]);
    },
    [onSettle],
  );

  const holdSlots = useMemo(() => {
    let slot = 0;
    return held.map(h => (h ? slot++ : -1));
  }, [held]);

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        dpr={[1, 1.8]}
        camera={{ position: [0, 2.35, 2.55], fov: 40 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <ambientLight intensity={0.75} />
        <directionalLight position={[2.4, 5, 3]} intensity={2.1} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-1.8, 2.2, 1.4]} color="#ffd9a0" intensity={18} distance={9} decay={2} />
        <Physics gravity={[0, -13.5, 0]} timeStep={1 / 90}>
          <Tray />
          {dice.map((_, i) => (
            <Die
              key={i}
              index={i}
              held={held[i]}
              holdSlot={Math.max(0, holdSlots[i])}
              rollToken={rollToken}
              materials={materials}
              onSettle={handleSettle}
              onToggleHold={canHold ? onToggleHold : () => {}}
            />
          ))}
        </Physics>
      </Canvas>
      {rolling && (
        <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] font-bold text-amber-200/80">
          dice settling
        </p>
      )}
    </div>
  );
}
