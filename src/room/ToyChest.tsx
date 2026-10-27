import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  buildStep2ToyChest3D,
  createViewMasterBoxLidTexture,
} from '../games/bored/step2ToyChest3D';
import {
  createGuessWhoBoxLidTexture,
  createMouseTrapBoxLidTexture,
  createSorryBoxLidTexture,
} from '../games/bored/boardTextures';
import { TOY_CHEST } from './roomLayout';
import type { HoverTarget } from './Interactable';

/** WalkRoom flips the door. The chest owns whether it is open. */
export const toyChestBus = {
  toggle: () => {},
};

const TARGET: HoverTarget = {
  id: 'toy-chest',
  kind: 'prop',
  label: 'Toy chest',
  hint: 'Open',
};

/**
 * Their Step2 lift-and-hide chest, under the neon wall, front facing the room.
 * The builder's studio coordinates are cleared so this room's collider owns the spot.
 */
export function ToyChest({ hovered }: { hovered: boolean }) {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('chest');
  });
  const openRef = useRef(open);
  openRef.current = open;

  const handles = useMemo(() => {
    const built = buildStep2ToyChest3D(
      {
        sorry: createSorryBoxLidTexture(4),
        guess_who: createGuessWhoBoxLidTexture(4),
        mouse_trap: createMouseTrapBoxLidTexture(4),
        view_master: createViewMasterBoxLidTexture(4),
      },
      false,
    );
    built.rootGroup.position.set(0, 0, 0);
    built.rootGroup.rotation.set(0, 0, 0);
    return built;
  }, []);

  useEffect(() => {
    toyChestBus.toggle = () => setOpen(value => !value);
    return () => {
      toyChestBus.toggle = () => {};
    };
  }, []);

  useFrame((_, dt) => {
    handles.updateToyChest(dt, openRef.current, '');
  });

  return (
    <group
      position={[TOY_CHEST.x, 0, TOY_CHEST.z]}
      rotation={[0, -Math.PI / 2, 0]}
      userData={{ interactable: TARGET, volume: hovered ? 0.08 : 0.05 }}
    >
      <primitive object={handles.rootGroup} />
    </group>
  );
}
