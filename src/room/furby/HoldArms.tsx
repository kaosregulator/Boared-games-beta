import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Your own two arms, for holding the Furby: a 90s striped long-sleeve with
 * a ribbed cuff, and hands with jointed fingers that curl round the toy,
 * point, poke and stroke. Built from rounded shapes and soft materials to
 * sit with the room's chunky Tripo props rather than look like a CG glove.
 *
 * The parent sets each hand's pose every frame through `HandPose`; the
 * forearm stretches from an elbow kept just off the bottom of the screen.
 */

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
  /** 0 hidden (slid off the bottom of the screen), 1 in place. */
  shown: number;
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
  };
}

const SKIN = '#e2a885';
const SKIN_DARK = '#c98c6a';
// Right hand, fingers along +y, palm toward +z, thumb on +x. Index first.
const FINGERS = [
  { x: 0.026, len: [0.042, 0.03], r: 0.0088 },
  { x: 0.0087, len: [0.046, 0.032], r: 0.009 },
  { x: -0.0087, len: [0.043, 0.03], r: 0.0088 },
  { x: -0.025, len: [0.034, 0.025], r: 0.0078 },
];

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
  g.fillStyle = 'rgba(0,0,0,0.08)';
  for (let x = 0; x < 64; x += 4) g.fillRect(x, 0, 1, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

const UP = new THREE.Vector3(0, 1, 0);
const tmpX = new THREE.Vector3();
const tmpY = new THREE.Vector3();
const tmpZ = new THREE.Vector3();
const basis = new THREE.Matrix4();

function Hand({ pose, mirror }: { pose: HandPose; mirror: boolean }) {
  const hand = useRef<THREE.Group>(null);
  const forearm = useRef<THREE.Group>(null);
  const joints = useRef<(THREE.Group | null)[]>([]);
  const thumb = useRef<THREE.Group>(null);
  const thumbTip = useRef<THREE.Group>(null);
  const mats = useMemo(
    () => ({
      skin: new THREE.MeshPhysicalMaterial({ color: SKIN, roughness: 0.62, sheen: 0.5, sheenColor: new THREE.Color('#ffd2bd'), sheenRoughness: 0.6 }),
      nail: new THREE.MeshStandardMaterial({ color: '#f1c7b6', roughness: 0.35 }),
      knuckle: new THREE.MeshStandardMaterial({ color: SKIN_DARK, roughness: 0.7 }),
      sleeve: new THREE.MeshStandardMaterial({ map: stripeTexture(), roughness: 0.95 }),
      cuff: new THREE.MeshStandardMaterial({ color: '#1d2747', roughness: 1 }),
    }),
    [],
  );

  useLayoutEffect(() => {
    // Keep the arm in front of the room and the Furby's fur where they overlap.
    hand.current?.traverse(o => {
      o.renderOrder = 2;
      o.frustumCulled = false;
    });
    forearm.current?.traverse(o => {
      o.frustumCulled = false;
    });
  }, []);

  // Placed every frame by the parent's useFrame through this callback.
  const apply = () => {
    const h = hand.current;
    const f = forearm.current;
    if (!h || !f) return;
    tmpY.copy(pose.fingers).normalize();
    tmpZ.copy(pose.palm).addScaledVector(tmpY, -pose.palm.dot(tmpY)).normalize();
    tmpX.crossVectors(tmpY, tmpZ);
    basis.makeBasis(tmpX, tmpY, tmpZ);
    h.quaternion.setFromRotationMatrix(basis);
    h.position.copy(pose.wrist);
    h.scale.set(mirror ? -1 : 1, 1, 1);
    h.visible = pose.shown > 0.01;
    f.visible = h.visible;
    // Forearm from the elbow to just behind the wrist.
    const end = tmpX.copy(pose.wrist).addScaledVector(tmpY, -0.012);
    const dir = tmpZ.subVectors(end, pose.elbow);
    const len = dir.length();
    f.position.copy(pose.elbow).addScaledVector(dir, 0.5);
    f.quaternion.setFromUnitVectors(UP, dir.normalize());
    f.scale.set(1, len, 1);
    const curl = pose.curl;
    FINGERS.forEach((_, i) => {
      const a = joints.current[i * 2];
      const b = joints.current[i * 2 + 1];
      const straight = i === 0 ? pose.point : 0;
      const c = curl * (1 - straight);
      if (a) a.rotation.x = 0.15 + c * 1.25;
      if (b) b.rotation.x = 0.1 + c * 1.35;
    });
    if (thumb.current) thumb.current.rotation.set(0.35 + curl * 0.45, -0.25 - curl * 0.5, -0.65 + curl * 0.35);
    if (thumbTip.current) thumbTip.current.rotation.x = 0.2 + curl * 0.6;
  };
  (pose as HandPose & { _apply?: () => void })._apply = apply;

  return (
    <>
      <group ref={hand}>
        {/* palm and back of the hand */}
        <RoundedBox args={[0.078, 0.086, 0.03]} radius={0.013} smoothness={3} position={[0, 0.047, 0]} material={mats.skin} />
        {/* heel of the thumb */}
        <mesh position={[0.024, 0.024, 0.008]} scale={[1, 1.25, 0.8]} material={mats.skin}>
          <sphereGeometry args={[0.019, 16, 12]} />
        </mesh>
        {/* wrist into the cuff */}
        <mesh position={[0, -0.006, 0]} material={mats.skin}>
          <cylinderGeometry args={[0.027, 0.03, 0.03, 18]} />
        </mesh>
        <mesh position={[0, -0.03, 0]} material={mats.cuff}>
          <cylinderGeometry args={[0.04, 0.042, 0.045, 22]} />
        </mesh>
        {FINGERS.map((finger, i) => (
          <group
            key={i}
            ref={el => {
              joints.current[i * 2] = el;
            }}
            position={[finger.x, 0.086, -0.002]}
          >
            <mesh position={[0, finger.len[0] / 2, 0]} material={mats.skin}>
              <capsuleGeometry args={[finger.r, finger.len[0] - finger.r * 2, 4, 12]} />
            </mesh>
            <mesh position={[0, 0, -0.004]} material={mats.knuckle} scale={[1, 0.6, 0.6]}>
              <sphereGeometry args={[finger.r * 1.05, 10, 8]} />
            </mesh>
            <group
              ref={el => {
                joints.current[i * 2 + 1] = el;
              }}
              position={[0, finger.len[0], 0]}
            >
              <mesh position={[0, finger.len[1] / 2, 0]} material={mats.skin}>
                <capsuleGeometry args={[finger.r * 0.92, finger.len[1] - finger.r * 1.8, 4, 12]} />
              </mesh>
              {/* nail on the back of the fingertip */}
              <mesh position={[0, finger.len[1] - finger.r * 0.9, -finger.r * 0.62]} rotation={[0.25, 0, 0]} material={mats.nail}>
                <boxGeometry args={[finger.r * 1.3, finger.r * 1.5, finger.r * 0.35]} />
              </mesh>
            </group>
          </group>
        ))}
        <group ref={thumb} position={[0.034, 0.02, 0.01]}>
          <mesh position={[0, 0.019, 0]} material={mats.skin}>
            <capsuleGeometry args={[0.0105, 0.02, 4, 12]} />
          </mesh>
          <group ref={thumbTip} position={[0, 0.038, 0]}>
            <mesh position={[0, 0.014, 0]} material={mats.skin}>
              <capsuleGeometry args={[0.0098, 0.014, 4, 12]} />
            </mesh>
          </group>
        </group>
      </group>
      {/* forearm: a unit-tall sleeve stretched between elbow and wrist */}
      <group ref={forearm}>
        <mesh material={mats.sleeve}>
          <cylinderGeometry args={[0.036, 0.045, 1, 22, 1, true]} />
        </mesh>
      </group>
    </>
  );
}

export function HoldArms({ left, right }: { left: HandPose; right: HandPose }) {
  return (
    <group>
      <Hand pose={left} mirror />
      <Hand pose={right} mirror={false} />
    </group>
  );
}

/** Call from the parent's useFrame after setting the poses. */
export function applyHand(pose: HandPose) {
  (pose as HandPose & { _apply?: () => void })._apply?.();
}
