import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { HoldArms, applyHand, newHandPose, type GripShape, type HandPose } from './HoldArms';
import { FurbyPuppet } from './FurbyPuppet';
import { brainFor, furbyGesture, onFurbyGesture, setFurby, useFurby, type Gesture } from './furbyStore';

/**
 * The Furby in your hands. It flies up from wherever it was sitting, your
 * arms come up from the bottom of the screen and take it, and from there
 * everything is a hand doing something to the toy, the way you'd play with
 * the real one: stroke its head, poke its tummy, put a finger in its beak
 * (it chews), hug it, turn it upside down, shake it, rock it to sleep.
 * Clicking its head, tummy or beak does the same as the HUD buttons.
 *
 * The holder sits in front of the camera, so the Furby always faces you.
 * Hand targets are in the holder's space (meters, feet at the origin, +z
 * toward you); elbows stay in camera space just off the bottom corners.
 */

const FLY = 0.75;
const HOLD_AT = new THREE.Vector3(0, -0.13, -0.36);
const HUG_AT = new THREE.Vector3(0, -0.16, -0.22);
const ELBOW = new THREE.Vector3(0.2, -0.34, -0.1);

const DUR: Record<Exclude<Gesture, 'putdown' | 'bedtime'>, number> = {
  pet: 2.8,
  tickle: 2.6,
  feed: 2.8,
  hug: 3.4,
  flip: 2.8,
  shake: 1.7,
  sing: 6,
};

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const bell = (k: number, a: number, b: number) => ease((k - a) / 0.15) * (1 - ease((k - b) / 0.15));

interface Target {
  wrist: THREE.Vector3;
  fingers: THREE.Vector3;
  palm: THREE.Vector3;
  curl: number;
  point: number;
  /** Fingers close on the Furby (off while a finger pokes or feeds it). */
  grips: boolean;
}
const target = (): Target => ({ wrist: new THREE.Vector3(), fingers: new THREE.Vector3(), palm: new THREE.Vector3(), curl: 0, point: 0, grips: true });

/** The Furby's body as an ellipsoid, holder space, for the hands to close on. */
const BODY = { center: new THREE.Vector3(0, 0.068, 0.003), radii: new THREE.Vector3(0.066, 0.072, 0.06) };
/** Wrist to the middle of the palm, along the fingers, and the palm's thickness. */
const PALM_REACH = 0.05;
const PALM_DEPTH = 0.012;
/** Wrist to the index fingertip when it points, and its offset toward the thumb. */
const INDEX_REACH = 0.17;
const INDEX_SIDE = 0.02;

/** Palm centre at `at`, fingers along `dir`, palm facing `normal`: where the wrist goes. */
function palmOn(t: Target, at: THREE.Vector3, dir: THREE.Vector3, normal: THREE.Vector3, curl: number) {
  t.fingers.copy(dir).normalize();
  t.palm.copy(normal).addScaledVector(t.fingers, -normal.dot(t.fingers)).normalize();
  t.wrist.copy(at).addScaledVector(t.fingers, -PALM_REACH).addScaledVector(t.palm, -PALM_DEPTH);
  t.curl = curl;
  t.point = 0;
  t.grips = true;
}

/**
 * Holding it the way you'd hold the real one: hands up its sides from
 * underneath, fingers wrapping round toward its back, thumbs in front.
 */
function grip(t: Target, side: 1 | -1, lift = 0, back = 0) {
  palmOn(t, new THREE.Vector3(0.07 * side, 0.046 + lift, -0.004 - back), new THREE.Vector3(-0.12 * side, 0.58, -0.8), new THREE.Vector3(-side, 0, 0.04), 1);
}

/** Index fingertip at `tip`, finger along `dir`: where the wrist goes. */
function pointAt(t: Target, side: 1 | -1, tip: THREE.Vector3, dir: THREE.Vector3, palm: THREE.Vector3) {
  t.fingers.copy(dir).normalize();
  t.palm.copy(palm).addScaledVector(t.fingers, -palm.dot(t.fingers)).normalize();
  const x = new THREE.Vector3().crossVectors(t.fingers, t.palm);
  t.wrist.copy(tip).addScaledVector(t.fingers, -INDEX_REACH).addScaledVector(x, -INDEX_SIDE * side);
  t.curl = 0.9;
  t.point = 1;
  t.grips = false;
}

const v = new THREE.Vector3();
const q = new THREE.Quaternion();
const qRoll = new THREE.Quaternion();
const Z = new THREE.Vector3(0, 0, 1);

export function FurbyHold() {
  const { held, from } = useFurby();
  const brain = held ? brainFor(held) : null;
  const holder = useRef<THREE.Group>(null);
  const hands = useMemo(() => ({ left: newHandPose(), right: newHandPose() }), []);
  const want = useMemo(() => ({ left: target(), right: target() }), []);
  const st = useRef({ fly: 0, leaving: false, gesture: null as Gesture | null, t: 0, acted: false });
  const start = useMemo(() => ({ pos: new THREE.Vector3(), quat: new THREE.Quaternion(), scale: 1 }), []);
  const gripShape = useMemo<GripShape>(() => ({ inverse: new THREE.Matrix4(), center: BODY.center, radii: BODY.radii }), []);

  // A fresh pick-up: start the flight from where it sat.
  useEffect(() => {
    if (!held || !from) return;
    st.current = { fly: 0, leaving: false, gesture: null, t: 0, acted: false };
    start.pos.copy(from.position);
    start.quat.copy(from.quaternion);
    start.scale = from.scale;
    hands.left.shown = hands.right.shown = 0;
  }, [held, from, start, hands]);

  useEffect(
    () =>
      onFurbyGesture(g => {
        const s = st.current;
        if (!brain || s.leaving || s.fly < 1) return;
        if (g === 'putdown') {
          s.leaving = true;
          s.gesture = null;
          brain.finger = false;
          brain.act('putdown');
          return;
        }
        if (g === 'bedtime') {
          brain.act(brain.asleep ? 'wake' : 'sleep');
          return;
        }
        s.gesture = g;
        s.t = 0;
        s.acted = false;
      }),
    [brain],
  );

  useFrame(({ camera }, dtRaw) => {
    const h = holder.current;
    if (!h || !brain || !held) return;
    const dt = Math.min(dtRaw, 0.05);
    const s = st.current;
    brain.attentive = true;

    // Where it's held: in front of you, closer while hugging, wobbling when shaken.
    const g = s.gesture;
    if (g) s.t += dt;
    const k = g && g in DUR ? s.t / DUR[g as keyof typeof DUR] : 0;
    const on = g ? bell(k, 0, 0.85) : 0;
    const local = v.copy(HOLD_AT);
    if (g === 'hug') local.lerp(HUG_AT, on);
    if (g === 'shake') local.add(new THREE.Vector3(Math.sin(s.t * 29) * 0.035, Math.sin(s.t * 23) * 0.02, 0).multiplyScalar(on));
    if (g === 'sing') local.y += Math.abs(Math.sin(s.t * 4.2)) * 0.012;
    const holdPos = local.applyQuaternion(camera.quaternion).add(camera.position);
    const holdQuat = q.copy(camera.quaternion);
    if (g === 'flip') holdQuat.multiply(qRoll.setFromAxisAngle(Z, Math.PI * ease((k - 0.08) / 0.3) * (1 - ease((k - 0.62) / 0.3))));
    if (g === 'hug') holdQuat.multiply(qRoll.setFromAxisAngle(Z, Math.sin(s.t * 2.2) * 0.12 * on));

    // Fly in from the bed (or the box), and back out when put down.
    if (s.leaving) s.fly = Math.max(0, s.fly - dt / FLY);
    else s.fly = Math.min(1, s.fly + dt / FLY);
    const f = ease(s.fly);
    h.position.lerpVectors(start.pos, holdPos, f);
    h.position.y += Math.sin(f * Math.PI) * 0.12;
    h.quaternion.slerpQuaternions(start.quat, holdQuat, f);
    h.scale.setScalar(THREE.MathUtils.lerp(start.scale, 1, f));
    h.updateMatrixWorld(true);
    if (s.leaving && s.fly <= 0) {
      setFurby({ held: null, from: null });
      return;
    }
    if (!s.leaving && s.fly >= 1 && !s.acted && !g) {
      // Just landed in your hands.
      s.acted = true;
      brain.act('hello');
    }

    // What each hand is doing.
    grip(want.left, -1);
    grip(want.right, 1);
    brain.finger = false;
    if (g && !s.acted) {
      s.acted = true;
      brain.act(g as Exclude<Gesture, 'putdown' | 'bedtime'>);
    }
    if (g === 'pet') {
      // Strokes from the forehead back over the top, lifts, comes round again.
      const p = (s.t * 0.85) % 1;
      const lift = p > 0.78 ? Math.sin(((p - 0.78) / 0.22) * Math.PI) * 0.03 : 0;
      const z = THREE.MathUtils.lerp(0.035, -0.035, Math.min(1, p / 0.78));
      palmOn(want.right, new THREE.Vector3(0.03, 0.15 + lift, z - 0.035), new THREE.Vector3(-0.8, -0.25, -0.6), new THREE.Vector3(0, -1, 0.05), 0.3);
    } else if (g === 'tickle') {
      const wig = Math.sin(s.t * 26) * 0.008;
      pointAt(want.right, 1, new THREE.Vector3(0.012 + wig, 0.032 + Math.sin(s.t * 19) * 0.006, 0.058 + Math.abs(wig)), new THREE.Vector3(-0.25, 0.3, -1), new THREE.Vector3(-0.3, -1, 0));
    } else if (g === 'feed') {
      // Finger in the beak; it chews on it.
      const into = bell(k, 0.08, 0.78);
      pointAt(want.right, 1, new THREE.Vector3(0, 0.067, 0.085 - 0.03 * into), new THREE.Vector3(-0.1, 0.12, -1), new THREE.Vector3(0, -1, 0));
      brain.finger = into > 0.6;
    } else if (g === 'hug') {
      // Both hands slide round behind it and squeeze.
      grip(want.left, -1, 0.025 * on, 0.03 * on);
      grip(want.right, 1, 0.025 * on, 0.03 * on);
    }
    if (g && k >= 1) {
      s.gesture = null;
      s.t = 0;
    }

    // The hands close on the Furby where it is right now.
    gripShape.inverse.copy(h.matrixWorld).invert();
    // Ease the hands toward their targets, then into world space.
    const shown = s.leaving ? ease((s.fly - 0.45) / 0.4) : ease((s.fly - 0.55) / 0.45);
    const rate = 1 - Math.exp(-dt * 14);
    (['left', 'right'] as const).forEach(side => {
      const hand: HandPose = hands[side];
      const t = want[side];
      const wristWorld = v.copy(t.wrist).applyMatrix4(h.matrixWorld);
      // Hidden hands wait just below the screen.
      const below = new THREE.Vector3(side === 'left' ? -0.18 : 0.18, -0.42, -0.3).applyQuaternion(camera.quaternion).add(camera.position);
      wristWorld.lerpVectors(below, wristWorld, shown);
      if (hand.shown < 0.02) hand.wrist.copy(wristWorld);
      else hand.wrist.lerp(wristWorld, rate);
      hand.fingers.lerp(t.fingers.clone().transformDirection(h.matrixWorld), rate).normalize();
      hand.palm.lerp(t.palm.clone().transformDirection(h.matrixWorld), rate).normalize();
      hand.curl += (t.curl - hand.curl) * rate;
      hand.grip = t.grips && s.fly > 0.9 ? gripShape : null;
      hand.point += (t.point - hand.point) * rate;
      hand.elbow.copy(ELBOW).setX(side === 'left' ? -ELBOW.x : ELBOW.x).applyQuaternion(camera.quaternion).add(camera.position);
      hand.shown = shown;
      applyHand(hand);
    });
  });

  if (!held || !brain) return null;
  const poke = (g: Gesture) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    furbyGesture(g);
  };
  return (
    <>
      <group ref={holder}>
        <Suspense fallback={null}>
          <FurbyPuppet brain={brain} />
        </Suspense>
        {/* Touch spots: beak (feed), head (pet), tummy (tickle). */}
        <mesh position={[0, 0.068, 0.058]} onPointerDown={poke('feed')}>
          <sphereGeometry args={[0.02, 10, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.12, 0]} onPointerDown={poke('pet')}>
          <sphereGeometry args={[0.055, 12, 10]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.03, 0.025]} onPointerDown={poke('tickle')}>
          <sphereGeometry args={[0.045, 12, 10]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <HoldArms left={hands.left} right={hands.right} />
    </>
  );
}
