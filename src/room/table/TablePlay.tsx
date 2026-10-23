import React, { Suspense, lazy, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { GameMetadata } from '../../types';
import { sound } from '../../utils/audio';
import { PLAY_TABLE } from '../roomLayout';
import { BoxUnfold } from './BoxUnfold';

// Each table game loads when it's first played (warmTableGames fetches them in
// the background once the room is up), so the room itself starts sooner.
const ConnectFourTable = lazy(() => import('./ConnectFourTable').then(m => ({ default: m.ConnectFourTable })));
const BattleshipTable = lazy(() => import('./BattleshipTable').then(m => ({ default: m.BattleshipTable })));
const MonopolyTable = lazy(() => import('./MonopolyTable').then(m => ({ default: m.MonopolyTable })));
const ChessTable = lazy(() => import('./ChessTable').then(m => ({ default: m.ChessTable })));
const CheckersTable = lazy(() => import('./CheckersTable').then(m => ({ default: m.CheckersTable })));
const ClueTable = lazy(() => import('./ClueTable').then(m => ({ default: m.ClueTable })));
const BlackjackTable = lazy(() => import('./BlackjackTable').then(m => ({ default: m.BlackjackTable })));

export { TableHudOverlay } from './tableHud';

export type TableGameId = 'monopoly' | 'connect4' | 'battleship' | 'chess' | 'checkers' | 'blackjack' | 'clue';
export const TABLE_GAMES = new Set<string>(['monopoly', 'connect4', 'battleship', 'chess', 'checkers', 'blackjack', 'clue']);

/**
 * unfold — the table has spawned and the box is opening
 * play   — the match is on (3D for the table games; the 2D board otherwise)
 * pack   — the box is being packed; the table leaves when it is done
 */
export interface TableSession {
  game: GameMetadata;
  phase: 'unfold' | 'play' | 'pack';
  /** Bumps on every new session so the rigs restart their clocks. */
  key: number;
}

function TableWood() {
  const { w, d, h } = PLAY_TABLE;
  return (
    <group>
      <mesh position={[0, h - 0.02, 0]} receiveShadow>
        <boxGeometry args={[w, 0.04, d]} />
        <meshStandardMaterial color="#8a5a32" roughness={0.72} metalness={0} />
      </mesh>
      <mesh position={[0, h - 0.045, 0]}>
        <boxGeometry args={[w * 0.96, 0.012, d * 0.94]} />
        <meshStandardMaterial color="#c4894e" roughness={0.55} metalness={0} />
      </mesh>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[(w / 2 - 0.06) * sx, h / 2 - 0.02, (d / 2 - 0.06) * sz]}>
          <boxGeometry args={[0.05, h - 0.04, 0.05]} />
          <meshStandardMaterial color="#5c3a22" roughness={0.8} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}

/** The table drops onto the rug with a thud; on the way out it lifts and fades. */
function SpawnedTable({ leaving, children }: { leaving: boolean; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const born = useRef<number | null>(null);
  const gone = useRef<number | null>(null);
  const thud = useRef(false);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    if (born.current === null) born.current = clock.elapsedTime;
    const t = clock.elapsedTime - born.current;
    // drop with a small bounce
    const fall = Math.min(1, t / 0.42);
    let y = (1 - fall * fall) * 0.7;
    if (fall >= 1) {
      const b = Math.min(1, (t - 0.42) / 0.25);
      y = Math.sin(Math.PI * b) * 0.025 * (1 - b);
      if (!thud.current) {
        thud.current = true;
        sound.playBoardSettle();
      }
    }
    let s = 1;
    if (leaving) {
      if (gone.current === null) gone.current = clock.elapsedTime;
      const k = Math.min(1, (clock.elapsedTime - gone.current) / 0.35);
      y = k * 0.25;
      s = 1 - k;
    } else gone.current = null;
    g.position.y = y;
    g.scale.setScalar(Math.max(0.001, s));
  });
  return <group ref={group}>{children}</group>;
}

export function PlayTable({
  session,
  onUnfolded,
  onPacked,
  onLeave,
}: {
  session: TableSession | null;
  onUnfolded: () => void;
  onPacked: () => void;
  onLeave: () => void;
}) {
  if (!session) return null;
  const { game, phase } = session;
  return (
    <group position={[PLAY_TABLE.x, 0, PLAY_TABLE.z]}>
      <SpawnedTable leaving={false}>
        <TableWood />
        <pointLight position={[0, 1.25, 0.1]} color="#ffe2c2" intensity={1.6} distance={3.4} decay={2} />
        <Suspense fallback={null}>
          <BoxUnfold
            key={`${session.key}-${phase === 'pack' ? 'pack' : 'open'}`}
            game={game}
            mode={phase === 'pack' ? 'pack' : 'open'}
            onComplete={phase === 'pack' ? onPacked : onUnfolded}
          />
        </Suspense>
        {phase === 'play' && (
          <group position={[0, PLAY_TABLE.h, 0]}>
            <Suspense fallback={null}>
              {game.id === 'connect4' && <ConnectFourTable onLeave={onLeave} />}
              {game.id === 'battleship' && <BattleshipTable onLeave={onLeave} />}
              {game.id === 'monopoly' && <MonopolyTable onLeave={onLeave} />}
              {game.id === 'chess' && <ChessTable onLeave={onLeave} />}
              {game.id === 'checkers' && <CheckersTable onLeave={onLeave} />}
              {game.id === 'blackjack' && <BlackjackTable onLeave={onLeave} />}
              {game.id === 'clue' && <ClueTable onLeave={onLeave} />}
            </Suspense>
          </group>
        )}
      </SpawnedTable>
    </group>
  );
}
