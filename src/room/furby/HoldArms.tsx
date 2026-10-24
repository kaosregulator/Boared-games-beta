import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import * as THREE from 'three';

/**
 * Your own two arms, for holding the Furby: real hand models (the WebXR
 * generic hands, MIT, 25 joints each), smoothed and given a skin material,
 * coming out of a 90s striped long-sleeve with a ribbed cuff.
 *
 * Each finger is posed by bending its knuckles toward the palm. When a hand
 * holds something (`HandPose.grip`), the fingers close until they touch it
 * and stop there, and a palm that would sink into it is pushed back out to
 * its surface, so the hands wrap round the toy instead of passing through.
 */

export interface Ellipsoid {
  center: THREE.Vector3;
  radii: THREE.Vector3;
}

export interface GripShape {
  /** World -> the held object's local space. */
  inverse: THREE.Matrix4;
  /** The object as a few overlapping ellipsoids, in its local space. */
  parts: Ellipsoid[];
}

export interface HandPose {
  /** Wrist, world space. */
  wrist: THREE.Vector3;
  /** Which way the fingers point, world space. */
  fingers: THREE.Vector3;
  /** Which way the palm faces, world space (made square to `fingers`). */
  palm: THREE.Vector3;
  /** Elbow, world space. */
  elbow: THREE.Vector3;
  /** 0 flat hand, 1 fist. */
  curl: number;
  /** 1 keeps the index finger straight (pointing, poking, feeding). */
  point: number;
  /** 0 hidden, 1 in place. */
  shown: number;
  /** Something the hand is holding: fingers stop on its surface. */
  grip?: GripShape | null;
}

export function newHandPose(): HandPose {
  return {
    wrist: new THREE.Vector3(),
    fingers: new THREE.Vector3(0, 1, 0),
    palm: new THREE.Vector3(0, 0, 1),
    elbow: new THREE.Vector3(),
    curl: 0.3,
    point: 0,
    shown: 0,
    grip: null,
  };
}

const HAND_URL = { left: '/models/hands/left.glb', right: '/models/hands/right.glb' };
const FINGER_NAMES = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const;
const CHAIN: Record<(typeof FINGER_NAMES)[number], string[]> = {
  thumb: ['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'],
  index: ['index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip'],
  middle: ['middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip'],
  ring: ['ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip'],
  pinky: ['pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip'],
};
/** Knuckle bend at full curl (radians), base to tip. The thumb folds less. */
const BEND = { finger: [1.45, 1.6, 1.05], thumb: [0.55, 0.9] };
/** Finger thickness, kept clear of whatever the hand holds. */
const PAD = 0.009;

function stripeTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const g = c.getContext('2d')!;
  const bands = ['#24325e', '#c8423a', '#24325e', '#e9c46a'];
  const h = 256 / 8;
  for (let i = 0; i < 8; i++) {
    g.fillStyle = bands[i % bands.length];
    g.fillRect(0, i * h, 64, h);
  }
  // Knit texture: faint vertical ribs.
  g.fillStyle = 'rgba(0,0,0,0.1)';
  for (let x = 0; x < 64; x += 4) g.fillRect(x, 0, 1, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

/**
 * One level of Phong-tessellated subdivision: every triangle becomes four,
 * new vertices bulge out along the normals, skin weights are merged. Turns
 * the low-poly XR hand into a rounded one.
 */
function subdivideSkinned(src: THREE.BufferGeometry) {
  const geo = src.index ? src : src.toNonIndexed();
  const index = geo.index!.array;
  const P = geo.getAttribute('position');
  const N = geo.getAttribute('normal');
  const UV = geo.getAttribute('uv');
  const SI = geo.getAttribute('skinIndex');
  const SW = geo.getAttribute('skinWeight');
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const si: number[] = [];
  const sw: number[] = [];
  for (let v = 0; v < P.count; v++) {
    pos.push(P.getX(v), P.getY(v), P.getZ(v));
    nor.push(N.getX(v), N.getY(v), N.getZ(v));
    uv.push(UV ? UV.getX(v) : 0, UV ? UV.getY(v) : 0);
    si.push(SI.getX(v), SI.getY(v), SI.getZ(v), SI.getW(v));
    sw.push(SW.getX(v), SW.getY(v), SW.getZ(v), SW.getW(v));
  }
  const mids = new Map<string, number>();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const na = new THREE.Vector3();
  const nb = new THREE.Vector3();
  const m = new THREE.Vector3();
  const pa = new THREE.Vector3();
  const pb = new THREE.Vector3();
  const mid = (i: number, j: number) => {
    const key = i < j ? `${i}_${j}` : `${j}_${i}`;
    const hit = mids.get(key);
    if (hit !== undefined) return hit;
    a.fromArray(pos, i * 3);
    b.fromArray(pos, j * 3);
    na.fromArray(nor, i * 3);
    nb.fromArray(nor, j * 3);
    m.addVectors(a, b).multiplyScalar(0.5);
    // Phong tessellation: project the midpoint onto both vertex tangent planes.
    pa.copy(m).addScaledVector(na, -m.clone().sub(a).dot(na));
    pb.copy(m).addScaledVector(nb, -m.clone().sub(b).dot(nb));
    m.lerp(pa.add(pb).multiplyScalar(0.5), 0.75);
    const n = na.clone().add(nb).normalize();
    const out = pos.length / 3;
    pos.push(m.x, m.y, m.z);
    nor.push(n.x, n.y, n.z);
    uv.push((uv[i * 2] + uv[j * 2]) / 2, (uv[i * 2 + 1] + uv[j * 2 + 1]) / 2);
    // Merge both vertices' bone weights, keep the strongest four.
    const w = new Map<number, number>();
    for (const v of [i, j])
      for (let k = 0; k < 4; k++) {
        const bone = si[v * 4 + k];
        const weight = sw[v * 4 + k] / 2;
        if (weight > 0) w.set(bone, (w.get(bone) ?? 0) + weight);
      }
    const top = [...w.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4);
    const sum = top.reduce((s, t) => s + t[1], 0) || 1;
    for (let k = 0; k < 4; k++) {
      si.push(top[k]?.[0] ?? 0);
      sw.push((top[k]?.[1] ?? 0) / sum);
    }
    mids.set(key, out);
    return out;
  };
  const tris: number[] = [];
  for (let t = 0; t < index.length; t += 3) {
    const [i, j, k] = [index[t], index[t + 1], index[t + 2]];
    const ij = mid(i, j);
    const jk = mid(j, k);
    const ki = mid(k, i);
    tris.push(i, ij, ki, ij, j, jk, ki, jk, k, ij, jk, ki);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  out.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  out.setIndex(tris);
  return out;
}

interface Finger {
  bones: THREE.Bone[];
  restPos: THREE.Vector3[];
  restQuat: THREE.Quaternion[];
  /** Knuckle hinge, in the model's space. */
  axis: THREE.Vector3;
  thumb: boolean;
}

interface HandRig {
  root: THREE.Object3D;
  /** Model space -> pose space (fingers +y, palm +z, wrist at the origin). */
  align: THREE.Group;
  fingers: Finger[];
  /** Middle of the palm, model space. */
  palmCenter: THREE.Vector3;
  /** Palm normal, model space. */
  palmNormal: THREE.Vector3;
  dispose: () => void;
}

function buildHand(source: THREE.Object3D, skin: THREE.Material): HandRig {
  const root = cloneSkinned(source);
  const bones = new Map<string, THREE.Bone>();
  let mesh: THREE.SkinnedMesh | null = null;
  root.traverse(o => {
    if ((o as THREE.Bone).isBone) bones.set(o.name, o as THREE.Bone);
    if ((o as THREE.SkinnedMesh).isSkinnedMesh) mesh = o as THREE.SkinnedMesh;
  });
  const skinned = mesh as unknown as THREE.SkinnedMesh;
  skinned.geometry = subdivideSkinned(skinned.geometry);
  skinned.material = skin;
  skinned.frustumCulled = false;
  skinned.renderOrder = 2;
  skinned.castShadow = false;

  const at = (name: string) => bones.get(name)!.position.clone();
  const wrist = at('wrist');
  const knuckles = at('middle-finger-phalanx-proximal');
  const along = knuckles.clone().sub(wrist).normalize();
  const across = at('index-finger-metacarpal').sub(at('pinky-finger-metacarpal')).normalize();
  // The thumb tip rests in front of the palm, which says which side the palm is on.
  const thumbOut = at('thumb-tip').sub(at('middle-finger-metacarpal'));
  const palmNormal = thumbOut.addScaledVector(along, -thumbOut.dot(along)).addScaledVector(across, -thumbOut.dot(across)).normalize();
  const palmCenter = wrist.clone().lerp(knuckles, 0.55).addScaledVector(palmNormal, 0.012);

  // Fingers (+y) and palm (+z) of the pose basis; the thumb falls on x.
  const x = new THREE.Vector3().crossVectors(along, palmNormal);
  const toModel = new THREE.Matrix4().makeBasis(x, along, palmNormal);
  const align = new THREE.Group();
  align.quaternion.setFromRotationMatrix(toModel).invert();
  align.position.copy(wrist).applyQuaternion(align.quaternion).negate();
  align.add(root);

  const fingers: Finger[] = FINGER_NAMES.map(name => {
    const list = CHAIN[name].map(n => bones.get(n)!);
    const restPos = list.map(b => b.position.clone());
    const dir = restPos[1].clone().sub(restPos[0]).normalize();
    const axis = new THREE.Vector3().crossVectors(dir, palmNormal).normalize();
    if (name === 'thumb') axis.lerp(along.clone().negate(), 0.35).normalize();
    return { bones: list, restPos, restQuat: list.map(b => b.quaternion.clone()), axis, thumb: name === 'thumb' };
  });
  return {
    root,
    align,
    fingers,
    palmCenter,
    palmNormal,
    dispose: () => skinned.geometry.dispose(),
  };
}

const q = new THREE.Quaternion();
const qStep = new THREE.Quaternion();
const seg = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

/** Bends one finger; joint positions (model space) land in `out`. */
function poseFinger(f: Finger, curl: number, out: THREE.Vector3[], write: boolean) {
  const bend = f.thumb ? BEND.thumb : BEND.finger;
  const n = f.restPos.length;
  q.identity();
  out[0].copy(f.restPos[0]);
  if (write) {
    f.bones[0].position.copy(f.restPos[0]);
    f.bones[0].quaternion.copy(f.restQuat[0]);
  }
  for (let j = 1; j < n; j++) {
    // Each joint hangs off the last one along its rest bone, turned by every bend so far.
    out[j].copy(out[j - 1]).add(seg.subVectors(f.restPos[j], f.restPos[j - 1]).applyQuaternion(q));
    const angle = j < n - 1 ? (bend[j - 1] ?? 0) * curl : 0;
    if (angle) q.premultiply(qStep.setFromAxisAngle(f.axis, angle));
    if (write) {
      f.bones[j].position.copy(out[j]);
      f.bones[j].quaternion.copy(q).multiply(f.restQuat[j]);
    }
  }
}

const joints = Array.from({ length: 5 }, () => new THREE.Vector3());
const local = new THREE.Vector3();
const toWorld = new THREE.Matrix4();

/** Is a model-space point inside the held shape (grown by `pad`)? */
function inside(grip: GripShape, p: THREE.Vector3, pad: number) {
  local.copy(p).applyMatrix4(toWorld).applyMatrix4(grip.inverse);
  return grip.parts.some(({ center: c, radii: r }) => {
    const x = (local.x - c.x) / (r.x + pad);
    const y = (local.y - c.y) / (r.y + pad);
    const z = (local.z - c.z) / (r.z + pad);
    return x * x + y * y + z * z < 1;
  });
}

const mid = new THREE.Vector3();

/** Does a finger posed at `curl` touch the held shape anywhere along its length? */
function fingerHits(grip: GripShape, finger: Finger, curl: number) {
  poseFinger(finger, curl, joints, false);
  for (let j = 1; j < finger.restPos.length; j++) {
    if (inside(grip, joints[j], PAD)) return true;
    // Between knuckles too: a long bone can cut through where its ends don't.
    if (inside(grip, mid.addVectors(joints[j - 1], joints[j]).multiplyScalar(0.5), PAD)) return true;
  }
  return false;
}

/**
 * The curl nearest `want` that keeps this finger out of the held shape: it
 * closes until it touches the surface; a finger that's already in even when
 * straight wraps further round instead. null if no curl clears it.
 */
function clearCurl(grip: GripShape, finger: Finger, want: number) {
  const steps = 12;
  if (!fingerHits(grip, finger, 0)) {
    let ok = 0;
    for (let s = 1; s <= steps; s++) {
      const c = (want * s) / steps;
      if (fingerHits(grip, finger, c)) break;
      ok = c;
    }
    return ok;
  }
  for (let s = 1; s <= steps; s++) {
    const c = want + ((1 - want) * s) / steps;
    if (!fingerHits(grip, finger, c)) return c;
  }
  return null;
}

function Hand({ pose, side, skin, sleeve, cuff }: { pose: HandPose; side: 'left' | 'right'; skin: THREE.Material; sleeve: THREE.Material; cuff: THREE.Material }) {
  const gltf = useGLTF(HAND_URL[side]);
  const rig = useMemo(() => buildHand(gltf.scene, skin), [gltf.scene, skin]);
  useLayoutEffect(() => () => rig.dispose(), [rig]);
  const hand = useRef<THREE.Group>(null);
  const forearm = useRef<THREE.Group>(null);

  const apply = () => {
    const h = hand.current;
    const f = forearm.current;
    if (!h || !f) return;
    const y = new THREE.Vector3().copy(pose.fingers).normalize();
    const z = new THREE.Vector3().copy(pose.palm).addScaledVector(y, -pose.palm.dot(y)).normalize();
    const x = new THREE.Vector3().crossVectors(y, z);
    h.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    h.position.copy(pose.wrist);
    h.visible = pose.shown > 0.01;
    f.visible = h.visible;
    h.updateMatrixWorld(true);
    // Model space -> world, for testing joints against what's held.
    toWorld.multiplyMatrices(h.matrixWorld, rig.align.matrix);
    const want = rig.fingers.map((_, i) => {
      if (i === 0) return Math.min(1, pose.curl * 0.8 + 0.1);
      return i === 1 ? pose.curl * (1 - pose.point) : pose.curl;
    });
    let curls = want;
    if (pose.grip) {
      const grip = pose.grip;
      // Back the hand out along its palm normal, 3 mm at a time, until the
      // palm is out of the toy and every finger can rest on its surface.
      const step = rig.palmNormal.clone().multiplyScalar(-0.003).applyQuaternion(rig.align.quaternion).applyQuaternion(h.quaternion);
      for (let tries = 0; tries < 20; tries++) {
        const palmIn = inside(grip, rig.palmCenter, 0.004);
        const fit = palmIn ? null : rig.fingers.map((finger, i) => clearCurl(grip, finger, want[i]));
        if (fit && fit.every(c => c !== null)) {
          curls = fit as number[];
          break;
        }
        h.position.add(step);
        h.updateMatrixWorld(true);
        toWorld.multiplyMatrices(h.matrixWorld, rig.align.matrix);
      }
    }
    rig.fingers.forEach((finger, i) => poseFinger(finger, curls[i], joints, true));

    // Forearm from the elbow to just behind the wrist.
    const end = new THREE.Vector3().copy(h.position).addScaledVector(y, -0.03);
    const dir = new THREE.Vector3().subVectors(end, pose.elbow);
    const len = dir.length();
    f.position.copy(pose.elbow).addScaledVector(dir, 0.5);
    f.quaternion.setFromUnitVectors(UP, dir.normalize());
    f.scale.set(1, len, 1);
  };
  (pose as HandPose & { _apply?: () => void })._apply = apply;

  return (
    <>
      <group ref={hand}>
        <primitive object={rig.align} />
        {/* ribbed cuff over the wrist */}
        <mesh position={[0, -0.035, 0]} material={cuff} renderOrder={2}>
          <cylinderGeometry args={[0.034, 0.037, 0.04, 24, 1, true]} />
        </mesh>
      </group>
      {/* forearm: a unit-tall sleeve stretched between elbow and wrist */}
      <group ref={forearm}>
        <mesh material={sleeve} frustumCulled={false}>
          <cylinderGeometry args={[0.036, 0.045, 1, 24, 1, true]} />
        </mesh>
      </group>
    </>
  );
}

function ribTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 8;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1d2747';
  g.fillRect(0, 0, 64, 8);
  g.fillStyle = '#121a33';
  for (let x = 0; x < 64; x += 4) g.fillRect(x, 0, 2, 8);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  return tex;
}

export function HoldArms({ left, right }: { left: HandPose; right: HandPose }) {
  const mats = useMemo(
    () => ({
      skin: new THREE.MeshPhysicalMaterial({
        color: '#e3ad8e',
        roughness: 0.52,
        metalness: 0,
        sheen: 0.6,
        sheenColor: new THREE.Color('#ff9f87'),
        sheenRoughness: 0.45,
        clearcoat: 0.08,
        clearcoatRoughness: 0.6,
      }),
      sleeve: new THREE.MeshStandardMaterial({ map: stripeTexture(), roughness: 0.95, side: THREE.DoubleSide }),
      cuff: new THREE.MeshStandardMaterial({ map: ribTexture(), roughness: 1, side: THREE.DoubleSide }),
    }),
    [],
  );
  useLayoutEffect(() => () => Object.values(mats).forEach(m => m.dispose()), [mats]);
  return (
    <group>
      <Hand pose={left} side="left" skin={mats.skin} sleeve={mats.sleeve} cuff={mats.cuff} />
      <Hand pose={right} side="right" skin={mats.skin} sleeve={mats.sleeve} cuff={mats.cuff} />
    </group>
  );
}

/** Call from the parent's useFrame after setting the poses. */
export function applyHand(pose: HandPose) {
  (pose as HandPose & { _apply?: () => void })._apply?.();
}

useGLTF.preload(HAND_URL.left);
useGLTF.preload(HAND_URL.right);
