import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { sound } from '../utils/audio';

/**
 * The Rubik's Cube off the wall shelf, in your hands. Swipe a sticker to
 * turn that layer, drag the background to look around it, or use the face
 * buttons (and U D L R F B on a keyboard, Shift for the reverse turn).
 */

type Axis = 'x' | 'y' | 'z';
interface Move {
  axis: Axis;
  layer: number;
  dir: 1 | -1;
}

interface Cubie {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
}

const AXES: Record<Axis, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

// Classic scheme: white up, yellow down, green front, blue back, red right, orange left.
const FACES: { normal: [number, number, number]; color: string }[] = [
  { normal: [1, 0, 0], color: '#c41e2a' },
  { normal: [-1, 0, 0], color: '#ff7a00' },
  { normal: [0, 1, 0], color: '#f4f4f4' },
  { normal: [0, -1, 0], color: '#ffd400' },
  { normal: [0, 0, 1], color: '#009b48' },
  { normal: [0, 0, -1], color: '#0046ad' },
];

/** Face-turn notation, as seen from outside that face. */
const NOTATION: Record<string, Move> = {
  U: { axis: 'y', layer: 1, dir: -1 },
  D: { axis: 'y', layer: -1, dir: 1 },
  R: { axis: 'x', layer: 1, dir: -1 },
  L: { axis: 'x', layer: -1, dir: 1 },
  F: { axis: 'z', layer: 1, dir: -1 },
  B: { axis: 'z', layer: -1, dir: 1 },
};

const TURN_MS = 170;
const FAST_MS = 70;

function freshCubies(): Cubie[] {
  const out: Cubie[] = [];
  for (let x = -1; x <= 1; x += 1)
    for (let y = -1; y <= 1; y += 1)
      for (let z = -1; z <= 1; z += 1) {
        if (x === 0 && y === 0 && z === 0) continue;
        out.push({ pos: new THREE.Vector3(x, y, z), quat: new THREE.Quaternion() });
      }
  return out;
}

const Q = new THREE.Quaternion();
const V = new THREE.Vector3();

/** Every sticker pointing the same way has the same colour. */
function isSolved(cubies: Cubie[], home: THREE.Vector3[]) {
  const seen = new Map<string, string>();
  for (let i = 0; i < cubies.length; i += 1) {
    for (const face of FACES) {
      const [nx, ny, nz] = face.normal;
      // Only the stickers this cubie was born with.
      if ((nx && home[i].x !== nx) || (ny && home[i].y !== ny) || (nz && home[i].z !== nz)) continue;
      V.set(nx, ny, nz).applyQuaternion(cubies[i].quat);
      const key = `${Math.round(V.x)},${Math.round(V.y)},${Math.round(V.z)}`;
      const prev = seen.get(key);
      if (prev && prev !== face.color) return false;
      seen.set(key, face.color);
    }
  }
  return true;
}

interface CubeApi {
  turn: (move: Move, fast?: boolean) => void;
  reset: () => void;
  busy: () => boolean;
}

function Cube({
  api,
  onTurned,
  setOrbit,
}: {
  api: React.MutableRefObject<CubeApi | null>;
  onTurned: (solved: boolean) => void;
  setOrbit: (on: boolean) => void;
}) {
  const home = useMemo(() => freshCubies().map(c => c.pos.clone()), []);
  const cubies = useRef<Cubie[]>(freshCubies());
  const groups = useRef<(THREE.Group | null)[]>([]);
  const queue = useRef<{ move: Move; ms: number }[]>([]);
  const active = useRef<null | { move: Move; ms: number; t: number; members: number[] }>(null);
  const { camera, size } = useThree();
  const swipe = useRef<null | { index: number; normal: THREE.Vector3; x: number; y: number; done: boolean }>(null);

  const place = (i: number, q: THREE.Quaternion, p: THREE.Vector3) => {
    const g = groups.current[i];
    if (!g) return;
    g.position.copy(p);
    g.quaternion.copy(q);
  };

  useEffect(() => {
    cubies.current.forEach((c, i) => place(i, c.quat, c.pos));
    api.current = {
      turn: (move, fast) => queue.current.push({ move, ms: fast ? FAST_MS : TURN_MS }),
      reset: () => {
        queue.current = [];
        active.current = null;
        cubies.current = freshCubies();
        cubies.current.forEach((c, i) => place(i, c.quat, c.pos));
      },
      busy: () => active.current !== null || queue.current.length > 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    if (!active.current) {
      const next = queue.current.shift();
      if (!next) return;
      const axis = next.move.axis;
      active.current = {
        ...next,
        t: 0,
        members: cubies.current.flatMap((c, i) => (Math.round(c.pos[axis]) === next.move.layer ? [i] : [])),
      };
      if (next.ms === TURN_MS) sound.playMoveClack();
    }
    const run = active.current;
    run.t = Math.min(1, run.t + (delta * 1000) / run.ms);
    const eased = 1 - Math.pow(1 - run.t, 3);
    const angle = run.move.dir * (Math.PI / 2) * eased;
    Q.setFromAxisAngle(AXES[run.move.axis], angle);
    for (const i of run.members) {
      const c = cubies.current[i];
      place(i, Q.clone().multiply(c.quat), c.pos.clone().applyQuaternion(Q));
    }
    if (run.t >= 1) {
      // Bake the quarter turn into the state and snap to the grid.
      for (const i of run.members) {
        const c = cubies.current[i];
        c.pos.applyQuaternion(Q).round();
        c.quat.premultiply(Q).normalize();
        place(i, c.quat, c.pos);
      }
      active.current = null;
      if (queue.current.length === 0) onTurned(isSolved(cubies.current, home));
    }
  });

  // Which way did the finger go, in cube terms? Compare the swipe with the
  // on-screen directions of the two axes lying in the touched face.
  const screenDir = (from: THREE.Vector3, axis: THREE.Vector3) => {
    const a = from.clone().project(camera);
    const b = from.clone().add(axis).project(camera);
    return new THREE.Vector2((b.x - a.x) * size.width, -(b.y - a.y) * size.height);
  };

  const onDown = (e: ThreeEvent<PointerEvent>, index: number) => {
    e.stopPropagation();
    const n = (e.face?.normal ?? new THREE.Vector3(0, 0, 1)).clone().transformDirection(e.object.matrixWorld);
    // Rounded corners give slanted normals; keep the face the finger is mostly on.
    const ax = (['x', 'y', 'z'] as Axis[]).reduce((a, b) => (Math.abs(n[a]) >= Math.abs(n[b]) ? a : b));
    const snapped = new THREE.Vector3();
    snapped[ax] = Math.sign(n[ax]) || 1;
    swipe.current = { index, normal: snapped, x: e.clientX, y: e.clientY, done: false };
    setOrbit(false);
    (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    const move = (ev: PointerEvent) => {
      const s = swipe.current;
      if (!s || s.done) return;
      const drag = new THREE.Vector2(ev.clientX - s.x, ev.clientY - s.y);
      if (drag.length() < 14) return;
      s.done = true;
      const c = cubies.current[s.index];
      const centre = c.pos.clone();
      const tangents = (['x', 'y', 'z'] as Axis[]).filter(a => Math.abs(s.normal[a]) < 0.5).map(a => AXES[a]);
      let best = tangents[0];
      let bestDot = 0;
      for (const t of tangents) {
        const d = screenDir(centre, t).normalize().dot(drag.clone().normalize());
        if (Math.abs(d) > Math.abs(bestDot)) {
          bestDot = d;
          best = t;
        }
      }
      // The face point should move along ±best: rotate about normal × best.
      const w = s.normal.clone().cross(best).multiplyScalar(Math.sign(bestDot));
      const axis = (['x', 'y', 'z'] as Axis[]).reduce((a, b) => (Math.abs(w[a]) >= Math.abs(w[b]) ? a : b));
      const dir = (w[axis] > 0 ? 1 : -1) as 1 | -1;
      api.current?.turn({ axis, layer: Math.round(c.pos[axis]), dir });
    };
    const up = () => {
      if (swipe.current) {
        swipe.current = null;
        setOrbit(true);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size.width, size.height]);

  return (
    <group>
      {home.map((p, i) => (
        <group key={i} ref={el => (groups.current[i] = el)}>
          <RoundedBox args={[0.96, 0.96, 0.96]} radius={0.08} smoothness={3} onPointerDown={e => onDown(e, i)}>
            <meshStandardMaterial color="#111" roughness={0.45} />
          </RoundedBox>
          {FACES.map(face => {
            const [nx, ny, nz] = face.normal;
            if ((nx && p.x !== nx) || (ny && p.y !== ny) || (nz && p.z !== nz)) return null;
            const n = new THREE.Vector3(nx, ny, nz);
            const rot = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n));
            return (
              <mesh key={face.color} position={n.clone().multiplyScalar(0.485)} rotation={rot} onPointerDown={e => onDown(e, i)}>
                <planeGeometry args={[0.8, 0.8]} />
                <meshStandardMaterial color={face.color} roughness={0.35} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
}

const FACE_KEYS = ['U', 'D', 'L', 'R', 'F', 'B'] as const;

/** Colour of each face, the way the cube is stickered. Click the colour, not a letter. */
const FACE_COLORS: { key: (typeof FACE_KEYS)[number]; name: string; color: string; ink: string }[] = [
  { key: 'U', name: 'white', color: '#f4f4f4', ink: '#1a1a1a' },
  { key: 'D', name: 'yellow', color: '#ffd400', ink: '#1a1a1a' },
  { key: 'F', name: 'green', color: '#009b48', ink: '#f4fff6' },
  { key: 'B', name: 'blue', color: '#0046ad', ink: '#f4f7ff' },
  { key: 'L', name: 'orange', color: '#ff7a00', ink: '#1a1a1a' },
  { key: 'R', name: 'red', color: '#c41e2a', ink: '#fff5f5' },
];

/** Back the camera off on narrow screens so the whole cube fits across. */
function FitCube() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    const half = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const dist = Math.max(8, 2.7 / (half * Math.min(aspect, 1)));
    cam.position.setLength(dist);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

export function RubikPlay({ onClose }: { onClose: () => void }) {
  const api = useRef<CubeApi | null>(null);
  const [orbit, setOrbit] = useState(true);
  const [moves, setMoves] = useState(0);
  const [started, setStarted] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [solved, setSolved] = useState<null | { moves: number; secs: number }>(null);
  const scrambling = useRef(false);
  const scrambled = useRef(false);
  const movesRef = useRef(0);
  const startRef = useRef<number | null>(null);

  /** Your turns, newest last, so Undo can take them back one at a time. */
  const history = useRef<{ key: string; prime: boolean }[]>([]);
  const doTurn = useCallback(
    (key: string, prime: boolean, record = true) => {
      const m = NOTATION[key];
      if (!m || !api.current || scrambling.current) return;
      api.current.turn({ ...m, dir: (prime ? -m.dir : m.dir) as 1 | -1 });
      if (record) history.current.push({ key, prime });
    },
    [],
  );
  const undo = useCallback(() => {
    const last = history.current.pop();
    if (last) doTurn(last.key, !last.prime, false);
  }, [doTurn]);

  const onTurned = useCallback(
    (isDone: boolean) => {
      if (scrambling.current) {
        scrambling.current = false;
        scrambled.current = true;
        return;
      }
      movesRef.current += 1;
      setMoves(movesRef.current);
      if (startRef.current === null) {
        startRef.current = Date.now();
        setStarted(startRef.current);
      }
      if (isDone && scrambled.current) {
        scrambled.current = false;
        const secs = Math.round((Date.now() - startRef.current) / 1000);
        setSolved({ moves: movesRef.current, secs });
        startRef.current = null;
        setStarted(null);
        sound.playVictoryFanfare();
      }
    },
    [],
  );

  const scramble = () => {
    if (!api.current || api.current.busy()) return;
    history.current = [];
    setSolved(null);
    setMoves(0);
    movesRef.current = 0;
    startRef.current = null;
    setStarted(null);
    setElapsed(0);
    scrambling.current = true;
    let last = '';
    for (let i = 0; i < 22; i += 1) {
      let key = FACE_KEYS[Math.floor(Math.random() * 6)];
      while (key === last) key = FACE_KEYS[Math.floor(Math.random() * 6)];
      last = key;
      const m = NOTATION[key];
      api.current.turn({ ...m, dir: (Math.random() < 0.5 ? m.dir : -m.dir) as 1 | -1 }, true);
    }
  };

  const reset = () => {
    api.current?.reset();
    history.current = [];
    scrambling.current = false;
    scrambled.current = false;
    setSolved(null);
    setMoves(0);
    movesRef.current = 0;
    startRef.current = null;
    setStarted(null);
    setElapsed(0);
  };

  useEffect(() => {
    if (started === null) return;
    const t = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 250);
    return () => window.clearInterval(t);
  }, [started]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      const key = e.key.toUpperCase();
      if (NOTATION[key]) {
        e.preventDefault();
        doTurn(key, e.shiftKey);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doTurn, onClose, undo]);

  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  return (
    <div data-ui="rubik" className="absolute inset-0 z-50 flex flex-col bg-[#0d0812]/85 backdrop-blur-sm">
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div>
          <p className="font-display text-lg leading-none text-white">Rubik&rsquo;s Cube</p>
          <p className="mt-1 font-mono text-[11px] text-white/60">
            {moves} moves · {clock}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white hover:bg-black/80"
        >
          Put it down
        </button>
      </div>

      <div className="relative min-h-0 flex-1" style={{ touchAction: 'none' }}>
        <Canvas camera={{ position: [4.2, 3.6, 5.6], fov: 34 }} dpr={[1, 1.5]}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[4, 6, 5]} intensity={1.6} />
          <directionalLight position={[-5, -2, -4]} intensity={0.5} color="#ffb3f0" />
          <FitCube />
          <Cube api={api} onTurned={onTurned} setOrbit={setOrbit} />
          <OrbitControls enabled={orbit} enablePan={false} minDistance={5.5} maxDistance={20} />
        </Canvas>
        {solved && (
          <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center px-4">
            <div className="rounded-2xl border border-amber-200/50 bg-black/70 px-5 py-3 text-center">
              <p className="font-display text-2xl text-amber-200">Solved. Legit this time.</p>
              <p className="text-xs text-white/70">
                {solved.moves} moves in {Math.floor(solved.secs / 60)}:{String(solved.secs % 60).padStart(2, '0')} · no stickers were peeled
              </p>
            </div>
          </div>
        )}
        <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
          Swipe a sticker to turn · drag around it to look
        </p>
      </div>

      <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        {/* The standard notation pad, as on cube timers and simulators: each face's
            letter turns it clockwise, the primed one (′) the other way. */}
        <div className="mx-auto grid max-w-md grid-cols-6 gap-1.5">
          {[false, true].map(prime =>
            FACE_COLORS.map(face => (
              <button
                key={`${face.key}${prime ? "'" : ''}`}
                type="button"
                aria-label={`${face.key}${prime ? ' prime' : ''}: turn the ${face.name} face ${prime ? 'counter-clockwise' : 'clockwise'}`}
                onClick={() => doTurn(face.key, prime)}
                className="flex h-11 items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/[0.06] font-mono text-base font-black text-white hover:bg-white/15 active:scale-95"
                style={{ boxShadow: `inset 0 -4px 0 ${face.color}` }}
              >
                {face.key}
                {prime && <span className="text-sm">′</span>}
              </button>
            )),
          )}
        </div>
        <p className="mx-auto mt-1 max-w-md text-center font-mono text-[10px] text-white/45">
          Keys: U D L R F B · Shift for ′ · Ctrl+Z undo
        </p>
        <div className="mx-auto mt-2 grid max-w-md grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={scramble}
            className="rounded-lg bg-gradient-to-r from-fuchsia-600 to-amber-500 py-2 font-display text-sm text-white"
          >
            Scramble
          </button>
          <button type="button" onClick={undo} className="rounded-lg border border-white/20 bg-black/40 py-2 text-xs font-bold uppercase tracking-wider text-white/80">
            Undo
          </button>
          <button type="button" onClick={reset} className="rounded-lg border border-white/20 bg-black/40 py-2 text-xs font-bold uppercase tracking-wider text-white/80">
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
