import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import type { CardRank, CardSuit } from '../../types';

/**
 * Real playing cards and poker chips for the card games, from Tabletop Club's
 * asset pack: the CC0 card fronts and jeffshee's card back in one 13 x 4
 * atlas, and its CC0 chips. A card is a thin box: face on top, back below,
 * so turning it over is a real flip.
 */

const T = '/games/tabletop/';
/** Poker size: 2.5 x 3.5 inches. */
export const CARD_W = 0.0635;
export const CARD_H = 0.0889;
export const CARD_T = 0.0004;

const ATLAS = { w: 2048, h: 1024, cw: 146, ch: 212 };
const RANK_COL: Record<CardRank, number> = { A: 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '10': 9, J: 10, Q: 11, K: 12 };
const SUIT_ROW: Record<CardSuit, number> = { '♣': 0, '♦': 1, '♥': 2, '♠': 3 };

function cellUV(col: number, row: number) {
  const u0 = (col * ATLAS.cw) / ATLAS.w;
  const u1 = ((col + 1) * ATLAS.cw) / ATLAS.w;
  // the atlas is drawn top-down; textures read bottom-up
  const v1 = 1 - (row * ATLAS.ch) / ATLAS.h;
  const v0 = 1 - ((row + 1) * ATLAS.ch) / ATLAS.h;
  return { u0, u1, v0, v1 };
}

const geoCache = new Map<string, THREE.BufferGeometry>();

/** A card's box with its face cell on +y and the back cell on -y. */
function cardGeometry(rank: CardRank, suit: CardSuit) {
  const key = `${rank}${suit}`;
  const hit = geoCache.get(key);
  if (hit) return hit;
  const g = new THREE.BoxGeometry(CARD_W, CARD_T, CARD_H);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  const face = cellUV(RANK_COL[rank], SUIT_ROW[suit]);
  const back = cellUV(13, 0);
  // BoxGeometry faces: +x, -x, +y, -y, +z, -z; four vertices each.
  const set = (faceIndex: number, c: { u0: number; u1: number; v0: number; v1: number }, flip: boolean) => {
    for (let k = 0; k < 4; k++) {
      const i = faceIndex * 4 + k;
      const u = uv.getX(i);
      const v = uv.getY(i);
      uv.setXY(i, c.u0 + (flip ? 1 - u : u) * (c.u1 - c.u0), c.v0 + v * (c.v1 - c.v0));
    }
  };
  set(2, face, false);
  set(3, back, true);
  // edges: a sliver of white
  for (const f of [0, 1, 4, 5]) for (let k = 0; k < 4; k++) uv.setXY(f * 4 + k, 0.004, 0.03);
  uv.needsUpdate = true;
  geoCache.set(key, g);
  return g;
}

export function useCardMaterial() {
  const tex = useTexture(`${T}cards.webp`);
  return useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
  }, [tex]);
}

export interface CardPose {
  pos: THREE.Vector3;
  /** Turn on the table (radians). */
  yaw: number;
  faceUp: boolean;
}

/**
 * One card that glides to wherever it is told to be, lifting off the table
 * as it travels and turning over in the air when its face changes.
 */
export function Card3D({
  rank,
  suit,
  pose,
  material,
  live,
}: {
  rank: CardRank;
  suit: CardSuit;
  pose: CardPose;
  material: THREE.Material;
  /** Written with where the card is, for the camera or a hand to follow. */
  live?: THREE.Vector3;
}) {
  const geo = useMemo(() => cardGeometry(rank, suit), [rank, suit]);
  const m = useRef<THREE.Mesh>(null);
  const flip = useRef(pose.faceUp ? 0 : Math.PI);
  const born = useRef(true);
  useFrame((_, dtRaw) => {
    const mesh = m.current;
    if (!mesh) return;
    const dt = Math.min(dtRaw, 0.05);
    if (born.current) {
      born.current = false;
      mesh.position.copy(pose.pos);
    }
    const before = mesh.position.clone();
    mesh.position.lerp(pose.pos, Math.min(1, dt * 7));
    const travel = before.distanceTo(pose.pos);
    // lift while it is still a long way off
    mesh.position.y = pose.pos.y + Math.min(0.03, travel * 0.25);
    const want = pose.faceUp ? 0 : Math.PI;
    flip.current += (want - flip.current) * Math.min(1, dt * 8);
    const turning = Math.sin(Math.abs(want - flip.current) / Math.PI * Math.PI) * 0.02;
    mesh.position.y += turning;
    mesh.rotation.set(0, pose.yaw, flip.current, 'YXZ');
    live?.copy(mesh.position);
  });
  return <mesh ref={m} geometry={geo} material={material} castShadow={false} />;
}

/* ---------------------------------- chips ---------------------------------- */

export const CHIP_VALUES = [1, 5, 10, 25, 100] as const;
export type ChipValue = (typeof CHIP_VALUES)[number];
export const CHIP_R = 0.02;
export const CHIP_T = 0.0033;

const chipGeo = new Map<number, THREE.BufferGeometry>();

/** Tabletop Club's chip art: stripes for the edge in the top half, the two faces below. */
function chipGeometry(value: ChipValue) {
  const hit = chipGeo.get(value);
  if (hit) return hit;
  const i = CHIP_VALUES.indexOf(value);
  const g = new THREE.CylinderGeometry(CHIP_R, CHIP_R, CHIP_T, 32, 1);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  const n = CHIP_VALUES.length;
  const done = new Set<number>();
  for (const group of g.groups) {
    for (let k = group.start; k < group.start + group.count; k++) {
      const idx = (g.index as THREE.BufferAttribute).getX(k);
      // shared vertices are listed many times; remap each once
      if (done.has(idx)) continue;
      done.add(idx);
      const u = uv.getX(idx);
      const v = uv.getY(idx);
      if (group.materialIndex === 0) uv.setXY(idx, (i + u) / n, 0.5 + v * 0.5);
      else if (group.materialIndex === 1) uv.setXY(idx, (i + u * 0.5) / n, v * 0.5);
      else uv.setXY(idx, (i + 0.5 + u * 0.5) / n, v * 0.5);
    }
  }
  uv.needsUpdate = true;
  g.clearGroups();
  g.addGroup(0, (g.index as THREE.BufferAttribute).count, 0);
  chipGeo.set(value, g);
  return g;
}

export function useChipMaterial() {
  const tex = useTexture(`${T}chips.webp`);
  return useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.45 });
  }, [tex]);
}

/** Split an amount into the chips a dealer would pay it in. */
export function chipsFor(amount: number): ChipValue[] {
  const out: ChipValue[] = [];
  let left = Math.max(0, Math.round(amount));
  for (const v of [...CHIP_VALUES].reverse()) {
    while (left >= v && out.length < 40) {
      out.push(v);
      left -= v;
    }
  }
  return out;
}

/** A neat stack per denomination, side by side. */
export function ChipStacks({ amount, at, material, spread = 0.045 }: { amount: number; at: THREE.Vector3; material: THREE.Material; spread?: number }) {
  const chips = chipsFor(amount);
  const byValue = CHIP_VALUES.map(v => chips.filter(c => c === v).length);
  const used = CHIP_VALUES.filter((_, k) => byValue[k] > 0);
  return (
    <group position={at}>
      {used.map((v, col) => {
        const count = byValue[CHIP_VALUES.indexOf(v)];
        return Array.from({ length: count }, (_, h) => (
          <mesh
            key={`${v}-${h}`}
            geometry={chipGeometry(v)}
            material={material}
            position={[(col - (used.length - 1) / 2) * spread + Math.sin(h * 2.3) * 0.0008, CHIP_T / 2 + h * CHIP_T, Math.cos(h * 1.7) * 0.0008]}
            rotation={[0, h * 0.7, 0]}
          />
        ));
      })}
    </group>
  );
}

export function ChipMesh({ value, material, ...props }: { value: ChipValue; material: THREE.Material } & React.ComponentProps<'mesh'>) {
  return <mesh geometry={chipGeometry(value)} material={material} {...props} />;
}

useTexture.preload(`${T}cards.webp`);
useTexture.preload(`${T}chips.webp`);
