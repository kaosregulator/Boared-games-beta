import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fitFov, isTouchDevice, pad } from '../input';
import { walkRig } from '../WalkController';
import { BLOCKS, ROOM, blockHas } from '../hotwheels/world';
import { stepLook } from '../army/armyKeys';
import { starFrames } from '../ispy/ISpyGame';
import { ispySfx, wakeISpyAudio } from '../ispy/ispyAudio';
import { openMiniGame } from '../../engine/lifecycle';
import { PLAY_TABLE } from '../roomLayout';
import { PoochiToy, newDrive, useToyBone, type PoochiDrive } from './PoochiToy';
import { jetMotor, loadPoochiVoice, poochiSay, popOut, propellerMotor } from './poochiAudio';
import { BONE_SPOTS, DOG, FETCH_REACH, floorUnder, nearestBone, newDog, stepDog, type DogState } from './dogSim';

/**
 * "Find my bones": shrunk down inside Poo-Chi, free roaming the room like
 * the Hot Wheels car. His bones are hidden around the room (dogSim.ts has
 * where); walk up to one and it pops, spins and sparkles with I Spy's
 * stars and chime, and he barks with happy eyes.
 *
 * Space (or Fly) pops the propeller up out of his back and lifts him; let
 * go and he floats down. Shift (or Jet) slides the jet pack out of his sides
 * and he takes off across the floor. Both tuck back in when you're done.
 */

export type DogCam = 'chase' | 'nose' | 'high';

export const hunt = {
  found: new Set<number>(),
  last: null as null | { label: string; at: number },
  done: false,
  cam: 'chase' as DogCam,
  flying: false,
  jetting: false,
  /** Sniff: which way the nearest bone is, relative to his nose (radians), and how far. */
  sniff: null as null | { angle: number; dist: number; until: number },
  banner: null as null | { text: string; sub?: string; until: number },
  listeners: new Set<() => void>(),
};

function emit() {
  hunt.listeners.forEach(fn => fn());
}

function banner(text: string, sub?: string, seconds = 2.4) {
  hunt.banner = { text, sub, until: performance.now() + seconds * 1000 };
}

export function useHunt() {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump(n => n + 1);
    hunt.listeners.add(fn);
    return () => {
      hunt.listeners.delete(fn);
    };
  }, []);
  return hunt;
}

/** Shared with the on-screen buttons on a phone. */
const touchDog = { fly: false, jet: false, left: false, right: false, go: false, back: false };
const huntControls = { sniff: null as null | (() => void), reset: null as null | (() => void) };

const CAM_ORDER: DogCam[] = ['chase', 'nose', 'high'];
function cycleCam() {
  hunt.cam = CAM_ORDER[(CAM_ORDER.indexOf(hunt.cam) + 1) % CAM_ORDER.length];
  emit();
}

const START = { x: PLAY_TABLE.x, z: PLAY_TABLE.z + 0.2, heading: 0 };

const _cam = new THREE.Vector3();
const _want = new THREE.Vector3();
const _look = new THREE.Vector3();
const _from = new THREE.Vector3();
const _fromLook = new THREE.Vector3();
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function insideSomething(p: THREE.Vector3) {
  if (p.x < ROOM.minX || p.x > ROOM.maxX || p.z < ROOM.minZ || p.z > ROOM.maxZ) return true;
  for (const b of BLOCKS) if (p.y > b.minY && p.y < b.maxY && blockHas(b, p.x, p.z)) return true;
  return false;
}

interface Sparkle {
  sprite: THREE.Sprite;
  age: number;
  life: number;
}

/** One of his bones, waiting where it fell. */
function Bone({ index, nodes }: { index: number; nodes: React.RefObject<(THREE.Group | null)[]> }) {
  const bone = useToyBone();
  const copy = useMemo(() => bone?.clone(true) ?? null, [bone]);
  const spot = BONE_SPOTS[index];
  return (
    <group
      ref={g => {
        if (nodes.current) nodes.current[index] = g;
      }}
      position={[spot.x, spot.y, spot.z]}
      rotation={[0, spot.yaw, 0]}
    >
      {copy && <primitive object={copy} />}
    </group>
  );
}

export function BoneHuntWorld({ onDone }: { onDone?: () => void }) {
  const { camera, size } = useThree();
  const dog = useRef<DogState>(newDog(START.x, START.z, START.heading));
  const drive = useRef<PoochiDrive>(newDrive());
  const body = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const sparkleGroup = useRef<THREE.Group>(null);
  const boneNodes = useRef<(THREE.Group | null)[]>([]);
  const foundAt = useRef<number[]>(BONE_SPOTS.map(() => -1));
  const sparkles = useRef<Sparkle[]>([]);
  const keys = useRef<Record<string, boolean>>({});
  const look = useRef({ yaw: 0, pitch: 0 });
  const saved = useRef<{ near: number; fov: number } | null>(null);
  const intro = useRef(0);
  const clock = useRef(0);
  const lastEmit = useRef(0);
  const glintAt = useRef(0);
  const motors = useRef<{ prop: ReturnType<typeof propellerMotor>; jet: ReturnType<typeof jetMotor> } | null>(null);
  const happyUntil = useRef(0);

  useEffect(() => {
    const life = openMiniGame('poochi-bones');
    void loadPoochiVoice();
    hunt.found = new Set();
    hunt.done = false;
    hunt.last = null;
    hunt.cam = 'chase';
    hunt.sniff = null;
    banner('Shrunk down!', `You're Poo-Chi. Find my ${BONE_SPOTS.length} bones!`, 3.2);
    _from.copy(camera.position);
    camera.getWorldDirection(_fromLook).multiplyScalar(1).add(camera.position);
    const d = drive.current;
    d.pose = 'stand';
    d.eyes = 'open';
    window.setTimeout(() => {
      d.voice = poochiSay('bark4');
    }, 700);
    emit();
    // Capture scripts can move him with window.__poochiDog (dev server only).
    if (import.meta.env.DEV) (window as unknown as { __poochiDog?: DogState }).__poochiDog = dog.current;
    return () => life.close();
    // The camera is the same object for the whole visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const typing = (e: KeyboardEvent) => Boolean((e.target as HTMLElement | null)?.closest('input, textarea, select'));
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      wake();
      keys.current[e.code] = true;
      if (e.code === 'KeyC' || e.code === 'KeyV') {
        cycleCam();
        look.current = { yaw: 0, pitch: 0 };
      }
      if (e.code === 'KeyF') sniff();
      if (e.code === 'KeyR') reset();
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    huntControls.sniff = sniff;
    huntControls.reset = reset;
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      huntControls.sniff = null;
      huntControls.reset = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** The motors start on the first key or tap (browsers need a gesture for sound). */
  function wake() {
    wakeISpyAudio();
    if (!motors.current) motors.current = { prop: propellerMotor(), jet: jetMotor() };
  }

  function reset() {
    const d = dog.current;
    Object.assign(d, newDog(START.x, START.z, START.heading));
    banner('Back to the middle', undefined, 1.2);
  }

  function sniff() {
    const d = dog.current;
    const near = nearestBone(d, hunt.found);
    if (!near) return;
    const toward = Math.atan2(near.bone.x - d.x, near.bone.z - d.z);
    hunt.sniff = { angle: wrap(toward - d.heading), dist: near.dist, until: performance.now() + 3500 };
    drive.current.voice = poochiSay('bark');
    emit();
  }

  function sparkleAt(p: THREE.Vector3, count: number, life: number) {
    const group = sparkleGroup.current;
    if (!group) return;
    const frames = starFrames();
    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: frames[0], transparent: true, depthWrite: false, depthTest: false, color: '#fff6c8' }),
      );
      const s = 0.07 + Math.random() * 0.05;
      sprite.scale.set(s, s, s);
      sprite.position.set(p.x + (Math.random() - 0.5) * 0.12, p.y + 0.03 + Math.random() * 0.08, p.z + (Math.random() - 0.5) * 0.12);
      sprite.renderOrder = 5;
      group.add(sprite);
      sparkles.current.push({ sprite, age: -i * 0.1, life });
    }
  }

  function fetch(id: number) {
    hunt.found.add(id);
    foundAt.current[id] = clock.current;
    const spot = BONE_SPOTS[id];
    sparkleAt(new THREE.Vector3(spot.x, spot.y, spot.z), 7, 1.1);
    ispySfx.found();
    const d = drive.current;
    d.eyes = 'happy';
    happyUntil.current = clock.current + 1.8;
    window.setTimeout(() => {
      d.voice = poochiSay('bark');
    }, 250);
    hunt.last = { label: spot.label, at: performance.now() };
    hunt.sniff = null;
    if (hunt.found.size === BONE_SPOTS.length) {
      hunt.done = true;
      banner('You found all my bones!', 'Poo-Chi sings you a song', 5);
      window.setTimeout(() => {
        d.voice = poochiSay('song1');
        d.eyes = 'heart';
        d.dance = 1;
        happyUntil.current = clock.current + 24;
      }, 1400);
      onDone?.();
    } else {
      banner(`Bone ${hunt.found.size} of ${BONE_SPOTS.length}!`, `Found it ${spot.label}`, 2);
    }
    emit();
  }

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    clock.current += dt;
    const k = keys.current;
    const d = dog.current;
    const fwd = (k.KeyW || touchDog.go || pad.y > 0.3 ? 1 : 0) - (k.KeyS || touchDog.back || pad.y < -0.3 ? 1 : 0);
    const turn = (k.KeyA || touchDog.left || pad.x < -0.3 ? 1 : 0) - (k.KeyD || touchDog.right || pad.x > 0.3 ? 1 : 0);
    const fly = Boolean(k.Space || touchDog.fly);
    const jet = Boolean(k.ShiftLeft || k.ShiftRight || touchDog.jet);
    const lookYaw = (k.ArrowLeft ? 1 : 0) - (k.ArrowRight ? 1 : 0);
    const lookUp = (k.ArrowUp ? 1 : 0) - (k.ArrowDown ? 1 : 0);
    if (lookYaw) look.current.yaw = wrap(look.current.yaw + lookYaw * 1.9 * dt);
    look.current.pitch = stepLook(look.current.pitch, lookUp, dt);
    // Held still during the shrink.
    const held = intro.current < 1;
    const events = stepDog(d, { move: held ? 0 : fwd, turn: held ? 0 : turn, fly: !held && fly, jet: !held && jet }, dt);
    for (const e of events) {
      if (e === 'prop-out' || e === 'jet-out') popOut(true);
      else if (e === 'prop-in' || e === 'jet-in') popOut(false);
    }
    if (motors.current) {
      motors.current.prop.set(d.prop > 0.5 ? (fly ? 1 : d.grounded ? 0.25 : 0.6) : 0);
      motors.current.jet.set(d.thrust);
    }

    // Drive the toy.
    const dr = drive.current;
    dr.walk = d.grounded ? Math.min(3, Math.abs(d.speed) * 6) : 0;
    dr.prop = d.prop;
    dr.spin = d.prop > 0.6 ? (fly ? 1 : d.grounded ? 0.3 : 0.7) : 0;
    dr.jet = d.jet;
    dr.thrust = d.thrust;
    dr.lean = THREE.MathUtils.clamp(-d.turnRate * Math.abs(d.speed) * 0.12, -0.25, 0.25);
    if (clock.current > happyUntil.current) {
      dr.eyes = 'open';
      dr.dance = 0;
    }
    const node = body.current;
    if (node) {
      node.position.set(d.x, d.y, d.z);
      node.rotation.set(0, d.heading, 0);
    }
    const sh = shadow.current;
    if (sh) {
      const ground = floorUnder(d.x, d.z, d.y + 0.01);
      const h = d.y - ground;
      sh.position.set(d.x, ground + 0.003, d.z);
      sh.scale.setScalar(1 + h * 0.8);
      (sh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.1, 0.45 - h * 0.25);
    }

    // Bones: spin gently, glint now and then so they can be spotted, pop when found.
    boneNodes.current.forEach((g, i) => {
      if (!g) return;
      const spot = BONE_SPOTS[i];
      const at = foundAt.current[i];
      if (at < 0) {
        g.rotation.y = spot.yaw + clock.current * 0.6;
        g.position.y = spot.y + 0.012 + Math.sin(clock.current * 2 + i) * 0.006;
        const near = Math.hypot(spot.x - d.x, spot.y - d.y, spot.z - d.z);
        if (!held && near < FETCH_REACH + DOG.radius * 0.6) fetch(i);
      } else {
        const t = clock.current - at;
        g.visible = t < 1.1;
        g.position.y = spot.y + Math.sin(Math.min(1, t / 1.1) * Math.PI) * 0.12;
        g.rotation.y = spot.yaw + t * 12;
        g.scale.setScalar(Math.max(0.001, 1 - Math.max(0, t - 0.7) / 0.4));
      }
    });
    if (clock.current > glintAt.current) {
      glintAt.current = clock.current + 1.6;
      const left = BONE_SPOTS.filter(b => !hunt.found.has(b.id));
      const pick = left[Math.floor(Math.random() * left.length)];
      if (pick) sparkleAt(new THREE.Vector3(pick.x, pick.y, pick.z), 2, 0.7);
    }
    for (let i = sparkles.current.length - 1; i >= 0; i--) {
      const sp = sparkles.current[i];
      sp.age += dt;
      sp.sprite.visible = sp.age >= 0;
      if (sp.age < 0) continue;
      const f = sp.age / sp.life;
      const frames = starFrames();
      const mat = sp.sprite.material as THREE.SpriteMaterial;
      mat.map = frames[Math.min(3, Math.floor(f * 4))];
      mat.opacity = 1 - Math.max(0, f - 0.6) / 0.4;
      sp.sprite.position.y += dt * 0.08;
      if (f >= 1) {
        sp.sprite.removeFromParent();
        mat.dispose();
        sparkles.current.splice(i, 1);
      }
    }

    // Camera: behind him, a little above; through his visor; or high up.
    const fx = Math.sin(d.heading);
    const fz = Math.cos(d.heading);
    const persp = camera as THREE.PerspectiveCamera;
    if (!saved.current) saved.current = { near: persp.near, fov: persp.fov };
    if (hunt.cam === 'nose') {
      _want.set(d.x + fx * 0.07, d.y + 0.125, d.z + fz * 0.07);
      const dir = new THREE.Vector3(fx, 0, fz).applyAxisAngle(new THREE.Vector3(0, 1, 0), look.current.yaw);
      dir.y = Math.tan(look.current.pitch - 0.05);
      _look.copy(_want).add(dir);
    } else {
      const back = hunt.cam === 'high' ? 0.9 : 0.42;
      const up = hunt.cam === 'high' ? 0.85 : 0.17;
      _want.set(d.x - fx * back, d.y + up, d.z - fz * back);
      _look.set(d.x + fx * 0.12, d.y + 0.07, d.z + fz * 0.12);
      if (look.current.yaw) {
        const c = new THREE.Vector3(d.x, d.y, d.z);
        _want.sub(c).applyAxisAngle(new THREE.Vector3(0, 1, 0), look.current.yaw).add(c);
      }
      _look.y += Math.tan(look.current.pitch) * 0.4;
      // Never inside the furniture: pull in toward him until it's clear.
      const from = new THREE.Vector3(d.x, d.y + 0.1, d.z);
      const to = _want.clone();
      for (let i = 0; i < 10 && insideSomething(_want); i++) _want.lerpVectors(from, to, 1 - (i + 1) / 10);
    }
    // The shrink: from where you were standing down into him.
    intro.current = Math.min(1, intro.current + dt / 1.6);
    const s = THREE.MathUtils.smootherstep(intro.current, 0, 1);
    if (intro.current < 1) {
      _cam.lerpVectors(_from, _want, s);
      camera.position.copy(_cam);
      _look.lerpVectors(_fromLook, _look, s);
    } else {
      const a = hunt.cam === 'nose' ? 1 : 1 - Math.exp(-dt * 8);
      _cam.lerp(_want, a);
      camera.position.copy(_cam);
    }
    camera.up.set(0, 1, 0);
    camera.lookAt(_look);
    const near = hunt.cam === 'high' ? 0.03 : 0.008;
    const fov = fitFov(hunt.cam === 'nose' ? 78 : 68, size.width / Math.max(1, size.height), 1.5, 100);
    if (persp.near !== near || Math.abs(persp.fov - fov) > 0.1) {
      persp.near = near;
      persp.fov = fov;
      persp.updateProjectionMatrix();
    }
    // The head and body hide in the nose view, so you see the room through his visor.
    if (node) node.visible = hunt.cam !== 'nose';

    hunt.flying = !d.grounded;
    hunt.jetting = d.thrust > 0.3;
    const now = performance.now();
    if (now - lastEmit.current > 90) {
      lastEmit.current = now;
      if (hunt.banner && now > hunt.banner.until) hunt.banner = null;
      if (hunt.sniff && now > hunt.sniff.until) hunt.sniff = null;
      emit();
    }
  });

  useEffect(() => {
    return () => {
      motors.current?.prop.stop();
      motors.current?.jet.stop();
      drive.current.voice?.stop();
      camera.up.set(0, 1, 0);
      const persp = camera as THREE.PerspectiveCamera;
      if (saved.current) {
        persp.near = saved.current.near;
        persp.fov = saved.current.fov;
        persp.updateProjectionMatrix();
      }
      // Grown back: standing where he was, looking down at the spot.
      const d = dog.current;
      const fx = Math.sin(d.heading);
      const fz = Math.cos(d.heading);
      const x = THREE.MathUtils.clamp(d.x - fx * 0.7, ROOM.minX + 0.4, ROOM.maxX - 0.4);
      const z = THREE.MathUtils.clamp(d.z - fz * 0.7, ROOM.minZ + 0.4, ROOM.maxZ - 0.4);
      walkRig.teleport = { at: [x, 1.15, z], look: [d.x, d.y, d.z] };
    };
  }, [camera]);

  return (
    <group>
      <group ref={sparkleGroup} />
      <Suspense fallback={null}>
        {BONE_SPOTS.map(b => (
          <Bone key={b.id} index={b.id} nodes={boneNodes} />
        ))}
      </Suspense>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.09, 20]} />
        <meshBasicMaterial color="#000" transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <group ref={body}>
        <Suspense fallback={null}>
          <PoochiToy drive={drive} />
        </Suspense>
        {/* His own light, so he never goes dark under the desk. */}
        <pointLight position={[0, 0.3, 0.1]} intensity={0.35} distance={0.9} decay={2} color="#fff1e0" />
      </group>
    </group>
  );
}

function HoldButton({ label, onHold, className }: { label: string; onHold: (on: boolean) => void; className: string }) {
  return (
    <button
      type="button"
      className={`pointer-events-auto select-none touch-none rounded-2xl border border-white/25 bg-black/55 text-sm font-black uppercase text-white active:bg-sky-500/70 ${className}`}
      onPointerDown={e => {
        e.preventDefault();
        wakeISpyAudio();
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerLeave={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
    >
      {label}
    </button>
  );
}

const CAM_LABEL: Record<DogCam, string> = { chase: 'Behind him', nose: 'Through his visor', high: 'Up high' };

export function BoneHuntHud({ onExit }: { onExit: () => void }) {
  const h = useHunt();
  const [touch] = useState(isTouchDevice);
  const total = BONE_SPOTS.length;
  return (
    <div data-bone-hunt className="pointer-events-none absolute inset-0 z-40 text-white">
      <div className="pointer-events-auto absolute left-4 top-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onExit} className="rounded-xl bg-amber-400 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-black">
          Grow back
        </button>
        <button type="button" onClick={cycleCam} className="rounded-xl border border-white/25 bg-black/55 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-100">
          {CAM_LABEL[h.cam]}
        </button>
        <button type="button" onClick={() => huntControls.sniff?.()} className="rounded-xl border border-white/25 bg-black/55 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/85">
          Sniff
        </button>
        <button type="button" onClick={() => huntControls.reset?.()} className="rounded-xl border border-white/25 bg-black/55 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/85">
          Reset
        </button>
      </div>

      <div className="absolute right-4 top-4 rounded-2xl border border-sky-300/30 bg-black/60 px-4 py-2 text-right">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-200">Find my bones</p>
        <p className="font-mono text-2xl font-black tabular-nums">
          {h.found.size}/{total}
        </p>
        <div className="mt-1 flex max-w-[180px] flex-wrap justify-end gap-1">
          {BONE_SPOTS.map(b => (
            <span key={b.id} className={`text-base leading-none ${h.found.has(b.id) ? '' : 'opacity-25 grayscale'}`}>
              🦴
            </span>
          ))}
        </div>
        {h.last && <p className="mt-1 max-w-[180px] text-[10px] leading-tight text-white/70">Last one: {h.last.label}</p>}
      </div>

      {h.sniff && (
        <div className="absolute left-1/2 top-24 flex -translate-x-1/2 flex-col items-center gap-1 rounded-2xl bg-black/60 px-4 py-2">
          <span className="text-3xl text-amber-300" style={{ transform: `rotate(${-h.sniff.angle}rad)` }}>
            ⬆
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-100">
            {h.sniff.dist < 0.6 ? 'Hot! Right here somewhere' : h.sniff.dist < 1.5 ? 'Warm' : 'Cold… that way'}
          </span>
        </div>
      )}

      {h.banner && (
        <div className="absolute left-1/2 top-[30%] -translate-x-1/2 text-center">
          <p className="text-5xl font-black italic text-sky-300 drop-shadow-[0_3px_0_rgba(0,0,0,0.7)]">{h.banner.text}</p>
          {h.banner.sub && <p className="mt-2 rounded-full bg-black/60 px-4 py-1 text-sm font-bold text-white/90">{h.banner.sub}</p>}
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        <div className="flex items-center gap-3 rounded-full bg-black/60 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider">
          <span className={h.flying ? 'text-sky-200' : 'text-white/50'}>Propeller {h.flying ? 'up' : 'down'}</span>
          <span className={h.jetting ? 'text-orange-300' : 'text-white/50'}>Jet {h.jetting ? 'on' : 'off'}</span>
          {!touch && <span className="text-white/65">WASD walk · Space fly · Shift jet pack · F sniff · Arrows look · C camera · R reset</span>}
        </div>
      </div>

      {touch && (
        <>
          <div className="absolute bottom-6 left-4 flex gap-3">
            <HoldButton label="◀" className="h-16 w-16" onHold={on => (touchDog.left = on)} />
            <HoldButton label="▶" className="h-16 w-16" onHold={on => (touchDog.right = on)} />
          </div>
          <div className="absolute bottom-6 right-4 flex items-end gap-3">
            <HoldButton label="Jet" className="h-12 w-14 text-orange-200" onHold={on => (touchDog.jet = on)} />
            <HoldButton label="Fly" className="h-14 w-14 text-sky-200" onHold={on => (touchDog.fly = on)} />
            <HoldButton label="Back" className="h-14 w-14 text-[11px]" onHold={on => (touchDog.back = on)} />
            <HoldButton label="Go" className="h-20 w-20" onHold={on => (touchDog.go = on)} />
          </div>
        </>
      )}
    </div>
  );
}
