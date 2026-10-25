import { Suspense, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AIM_HOME, SQUAD } from './range';
import { sniper } from './state';

/**
 * Two green plastic army men on the shelf over the TV, the real old-school
 * kind still stuck to their little bases: a machine gunner lying flat behind
 * his bipod, and the standing man pointing the way with a grenade in his
 * other hand. He's the one who talks. Always in the room.
 *
 * As you come in close he starts to waddle, rocking foot to foot the way
 * you'd walk a toy soldier across the carpet, so you spot him from the
 * chopper and come over. While he's talking he hops on top of that.
 */

const STANDING_URL = '/models/radio-man.glb';
const PRONE_URL = '/models/prone-sniper.glb';

/** How tall he stands on the shelf, base included. */
const STANDING_H = 0.085;
/** Nose to boots, lying down. */
const PRONE_LEN = 0.11;
/** Starts to waddle this far off, full swing by `WADDLE_FULL`. */
const WADDLE_FAR = 1.6;
const WADDLE_FULL = 0.35;

/**
 * Clone a Tripo figure, clear the metal (Tripo marks it all fully metallic,
 * which renders black without an environment map), and fit it: centred on
 * x/z, base on y = 0, scaled so `axis` measures `size`.
 */
function useFigure(url: string, axis: 'y' | 'z', size: number) {
  const gltf = useGLTF(url);
  return useMemo(() => {
    const model = gltf.scene.clone(true);
    model.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.raycast = () => {};
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      mat.metalness = 0;
      mat.metalnessMap = null;
      mat.roughness = Math.min(mat.roughness, 0.45);
      mat.envMapIntensity = 0.3;
      mesh.material = mat;
    });
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const dims = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const s = size / (axis === 'y' ? dims.y : dims.z);
    model.scale.setScalar(s);
    model.position.set(-centre.x * s, -box.min.y * s, -centre.z * s);
    const holder = new THREE.Group();
    holder.add(model);
    return holder;
  }, [gltf.scene, axis, size]);
}

const _here = new THREE.Vector3();

function Talker() {
  const figure = useFigure(STANDING_URL, 'y', STANDING_H);
  const ref = useRef<THREE.Group>(null);
  const clock = useRef(0);
  const swing = useRef(0);
  useFrame(({ camera }, raw) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(raw, 0.05);
    // Closer you get, the harder he rocks.
    _here.set(SQUAD.radio.x, SQUAD.top + STANDING_H * 0.6, SQUAD.radio.z);
    const d = camera.position.distanceTo(_here);
    const want = THREE.MathUtils.clamp((WADDLE_FAR - d) / (WADDLE_FAR - WADDLE_FULL), 0, 1);
    swing.current += (want - swing.current) * Math.min(1, dt * 3);
    const w = swing.current;
    clock.current += dt * (4.2 + 2.2 * w);
    const t = clock.current;
    // Waddle: rock onto one edge of the base, then the other, with a little
    // lift each time he comes over the middle. Pivots on the base edge.
    const rock = Math.sin(t) * 0.2 * w;
    const step = Math.abs(Math.cos(t)) * 0.006 * w;
    // Talking: the bounce you'd give a toy that's doing the talking.
    const h = sniper.hop;
    const hop = Math.abs(Math.sin(h * Math.PI)) * 0.012;
    g.rotation.z = rock + Math.sin(h * Math.PI * 2) * 0.12;
    g.rotation.y = Math.sin(t * 0.5) * 0.12 * w;
    // Lift by the tilt so the low edge of the base stays on the shelf.
    g.position.y = step + hop + Math.abs(Math.sin(g.rotation.z)) * 0.02;
  });
  return (
    <group position={[SQUAD.radio.x, SQUAD.top, SQUAD.radio.z]} rotation={[0, -0.35, 0]}>
      <group ref={ref}>
        <primitive object={figure} />
      </group>
    </group>
  );
}

function Gunner() {
  const figure = useFigure(PRONE_URL, 'z', PRONE_LEN);
  const body = useRef<THREE.Group>(null);
  useFrame(() => {
    const b = body.current;
    if (!b) return;
    // He swings round with your aim; out of sight while you're on his scope.
    b.rotation.y = sniper.yaw - AIM_HOME.yaw;
    b.rotation.x = -THREE.MathUtils.clamp(sniper.pitch - AIM_HOME.pitch, -0.12, 0.12);
    b.visible = !sniper.scoped;
  });
  return (
    <group position={[SQUAD.sniper.x, SQUAD.top, SQUAD.sniper.z]} rotation={[0, AIM_HOME.yaw, 0]}>
      <group ref={body}>
        {/* His shoulder sits on the rifle's pivot, gun out over the shelf edge. */}
        <group position={[0, 0, -0.012]}>
          <primitive object={figure} />
        </group>
      </group>
    </group>
  );
}

export function ShelfSquad() {
  return (
    <Suspense fallback={null}>
      <Gunner />
      <Talker />
    </Suspense>
  );
}

useGLTF.preload(STANDING_URL);
useGLTF.preload(PRONE_URL);
