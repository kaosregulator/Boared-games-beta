import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { SafeRoomModel } from '../room/RoomModel';
import { PanelButton, labelTexture } from '../devices/PanelButton';
import { GlassAnchor, GlassSurface } from '../devices/GlassScreen';
import { TvScreen, type TvCommand, type TvMode } from './TvScreen';
import { SpeakerAnchor } from './SpeakerAnchor';
import { pressTv, publishTvStatus, useTvCommand, useTvStatus } from './tvBus';

/**
 * The CRT on the dresser, close up. The screen is live DOM (video, guide,
 * emulator) laid onto the glass; every control is a 3D button on the set or
 * on the cable box beside it. No floating panels.
 */

/** Same CRT mesh as the room, at room size. */
export const TV_METERS = 0.62;
const S = TV_METERS;
/** Measured off the mesh: glass centre and size as fractions of its width. */
export const GLASS = { x: 0.017 * S, y: 0.454 * S, z: 0.394 * S + 0.004, w: 0.766 * S, h: 0.48 * S };
const SCREEN_PX = 640;
const BEZEL = { y: 0.122 * S, z: 0.394 * S + 0.002 };

const BOX = { x: S / 2 + 0.22, w: 0.34, h: 0.075, d: 0.24 };

function LedReadout({ text, on }: { text: string; on: boolean }) {
  const tex = useMemo(() => labelTexture(on ? text : '', '#ff3b2f', '#140303', 256, 96), [text, on]);
  return (
    <mesh position={[-BOX.w * 0.22, BOX.h * 0.55, BOX.d / 2 + 0.0008]}>
      <planeGeometry args={[0.11, 0.036]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

function CableBox({
  channel,
  on,
  press,
}: {
  channel: number;
  on: boolean;
  press: (key: TvCommand['key']) => void;
}) {
  const brand = useMemo(() => labelTexture('CABLEVISION · DIGITAL READY', '#c9c4b8', 'rgba(0,0,0,0)', 512, 64), []);
  return (
    <group position={[BOX.x, 0, 0.02]}>
      <mesh position={[0, BOX.h / 2, 0]}>
        <boxGeometry args={[BOX.w, BOX.h, BOX.d]} />
        <meshStandardMaterial color="#26252a" roughness={0.55} metalness={0.25} />
      </mesh>
      {/* brushed face plate */}
      <mesh position={[0, BOX.h / 2, BOX.d / 2 + 0.0004]}>
        <planeGeometry args={[BOX.w * 0.98, BOX.h * 0.9]} />
        <meshStandardMaterial color="#3b3a40" roughness={0.35} metalness={0.5} />
      </mesh>
      <mesh position={[-BOX.w * 0.22, BOX.h * 0.2, BOX.d / 2 + 0.0008]}>
        <planeGeometry args={[0.13, 0.016]} />
        <meshBasicMaterial map={brand} transparent toneMapped={false} />
      </mesh>
      <LedReadout text={String(channel).padStart(2, '0')} on={on} />
      {(
        [
          ['PWR', 'power', 0.02, '#7a1f1f'],
          ['CH▼', 'chDown', 0.068, '#1c1a1e'],
          ['CH▲', 'chUp', 0.116, '#1c1a1e'],
          ['OK', 'ok', 0.0, '#1f4a7a'],
        ] as [string, TvCommand['key'], number, string][]
      ).map(([label, key, x, color]) =>
        key === 'ok' ? null : (
          <PanelButton
            key={key}
            position={[x, BOX.h * 0.58, BOX.d / 2 + 0.004]}
            size={[0.04, 0.02, 0.008]}
            label={label}
            color={color}
            lit={key === 'power' && on}
            onPress={() => press(key)}
          />
        ),
      )}
      <PanelButton position={[0.068, BOX.h * 0.24, BOX.d / 2 + 0.004]} size={[0.04, 0.018, 0.008]} label="GUIDE" onPress={() => press('guide')} />
      <PanelButton position={[0.116, BOX.h * 0.24, BOX.d / 2 + 0.004]} size={[0.04, 0.018, 0.008]} label="OK" color="#1f4a7a" onPress={() => press('ok')} />
      <PanelButton position={[0.02, BOX.h * 0.24, BOX.d / 2 + 0.004]} size={[0.04, 0.018, 0.008]} label="MENU" onPress={() => press('menu')} />
      {/* rubber feet */}
      {[-1, 1].map(sx => (
        <mesh key={sx} position={[sx * BOX.w * 0.4, 0.003, BOX.d * 0.35]}>
          <cylinderGeometry args={[0.01, 0.01, 0.006, 12]} />
          <meshStandardMaterial color="#0c0c0c" />
        </mesh>
      ))}
    </group>
  );
}

export function TvSet() {
  const status = useTvStatus();
  const press = pressTv;
  const on = status.mode !== 'off';

  useEffect(() => () => {
    document.body.style.cursor = '';
  }, []);

  const front: [string, TvCommand['key'], string][] = [
    ['POWER', 'power', '#5a1414'],
    ['MENU', 'menu', '#1c1a1e'],
    ['GUIDE', 'guide', '#1c1a1e'],
    ['CH ▼', 'chDown', '#1c1a1e'],
    ['CH ▲', 'chUp', '#1c1a1e'],
    ['VOL −', 'volDown', '#1c1a1e'],
    ['VOL +', 'volUp', '#1c1a1e'],
    ['OK', 'ok', '#1f4a7a'],
  ];

  return (
    <group>
      {/* dresser top the set stands on */}
      <mesh position={[0, -0.012, 0.02]}>
        <boxGeometry args={[1.9, 0.024, 0.62]} />
        <meshStandardMaterial color="#6b3f22" roughness={0.7} />
      </mesh>

      <SafeRoomModel id="crt" position={[0, 0, 0]} axis="x" meters={TV_METERS} tintAmount={0} />

      <GlassAnchor id="tv" position={[GLASS.x, GLASS.y, GLASS.z]} width={GLASS.w} widthPx={SCREEN_PX} />
      <SpeakerAnchor id="tv" position={[GLASS.x, GLASS.y, GLASS.z]} />
      {/* power lamp */}
      <mesh position={[0.36 * S, BEZEL.y, BEZEL.z + 0.002]}>
        <sphereGeometry args={[0.004, 10, 10]} />
        <meshBasicMaterial color={on ? '#ff3b2f' : '#2a0606'} toneMapped={false} />
      </mesh>

      {front.map(([label, key, color], i) => (
        <PanelButton
          key={key}
          position={[-0.205 + i * 0.054, BEZEL.y, BEZEL.z + 0.004]}
          size={[0.046, 0.02, 0.008]}
          label={label}
          color={color}
          lit={key === 'power' && on}
          onPress={() => press(key)}
        />
      ))}

      <CableBox channel={status.channel} on={on && (status.mode === 'tv' || status.mode === 'guide')} press={press} />

      {/* the NES beside the set: click it to switch the input to the console */}
      <group
        onClick={e => {
          e.stopPropagation();
          press('game');
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <SafeRoomModel id="nes" position={[-(S / 2 + 0.26), 0, 0.04]} rotation={[0, 0.12, 0]} axis="x" meters={0.36} tintAmount={0} />
        <mesh position={[-(S / 2 + 0.26), 0.06, 0.04]} visible={false}>
          <boxGeometry args={[0.36, 0.12, 0.28]} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * The room's own CRT with the set left on. Same mesh and frame as the close-up
 * set, so the glass sits in the same spot. The picture goes behind the canvas
 * here (TvGlass inRoom), and this plane cuts a see-through hole for it, so
 * anything standing in front of the TV still hides it.
 */
export function RoomTvGlass() {
  const hole = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#000',
        opacity: 0,
        blending: THREE.NoBlending,
        fog: false,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => () => hole.dispose(), [hole]);
  return (
    <>
      <GlassAnchor id="tv" position={[GLASS.x, GLASS.y, GLASS.z]} width={GLASS.w} widthPx={SCREEN_PX} />
      <mesh position={[GLASS.x, GLASS.y, GLASS.z]} material={hole}>
        <planeGeometry args={[GLASS.w, GLASS.h]} />
      </mesh>
    </>
  );
}

/** DOM half of the set: the picture itself, glued onto the glass by <GlassAnchor id="tv">. */
export function TvGlass({ initialMode, inRoom = false }: { initialMode: TvMode; inRoom?: boolean }) {
  const command = useTvCommand();
  const height = Math.round((SCREEN_PX * GLASS.h) / GLASS.w);
  return (
    // in the room it sits under the canvas and shows through RoomTvGlass's hole
    <GlassSurface id="tv" zIndex={inRoom ? -1 : 10}>
      <TvScreen width={SCREEN_PX} height={height} command={command} initialMode={initialMode} onStatus={publishTvStatus} inRoom={inRoom} />
    </GlassSurface>
  );
}
