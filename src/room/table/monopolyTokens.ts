import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { clone as cloneRigged } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * The tokens, all cast in the same polished pewter as the real ones. The top
 * hat and the thimble are turned on a lathe from the real tokens' profiles;
 * the rest are open models (credits in public/games/CREDITS.md) recast in metal.
 */

const P = '/games/monopoly/pieces/';

export interface TokenDef {
  id: string;
  label: string;
  /** Standing height on the board, metres (the real tokens are about 2-3 cm). */
  height: number;
  /** Turn so the token faces along its direction of travel. */
  face: number;
}

export const TOKEN_DEFS: TokenDef[] = [
  { id: 'hat', label: 'Top Hat', height: 0.024, face: 0 },
  { id: 'car', label: 'Race Car', height: 0.014, face: Math.PI / 2 },
  { id: 'dog', label: 'Dog', height: 0.024, face: 0 },
  { id: 'ship', label: 'Battleship', height: 0.022, face: Math.PI / 2 },
  { id: 'thimble', label: 'Thimble', height: 0.02, face: 0 },
  { id: 'cannon', label: 'Cannon', height: 0.018, face: 0 },
  { id: 'horse', label: 'Horse', height: 0.026, face: Math.PI / 2 },
  { id: 'duck', label: 'Rubber Ducky', height: 0.022, face: -Math.PI / 2 },
  { id: 'penguin', label: 'Penguin', height: 0.026, face: 0 },
];

let envTex: THREE.Texture | null = null;
let pewterMat: THREE.MeshStandardMaterial | null = null;

/** A soft studio reflection for table pieces, so polish reads even in a dark bedroom. */
export function useStudioEnv() {
  const gl = useThree(s => s.gl);
  return useMemo(() => {
    if (!envTex) {
      const pm = new THREE.PMREMGenerator(gl);
      envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      pm.dispose();
    }
    return envTex;
  }, [gl]);
}

/** One shared metal: the studio reflection makes it read as silver. */
export function usePewter() {
  const env = useStudioEnv();
  return useMemo(() => {
    if (pewterMat) return pewterMat;
    pewterMat = new THREE.MeshStandardMaterial({
      color: '#d4d8de',
      metalness: 1,
      roughness: 0.28,
      envMap: env,
      envMapIntensity: 1.15,
    });
    return pewterMat;
  }, [env]);
}

function lathe(points: [number, number][], segments = 40) {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );
}

/** Profiles in units of the token's height. */
function hatGeometry() {
  return lathe([
    [0, 0],
    [0.56, 0],
    [0.62, 0.02],
    [0.64, 0.05],
    [0.6, 0.075],
    [0.4, 0.09],
    [0.37, 0.12],
    [0.37, 0.24], // band
    [0.385, 0.25],
    [0.385, 0.33],
    [0.36, 0.34],
    [0.35, 0.9],
    [0.38, 0.95],
    [0.37, 0.99],
    [0, 1],
  ]);
}

function thimbleGeometry() {
  const pts: [number, number][] = [
    [0, 0.02],
    [0.46, 0],
    [0.5, 0.04],
    [0.5, 0.12],
    [0.46, 0.15],
    [0.46, 0.2],
    [0.49, 0.23],
    [0.46, 0.26],
  ];
  // the tapering body, then the domed crown
  for (let k = 0; k <= 8; k++) pts.push([0.46 - k * 0.012, 0.26 + k * 0.06]);
  for (let k = 1; k <= 8; k++) {
    const a = (k / 8) * (Math.PI / 2);
    pts.push([0.364 * Math.cos(a), 0.74 + 0.26 * Math.sin(a)]);
  }
  return lathe(pts);
}

/** Recentre a model on its base and scale it to the standing height. */
function fit(root: THREE.Object3D, height: number, mat: THREE.Material) {
  // a rigged model must bring its own skeleton along, or it ignores our scale
  const obj = cloneRigged(root);
  obj.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.material = mat;
    m.castShadow = false;
  });
  obj.updateMatrixWorld(true);
  // precise: a rigged model (the horse) only has its real size once skinned
  const box = new THREE.Box3().setFromObject(obj, true);
  const dims = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  obj.position.set(-c.x, -box.min.y, -c.z);
  const g = new THREE.Group();
  g.add(obj);
  g.scale.setScalar(height / Math.max(dims.y, 1e-6));
  return g;
}

/** Builds any token by id, fresh each call so every seat has its own. */
export function useTokenFactory() {
  const pewter = usePewter();
  const pack = useGLTF(`${P}tokens.glb`).scene;
  const penguin = useGLTF(`${P}penguin.glb`).scene;
  return useMemo(() => {
    const named = (name: string) => pack.getObjectByName(name) ?? new THREE.Group();
    return (id: string): THREE.Group => {
      const def = TOKEN_DEFS.find(t => t.id === id) ?? TOKEN_DEFS[0];
      let src: THREE.Object3D;
      if (id === 'hat') src = new THREE.Mesh(hatGeometry(), pewter);
      else if (id === 'thimble') src = new THREE.Mesh(thimbleGeometry(), pewter);
      else if (id === 'penguin') src = penguin;
      else src = named(id);
      const g = fit(src, def.height, pewter);
      const holder = new THREE.Group();
      g.rotation.y = def.face;
      holder.add(g);
      return holder;
    };
  }, [pack, penguin, pewter]);
}

useGLTF.preload(`${P}tokens.glb`);
useGLTF.preload(`${P}penguin.glb`);
