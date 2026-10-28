import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneRigged } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { ChessPieceColor, ChessPieceType } from '../../types';
import { useStudioEnv } from './monopolyTokens';
import { CLIP_SPEED } from './wizardMelee';

/**
 * The sculpted wizard set from the owner's wizards-chess project. Each piece
 * is a rigged marble figure with gold trim; black is the same sculpt, recast.
 * Of the cathedral the pieces stood in, only its altar board comes to the
 * table (WizardBoard); the nave around it stays out of the bedroom.
 */

const W = '/games/wizard/';
const ALTAR = `${W}altar.glb`;
const FILE: Record<ChessPieceType, string> = {
  k: `${W}king_white.glb`,
  q: `${W}queen_white.glb`,
  b: `${W}bishop_white.glb`,
  n: `${W}knight_white.glb`,
  r: `${W}rook_white.glb`,
  p: `${W}pawn_white.glb`,
};

export type WizardFactory = ((type: ChessPieceType, color: ChessPieceColor) => THREE.Group) & {
  /** The two marble materials, which the stone shards share. */
  marble: Record<ChessPieceColor, THREE.MeshStandardMaterial>;
};

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

/** `scale` is the square size: the source scales each statue by its 0.34 m square. */
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
    const make = (type: ChessPieceType, color: ChessPieceColor) => {
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
        const loop = clip.name === 'Idle' || clip.name === 'Move';
        const action = mixer.clipAction(clip);
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
        // the attack holds its follow-through and the shatter its last frame, as in the source
        action.clampWhenFinished = !loop;
        action.timeScale = CLIP_SPEED;
        actions[clip.name] = action;
      }
      actions.Idle?.play();
      g.userData.mixer = mixer;
      g.userData.actions = actions;
      g.userData.clip = 'Idle';
      return g;
    };
    return Object.assign(make, { marble: { w: white, b: black } });
  }, [bishop, env, king, knight, pawn, queen, rook, scale]);
}

/** The source's board surface, 0.775 m up the altar, as a share of its 0.34 m square. */
export const SURFACE_PER_SQ = 0.775 / 0.34;

/**
 * The owner's board: the Obsidian Altar from the wizards-chess cathedral (a
 * stepped plinth with a gold rune inlay, cut out of the nave by
 * scripts/build-wizard-board.mjs) with the source's own squares and gold
 * frame laid on top, all scaled from its 0.34 m squares to `sq`. The plinth
 * stands on y = 0; the squares' top face is at `sq * SURFACE_PER_SQ`.
 */
export function WizardBoard({ sq }: { sq: number }) {
  const env = useStudioEnv();
  const altar = useGLTF(ALTAR);
  const k = sq / 0.34;
  const plinth = useMemo(() => {
    const g = altar.scene.clone(true);
    g.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.receiveShadow = true;
      mesh.castShadow = mesh.name.includes('Obsidian_Altar');
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat?.isMeshStandardMaterial) return;
      mat.envMap = env;
      mat.envMapIntensity = mat.name.includes('Gold') ? 1.1 : 0.7;
      // the engine's normal strength for the cathedral stone
      if (mat.normalMap) mat.normalScale.set(1.15, 1.15);
    });
    return g;
  }, [altar, env]);

  // buildChessBoardGrid() from the source, in its own metres.
  const light = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xdcd3c2, roughness: 0.38, metalness: 0.06 }), []);
  const dark = useMemo(() => new THREE.MeshStandardMaterial({ color: 0x14171f, roughness: 0.28, metalness: 0.18 }), []);
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.26, metalness: 0.86, envMap: env, envMapIntensity: 1 }), [env]);
  const S = 0.34;
  const top = 0.775;
  const tileH = 0.036;
  const halfB = 4 * S;
  const rimW = 0.06;
  const rimH = 0.042;
  const tiles = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      tiles.push(
        <mesh key={`${r}${c}`} position={[(c - 3.5) * S, top - tileH * 0.5, (r - 3.5) * S]} material={(r + c) % 2 === 0 ? light : dark} receiveShadow>
          <boxGeometry args={[S * 0.985, tileH, S * 0.985]} />
        </mesh>,
      );
    }
  }
  return (
    <group scale={k}>
      <primitive object={plinth} />
      {tiles}
      {[-1, 1].map(s => (
        <group key={s}>
          <mesh position={[0, top - rimH * 0.45, s * (halfB + rimW * 0.5)]} material={gold} receiveShadow>
            <boxGeometry args={[halfB * 2 + rimW * 2, rimH, rimW]} />
          </mesh>
          <mesh position={[s * (halfB + rimW * 0.5), top - rimH * 0.45, 0]} material={gold} receiveShadow>
            <boxGeometry args={[rimW, rimH, halfB * 2]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

for (const url of Object.values(FILE)) useGLTF.preload(url);
useGLTF.preload(ALTAR);
