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
const BOARD = { span: 0.48, leaf: 0.24, card: 0.005 };
const BOX = { w: 0.52, h: 0.05, d: 0.28, wall: 0.005, lip: 0.034 };
/** Plain chipboard, the way the inside of a game box actually looks. */
const KRAFT = '#9a8669';
/** The folded board, and so the box, sit on the near half of the table. */
const BOX_Z = BOARD.leaf / 2;

function ease(t: number, a: number, b: number) {
  const x = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

/** `?freeze=<seconds>` parks the sequence at one instant for screenshots. */
function readFreeze(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('freeze');
  if (raw === null) return null;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : null;
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
        <meshStandardMaterial color="#3a332b" roughness={0.95} />
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
  const freeze = useMemo(readFreeze, []);

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
    const t = freeze ?? state.clock.elapsedTime - started.current;
    const packing = mode === 'pack';

    // open: lid off -> board lifted out -> leaf folds open -> box set aside
    const lidOff = packing ? 1 - ease(t, 2.6, 3.5) : ease(t, 0.5, 1.5);
    const lifted = packing ? 1 - ease(t, 1.9, 2.6) : ease(t, 1.5, 2.3);
    const opened = packing ? 1 - ease(t, 0.3, 1.5) : ease(t, 2.2, 3.4);
    const aside = packing ? 1 - ease(t, 2.9, 3.8) : ease(t, 3.2, 4.2);

    if (lid.current) {
      // lifted straight up, tilted, and carried off to the left
      lid.current.position.y = THREE.MathUtils.lerp(0, 0.16, lidOff);
      lid.current.position.x = THREE.MathUtils.lerp(0, -0.44, lidOff);
      lid.current.rotation.z = THREE.MathUtils.lerp(0, 0.5, lidOff);
      lid.current.rotation.x = THREE.MathUtils.lerp(0, -0.22, lidOff);
    }
    if (tray.current) {
      tray.current.position.x = THREE.MathUtils.lerp(0, -0.44, aside);
      tray.current.position.z = THREE.MathUtils.lerp(BOX_Z, BOX_Z + 0.06, aside);
    }
    if (board.current) {
      // clear of the tray rim in an arc, then down flat on the table
      const arc = Math.sin(Math.PI * lifted) ** 0.55 * 0.15;
      board.current.position.y = THREE.MathUtils.lerp(BOX.wall + 0.002, 0.0008, lifted) + arc;
      board.current.position.z = THREE.MathUtils.lerp(BOX_Z, 0, lifted);
      board.current.rotation.x = Math.sin(Math.PI * lifted) * 0.1;
    }
    if (farLeaf.current) {
      // folded shut sits on top of the near leaf; open lies flat
      farLeaf.current.rotation.x = THREE.MathUtils.lerp(Math.PI, 0, opened);
      farLeaf.current.position.y = THREE.MathUtils.lerp(BOARD.card + 0.002, 0, opened);
    }

    const settle = packing ? 0 : ease(t, 3.4, 4.6);
    const camY = THREE.MathUtils.lerp(1.56, 1.3, packing ? 1 - aside : settle);
    const camZ = THREE.MathUtils.lerp(-0.26, -0.58, packing ? 1 - aside : settle);
    state.camera.position.set(PLAY_TABLE.x, camY, camZ);
    state.camera.lookAt(PLAY_TABLE.x, PLAY_TABLE.top, PLAY_TABLE.z + 0.02);

    if (freeze !== null) return;

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
    <group position={[PLAY_TABLE.x, PLAY_TABLE.surface, PLAY_TABLE.z]}>
      {/* Box bottom: a real open tray the folded board lifts out of. */}
      <group ref={tray} position={[0, 0, BOX_Z]}>
        <mesh position={[0, BOX.wall / 2, 0]} receiveShadow>
          <boxGeometry args={[BOX.w, BOX.wall, BOX.d]} />
          <meshStandardMaterial color={KRAFT} roughness={0.95} />
        </mesh>
        {[
          { p: [0, BOX.h / 2, -BOX.d / 2], s: [BOX.w, BOX.h, BOX.wall] },
          { p: [0, BOX.h / 2, BOX.d / 2], s: [BOX.w, BOX.h, BOX.wall] },
          { p: [-BOX.w / 2, BOX.h / 2, 0], s: [BOX.wall, BOX.h, BOX.d] },
          { p: [BOX.w / 2, BOX.h / 2, 0], s: [BOX.wall, BOX.h, BOX.d] },
        ].map((w, i) => (
          <mesh key={i} position={w.p as [number, number, number]} castShadow receiveShadow>
            <boxGeometry args={w.s as [number, number, number]} />
            <meshStandardMaterial color={KRAFT} roughness={0.92} />
          </mesh>
        ))}
      </group>

      {/* Box lid: printed top with a shallow skirt, like a real two-piece box. */}
      <group ref={lid} position={[0, BOX.h - BOX.lip, BOX_Z]}>
        <mesh position={[0, BOX.lip + 0.002, 0]} castShadow receiveShadow>
          <boxGeometry args={[BOX.w + 0.012, 0.004, BOX.d + 0.012]} />
          <meshStandardMaterial color={KRAFT} roughness={0.9} />
        </mesh>
        <mesh position={[0, BOX.lip + 0.0045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[BOX.w + 0.012, BOX.d + 0.012]} />
          <meshStandardMaterial map={maps.lid} roughness={0.48} />
        </mesh>
        {[
          { p: [0, BOX.lip / 2, -(BOX.d + 0.012) / 2], s: [BOX.w + 0.012, BOX.lip, BOX.wall] },
          { p: [0, BOX.lip / 2, (BOX.d + 0.012) / 2], s: [BOX.w + 0.012, BOX.lip, BOX.wall] },
          { p: [-(BOX.w + 0.012) / 2, BOX.lip / 2, 0], s: [BOX.wall, BOX.lip, BOX.d + 0.012] },
          { p: [(BOX.w + 0.012) / 2, BOX.lip / 2, 0], s: [BOX.wall, BOX.lip, BOX.d + 0.012] },
        ].map((w, i) => (
          <mesh key={i} position={w.p as [number, number, number]} castShadow receiveShadow>
            <boxGeometry args={w.s as [number, number, number]} />
            <meshStandardMaterial color={skin.face} roughness={0.7} />
          </mesh>
        ))}
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
        intensity={5}
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
