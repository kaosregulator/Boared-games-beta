import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  MOUSE_COLORS,
  MOUSE_META,
  MOUSE_TRAP_SPACES,
  createInitialMouseTrapState,
  rollMouseTrapTurn,
  type MouseColor,
  type MouseTrapGameState,
} from '../../games/mousetrap/mouseTrapRules';
import { sound } from '../../utils/audio';
import { pushHud, type HudAction } from './tableHud';
import { setTableView, type Shot } from './tableCam';

/**
 * Mouse Trap on the card table, in the spot Liar's Dice used to hold.
 * You are the red mouse. The crank, the marble, and the cage are the contraption.
 */

const YOU: MouseColor = 'red';
const BOARD = 0.68;
const VIEW: Shot = { target: [0, 0, 0], yaw: 0, pitch: 0.98, dist: 0.9 };

const MARBLE_PATH: THREE.Vector3[] = [
  new THREE.Vector3(-0.1, 0.07, -0.02),
  new THREE.Vector3(-0.02, 0.09, -0.02),
  new THREE.Vector3(0.06, 0.07, 0.0),
  new THREE.Vector3(0.08, 0.05, 0.06),
  new THREE.Vector3(0.02, 0.045, 0.08),
  new THREE.Vector3(0.0, 0.03, 0.02),
];

function spaceAt(index: number, color: MouseColor) {
  const space = MOUSE_TRAP_SPACES[index] ?? MOUSE_TRAP_SPACES[0];
  const nudge = MOUSE_COLORS.indexOf(color) - 1.5;
  return new THREE.Vector3(space.u * BOARD + nudge * 0.012, 0.02, space.v * BOARD);
}

export function MouseTrapTable({ onLeave }: { onLeave: () => void }) {
  const [state, setState] = useState<MouseTrapGameState>(() => createInitialMouseTrapState('mode1_classic'));
  const crank = useRef<THREE.Group>(null);
  const marble = useRef<THREE.Mesh>(null);
  const cage = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const travel = useRef(-1);
  const cageY = useRef(0.11);

  useEffect(() => setTableView(VIEW), []);
  useEffect(() => () => pushHud(null), []);

  const roll = () => {
    setState(s => {
      if (s.winner || s.currentTurn !== YOU) return s;
      const out = rollMouseTrapTurn(s);
      if (out.triggeredChainReaction) {
        spin.current = 1;
        travel.current = 0;
        sound.playShelfSlide();
      } else sound.playButtonClick();
      return out.nextState;
    });
  };

  useEffect(() => {
    if (state.winner || state.currentTurn === YOU) return;
    const t = window.setTimeout(() => {
      setState(s => {
        if (s.winner || s.currentTurn === YOU) return s;
        const out = rollMouseTrapTurn(s);
        if (out.triggeredChainReaction) {
          spin.current = 1;
          travel.current = 0;
        }
        return out.nextState;
      });
      sound.playButtonClick();
    }, 780);
    return () => window.clearTimeout(t);
  }, [state.currentTurn, state.turnCount, state.winner]);

  useFrame((_, dt) => {
    if (crank.current) crank.current.rotation.z += dt * (1.4 + spin.current * 10);
    spin.current = Math.max(0, spin.current - dt * 0.35);
    if (travel.current >= 0 && marble.current) {
      travel.current = Math.min(1, travel.current + dt * 0.45);
      const f = travel.current * (MARBLE_PATH.length - 1);
      const i = Math.min(MARBLE_PATH.length - 2, Math.floor(f));
      marble.current.position.copy(MARBLE_PATH[i]).lerp(MARBLE_PATH[i + 1], f - i);
      if (travel.current >= 1) travel.current = -1;
    }
    const want = state.cageDropped ? 0.03 : 0.11;
    cageY.current += (want - cageY.current) * Math.min(1, dt * 4);
    if (cage.current) cage.current.position.y = cageY.current;
  });

  useEffect(() => {
    const actions: HudAction[] = [];
    if (state.winner) {
      actions.push({ label: 'New game', onClick: () => setState(createInitialMouseTrapState('mode1_classic')) });
    } else if (state.currentTurn === YOU) {
      actions.push({ label: state.lastDiceRoll ? `Roll again` : 'Roll', onClick: roll });
    }
    const cheese = MOUSE_COLORS.map(c => `${MOUSE_META[c].name.split(' ')[0]} ${state.mice[c].cheeseCount}`).join(' · ');
    pushHud({
      title: 'Mouse Trap',
      note: state.winner ? state.winReason : state.lastActionLog,
      detail: `${cheese} · trap parts ${state.builtStages}/5${state.cageDropped ? ' · cage down' : ''}`,
      onLeave,
      actions,
    });
  }, [state, onLeave]);

  return (
    <group>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.64, 0.64]} />
        <meshStandardMaterial color="#166534" roughness={0.8} />
      </mesh>
      {MOUSE_TRAP_SPACES.map(space => (
        <mesh key={space.index} position={[space.u * BOARD, 0.016, space.v * BOARD]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.02, 16]} />
          <meshStandardMaterial color={space.type === 'build' ? '#facc15' : space.type === 'turn_crank' ? '#f97316' : '#f8fafc'} />
        </mesh>
      ))}
      {MOUSE_COLORS.map(color => {
        const mouse = state.mice[color];
        const at = spaceAt(mouse.trackIndex, color);
        return (
          <group key={color} position={at}>
            <mesh castShadow>
              <sphereGeometry args={[0.016, 12, 10]} />
              <meshStandardMaterial color={MOUSE_META[color].hex} />
            </mesh>
            <mesh position={[-0.01, 0.012, 0]}>
              <sphereGeometry args={[0.008, 8, 8]} />
              <meshStandardMaterial color={MOUSE_META[color].earHex} />
            </mesh>
            <mesh position={[0.01, 0.012, 0]}>
              <sphereGeometry args={[0.008, 8, 8]} />
              <meshStandardMaterial color={MOUSE_META[color].earHex} />
            </mesh>
          </group>
        );
      })}
      {state.builtStages >= 1 && (
        <group position={[-0.1, 0.04, -0.02]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 0.012, 16]} />
            <meshStandardMaterial color="#eab308" metalness={0.4} roughness={0.4} />
          </mesh>
          <group ref={crank} position={[0, 0.02, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <boxGeometry args={[0.07, 0.012, 0.012]} />
              <meshStandardMaterial color="#b91c1c" />
            </mesh>
          </group>
        </group>
      )}
      {state.builtStages >= 2 && (
        <mesh position={[0.08, 0.05, 0.02]} rotation={[0, 0, 0.6]}>
          <boxGeometry args={[0.04, 0.05, 0.02]} />
          <meshStandardMaterial color="#15803d" />
        </mesh>
      )}
      {state.builtStages >= 3 && (
        <mesh position={[0.08, 0.03, 0.08]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.05, 0.01, 0.12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.3} />
        </mesh>
      )}
      {state.builtStages >= 4 && (
        <mesh position={[0.02, 0.025, 0.08]}>
          <cylinderGeometry args={[0.03, 0.028, 0.03, 16]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.25} />
        </mesh>
      )}
      {state.builtStages >= 5 && (
        <group ref={cage} position={[0, 0.11, 0.02]}>
          <mesh>
            <boxGeometry args={[0.05, 0.045, 0.05]} />
            <meshStandardMaterial color="#dc2626" wireframe />
          </mesh>
        </group>
      )}
      <mesh ref={marble} position={MARBLE_PATH[0]}>
        <sphereGeometry args={[0.012, 12, 10]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.15} />
      </mesh>
    </group>
  );
}
