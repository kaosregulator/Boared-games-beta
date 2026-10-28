import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { buildMouseTrap3DScene } from '../../games/bored/mouseTrap3DBuilder';
import { createMouseTrapBoardTexture } from '../../games/bored/boardTextures';
import {
  CHEESE_WHEEL_SPACE_INDEX,
  MOUSE_COLORS,
  MOUSE_META,
  completeContraptionChainReaction,
  createInitialMouseTrapState,
  rollMouseTrapTurn,
  type MouseColor,
  type MouseTrapGameState,
} from '../../games/mousetrap/mouseTrapRules';
import { sound } from '../../utils/audio';
import { pushHud, type HudAction } from './tableHud';
import { setTableView, type Shot } from './tableCam';

/**
 * Mouse Trap on the card table, using the marble-run scene from Bored-games.
 * You are the red mouse. The crank, gears, boot, tub, and cage are theirs.
 */

const YOU: MouseColor = 'red';
const VIEW: Shot = { target: [0, 0.08, 0], yaw: 0.6, pitch: 0.62, dist: 1.05 };
const FIT = 0.55;
const ZERO = new THREE.Vector3();

export function MouseTrapTable({ onLeave }: { onLeave: () => void }) {
  const [state, setState] = useState<MouseTrapGameState>(() => createInitialMouseTrapState('mode1_classic'));
  const chainAt = useRef<number | null>(null);
  const step = useRef<{
    color: MouseColor;
    stepIndices: number[];
    startIndex: number;
    startTimeMs: number;
  } | null>(null);
  const scene = useMemo(() => {
    const handles = buildMouseTrap3DScene(createMouseTrapBoardTexture(4), false);
    handles.rootGroup.position.set(0, 0, 0);
    return handles;
  }, []);

  useEffect(() => setTableView(VIEW), []);
  useEffect(() => () => pushHud(null), []);

  const roll = () => {
    setState(s => {
      if (s.winner || s.currentTurn !== YOU) return s;
      const from = s.mice[YOU].trackIndex;
      const out = rollMouseTrapTurn(s);
      if (out.stepIndices.length) {
        step.current = {
          color: s.currentTurn,
          stepIndices: out.stepIndices,
          startIndex: from,
          startTimeMs: performance.now(),
        };
      }
      if (out.triggeredChainReaction) {
        chainAt.current = performance.now();
        sound.playShelfSlide();
      } else sound.playButtonClick();
      return out.nextState;
    });
  };

  useEffect(() => {
    if (state.winner || state.currentTurn === YOU) return;
    const from = state.mice[state.currentTurn].trackIndex;
    const actor = state.currentTurn;
    const t = window.setTimeout(() => {
      setState(s => {
        if (s.winner || s.currentTurn !== actor) return s;
        const out = rollMouseTrapTurn(s);
        if (out.stepIndices.length) {
          step.current = {
            color: actor,
            stepIndices: out.stepIndices,
            startIndex: from,
            startTimeMs: performance.now(),
          };
        }
        if (out.triggeredChainReaction) chainAt.current = performance.now();
        return out.nextState;
      });
      sound.playButtonClick();
    }, 780);
    return () => window.clearTimeout(t);
  }, [state.currentTurn, state.turnCount, state.winner]);

  useFrame(({ clock }, dt) => {
    const now = performance.now();
    if (chainAt.current !== null && now - chainAt.current > 4600) chainAt.current = null;
    if (step.current && now - step.current.startTimeMs > step.current.stepIndices.length * 220 + 40) {
      step.current = null;
    }
    scene.updateLivingMouseTrapScene({
      elapsed: clock.elapsedTime,
      dt,
      // The trap goes up a piece at a time as it's earned, as in the box rules.
      state,
      activeMouseStepAnim: step.current,
      chainReactionStartMs: chainAt.current,
      scenePulseStartMs: null,
      nowMs: now,
      mouseControlMode: false,
      playerControlWorldPos: ZERO,
      playerControlYaw: 0,
      playerIsMoving: false,
    });
  });

  useEffect(() => {
    const actions: HudAction[] = [];
    if (state.winner) {
      actions.push({ label: 'New game', onClick: () => setState(createInitialMouseTrapState('mode1_classic')) });
    } else if (state.currentTurn === YOU) {
      actions.push({ label: state.lastDiceRoll ? 'Roll again' : 'Roll', onClick: roll });
      // The whole trap is up and someone's on the cheese wheel: turn the crank.
      const victim = MOUSE_COLORS.find(c => c !== YOU && state.mice[c].trackIndex === CHEESE_WHEEL_SPACE_INDEX && !state.mice[c].isTrapped);
      if (state.builtStages >= 5 && victim) {
        actions.push({
          label: 'Turn the crank',
          onClick: () => {
            chainAt.current = performance.now();
            sound.playShelfSlide();
            setState(s => (s.currentTurn === YOU && !s.winner ? completeContraptionChainReaction(s, victim) : s));
          },
        });
      }
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

  return <primitive object={scene.rootGroup} scale={FIT} position={[0, 0.01, 0]} />;
}
