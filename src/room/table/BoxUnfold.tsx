import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { GameId, GameMetadata } from '../../types';
import { sound } from '../../utils/audio';
import { BOX_FACE, boardHalfTexture, lidTexture } from '../realBoardArt';
import { usBoardTexture } from './monopolyArt';
import { PLAY_TABLE } from '../roomLayout';

/**
 * The old-school unbox, on the spawned card table: the lid comes off and is
 * set on the floor, the folded board lifts out of the tray in an arc and flips
 * open, and the tray goes down on the other side. Packing runs it backwards.
 *
 * The opened board stays mounted for the whole match — it is the board.
 */

export type UnfoldShape = 'board' | 'case' | 'frame';

export interface UnfoldLayout {
  shape: UnfoldShape;
  /** Opened footprint on the table. */
  w: number;
  d: number;
  /** Folded box size. */
  box: { w: number; d: number; h: number };
}

export function layoutFor(id: GameId): UnfoldLayout {
  if (id === 'battleship') return { shape: 'case', w: 0.88, d: 0.44, box: { w: 0.48, d: 0.48, h: 0.07 } };
  if (id === 'connect4') return { shape: 'frame', w: 0.3, d: 0.06, box: { w: 0.34, d: 0.26, h: 0.08 } };
  return { shape: 'board', w: 0.5, d: 0.5, box: { w: 0.54, d: 0.29, h: 0.05 } };
}

const KRAFT = '#9a8669';
const CARD = 0.005;
const WALL = 0.005;
const LIP = 0.034;
const TOP = PLAY_TABLE.h;

function ease(t: number, a: number, b: number) {
  const x = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

function Leaf({ w, d, map, side }: { w: number; d: number; map: THREE.Texture; side: number }) {
  // `side` shifts the leaf off its hinge so the fold sits on the hinge line.
  return (
    <group position={[0, 0, side * d / 2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, CARD / 2 + 0.0006, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={map} roughness={0.6} metalness={0.02} />
      </mesh>
      <mesh>
        <boxGeometry args={[w, CARD, d]} />
        <meshStandardMaterial color="#2c2620" roughness={0.95} />
      </mesh>
    </group>
  );
}

function useLeafMaps(game: GameMetadata) {
  const id = game.id as GameId;
  const water = useTexture('/games/battleship/water.jpg');
  return useMemo(() => {
    if (id === 'monopoly') {
      // The US board, printed from the engine's own data, split along the fold.
      const board = usBoardTexture();
      const near = board.clone();
      const far = board.clone();
      [near, far].forEach(t => {
        t.repeat.set(1, 0.5);
        t.needsUpdate = true;
      });
      near.offset.set(0, 0);
      far.offset.set(0, 0.5);
      return { near, far };
    }
    if (id === 'battleship') {
      const near = water.clone();
      const far = water.clone();
      [near, far].forEach(t => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(2, 2);
        t.needsUpdate = true;
      });
      return { near, far };
    }
    return { near: boardHalfTexture(id, 'near'), far: boardHalfTexture(id, 'far') };
  }, [id, water]);
}

function ConnectFrame() {
  const { nodes } = useGLTF('/games/connect4/board.glb') as unknown as { nodes: Record<string, THREE.Mesh> };
  const frame = nodes.FourInARowV2;
  // BertovDev's frame is 95 units wide; a real Connect 4 grid is ~30 cm.
  const s = 0.3 / 95;
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1300a1', roughness: 0.35, metalness: 0.05 }), []);
  return <mesh geometry={frame.geometry} material={mat} scale={s} />;
}

export function BoxUnfold({
  game,
  mode,
  onComplete,
}: {
  game: GameMetadata;
  mode: 'open' | 'pack';
  onComplete: () => void;
}) {
  const id = game.id as GameId;
  const layout = layoutFor(id);
  const skin = BOX_FACE[id] ?? { card: '#a16245', face: '#1e293b', ink: '#ffffff' };
  const leaves = useLeafMaps(game);
  const lidMap = useMemo(() => lidTexture(id, game.title, skin.face, skin.ink), [game.title, id, skin.face, skin.ink]);
  useEffect(() => () => lidMap.dispose(), [lidMap]);

  const lid = useRef<THREE.Group>(null);
  const tray = useRef<THREE.Group>(null);
  const folded = useRef<THREE.Group>(null);
  const flap = useRef<THREE.Group>(null);
  const frame = useRef<THREE.Group>(null);
  const started = useRef<number | null>(null);
  const cues = useRef(new Set<string>());
  const done = useRef(false);

  const { box } = layout;
  // Half of the opened board folds over the other half.
  const leafW = layout.shape === 'case' ? layout.w / 2 : layout.w;
  const leafD = layout.shape === 'case' ? layout.d : layout.d / 2;
  const floorY = -TOP;
  const tableEdge = PLAY_TABLE.w / 2;

  useFrame(state => {
    if (started.current === null) started.current = state.clock.elapsedTime;
    const driven = (window as unknown as { __unboxTime?: number }).__unboxTime;
    const t = driven ?? state.clock.elapsedTime - started.current;
    const pack = mode === 'pack';
    const k = (a: number, b: number) => (pack ? 1 - ease(t, 4.4 - b, 4.4 - a) : ease(t, a, b));

    const lidOff = k(0.4, 1.4);
    const lifted = k(1.4, 2.2);
    const opened = k(2.1, 3.2);
    const aside = k(3.0, 4.1);

    if (lid.current) {
      // Straight up, tipped, then carried off the left edge and set on the floor.
      const up = Math.sin(Math.PI * Math.min(1, lidOff * 1.4)) * 0.18;
      lid.current.position.set(
        THREE.MathUtils.lerp(0, -(tableEdge + 0.32), lidOff),
        THREE.MathUtils.lerp(box.h - LIP, floorY + 0.004, lidOff) + up,
        THREE.MathUtils.lerp(0.12, 0.25, lidOff),
      );
      lid.current.rotation.set(0, 0.6 * lidOff, Math.sin(Math.PI * lidOff) * 0.5);
    }
    if (tray.current) {
      const up = Math.sin(Math.PI * aside) * 0.12;
      tray.current.position.set(
        THREE.MathUtils.lerp(0, tableEdge + 0.3, aside),
        THREE.MathUtils.lerp(0, floorY + 0.002, aside) + up,
        THREE.MathUtils.lerp(0.12, 0.22, aside),
      );
      tray.current.rotation.y = -0.5 * aside;
    }

    if (layout.shape === 'frame') {
      if (frame.current) {
        // The frame swings up out of the tray and stands at the far side.
        const arc = Math.sin(Math.PI * lifted) * 0.12;
        frame.current.position.set(0, THREE.MathUtils.lerp(WALL + 0.02, 0, lifted) + arc, THREE.MathUtils.lerp(0.22, -0.12, lifted));
        frame.current.rotation.x = THREE.MathUtils.lerp(-Math.PI / 2, 0, opened);
      }
    } else {
      if (folded.current) {
        const arc = Math.sin(Math.PI * lifted) ** 0.55 * 0.15;
        folded.current.position.y = THREE.MathUtils.lerp(WALL + 0.002, 0.0008, lifted) + arc;
        folded.current.position.z = layout.shape === 'case' ? THREE.MathUtils.lerp(0.12, 0, lifted) : THREE.MathUtils.lerp(0.12 - leafD / 2, 0, lifted);
        folded.current.position.x = layout.shape === 'case' ? THREE.MathUtils.lerp(leafW / 2, 0, lifted) : 0;
        folded.current.rotation.x = Math.sin(Math.PI * lifted) * 0.1;
      }
      if (flap.current) {
        // Folded shut lies on top of the other half; open lies flat.
        if (layout.shape === 'case') flap.current.rotation.z = THREE.MathUtils.lerp(-Math.PI, 0, opened);
        else flap.current.rotation.x = THREE.MathUtils.lerp(Math.PI, 0, opened);
        flap.current.position.y = THREE.MathUtils.lerp(CARD + 0.002, 0, opened);
      }
    }

    if (driven !== undefined) return;
    const cue = (key: string, at: number, play: () => void) => {
      if (!cues.current.has(key) && t > at) {
        cues.current.add(key);
        play();
      }
    };
    if (!pack) {
      cue('lid', 0.4, () => sound.playCardboardLid());
      cue('lift', 1.4, () => sound.playShelfSlide());
      cue('fold', 2.15, () => sound.playBoardFlap());
      cue('settle', 3.2, () => sound.playBoardSettle());
      cue('done', 4.4, () => {
        if (done.current) return;
        done.current = true;
        onComplete();
      });
    } else {
      cue('fold', 0.4, () => sound.playBoardFlap());
      cue('lift', 2.0, () => sound.playBoardSettle());
      cue('lid', 3.1, () => sound.playCardboardLid());
      cue('done', 4.5, () => {
        if (done.current) return;
        done.current = true;
        onComplete();
      });
    }
  });

  const walls = (w: number, d: number, h: number) => [
    { p: [0, h / 2, -d / 2], s: [w, h, WALL] },
    { p: [0, h / 2, d / 2], s: [w, h, WALL] },
    { p: [-w / 2, h / 2, 0], s: [WALL, h, d] },
    { p: [w / 2, h / 2, 0], s: [WALL, h, d] },
  ];

  return (
    <group position={[0, TOP, 0]}>
      {/* tray: an open chipboard box */}
      <group ref={tray} position={[0, 0, 0.12]}>
        <mesh position={[0, WALL / 2, 0]} receiveShadow>
          <boxGeometry args={[box.w, WALL, box.d]} />
          <meshStandardMaterial color={KRAFT} roughness={0.95} />
        </mesh>
        {walls(box.w, box.d, box.h).map((w, i) => (
          <mesh key={i} position={w.p as [number, number, number]}>
            <boxGeometry args={w.s as [number, number, number]} />
            <meshStandardMaterial color={KRAFT} roughness={0.92} />
          </mesh>
        ))}
      </group>

      {/* lid: printed top with a shallow skirt */}
      <group ref={lid} position={[0, box.h - LIP, 0.12]}>
        <mesh position={[0, LIP + 0.002, 0]}>
          <boxGeometry args={[box.w + 0.012, 0.004, box.d + 0.012]} />
          <meshStandardMaterial color={KRAFT} roughness={0.9} />
        </mesh>
        <mesh position={[0, LIP + 0.0045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[box.w + 0.012, box.d + 0.012]} />
          <meshStandardMaterial map={lidMap} roughness={0.48} />
        </mesh>
        {walls(box.w + 0.012, box.d + 0.012, LIP).map((w, i) => (
          <mesh key={i} position={w.p as [number, number, number]}>
            <boxGeometry args={w.s as [number, number, number]} />
            <meshStandardMaterial color={skin.face} roughness={0.7} />
          </mesh>
        ))}
      </group>

      {layout.shape === 'frame' ? (
        <group ref={frame} position={[0, WALL + 0.02, 0.22]} rotation={[-Math.PI / 2, 0, 0]}>
          <ConnectFrame />
        </group>
      ) : layout.shape === 'case' ? (
        // Battleship's case hinges in the middle: your ocean left, theirs right.
        <group ref={folded} position={[leafW / 2, WALL + 0.002, 0.12]}>
          <group position={[-leafW / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <Leaf w={leafD} d={leafW} map={leaves.near} side={0} />
          </group>
          <group ref={flap} position={[0, 0, 0]}>
            <group position={[leafW / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <Leaf w={leafD} d={leafW} map={leaves.far} side={0} />
            </group>
          </group>
        </group>
      ) : (
        <group ref={folded} position={[0, WALL + 0.002, 0.12 - leafD / 2]}>
          <Leaf w={leafW} d={leafD} map={leaves.near} side={1} />
          <group ref={flap}>
            <Leaf w={leafW} d={leafD} map={leaves.far} side={-1} />
          </group>
        </group>
      )}
    </group>
  );
}

useGLTF.preload('/games/connect4/board.glb');
