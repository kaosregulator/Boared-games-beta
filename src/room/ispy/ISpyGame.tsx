import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fitFov, isTouchDevice } from '../input';
import { walkRig } from '../WalkController';
import { EAST_X, NORTH_Z, SOUTH_Z, WALL, WEST_X } from '../videoRoom';
import { openMiniGame } from '../../engine/lifecycle';
import { carpetTexture } from './carpet';
import { makeToy } from './items';
import { ispySfx, wakeISpyAudio } from './ispyAudio';
import {
  CARPET,
  KINDS,
  RULES,
  START,
  lateFee,
  makePuzzle,
  money,
  phraseFor,
  themesFor,
  type Difficulty,
  type Puzzle,
} from './puzzle';

/**
 * I Spy on the bedroom carpet. The old library book on the rug opens, its
 * pop-ups stand up, you pick easy, medium or hard, then the lights go out
 * ("no peeking!") and when you open your eyes you're shrunk down on a
 * carpet that has turned into the page: a play mat, a beach, a chalkboard,
 * a haunted night... covered in toys. Find everything in the riddle, then
 * turn the page for a brand new one. It never runs out.
 */

/** Where the book lies on the rug, closed, cover up. */
export const BOOK_SPOT = { x: -0.78, z: 0.36, rotY: 0.32 };
const BOOK_W = 0.24;
const BOOK_D = 0.31;
const BOOK_T = 0.022;

export type ISpyPhase = 'off' | 'book' | 'dark' | 'play' | 'done';
export type ISpyCam = 'chase' | 'first' | 'birdseye' | 'free';

const PAGES_KEY = 'ispy-pages';
const BEST_KEY = 'ispy-best-';

export const ispy = {
  phase: 'off' as ISpyPhase,
  difficulty: 'easy' as Difficulty,
  puzzle: null as Puzzle | null,
  found: new Set<number>(),
  /** Riddle line index found most recently, for the HUD's sparkle. */
  lastLine: -1,
  cam: 'chase' as ISpyCam,
  wrong: 0,
  hints: 0,
  time: 0,
  best: null as number | null,
  pages: 0,
  /** Countdown while your eyes are shut: 3, 2, 1, then 0 = open them. */
  count: 3,
  /** The book's pop-ups are up and the picker can show. */
  bookReady: false,
  banner: null as null | { text: string; sub?: string; until: number },
  listeners: new Set<() => void>(),
};

function emit() {
  ispy.listeners.forEach(fn => fn());
}

function banner(text: string, sub?: string, seconds = 2.2) {
  ispy.banner = { text, sub, until: performance.now() + seconds * 1000 };
  emit();
}

export function useISpy() {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump(n => n + 1);
    ispy.listeners.add(fn);
    return () => {
      ispy.listeners.delete(fn);
    };
  }, []);
  return ispy;
}

/**
 * Just the phase and whether the page wants the room dark: the room only
 * re-renders when one of those changes, not on every HUD tick.
 */
export function useISpyRoom() {
  const read = () => {
    const page = ispy.phase === 'dark' || ispy.phase === 'play' || ispy.phase === 'done';
    return { page, dim: page && ispy.phase !== 'dark' && Boolean(ispy.puzzle?.theme.dim) };
  };
  const [state, setState] = useState(read);
  useEffect(() => {
    const fn = () => {
      const now = read();
      setState(prev => (prev.page === now.page && prev.dim === now.dim ? prev : now));
    };
    ispy.listeners.add(fn);
    return () => {
      ispy.listeners.delete(fn);
    };
  }, []);
  return state;
}

function readNum(key: string) {
  try {
    const n = Number(window.localStorage.getItem(key));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function saveNum(key: string, n: number) {
  try {
    window.localStorage.setItem(key, String(n));
  } catch {
    // kept for this visit
  }
}

/** The page to make next: set by the picker, read by the world. */
const next = { seed: 0, difficulty: 'easy' as Difficulty };

/** Close your eyes: the world builds a new page behind the black. */
export function startPage(difficulty: Difficulty, seed?: number) {
  wakeISpyAudio();
  next.difficulty = difficulty;
  next.seed = seed ?? ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  ispy.difficulty = difficulty;
  ispy.phase = 'dark';
  ispy.count = 3;
  ispySfx.dump();
  emit();
}

const CAM_ORDER: ISpyCam[] = ['chase', 'first', 'birdseye', 'free'];
function cycleCam() {
  ispy.cam = CAM_ORDER[(CAM_ORDER.indexOf(ispy.cam) + 1) % CAM_ORDER.length];
  emit();
}

const touch = { fwd: false, back: false, left: false, right: false, up: false, down: false };
const actions = { hint: null as null | (() => void) };

export interface ISpyBoot {
  difficulty: Difficulty;
  seed: number | null;
  cam: ISpyCam | null;
}

/** `?ispy=hard&seed=42&ispyCam=free` jumps straight onto a page (for testing and captures). */
export function readISpyBoot(): ISpyBoot | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  const d = q.get('ispy');
  if (d === null) return null;
  const seed = q.get('seed');
  const cam = q.get('ispyCam');
  return {
    difficulty: d === 'medium' || d === 'hard' ? d : 'easy',
    seed: seed === null ? null : Number(seed),
    cam: cam === 'chase' || cam === 'first' || cam === 'birdseye' || cam === 'free' ? cam : null,
  };
}

// ---------------------------------------------------------------------------
// Textures for the book

let coverTex: THREE.Texture | null = null;
function bookCover() {
  if (!coverTex) {
    coverTex = new THREE.TextureLoader().load('/ispy/cover.webp');
    coverTex.colorSpace = THREE.SRGBColorSpace;
    coverTex.anisotropy = 8;
  }
  return coverTex;
}

function paperCanvas(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** The inside pages: a library card pocket on the left, the riddle page on the right. */
const insideTextures = (() => {
  let made: { left: THREE.Texture; right: THREE.Texture } | null = null;
  return () => {
    if (made) return made;
    const left = paperCanvas(512, 660, g => {
      g.fillStyle = '#f4ecd8';
      g.fillRect(0, 0, 512, 660);
      // Library card pocket, glued in crooked.
      g.save();
      g.translate(256, 420);
      g.rotate(-0.04);
      g.fillStyle = '#e7d3a2';
      g.fillRect(-170, -120, 340, 240);
      g.strokeStyle = '#b89c62';
      g.lineWidth = 3;
      g.strokeRect(-170, -120, 340, 240);
      g.fillStyle = '#6b4e2a';
      g.font = '700 26px Georgia, serif';
      g.textAlign = 'center';
      g.fillText('PUBLIC LIBRARY', 0, -80);
      g.font = '18px Georgia, serif';
      g.fillText('DATE DUE', 0, -48);
      g.strokeStyle = '#c9b07c';
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.moveTo(-140, -30 + i * 30);
        g.lineTo(140, -30 + i * 30);
        g.stroke();
      }
      g.fillStyle = '#5a3b8c';
      g.font = '22px "Courier New", monospace';
      g.fillText('OCT 23 1998', 0, -6);
      g.fillStyle = '#c0201a';
      g.font = '900 34px "Arial Black", Arial, sans-serif';
      g.save();
      g.rotate(-0.18);
      g.fillText('OVERDUE', 10, 64);
      g.restore();
      g.restore();
      g.fillStyle = '#3a2a1a';
      g.font = 'italic 24px Georgia, serif';
      g.textAlign = 'center';
      g.fillText('Checked out from the library.', 256, 110);
      g.fillText('Never returned.', 256, 144);
      g.fillText('The librarian is still looking...', 256, 178);
    });
    const right = paperCanvas(512, 660, g => {
      g.fillStyle = '#16131c';
      g.fillRect(0, 0, 512, 660);
      g.fillStyle = '#f5f0e2';
      g.font = '900 64px Georgia, serif';
      g.textAlign = 'center';
      g.fillText('I SPY', 256, 560);
      g.font = 'italic 24px Georgia, serif';
      g.fillText('a page that is new every time', 256, 604);
    });
    made = { left, right };
    return made;
  };
})();

/** Paper cut-outs that stand up when the book opens. */
function popupTexture(kind: number) {
  return paperCanvas(256, 256, g => {
    g.clearRect(0, 0, 256, 256);
    const paper = (draw: () => void) => {
      g.save();
      g.shadowColor = 'rgba(0,0,0,0.25)';
      g.shadowBlur = 6;
      g.lineJoin = 'round';
      g.lineWidth = 16;
      g.strokeStyle = '#fffaf0';
      draw();
      g.restore();
    };
    switch (kind) {
      case 0: {
        // The title arch.
        paper(() => {
          g.fillStyle = '#fffaf0';
          g.beginPath();
          g.moveTo(16, 230);
          g.quadraticCurveTo(128, -40, 240, 230);
          g.fill();
        });
        g.fillStyle = '#d7263d';
        g.font = '900 70px Georgia, serif';
        g.textAlign = 'center';
        g.fillText('I SPY', 128, 170);
        g.fillStyle = '#2f6fd6';
        g.font = '700 20px Georgia, serif';
        g.fillText('PICTURE RIDDLES', 128, 205);
        break;
      }
      case 1: {
        // Magnifying glass.
        paper(() => {
          g.beginPath();
          g.arc(110, 110, 70, 0, Math.PI * 2);
          g.stroke();
        });
        g.fillStyle = 'rgba(160,210,255,0.6)';
        g.beginPath();
        g.arc(110, 110, 62, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#333';
        g.lineWidth = 12;
        g.beginPath();
        g.arc(110, 110, 64, 0, Math.PI * 2);
        g.stroke();
        g.strokeStyle = '#8a5a33';
        g.lineWidth = 24;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(160, 160);
        g.lineTo(230, 230);
        g.stroke();
        break;
      }
      case 2: {
        // A star.
        g.fillStyle = '#f6d32d';
        g.strokeStyle = '#fffaf0';
        g.lineWidth = 12;
        g.beginPath();
        for (let i = 0; i <= 10; i++) {
          const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 === 0 ? 110 : 48;
          g.lineTo(128 + Math.cos(a) * r, 136 + Math.sin(a) * r);
        }
        g.closePath();
        g.stroke();
        g.fill();
        break;
      }
      case 3: {
        // Marbles.
        const m = [
          [80, 160, '#2f6fd6'],
          [150, 120, '#d7263d'],
          [180, 190, '#3fa34d'],
        ] as const;
        for (const [x, y, c] of m) {
          g.fillStyle = '#fffaf0';
          g.beginPath();
          g.arc(x, y, 52, 0, Math.PI * 2);
          g.fill();
          const grd = g.createRadialGradient(x - 14, y - 14, 6, x, y, 44);
          grd.addColorStop(0, '#ffffff');
          grd.addColorStop(0.3, c);
          grd.addColorStop(1, '#111');
          g.fillStyle = grd;
          g.beginPath();
          g.arc(x, y, 44, 0, Math.PI * 2);
          g.fill();
        }
        break;
      }
      default: {
        // A letter block and a heart.
        g.fillStyle = '#fffaf0';
        g.fillRect(20, 80, 130, 130);
        g.fillStyle = '#e2bd84';
        g.fillRect(30, 90, 110, 110);
        g.fillStyle = '#2f6fd6';
        g.font = '900 90px "Arial Black", Arial, sans-serif';
        g.textAlign = 'center';
        g.fillText('A', 85, 180);
        g.fillStyle = '#f27eb5';
        g.strokeStyle = '#fffaf0';
        g.lineWidth = 10;
        g.beginPath();
        g.moveTo(196, 200);
        g.bezierCurveTo(250, 150, 236, 90, 200, 96);
        g.bezierCurveTo(186, 98, 180, 110, 178, 118);
        g.bezierCurveTo(176, 110, 170, 98, 156, 96);
        g.bezierCurveTo(120, 90, 136, 150, 196, 200);
        g.stroke();
        g.fill();
      }
    }
  });
}

// ---------------------------------------------------------------------------
// The book on the rug (room prop) and the book opening (in the game).

function BookBody({ coverOpen = 0 }: { coverOpen?: number }) {
  const cover = bookCover();
  const inside = insideTextures();
  // The cover hinges on the spine (left edge), flipping over to lie flat on the left.
  return (
    <group>
      {/* Back cover and page block */}
      <mesh position={[0, 0.002, 0]}>
        <boxGeometry args={[BOOK_W, 0.004, BOOK_D]} />
        <meshStandardMaterial color="#c52a22" roughness={0.6} />
      </mesh>
      <mesh position={[0.002, 0.0115, 0]}>
        <boxGeometry args={[BOOK_W - 0.008, 0.015, BOOK_D - 0.008]} />
        <meshStandardMaterial color="#f1e8d2" roughness={0.9} />
      </mesh>
      {/* Right-hand page, seen once the cover is open */}
      <mesh position={[0.002, 0.0192, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BOOK_W - 0.012, BOOK_D - 0.012]} />
        <meshStandardMaterial map={inside.right} roughness={0.85} />
      </mesh>
      {/* Spine */}
      <mesh position={[-BOOK_W / 2, BOOK_T / 2, 0]}>
        <boxGeometry args={[0.004, BOOK_T, BOOK_D]} />
        <meshStandardMaterial color="#c52a22" roughness={0.6} />
      </mesh>
      <group position={[-BOOK_W / 2, BOOK_T - 0.002, 0]} rotation={[0, 0, coverOpen * Math.PI]}>
        <mesh position={[BOOK_W / 2, 0, 0]}>
          <boxGeometry args={[BOOK_W, 0.004, BOOK_D]} />
          <meshStandardMaterial color="#f6f2ea" roughness={0.55} />
        </mesh>
        <mesh position={[BOOK_W / 2, 0.0021, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[BOOK_W - 0.002, BOOK_D - 0.002]} />
          <meshStandardMaterial map={cover} roughness={0.45} />
        </mesh>
        {/* Inside of the cover: the library pocket */}
        <mesh position={[BOOK_W / 2, -0.0021, 0]} rotation={[Math.PI / 2, 0, Math.PI]}>
          <planeGeometry args={[BOOK_W - 0.004, BOOK_D - 0.004]} />
          <meshStandardMaterial map={inside.left} roughness={0.85} />
        </mesh>
      </group>
    </group>
  );
}

/** The closed library book lying on the rug. */
export function ISpyBookProp({ hovered, hidden }: { hovered: boolean; hidden: boolean }) {
  const target = useMemo(() => ({ id: 'ispy-book', kind: 'prop' as const, label: 'I Spy book', hint: 'Memory card' }), []);
  if (hidden) return null;
  return (
    <group position={[BOOK_SPOT.x, 0.005, BOOK_SPOT.z]} rotation={[0, BOOK_SPOT.rotY, 0]}>
      <mesh position={[0, BOOK_T / 2, 0]} userData={{ interactable: target, volume: BOOK_W * BOOK_D * BOOK_T }}>
        <boxGeometry args={[BOOK_W + 0.04, BOOK_T + 0.02, BOOK_D + 0.04]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <BookBody />
      {hovered && <pointLight position={[0, 0.25, 0]} color="#fff2c4" intensity={0.5} distance={0.8} decay={2} />}
    </group>
  );
}

const POPUPS = [
  { x: 0.0, z: -0.07, w: 0.15, h: 0.15, kind: 0 },
  { x: -0.06, z: 0.02, w: 0.08, h: 0.08, kind: 1 },
  { x: 0.065, z: 0.0, w: 0.08, h: 0.08, kind: 2 },
  { x: -0.045, z: 0.09, w: 0.08, h: 0.08, kind: 3 },
  { x: 0.055, z: 0.095, w: 0.08, h: 0.08, kind: 4 },
];

/** The book opening on the rug, pop-ups and all. */
function OpeningBook({ t }: { t: React.MutableRefObject<number> }) {
  const coverGroup = useRef<THREE.Group>(null);
  const pops = useRef<(THREE.Group | null)[]>([]);
  const textures = useMemo(() => POPUPS.map(p => popupTexture(p.kind)), []);
  const popped = useRef(0);
  const [cover, setCover] = useState(0);
  useEffect(() => () => textures.forEach(tex => tex.dispose()), [textures]);
  useFrame(() => {
    const time = t.current;
    const open = THREE.MathUtils.clamp((time - 0.7) / 1.0, 0, 1);
    const eased = open * open * (3 - 2 * open);
    if (Math.abs(eased - cover) > 0.002) setCover(eased);
    POPUPS.forEach((_, i) => {
      const g = pops.current[i];
      if (!g) return;
      const k = THREE.MathUtils.clamp((time - 1.5 - i * 0.18) / 0.45, 0, 1);
      // Spring past upright and settle, like card stock.
      const spring = k >= 1 ? 1 : 1 - Math.cos(k * Math.PI * 1.5) * (1 - k);
      g.rotation.x = -Math.PI / 2 + (Math.PI / 2) * Math.min(1.12, spring);
      g.visible = time > 1.4;
      if (k > 0 && popped.current <= i) {
        popped.current = i + 1;
        ispySfx.pop(i);
      }
    });
    if (!ispy.bookReady && time > 2.8) {
      ispy.bookReady = true;
      emit();
    }
  });
  return (
    <group position={[BOOK_SPOT.x, 0.005, BOOK_SPOT.z]} rotation={[0, BOOK_SPOT.rotY, 0]}>
      <group ref={coverGroup}>
        <BookBody coverOpen={cover} />
      </group>
      {POPUPS.map((p, i) => (
        <group key={i} position={[p.x, 0.02, p.z + p.h * 0]} ref={el => (pops.current[i] = el)}>
          <mesh position={[0, p.h / 2, 0]}>
            <planeGeometry args={[p.w, p.h]} />
            <meshStandardMaterial map={textures[i]} transparent alphaTest={0.05} side={THREE.DoubleSide} roughness={0.9} />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 0.35, 0.1]} color="#fff2d6" intensity={0.9} distance={1.2} decay={2} />
    </group>
  );
}

// ---------------------------------------------------------------------------
// The kid you play as: about 12 cm tall, holding a magnifying glass.

const KID_H = 0.12;
const KID_R = 0.022;

function makeKid() {
  const root = new THREE.Group();
  const mat = (color: string, rough = 0.6) => new THREE.MeshStandardMaterial({ color, roughness: rough });
  const skin = mat('#e9b48a');
  const shirt = mat('#e94b3c');
  const jeans = mat('#3557a8');
  const cap = mat('#2f6fd6');
  const shoe = mat('#f6f2e9');
  const hip = new THREE.Group();
  hip.position.y = 0.046;
  root.add(hip);
  const leg = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.009, 0, 0);
    const l = new THREE.Mesh(new THREE.CapsuleGeometry(0.0065, 0.03, 4, 8), jeans);
    l.position.y = -0.021;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.02), shoe);
    s.position.set(0, -0.042, 0.004);
    pivot.add(l, s);
    hip.add(pivot);
    return pivot;
  };
  const legL = leg(-1);
  const legR = leg(1);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.028, 4, 10), shirt);
  body.position.y = 0.025;
  hip.add(body);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.0165, 0.0165, 0.006, 12), mat('#f6d32d'));
  stripe.position.y = 0.028;
  hip.add(stripe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), skin);
  head.position.y = 0.066;
  hip.add(head);
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.0185, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), cap);
  capTop.position.y = 0.07;
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.002, 0.016), cap);
  brim.position.set(0, 0.071, 0.02);
  hip.add(capTop, brim);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 8, 6), mat('#1d1b22'));
    eye.position.set(side * 0.006, 0.066, 0.0165);
    hip.add(eye);
  }
  const arm = (side: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.02, 0.04, 0);
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.005, 0.024, 4, 8), shirt);
    a.position.y = -0.014;
    pivot.add(a);
    hip.add(pivot);
    return pivot;
  };
  const armL = arm(-1);
  const armR = arm(1);
  // The magnifying glass in the right hand.
  const glass = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0018, 8, 20), mat('#222', 0.3));
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.011, 20), new THREE.MeshStandardMaterial({ color: '#bfe3ff', transparent: true, opacity: 0.45, roughness: 0.05 }));
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.0025, 0.018, 8), mat('#8a5a33'));
  handle.position.y = -0.02;
  glass.add(ring, lens, handle);
  glass.position.set(0, -0.034, 0.012);
  armR.add(glass);
  armR.rotation.x = -0.9;
  root.traverse(o => {
    o.castShadow = false;
  });
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.3, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.0015;
  root.add(blob);
  return { root, hip, legL, legR, armL, armR };
}

// ---------------------------------------------------------------------------
// Sparkles: the stars from Cake Jam, popping off whatever you found.

const starFrames = (() => {
  let frames: THREE.Texture[] | null = null;
  return () => {
    if (!frames) {
      const loader = new THREE.TextureLoader();
      frames = [1, 2, 3, 4].map(i => {
        const tex = loader.load(`/ispy/stars-${i % 2 ? 'left' : 'right'}-${i}.webp`);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      });
    }
    return frames;
  };
})();

interface Sparkle {
  sprite: THREE.Sprite;
  age: number;
  life: number;
  item: number;
}

// ---------------------------------------------------------------------------

const _v = new THREE.Vector3();
const _look = new THREE.Vector3();
const _want = new THREE.Vector3();
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

interface ToyNode {
  root: THREE.Group;
  baseY: number;
  wobble: number;
  foundAt: number;
}

function ISpyScene({ boot }: { boot: ISpyBoot | null }) {
  const { camera, size, gl, scene } = useThree();
  const state = useISpy();
  const puzzle = state.puzzle;
  const kid = useMemo(makeKid, []);
  const toysGroup = useRef<THREE.Group>(null);
  const sparkleGroup = useRef<THREE.Group>(null);
  const keys = useRef<Record<string, boolean>>({});
  const drag = useRef({ on: false, x: 0, y: 0, sx: 0, sy: 0, moved: 0, dx: 0, dy: 0, at: 0 });
  const saved = useRef<{ near: number; fov: number } | null>(null);
  const bookT = useRef(0);
  const darkT = useRef(0);
  const player = useRef({ x: START.x, z: START.z, heading: START.heading, speed: 0, walk: 0, pitch: -0.25 });
  const free = useRef({ pos: new THREE.Vector3(), yaw: 0, pitch: -0.6, ready: false });
  const camPos = useRef(new THREE.Vector3());
  const camLook = useRef(new THREE.Vector3());
  const camReady = useRef(false);
  const glide = useRef({ t: 0, from: new THREE.Vector3(), look: new THREE.Vector3() });
  const toys = useRef<Map<number, ToyNode>>(new Map());
  const sparkles = useRef<Sparkle[]>([]);
  const hintFor = useRef<{ id: number; until: number } | null>(null);
  const lastEmit = useRef(0);
  const madeSeed = useRef<number | null>(null);

  // Mount: page straight away for a boot link, otherwise the book opens.
  useEffect(() => {
    ispy.found = new Set();
    ispy.puzzle = null;
    ispy.bookReady = false;
    ispy.cam = boot?.cam ?? 'chase';
    ispy.pages = readNum(PAGES_KEY) ?? 0;
    ispy.banner = null;
    document.exitPointerLock?.();
    if (boot) startPage(boot.difficulty, boot.seed ?? undefined);
    else {
      ispy.phase = 'book';
      ispySfx.open();
      emit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build the page's toys and carpet when a new puzzle lands.
  const carpet = useMemo(() => (puzzle ? carpetTexture(puzzle.theme.carpet, puzzle.seed) : null), [puzzle]);
  useEffect(() => () => carpet?.dispose(), [carpet]);
  useEffect(() => {
    const g = toysGroup.current;
    if (!g || !puzzle) return;
    const map = new Map<number, ToyNode>();
    for (const item of puzzle.items) {
      const { object } = makeToy(item.kind, item.color, item.label, item.tip);
      const root = new THREE.Group();
      root.add(object);
      root.position.set(item.x, 0.004, item.z);
      root.rotation.y = item.yaw;
      root.scale.setScalar(item.scale);
      root.userData.ispyId = item.id;
      g.add(root);
      map.set(item.id, { root, baseY: 0.004, wobble: 0, foundAt: -1 });
    }
    toys.current = map;
    return () => {
      for (const node of map.values()) g.remove(node.root);
    };
  }, [puzzle]);

  // Leaving: camera back to normal, stand by the book.
  useEffect(() => {
    const canvas = gl.domElement;
    return () => {
      const persp = camera as THREE.PerspectiveCamera;
      if (saved.current) {
        persp.near = saved.current.near;
        persp.fov = saved.current.fov;
        persp.updateProjectionMatrix();
      }
      camera.up.set(0, 1, 0);
      canvas.style.cursor = '';
      walkRig.teleport = { at: [BOOK_SPOT.x + 0.35, 1.45, BOOK_SPOT.z + 0.75], look: [BOOK_SPOT.x, 0, BOOK_SPOT.z] };
      ispy.phase = 'off';
      ispy.puzzle = null;
      ispy.banner = null;
      emit();
    };
  }, [camera, gl]);

  function sparkleAt(id: number, count = 3, life = 0.9) {
    const node = toys.current.get(id);
    const group = sparkleGroup.current;
    if (!node || !group) return;
    const frames = starFrames();
    for (let i = 0; i < count; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: frames[0], transparent: true, depthWrite: false, depthTest: false, color: '#fff6c8' }));
      const s = 0.05 + Math.random() * 0.04;
      sprite.scale.set(s, s, s);
      sprite.position.set(node.root.position.x + (Math.random() - 0.5) * 0.06, 0.05 + Math.random() * 0.05, node.root.position.z + (Math.random() - 0.5) * 0.06);
      sprite.renderOrder = 5;
      group.add(sprite);
      sparkles.current.push({ sprite, age: -i * 0.12, life, item: id });
    }
  }

  function hint() {
    const p = ispy.puzzle;
    if (!p || ispy.phase !== 'play') return;
    const left = p.targets.filter(id => !ispy.found.has(id));
    if (!left.length) return;
    // Nudge toward the closest one you haven't found.
    const me = player.current;
    left.sort((a, b) => Math.hypot(p.items[a].x - me.x, p.items[a].z - me.z) - Math.hypot(p.items[b].x - me.x, p.items[b].z - me.z));
    hintFor.current = { id: left[0], until: performance.now() + 3200 };
    ispy.hints += 1;
    ispySfx.hint();
    banner('Psst... over here', 'The librarian adds 25¢ to your late fee', 2);
  }

  function pickAt(clientX: number, clientY: number) {
    const p = ispy.puzzle;
    const g = toysGroup.current;
    if (!p || !g || ispy.phase !== 'play') return;
    const rect = gl.domElement.getBoundingClientRect();
    _ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    _ray.setFromCamera(_ndc, camera);
    const hits = _ray.intersectObjects(g.children, true);
    let id: number | null = null;
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && o.userData.ispyId === undefined) o = o.parent;
      if (o) {
        id = o.userData.ispyId as number;
        break;
      }
    }
    if (id === null) return;
    const line = p.targets.indexOf(id);
    const item = p.items[id];
    const node = toys.current.get(id);
    if (line >= 0) {
      if (ispy.found.has(id)) return;
      ispy.found.add(id);
      ispy.lastLine = line;
      if (node) node.foundAt = performance.now();
      sparkleAt(id, 4);
      ispySfx.found(KINDS[item.kind].sfx);
      if (hintFor.current?.id === id) hintFor.current = null;
      if (ispy.found.size === p.targets.length) finishPage();
      else banner('I spy it!', p.phrases[line], 1.6);
    } else {
      if (node) node.wobble = 1;
      ispy.wrong += 1;
      ispySfx.wrong();
      const same = p.items.filter(o => o.kind === item.kind).length > 1;
      banner('Nope!', `That's ${phraseFor(item, same)}. Not on the list.`, 1.6);
    }
    emit();
  }

  function finishPage() {
    ispy.phase = 'done';
    ispy.pages += 1;
    saveNum(PAGES_KEY, ispy.pages);
    const key = BEST_KEY + ispy.difficulty;
    const best = readNum(key);
    if (best === null || ispy.time < best) saveNum(key, ispy.time);
    ispy.best = best === null ? ispy.time : Math.min(best, ispy.time);
    ispySfx.done();
    window.setTimeout(() => ispySfx.stamp(), 900);
  }

  useEffect(() => {
    const typing = (e: KeyboardEvent) => Boolean((e.target as HTMLElement | null)?.closest('input, textarea, select'));
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      wakeISpyAudio();
      keys.current[e.code] = true;
      if (e.repeat) return;
      if (e.code === 'KeyC' || e.code === 'KeyV') cycleCam();
      if (e.code === 'KeyH') hint();
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const blur = () => {
      keys.current = {};
    };
    const pDown = (e: PointerEvent) => {
      if (!(e.target instanceof HTMLCanvasElement)) return;
      wakeISpyAudio();
      const d = drag.current;
      d.on = true;
      d.x = d.sx = e.clientX;
      d.y = d.sy = e.clientY;
      d.moved = 0;
      d.at = performance.now();
    };
    const pMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d.on) return;
      d.dx += (e.clientX - d.x) * 0.0055;
      d.dy += (e.clientY - d.y) * 0.0045;
      d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.sx, e.clientY - d.sy));
      d.x = e.clientX;
      d.y = e.clientY;
    };
    const pUp = (e: PointerEvent) => {
      const d = drag.current;
      if (!d.on) return;
      d.on = false;
      // A tap, not a drag: that's a pick.
      if (d.moved < 7 && performance.now() - d.at < 600) pickAt(e.clientX, e.clientY);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    window.addEventListener('pointerdown', pDown);
    window.addEventListener('pointermove', pMove);
    window.addEventListener('pointerup', pUp);
    window.addEventListener('pointercancel', pUp);
    actions.hint = hint;
    if (import.meta.env.DEV) (window as unknown as { __ispy: unknown }).__ispy = { ispy, player, toys, pickAt, startPage, camera };
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      window.removeEventListener('pointerdown', pDown);
      window.removeEventListener('pointermove', pMove);
      window.removeEventListener('pointerup', pUp);
      window.removeEventListener('pointercancel', pUp);
      actions.hint = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scene.add(kid.root);
    return () => {
      scene.remove(kid.root);
    };
  }, [scene, kid]);

  useFrame((_, rawDt) => {
    try {
      frame(Math.min(rawDt, 0.05));
    } catch (err) {
      console.error('[ispy] frame failed', err);
    }
  });

  function frame(dt: number) {
    const persp = camera as THREE.PerspectiveCamera;
    if (!saved.current) {
      saved.current = { near: persp.near, fov: persp.fov };
      glide.current.from.copy(camera.position);
      camera.getWorldDirection(_look);
      glide.current.look.copy(camera.position).addScaledVector(_look, 1);
    }
    const k = keys.current;
    const d = drag.current;
    const nudgeX = d.dx;
    const nudgeY = d.dy;
    d.dx = 0;
    d.dy = 0;
    const phase = ispy.phase;

    // --- The book opens -----------------------------------------------------
    if (phase === 'book') {
      bookT.current += dt;
      const g = glide.current;
      g.t = Math.min(1, g.t + dt / 1.6);
      const e = g.t * g.t * (3 - 2 * g.t);
      const c = Math.cos(BOOK_SPOT.rotY);
      const s = Math.sin(BOOK_SPOT.rotY);
      // Kneel down over the book, a little toward its bottom edge.
      _want.set(BOOK_SPOT.x + s * 0.3, 0.42, BOOK_SPOT.z + c * 0.3);
      _look.set(BOOK_SPOT.x - s * 0.02, 0.03, BOOK_SPOT.z - c * 0.02);
      camera.position.lerpVectors(g.from, _want, e);
      _v.lerpVectors(g.look, _look, e);
      camera.up.set(0, 1, 0);
      camera.lookAt(_v);
      throttleEmit();
      return;
    }

    // --- Eyes shut: build the page behind the black -------------------------
    if (phase === 'dark') {
      darkT.current += dt;
      if (madeSeed.current !== next.seed && darkT.current > 0.45) {
        madeSeed.current = next.seed;
        ispy.puzzle = makePuzzle(next.seed, next.difficulty);
        ispy.found = new Set();
        ispy.wrong = 0;
        ispy.hints = 0;
        ispy.time = 0;
        ispy.lastLine = -1;
        ispy.best = readNum(BEST_KEY + next.difficulty);
        hintFor.current = null;
        Object.assign(player.current, { x: START.x, z: START.z, heading: START.heading, speed: 0, pitch: -0.25 });
        free.current.ready = false;
        camReady.current = false;
        for (const sp of sparkles.current) sp.sprite.removeFromParent();
        sparkles.current = [];
        emit();
      }
      const count = Math.max(0, 3 - Math.floor((darkT.current - 0.5) / 0.75));
      if (count !== ispy.count) {
        ispy.count = count;
        emit();
      }
      if (darkT.current > 2.9 && ispy.puzzle) {
        darkT.current = 0;
        ispy.phase = 'play';
        ispySfx.eyesOpen();
        banner('Open your eyes!', ispy.puzzle.theme.title, 2.4);
      }
    } else {
      darkT.current = 0;
    }

    const p = ispy.puzzle;
    if (!p) return;
    if (phase === 'play') ispy.time += dt;

    // --- Walk -------------------------------------------------------------------
    const me = player.current;
    const cam = ispy.cam;
    const fwdIn = (k.KeyW || k.ArrowUp || touch.fwd ? 1 : 0) - (k.KeyS || k.ArrowDown || touch.back ? 1 : 0);
    const turnIn = (k.KeyD || k.ArrowRight || touch.right ? 1 : 0) - (k.KeyA || k.ArrowLeft || touch.left ? 1 : 0);
    const strafeIn = (k.KeyE ? 1 : 0) - (k.KeyQ ? 1 : 0);
    const flying = cam === 'free';
    if (!flying && phase !== 'dark') {
      const run = Boolean(k.ShiftLeft || k.ShiftRight);
      me.heading = wrap(me.heading - turnIn * 2.4 * dt - nudgeX);
      if (cam === 'first') me.pitch = THREE.MathUtils.clamp(me.pitch - nudgeY, -1.2, 0.5);
      const top = run ? 0.75 : 0.32;
      const want = fwdIn > 0 ? fwdIn * top : fwdIn * 0.18;
      me.speed += (want - me.speed) * Math.min(1, dt * 9);
      const s = Math.sin(me.heading);
      const c = Math.cos(me.heading);
      me.x += s * me.speed * dt - c * strafeIn * 0.2 * dt;
      me.z += c * me.speed * dt + s * strafeIn * 0.2 * dt;
      // Bump off the bigger toys.
      for (const item of p.items) {
        if (item.radius < 0.016) continue;
        const dx = me.x - item.x;
        const dz = me.z - item.z;
        const dist = Math.hypot(dx, dz);
        const min = item.radius + KID_R;
        if (dist < min && dist > 1e-5) {
          me.x = item.x + (dx / dist) * min;
          me.z = item.z + (dz / dist) * min;
        }
      }
      me.x = THREE.MathUtils.clamp(me.x, CARPET.x - CARPET.w / 2 + 0.05, CARPET.x + CARPET.w / 2 - 0.05);
      me.z = THREE.MathUtils.clamp(me.z, CARPET.z - CARPET.d / 2 + 0.05, CARPET.z + CARPET.d / 2 - 0.05);
    } else {
      me.speed = 0;
    }
    me.walk += Math.abs(me.speed) * dt * 55;
    kid.root.position.set(me.x, 0.004, me.z);
    kid.root.rotation.y = me.heading;
    const swing = Math.sin(me.walk) * Math.min(1, Math.abs(me.speed) * 4) * 0.7;
    kid.legL.rotation.x = swing;
    kid.legR.rotation.x = -swing;
    kid.armL.rotation.x = -swing * 0.8;
    kid.hip.position.y = 0.046 + Math.abs(Math.sin(me.walk)) * Math.min(1, Math.abs(me.speed) * 4) * 0.004;

    // --- Toys: found ones pop and spin, wrong ones wobble, the hint glows ------
    const now = performance.now();
    for (const [id, node] of toys.current) {
      if (node.foundAt > 0) {
        const t = (now - node.foundAt) / 1000;
        const up = t < 0.9 ? Math.sin((t / 0.9) * Math.PI) * 0.06 : 0;
        node.root.position.y = node.baseY + up;
        if (t < 0.9) node.root.rotation.y = p.items[id].yaw + (t / 0.9) * Math.PI * 2;
      }
      if (node.wobble > 0) {
        node.wobble = Math.max(0, node.wobble - dt * 2.5);
        node.root.rotation.z = Math.sin(node.wobble * 30) * 0.18 * node.wobble;
      }
    }
    const h = hintFor.current;
    if (h) {
      if (now > h.until) hintFor.current = null;
      else if (Math.floor(now / 380) !== Math.floor((now - dt * 1000) / 380)) sparkleAt(h.id, 2, 0.6);
    }
    for (let i = sparkles.current.length - 1; i >= 0; i--) {
      const sp = sparkles.current[i];
      sp.age += dt;
      sp.sprite.visible = sp.age >= 0;
      if (sp.age < 0) continue;
      const f = sp.age / sp.life;
      const frames = starFrames();
      (sp.sprite.material as THREE.SpriteMaterial).map = frames[Math.min(3, Math.floor(f * 4))];
      (sp.sprite.material as THREE.SpriteMaterial).opacity = 1 - Math.max(0, f - 0.6) / 0.4;
      sp.sprite.position.y += dt * 0.05;
      if (f >= 1) {
        sp.sprite.removeFromParent();
        sp.sprite.material.dispose();
        sparkles.current.splice(i, 1);
      }
    }

    // --- Camera -------------------------------------------------------------------
    const fx = Math.sin(me.heading);
    const fz = Math.cos(me.heading);
    kid.root.visible = cam !== 'first';
    if (flying) {
      const f = free.current;
      if (!f.ready) {
        f.pos.copy(camera.position);
        camera.getWorldDirection(_v);
        f.yaw = Math.atan2(_v.x, _v.z);
        f.pitch = Math.asin(THREE.MathUtils.clamp(_v.y, -1, 1));
        f.ready = true;
      }
      f.yaw = wrap(f.yaw - nudgeX - turnIn * 1.8 * dt);
      f.pitch = THREE.MathUtils.clamp(f.pitch - nudgeY, -1.5, 1.2);
      const speed = k.ShiftLeft || k.ShiftRight ? 2.2 : 0.9;
      const dir = _v.set(Math.sin(f.yaw) * Math.cos(f.pitch), Math.sin(f.pitch), Math.cos(f.yaw) * Math.cos(f.pitch));
      f.pos.addScaledVector(dir, fwdIn * speed * dt);
      f.pos.x += Math.cos(f.yaw) * -strafeIn * speed * dt;
      f.pos.z += -Math.sin(f.yaw) * -strafeIn * speed * dt;
      f.pos.y += ((k.Space || touch.up ? 1 : 0) - (k.ControlLeft || k.KeyX || touch.down ? 1 : 0)) * speed * 0.7 * dt;
      f.pos.x = THREE.MathUtils.clamp(f.pos.x, WEST_X + 0.12, EAST_X - 0.12);
      f.pos.z = THREE.MathUtils.clamp(f.pos.z, NORTH_Z + 0.12, SOUTH_Z - 0.12);
      f.pos.y = THREE.MathUtils.clamp(f.pos.y, 0.03, WALL.height - 0.1);
      camera.position.copy(f.pos);
      camera.up.set(0, 1, 0);
      camera.lookAt(_look.copy(f.pos).add(dir));
      camReady.current = false;
    } else {
      free.current.ready = false;
      if (cam === 'first') {
        _want.set(me.x + fx * 0.012, KID_H * 0.88, me.z + fz * 0.012);
        _look.set(_want.x + fx * Math.cos(me.pitch), _want.y + Math.sin(me.pitch), _want.z + fz * Math.cos(me.pitch));
      } else if (cam === 'birdseye') {
        _want.set(me.x - fx * 0.45, 1.05, me.z - fz * 0.45);
        _look.set(me.x + fx * 0.25, 0, me.z + fz * 0.25);
      } else {
        _want.set(me.x - fx * 0.36, 0.27, me.z - fz * 0.36);
        _look.set(me.x + fx * 0.4, 0.0, me.z + fz * 0.4);
      }
      if (!camReady.current || cam === 'first') {
        camPos.current.copy(_want);
        camLook.current.copy(_look);
      } else {
        const a = 1 - Math.exp(-dt * 8);
        camPos.current.lerp(_want, a);
        camLook.current.lerp(_look, Math.min(1, a * 1.5));
      }
      camReady.current = true;
      camera.position.copy(camPos.current);
      camera.up.set(0, 1, 0);
      camera.lookAt(camLook.current);
    }
    const near = cam === 'birdseye' || cam === 'free' ? 0.02 : 0.005;
    const fov = fitFov(cam === 'first' ? 74 : 64, size.width / Math.max(1, size.height), 1.5, 100);
    if (persp.near !== near || Math.abs(persp.fov - fov) > 0.1) {
      persp.near = near;
      persp.fov = fov;
      persp.updateProjectionMatrix();
    }
    throttleEmit();
  }

  function throttleEmit() {
    const now = performance.now();
    if (now - lastEmit.current > 100) {
      lastEmit.current = now;
      if (ispy.banner && now > ispy.banner.until) ispy.banner = null;
      emit();
    }
  }

  const theme = puzzle?.theme;
  const showPage = puzzle && state.phase !== 'book';
  return (
    <group>
      {state.phase === 'book' && <OpeningBook t={bookT} />}
      {showPage && carpet && theme && (
        <>
          <mesh position={[CARPET.x, 0.003, CARPET.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[CARPET.w, CARPET.d]} />
            <meshStandardMaterial map={carpet} roughness={0.95} />
          </mesh>
          {/* The lamp pulled down over the carpet, tinted for the page. */}
          <pointLight position={[CARPET.x, 1.5, CARPET.z]} color={theme.light} intensity={theme.dim ? 3.2 : 1.6} distance={4.6} decay={1.6} />
          <pointLight position={[CARPET.x - 0.9, 0.9, CARPET.z + 0.9]} color={theme.light} intensity={theme.dim ? 1.2 : 0.6} distance={2.6} decay={2} />
          {theme.dim && <ambientLight intensity={0.28} color={theme.light} />}
        </>
      )}
      <group ref={toysGroup} visible={Boolean(showPage)} />
      <group ref={sparkleGroup} />
    </group>
  );
}

export function ISpyWorld({ boot }: { boot: ISpyBoot | null }) {
  useEffect(() => {
    const life = openMiniGame('ispy');
    return () => life.close();
  }, []);
  return <ISpyScene boot={boot} />;
}

// ---------------------------------------------------------------------------
// HUD

const CAM_LABEL: Record<ISpyCam, string> = {
  chase: 'Third person',
  first: 'First person',
  birdseye: "Bird's-eye",
  free: 'Free roam',
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds - m * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function HoldButton({ label, onHold, className = '' }: { label: string; onHold: (on: boolean) => void; className?: string }) {
  return (
    <button
      type="button"
      className={`pointer-events-auto select-none touch-none rounded-2xl border border-white/25 bg-black/55 text-sm font-black uppercase text-white active:bg-sky-600/70 ${className}`}
      onPointerDown={e => {
        e.preventDefault();
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

const LEVEL_INFO: Record<Difficulty, { label: string; blurb: string; tone: string }> = {
  easy: { label: 'Easy', blurb: 'Big toys, short riddle', tone: 'bg-emerald-400 text-black' },
  medium: { label: 'Medium', blurb: 'Look-alikes sneak in', tone: 'bg-amber-400 text-black' },
  hard: { label: 'Hard', blurb: 'Tiny, tipped over, everywhere', tone: 'bg-rose-500 text-white' },
};

function LevelButtons({ onPick, compact = false }: { onPick: (d: Difficulty) => void; compact?: boolean }) {
  return (
    <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-3'}`}>
      {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
        <button
          key={d}
          type="button"
          onClick={() => onPick(d)}
          className={`rounded-2xl px-3 py-3 text-left shadow-lg transition hover:scale-[1.03] ${LEVEL_INFO[d].tone}`}
        >
          <p className="text-lg font-black uppercase leading-none">{LEVEL_INFO[d].label}</p>
          {!compact && (
            <>
              <p className="mt-1 text-[12px] font-bold leading-tight opacity-80">{LEVEL_INFO[d].blurb}</p>
              <p className="mt-1 text-[10px] font-bold uppercase leading-tight opacity-70">
                {RULES[d].targets} to find · {themesFor(d).map(t => t.title.replace('I Spy ', '')).join(', ')}
              </p>
            </>
          )}
        </button>
      ))}
    </div>
  );
}

/** One riddle line, struck through with Cake Jam's blue pen once found. */
function RiddleLine({ text, found, index, fresh }: { text: string; found: boolean; index: number; fresh: boolean }) {
  return (
    <li className="relative w-fit">
      <span className={found ? 'text-white/45' : ''}>{text}</span>
      {found && (
        <img
          src={`/ispy/strike-${(index % 5) + 1}.webp`}
          alt=""
          className="pointer-events-none absolute left-0 top-1/2 h-3 w-full -translate-y-1/2 object-fill opacity-90"
        />
      )}
      {fresh && (
        <span className="pointer-events-none absolute -right-7 -top-3 flex">
          <img src="/ispy/stars-left-2.webp" alt="" className="h-7 w-7 animate-ping" />
        </span>
      )}
    </li>
  );
}

export function ISpyHud({ onExit }: { onExit: () => void }) {
  const s = useISpy();
  const [isTouch] = useState(isTouchDevice);
  const p = s.puzzle;
  const btn = 'rounded-xl border border-white/25 bg-black/55 px-3 py-2 text-[11px] font-bold uppercase tracking-wider';

  if (s.phase === 'off') return null;

  if (s.phase === 'book') {
    return (
      <div data-ispy="book" className="pointer-events-none absolute inset-0 z-40 text-white">
        <div className="pointer-events-auto absolute left-4 top-4">
          <button type="button" onClick={onExit} className="rounded-xl bg-white/90 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-black">
            Close the book
          </button>
        </div>
        {s.bookReady && (
          <div className="pointer-events-auto absolute bottom-6 left-1/2 w-[min(92vw,640px)] -translate-x-1/2 rounded-3xl border-4 border-[#f5f0e2] bg-[#16131c]/92 p-4 text-center shadow-2xl">
            <p className="font-serif text-3xl font-black tracking-wide text-[#f5f0e2]">I SPY</p>
            <p className="mb-3 font-serif text-sm italic text-white/75">Pick a page. It's a brand new one every time you open the book.</p>
            <LevelButtons onPick={d => startPage(d)} />
          </div>
        )}
      </div>
    );
  }

  if (s.phase === 'dark') {
    return (
      <div data-ispy="dark" className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black text-white" style={{ animation: 'ispyFadeIn 0.35s ease-out' }}>
        <style>{'@keyframes ispyFadeIn{from{opacity:0}to{opacity:1}}'}</style>
        <p className="text-7xl">🙈</p>
        <p className="mt-4 text-4xl font-black uppercase tracking-wider">No peeking!</p>
        <p className="mt-2 font-serif text-lg italic text-white/70">Close your eyes... the toys are getting dumped out</p>
        <p className="mt-6 font-mono text-6xl font-black text-amber-300">{s.count > 0 ? s.count : '👀'}</p>
      </div>
    );
  }

  if (!p) return null;
  const fee = lateFee() + s.hints * 0.25 + s.wrong * 0.05;
  const done = s.phase === 'done';
  return (
    <div data-ispy="play" className="pointer-events-none absolute inset-0 z-40 text-white">
      <div className="pointer-events-auto absolute left-4 top-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onExit} className="rounded-xl bg-white/90 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-black">
          Close the book
        </button>
        <button type="button" onClick={cycleCam} className={`${btn} text-sky-100`}>
          {CAM_LABEL[s.cam]}
        </button>
        {!done && (
          <button type="button" onClick={() => actions.hint?.()} className={`${btn} text-amber-200`}>
            Hint (H)
          </button>
        )}
      </div>

      {/* The riddle page */}
      <div className="pointer-events-auto absolute right-3 top-3 w-[min(86vw,330px)] rounded-2xl border-4 border-[#f5f0e2] bg-[#16131c]/90 px-4 py-3 font-serif shadow-2xl">
        <div className="flex items-baseline justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">{p.theme.title}</p>
          <p className="font-mono text-sm tabular-nums text-white/80">{formatTime(s.time)}</p>
        </div>
        <p className="mt-1 text-[13px] italic leading-snug text-white/70">{p.opener}</p>
        <p className="mt-1 text-[15px] font-bold">I spy</p>
        <ul className="mt-0.5 space-y-0.5 text-[14px] leading-snug">
          {p.phrases.slice(0, -1).map((phrase, i) => (
            <RiddleLine key={i} text={`${phrase},`} index={i} found={s.found.has(p.targets[i])} fresh={s.lastLine === i && !done} />
          ))}
          <RiddleLine
            text={p.closer}
            index={p.phrases.length - 1}
            found={s.found.has(p.targets[p.targets.length - 1])}
            fresh={s.lastLine === p.phrases.length - 1 && !done}
          />
        </ul>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/55">
          {s.found.size}/{p.targets.length} found · {LEVEL_INFO[s.difficulty].label} · page {s.pages + (done ? 0 : 1)}
        </p>
      </div>

      {s.banner && !done && (
        <div className="absolute left-1/2 top-[22%] -translate-x-1/2 text-center">
          <p className="whitespace-nowrap font-serif text-4xl font-black text-[#fff6c8] drop-shadow-[0_3px_0_rgba(0,0,0,0.75)] sm:text-5xl">{s.banner.text}</p>
          {s.banner.sub && <p className="mt-2 rounded-full bg-black/60 px-4 py-1 text-sm font-bold text-white/90">{s.banner.sub}</p>}
        </div>
      )}

      {done && (
        <div className="pointer-events-auto absolute left-1/2 top-1/2 w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border-4 border-[#b89c62] bg-[#f4ecd8] p-5 text-center text-[#3a2a1a] shadow-2xl">
          <p className="font-serif text-3xl font-black">You found them all!</p>
          <p className="mt-1 text-sm">
            {formatTime(s.time)}
            {s.best !== null ? ` · best on ${LEVEL_INFO[s.difficulty].label.toLowerCase()} ${formatTime(s.best)}` : ''} · {s.wrong} wrong · {s.hints} hints
          </p>
          <div className="relative mx-auto mt-3 w-fit -rotate-6 rounded-md border-4 border-[#c0201a] px-4 py-1 font-black uppercase tracking-widest text-[#c0201a]">
            Found! Still overdue
          </div>
          <p className="mt-3 font-serif text-[14px] italic leading-snug">
            The librarian says thanks for finding her book. Your late fee since October 1998 comes to <b>{money(fee)}</b>. She'll take it in Pogs.
          </p>
          <p className="mt-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#6b4e2a]">Turn the page</p>
          <div className="mt-2">
            <LevelButtons compact onPick={d => {
              ispySfx.pageTurn();
              startPage(d);
            }} />
          </div>
          <button type="button" onClick={onExit} className="mt-3 text-[12px] font-bold uppercase tracking-wider text-[#6b4e2a] underline">
            Close the book
          </button>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        {!isTouch && (
          <div className="rounded-full bg-black/60 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white/65">
            {s.cam === 'free'
              ? 'W/S fly · A/D turn · Q/E slide · Space up · Ctrl down · Shift fast · drag to look · click to pick · C camera'
              : 'W/S walk · A/D turn · Shift run · drag to turn · click a toy to pick it · H hint · C camera'}
          </div>
        )}
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
          {s.cam === 'free' && (
            <div className="absolute bottom-6 right-4 flex flex-col gap-2">
              <HoldButton label="Up" className="h-14 w-20" onHold={on => (touch.up = on)} />
              <HoldButton label="Down" className="h-14 w-20" onHold={on => (touch.down = on)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
