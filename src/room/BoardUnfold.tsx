import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameId, GameMetadata } from '../types';
import { sound } from '../utils/audio';
import { ROOM_ART } from './paintedRoom';
import { BOX_FACE, makeLidTexture, makePanelTexture } from './boardTextures';

function ease(t: number, a: number, b: number) {
  const x = THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

function Wing({
  pivot,
  side,
  map,
}: {
  pivot: RefObject<THREE.Group | null>;
  side: 'left' | 'right';
  map: THREE.Texture;
}) {
  const sign = side === 'left' ? -1 : 1;
  return (
    <group ref={pivot} position={[sign * 0.42, 0.02, 0]}>
      <mesh position={[sign * 0.42, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.84, 0.018, 0.92]} />
        <meshStandardMaterial map={map} roughness={0.72} metalness={0.02} />
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
  const rig = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const board = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const started = useRef<number | null>(null);
  const flags = useRef({ lid: false, left: false, right: false, settle: false, done: false });

  const maps = useMemo(() => {
    const id = game.id as GameId;
    return {
      left: makePanelTexture(id, 'left'),
      center: makePanelTexture(id, 'center'),
      right: makePanelTexture(id, 'right'),
      lid: makeLidTexture(game.title, BOX_FACE[id]?.face ?? '#1e293b', BOX_FACE[id]?.ink ?? '#fff'),
    };
  }, [game.id, game.title]);

  const card = BOX_FACE[game.id]?.card ?? '#a16245';

  useEffect(() => {
    if (mode === 'open') sound.playShelfSlide();
    return () => {
      maps.left.dispose();
      maps.center.dispose();
      maps.right.dispose();
      maps.lid.dispose();
    };
  }, [maps]);

  useFrame(state => {
    if (started.current === null) started.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - started.current;
    const packing = mode === 'pack';
    const approach = packing ? ease(t, 3.15, 4.2) : ease(t, 0.05, 0.95);
    const lidOpen = packing ? 1 - ease(t, 2.25, 3.15) : ease(t, 0.95, 1.9);
    const lift = packing ? 1 - ease(t, 1.7, 2.3) : ease(t, 1.75, 2.3);
    const leftOpen = packing ? 1 - ease(t, 0.85, 1.75) : ease(t, 2.2, 3.15);
    const rightOpen = packing ? 1 - ease(t, 0.25, 1.15) : ease(t, 2.75, 3.7);
    const present = packing ? 1 - ease(t, 0.05, 0.35) : ease(t, 3.6, 4.7);

    if (rig.current) {
      rig.current.position.z = THREE.MathUtils.lerp(0.7, 0.05, packing ? 1 - approach : approach);
      rig.current.position.y = THREE.MathUtils.lerp(0.05, 0, packing ? 1 - approach : approach);
      rig.current.rotation.x = -0.22;
      rig.current.scale.setScalar(THREE.MathUtils.lerp(1, 1.12, present));
    }
    if (lid.current) lid.current.rotation.x = THREE.MathUtils.lerp(0, -2.15, lidOpen);
    if (board.current) board.current.position.y = THREE.MathUtils.lerp(0.12, 0.36, lift);
    if (left.current) left.current.rotation.z = THREE.MathUtils.lerp(-Math.PI + 0.08, 0, leftOpen);
    if (right.current) right.current.rotation.z = THREE.MathUtils.lerp(Math.PI - 0.08, 0, rightOpen);

    state.camera.position.z = THREE.MathUtils.lerp(2.25, 1.85, present);
    state.camera.position.y = THREE.MathUtils.lerp(1.38, 1.2, present);
    state.camera.lookAt(0, 0.28, 0);

    if (!packing) {
      if (!flags.current.lid && t > 0.95) {
        flags.current.lid = true;
        sound.playCardboardLid();
      }
      if (!flags.current.left && t > 2.2) {
        flags.current.left = true;
        sound.playBoardFlap();
      }
      if (!flags.current.right && t > 2.7) {
        flags.current.right = true;
        sound.playBoardFlap();
      }
      if (!flags.current.settle && t > 3.5) {
        flags.current.settle = true;
        sound.playBoardSettle();
      }
      if (!flags.current.done && t > 6.5) {
        flags.current.done = true;
        onComplete();
      }
    } else {
      if (!flags.current.right && t > 0.3) {
        flags.current.right = true;
        sound.playBoardFlap();
      }
      if (!flags.current.left && t > 0.9) {
        flags.current.left = true;
        sound.playBoardFlap();
      }
      if (!flags.current.lid && t > 2.3) {
        flags.current.lid = true;
        sound.playCardboardLid();
      }
      if (!flags.current.settle && t > 3.2) {
        flags.current.settle = true;
        sound.playShelfSlide();
      }
      if (!flags.current.done && t > 4.6) {
        flags.current.done = true;
        onComplete();
      }
    }
  });

  return (
    <group ref={rig}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[1.8, 48]} />
        <meshStandardMaterial color="#4a3424" roughness={0.9} />
      </mesh>

      <mesh position={[0, 0.09, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.92, 0.18, 0.62]} />
        <meshStandardMaterial color={card} roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.19, 0]}>
        <boxGeometry args={[0.82, 0.02, 0.52]} />
        <meshStandardMaterial color="#1c1410" roughness={1} />
      </mesh>

      <group ref={lid} position={[0, 0.18, -0.31]}>
        <mesh position={[0, 0.02, 0.31]} castShadow>
          <boxGeometry args={[0.94, 0.045, 0.64]} />
          <meshStandardMaterial color={card} roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.005, 0.31]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.78, 0.46]} />
          <meshStandardMaterial map={maps.lid} roughness={0.55} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <mesh position={[0, 0.1, 0.312]}>
        <planeGeometry args={[0.72, 0.12]} />
        <meshStandardMaterial map={maps.lid} roughness={0.55} />
      </mesh>

      <group ref={board} position={[0, 0.12, 0.02]}>
        <Wing pivot={left} side="left" map={maps.left} />
        <mesh position={[0, 0.02, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.84, 0.02, 0.92]} />
          <meshStandardMaterial map={maps.center} roughness={0.7} />
        </mesh>
        <Wing pivot={right} side="right" map={maps.right} />
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
      <color attach="background" args={['#120910']} />
      <ambientLight intensity={0.45} color="#fde68a" />
      <hemisphereLight args={['#fdba74', '#1c1917', 0.45]} />
      <spotLight position={[1.2, 3.2, 1.6]} angle={0.55} penumbra={0.5} intensity={28} castShadow color="#fff7ed" />
      <pointLight position={[-1.2, 1.2, 0.4]} intensity={6} color="#fb7185" distance={6} />
      <RoomBackdrop />
      <UnfoldRig game={game} onComplete={finish} mode={mode} />
    </>
  );
}

function RoomBackdrop() {
  const map = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const tex = loader.load(ROOM_ART);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(1, 0.72);
    tex.offset.set(0, 0.28);
    return tex;
  }, []);

  return (
    <mesh position={[0, 1.35, -2.8]}>
      <planeGeometry args={[7.2, 4.6]} />
      <meshBasicMaterial map={map} color="#d6cce4" />
    </mesh>
  );
}
