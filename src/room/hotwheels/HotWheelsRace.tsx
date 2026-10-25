import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { fitFov, isTouchDevice, pad } from '../input';
import { walkRig } from '../WalkController';
import { LAYOUT } from '../roomLayout';
import {
  BOOSTERS,
  FINISH,
  LOOPS,
  NITRO_SPOTS,
  PIECES,
  startPose,
  type Frame,
  type Loop,
} from './course';
import { CAR, ceilingAt, groundAt, newCar, placeCar, refillNitro, stepCar, TUNING, type CarState } from './carSim';
import { BED_BOUNDS, BED_CLEAR, BLOCKS, DESK, ROOM, zoneAt, type ZoneId } from './world';
import { Quipper, quipSeconds } from '../roomQuips';
import { SpeechBubble } from '../army/SpeechBubble';
import { motorSpeed, raceSfx, startMotor, stopRaceAudio, wakeRaceAudio } from './raceAudio';
import { openMiniGame } from '../../engine/lifecycle';

export type HwCam = 'chase' | 'hood' | 'birdseye';
type Phase = 'countdown' | 'racing' | 'roam';

const LAPS = 3;
/** Past this the race is over and you're just driving around the room. */
export const RACE_LIMIT = 150;
const BEST_KEY = 'hotwheels-best-ms';
const CHECKPOINTS: { id: ZoneId; label: string }[] = [
  { id: 'bed', label: 'Under the bed' },
  { id: 'desk-top', label: 'The desk' },
];

export const hwRace = {
  phase: 'countdown' as Phase,
  countdown: 3,
  lap: 1,
  time: 0,
  best: null as number | null,
  /** Last finished race, shown in free roam. */
  result: null as null | { time: number; best: boolean },
  timedOut: false,
  visited: new Set<ZoneId>(),
  zone: null as ZoneId | null,
  cam: 'chase' as HwCam,
  speed: 0,
  nitroCans: 0,
  nitro: 0,
  airborne: false,
  looping: false,
  banner: null as null | { text: string; sub?: string; until: number },
  /** What the car's thinking: under the bed, by the Hot Pockets, flat out on the floor. */
  quip: null as null | { text: string; then?: string; until: number },
  listeners: new Set<() => void>(),
};

const carQuips = new Quipper({ gap: 16, cooldown: 45, chance: 0.08 });

/** Now and then the car has something to say about where it's got to. */
function tickCarQuip(dt: number, x: number, y: number, z: number) {
  const now = performance.now();
  const q = hwRace.quip;
  if (q && now > q.until) hwRace.quip = q.then ? { text: q.then, until: now + quipSeconds(q.then) * 1000 } : null;
  if (hwRace.quip) return;
  const line = carQuips.tick(dt, 'car', x, y, z);
  if (line) hwRace.quip = { text: line.text, then: line.then, until: now + quipSeconds(line.text) * 1000 };
}

function emit() {
  hwRace.listeners.forEach(fn => fn());
}

function banner(text: string, sub?: string, seconds = 2.2) {
  hwRace.banner = { text, sub, until: performance.now() + seconds * 1000 };
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

function saveBest(t: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(t));
  } catch {
    // still shown this visit
  }
}

/** Shared with the on-screen buttons on a phone. */
const touchDrive = { gas: false, brake: false, left: false, right: false, nitro: false };

const CAM_ORDER: HwCam[] = ['chase', 'hood', 'birdseye'];
function cycleCam() {
  hwRace.cam = CAM_ORDER[(CAM_ORDER.indexOf(hwRace.cam) + 1) % CAM_ORDER.length];
  emit();
}

/** Drop the car somewhere specific, for screenshots and testing (?spot=). */
function spotPose(spot: string | null) {
  const s = startPose();
  const pick = (id: string, u: number) => {
    const pc = PIECES.find(p => p.id === id)!;
    const fr = pc.frames[Math.round(u * (pc.frames.length - 1))];
    return { p: fr.p.clone(), heading: Math.atan2(fr.tangent.z, fr.tangent.x) };
  };
  if (spot === 'bed') return { p: new THREE.Vector3(-1.98, 0.01, -0.6), heading: Math.PI / 2 };
  if (spot === 'desk') return pick('desk', 0.3);
  if (spot === 'jump') return pick('bed-run', 0.97);
  if (spot === 'climb') return pick('landing', 0.7);
  if (spot === 'loop') return pick('north', 0.85);
  if (spot === 'under-desk') return { p: new THREE.Vector3(2.25, 0, 1.72), heading: 0.2 };
  return s;
}

// ---------------------------------------------------------------------------
// Track plastic

const ORANGE = '#ff6a13';
const RAIL = '#e04e00';
const UNDER = '#a33a06';

function ribbon(frames: Frame[], half: number, lift: number, shift = 0) {
  const geo = new THREE.BufferGeometry();
  const n = frames.length;
  const pos = new Float32Array(n * 6);
  const nrm = new Float32Array(n * 6);
  const uv = new Float32Array(n * 4);
  let along = 0;
  for (let i = 0; i < n; i++) {
    const f = frames[i];
    if (i > 0) along += f.p.distanceTo(frames[i - 1].p);
    const l = f.p.clone().addScaledVector(f.right, -half + shift).addScaledVector(f.up, lift);
    const r = f.p.clone().addScaledVector(f.right, half + shift).addScaledVector(f.up, lift);
    pos.set([l.x, l.y, l.z, r.x, r.y, r.z], i * 6);
    nrm.set([f.up.x, f.up.y, f.up.z, f.up.x, f.up.y, f.up.z], i * 6);
    uv.set([0, along * 8, 1, along * 8], i * 4);
  }
  const idx: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    const b = (i + 1) * 2;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

/** A side wall: a strip standing up from the deck edge. */
function rail(frames: Frame[], offset: number, height: number) {
  const geo = new THREE.BufferGeometry();
  const n = frames.length;
  const pos = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) {
    const f = frames[i];
    const a = f.p.clone().addScaledVector(f.right, offset);
    const b = a.clone().addScaledVector(f.up, height);
    pos.set([a.x, a.y, a.z, b.x, b.y, b.z], i * 6);
  }
  const idx: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    const b = (i + 1) * 2;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function deckTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = ORANGE;
  g.fillRect(0, 0, 64, 64);
  // The two grooves the wheels ride in, and a faint seam every piece.
  g.fillStyle = 'rgba(160,50,0,0.35)';
  g.fillRect(14, 0, 4, 64);
  g.fillRect(46, 0, 4, 64);
  g.fillStyle = 'rgba(255,220,180,0.18)';
  g.fillRect(0, 0, 64, 2);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function checkerTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 16;
  const g = c.getContext('2d')!;
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 2; y++) {
      g.fillStyle = (x + y) % 2 ? '#111' : '#f8fafc';
      g.fillRect(x * 8, y * 8, 8, 8);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function bannerTexture(text: string) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d')!;
  g.fillStyle = '#111827';
  g.fillRect(0, 0, 512, 96);
  g.fillStyle = '#facc15';
  g.fillRect(0, 0, 512, 8);
  g.fillRect(0, 88, 512, 8);
  g.font = 'italic 900 58px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ff6a13';
  g.fillText(text, 256, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Local +Z along the track, +Y up off the deck (so local +X is left of travel). */
function basis(f: { up: THREE.Vector3; tangent: THREE.Vector3 }) {
  const x = new THREE.Vector3().crossVectors(f.up, f.tangent).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, f.up, f.tangent));
}

function Strip({ frames, half, railed }: { frames: Frame[]; half: number; railed: boolean }) {
  const tex = useMemo(deckTexture, []);
  const deck = useMemo(() => ribbon(frames, half, 0), [frames, half]);
  const belly = useMemo(() => ribbon(frames, half + 0.004, -0.006), [frames, half]);
  const railH = railed ? 0.02 : 0.009;
  const left = useMemo(() => rail(frames, -half - 0.003, railH), [frames, half, railH]);
  const right = useMemo(() => rail(frames, half + 0.003, railH), [frames, half, railH]);
  return (
    <group>
      <mesh geometry={deck} receiveShadow>
        <meshStandardMaterial map={tex} roughness={0.35} metalness={0.05} emissive="#c2410c" emissiveIntensity={0.16} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={belly}>
        <meshStandardMaterial color={UNDER} roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={left}>
        <meshStandardMaterial color={RAIL} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={right}>
        <meshStandardMaterial color={RAIL} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** Posts under raised plastic, skipped where another run passes beneath. */
function Supports() {
  const posts = useMemo(() => {
    const out: { x: number; z: number; y0: number; y1: number }[] = [];
    for (const pc of PIECES) {
      let acc = 0;
      for (let i = 1; i < pc.frames.length; i++) {
        acc += pc.frames[i].p.distanceTo(pc.frames[i - 1].p);
        if (acc < 0.22) continue;
        acc = 0;
        const p = pc.frames[i].p;
        if (p.y < 0.06) continue;
        const below = groundAt(p.x, p.z, p.y - 0.03);
        if (below.piece && below.piece !== pc) continue;
        if (p.y - below.y < 0.05) continue;
        out.push({ x: p.x, z: p.z, y0: below.y, y1: p.y - 0.006 });
      }
    }
    return out;
  }, []);
  return (
    <group>
      {posts.map((s, i) => (
        <mesh key={i} position={[s.x, (s.y0 + s.y1) / 2, s.z]}>
          <cylinderGeometry args={[0.008, 0.012, s.y1 - s.y0, 8]} />
          <meshStandardMaterial color="#2563eb" roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

/** The blue clamp and stand that hold a loop up. */
function LoopStand({ loop }: { loop: Loop }) {
  const top = loop.base.y + loop.r * 2;
  const sides = [-1, 1].map(s => loop.base.clone()
    .addScaledVector(loop.side, loop.shift / 2 + s * (loop.shift / 2 + 0.13))
    .addScaledVector(loop.dir, 0));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), loop.side);
  return (
    <group>
      {sides.map((p, i) => (
        <mesh key={i} position={[p.x, top / 2, p.z]}>
          <cylinderGeometry args={[0.01, 0.014, top, 8]} />
          <meshStandardMaterial color="#2563eb" roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[(sides[0].x + sides[1].x) / 2, top + 0.01, (sides[0].z + sides[1].z) / 2]} quaternion={q}>
        <boxGeometry args={[sides[0].distanceTo(sides[1]), 0.016, 0.03]} />
        <meshStandardMaterial color="#2563eb" roughness={0.45} />
      </mesh>
    </group>
  );
}

/** Real Hot Wheels booster: a box over the track with two spinning tyres. */
function Booster({ b }: { b: (typeof BOOSTERS)[number] }) {
  const wheels = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    wheels.current?.children.forEach(w => {
      w.rotation.x += dt * 30;
    });
  });
  const q = useMemo(() => basis(b), [b]);
  return (
    <group position={b.p} quaternion={q}>
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * 0.12, 0.035, 0]}>
          <boxGeometry args={[0.07, 0.07, 0.11]} />
          <meshStandardMaterial color="#facc15" roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.075, 0]}>
        <boxGeometry args={[0.31, 0.014, 0.11]} />
        <meshStandardMaterial color="#111827" roughness={0.5} />
      </mesh>
      <group ref={wheels}>
        {[-1, 1].map(s => (
          <mesh key={s} position={[s * 0.07, 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.028, 0.028, 0.03, 14]} />
            <meshStandardMaterial color="#1f2937" roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function FinishLine() {
  const checker = useMemo(checkerTexture, []);
  const sign = useMemo(() => bannerTexture('FINISH'), []);
  const q = useMemo(() => basis(FINISH), []);
  const h = 0.26;
  const w = FINISH.half * 2;
  return (
    <group position={FINISH.p} quaternion={q}>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, 0.05]} />
        <meshStandardMaterial map={checker} roughness={0.6} />
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} position={[(s * w) / 2, h / 2, 0]}>
          <cylinderGeometry args={[0.008, 0.01, h, 8]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, h, 0]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w, w * 0.1875]} />
        <meshStandardMaterial map={sign} side={THREE.DoubleSide} emissive="#ffffff" emissiveIntensity={0.25} emissiveMap={sign} />
      </mesh>
    </group>
  );
}

function NitroCans({ car }: { car: React.MutableRefObject<CarState> }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock, camera }) => {
    const g = group.current;
    if (!g) return;
    g.children.forEach((child, i) => {
      const spot = NITRO_SPOTS[i];
      // A can right against the lens would fill the screen: hide it.
      child.visible = !car.current.taken[i] && camera.position.distanceTo(spot) > 0.12;
      child.rotation.y = clock.elapsedTime * 2.2;
      child.position.set(spot.x, spot.y + 0.045 + Math.sin(clock.elapsedTime * 4 + i) * 0.008, spot.z);
    });
  });
  return (
    <group ref={group}>
      {NITRO_SPOTS.map((spot, i) => (
        <mesh key={i} position={spot}>
          <cylinderGeometry args={[0.016, 0.016, 0.05, 12]} />
          <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={1.2} />
        </mesh>
      ))}
    </group>
  );
}

/** What lives under the bed and the desk, so you know where you are. */
function HidingPlaces() {
  const b = BED_BOUNDS;
  return (
    <group>
      {/* Slats and the underside of the box spring, close over the car's roof. */}
      <mesh position={[(b.minX + b.maxX) / 2, BED_CLEAR + 0.002, (b.minZ + b.maxZ) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[b.maxX - b.minX, b.maxZ - b.minZ]} />
        <meshStandardMaterial color="#2a1a12" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[b.minX + 0.12 + i * ((b.maxX - b.minX - 0.24) / 6), BED_CLEAR - 0.003, (b.minZ + b.maxZ) / 2]}>
          <boxGeometry args={[0.06, 0.006, b.maxZ - b.minZ - 0.04]} />
          <meshStandardMaterial color="#5b3a22" roughness={0.9} />
        </mesh>
      ))}
      {/* Dust bunnies, a lost sock, a Lego brick. */}
      {[
        [-2.35, -0.3],
        [-1.75, -0.95],
        [-2.6, 0.0],
        [-2.2, -1.1],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.018, z]} scale={[1, 0.6, 1.2]}>
          <sphereGeometry args={[0.03, 10, 8]} />
          <meshStandardMaterial color="#9ca3af" roughness={1} transparent opacity={0.85} />
        </mesh>
      ))}
      <mesh position={[-2.4, 0.012, -0.55]} rotation={[0, 0.6, 0]}>
        <capsuleGeometry args={[0.022, 0.12, 4, 10]} />
        <meshStandardMaterial color="#f472b6" roughness={0.9} />
      </mesh>
      <mesh position={[-2.1, 0.012, 0.0]} rotation={[0, 0.3, 0]}>
        <boxGeometry args={[0.032, 0.02, 0.016]} />
        <meshStandardMaterial color="#ef4444" roughness={0.4} />
      </mesh>
      {/* Under the desk: a crumpled homework ball and a pencil. */}
      <mesh position={[DESK.back - 0.18, 0.03, DESK.kneeNorth + 0.12]}>
        <icosahedronGeometry args={[0.03, 0]} />
        <meshStandardMaterial color="#f5f5f4" roughness={1} flatShading />
      </mesh>
      <mesh position={[DESK.front + 0.3, 0.006, DESK.kneeSouth - 0.12]} rotation={[0, 0.9, Math.PI / 2]}>
        <cylinderGeometry args={[0.005, 0.005, 0.17, 6]} />
        <meshStandardMaterial color="#facc15" roughness={0.6} />
      </mesh>
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
    const s = CAR.length / longest;
    model.scale.setScalar(s);
    model.position.set(-center.x * s, -box.min.y * s, -center.z * s);
  }, [model]);
  return <primitive object={model} />;
}

// ---------------------------------------------------------------------------
// Camera

const _cam = new THREE.Vector3();
const _look = new THREE.Vector3();
const _want = new THREE.Vector3();
const _tmp = new THREE.Vector3();

function insideSomething(p: THREE.Vector3) {
  if (p.x < ROOM.minX || p.x > ROOM.maxX || p.z < ROOM.minZ || p.z > ROOM.maxZ) return true;
  for (const b of BLOCKS) {
    if (p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ && p.y > b.minY && p.y < b.maxY) return true;
  }
  return false;
}

/** Pull the camera in toward the car until it is not inside furniture or a wall. */
function clearShot(from: THREE.Vector3, to: THREE.Vector3, out: THREE.Vector3) {
  out.copy(to);
  for (let i = 0; i < 10 && insideSomething(out); i++) out.lerpVectors(from, to, 1 - (i + 1) / 10);
  return out;
}

function chaseTarget(car: CarState, cam: HwCam, out: THREE.Vector3, look: THREE.Vector3) {
  const fx = Math.cos(car.heading);
  const fz = Math.sin(car.heading);
  const p = car.pos;
  if (car.mode === 'loop' && car.loop) {
    // Watch the loop from the open side, level with the room, never upside down.
    const loop = car.loop;
    const centre = loop.base.clone().addScaledVector(loop.side, loop.shift / 2).addScaledVector(_tmp.set(0, 1, 0), loop.r);
    out.copy(centre).addScaledVector(loop.side, -0.75).addScaledVector(loop.dir, -0.15);
    out.y = centre.y + 0.08;
    look.copy(p).lerp(centre, 0.35);
    return;
  }
  // Under the bed or the desk you can't see the car from above: drop to the chase view.
  const covered = ceilingAt(p.x, p.z, p.y + CAR.height) - p.y < 0.7;
  if (cam === 'birdseye' && !covered) {
    out.set(p.x - fx * 0.45, p.y + 1.25, p.z - fz * 0.45);
    out.y = Math.min(out.y, 3.05);
    look.set(p.x + fx * 0.15, p.y, p.z + fz * 0.15);
    return;
  }
  // Low roof (under the bed): tuck the camera in close.
  const roof = Math.min(ceilingAt(p.x, p.z, p.y + CAR.height), ceilingAt(p.x - fx * 0.2, p.z - fz * 0.2, p.y + CAR.height));
  const tight = roof - p.y < 0.25;
  const back = tight ? 0.2 : 0.36;
  // Under the bed the slats sit about 3cm over the roof: stay below them.
  const rise = tight ? Math.max(0.03, Math.min(0.07, roof - p.y - 0.018)) : 0.13;
  out.set(p.x - fx * back, p.y + rise, p.z - fz * back);
  if (!tight) {
    // Also stay under anything overhead behind the car (desk top, chair seat).
    const over = ceilingAt(out.x, out.z, p.y + 0.01);
    if (over - p.y < rise + 0.02) out.y = Math.max(p.y + 0.03, over - 0.015);
  }
  look.set(p.x + fx * 0.14, p.y + (tight ? 0.025 : 0.04), p.z + fz * 0.14);
}

// ---------------------------------------------------------------------------

/**
 * Shrunk down to 1:64. Drive anywhere in the room; the orange plastic is the
 * race. The camera never rolls with the car, so loops don't flip the room.
 */
export function HotWheelsWorld({ spot, skipCountdown }: { spot: string | null; skipCountdown: boolean }) {
  const { camera, size } = useThree();
  const start = useMemo(() => spotPose(spot), [spot]);
  const car = useRef<CarState>(newCar(start.p, start.heading));
  const body = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const head = useRef<THREE.SpotLight>(null);
  const headTarget = useRef<THREE.Object3D>(null);
  const keys = useRef<Record<string, boolean>>({});
  const saved = useRef<{ near: number; fov: number } | null>(null);
  const camReady = useRef(false);
  const prevPos = useRef(start.p.clone());
  const lastEmit = useRef(0);

  useLayoutEffect(() => {
    if (head.current && headTarget.current) head.current.target = headTarget.current;
  }, []);

  useEffect(() => {
    const life = openMiniGame('hotwheels');
    return () => life.close();
  }, []);

  useEffect(() => {
    hwRace.phase = skipCountdown ? 'racing' : 'countdown';
    hwRace.countdown = 3;
    hwRace.lap = 1;
    hwRace.time = 0;
    hwRace.best = readBest();
    hwRace.result = null;
    hwRace.timedOut = false;
    hwRace.visited = new Set();
    hwRace.zone = null;
    hwRace.cam = 'chase';
    hwRace.banner = null;
    hwRace.quip = null;
    emit();
    startMotor();
    if (skipCountdown) return;
    raceSfx.count(3);
    let left = 3;
    const timer = window.setInterval(() => {
      left -= 1;
      hwRace.countdown = left;
      raceSfx.count(left);
      if (left <= 0) {
        hwRace.phase = 'racing';
        banner('GO!', `${LAPS} laps · under the bed and over the desk`, 1.6);
        window.clearInterval(timer);
      }
      emit();
    }, 750);
    return () => window.clearInterval(timer);
  }, [skipCountdown]);

  useEffect(() => {
    const typing = (e: KeyboardEvent) => Boolean((e.target as HTMLElement | null)?.closest('input, textarea, select'));
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      wakeRaceAudio();
      keys.current[e.code] = true;
      if (e.code === 'KeyC' || e.code === 'KeyV') cycleCam();
      if (e.code === 'KeyR') resetCar();
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    hwControls.reset = resetCar;
    hwControls.roam = goRoam;
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      hwControls.reset = null;
      hwControls.roam = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetCar() {
    const s = startPose();
    placeCar(car.current, s.p, s.heading);
    prevPos.current.copy(s.p);
    banner('Back to the start', undefined, 1.2);
  }

  function goRoam() {
    if (hwRace.phase === 'roam') return;
    hwRace.phase = 'roam';
    hwRace.timedOut = false;
    banner('Free roam', 'Drive through the finish line to race again', 3);
    emit();
  }

  function startRace() {
    hwRace.phase = 'racing';
    hwRace.lap = 1;
    hwRace.time = 0;
    hwRace.visited = new Set();
    hwRace.result = null;
    hwRace.timedOut = false;
    refillNitro(car.current);
    raceSfx.lap();
    banner('GO!', `${LAPS} laps · under the bed and over the desk`, 1.6);
  }

  function crossedFinish(from: THREE.Vector3, to: THREE.Vector3) {
    const t = FINISH.tangent;
    const a = (from.x - FINISH.p.x) * t.x + (from.z - FINISH.p.z) * t.z;
    const b = (to.x - FINISH.p.x) * t.x + (to.z - FINISH.p.z) * t.z;
    if (!(a < 0 && b >= 0)) return false;
    const lat = (to.x - FINISH.p.x) * FINISH.right.x + (to.z - FINISH.p.z) * FINISH.right.z;
    return Math.abs(lat) < FINISH.half && to.y < 0.2;
  }

  useFrame((_, rawDt) => {
    // A bad frame must never take the whole room down with it.
    try {
      frame(rawDt);
    } catch (err) {
      console.error('[hotwheels] frame failed, putting the car back', err);
      resetCar();
    }
  });

  function frame(rawDt: number) {
    const dt = Math.min(rawDt, 0.05);
    const c = car.current;
    const k = keys.current;
    const gas = k.KeyW || k.ArrowUp || touchDrive.gas || pad.y > 0.3;
    const brake = k.KeyS || k.ArrowDown || touchDrive.brake || pad.y < -0.3;
    const left = k.KeyA || k.ArrowLeft || touchDrive.left || pad.x < -0.3;
    const right = k.KeyD || k.ArrowRight || touchDrive.right || pad.x > 0.3;
    const held = hwRace.phase === 'countdown';
    const input = {
      throttle: held ? 0 : (gas ? 1 : 0) - (brake ? 1 : 0),
      steer: (right ? 1 : 0) - (left ? 1 : 0),
      nitro: !held && Boolean(k.Space || k.ShiftLeft || touchDrive.nitro),
    };

    prevPos.current.copy(c.pos);
    const events = stepCar(c, input, dt);
    for (const e of events) {
      if (e === 'boost') raceSfx.boost();
      else if (e === 'nitro') raceSfx.nitro();
      else if (e === 'nitro-pickup') raceSfx.pickup();
      else if (e === 'loop') raceSfx.loop();
      else if (e === 'launch') raceSfx.launch();
      else if (e === 'land') raceSfx.land();
      else if (e === 'bump') raceSfx.bump();
    }
    // Fell out of the world somehow: put it back.
    if (c.pos.y < -0.2 || !Number.isFinite(c.pos.x)) resetCar();
    motorSpeed(c.speed, c.mode === 'air');

    const zone = c.mode === 'loop' ? null : zoneAt(c.pos.x, c.pos.y, c.pos.z)?.id ?? null;
    if (zone !== hwRace.zone) {
      hwRace.zone = zone;
      raceSfx.zone(zone);
    }
    tickCarQuip(dt, c.pos.x, c.pos.y, c.pos.z);

    if (hwRace.phase === 'racing') {
      hwRace.time += dt;
      if (zone && CHECKPOINTS.some(cp => cp.id === zone) && !hwRace.visited.has(zone)) {
        hwRace.visited.add(zone);
        raceSfx.checkpoint();
      }
      if (crossedFinish(prevPos.current, c.pos)) {
        const missed = CHECKPOINTS.filter(cp => !hwRace.visited.has(cp.id));
        if (missed.length) {
          banner('Lap not counted', `You still need: ${missed.map(m => m.label.toLowerCase()).join(' and ')}`);
        } else if (hwRace.lap >= LAPS) {
          const best = hwRace.best === null || hwRace.time < hwRace.best;
          if (best) {
            hwRace.best = hwRace.time;
            saveBest(hwRace.time);
          }
          hwRace.result = { time: hwRace.time, best };
          hwRace.phase = 'roam';
          raceSfx.finish();
          banner(best ? 'New best!' : 'Finished!', `${formatRaceTime(hwRace.time)} · free roam until you cross the line again`, 4);
        } else {
          hwRace.lap += 1;
          hwRace.visited = new Set();
          refillNitro(c);
          raceSfx.lap();
          banner(hwRace.lap === LAPS ? 'Final lap' : `Lap ${hwRace.lap}`, undefined, 1.4);
        }
      }
      if (hwRace.phase === 'racing' && hwRace.time >= RACE_LIMIT) {
        hwRace.phase = 'roam';
        hwRace.timedOut = true;
        raceSfx.timeUp();
        banner("Time's up", 'Free roam now. Drive back through the finish line to race again', 4);
      }
    } else if (hwRace.phase === 'roam' && crossedFinish(prevPos.current, c.pos)) {
      startRace();
    }

    // Draw the car.
    const node = body.current;
    if (node) {
      node.position.copy(c.pos);
      node.quaternion.copy(c.quat);
    }
    const sh = shadow.current;
    if (sh) {
      const g = c.mode === 'loop' ? null : groundAt(c.pos.x, c.pos.z, c.pos.y + 0.01);
      sh.visible = Boolean(g);
      if (g) {
        sh.position.set(c.pos.x, g.y + 0.003, c.pos.z);
        const h = c.pos.y - g.y;
        sh.scale.setScalar(1 + h * 1.5);
        (sh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.12, 0.5 - h * 0.8);
      }
    }

    // Camera.
    const persp = camera as THREE.PerspectiveCamera;
    if (!saved.current) saved.current = { near: persp.near, fov: persp.fov };
    const mode = hwRace.cam;
    if (mode === 'hood' && c.mode !== 'loop') {
      const fwd = _tmp.set(0, 0, 1).applyQuaternion(c.quat);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(c.quat);
      camera.position.copy(c.pos).addScaledVector(up, 0.032).addScaledVector(fwd, 0.01);
      camera.up.set(0, 1, 0);
      _look.copy(camera.position).addScaledVector(fwd, 1);
      camera.lookAt(_look);
      camReady.current = false;
    } else {
      chaseTarget(c, mode, _want, _look);
      clearShot(_look, _want, _want);
      const a = camReady.current ? 1 - Math.exp(-dt * (c.mode === 'loop' ? 3.5 : 7)) : 1;
      _cam.lerp(_want, a);
      if (!camReady.current) _cam.copy(_want);
      camReady.current = true;
      camera.position.copy(_cam);
      camera.up.set(0, 1, 0);
      camera.lookAt(_look);
    }
    const near = mode === 'birdseye' ? 0.03 : 0.006;
    const fov = fitFov(mode === 'hood' ? 80 : 70, size.width / Math.max(1, size.height), 1.5, 100);
    if (persp.near !== near || Math.abs(persp.fov - fov) > 0.1) {
      persp.near = near;
      persp.fov = fov;
      persp.updateProjectionMatrix();
    }

    hwRace.speed = c.speed;
    hwRace.nitroCans = c.nitroCans;
    hwRace.nitro = c.nitroLeft / TUNING.nitroTime;
    hwRace.airborne = c.mode === 'air' && c.airTime > 0.12;
    hwRace.looping = c.mode === 'loop';
    const now = performance.now();
    if (now - lastEmit.current > 66) {
      lastEmit.current = now;
      if (hwRace.banner && now > hwRace.banner.until) hwRace.banner = null;
      emit();
    }
  }

  useEffect(() => {
    return () => {
      stopRaceAudio();
      camera.up.set(0, 1, 0);
      const persp = camera as THREE.PerspectiveCamera;
      if (saved.current) {
        persp.near = saved.current.near;
        persp.fov = saved.current.fov;
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
      {PIECES.map(pc => (
        <Strip key={pc.id} frames={pc.frames} half={pc.half} railed={pc.railed} />
      ))}
      {LOOPS.map(l => (
        <group key={l.id}>
          <Strip frames={l.frames} half={0.085} railed />
          <LoopStand loop={l} />
        </group>
      ))}
      <Supports />
      {BOOSTERS.map((b, i) => (
        <Booster key={i} b={b} />
      ))}
      <FinishLine />
      <NitroCans car={car} />
      <HidingPlaces />
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.055, 20]} />
        <meshBasicMaterial color="#000" transparent opacity={0.45} depthWrite={false} />
      </mesh>
      <group ref={body}>
        <Suspense
          fallback={
            <mesh position={[0, 0.015, 0]}>
              <boxGeometry args={[0.05, 0.03, 0.12]} />
              <meshStandardMaterial color="#ef4444" />
            </mesh>
          }
        >
          <Racer />
        </Suspense>
        <object3D ref={headTarget} position={[0, 0.02, 0.9]} />
        <spotLight ref={head} position={[0, 0.03, 0.06]} angle={0.6} penumbra={0.5} intensity={2.6} distance={1.6} color="#fff4dc" />
      </group>
      <pointLight position={[0.2, 1.6, 0.2]} intensity={0.45} distance={7} color="#fff4e5" />
    </group>
  );
}

useGLTF.preload('/models/hw-racer.glb');

/** Buttons in the HUD reach into the running world through this. */
const hwControls = {
  reset: null as null | (() => void),
  roam: null as null | (() => void),
};

export function formatRaceTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const rest = seconds - m * 60;
  return `${m}:${rest.toFixed(2).padStart(5, '0')}`;
}

const CAM_LABEL: Record<HwCam, string> = {
  chase: 'Third person',
  hood: 'First person',
  birdseye: "Bird's-eye",
};

const ZONE_LOOK: Partial<Record<ZoneId, { label: string; dark: number; tint: string }>> = {
  bed: { label: 'Under the bed', dark: 0.72, tint: '20,10,30' },
  'desk-under': { label: 'Under the desk', dark: 0.5, tint: '30,18,8' },
  'desk-top': { label: 'On the desk', dark: 0, tint: '0,0,0' },
};

function HoldButton({ label, onHold, className }: { label: string; onHold: (on: boolean) => void; className: string }) {
  return (
    <button
      type="button"
      className={`pointer-events-auto select-none touch-none rounded-2xl border border-white/25 bg-black/55 text-sm font-black uppercase text-white active:bg-orange-500/70 ${className}`}
      onPointerDown={e => {
        e.preventDefault();
        wakeRaceAudio();
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

export function HotWheelsHud({ onExit }: { onExit: () => void }) {
  const race = useHwRace();
  const [touch] = useState(isTouchDevice);
  const look = race.zone ? ZONE_LOOK[race.zone] : undefined;
  const left = Math.max(0, RACE_LIMIT - race.time);
  const racing = race.phase === 'racing';
  return (
    <div data-hw-race className="pointer-events-none absolute inset-0 z-40 text-white">
      {/* The dark of the hiding places, with the headlights' patch left bright. */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          opacity: look && look.dark > 0 ? 1 : 0,
          background: look
            ? `radial-gradient(ellipse 34% 30% at 50% 62%, rgba(${look.tint},${look.dark * 0.25}) 0%, rgba(${look.tint},${look.dark}) 70%, rgba(0,0,0,${Math.min(0.92, look.dark + 0.15)}) 100%)`
            : undefined,
        }}
      />
      {look && (
        <div className="absolute left-1/2 top-16 -translate-x-1/2 rounded-full border border-orange-300/50 bg-black/70 px-5 py-2 text-center shadow-lg">
          <p className="text-[13px] font-black uppercase tracking-[0.28em] text-orange-200">{look.label}</p>
          {racing && CHECKPOINTS.some(cp => cp.id === race.zone) && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-lime-300">Checkpoint ✓</p>
          )}
        </div>
      )}

      {race.quip && <SpeechBubble bubble={{ x: 0.5, y: 0.56, who: 'You, the car', text: race.quip.text }} tone="thought" />}

      <div className="pointer-events-auto absolute left-4 top-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onExit} className="rounded-xl bg-amber-400 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-black">
          Stand up
        </button>
        <button type="button" onClick={cycleCam} className="rounded-xl border border-white/25 bg-black/55 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-100">
          {CAM_LABEL[race.cam]}
        </button>
        {racing && (
          <button type="button" onClick={() => hwControls.roam?.()} className="rounded-xl border border-white/25 bg-black/55 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/85">
            Free roam
          </button>
        )}
        <button type="button" onClick={() => hwControls.reset?.()} className="rounded-xl border border-white/25 bg-black/55 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white/85">
          Reset car
        </button>
      </div>

      <div className="absolute right-4 top-4 rounded-2xl border border-orange-300/30 bg-black/55 px-4 py-2 text-right">
        {race.phase === 'roam' ? (
          <>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Free roam</p>
            {race.result && <p className="font-mono text-xl font-black tabular-nums">{formatRaceTime(race.result.time)}</p>}
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Best {race.best === null ? '—' : formatRaceTime(race.best)}</p>
            <p className="mt-1 max-w-[170px] text-[10px] leading-tight text-white/70">Cross the finish line to race again</p>
          </>
        ) : (
          <>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-200">
              Lap {Math.min(race.lap, LAPS)}/{LAPS}
            </p>
            <p className="font-mono text-2xl font-black tabular-nums">{formatRaceTime(race.time)}</p>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${left < 20 ? 'text-red-300' : 'text-white/70'}`}>
              {Math.ceil(left)}s left · Best {race.best === null ? '—' : formatRaceTime(race.best)}
            </p>
            <div className="mt-1 flex justify-end gap-1">
              {CHECKPOINTS.map(cp => (
                <span
                  key={cp.id}
                  className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${race.visited.has(cp.id) ? 'bg-lime-400 text-black' : 'bg-white/10 text-white/60'}`}
                >
                  {cp.id === 'bed' ? 'Bed' : 'Desk'}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {race.banner && (
        <div className="absolute left-1/2 top-[30%] -translate-x-1/2 text-center">
          <p className="text-5xl font-black italic text-orange-400 drop-shadow-[0_3px_0_rgba(0,0,0,0.7)]">{race.banner.text}</p>
          {race.banner.sub && <p className="mt-2 rounded-full bg-black/60 px-4 py-1 text-sm font-bold text-white/90">{race.banner.sub}</p>}
        </div>
      )}
      {race.phase === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-8xl font-black text-amber-300 drop-shadow">{race.countdown > 0 ? race.countdown : 'GO'}</p>
        </div>
      )}
      {race.looping && (
        <p className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-black">
          Loop!
        </p>
      )}

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        <div className="flex items-center gap-3 rounded-full bg-black/60 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider">
          <span className="font-mono tabular-nums text-orange-200">{Math.round(Math.abs(race.speed) * 100)} cm/s</span>
          <span className="text-cyan-200">Nitro {race.nitroCans}</span>
          <span className="h-1.5 w-14 overflow-hidden rounded-full bg-white/15">
            <span className="block h-full bg-cyan-300" style={{ width: `${Math.round(race.nitro * 100)}%` }} />
          </span>
          {!touch && <span className="text-white/65">WASD drive · Space nitro · C camera · R reset</span>}
        </div>
      </div>

      {touch && (
        <>
          <div className="absolute bottom-6 left-4 flex gap-3">
            <HoldButton label="◀" className="h-16 w-16" onHold={on => (touchDrive.left = on)} />
            <HoldButton label="▶" className="h-16 w-16" onHold={on => (touchDrive.right = on)} />
          </div>
          <div className="absolute bottom-6 right-4 flex items-end gap-3">
            <HoldButton label="N₂O" className="h-12 w-12 text-cyan-200" onHold={on => (touchDrive.nitro = on)} />
            <HoldButton label="Brake" className="h-14 w-16 text-[11px]" onHold={on => (touchDrive.brake = on)} />
            <HoldButton label="Gas" className="h-20 w-20" onHold={on => (touchDrive.gas = on)} />
          </div>
        </>
      )}
    </div>
  );
}
