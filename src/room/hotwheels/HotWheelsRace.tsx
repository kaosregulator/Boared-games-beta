import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { fitFov } from '../input';
import { pad } from '../input';
import { walkView } from '../walkView';
import { walkRig } from '../WalkController';
import { LAYOUT } from '../roomLayout';
import {
  LOOP_BIG,
  LOOP_SMALL,
  NITRO_SPOTS,
  TRACK_FRAMES,
  TRACK_LENGTH,
  TRACK_MARKS,
  caveGeometry,
  deckGeometry,
  deckUnderside,
  frameAt,
  railGeometry,
} from './trackCourse';

export type HwCam = 'chase' | 'hood' | 'wide';

const LAPS = 3;
const BEST_KEY = 'hotwheels-best-ms';

export const hwRace = {
  phase: 'countdown' as 'countdown' | 'racing' | 'done',
  countdown: 3,
  lap: 1,
  time: 0,
  best: null as number | null,
  bottles: 0,
  nitro: 0,
  cam: 'chase' as HwCam,
  upsideDown: false,
  speed: 0,
  listeners: new Set<() => void>(),
};

function emit() {
  hwRace.listeners.forEach(fn => fn());
}

export function useHwRace() {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump(n => n + 1);
    hwRace.listeners.add(fn);
    return () => {
      hwRace.listeners.delete(fn);
    };
  }, []);
  return hwRace;
}

function readBest() {
  try {
    const n = Number(window.localStorage.getItem(BEST_KEY));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function spotU(spot: string | null) {
  if (spot === 'loop') return TRACK_MARKS.loopTop.u;
  if (spot === 'cave') return TRACK_MARKS.cave.u;
  if (spot === 'ramp') return TRACK_MARKS.ramp.u;
  return 0;
}

const ORANGE = '#ff5c14';
const RAIL = '#9a3412';

function LoopStand({ loop, height }: { loop: { x: number; y: number; z: number; r: number }; height: number }) {
  return (
    <group>
      {[-0.14, 0.14].map(z => (
        <mesh key={z} position={[loop.x, height / 2, loop.z + z]}>
          <cylinderGeometry args={[0.018, 0.022, height, 8]} />
          <meshStandardMaterial color={RAIL} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

function TrackPlastic() {
  const deck = useMemo(deckGeometry, []);
  const belly = useMemo(deckUnderside, []);
  const left = useMemo(() => railGeometry(-1), []);
  const right = useMemo(() => railGeometry(1), []);
  const cave = useMemo(caveGeometry, []);
  const start = TRACK_MARKS.start;
  const mouths = [TRACK_MARKS.caveMouth, closestCaveExit()];
  return (
    <group>
      <mesh geometry={belly}>
        <meshStandardMaterial color="#9a3412" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={deck} receiveShadow>
        <meshStandardMaterial color={ORANGE} roughness={0.38} metalness={0.12} emissive="#c2410c" emissiveIntensity={0.18} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={left}>
        <meshStandardMaterial color={RAIL} roughness={0.45} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={right}>
        <meshStandardMaterial color={RAIL} roughness={0.45} side={THREE.DoubleSide} />
      </mesh>
      {cave && (
        <mesh geometry={cave}>
          <meshStandardMaterial color="#1c1410" roughness={1} side={THREE.DoubleSide} />
        </mesh>
      )}
      {mouths.map((f, i) => (
        <mesh key={i} position={f.p} quaternion={new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.right, f.up, f.tangent))}>
          <torusGeometry args={[0.16, 0.02, 8, 18]} />
          <meshStandardMaterial color={ORANGE} emissive="#ea580c" emissiveIntensity={0.35} />
        </mesh>
      ))}
      <LoopStand loop={LOOP_BIG} height={LOOP_BIG.y + LOOP_BIG.r} />
      <LoopStand loop={LOOP_SMALL} height={LOOP_SMALL.y + LOOP_SMALL.r} />
      <mesh
        position={start.p.clone().addScaledVector(start.up, 0.022)}
        quaternion={new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(start.right, start.up, start.tangent))}
      >
        <boxGeometry args={[0.2, 0.006, 0.03]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
    </group>
  );
}

function closestCaveExit() {
  let best = TRACK_FRAMES[0];
  let bestD = Infinity;
  for (const frame of TRACK_FRAMES) {
    if (!frame.cave) continue;
    const d = Math.abs(frame.p.z - 0.22) + Math.abs(frame.p.x + 2.1);
    if (d < bestD) {
      bestD = d;
      best = frame;
    }
  }
  return best;
}

function NitroCans({ taken }: { taken: boolean[] }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    g.children.forEach((child, i) => {
      const spot = NITRO_SPOTS[i];
      child.visible = !taken[i];
      child.rotation.y = clock.elapsedTime * 2.2;
      const bob = Math.sin(clock.elapsedTime * 4 + i) * 0.012;
      child.position.copy(spot.p).addScaledVector(spot.up, 0.08 + bob);
      child.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spot.up);
    });
  });
  return (
    <group ref={group}>
      {NITRO_SPOTS.map((spot, i) => (
        <mesh key={i} position={spot.p.clone().addScaledVector(spot.up, 0.08)}>
          <cylinderGeometry args={[0.022, 0.022, 0.07, 10]} />
          <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={1.1} />
        </mesh>
      ))}
    </group>
  );
}

function Racer() {
  const gltf = useGLTF('/models/hw-racer.glb');
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  useLayoutEffect(() => {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const longest = Math.max(size.x, size.z, 0.001);
    const s = 0.12 / longest;
    model.scale.setScalar(s);
    model.position.set(-center.x * s, -box.min.y * s, -center.z * s);
  }, [model]);
  return <primitive object={model} />;
}

/**
 * Drives the tiny car along the groove and aims the room camera with the
 * car's own up, so the top of the loop turns the bedroom upside down.
 */
export function HotWheelsWorld({
  spot,
  skipCountdown,
}: {
  spot: string | null;
  skipCountdown: boolean;
}) {
  const { camera } = useThree();
  const car = useRef<THREE.Group>(null);
  const u = useRef(spotU(spot));
  const speed = useRef(0);
  const nitroLeft = useRef(0);
  const taken = useRef(NITRO_SPOTS.map(() => false));
  const traveled = useRef(0);
  const head = useRef<THREE.SpotLight>(null);
  const headTarget = useRef<THREE.Object3D>(null);
  const [, poke] = useState(0);
  const keys = useRef<Record<string, boolean>>({});
  const prevU = useRef(u.current);
  const crossed = useRef(false);
  const savedNear = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (head.current && headTarget.current) head.current.target = headTarget.current;
  }, []);

  useEffect(() => {
    hwRace.phase = skipCountdown ? 'racing' : 'countdown';
    hwRace.countdown = 3;
    hwRace.lap = 1;
    hwRace.time = 0;
    hwRace.best = readBest();
    hwRace.bottles = 0;
    hwRace.nitro = 0;
    hwRace.cam = 'chase';
    hwRace.upsideDown = false;
    emit();
    if (!skipCountdown) {
      let left = 3;
      const timer = window.setInterval(() => {
        left -= 1;
        hwRace.countdown = left;
        if (left <= 0) {
          hwRace.phase = 'racing';
          window.clearInterval(timer);
        }
        emit();
      }, 700);
      return () => window.clearInterval(timer);
    }
  }, [skipCountdown]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'c') {
        hwRace.cam = hwRace.cam === 'chase' ? 'hood' : hwRace.cam === 'hood' ? 'wide' : 'chase';
        emit();
      }
      if (e.code === 'Space') {
        if (hwRace.bottles > 0 && nitroLeft.current <= 0) {
          hwRace.bottles -= 1;
          nitroLeft.current = 1.5;
          emit();
        }
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const k = keys.current;
    const gas = Boolean(k.w || k.arrowup) || pad.y > 0.25;
    const brake = Boolean(k.s || k.arrowdown) || pad.y < -0.25;
    const boosting = nitroLeft.current > 0;
    if (hwRace.phase === 'racing') {
      hwRace.time += dt;
      const cap = boosting ? 3.4 : 2.15;
      if (gas) speed.current = Math.min(cap, speed.current + (boosting ? 6.5 : 3.2) * dt);
      else if (brake) speed.current = Math.max(0, speed.current - 5.5 * dt);
      else speed.current = Math.max(0, speed.current - 1.15 * dt);
      traveled.current += speed.current * dt;
      if (boosting) nitroLeft.current = Math.max(0, nitroLeft.current - dt);
      const next = u.current + (speed.current * dt) / TRACK_LENGTH;
      if (prevU.current > 0.82 && next >= 1 && crossed.current) {
        if (hwRace.lap >= LAPS) {
          hwRace.phase = 'done';
          speed.current = 0;
          const best = hwRace.best;
          if (best === null || hwRace.time < best) {
            hwRace.best = hwRace.time;
            try {
              window.localStorage.setItem(BEST_KEY, String(hwRace.time));
            } catch {
              // still shown this visit
            }
          }
        } else {
          hwRace.lap += 1;
          taken.current = NITRO_SPOTS.map(() => false);
          poke(n => n + 1);
        }
      }
      if (next > 0.2) crossed.current = true;
      u.current = next % 1;
      prevU.current = u.current;
    }

    const frame = frameAt(u.current);
    const node = car.current;
    if (node) {
      const pos = frame.p.clone().addScaledVector(frame.up, 0.02);
      node.position.copy(pos);
      const basis = new THREE.Matrix4().makeBasis(frame.right, frame.up, frame.tangent);
      node.quaternion.setFromRotationMatrix(basis);
    }

    for (let i = 0; i < NITRO_SPOTS.length; i++) {
      if (taken.current[i] || traveled.current < 0.45) continue;
      if (frame.p.distanceTo(NITRO_SPOTS[i].p) < 0.16) {
        taken.current[i] = true;
        hwRace.bottles = Math.min(NITRO_SPOTS.length, hwRace.bottles + 1);
        poke(n => n + 1);
      }
    }

    const camMode = hwRace.cam;
    const tucked = frame.cave;
    const inverted = frame.loop && frame.up.y < -0.25;
    const back = tucked ? 0.18 : inverted ? 0.55 : camMode === 'hood' ? 0.015 : camMode === 'wide' ? 1.05 : 0.42;
    const rise = tucked ? 0.05 : inverted ? 0.42 : camMode === 'hood' ? 0.04 : camMode === 'wide' ? 0.46 : 0.16;
    const side = inverted ? 0.4 : 0;
    const lookAhead = camMode === 'hood' ? 0.4 : 0.04;
    const camPos = frame.p.clone().addScaledVector(frame.tangent, -back).addScaledVector(frame.up, rise).addScaledVector(frame.right, side);
    camera.position.copy(camPos);
    camera.up.copy(frame.up);
    const look = frame.p.clone().addScaledVector(frame.tangent, lookAhead).addScaledVector(frame.up, camMode === 'hood' ? 0.02 : 0.04);
    camera.lookAt(look);
    const persp = camera as THREE.PerspectiveCamera;
    if (savedNear.current === null) savedNear.current = persp.near;
    const near = 0.012;
    const fov = fitFov(walkView.fov, persp.aspect || 1.5, 1.5, 110);
    if (persp.near !== near || Math.abs(persp.fov - fov) > 0.2) {
      persp.near = near;
      persp.fov = fov;
      persp.updateProjectionMatrix();
    }

    hwRace.speed = speed.current;
    hwRace.nitro = nitroLeft.current / 1.5;
    hwRace.upsideDown = frame.up.y < -0.35;
    emit();
  });

  useEffect(() => {
    return () => {
      camera.up.set(0, 1, 0);
      const persp = camera as THREE.PerspectiveCamera;
      if (savedNear.current !== null) {
        persp.near = savedNear.current;
        persp.updateProjectionMatrix();
      }
      const hw = LAYOUT.hotwheels;
      walkRig.teleport = {
        at: [hw.x - 0.85, 1.15, hw.z + 0.7],
        look: [hw.x, 0.25, hw.z],
      };
    };
  }, [camera]);

  return (
    <group>
      <TrackPlastic />
      <NitroCans taken={taken.current} />
      <group ref={car}>
        <Suspense fallback={
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.04, 0.025, 0.08]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
        }>
          <Racer />
        </Suspense>
        <object3D ref={headTarget} position={[0, 0.03, 0.9]} />
        <spotLight ref={head} position={[0, 0.06, 0.02]} angle={0.55} penumbra={0.5} intensity={3.2} distance={2.4} color="#fff4dc" />
        <pointLight position={[0, 0.08, -0.04]} intensity={0.6} distance={1.2} color="#fff7ed" />
      </group>
      <pointLight position={[0.2, 1.6, 0.2]} intensity={0.45} distance={7} color="#fff4e5" />
    </group>
  );
}

useGLTF.preload('/models/hw-racer.glb');

export function formatRaceTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const rest = seconds - m * 60;
  return `${m}:${rest.toFixed(2).padStart(5, '0')}`;
}

const CAM_LABEL: Record<HwCam, string> = {
  chase: 'Third person',
  hood: 'First person',
  wide: 'Wide',
};

export function HotWheelsHud({ onExit }: { onExit: () => void }) {
  const race = useHwRace();
  const cycle = () => {
    hwRace.cam = hwRace.cam === 'chase' ? 'hood' : hwRace.cam === 'hood' ? 'wide' : 'chase';
    emit();
  };
  return (
    <div data-hw-race className="pointer-events-none absolute inset-0 z-40 text-white">
      <div className="pointer-events-auto absolute left-4 top-4 flex items-center gap-2">
        <button type="button" onClick={onExit} className="rounded-xl bg-amber-400 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-black">
          Stand up
        </button>
        <button type="button" onClick={cycle} className="rounded-xl border border-white/25 bg-black/55 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-100">
          {CAM_LABEL[race.cam]}
        </button>
      </div>
      <div className="absolute right-4 top-4 rounded-2xl border border-orange-300/30 bg-black/55 px-4 py-2 text-right">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-200">
          Lap {Math.min(race.lap, LAPS)}/{LAPS}
        </p>
        <p className="font-mono text-2xl font-black tabular-nums">{formatRaceTime(race.time)}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
          Best {race.best === null ? '—' : formatRaceTime(race.best)}
        </p>
      </div>
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        {race.upsideDown && race.phase === 'racing' && (
          <p className="rounded-full bg-orange-500 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-black">
            Upside down
          </p>
        )}
        <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider">
          <span className="text-cyan-200">Nitro {race.bottles}</span>
          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-white/15">
            <span className="block h-full bg-cyan-300" style={{ width: `${Math.round(race.nitro * 100)}%` }} />
          </span>
          <span className="text-white/70">W gas · S brake · Space boost · C camera</span>
        </div>
      </div>
      {race.phase === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-7xl font-black text-amber-300 drop-shadow">{race.countdown > 0 ? race.countdown : 'GO'}</p>
        </div>
      )}
      {race.phase === 'done' && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/35">
          <div className="rounded-3xl border border-amber-200/30 bg-[#1a100c]/90 px-8 py-6 text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-200">Three laps</p>
            <p className="mt-1 font-mono text-4xl font-black">{formatRaceTime(race.time)}</p>
            <p className="mt-1 text-sm text-white/75">Best {race.best === null ? '—' : formatRaceTime(race.best)}</p>
            <button type="button" onClick={onExit} className="mt-4 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-black">
              Stand up
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
