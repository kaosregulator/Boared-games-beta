import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { pushHud } from '../table/tableHud';
import { FurbyPuppet } from './FurbyPuppet';
import { anchorPose, furbyAnchors, setFurby, tableBrain, useFurby } from './furbyStore';
import { motorWhirr } from './furbyAudio';
import { HoldArms, applyHand, newHandPose, type GripShape } from './HoldArms';

/**
 * The Furbies at the card table. The grey 1998 Furby comes in the user's
 * display box (a clear plastic window added over the open front and sides);
 * a hand reaches in from above and pulls it up out of the top (straight
 * through the cardboard), sets it down in front of you, and it's then a
 * live toy: touch its head, tummy or beak, pick it up, put it to bed. The
 * Furby Boom stands at the back in its own box, dancing on a loop, silent.
 *
 * Children of the table top: y 0 is the table surface, you sit at +z.
 */

const BOX_URL = '/models/furby-box.glb';
const BOOM_URL = '/models/furby-boom.glb';

/** The display box model is 0.98 units tall; this makes it about 29 cm, just room for the Furby. */
const BOX_SCALE = 0.3;
const BOX_AT = new THREE.Vector3(-0.22, 0, 0.0);
const BOX_YAW = 0.32;
/** Inside the box, on its tray, in box model units. */
const INSIDE = new THREE.Vector3(0, 0.225, 0.14);
const BOX_TOP = 1.0;
/** Where it sits once it's out, in front of you. */
const OUT = new THREE.Vector3(0.02, 0, 0.17);

/** The Boom rig's Furby is 0.32 units tall: about 13 cm, a little smaller than the 1998 one. */
const BOOM_SCALE = 0.42;
const BOOM_FLOOR = 0.226;

const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

function plasticTexture() {
  // A couple of soft vertical glints, like light on a vacuum-formed window.
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 8;
  const g = c.getContext('2d')!;
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
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** The clear window over the box's open front and sides, in box model units. */
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
  useEffect(() => () => mat.dispose(), [mat]);
  const y0 = 0.21;
  const y1 = 0.8;
  const h = y1 - y0;
  const front = 0.43;
  const left = -0.43;
  const right = 0.4;
  const back = -0.05;
  return (
    <group renderOrder={3}>
      <mesh position={[(left + right) / 2, y0 + h / 2, front]} material={mat}>
        <planeGeometry args={[right - left, h]} />
      </mesh>
      <mesh position={[left, y0 + h / 2, (front + back) / 2]} rotation={[0, Math.PI / 2, 0]} material={mat}>
        <planeGeometry args={[front - back, h]} />
      </mesh>
      <mesh position={[right, y0 + h / 2, (front + back) / 2]} rotation={[0, -Math.PI / 2, 0]} material={mat}>
        <planeGeometry args={[front - back, h]} />
      </mesh>
    </group>
  );
}

function FurbyBox() {
  const gltf = useGLTF(BOX_URL);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  return (
    <group position={BOX_AT} rotation={[0, BOX_YAW, 0]} scale={BOX_SCALE}>
      <primitive object={scene} />
      <PlasticWindow />
    </group>
  );
}

/** The Furby Boom in its own box, dancing at the back of the table. */
function DancingBoom({ onPoke }: { onPoke: () => void }) {
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
    <group position={[0.26, 0, -0.27]} rotation={[0, -0.3, 0]}>
      <group ref={group} scale={BOOM_SCALE} position={[0, BOOM_FLOOR * BOOM_SCALE, 0]}>
        <primitive object={gltf.scene} />
      </group>
      <mesh
        position={[0.12, 0.1, -0.05]}
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
  const clock = useRef(0);
  const cues = useRef(new Set<string>());
  const done = useRef(false);
  const inside = useMemo(
    () => INSIDE.clone().multiplyScalar(BOX_SCALE).applyAxisAngle(new THREE.Vector3(0, 1, 0), BOX_YAW).add(BOX_AT),
    [],
  );
  const top = BOX_TOP * BOX_SCALE + 0.02;
  // One hand does the pulling; the other stays out of shot.
  const pull = useMemo(newHandPose, []);
  const idle = useMemo(newHandPose, []);
  const pullGrip = useMemo<GripShape>(
    () => ({ inverse: new THREE.Matrix4(), center: new THREE.Vector3(0, 0.068, 0.003), radii: new THREE.Vector3(0.066, 0.072, 0.06) }),
    [],
  );

  useEffect(() => {
    clock.current = 0;
    cues.current.clear();
    done.current = false;
    if (phase === 'pack' && held === 'table') setFurby({ held: null, from: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (fur.current) furbyAnchors.table = fur.current;
    return () => {
      delete furbyAnchors.table;
    };
  }, []);

  useEffect(() => {
    if (phase !== 'play') return;
    const act = (kind: Parameters<typeof tableBrain.act>[0]) => () => tableBrain.act(kind);
    pushHud({
      title: 'Furby',
      note: 'Brand new, out of the box. Touch its head, tummy or beak, or pick it up and play.',
      detail: 'The Furby Boom in the back just dances.',
      onLeave,
      actions: [
        { label: 'Pet', onClick: act('pet') },
        { label: 'Tickle', onClick: act('tickle') },
        { label: 'Feed', onClick: act('feed') },
        { label: 'Sing', onClick: act('sing') },
        { label: 'Dance with Boom', onClick: act('dance') },
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
  }, [phase, onLeave]);

  useFrame((_, dtRaw) => {
    const g = fur.current;
    if (!g) return;
    const dt = Math.min(dtRaw, 0.05);
    clock.current += dt;
    const t = clock.current;
    tableBrain.attentive = phase === 'play';
    const cue = (name: string, at: number, fn: () => void) => {
      if (t >= at && !cues.current.has(name)) {
        cues.current.add(name);
        fn();
      }
    };

    let squash = 1;
    if (phase === 'unfold') {
      // Wiggles in the box, gets pulled up out of the top, hops down to you.
      cue('hello', 0.7, () => tableBrain.act('hello'));
      cue('pull', 1.6, () => {
        motorWhirr(0.24, 1.1);
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
        g.rotation.set(0, BOX_YAW + Math.sin(t * 9) * 0.06 * (t > 0.6 && t < 1.6 ? 1 : 0), Math.sin(t * 7) * 0.1 * up * (1 - up));
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
      <Suspense fallback={null}>
        <FurbyBox />
      </Suspense>
      <Suspense fallback={null}>
        <DancingBoom onPoke={() => phase === 'play' && tableBrain.act('dance')} />
      </Suspense>
      {phase !== 'play' && <HoldArms left={idle} right={pull} />}
      <group ref={fur} position={inside}>
        <Suspense fallback={null}>
          <FurbyPuppet brain={tableBrain} visible={!away} />
        </Suspense>
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
    </group>
  );
}

useGLTF.preload(BOX_URL);
