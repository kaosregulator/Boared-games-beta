import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { GameMetadata } from '../types';
import { sound } from '../utils/audio';
import { BoardUnfoldScene } from '../room/BoardUnfold';

interface ShelfUnboxingProps {
  game: GameMetadata;
  onComplete: () => void;
  onBackToShelf: () => void;
  direction?: 'open' | 'pack';
}

export const ShelfUnboxing: React.FC<ShelfUnboxingProps> = ({
  game,
  onComplete,
  onBackToShelf,
  direction = 'open',
}) => {
  const [entered, setEntered] = useState(false);

  return (
    <div className="fixed inset-0 z-[80] bg-[#120910] text-white">
      <Canvas
        shadows
        dpr={[1, 1.8]}
        camera={{ fov: 46, near: 0.03, far: 60 }}
        gl={{ antialias: true }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          scene.fog = new THREE.Fog('#160d15', 7, 20);
        }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <BoardUnfoldScene
          game={game}
          mode={direction}
          onComplete={() => {
            if (entered) return;
            setEntered(true);
            onComplete();
          }}
        />
      </Canvas>

      <div className="absolute top-4 left-4 right-4 z-10 flex items-start justify-between gap-3">
        <div className="bg-black/55 border border-white/15 rounded-2xl px-3 py-2 backdrop-blur-md">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
            {direction === 'pack' ? 'Folding it away' : 'Opening the box'}
          </p>
          <p className="text-sm font-bold">{game.title}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              sound.playButtonClick();
              onBackToShelf();
            }}
            className="rounded-xl bg-black/60 border border-white/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              sound.playButtonClick();
              onComplete();
            }}
            className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-3 py-2 text-[10px] font-black uppercase tracking-wider"
          >
            {direction === 'pack' ? 'Skip to room' : 'Skip to board'}
          </button>
        </div>
      </div>
    </div>
  );
};
