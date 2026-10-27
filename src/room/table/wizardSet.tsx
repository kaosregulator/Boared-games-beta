import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneRigged } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { ChessPieceColor, ChessPieceType } from '../../types';
import { useStudioEnv } from './monopolyTokens';

/**
 * The sculpted wizard set from the owner's wizards-chess project. Each piece
 * is a rigged marble figure with gold trim; black is the same sculpt, recast.
 * The cathedral those pieces used to stand in is not part of this room.
 */

const W = '/games/wizard/';
const FILE: Record<ChessPieceType, string> = {
  k: `${W}king_white.glb`,
  q: `${W}queen_white.glb`,
  b: `${W}bishop_white.glb`,
  n: `${W}knight_white.glb`,
  r: `${W}rook_white.glb`,
  p: `${W}pawn_white.glb`,
};

export type WizardFactory = (type: ChessPieceType, color: ChessPieceColor) => THREE.Group;

function marble(color: ChessPieceColor, env: THREE.Texture) {
  return new THREE.MeshStandardMaterial({
    color: color === 'w' ? '#e6dfd0' : '#222630',
    roughness: color === 'w' ? 0.34 : 0.28,
    metalness: color === 'w' ? 0.06 : 0.24,
    envMap: env,
    envMapIntensity: color === 'w' ? 0.55 : 0.9,
    side: THREE.DoubleSide,
  });
}

/** `scale` is the square size, the same factor the cathedral board used. */
export function useWizardSet(scale: number): WizardFactory {
  const env = useStudioEnv();
  const king = useGLTF(FILE.k);
  const queen = useGLTF(FILE.q);
  const bishop = useGLTF(FILE.b);
  const knight = useGLTF(FILE.n);
  const rook = useGLTF(FILE.r);
  const pawn = useGLTF(FILE.p);

  return useMemo(() => {
    const src = { k: king, q: queen, b: bishop, n: knight, r: rook, p: pawn };
    const white = marble('w', env);
    const black = marble('b', env);
    return (type, color) => {
      const gltf = src[type];
      const rig = cloneRigged(gltf.scene);
      rig.traverse(obj => {
        const name = obj.name || '';
        if (name.includes('Icosphere') || name.includes('glTF_not_exported')) {
          obj.visible = false;
          return;
        }
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        const matName = mat?.name ?? '';
        if (mat?.isMeshStandardMaterial) {
          mat.envMap = env;
          mat.envMapIntensity = matName.includes('Gold') ? 1.15 : 0.5;
        }
        if (matName.includes('Marble')) mesh.material = color === 'w' ? white : black;
      });
      rig.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(rig);
      // The sculpt's origin is the middle of the base. Weapons stick out, so
      // only the feet are seated; shifting by the whole box would walk the body off its square.
      rig.position.y = -box.min.y;
      const inner = new THREE.Group();
      inner.add(rig);
      inner.scale.setScalar(scale);
      // The sculpts face +Z. White stands on +Z and looks toward black.
      inner.rotation.y = color === 'w' ? Math.PI : 0;
      const g = new THREE.Group();
      g.add(inner);
      const mixer = new THREE.AnimationMixer(rig);
      const actions: Record<string, THREE.AnimationAction> = {};
      for (const clip of gltf.animations) {
        const action = mixer.clipAction(clip);
        action.setLoop(clip.name === 'Idle' || clip.name === 'Move' ? THREE.LoopRepeat : THREE.LoopOnce, clip.name === 'Idle' || clip.name === 'Move' ? Infinity : 1);
        action.clampWhenFinished = clip.name === 'Attack';
        actions[clip.name] = action;
      }
      actions.Idle?.play();
      g.userData.mixer = mixer;
      g.userData.actions = actions;
      g.userData.clip = 'Idle';
      return g;
    };
  }, [bishop, env, king, knight, pawn, queen, rook, scale]);
}

/** Obsidian plinth, parchment and slate squares, a gold rim. Top face sits at `top`. */
export function WizardBoard({ sq, top }: { sq: number; top: number }) {
  const tileH = 0.011;
  const y = top - tileH / 2;
  const light = useMemo(() => new THREE.MeshStandardMaterial({ color: '#dcd3c2', roughness: 0.4, metalness: 0.05 }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: '#14171f', roughness: 0.3, metalness: 0.16 }), []);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d4af37', roughness: 0.26, metalness: 0.86 }), []);
  const stone = useMemo(() => new THREE.MeshStandardMaterial({ color: '#16110e', roughness: 0.55, metalness: 0.12 }), []);
  const span = sq * 8;
  const rim = sq * 0.46;
  const tiles = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      tiles.push(
        <mesh key={`${r}${c}`} position={[(c - 3.5) * sq, y, (r - 3.5) * sq]} receiveShadow castShadow>
          <boxGeometry args={[sq * 0.98, tileH, sq * 0.98]} />
          <primitive object={(r + c) % 2 === 0 ? light : dark} attach="material" />
        </mesh>,
      );
    }
  }
  const outer = span / 2 + rim / 2;
  return (
    <group>
      <mesh position={[0, top - 0.018, 0]} receiveShadow>
        <boxGeometry args={[span + rim * 2.6, 0.018, span + rim * 2.6]} />
        <primitive object={stone} attach="material" />
      </mesh>
      {tiles}
      {(
        [
          [0, outer, span + rim * 2, rim],
          [0, -outer, span + rim * 2, rim],
          [outer, 0, rim, span],
          [-outer, 0, rim, span],
        ] as const
      ).map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, y, z]} castShadow receiveShadow>
          <boxGeometry args={[w, 0.014, d]} />
          <primitive object={gold} attach="material" />
        </mesh>
      ))}
      {(
        [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const
      ).map(([sx, sz], i) => (
        <mesh key={`post${i}`} position={[sx * (span / 2 + rim), top + 0.008, sz * (span / 2 + rim)]} castShadow>
          <cylinderGeometry args={[sq * 0.11, sq * 0.15, 0.03, 8]} />
          <primitive object={gold} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

for (const url of Object.values(FILE)) useGLTF.preload(url);
