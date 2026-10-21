import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sound } from '../utils/audio';

const labelCache = new Map<string, THREE.CanvasTexture>();

/** Silkscreen text for a button cap or the panel above it. */
export function labelTexture(text: string, fg = '#f2efe6', bg = 'rgba(0,0,0,0)', w = 256, h = 96) {
  const key = `${text}|${fg}|${bg}|${w}x${h}`;
  const hit = labelCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let px = Math.floor(h * 0.62);
  g.font = `800 ${px}px "IBM Plex Mono", Arial, sans-serif`;
  while (g.measureText(text).width > w * 0.9 && px > 10) {
    px -= 2;
    g.font = `800 ${px}px "IBM Plex Mono", Arial, sans-serif`;
  }
  g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  labelCache.set(key, t);
  return t;
}

interface PanelButtonProps {
  position: [number, number, number];
  size: [number, number, number];
  label: string;
  color?: string;
  /** Label printed on the bezel just above the cap instead of on it. */
  labelAbove?: boolean;
  lit?: boolean;
  onPress: () => void;
  /** For held buttons (console pads). */
  onRelease?: () => void;
  rotation?: [number, number, number];
}

/** A physical, clickable button: it sinks when pressed and clicks. */
export function PanelButton({
  position,
  size,
  label,
  color = '#1c1a1e',
  labelAbove = false,
  lit = false,
  onPress,
  onRelease,
  rotation = [0, 0, 0],
}: PanelButtonProps) {
  const cap = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const pressed = useRef(0);
  const map = useMemo(() => labelTexture(label), [label]);
  const [w, h, d] = size;

  useFrame((_, dt) => {
    if (!cap.current) return;
    pressed.current = Math.max(0, pressed.current - dt * 4);
    cap.current.position.z = -d * 0.5 * Math.min(1, pressed.current * 2);
  });

  return (
    <group position={position} rotation={rotation}>
      <group ref={cap}>
        <mesh
          onPointerOver={e => {
            e.stopPropagation();
            setHover(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHover(false);
            document.body.style.cursor = '';
            onRelease?.();
          }}
          onPointerDown={e => {
            e.stopPropagation();
            pressed.current = 1;
            sound.playButtonClick();
            onPress();
          }}
          onPointerUp={e => {
            e.stopPropagation();
            onRelease?.();
          }}
        >
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial
            color={color}
            roughness={0.45}
            metalness={0.1}
            emissive={lit ? '#ff3b2f' : hover ? '#ffd27a' : '#000000'}
            emissiveIntensity={lit ? 0.6 : hover ? 0.25 : 0}
          />
        </mesh>
        {!labelAbove && (
          <mesh position={[0, 0, d / 2 + 0.0006]}>
            <planeGeometry args={[w * 0.92, h * 0.8]} />
            <meshBasicMaterial map={map} transparent toneMapped={false} />
          </mesh>
        )}
      </group>
      {labelAbove && (
        <mesh position={[0, h / 2 + h * 0.55, 0.0006]}>
          <planeGeometry args={[Math.max(w * 1.4, 0.03), h * 0.8]} />
          <meshBasicMaterial map={map} transparent toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}
