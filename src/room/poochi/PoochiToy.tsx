import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { level, type PoochiVoice } from './poochiAudio';

export const POOCHI_URL = '/models/poochi.glb';

/**
 * The rigged Poo-Chi (public/models/poochi.glb, built by
 * scripts/build-poochi.mjs from the user's model), at the real toy's size:
 * 16 cm tall, 21 cm nose to tail, snout pointing +z.
 *
 * Nothing about him is changed. The rig is driven the way the model's own
 * animation drives it, with the same bones and face keys:
 *  - `Bone` is his body. Lying down it sits at 2.4 cm, standing at 4.1 cm,
 *    sitting up to beg at 4.8 cm.
 *  - `Bone.001`-`.004` are his legs; they swing about their own x.
 *  - The face keys: EyeOpen (the red LED eyes on), EyeHeart, EyeHappy,
 *    EyeClosed (left and right), Ears, Mouth and Tail.
 *
 * The add-ons come out of him and go back in: a propeller that rises out of
 * his back on a mast (like Goddard's), and a jet pack whose two thrusters
 * slide out of his sides.
 */

export type PoochiEyes = 'off' | 'open' | 'heart' | 'happy' | 'closed';
export type PoochiPose = 'lie' | 'stand' | 'beg';

export interface PoochiDrive {
  eyes: PoochiEyes;
  pose: PoochiPose;
  /** Steps per second while walking; 0 stands still. */
  walk: number;
  /** His voice: the eyes flash and the ears and mouth move with it. */
  voice: PoochiVoice | null;
  /** 0 = tucked away, 1 = all the way out. */
  prop: number;
  /** Rotor speed, 0-1. */
  spin: number;
  jet: number;
  /** Flame, 0-1. */
  thrust: number;
  /** Bounce to the music, 0-1. */
  dance: number;
  /** Lean into a turn (radians, + to the left). */
  lean: number;
}

export function newDrive(): PoochiDrive {
  return { eyes: 'off', pose: 'lie', walk: 0, voice: null, prop: 0, spin: 0, jet: 0, thrust: 0, dance: 0, lean: 0 };
}

const D = THREE.MathUtils.degToRad;
/** Read off the model's own animation (the poses it holds between moves). */
const POSES: Record<PoochiPose, { y: number; body: number; front: number; back: number }> = {
  lie: { y: 0.024, body: -95, front: -17, back: -8 },
  stand: { y: 0.041, body: -95, front: -74, back: -95 },
  beg: { y: 0.048, body: -100, front: -94, back: -120 },
};

const EYE_KEYS: Record<Exclude<PoochiEyes, 'off'>, string> = {
  open: 'EyeOpen',
  heart: 'EyeHeart',
  happy: 'EyeHappy',
  closed: 'EyeClosed',
};

interface Rig {
  body: THREE.Bone | null;
  legs: (THREE.Bone | null)[];
  meshes: THREE.Mesh[];
  eyeMats: THREE.MeshStandardMaterial[];
  addOns: THREE.Group;
}

function findRig(root: THREE.Object3D): Rig {
  // GLTFLoader drops the dots: Bone.001 is Bone001.
  const bone = (name: string) => (root.getObjectByName(name) as THREE.Bone | undefined) ?? null;
  const meshes: THREE.Mesh[] = [];
  const eyeMats: THREE.MeshStandardMaterial[] = [];
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    m.frustumCulled = false;
    if (m.morphTargetDictionary) meshes.push(m);
    const mats = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshPhysicalMaterial[];
    const out = mats.map(src => {
      const mat = src.clone();
      // The see-through plastic. A transmission pass for a 16 cm toy costs a
      // whole extra render of the room, so it is plain see-through instead.
      if (mat.transmission > 0) {
        mat.transmission = 0;
        mat.transparent = true;
        const visor = /Visor/.test(mat.name);
        mat.opacity = visor ? 0.3 : 0.86;
        if (visor) {
          // Smoky red, and not a mirror: the eyes behind it have to read.
          mat.color.set('#3a0808');
          mat.roughness = 0.2;
          mat.envMapIntensity = 0.25;
        }
        mat.depthWrite = !visor;
      }
      if (/Eyes/.test(mat.name)) {
        // LEDs: past tone mapping they wash out to white, so keep them red.
        mat.toneMapped = false;
        eyeMats.push(mat);
      }
      return mat;
    });
    m.material = Array.isArray(m.material) ? out : out[0];
  });
  return {
    body: bone('Bone'),
    legs: [bone('Bone001'), bone('Bone002'), bone('Bone003'), bone('Bone004')],
    meshes,
    eyeMats,
    addOns: new THREE.Group(),
  };
}

function setKey(rig: Rig, key: string, v: number) {
  for (const m of rig.meshes) {
    const i = m.morphTargetDictionary?.[key];
    if (i !== undefined && m.morphTargetInfluences) m.morphTargetInfluences[i] = v;
  }
}

/** Where the propeller's rod sits tucked in, how far it rises, and its length. */
const MAST_IN = 0.088;
const MAST_RISE = 0.024;
const ROD = 0.062;

const SILVER = new THREE.MeshStandardMaterial({ color: '#b9bcc2', metalness: 0.9, roughness: 0.32 });
const TEAL = new THREE.MeshStandardMaterial({ color: '#0e7fa6', metalness: 0.1, roughness: 0.25, transparent: true, opacity: 0.88 });
const RED = new THREE.MeshStandardMaterial({ color: '#d21f1f', metalness: 0.3, roughness: 0.4, emissive: '#5a0000' });
const FLAME = new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
const FLAME_CORE = new THREE.MeshBasicMaterial({ color: '#fff4c2', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });

/**
 * Propeller: a thin rod up out of his back, hub and two blades, in the toy's
 * own space (metres). The blades spin clear over the top of his head (16 cm),
 * so none of it is buried inside him.
 */
function Propeller({
  mast,
  rotor,
  blur,
}: {
  mast: React.RefObject<THREE.Group | null>;
  rotor: React.RefObject<THREE.Group | null>;
  blur: React.RefObject<THREE.MeshBasicMaterial | null>;
}) {
  return (
    <group ref={mast} position={[0, MAST_IN, -0.04]}>
      {/* The collar where the rod comes out of his shell. */}
      <mesh material={SILVER} position={[0, 0.002, 0]}>
        <cylinderGeometry args={[0.008, 0.009, 0.004, 14]} />
      </mesh>
      <mesh material={SILVER} position={[0, ROD / 2, 0]}>
        <cylinderGeometry args={[0.0028, 0.0035, ROD, 10]} />
      </mesh>
      <group ref={rotor} position={[0, ROD + 0.002, 0]}>
        <mesh material={RED}>
          <cylinderGeometry args={[0.007, 0.007, 0.006, 14]} />
        </mesh>
        {[0, Math.PI].map(a => (
          <mesh key={a} material={TEAL} rotation={[0.18, a, 0]} position={[Math.sin(a) * 0.048, 0, Math.cos(a) * 0.048]}>
            <boxGeometry args={[0.018, 0.0025, 0.09]} />
          </mesh>
        ))}
      </group>
      {/* The blur of the blades at full spin, so you can see it from anywhere. */}
      <mesh position={[0, ROD + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.009, 0.094, 40]} />
        <meshBasicMaterial ref={blur} color="#5fd3ff" transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Two thrusters on his sides, nozzles back, with their flames. */
function JetPack({ pods, flames }: { pods: React.RefObject<THREE.Group | null>[]; flames: React.RefObject<THREE.Group | null>[] }) {
  return (
    <>
      {[-1, 1].map((side, i) => (
        <group key={side} ref={pods[i]} position={[side * 0.05, 0.075, -0.05]}>
          <mesh material={SILVER} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.045, 14]} />
          </mesh>
          <mesh material={RED} position={[0, 0, 0.026]}>
            <sphereGeometry args={[0.011, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh material={SILVER} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.026]}>
            <cylinderGeometry args={[0.012, 0.008, 0.01, 14]} />
          </mesh>
          <group ref={flames[i]} position={[0, 0, -0.032]}>
            <mesh material={FLAME} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.025]}>
              <coneGeometry args={[0.009, 0.05, 12]} />
            </mesh>
            <mesh material={FLAME_CORE} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -0.014]}>
              <coneGeometry args={[0.005, 0.026, 10]} />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
}

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

export function PoochiToy({ drive, showBone = false }: { drive: React.RefObject<PoochiDrive>; showBone?: boolean }) {
  const gltf = useGLTF(POOCHI_URL);
  const scene = useMemo(() => cloneSkinned(gltf.scene), [gltf.scene]);
  const rig = useMemo(() => findRig(scene), [scene]);
  const mast = useRef<THREE.Group>(null);
  const rotor = useRef<THREE.Group>(null);
  const blur = useRef<THREE.MeshBasicMaterial>(null);
  const pods = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const flames = [useRef<THREE.Group>(null), useRef<THREE.Group>(null)];
  const addOns = useRef<THREE.Group>(null);
  const live = useRef({
    y: POSES.lie.y,
    body: POSES.lie.body,
    front: POSES.lie.front,
    back: POSES.lie.back,
    eyes: { open: 0, heart: 0, happy: 0, closed: 0 } as Record<string, number>,
    lit: 0,
    phase: 0,
    blinkAt: 2,
    blink: 0,
    rotor: 0,
    t: 0,
  });

  useEffect(() => {
    const toyBone = scene.getObjectByName('Poochi_Bone');
    if (toyBone) toyBone.visible = showBone;
  }, [scene, showBone]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const d = drive.current;
    if (!d) return;
    const L = live.current;
    L.t += dt;
    const k = 1 - Math.exp(-dt * 8);
    const P = POSES[d.pose];
    L.y += (P.y - L.y) * k;
    L.body += (P.body - L.body) * k;
    L.front += (P.front - L.front) * k;
    L.back += (P.back - L.back) * k;

    const sound = level(d.voice);
    // Walking: diagonal pairs swing together; the body bobs on each step.
    if (d.walk > 0) L.phase += dt * d.walk * Math.PI * 2;
    const step = d.walk > 0 ? Math.sin(L.phase) : 0;
    const bounce = d.dance * Math.abs(Math.sin(L.t * 7.5));
    if (rig.body) {
      rig.body.position.y = L.y + Math.abs(step) * 0.003 + bounce * 0.006 + sound * 0.002;
      _e.set(D(L.body + bounce * 4 - sound * 3), d.lean * 0.4 + d.dance * Math.sin(L.t * 3.7) * 0.12, D(-180) + d.lean);
      rig.body.quaternion.setFromEuler(_e);
    }
    const swing = 16 * Math.min(1, d.walk / 2);
    const legX = [L.front + step * swing, L.back - step * swing, L.back + step * swing, L.front - step * swing];
    rig.legs.forEach((leg, i) => {
      if (!leg) return;
      _q.setFromEuler(_e.set(D(legX[i] + bounce * (i % 2 ? 6 : -6)), 0, 0));
      leg.quaternion.copy(_q);
    });

    // Eyes: one face at a time, blending across; open eyes blink now and then.
    const want = d.eyes;
    for (const key of Object.keys(L.eyes)) {
      const target = key === want ? 1 : 0;
      L.eyes[key] += (target - L.eyes[key]) * (1 - Math.exp(-dt * 14));
    }
    if (want === 'open') {
      L.blinkAt -= dt;
      if (L.blinkAt <= 0) {
        L.blink = 0.14;
        L.blinkAt = 2.2 + Math.random() * 3.5;
      }
    }
    L.blink = Math.max(0, L.blink - dt);
    for (const [key, v] of Object.entries(L.eyes)) {
      const name = EYE_KEYS[key as keyof typeof EYE_KEYS];
      const shown = key === 'open' && L.blink > 0 ? 0 : v;
      setKey(rig, `${name}Left`, shown);
      setKey(rig, `${name}Right`, shown);
    }
    const litWant = want === 'off' ? 0.15 : 1;
    L.lit += (litWant - L.lit) * (1 - Math.exp(-dt * 6));
    for (const m of rig.eyeMats) m.emissiveIntensity = (0.6 + sound * 0.8) * L.lit * 1.4;
    // Ears and mouth with the sound; the tail wags while he's happy or singing.
    setKey(rig, 'Ears', Math.min(1, sound * 1.4 + bounce * 0.4));
    setKey(rig, 'Mouth', Math.min(1, sound * 1.6));
    const wag = want === 'happy' || want === 'heart' || d.dance > 0 ? (Math.sin(L.t * 14) * 0.5 + 0.5) : 0;
    setKey(rig, 'Tail', wag);

    // Add-ons ride on the body's bob.
    const a = addOns.current;
    if (a) a.position.y = (rig.body?.position.y ?? POSES.stand.y) - POSES.stand.y;
    const m = mast.current;
    if (m) {
      const out = THREE.MathUtils.smoothstep(d.prop, 0, 1);
      m.visible = out > 0.01;
      m.scale.setScalar(Math.max(0.001, out));
      m.position.y = MAST_IN - 0.018 + out * (0.018 + MAST_RISE);
    }
    L.rotor += dt * d.spin * 55;
    if (rotor.current) rotor.current.rotation.y = L.rotor;
    if (blur.current) blur.current.opacity = Math.min(1, d.spin) * 0.28;
    pods.forEach((p, i) => {
      const g = p.current;
      if (!g) return;
      const out = THREE.MathUtils.smoothstep(d.jet, 0, 1);
      g.visible = out > 0.01;
      g.scale.setScalar(Math.max(0.001, out));
      g.position.x = (i ? 1 : -1) * (0.03 + out * 0.032);
    });
    flames.forEach(f => {
      const g = f.current;
      if (!g) return;
      const flick = 0.75 + Math.random() * 0.5;
      g.visible = d.thrust > 0.02 && d.jet > 0.9;
      g.scale.set(1, 1, Math.max(0.01, d.thrust * flick));
    });
  });

  return (
    <group>
      <primitive object={scene} />
      <group ref={addOns}>
        <Propeller mast={mast} rotor={rotor} blur={blur} />
        <JetPack pods={pods} flames={flames} />
      </group>
    </group>
  );
}

/** The toy bone he came with, on its own: a copy for every bone in the hunt. */
export function useToyBone() {
  const gltf = useGLTF(POOCHI_URL);
  return useMemo(() => {
    const src = gltf.scene.getObjectByName('Poochi_Bone');
    if (!src) return null;
    // Stood on its own: centred, resting on y = 0. (Its node carries the
    // compression's offset and scale, so the bounds are what to go by.)
    const copy = src.clone(true);
    copy.position.copy(src.position);
    copy.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(copy);
    const centre = box.getCenter(new THREE.Vector3());
    copy.position.x -= centre.x;
    copy.position.z -= centre.z;
    copy.position.y -= box.min.y;
    const holder = new THREE.Group();
    holder.add(copy);
    return holder;
  }, [gltf.scene]);
}

useGLTF.preload(POOCHI_URL);
