import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameId, GameMetadata } from '../types';
import { sound } from '../utils/audio';
import { BOX_FACE, boardHalfTexture, lidTexture } from './realBoardArt';
import { VideoRoomScene } from './VideoRoomScene';
import { PLAY_TABLE } from './videoRoom';

/**
 * Real board-game dimensions in metres: a 48cm square board that folds in half
 * into a 51x27cm long box, which is why the box reads as a box and the board
 * covers the table.
 */
const BOARD = { span: 0.48, leaf: 0.24, card: 0.004 };
const BOX = { w: 0.51, h: 0.055, d: 0.27 };
/** The folded board, and so the box, sit on the near half of the table. */
const BOX_Z = BOARD.leaf / 2;

function ease(t: number, a: number, b: number) {
  const x = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

function Leaf({ side, map }: { side: 'near' | 'far'; map: THREE.Texture }) {
  const z = side === 'near' ? BOARD.leaf / 2 : -BOARD.leaf / 2;
  return (
    <group position={[0, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, BOARD.card / 2 + 0.0005, 0]} receiveShadow>
        <planeGeometry args={[BOARD.span, BOARD.leaf]} />
        <meshStandardMaterial map={map} roughness={0.62} metalness={0.02} />
      </mesh>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[BOARD.span, BOARD.card, BOARD.leaf]} />
        <meshStandardMaterial color="#2a2018" roughness={0.95} />
      </mesh>
    </group>
  );
}

function UnfoldRig({
  game,
  onComplete,
  mode,
}: {
  game: GameMetadata;
  onComplete: () => void;
  mode: 'open' | 'pack';
}) {
  const lid = useRef<THREE.Group>(null);
  const tray = useRef<THREE.Group>(null);
  const board = useRef<THREE.Group>(null);
  const farLeaf = useRef<THREE.Group>(null);
  const started = useRef<number | null>(null);
  const flags = useRef({ lid: false, lift: false, fold: false, settle: false, done: false });

  const id = game.id as GameId;
  const skin = BOX_FACE[id] ?? { card: '#a16245', face: '#1e293b', ink: '#ffffff' };

  const maps = useMemo(
    () => ({
      near: boardHalfTexture(id, 'near'),
      far: boardHalfTexture(id, 'far'),
      lid: lidTexture(id, game.title, skin.face, skin.ink),
    }),
    [game.title, id, skin.face, skin.ink],
  );

  useEffect(
    () => () => {
      maps.near.dispose();
      maps.far.dispose();
      maps.lid.dispose();
    },
    [maps],
  );

  useFrame(state => {
    if (started.current === null) started.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - started.current;
    const packing = mode === 'pack';

    // open: lid off -> board lifted out -> leaf folds open -> box set aside
    const lidOff = packing ? 1 - ease(t, 2.6, 3.5) : ease(t, 0.5, 1.5);
    const lifted = packing ? 1 - ease(t, 1.9, 2.6) : ease(t, 1.5, 2.3);
    const opened = packing ? 1 - ease(t, 0.3, 1.5) : ease(t, 2.2, 3.4);
    const aside = packing ? 1 - ease(t, 2.9, 3.8) : ease(t, 3.2, 4.2);

    if (lid.current) {
      // lifted straight up, tilted, and carried off to the left
      lid.current.position.y = THREE.MathUtils.lerp(BOX.h, BOX.h + 0.14, lidOff);
      lid.current.position.x = THREE.MathUtils.lerp(0, -0.42, lidOff);
      lid.current.rotation.z = THREE.MathUtils.lerp(0, 0.5, lidOff);
      lid.current.rotation.x = THREE.MathUtils.lerp(0, -0.22, lidOff);
    }
    if (tray.current) {
      tray.current.position.x = THREE.MathUtils.lerp(0, -0.46, aside);
      tray.current.position.z = THREE.MathUtils.lerp(BOX_Z, BOX_Z + 0.1, aside);
    }
    if (board.current) {
      board.current.position.y = THREE.MathUtils.lerp(BOX.h * 0.45, BOARD.card, lifted);
      board.current.position.z = THREE.MathUtils.lerp(BOX_Z, 0, lifted);
    }
    if (farLeaf.current) {
      // folded shut sits on top of the near leaf; open lies flat
      farLeaf.current.rotation.x = THREE.MathUtils.lerp(Math.PI, 0, opened);
      farLeaf.current.position.y = THREE.MathUtils.lerp(BOARD.card * 1.2, 0, opened);
    }

    const settle = packing ? 0 : ease(t, 3.4, 4.6);
    const camY = THREE.MathUtils.lerp(1.52, 1.24, packing ? 1 - aside : settle);
    const camZ = THREE.MathUtils.lerp(-0.34, -0.66, packing ? 1 - aside : settle);
    state.camera.position.set(PLAY_TABLE.x, camY, camZ);
    state.camera.lookAt(PLAY_TABLE.x, PLAY_TABLE.top, PLAY_TABLE.z + 0.02);

    const cue = (key: keyof typeof flags.current, at: number, play: () => void) => {
      if (!flags.current[key] && t > at) {
        flags.current[key] = true;
        play();
      }
    };

    if (!packing) {
      cue('lid', 0.5, () => sound.playCardboardLid());
      cue('lift', 1.5, () => sound.playShelfSlide());
      cue('fold', 2.25, () => sound.playBoardFlap());
      cue('settle', 3.4, () => sound.playBoardSettle());
      cue('done', 5.4, onComplete);
    } else {
      cue('fold', 0.35, () => sound.playBoardFlap());
      cue('lift', 1.95, () => sound.playBoardSettle());
      cue('lid', 2.65, () => sound.playCardboardLid());
      cue('settle', 3.6, () => sound.playShelfSlide());
      cue('done', 4.4, onComplete);
    }
  });

  return (
    <group position={[PLAY_TABLE.x, PLAY_TABLE.top, PLAY_TABLE.z]}>
      <group ref={tray} position={[0, 0, BOX_Z]}>
        <mesh position={[0, BOX.h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[BOX.w, BOX.h, BOX.d]} />
          <meshStandardMaterial color={skin.card} roughness={0.9} />
        </mesh>
        {/* printed inner wrap, visible once the lid is off */}
        <mesh position={[0, BOX.h - 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[BOX.w - 0.02, BOX.d - 0.02]} />
          <meshStandardMaterial color="#1b1511" roughness={1} />
        </mesh>
      </group>

      <group ref={lid} position={[0, BOX.h, BOX_Z]}>
        <mesh position={[0, 0.018, 0]} castShadow receiveShadow>
          <boxGeometry args={[BOX.w + 0.008, 0.036, BOX.d + 0.008]} />
          <meshStandardMaterial color={skin.card} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.0365, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[BOX.w, BOX.d]} />
          <meshStandardMaterial map={maps.lid} roughness={0.5} />
        </mesh>
        {/* spine print on the long side you read on the shelf */}
        <mesh position={[0, 0.018, BOX.d / 2 + 0.006]}>
          <planeGeometry args={[BOX.w, 0.034]} />
          <meshStandardMaterial map={maps.lid} roughness={0.5} />
        </mesh>
      </group>

      <group ref={board}>
        <Leaf side="near" map={maps.near} />
        <group ref={farLeaf}>
          <Leaf side="far" map={maps.far} />
        </group>
      </group>
    </group>
  );
}

export function BoardUnfoldScene({
  game,
  onComplete,
  mode = 'open',
}: {
  game: GameMetadata;
  onComplete: () => void;
  mode?: 'open' | 'pack';
}) {
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onComplete();
  };

  return (
    <>
      {/* A reading lamp's worth of light over the table, under the ceiling. */}
      <spotLight
        position={[PLAY_TABLE.x, 2.3, PLAY_TABLE.z + 0.2]}
        target-position={[PLAY_TABLE.x, PLAY_TABLE.top, PLAY_TABLE.z]}
        angle={0.7}
        penumbra={0.6}
        intensity={7}
        distance={5}
        decay={2}
        color="#ffe6bd"
        castShadow
      />
      <Suspense fallback={null}>
        <VideoRoomScene hoveredId={null} pulledGameId={null} tapeOn={false} lampsWarm={false} />
      </Suspense>
      <UnfoldRig game={game} onComplete={finish} mode={mode} />
    </>
  );
}
