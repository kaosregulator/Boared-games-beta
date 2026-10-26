import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { pushHud } from '../table/tableHud';
import { useWarmReveal } from '../../engine/SceneWarmup';
import { setTableView, tableCam, type Shot } from '../table/tableCam';
import { FURBY_SOLID, FurbyPuppet } from './FurbyPuppet';
import { scriptedStep } from './scriptClock';
import { anchorPose, furbyAnchors, setFurby, tableBrain, useFurby } from './furbyStore';
import { speakAs } from './furbyBrain';
import { motorWhirr } from './furbyAudio';
import { HoldArms, applyHand, newHandPose, type GripShape } from './HoldArms';
import {
  BOOM_FROM,
  BOOM_SPOT,
  DANCE_CAM,
  DANCE_SEC,
  ENTER_SEC,
  LEAVE_SEC,
  SHOTS,
  TALK_AFTER,
  TALK_BEFORE,
  boomBounce,
  boomWalk,
  strobeAt,
  type Beat,
} from './furbyDance';

/**
 * The Furbies at the card table. The grey 1998 Furby comes in the user's
 * display box (a clear plastic window with a little round peep-hole, and
 * "TRY ME" on the cardboard above it). It stays in there until you press
 * Unbox: the box shakes, it says hello, and a hand pulls it up out of the
 * top, sets it down in front of you, and it's then a live toy: touch its
 * head, tummy or beak, pick it up, put it to bed.
 *
 * The Furby Boom is not on the table until you ask it to dance. It waddles
 * in, the two of them talk side by side, ask each other to dance, the lights
 * go strobe red and blue while they dance, then they talk some more until
 * pack-up, when the Boom waddles back off. See furbyDance.ts for the script.
 *
 * Children of the table top: y 0 is the table surface, you sit at +z.
 */

const BOX_URL = '/models/furby-box.glb';
const BOOM_URL = '/models/furby-boom.glb';
const BOOM_NAME = 'Furby Boom';

/** The display box model is 0.98 units tall; this makes it about 29 cm, just room for the Furby. */
const BOX_SCALE = 0.3;
const BOX_AT = new THREE.Vector3(-0.22, 0, 0.0);
const BOX_YAW = 0.32;
/** Inside the box, on its tray, in box model units. */
const INSIDE = new THREE.Vector3(0, 0.225, 0.14);
const BOX_TOP = 1.0;
/**
 * Where it sits once it's out: in front of you, and in front of the Boom's
 * box when the Boom comes over (the Boom rig carries its own box beside it).
 * At (0.02, 0, 0.17) it stood inside that box for the whole visit.
 */
const OUT = new THREE.Vector3(0.06, 0, 0.22);

/** The Boom rig's Furby is 0.32 units tall: about 13 cm, a little smaller than the 1998 one. */
const BOOM_SCALE = 0.42;
const BOOM_FLOOR = 0.226;

/** The window, in box model units: front plane and its sides. */
const WIN = { y0: 0.21, y1: 0.8, front: 0.43, left: -0.43, right: 0.4, back: -0.05 };
/** The peep-hole, centred on the window front. */
const HOLE = { x: 0, y: 0.62, r: 0.1 };

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** The scene's state: where the Boom is in its script and how far through it we are. */
interface Scene {
  kind: 'away' | 'enter' | 'talk' | 'dance' | 'talk2' | 'stand' | 'leave';
  /** Seconds into the current kind. */
  t: number;
  /** Next beat of the talk that's playing. */
  beat: number;
  /** The Boom is mid-line until this many seconds into the kind. */
  boomUntil: number;
  /** The camera view from before the scene, to hand back at the end. */
  saved: Shot | null;
}

function freshScene(): Scene {
  return { kind: 'away', t: 0, beat: 0, boomUntil: 0, saved: null };
}

function canvasTexture(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d')!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function plasticTexture() {
  // A couple of soft vertical glints, like light on a vacuum-formed window.
  return canvasTexture(128, 8, g => {
    const grad = g.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0.05)');
    grad.addColorStop(0.18, 'rgba(255,255,255,0.55)');
    grad.addColorStop(0.24, 'rgba(255,255,255,0.08)');
    grad.addColorStop(0.7, 'rgba(255,255,255,0.03)');
    grad.addColorStop(0.78, 'rgba(255,255,255,0.3)');
    grad.addColorStop(0.83, 'rgba(255,255,255,0.04)');
    grad.addColorStop(1, 'rgba(255,255,255,0.08)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 8);
  });
}

/**
 * Alpha for the window front: white everywhere but the peep-hole, which is
 * cut clear. The texture maps the plane's full width and height, so the
 * canvas keeps the window's proportions.
 */
function holeTexture() {
  const w = 256;
  const h = Math.round((256 * (WIN.y1 - WIN.y0)) / (WIN.right - WIN.left));
  const u = (HOLE.x - WIN.left) / (WIN.right - WIN.left);
  const v = (HOLE.y - WIN.y0) / (WIN.y1 - WIN.y0);
  return canvasTexture(w, h, g => {
    g.fillStyle = '#fff';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#000';
    g.beginPath();
    g.ellipse(u * w, (1 - v) * h, (HOLE.r / (WIN.right - WIN.left)) * w, (HOLE.r / (WIN.y1 - WIN.y0)) * h, 0, 0, Math.PI * 2);
    g.fill();
  });
}

/** The clear window over the box's open front and sides, with the peep-hole cut in the front. */
function PlasticWindow() {
  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: plasticTexture(),
        color: '#eef6ff',
        transparent: true,
        opacity: 0.32,
        roughness: 0.08,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );
  const frontMat = useMemo(() => {
    const m = mat.clone();
    m.alphaMap = holeTexture();
    m.needsUpdate = true;
    return m;
  }, [mat]);
  const rimMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e8f1ff', transparent: true, opacity: 0.75, depthWrite: false }), []);
  useEffect(
    () => () => {
      mat.dispose();
      frontMat.dispose();
      rimMat.dispose();
    },
    [mat, frontMat, rimMat],
  );
  const h = WIN.y1 - WIN.y0;
  const front = WIN.front;
  return (
    <group renderOrder={3}>
      <mesh position={[(WIN.left + WIN.right) / 2, WIN.y0 + h / 2, front]} material={frontMat}>
        <planeGeometry args={[WIN.right - WIN.left, h]} />
      </mesh>
      <mesh position={[HOLE.x, HOLE.y, front + 0.004]} material={rimMat}>
        <ringGeometry args={[HOLE.r * 0.9, HOLE.r * 1.12, 40]} />
      </mesh>
      <mesh position={[WIN.left, WIN.y0 + h / 2, (front + WIN.back) / 2]} rotation={[0, Math.PI / 2, 0]} material={mat}>
        <planeGeometry args={[front - WIN.back, h]} />
      </mesh>
      <mesh position={[WIN.right, WIN.y0 + h / 2, (front + WIN.back) / 2]} rotation={[0, -Math.PI / 2, 0]} material={mat}>
        <planeGeometry args={[front - WIN.back, h]} />
      </mesh>
    </group>
  );
}

function FurbyBox({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  const gltf = useGLTF(BOX_URL);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  return (
    <group ref={groupRef} position={BOX_AT} rotation={[0, BOX_YAW, 0]} scale={BOX_SCALE}>
      <primitive object={scene} />
      <PlasticWindow />
    </group>
  );
}

/**
 * The Furby Boom. Hidden until it's asked to dance; FurbyTable moves it, and
 * its own dance loop runs whenever it's on the table.
 */
function Boom({ rootRef, onPoke }: { rootRef: React.RefObject<THREE.Group | null>; onPoke: () => void }) {
  const gltf = useGLTF(BOOM_URL);
  const group = useRef<THREE.Group>(null);
  const { actions, names } = useAnimations(gltf.animations, group);
  useEffect(() => {
    const action = names[0] ? actions[names[0]] : null;
    action?.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    return () => {
      action?.stop();
    };
  }, [actions, names]);
  return (
    <group ref={rootRef} visible={false}>
      <group ref={group} scale={BOOM_SCALE} position={[0, BOOM_FLOOR * BOOM_SCALE, 0]}>
        <primitive object={gltf.scene} />
      </group>
      <mesh
        position={[0, 0.1, -0.05]}
        onPointerDown={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onPoke();
        }}
      >
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function FurbyTable({
  phase,
  onUnfolded,
  onPacked,
  onLeave,
}: {
  phase: 'unfold' | 'play' | 'pack';
  onUnfolded: () => void;
  onPacked: () => void;
  onLeave: () => void;
}) {
  const { held } = useFurby();
  const away = held === 'table';
  const fur = useRef<THREE.Group>(null);
  const box = useRef<THREE.Group>(null);
  const boom = useRef<THREE.Group>(null);
  const redLight = useRef<THREE.PointLight>(null);
  const blueLight = useRef<THREE.PointLight>(null);
  const clock = useRef(0);
  const mark = useRef<number | null>(null);
  const cues = useRef(new Set<string>());
  const done = useRef(false);
  /** Set by the Unbox button. Until then the Furby stays in its box and the clock doesn't run. */
  const unboxed = useRef(false);
  const scene = useRef<Scene>(freshScene());
  const boomVoice = useRef<{ stop: () => void } | null>(null);
  const calm = useMemo(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const inside = useMemo(
    () => INSIDE.clone().multiplyScalar(BOX_SCALE).applyAxisAngle(new THREE.Vector3(0, 1, 0), BOX_YAW).add(BOX_AT),
    [],
  );
  const top = BOX_TOP * BOX_SCALE + 0.02;
  // One hand does the pulling; the other stays out of shot.
  const pull = useMemo(newHandPose, []);
  const idle = useMemo(newHandPose, []);
  const pullGrip = useMemo<GripShape>(
    () => ({ inverse: new THREE.Matrix4(), parts: FURBY_SOLID }),
    [],
  );

  /** Moves the scene on to its next kind, and restores the camera when the party's over. */
  const begin = (kind: Scene['kind']) => {
    const s = scene.current;
    s.kind = kind;
    s.t = 0;
    s.beat = 0;
    s.boomUntil = 0;
    if (kind === 'away' || kind === 'leave' || kind === 'stand') {
      if (s.saved) setTableView(s.saved, true);
      s.saved = null;
    }
  };

  /** Asks the Boom over. The Furby wakes up first if it was asleep. */
  const startDance = () => {
    const s = scene.current;
    if (phase !== 'play') return;
    if (s.kind === 'away') {
      if (tableBrain.asleep) tableBrain.act('wake');
      s.saved = tableCam.base;
      begin('enter');
      tableBrain.act('hello');
    } else if (s.kind === 'stand') {
      begin('dance');
      tableBrain.act('dance');
      setTableView(SHOTS[DANCE_CAM], true);
    }
  };

  /** Plays the beats that have come due, each with its own camera move. */
  const playBeats = (beats: Beat[], s: Scene) => {
    while (s.beat < beats.length && s.t >= beats[s.beat].at) {
      const b = beats[s.beat++];
      if (b.who === 'furby') {
        tableBrain.say(b.furbish, b.english, b.tag, 3);
      } else {
        boomVoice.current?.stop();
        boomVoice.current = speakAs(BOOM_NAME, b.furbish, b.english, b.tag, 0.92);
        s.boomUntil = s.t + 2.4;
      }
      setTableView(SHOTS[b.cam], true);
    }
  };

  useEffect(() => {
    clock.current = 0;
    mark.current = null;
    cues.current.clear();
    done.current = false;
    if (phase === 'pack') {
      if (held === 'table') setFurby({ held: null, from: null });
      // The Boom waddles off with the box packing up.
      if (scene.current.kind !== 'away' && scene.current.kind !== 'leave') begin('leave');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (fur.current) furbyAnchors.table = fur.current;
    return () => {
      delete furbyAnchors.table;
      const s = scene.current;
      if (s.saved) setTableView(s.saved, true);
      boomVoice.current?.stop();
    };
  }, []);

  // Unfold: the box waits for Unbox.
  useEffect(() => {
    // Re-runs whenever the parent re-renders (onLeave is a new function); once Unbox is pressed, don't bring it back.
    if (phase !== 'unfold' || unboxed.current) return;
    pushHud({
      title: 'Furby',
      note: 'Still in its box. Try me!',
      detail: 'Press unbox, and it comes out to say hello.',
      onLeave,
      dock: 'bottom',
      actions: [
        {
          label: 'Unbox',
          tone: 'amber',
          onClick: () => {
            unboxed.current = true;
            pushHud(null);
          },
        },
      ],
    });
    return () => pushHud(null);
  }, [phase, onLeave]);

  useEffect(() => {
    if (phase !== 'play') return;
    const act = (kind: Parameters<typeof tableBrain.act>[0]) => () => tableBrain.act(kind);
    pushHud({
      title: 'Furby',
      note: 'Brand new, out of the box. Touch its head, tummy or beak, or pick it up and play.',
      detail: 'Ask the Furby Boom to come out and dance.',
      onLeave,
      dock: 'bottom',
      actions: [
        { label: 'Pet', onClick: act('pet') },
        { label: 'Tickle', onClick: act('tickle') },
        { label: 'Feed', onClick: act('feed') },
        { label: 'Sing', onClick: act('sing') },
        { label: 'Dance with Boom', onClick: startDance },
        {
          label: 'Pick it up',
          tone: 'amber',
          onClick: () => {
            const from = anchorPose('table');
            if (from && !tableBrain.asleep) setFurby({ held: 'table', from });
          },
        },
        { label: 'Night night', onClick: () => tableBrain.act(tableBrain.asleep ? 'wake' : 'sleep') },
      ],
    });
    return () => pushHud(null);
    // startDance reads the current phase and scene only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, onLeave]);

  useFrame((_, dtRaw) => {
    const g = fur.current;
    if (!g) return;
    const s = scene.current;

    // The Boom's party: a script that follows real time, not the walker's frame step.
    const live = phase === 'play' || s.kind === 'leave';
    if (s.kind !== 'away' && s.kind !== 'stand' && live) {
      s.t += Math.min(dtRaw, 0.1);
      if (s.kind === 'enter' && s.t >= ENTER_SEC) {
        begin('talk');
        setTableView(SHOTS.wide, true);
      } else if (s.kind === 'talk') {
        playBeats(TALK_BEFORE.beats, s);
        if (s.t >= TALK_BEFORE.dur) {
          begin('dance');
          tableBrain.act('dance');
          setTableView(SHOTS[DANCE_CAM], true);
        }
      } else if (s.kind === 'dance' && s.t >= DANCE_SEC) {
        begin('talk2');
        setTableView(SHOTS.wide, true);
      } else if (s.kind === 'talk2') {
        playBeats(TALK_AFTER.beats, s);
        if (s.t >= TALK_AFTER.dur) begin('stand');
      } else if (s.kind === 'leave' && s.t >= LEAVE_SEC) {
        begin('away');
      }
    }

    // The Boom: where it is, which way it faces, and how it moves.
    const b = boom.current;
    if (b) {
      b.visible = s.kind !== 'away';
      const talking = s.t < s.boomUntil;
      let x = BOOM_SPOT[0];
      let z = BOOM_SPOT[2];
      let yaw = 0;
      let sway = 0;
      let bob = 0;
      if (s.kind === 'enter') {
        ({ x, z, yaw, sway, bob } = boomWalk(BOOM_FROM, BOOM_SPOT, s.t / ENTER_SEC, s.t));
      } else if (s.kind === 'leave') {
        ({ x, z, yaw, sway, bob } = boomWalk(BOOM_SPOT, BOOM_FROM, s.t / LEAVE_SEC, s.t));
      } else if (s.kind === 'dance') {
        sway = Math.sin(s.t * Math.PI * 2.2) * 0.14;
        bob = boomBounce(s.t, false);
      } else if (s.kind === 'talk' || s.kind === 'talk2' || s.kind === 'stand') {
        bob = talking ? boomBounce(s.t, true) : 0;
      }
      b.position.set(x, bob, z);
      b.rotation.set(0, yaw, sway);
    }

    // Strobe: red and blue flashes through the dance. Reduced motion gets a steady wash.
    const strobe = s.kind === 'dance' ? (calm ? 'steady' : strobeAt(s.t)) : null;
    if (redLight.current) redLight.current.intensity = strobe === 'steady' ? 1.2 : strobe === 'red' ? 5 : 0;
    if (blueLight.current) blueLight.current.intensity = strobe === 'steady' ? 1.2 : strobe === 'blue' ? 5 : 0;

    // The Furby is off the speaker while the Boom has the floor.
    tableBrain.attentive = phase === 'play' && (s.kind === 'away' || s.kind === 'stand');

    // Unfold: the box waits. Once Unbox is pressed the clock runs and the box shakes until the pull.
    const waiting = phase === 'unfold' && !unboxed.current;
    const step = waiting
      ? { dt: 0, at: performance.now() }
      : phase === 'play'
        ? { dt: Math.min(dtRaw, 0.05), at: performance.now() }
        : scriptedStep(mark.current, performance.now(), 1);
    if (phase !== 'play') mark.current = step.at;
    clock.current += step.dt;
    const t = clock.current;
    const cue = (name: string, at: number, fn: () => void) => {
      if (t >= at && !cues.current.has(name)) {
        cues.current.add(name);
        fn();
      }
    };

    let squash = 1;
    if (phase === 'unfold') {
      // Shakes in the box, says hello, gets pulled up out of the top, hops down to you.
      const shaking = t < 1.6 ? 1 : 0;
      if (box.current) {
        box.current.rotation.set(Math.sin(t * 41) * 0.035 * shaking, BOX_YAW, Math.sin(t * 33) * 0.03 * shaking);
      }
      cue('hello', 0.35, () => tableBrain.act('hello'));
      cue('pull', 1.6, () => {
        motorWhirr(0.2, 1.1);
        tableBrain.act('flip');
      });
      cue('land', 3.5, () => tableBrain.act('putdown'));
      cue('done', 4.2, () => {
        if (!done.current) {
          done.current = true;
          onUnfolded();
        }
      });
      const up = ease((t - 1.6) / 1.1);
      const hop = ease((t - 2.75) / 0.75);
      if (hop <= 0) {
        g.position.copy(inside);
        g.position.y = THREE.MathUtils.lerp(inside.y, top, up);
        g.rotation.set(0, BOX_YAW + Math.sin(t * 9) * 0.06 * (t > 0.2 && t < 1.6 ? 1 : 0), Math.sin(t * 7) * 0.1 * up * (1 - up));
      } else {
        g.position.lerpVectors(new THREE.Vector3(inside.x, top, inside.z), OUT, hop);
        g.position.y = THREE.MathUtils.lerp(top, 0, hop) + Math.sin(hop * Math.PI) * 0.08;
        g.rotation.set(0, THREE.MathUtils.lerp(BOX_YAW, 0, hop), 0);
      }
      const land = (t - 3.5) / 0.3;
      if (land > 0 && land < 1) squash = 1 - Math.sin(land * Math.PI) * 0.12;
    } else if (phase === 'pack') {
      // Back in the box the way it came out.
      cue('bye', 0.05, () => tableBrain.act('sleep'));
      cue('done', 2.9, () => {
        if (!done.current) {
          done.current = true;
          onPacked();
        }
      });
      const hop = ease((t - 0.6) / 0.75);
      const down = ease((t - 1.4) / 0.9);
      if (down <= 0) {
        g.position.lerpVectors(OUT, new THREE.Vector3(inside.x, top, inside.z), hop);
        g.position.y = THREE.MathUtils.lerp(0, top, hop) + Math.sin(hop * Math.PI) * 0.08;
        g.rotation.set(0, THREE.MathUtils.lerp(0, BOX_YAW, hop), 0);
      } else {
        g.position.copy(inside);
        g.position.y = THREE.MathUtils.lerp(top, inside.y, down);
      }
    } else {
      g.position.copy(OUT);
      g.rotation.set(0, 0, 0);
    }
    g.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));

    // The pulling hand: comes down from above, pinches the Furby by the top
    // of its head, carries it, lets go and goes back up.
    let reach = 0;
    let grip = 0;
    if (phase === 'unfold') {
      reach = ease((t - 1.0) / 0.55) * (1 - ease((t - 3.55) / 0.5));
      grip = ease((t - 1.45) / 0.2) * (1 - ease((t - 3.5) / 0.15));
    } else if (phase === 'pack') {
      reach = ease((t - 0.05) / 0.5) * (1 - ease((t - 2.35) / 0.5));
      grip = ease((t - 0.45) / 0.15) * (1 - ease((t - 2.3) / 0.15));
    }
    // HoldArms sits beside the Furby in this group, so its "world" is the
    // table top. The hand comes down over the top of its head, palm down,
    // fingers closing round the back of its head until they touch.
    g.updateMatrix();
    const lift = (1 - reach) * 0.3;
    pull.shown = reach > 0.01 ? 1 : 0;
    pull.fingers.set(0.1, -0.35, -1).normalize().transformDirection(g.matrix);
    pull.palm.set(0, -1, 0.15).transformDirection(g.matrix);
    pull.wrist
      .set(0, 0.162 + lift, 0.0)
      .addScaledVector(new THREE.Vector3(0.1, -0.35, -1).normalize(), -0.05)
      .add(new THREE.Vector3(0, 0.012, 0))
      .applyMatrix4(g.matrix);
    pull.curl = grip;
    g.updateWorldMatrix(true, false);
    pullGrip.inverse.copy(g.matrixWorld).invert();
    pull.grip = grip > 0.05 ? pullGrip : null;
    pull.elbow.set(pull.wrist.x + 0.06, pull.wrist.y + 0.3, pull.wrist.z + 0.04);
    applyHand(pull);
    applyHand(idle);
  });

  const poke = (kind: 'pet' | 'tickle' | 'feed') => (e: ThreeEvent<PointerEvent>) => {
    if (phase !== 'play') return;
    e.stopPropagation();
    tableBrain.act(kind);
  };

  return (
    <group>
      {/* The box and the Furby inside it load as one and show together. */}
      <Suspense fallback={null}>
        <Boxed>
          <FurbyBox groupRef={box} />
          <group ref={fur} position={inside}>
            <FurbyPuppet brain={tableBrain} visible={!away} />
            {!away && phase === 'play' && (
              <>
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
              </>
            )}
          </group>
          {/* The hand that pulls it out shows with the box, not floating over an empty table. */}
          {phase !== 'play' && <HoldArms left={idle} right={pull} />}
        </Boxed>
      </Suspense>
      {/* The Boom stays off the table until the dance, so it loads behind the scenes. */}
      <Suspense fallback={null}>
        <Boom rootRef={boom} onPoke={() => scene.current.kind === 'stand' && startDance()} />
      </Suspense>
      <pointLight ref={redLight} position={[-0.35, 0.55, 0.3]} color="#ff1e1e" intensity={0} distance={3} decay={2} />
      <pointLight ref={blueLight} position={[0.6, 0.55, 0.3]} color="#2a5bff" intensity={0} distance={3} decay={2} />
    </group>
  );
}

/** Holds the box and Furby back until both are loaded and ready to draw, then shows them in one frame. */
function Boxed({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useWarmReveal(group, true, 3000);
  return <group ref={group}>{children}</group>;
}

useGLTF.preload(BOX_URL);
useGLTF.preload(BOOM_URL);
