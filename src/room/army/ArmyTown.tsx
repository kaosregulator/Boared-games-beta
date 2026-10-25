import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { fitFov, isTouchDevice } from '../input';
import { walkRig } from '../WalkController';
import { ArmyProps, GREEN, TAN, plastic } from './ArmyProps';
import { ToyHelicopter, type HeliParts } from './Helicopter';
import { NO_INPUT, heliForward, newHeli, placeHeli, stepHeli, type HeliInput, type HeliState } from './flight';
import { RINGS, throughRing } from './rings';
import {
  FOXHOLES,
  GUARDS,
  HELIPAD,
  MAN_HEIGHT,
  MAN_RADIUS,
  MAT,
  MAT_TOP,
  PARADE,
  PATROLS,
  PLAYER_START,
  TOWER,
  TOWER_GUARD,
  floorAt,
  insideAny,
  invaderSpawn,
  pushOut,
} from './town';
import { armySfx, rotorLevel, rotorOff, rotorOn, wakeArmyAudio } from './armyAudio';
import { SHOT_RANGE, chestPoint, muzzlePoint, pickAlongBarrel, shotPoint } from './aim';
import { COACH_NAME, COACH_REACH, COACH_SPOT, coachLesson, lineSeconds, nextLine, type Coach } from './tutorial';
import { readArmyKeys, stepLook } from './armyKeys';
import { SpeechBubble, headOnScreen, type Bubble } from './SpeechBubble';
import {
  STORY_WAVES,
  TAN_POOL,
  betweenWaves,
  invaderAim,
  invaderMarch,
  invaderRange,
  storyOver,
  waveSize,
  type Siege,
} from './waves';
import { openMiniGame } from '../../engine/lifecycle';
import { SniperMission } from './sniper/SniperMission';
import { SniperHud, SquadPrompt } from './sniper/SniperHud';
import { sniper, sniperBusy, sniperControls, useSniper } from './sniper/state';

/**
 * Shrunk down to army-man size on the bedroom floor. The town is set up on
 * the road rug, the green army keeps it running (patrols, a drill squad,
 * guards, a lookout on the tower), and the tan army attacks in waves from
 * behind the books. Walk around as one of the green guys, or take the
 * helicopter off the pad: fly the ring course round the room, or just fly.
 */

const MODEL_URL = '/models/army-man.glb';
/** The soldier mesh faces -z; turn it so +z (our forward) is its front. */
const MODEL_YAW = Math.PI;
const BEST_KEY = 'army-rings-best';

export type ArmyCam = 'chase' | 'first' | 'birdseye';
type Mode = 'ground' | 'heli';
type WaveState = 'incoming' | 'attack' | 'cleared' | 'won';

export const army = {
  mode: 'ground' as Mode,
  cam: 'chase' as ArmyCam,
  wave: 0,
  waveState: 'incoming' as WaveState,
  siege: 'story' as Siege,
  /** Sergeant Green: waits glowing until you talk to him. Null on a calm or helicopter boot. */
  coach: null as Coach | null,
  /** Which line of his lesson is up. */
  coachLine: 0,
  /** True while you're close enough to talk to him. */
  coachNear: false,
  /** Speech bubble over his head, in screen space. */
  bubble: null as Bubble | null,
  invadersLeft: 0,
  toppled: 0,
  nearChopper: false,
  playerDown: false,
  heliGrounded: true,
  heliHigh: false,
  heliSpeed: 0,
  heliAlt: 0,
  course: { active: false, next: 0, time: 0, best: null as number | null, last: null as null | { time: number; best: boolean } },
  banner: null as null | { text: string; sub?: string; until: number },
  listeners: new Set<() => void>(),
};

function emit() {
  army.listeners.forEach(fn => fn());
}

function banner(text: string, sub?: string, seconds = 2.6) {
  army.banner = { text, sub, until: performance.now() + seconds * 1000 };
  emit();
}

export function useArmy() {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump(n => n + 1);
    army.listeners.add(fn);
    return () => {
      army.listeners.delete(fn);
    };
  }, []);
  return army;
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
    // shown for this visit anyway
  }
}

const CAM_ORDER: ArmyCam[] = ['chase', 'first', 'birdseye'];
function cycleCam() {
  army.cam = CAM_ORDER[(CAM_ORDER.indexOf(army.cam) + 1) % CAM_ORDER.length];
  emit();
}

/** Held on-screen buttons on a phone, and the HUD's one-shot actions. */
const touch = { fwd: false, back: false, left: false, right: false, up: false, down: false, fire: false };
const controls = {
  board: null as null | (() => void),
  againWaves: null as null | (() => void),
  endSiege: null as null | (() => void),
  startSiege: null as null | ((level: Exclude<Siege, 'story'>) => void),
  resetHeli: null as null | (() => void),
  quitCourse: null as null | (() => void),
  /** F, or a tap on a bubble: talk to whoever's close, else the chopper. */
  interact: null as null | (() => void),
  skipCoach: null as null | (() => void),
};

// ---------------------------------------------------------------------------
// Soldiers

type Clip = 'Idle' | 'Walk' | 'Run';
type Role = 'player' | 'guard' | 'tower' | 'patrol' | 'drill' | 'defender' | 'invader';

interface Man {
  root: THREE.Group;
  tip: THREE.Group;
  model: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  actions: Record<Clip, THREE.AnimationAction>;
  clip: Clip;
  team: 'green' | 'tan';
  role: Role;
  pos: THREE.Vector3;
  heading: number;
  speed: number;
  /** Where it goes when the town is quiet. */
  route: [number, number][];
  wp: number;
  /** Drill: which way along the parade line, and how long to stand at the end. */
  pause: number;
  slot: number;
  home: [number, number, number];
  active: boolean;
  /** 0 standing, 1 flat on its back. */
  fall: number;
  falling: boolean;
  downFor: number;
  cooldown: number;
  hitChance: number;
  range: number;
  /** How fast an invader walks. Story leaves this at 0.08. */
  march: number;
  /** The one green soldier who walks over and explains the controls. */
  guide: boolean;
}

interface Kit {
  src: THREE.Object3D;
  clips: THREE.AnimationClip[];
  scale: number;
  lift: number;
}

function useKit(): Kit {
  const gltf = useGLTF(MODEL_URL);
  return useMemo(() => {
    const src = gltf.scene;
    src.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(src, true);
    const h = Math.max(0.001, box.max.y - box.min.y);
    const scale = MAN_HEIGHT / h;
    return { src, clips: gltf.animations, scale, lift: -box.min.y * scale };
  }, [gltf]);
}

const blobGeo = new THREE.CircleGeometry(0.013, 14);
blobGeo.rotateX(-Math.PI / 2);
const blobMat = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.32, depthWrite: false });
const baseGeo = new THREE.CylinderGeometry(0.012, 0.013, 0.003, 14);

function makeMan(kit: Kit, team: Man['team'], role: Role, mat: THREE.Material, withBase: boolean): Man {
  const model = cloneSkinned(kit.src);
  model.traverse(o => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.material = mat;
      m.castShadow = false;
      m.receiveShadow = false;
      // Skinned bounds lag the animation at this size: never cull the little guys.
      m.frustumCulled = false;
    }
  });
  model.scale.setScalar(kit.scale);
  model.position.y = kit.lift + MAT_TOP + (withBase ? 0.003 : 0);
  model.rotation.y = MODEL_YAW;
  const tip = new THREE.Group();
  tip.add(model);
  if (withBase) {
    const base = new THREE.Mesh(baseGeo, mat);
    base.position.y = MAT_TOP + 0.0015;
    tip.add(base);
  }
  const root = new THREE.Group();
  root.add(tip);
  const blob = new THREE.Mesh(blobGeo, blobMat);
  blob.position.y = MAT_TOP + 0.0006;
  blob.renderOrder = 1;
  root.add(blob);
  const mixer = new THREE.AnimationMixer(model);
  const clip = (name: Clip) => {
    const c = kit.clips.find(a => a.name === name) ?? kit.clips[0];
    return mixer.clipAction(c);
  };
  const actions = { Idle: clip('Idle'), Walk: clip('Walk'), Run: clip('Run') };
  actions.Idle.play();
  // Don't let a crowd breathe in sync.
  mixer.setTime(Math.random() * 3);
  return {
    root,
    tip,
    model,
    mixer,
    actions,
    clip: 'Idle',
    team,
    role,
    pos: root.position,
    heading: 0,
    speed: 0,
    route: [],
    wp: 0,
    pause: 0,
    slot: 0,
    home: [0, 0, 0],
    active: true,
    fall: 0,
    falling: false,
    downFor: 0,
    cooldown: 1 + Math.random() * 2,
    hitChance: team === 'green' ? 0.32 : 0.24,
    range: 0.5,
    march: 0.08,
    guide: false,
  };
}

function setClip(m: Man, clip: Clip, fade = 0.2) {
  if (m.clip === clip) return;
  const prev = m.actions[m.clip];
  const next = m.actions[clip];
  next.reset().setEffectiveWeight(1).fadeIn(fade).play();
  prev.fadeOut(fade);
  m.clip = clip;
}

/** Walk cycles were made for a full-size man: speed them to match our pace. */
function clipFor(speed: number): { clip: Clip; scale: number } {
  if (speed < 0.012) return { clip: 'Idle', scale: 1 };
  const walk = MAN_HEIGHT * 1.0;
  const run = MAN_HEIGHT * 2.8;
  if (speed < walk * 1.7) return { clip: 'Walk', scale: Math.max(0.6, speed / walk) };
  return { clip: 'Run', scale: Math.max(0.7, speed / run) };
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function turnToward(m: Man, want: number, rate: number, dt: number) {
  const d = wrap(want - m.heading);
  const step = Math.min(Math.abs(d), rate * dt);
  m.heading = wrap(m.heading + Math.sign(d) * step);
  return Math.abs(d);
}

/** Head for (x, z). Returns the distance left. */
function walkTo(m: Man, x: number, z: number, speed: number, dt: number) {
  const dx = x - m.pos.x;
  const dz = z - m.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.006) {
    m.speed += (0 - m.speed) * Math.min(1, dt * 10);
    return dist;
  }
  const off = turnToward(m, Math.atan2(dx, dz), 7, dt);
  const want = off > 1.2 ? speed * 0.25 : Math.min(speed, dist * 4 + 0.02);
  m.speed += (want - m.speed) * Math.min(1, dt * 8);
  return dist;
}

function knockDown(m: Man) {
  if (m.falling || m.fall > 0) return;
  m.falling = true;
  m.downFor = 0;
  m.speed = 0;
}

// ---------------------------------------------------------------------------
// Rings

const ringGeo = new THREE.TorusGeometry(1, 0.06, 10, 40);

function RingGate({ index, course }: { index: number; course: typeof army.course }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffb020', emissive: '#ff8a00', emissiveIntensity: 0.6, roughness: 0.35 }), []);
  const r = RINGS[index];
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), r.n), [r]);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    // Out of the way of the scope and the bullet cam.
    m.visible = !sniperBusy();
    const isNext = course.next === index;
    const passed = course.active && index < course.next;
    const s = r.r * (isNext ? 1 + Math.sin(clock.elapsedTime * 6) * 0.04 : 1);
    m.scale.set(s, s, r.r * 1.6);
    mat.color.set(isNext ? '#ffe14a' : passed ? '#7bd389' : '#ff9a2e');
    mat.emissive.set(isNext ? '#ffbf00' : passed ? '#1f7a3a' : '#c25a00');
    mat.emissiveIntensity = isNext ? 1.1 : passed ? 0.25 : 0.4;
    mat.opacity = passed ? 0.45 : 1;
    mat.transparent = passed;
  });
  return <mesh ref={ref} geometry={ringGeo} material={mat} position={r.p} quaternion={quat} />;
}

/** A floating arrow just ahead of the helicopter, pointing to the next ring. */
function GuideArrow({ heli, course }: { heli: React.MutableRefObject<HeliState>; course: typeof army.course }) {
  const ref = useRef<THREE.Group>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const h = heli.current;
    const ring = RINGS[course.next];
    g.visible = army.mode === 'heli' && Boolean(ring) && army.cam !== 'first';
    if (!g.visible) return;
    const f = heliForward(h.yaw, tmp);
    g.position.set(h.pos.x + f.x * 0.12, h.pos.y + 0.12, h.pos.z + f.z * 0.12);
    g.lookAt(ring.p);
  });
  return (
    <group ref={ref}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.012]}>
        <coneGeometry args={[0.012, 0.03, 10]} />
        <meshBasicMaterial color="#ffe14a" />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Tracers: the pop of a cap gun, drawn as a quick yellow streak.

const MAX_TRACERS = 24;

function useTracers() {
  return useMemo(() => {
    const pos = new Float32Array(MAX_TRACERS * 6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({ color: '#ffe680', transparent: true, opacity: 0.95 });
    const lines = new THREE.LineSegments(geo, mat);
    lines.frustumCulled = false;
    const life = new Float32Array(MAX_TRACERS);
    let next = 0;
    return {
      lines,
      fire(a: THREE.Vector3, b: THREE.Vector3) {
        pos.set([a.x, a.y, a.z, b.x, b.y, b.z], next * 6);
        // Long enough to see the streak. 0.07 s was gone in a single slow frame.
        life[next] = 0.16;
        next = (next + 1) % MAX_TRACERS;
        geo.attributes.position.needsUpdate = true;
      },
      tick(dt: number) {
        let dirty = false;
        for (let i = 0; i < MAX_TRACERS; i++) {
          if (life[i] <= 0) continue;
          life[i] -= dt;
          if (life[i] <= 0) {
            pos.fill(0, i * 6, i * 6 + 6);
            dirty = true;
          }
        }
        if (dirty) geo.attributes.position.needsUpdate = true;
      },
    };
  }, []);
}

// ---------------------------------------------------------------------------

export interface ArmyBoot {
  mode: Mode | null;
  /** Put the helicopter just before ring N. */
  ring: number | null;
  cam: ArmyCam | null;
  calm: boolean;
}

export function readArmyBoot(): ArmyBoot | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  if (q.get('army') === null) return null;
  const ring = q.get('ring');
  const cam = q.get('armyCam');
  return {
    mode: q.get('army') === 'heli' ? 'heli' : 'ground',
    ring: ring === null ? null : Number(ring),
    cam: cam === 'chase' || cam === 'first' || cam === 'birdseye' ? cam : null,
    calm: q.get('calm') === '1',
  };
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _want = new THREE.Vector3();
const _look = new THREE.Vector3();
const _cam = new THREE.Vector3();
const _camLook = new THREE.Vector3();
const _prev = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

function clearShot(from: THREE.Vector3, to: THREE.Vector3) {
  for (let i = 0; i < 12 && insideAny(to, 0.008); i++) to.lerpVectors(to, from, 0.25);
  return to;
}

function Crowd({ boot }: { boot: ArmyBoot | null }) {
  const kit = useKit();
  const { camera, size, gl } = useThree();
  const group = useRef<THREE.Group>(null);
  const heliGroup = useRef<THREE.Group>(null);
  const heliParts = useRef<HeliParts>({ main: null, tail: null });
  const heliShadow = useRef<THREE.Mesh>(null);
  const tracers = useTracers();
  const keys = useRef<Record<string, boolean>>({});
  const drag = useRef({ on: false, x: 0, acc: 0 });
  const saved = useRef<{ near: number; fov: number } | null>(null);
  const intro = useRef({ t: boot ? 1 : 0, from: camera.position.clone(), look: new THREE.Vector3() });
  const camYaw = useRef(Math.PI);
  /** Up/down arrows tilt the view, in every camera. Radians, + looks up. */
  const lookPitch = useRef(0);
  const camReady = useRef(false);
  const lastEmit = useRef(0);
  const waveTimer = useRef(boot?.calm ? Infinity : 3.2);

  const greenMat = useMemo(() => plastic(GREEN), []);
  const playerMat = useMemo(() => plastic('#5f9c2f'), []);
  const tanMat = useMemo(() => plastic(TAN), []);

  const heli = useRef<HeliState>(newHeli(HELIPAD.x, 0, HELIPAD.z, Math.PI));

  const men = useMemo(() => {
    const list: Man[] = [];
    const player = makeMan(kit, 'green', 'player', playerMat, false);
    player.pos.set(PLAYER_START.x, 0, PLAYER_START.z);
    player.heading = Math.PI;
    list.push(player);
    for (const [x, z, f] of GUARDS) {
      const g = makeMan(kit, 'green', 'guard', greenMat, true);
      g.pos.set(x, 0, z);
      g.heading = f;
      g.home = [x, z, f];
      g.range = 0.45;
      list.push(g);
    }
    {
      const [x, z, f] = TOWER_GUARD;
      const g = makeMan(kit, 'green', 'tower', greenMat, true);
      g.pos.set(x, TOWER.h, z);
      g.heading = Math.PI + f;
      g.home = [x, z, Math.PI + f];
      g.range = 0.75;
      g.hitChance = 0.4;
      list.push(g);
    }
    // Two patrol loops (two men each, half a lap apart), and the north line patrol who defend.
    PATROLS.forEach((route, r) => {
      const n = r === 2 ? 4 : 2;
      for (let i = 0; i < n; i++) {
        const role: Role = r === 2 ? 'defender' : 'patrol';
        const m = makeMan(kit, 'green', role, greenMat, false);
        m.route = route;
        m.wp = Math.floor((i * route.length) / n);
        const [x, z] = route[m.wp];
        m.pos.set(x + (i % 2) * 0.01, 0, z);
        list.push(m);
      }
    });
    // Drill squad: a rank of five marching the parade ground.
    for (let i = 0; i < 5; i++) {
      const m = makeMan(kit, 'green', 'drill', greenMat, false);
      m.slot = i;
      const dz = (i - 2) * 0.026;
      m.route = PARADE.map(([x, z]) => [x, z + dz] as [number, number]);
      m.wp = 1;
      m.pos.set(PARADE[0][0], 0, PARADE[0][1] + dz);
      m.heading = Math.PI / 2;
      m.guide = i === 0;
      list.push(m);
    }
    // Hand out foxholes to everyone who defends (drill squad and the north patrol).
    let hole = 0;
    for (const m of list) if (m.role === 'drill' || m.role === 'defender') m.slot = hole++ % FOXHOLES.length;
    // The tan army, waiting off stage.
    for (let i = 0; i < TAN_POOL; i++) {
      const t = makeMan(kit, 'tan', 'invader', tanMat, false);
      t.active = false;
      t.root.visible = false;
      t.range = 0.42;
      list.push(t);
    }
    return list;
  }, [kit, greenMat, playerMat, tanMat]);

  const player = men[0];
  const tans = useMemo(() => men.filter(m => m.team === 'tan'), [men]);
  const greens = useMemo(() => men.filter(m => m.team === 'green'), [men]);
  const guide = useMemo(() => men.find(m => m.guide) ?? null, [men]);
  const coachGlow = useRef<THREE.Group>(null);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    for (const m of men) {
      g.add(m.root);
      // A remount (React dev mode does one) stopped the actions: start the current one again.
      m.actions[m.clip].play();
    }
    return () => {
      for (const m of men) {
        g.remove(m.root);
        m.mixer.stopAllAction();
      }
    };
  }, [men]);

  // Start / boot state.
  useEffect(() => {
    army.mode = boot?.mode === 'heli' ? 'heli' : 'ground';
    army.cam = boot?.cam ?? 'chase';
    army.wave = 0;
    army.waveState = 'incoming';
    army.siege = 'story';
    army.coach = boot?.calm || boot?.mode === 'heli' ? null : 'wait';
    army.coachLine = 0;
    army.coachNear = false;
    army.bubble = null;
    if (army.coach && guide) {
      // He waits for you a few steps from where you land, glowing.
      guide.pos.set(COACH_SPOT.x, 0, COACH_SPOT.z);
      guide.heading = Math.atan2(player.pos.x - COACH_SPOT.x, player.pos.z - COACH_SPOT.z);
    }
    army.toppled = 0;
    army.invadersLeft = 0;
    army.course = { active: false, next: 0, time: 0, best: readBest(), last: null };
    army.banner = null;
    if (boot?.ring !== null && boot?.ring !== undefined && RINGS[boot.ring]) {
      const r = RINGS[boot.ring];
      const back = r.p.clone().addScaledVector(r.n, -0.5);
      placeHeli(heli.current, back.x, back.y, back.z, Math.atan2(r.n.x, r.n.z));
      heli.current.grounded = false;
      heli.current.rotor = 1;
      army.course.next = boot.ring;
      army.course.active = boot.ring > 0;
    }
    if (army.mode === 'heli') {
      player.root.visible = false;
      rotorOn();
    }
    if (army.coach) banner("We're under attack!", 'Go talk to the glowing sergeant first', 3.4);
    else if (!boot?.calm) banner("We're under attack!", 'Tan army behind the books by the door. Defend the town!', 3);
    emit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startWave(n: number) {
    const count = waveSize(army.siege, n);
    if (count === null) return;
    army.wave = n;
    army.waveState = 'attack';
    const march = invaderMarch(army.siege, n);
    const aim = invaderAim(army.siege, n);
    const range = invaderRange(army.siege, n);
    tans.forEach((t, i) => {
      t.active = i < count;
      t.root.visible = t.active;
      if (!t.active) return;
      const s = invaderSpawn(i, count);
      t.pos.set(s.x, 0, s.z);
      t.heading = 0;
      t.fall = 0;
      t.falling = false;
      t.tip.rotation.set(0, 0, 0);
      t.tip.position.set(0, 0, 0);
      t.cooldown = 1.5 + Math.random() * 2.5;
      t.route = [[s.x + (Math.random() - 0.5) * 0.08, -0.9 - Math.random() * 0.05]];
      t.speed = 0;
      t.march = march;
      t.hitChance = aim;
      t.range = range;
    });
    army.invadersLeft = count;
    armySfx.wave();
    const label = army.siege === 'story' ? `Wave ${n}` : `${army.siege} · wave ${n}`;
    banner(label, `${count} tan soldiers incoming`, 2.2);
  }

  function startSiege(level: Exclude<Siege, 'story'>) {
    army.siege = level;
    army.coach = 'done';
    army.coachNear = false;
    army.bubble = null;
    army.wave = 0;
    army.waveState = 'incoming';
    waveTimer.current = 2.2;
    army.toppled = 0;
    for (const t of tans) {
      t.active = false;
      t.root.visible = false;
      t.fall = 0;
      t.falling = false;
    }
    const name = level === 'easy' ? 'Easy' : level === 'medium' ? 'Medium' : 'Hard';
    banner(name, 'They keep coming. Clear a wave and the next one steps out.', 2.4);
    emit();
  }

  // --- Sergeant Green ---------------------------------------------------------
  const lesson = useMemo(() => coachLesson(isTouchDevice()), []);
  const coachT = useRef(0);

  function startCoach() {
    if (army.coach !== 'wait' || !army.coachNear) return;
    army.coach = 'talk';
    army.coachLine = 0;
    coachT.current = 0;
    armySfx.radio();
    camReady.current = true;
    emit();
  }

  function nextCoach() {
    if (army.coach !== 'talk') return;
    const n = nextLine(army.coachLine, lesson);
    coachT.current = 0;
    if (n === null) finishCoach();
    else {
      army.coachLine = n;
      emit();
    }
  }

  /** Done talking (or skipped): back to your camera, and the first wave steps out. */
  function finishCoach() {
    if (army.coach === 'done' || army.coach === null) return;
    army.coach = 'done';
    army.bubble = null;
    army.coachNear = false;
    if (army.siege === 'story' && army.wave === 0) {
      waveTimer.current = 2;
      armySfx.alarm();
      banner('Here they come!', 'Get to the sandbags', 2);
    }
    emit();
  }

  /** F: talk to whoever's close, or the chopper. */
  function interact() {
    if (army.mode === 'ground' && army.coach === 'wait' && army.coachNear) return startCoach();
    if (army.coach === 'talk') return nextCoach();
    if (sniper.phase === 'near' && sniperControls.talk) return sniperControls.talk();
    board();
  }

  /** Easy, Medium and Hard never stop on their own: this calls it off and tallies up. */
  function endSiege() {
    if (army.siege === 'story' || army.waveState === 'won') return;
    const reached = army.wave;
    army.waveState = 'won';
    waveTimer.current = 0.01;
    for (const t of tans) {
      t.active = false;
      t.root.visible = false;
      t.fall = 0;
      t.falling = false;
    }
    army.invadersLeft = 0;
    armySfx.victory();
    banner('Ceasefire!', `You held to wave ${reached} and toppled ${army.toppled} tan soldiers`, 3.4);
    emit();
  }

  function againWaves() {
    army.siege = 'story';
    army.wave = 0;
    army.waveState = 'incoming';
    waveTimer.current = 2.5;
    army.toppled = 0;
    for (const t of tans) {
      t.active = false;
      t.root.visible = false;
    }
    armySfx.alarm();
    banner("They're back!", 'Get to the sandbags', 2.4);
  }

  function board() {
    const h = heli.current;
    if (army.mode === 'heli' && sniper.phase === 'near') {
      sniperControls.talk?.();
      return;
    }
    if (army.mode === 'ground') {
      if (!army.nearChopper || player.fall > 0) return;
      army.mode = 'heli';
      player.root.visible = false;
      h.rotor = Math.min(h.rotor, 0.2);
      rotorOn();
      camReady.current = false;
      banner('Chopper ready', 'Space to lift off · fly the rings or just fly', 2.8);
    } else {
      if (!h.grounded) {
        banner('Land first', 'Shift to come down, then F to hop out', 1.8);
        return;
      }
      if (h.pos.y > 0.01) {
        banner('Land on the floor', 'Hop out on the carpet, not up here', 1.8);
        return;
      }
      army.mode = 'ground';
      const f = heliForward(h.yaw);
      player.pos.set(h.pos.x - f.z * 0.08, 0, h.pos.z + f.x * 0.08);
      pushOut(player.pos, MAN_RADIUS * 1.5, 0.005, MAN_HEIGHT);
      player.heading = h.yaw;
      player.root.visible = true;
      rotorOff();
      camReady.current = false;
    }
    emit();
  }

  function resetHeli() {
    placeHeli(heli.current, HELIPAD.x, 0, HELIPAD.z, Math.PI);
    army.course.active = false;
    army.course.next = 0;
    camReady.current = false;
    banner('Back on the pad', undefined, 1.2);
  }

  function quitCourse() {
    army.course.active = false;
    army.course.next = 0;
    banner('Free flight', 'Fly through the first ring to start the course again', 2.4);
  }

  useEffect(() => {
    const typing = (e: KeyboardEvent) => Boolean((e.target as HTMLElement | null)?.closest('input, textarea, select'));
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      // The shelf sniper has the keys from the talk to the walk back.
      if (sniperBusy()) return;
      wakeArmyAudio();
      keys.current[e.code] = true;
      if (e.repeat) return;
      if (e.code === 'KeyC' || e.code === 'KeyV') cycleCam();
      if (e.code === 'KeyF') interact();
      if ((e.code === 'Enter' || e.code === 'Space') && army.coach === 'talk') nextCoach();
      if (e.code === 'KeyR' && army.mode === 'heli') resetHeli();
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const blur = () => {
      keys.current = {};
    };
    // Drag on the room to turn (mouse or finger); buttons stay buttons.
    const pDown = (e: PointerEvent) => {
      if (!(e.target instanceof HTMLCanvasElement)) return;
      wakeArmyAudio();
      drag.current.on = true;
      drag.current.x = e.clientX;
    };
    const pMove = (e: PointerEvent) => {
      if (!drag.current.on) return;
      drag.current.acc += (e.clientX - drag.current.x) * 0.0055;
      drag.current.x = e.clientX;
    };
    const pUp = () => {
      drag.current.on = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    window.addEventListener('pointerdown', pDown);
    window.addEventListener('pointermove', pMove);
    window.addEventListener('pointerup', pUp);
    window.addEventListener('pointercancel', pUp);
    controls.board = board;
    controls.interact = interact;
    controls.skipCoach = finishCoach;
    controls.againWaves = againWaves;
    controls.endSiege = endSiege;
    controls.startSiege = startSiege;
    controls.resetHeli = resetHeli;
    controls.quitCourse = quitCourse;
    if (import.meta.env.DEV) (window as unknown as { __army: unknown }).__army = { army, heli, men, keys: keys.current, board, startWave, startSiege };
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      window.removeEventListener('pointerdown', pDown);
      window.removeEventListener('pointermove', pMove);
      window.removeEventListener('pointerup', pUp);
      window.removeEventListener('pointercancel', pUp);
      controls.board = null;
      controls.interact = null;
      controls.skipCoach = null;
      controls.againWaves = null;
      controls.endSiege = null;
      controls.startSiege = null;
      controls.resetHeli = null;
      controls.quitCourse = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving: put the camera back the way the room had it and stand by the rug.
  useEffect(() => {
    const canvas = gl.domElement;
    return () => {
      rotorOff();
      const persp = camera as THREE.PerspectiveCamera;
      if (saved.current) {
        persp.near = saved.current.near;
        persp.fov = saved.current.fov;
        persp.updateProjectionMatrix();
      }
      camera.up.set(0, 1, 0);
      canvas.style.cursor = '';
      walkRig.teleport = { at: [MAT.x, 1.4, MAT.z + MAT.d / 2 + 0.55], look: [MAT.x, 0, MAT.z] };
    };
  }, [camera, gl]);

  function fire(from: Man, target: Man | null, chance: number) {
    const f = Math.sin(from.heading);
    const c = Math.cos(from.heading);
    _a.set(from.pos.x + f * 0.016, from.pos.y + MAN_HEIGHT * 0.62, from.pos.z + c * 0.016);
    if (target) {
      const miss = Math.random() > chance;
      _b.set(target.pos.x, target.pos.y + MAN_HEIGHT * (miss ? 0.9 + Math.random() * 0.5 : 0.55), target.pos.z);
      if (miss) _b.x += (Math.random() - 0.5) * 0.05;
      tracers.fire(_a, _b);
      if (!miss) {
        knockDown(target);
      }
    } else {
      _b.set(_a.x + f * 0.5, _a.y, _a.z + c * 0.5);
      tracers.fire(_a, _b);
    }
    armySfx.pop(camera.position.distanceTo(from.pos));
  }

  function nearestEnemy(m: Man, range: number, cone = Math.PI) {
    const foes = m.team === 'green' ? tans : greens;
    let best: Man | null = null;
    let bestD = range;
    for (const o of foes) {
      if (!o.active || o.fall > 0 || o.falling || !o.root.visible) continue;
      const d = Math.hypot(o.pos.x - m.pos.x, o.pos.z - m.pos.z);
      if (d >= bestD) continue;
      if (cone < Math.PI) {
        const ang = Math.abs(wrap(Math.atan2(o.pos.x - m.pos.x, o.pos.z - m.pos.z) - m.heading));
        if (ang > cone) continue;
      }
      best = o;
      bestD = d;
    }
    return best;
  }

  /** Tip over backwards like a plastic toy; greens get back up after a bit. */
  function tickFall(m: Man, dt: number) {
    if (m.falling) {
      m.fall = Math.min(1, m.fall + dt * 3.2);
      if (m.fall >= 1) {
        m.falling = false;
        armySfx.clack(camera.position.distanceTo(m.pos));
        if (m.team === 'tan') {
          army.toppled += 1;
          army.invadersLeft = Math.max(0, army.invadersLeft - 1);
        }
      }
    } else if (m.fall > 0) {
      m.downFor += dt;
      const upAfter = m.role === 'player' ? 2.2 : m.team === 'green' ? 5.5 : Infinity;
      if (m.downFor > upAfter) {
        m.fall = Math.max(0, m.fall - dt * 2.2);
        if (m.fall === 0) m.downFor = 0;
      }
    }
    // Ease with a little bounce when it lands.
    const t = m.fall;
    const k = m.falling ? t * t : t;
    const bounce = !m.falling && t === 1 && m.downFor < 0.25 ? Math.sin((m.downFor / 0.25) * Math.PI) * 0.12 : 0;
    m.tip.rotation.x = -(Math.PI / 2) * k + bounce;
    m.tip.position.y = 0.006 * k;
  }

  useFrame((_, rawDt) => {
    try {
      frame(Math.min(rawDt, 0.05));
    } catch (err) {
      console.error('[army] frame failed', err);
    }
  });

  function frame(dt: number) {
    const k = keys.current;
    const h = heli.current;
    const nudge = drag.current.acc;
    drag.current.acc = 0;

    // --- Waves -----------------------------------------------------------
    // The story waits for Sergeant Green: no tan soldiers until he's done talking.
    const briefing = army.siege === 'story' && (army.coach === 'wait' || army.coach === 'talk');
    if ((army.waveState === 'incoming' || army.waveState === 'cleared') && !briefing) {
      waveTimer.current -= dt;
      if (waveTimer.current <= 0) {
        if (army.waveState === 'cleared' && storyOver(army.siege, army.wave)) {
          army.waveState = 'won';
          armySfx.victory();
          banner('Town saved!', 'The tan army is flat on the carpet. Go fly the chopper!', 4);
          waveTimer.current = 3;
        } else {
          startWave(army.wave + 1);
        }
      }
    } else if (army.waveState === 'attack' && army.invadersLeft === 0) {
      army.waveState = 'cleared';
      waveTimer.current = betweenWaves(army.siege, army.wave);
      if (!storyOver(army.siege, army.wave)) {
        armySfx.radio();
        banner(`Wave ${army.wave} cleared`, army.siege === 'story' ? 'Reload. More coming…' : 'Reload. The next wave is already on its way.', 2.4);
      }
    } else if (army.waveState === 'won' && waveTimer.current > 0) {
      waveTimer.current -= dt;
      if (waveTimer.current <= 0) {
        for (const t of tans) {
          t.active = false;
          t.root.visible = false;
        }
      }
    }
    const fighting = army.waveState === 'attack' || (army.waveState === 'cleared' && !storyOver(army.siege, army.wave));

    // --- Player on foot ----------------------------------------------------
    // WASD moves, arrows look (left/right turn, up/down tilt), like the main room.
    // While the sergeant has the floor you stand and listen.
    const listening = army.coach === 'talk';
    const keyIn = listening ? { forward: 0, strafe: 0, turn: 0, look: 0 } : readArmyKeys(k, touch);
    const fwdIn = keyIn.forward;
    const turnIn = keyIn.turn;
    const strafe = keyIn.strafe;
    lookPitch.current = stepLook(lookPitch.current, keyIn.look, dt);
    if (listening) {
      coachT.current += dt;
      if (coachT.current > lineSeconds(lesson[army.coachLine] ?? '')) nextCoach();
    }
    if (army.mode === 'ground') {
      const p = player;
      if (p.fall === 0 && !p.falling) {
        const run = Boolean(k.ShiftLeft || k.ShiftRight);
        p.heading = wrap(p.heading - turnIn * 2.6 * dt - (listening ? 0 : nudge));
        const top = run ? 0.24 : 0.11;
        const want = fwdIn > 0 ? fwdIn * top : fwdIn * 0.06;
        p.speed += (want - p.speed) * Math.min(1, dt * 9);
        const s = Math.sin(p.heading);
        const c = Math.cos(p.heading);
        const side = strafe * (run ? 0.12 : 0.07);
        p.pos.x += s * p.speed * dt - c * side * dt;
        p.pos.z += c * p.speed * dt + s * side * dt;
        p.cooldown -= dt;
        if ((k.Space || touch.fire) && p.cooldown <= 0 && !listening) {
          p.cooldown = 0.33;
          const live = tans.filter(o => o.active && o.fall === 0 && !o.falling && o.root.visible);
          const pick = pickAlongBarrel(
            p.pos,
            p.heading,
            live.map(o => ({ x: o.pos.x, y: o.pos.y, z: o.pos.z })),
          );
          const gun = muzzlePoint(p.pos, p.heading);
          _a.set(gun.x, gun.y, gun.z);
          const foe = pick ? live[pick.index] : null;
          const end = foe ? chestPoint(foe.pos) : shotPoint(p.pos, p.heading, SHOT_RANGE);
          _b.set(end.x, end.y, end.z);
          tracers.fire(_a, _b);
          if (foe) knockDown(foe);
          armySfx.pop(camera.position.distanceTo(p.pos));
        }
      } else {
        p.speed = 0;
      }
      army.nearChopper = h.grounded && Math.hypot(h.pos.x - p.pos.x, h.pos.z - p.pos.z) < 0.16 && h.pos.y < 0.01;
      army.playerDown = p.fall > 0 || p.falling;
    } else {
      army.nearChopper = false;
    }

    // --- Helicopter --------------------------------------------------------
    {
      const input: HeliInput =
        army.mode === 'heli' && !sniperBusy()
          ? {
              forward: fwdIn,
              turn: turnIn,
              lift: (k.Space || touch.up ? 1 : 0) - (k.ShiftLeft || k.ShiftRight || k.ControlLeft || touch.down ? 1 : 0),
              strafe,
              yawNudge: nudge,
              boost: Boolean(k.Tab),
            }
          : NO_INPUT;
      if (army.mode === 'heli' && !sniperBusy()) {
        _prev.copy(h.pos);
        const events = stepHeli(h, input, dt);
        if (events.includes('bump')) armySfx.bump();
        if (!Number.isFinite(h.pos.x)) resetHeli();
        // Rings.
        const c = army.course;
        const ring = RINGS[c.next];
        if (ring && throughRing(ring, _prev, h.pos)) {
          if (c.next === 0) {
            c.active = true;
            c.time = 0;
            banner('Go!', `${RINGS.length} rings round the room`, 1.4);
          }
          armySfx.ring();
          c.next += 1;
          if (c.next >= RINGS.length) {
            const best = c.best === null || c.time < c.best;
            if (best) {
              c.best = c.time;
              saveBest(c.time);
            }
            c.last = { time: c.time, best };
            c.active = false;
            c.next = 0;
            armySfx.finish();
            banner(best ? 'New best!' : 'Course done!', `${formatTime(c.last.time)} · free flight, or hit ring 1 to go again`, 4);
          }
        }
        if (c.active) c.time += dt;
        rotorLevel(h.rotor, Math.hypot(h.vel.x, h.vel.z));
      } else {
        h.rotor = Math.max(0, h.rotor - dt * 0.6);
      }
      const node = heliGroup.current;
      if (node) {
        node.position.copy(h.pos);
        node.rotation.set(h.pitch, h.yaw, 0, 'YXZ');
        node.rotateZ(h.bank);
      }
      const parts = heliParts.current;
      if (parts.main) parts.main.rotation.y += dt * (4 + h.rotor * 38);
      if (parts.tail) parts.tail.rotation.x += dt * (6 + h.rotor * 50);
      const sh = heliShadow.current;
      if (sh) {
        const g = floorAt(h.pos.x, h.pos.z, h.pos.y + 0.01);
        const above = h.pos.y - g;
        sh.position.set(h.pos.x, Math.max(g, MAT_TOP) + 0.0008, h.pos.z);
        sh.scale.setScalar(1 + above * 0.8);
        (sh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.08, 0.42 - above * 0.3);
      }
      army.heliGrounded = h.grounded;
      army.heliHigh = h.grounded && h.pos.y > 0.01;
      army.heliSpeed = Math.hypot(h.vel.x, h.vel.z);
      army.heliAlt = h.pos.y;
    }

    // --- Everyone else -------------------------------------------------------
    for (const m of men) {
      if (!m.active) continue;
      tickFall(m, dt);
      if (m === player) continue;
      if (m.fall > 0 || m.falling) {
        m.speed = 0;
        continue;
      }
      if (m.guide && (army.coach === 'wait' || army.coach === 'talk')) {
        // Sergeant Green holds his spot and keeps an eye on you.
        const dx = player.pos.x - m.pos.x;
        const dz = player.pos.z - m.pos.z;
        const near = army.mode === 'ground' && Math.hypot(dx, dz) <= COACH_REACH && Math.abs(player.pos.y - m.pos.y) < 0.03;
        if (army.coachNear !== near) {
          army.coachNear = near;
          emit();
        }
        if (walkTo(m, COACH_SPOT.x, COACH_SPOT.z, 0.09, dt) < 0.012) {
          m.speed = 0;
          turnToward(m, Math.atan2(dx, dz), 6, dt);
        }
        continue;
      }
      m.cooldown -= dt;
      const shootAt = (foe: Man | null) => {
        if (!foe) return false;
        const off = turnToward(m, Math.atan2(foe.pos.x - m.pos.x, foe.pos.z - m.pos.z), 5, dt);
        m.speed += (0 - m.speed) * Math.min(1, dt * 10);
        if (off < 0.25 && m.cooldown <= 0) {
          m.cooldown = 0.9 + Math.random() * 1.4;
          fire(m, foe, m.hitChance);
        }
        return true;
      };
      switch (m.role) {
        case 'guard':
        case 'tower': {
          const foe = fighting ? nearestEnemy(m, m.range) : null;
          if (!shootAt(foe)) {
            turnToward(m, m.home[2], 3, dt);
            m.speed = 0;
          }
          break;
        }
        case 'patrol': {
          const [x, z] = m.route[m.wp];
          if (walkTo(m, x, z, 0.075, dt) < 0.015) m.wp = (m.wp + 1) % m.route.length;
          break;
        }
        case 'drill':
        case 'defender': {
          if (fighting) {
            const [fx, fz] = FOXHOLES[m.slot];
            const dist = Math.hypot(fx - m.pos.x, fz - m.pos.z);
            if (dist > 0.02) walkTo(m, fx, fz, 0.19, dt);
            else if (!shootAt(nearestEnemy(m, m.range))) {
              turnToward(m, Math.PI, 4, dt);
              m.speed *= 0.8;
            }
          } else if (m.role === 'drill') {
            if (m.pause > 0) {
              m.pause -= dt;
              m.speed = 0;
              // About-face during the halt.
              const [x, z] = m.route[m.wp];
              turnToward(m, Math.atan2(x - m.pos.x, z - m.pos.z), 4, dt);
            } else {
              const [x, z] = m.route[m.wp];
              if (walkTo(m, x, z, 0.07, dt) < 0.01) {
                m.wp = 1 - m.wp;
                m.pause = 1.1;
              }
            }
          } else {
            const [x, z] = m.route[m.wp];
            if (walkTo(m, x, z, 0.075, dt) < 0.015) m.wp = (m.wp + 1) % m.route.length;
          }
          break;
        }
        case 'invader': {
          if (army.waveState === 'won') {
            m.speed = 0;
            break;
          }
          const foe = nearestEnemy(m, m.range);
          if (!shootAt(foe)) {
            const [x, z] = m.route[0];
            if (walkTo(m, x, z, m.march, dt) < 0.02) turnToward(m, Math.PI * 0, 3, dt);
          }
          break;
        }
      }
    }

    // Move, keep apart, keep out of furniture.
    for (const m of men) {
      if (!m.active || m === player || m.role === 'guard' || m.role === 'tower') continue;
      if (m.fall > 0) continue;
      m.pos.x += Math.sin(m.heading) * m.speed * dt;
      m.pos.z += Math.cos(m.heading) * m.speed * dt;
    }
    for (let i = 0; i < men.length; i++) {
      const a = men[i];
      if (!a.active || a.role === 'tower' || !a.root.visible) continue;
      for (let j = i + 1; j < men.length; j++) {
        const b = men[j];
        if (!b.active || b.role === 'tower' || !b.root.visible) continue;
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const d2 = dx * dx + dz * dz;
        const min = MAN_RADIUS * 2;
        if (d2 >= min * min || d2 < 1e-10) continue;
        const d = Math.sqrt(d2);
        const push = (min - d) / 2;
        const aFixed = a.role === 'guard' || a.fall > 0;
        const bFixed = b.role === 'guard' || b.fall > 0;
        const wa = aFixed ? 0 : bFixed ? 1 : 0.5;
        const wb = bFixed ? 0 : aFixed ? 1 : 0.5;
        a.pos.x -= (dx / d) * push * 2 * wa;
        a.pos.z -= (dz / d) * push * 2 * wa;
        b.pos.x += (dx / d) * push * 2 * wb;
        b.pos.z += (dz / d) * push * 2 * wb;
      }
    }
    for (const m of men) {
      if (!m.active || m.role === 'tower' || m.role === 'guard') continue;
      if (m === player && army.mode === 'heli') continue;
      pushOut(m.pos, MAN_RADIUS, 0.005, MAN_HEIGHT);
      m.pos.y = 0;
    }

    // Animate.
    for (const m of men) {
      if (!m.active || !m.root.visible) continue;
      m.root.rotation.y = m.heading;
      if (m.fall > 0 || m.falling) continue;
      const { clip, scale } = clipFor(Math.abs(m.speed));
      setClip(m, clip);
      m.actions[clip].timeScale = m.speed < 0 ? -scale : scale;
      m.mixer.update(dt);
    }
    tracers.tick(dt);

    // --- Camera -------------------------------------------------------------
    // Up on the shelf with the sniper: his camera, not ours.
    if (sniperBusy()) {
      throttledEmit();
      return;
    }
    const persp = camera as THREE.PerspectiveCamera;
    if (!saved.current) {
      saved.current = { near: persp.near, fov: persp.fov };
      intro.current.from.copy(camera.position);
      camera.getWorldDirection(_look);
      intro.current.look.copy(camera.position).addScaledVector(_look, 1);
    }
    const flying = army.mode === 'heli';
    const cam = army.cam;
    const subject = flying ? h.pos : player.pos;
    const yaw = flying ? h.yaw : player.heading;
    camYaw.current = camReady.current ? camYaw.current + wrap(yaw - camYaw.current) * (1 - Math.exp(-dt * (flying ? 4.5 : 7))) : yaw;
    const cy = camYaw.current;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    let firstPerson = false;
    if (cam === 'first') {
      firstPerson = true;
      if (flying) {
        _want.set(h.pos.x + fx * 0.05, h.pos.y + 0.05, h.pos.z + fz * 0.05);
        _look.set(_want.x + fx, _want.y - Math.sin(h.pitch * 0.6) - 0.08, _want.z + fz);
      } else {
        const eye = player.pos.y + MAN_HEIGHT * 0.9;
        _want.set(player.pos.x + fx * 0.008, eye, player.pos.z + fz * 0.008);
        _look.set(_want.x + fx, eye - 0.06, _want.z + fz);
      }
    } else if (cam === 'birdseye') {
      const up = flying ? 1.1 : 0.75;
      _want.set(subject.x - Math.sin(cy) * 0.35, Math.min(3.05, subject.y + up), subject.z - Math.cos(cy) * 0.35);
      _look.set(subject.x + fx * 0.1, subject.y, subject.z + fz * 0.1);
    } else if (flying) {
      const speed = Math.hypot(h.vel.x, h.vel.z);
      const back = 0.42 + speed * 0.12;
      _want.set(h.pos.x - Math.sin(cy) * back, h.pos.y + 0.13, h.pos.z - Math.cos(cy) * back);
      _look.set(h.pos.x + fx * 0.25, h.pos.y + 0.03, h.pos.z + fz * 0.25);
      clearShot(_look, _want);
    } else {
      _want.set(player.pos.x - Math.sin(cy) * 0.2, player.pos.y + 0.085, player.pos.z - Math.cos(cy) * 0.2);
      _look.set(player.pos.x + fx * 0.12, player.pos.y + 0.045, player.pos.z + fz * 0.12);
      clearShot(_look, _want);
    }
    // Sergeant Green's lesson: the camera closes in on him, a three-quarter shot from in front.
    const closeUp = army.coach === 'talk' && guide !== null && !flying;
    if (closeUp && guide) {
      const side = guide.heading + 0.55;
      _want.set(guide.pos.x + Math.sin(side) * 0.13, guide.pos.y + MAN_HEIGHT * 1.05, guide.pos.z + Math.cos(side) * 0.13);
      _look.set(guide.pos.x, guide.pos.y + MAN_HEIGHT * 0.78, guide.pos.z);
      clearShot(_look, _want);
      firstPerson = false;
    }
    // Up/down arrows tilt the view about the camera's own right axis: look up at the
    // ceiling from the rug, or out across the room from the bird's-eye.
    if (lookPitch.current !== 0 && !closeUp) {
      _dir.subVectors(_look, _want);
      _right.crossVectors(_dir, UP).normalize();
      if (_right.lengthSq() > 0) _look.copy(_want).add(_dir.applyAxisAngle(_right, lookPitch.current));
    }
    player.root.visible = !flying && !(firstPerson && player.fall === 0);
    if (!camReady.current || (firstPerson && !closeUp)) {
      _cam.copy(_want);
      _camLook.copy(_look);
    } else {
      const a = 1 - Math.exp(-dt * (flying ? 7 : 9));
      _cam.lerp(_want, a);
      _camLook.lerp(_look, Math.min(1, a * 1.6));
    }
    camReady.current = true;
    // The shrink-down: glide from where you stood into the town.
    const it = intro.current;
    if (it.t < 1) {
      it.t = Math.min(1, it.t + dt / 1.6);
      const e = it.t * it.t * (3 - 2 * it.t);
      camera.position.lerpVectors(it.from, _cam, e);
      _b.lerpVectors(it.look, _camLook, e);
      camera.up.set(0, 1, 0);
      camera.lookAt(_b);
    } else {
      camera.position.copy(_cam);
      camera.up.set(0, 1, 0);
      camera.lookAt(_camLook);
    }
    const near = cam === 'birdseye' ? 0.02 : flying ? 0.008 : 0.003;
    const fov = fitFov(firstPerson ? 78 : 68, size.width / Math.max(1, size.height), 1.5, 100);
    if (it.t >= 1 && (persp.near !== near || Math.abs(persp.fov - fov) > 0.1)) {
      persp.near = near;
      persp.fov = fov;
      persp.updateProjectionMatrix();
    }

    // Sergeant Green: a glow on the rug while he waits, and his bubble.
    const waiting = army.coach === 'wait' || army.coach === 'talk';
    const glow = coachGlow.current;
    if (glow && guide) {
      glow.visible = army.coach === 'wait';
      glow.position.set(guide.pos.x, guide.pos.y, guide.pos.z);
      const pulse = 1 + Math.sin(performance.now() / 240) * 0.12;
      glow.scale.set(pulse, 1, pulse);
    }
    if (waiting && guide && !flying) {
      const at = headOnScreen(camera, guide.pos.x, guide.pos.y + MAN_HEIGHT * 1.15, guide.pos.z);
      if (at) {
        const talking = army.coach === 'talk';
        army.bubble = {
          ...at,
          who: COACH_NAME,
          text: talking ? lesson[army.coachLine] : army.coachNear ? 'Over here, soldier! Talk to me.' : 'TALK HERE',
          hint: talking ? `F or tap · next (${army.coachLine + 1}/${lesson.length})` : army.coachNear ? 'F or tap to talk' : 'Walk over to me',
        };
      } else army.bubble = null;
    } else if (army.bubble) army.bubble = null;

    throttledEmit();
  }

  function throttledEmit() {
    const now = performance.now();
    if (now - lastEmit.current > 80) {
      lastEmit.current = now;
      if (army.banner && now > army.banner.until) army.banner = null;
      emit();
    }
  }

  return (
    <group>
      <group ref={group} />
      <primitive object={tracers.lines} />
      <group ref={heliGroup}>
        <ToyHelicopter parts={heliParts} />
      </group>
      <mesh ref={heliShadow} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <circleGeometry args={[0.07, 20]} />
        <meshBasicMaterial color="#000" transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <GuideArrow heli={heli} course={army.course} />
      <group ref={coachGlow} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, MAT_TOP + 0.001, 0]} renderOrder={2}>
          <ringGeometry args={[0.018, 0.028, 32]} />
          <meshBasicMaterial color="#b6ff4a" transparent opacity={0.85} depthWrite={false} />
        </mesh>
        <mesh position={[0, MAN_HEIGHT * 0.75, 0]} renderOrder={2}>
          <cylinderGeometry args={[0.02, 0.026, MAN_HEIGHT * 1.5, 20, 1, true]} />
          <meshBasicMaterial color="#c8ff6a" transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0, MAN_HEIGHT * 1.2, 0]} color="#b6ff4a" intensity={0.25} distance={0.35} decay={2} />
      </group>
      <SniperMission heli={heli} flying={() => army.mode === 'heli'} />
      {RINGS.map((_, i) => (
        <RingGate key={i} index={i} course={army.course} />
      ))}
    </group>
  );
}

export function ArmyTownWorld({ boot }: { boot: ArmyBoot | null }) {
  useEffect(() => {
    const life = openMiniGame('army');
    return () => life.close();
  }, []);
  return (
    <group>
      <ArmyProps />
      <Suspense fallback={null}>
        <Crowd boot={boot} />
      </Suspense>
      {/* A bit of extra light over the rug, like a desk lamp pulled down to play. */}
      <pointLight position={[MAT.x, 1.3, MAT.z + 0.2]} intensity={0.9} distance={3.2} decay={2} color="#fff1dc" />
    </group>
  );
}

useGLTF.preload(MODEL_URL);

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const rest = seconds - m * 60;
  return `${m}:${rest.toFixed(2).padStart(5, '0')}`;
}

// ---------------------------------------------------------------------------
// HUD

const CAM_LABEL: Record<ArmyCam, string> = {
  chase: 'Third person',
  first: 'First person',
  birdseye: "Bird's-eye",
};

function HoldButton({ label, onHold, className = '' }: { label: string; onHold: (on: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      className={`pointer-events-auto select-none touch-none rounded-2xl border border-white/25 bg-black/55 text-sm font-black uppercase text-white active:bg-lime-600/70 ${className}`}
      onPointerDown={e => {
        e.preventDefault();
        wakeArmyAudio();
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

export function ArmyHud({ onExit }: { onExit: () => void }) {
  const a = useArmy();
  const [isTouch] = useState(isTouchDevice);
  useSniper();
  const flying = a.mode === 'heli';
  const c = a.course;
  if (sniperBusy()) return <SniperHud />;
  const btn = 'rounded-xl border border-white/25 bg-black/55 px-3 py-2 text-[11px] font-bold uppercase tracking-wider';
  return (
    <div data-army className="pointer-events-none absolute inset-0 z-40 text-white">
      <div className="pointer-events-auto absolute left-4 top-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onExit} className="rounded-xl bg-lime-400 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-black">
          Stand up
        </button>
        <button type="button" onClick={cycleCam} className={`${btn} text-lime-100`}>
          {CAM_LABEL[a.cam]}
        </button>
        {(a.nearChopper || flying) && (
          <button type="button" onClick={() => controls.board?.()} className={`${btn} ${flying ? 'text-white/85' : 'bg-lime-700/70 text-white'}`}>
            {flying ? 'Land & hop out (F)' : 'Board chopper (F)'}
          </button>
        )}
        {flying && c.active && (
          <button type="button" onClick={() => controls.quitCourse?.()} className={`${btn} text-white/85`}>
            Free flight
          </button>
        )}
        {flying && (
          <button type="button" onClick={() => controls.resetHeli?.()} className={`${btn} text-white/85`}>
            Back to pad
          </button>
        )}
        {a.siege !== 'story' && a.waveState !== 'won' && (
          <button type="button" data-army-end onClick={() => controls.endSiege?.()} className={`${btn} border-red-300/60 bg-red-700/70 text-white`}>
            End {a.siege} siege
          </button>
        )}
        {a.waveState === 'won' && !flying && (
          <button type="button" onClick={() => controls.againWaves?.()} className={`${btn} text-amber-200`}>
            Send another attack
          </button>
        )}
        {(a.waveState === 'won' || (a.wave === 0 && a.waveState === 'incoming')) && !flying &&
          (['easy', 'medium', 'hard'] as const).map(level => (
            <button key={level} type="button" onClick={() => controls.startSiege?.(level)} className={`${btn} text-amber-100`}>
              {level}
            </button>
          ))}
      </div>

      <div className="absolute right-4 top-4 min-w-[150px] rounded-2xl border border-lime-300/30 bg-black/55 px-4 py-2 text-right">
        {flying ? (
          <>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-200">{c.active ? 'Ring course' : 'Free flight'}</p>
            {c.active ? (
              <>
                <p className="font-mono text-2xl font-black tabular-nums">{formatTime(c.time)}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
                  Ring {Math.min(c.next + 1, RINGS.length)}/{RINGS.length} · {RINGS[c.next]?.label}
                </p>
              </>
            ) : (
              <p className="max-w-[190px] text-[11px] leading-tight text-white/75">Fly through the glowing ring to start the course</p>
            )}
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
              Best {c.best === null ? '—' : formatTime(c.best)}
              {c.last && !c.active ? ` · Last ${formatTime(c.last.time)}` : ''}
            </p>
          </>
        ) : (
          <>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-lime-200">
              {a.waveState === 'won'
                ? 'Town saved'
                : a.siege !== 'story'
                  ? `${a.siege}${a.wave ? ` · wave ${a.wave}` : ''}`
                  : a.wave === 0
                    ? 'Under attack'
                    : `Wave ${a.wave}/${STORY_WAVES.length}`}
            </p>
            <p className="font-mono text-2xl font-black tabular-nums">{a.toppled}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">
              tan toppled{a.waveState === 'attack' ? ` · ${a.invadersLeft} left` : ''}
            </p>
          </>
        )}
      </div>

      {a.bubble && !flying && (
        <SpeechBubble
          bubble={a.bubble}
          onNext={a.coach === 'talk' || a.coachNear ? () => controls.interact?.() : undefined}
        />
      )}
      {(a.coach === 'wait' || a.coach === 'talk') && !flying && (
        <button
          type="button"
          data-army-skip
          onClick={() => controls.skipCoach?.()}
          className="pointer-events-auto absolute bottom-16 right-4 rounded-xl border border-white/25 bg-black/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/75"
        >
          Skip training
        </button>
      )}
      {a.banner && (
        <div className="absolute left-1/2 top-[26%] -translate-x-1/2 text-center">
          <p className="whitespace-nowrap text-4xl font-black uppercase italic text-lime-300 drop-shadow-[0_3px_0_rgba(0,0,0,0.75)] sm:text-5xl">
            {a.banner.text}
          </p>
          {a.banner.sub && <p className="mt-2 rounded-full bg-black/60 px-4 py-1 text-sm font-bold text-white/90">{a.banner.sub}</p>}
        </div>
      )}
      {a.playerDown && !flying && (
        <p className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full bg-red-600/85 px-4 py-1 text-[12px] font-black uppercase tracking-[0.2em]">
          You got tipped over! Getting back up…
        </p>
      )}
      <SquadPrompt />
      {a.nearChopper && !flying && (
        <p className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full bg-lime-500 px-4 py-1 text-[12px] font-black uppercase tracking-[0.2em] text-black">
          Press F to board the chopper
        </p>
      )}

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        <div className="flex items-center gap-3 rounded-full bg-black/60 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider">
          {flying ? (
            <>
              <span className="font-mono tabular-nums text-lime-200">{Math.round(a.heliSpeed * 100)} cm/s</span>
              <span className="font-mono tabular-nums text-cyan-200">{Math.round(a.heliAlt * 100)} cm up</span>
              {!isTouch && <span className="text-white/65">WASD fly · Arrows look · Space up · Shift down · Tab boost · drag to turn · C camera</span>}
            </>
          ) : (
            !isTouch && <span className="text-white/65">WASD move · Arrows look · Shift run · Space fire · drag to turn · F talk / chopper · C camera</span>
          )}
        </div>
      </div>

      {isTouch && (
        <>
          <div className="absolute bottom-6 left-4 grid grid-cols-3 gap-2">
            <span />
            <HoldButton label="▲" className="h-14 w-14" onHold={on => (touch.fwd = on)} />
            <span />
            <HoldButton label="◀" className="h-14 w-14" onHold={on => (touch.left = on)} />
            <HoldButton label="▼" className="h-14 w-14" onHold={on => (touch.back = on)} />
            <HoldButton label="▶" className="h-14 w-14" onHold={on => (touch.right = on)} />
          </div>
          <div className="absolute bottom-6 right-4 flex flex-col items-end gap-2">
            {flying ? (
              <>
                <HoldButton label="Up" className="h-14 w-20" onHold={on => (touch.up = on)} />
                <HoldButton label="Down" className="h-14 w-20" onHold={on => (touch.down = on)} />
              </>
            ) : (
              <HoldButton label="Fire" className="h-20 w-20 text-amber-200" onHold={on => (touch.fire = on)} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The radio call when you pick up the tin.

export function ArmyAlert({ onSend, onLook }: { onSend: () => void; onLook: () => void }) {
  useEffect(() => {
    armySfx.alarm();
  }, []);
  return (
    <div data-army-alert className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-sm rounded-3xl border-4 border-[#2f3d1a] bg-[#55652e] p-5 text-center shadow-2xl">
        <div className="mx-auto mb-3 flex h-10 w-24 items-center justify-center gap-1 rounded-lg bg-[#2f3d1a]">
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="h-5 w-1 animate-pulse rounded bg-lime-300" style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-lime-200">Radio · HQ come in</p>
        <p className="mt-2 text-3xl font-black uppercase leading-tight text-white drop-shadow">We're under attack!</p>
        <p className="mt-1 text-lg font-black uppercase text-amber-200">Send the troops!</p>
        <p className="mt-2 text-[13px] leading-snug text-white/80">
          The tan army is massing behind the books. Shrink down, defend the town, and grab the chopper.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              wakeArmyAudio();
              onSend();
            }}
            className="rounded-2xl bg-lime-400 px-4 py-3 text-base font-black uppercase tracking-wider text-black hover:bg-lime-300"
          >
            Send the troops!
          </button>
          <button type="button" onClick={onLook} className="rounded-2xl bg-black/30 px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-white/80 hover:bg-black/45">
            Just looking at the tin
          </button>
        </div>
      </div>
    </div>
  );
}
