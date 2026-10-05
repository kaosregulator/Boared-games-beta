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
        camera={{ fov: 52, near: 0.03, far: 60 }}
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

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 overflow-hidden">
        <svg className="hand-reach absolute left-[8%] bottom-0 w-56" viewBox="0 0 200 140" aria-hidden>
          <path d="M20 140 C30 90 40 70 70 62 C88 56 100 70 108 90 L120 140 Z" fill="#c4846a" />
          <path d="M55 70 C70 20 95 8 120 28 C132 38 128 58 112 64 C90 72 70 78 55 70Z" fill="#d7a08a" />
          <path d="M0 140 L70 92 L10 140 Z" fill="#1e3a8a" />
        </svg>
        <svg className="hand-reach absolute right-[8%] bottom-0 w-56" viewBox="0 0 200 140" aria-hidden>
          <path d="M180 140 C170 90 160 70 130 62 C112 56 100 70 92 90 L80 140 Z" fill="#c4846a" />
          <path d="M145 70 C130 20 105 8 80 28 C68 38 72 58 88 64 C110 72 130 78 145 70Z" fill="#d7a08a" />
          <path d="M200 140 L130 92 L190 140 Z" fill="#1e3a8a" />
        </svg>
      </div>

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
