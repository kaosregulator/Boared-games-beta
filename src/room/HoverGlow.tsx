import React, { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { isTouchDevice } from './input';

/**
 * What you're pointing at: a soft warm amber glow around it and a small
 * floating name card above it, like an old adventure game's lamp-lit hotspot.
 * Replaces the thin wireframe box.
 *
 * The glow is a rounded shell drawn with a rim (fresnel) shader: bright where
 * you see its edges, clear in the middle, added on top of the light, gently
 * breathing. It is depth-tested, so things in front still cover it.
 */
const vertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uStrength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    float rim = pow(1.0 - facing, 2.6);
    float breathe = 0.82 + 0.18 * sin(uTime * 2.4);
    float a = (rim * 0.9 + 0.05) * breathe * uStrength;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

const AMBER = new THREE.Color('#ffb347');

/** Ids that currently show their own name card, so the screen label can stand aside. */
export const labelledIds = new Set<string>();

function GlowShell({ size, position }: { size: [number, number, number]; position: [number, number, number] }) {
  const [w, h, d] = size;
  const geo = useMemo(() => {
    const r = Math.min(w, h, d) * 0.22;
    return new RoundedBoxGeometry(w, h, d, 3, r);
  }, [w, h, d]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { uColor: { value: AMBER }, uTime: { value: 0 }, uStrength: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  useFrame(({ clock }, dt) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    // Fade in rather than pop.
    mat.uniforms.uStrength.value = Math.min(1, mat.uniforms.uStrength.value + dt * 5);
  });
  return <mesh geometry={geo} material={mat} position={position} renderOrder={5} raycast={() => {}} />;
}

function NameCard({ label, hint, at }: { label: string; hint?: string; at: [number, number, number] }) {
  const touch = useMemo(isTouchDevice, []);
  return (
    <Html position={at} center={false} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
      <div className="hover-card">
        <div className="hover-card-box">
          <p className="hover-card-name">{label}</p>
          <p className="hover-card-hint">{touch ? 'Tap' : 'E'} · {hint ?? 'Examine'}</p>
        </div>
        <div className="hover-card-stem" />
        <div className="hover-card-dot" />
      </div>
    </Html>
  );
}

/**
 * Glow + name card for one hovered thing. `size`/`position` are the item's box
 * in the parent's space; the card sits just above the box.
 */
export function HoverGlow({
  id,
  label,
  hint,
  size,
  position,
}: {
  id?: string;
  label?: string;
  hint?: string;
  size: [number, number, number];
  position: [number, number, number];
}) {
  useEffect(() => {
    if (!id || !label) return;
    labelledIds.add(id);
    return () => {
      labelledIds.delete(id);
    };
  }, [id, label]);
  const top: [number, number, number] = [position[0], position[1] + size[1] / 2 + 0.02, position[2]];
  return (
    <>
      <GlowShell size={[size[0] * 1.08 + 0.02, size[1] * 1.08 + 0.02, size[2] * 1.08 + 0.02]} position={position} />
      {label && <NameCard label={label} hint={hint} at={top} />}
    </>
  );
}

/**
 * A warm lamp-light lift on a whole model while it's hovered: its materials
 * get a little amber emissive, put back exactly as they were afterwards.
 */
export function useWarmHover(root: THREE.Object3D | null, on: boolean) {
  const saved = useRef(new Map<THREE.Material, { color: THREE.Color; intensity: number }>());
  useEffect(() => {
    if (!root || !on) return;
    const touched = saved.current;
    root.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const m of [mesh.material].flat() as THREE.MeshStandardMaterial[]) {
        if (!m || !('emissive' in m) || touched.has(m)) continue;
        touched.set(m, { color: m.emissive.clone(), intensity: m.emissiveIntensity });
        m.emissive.copy(AMBER);
        m.emissiveIntensity = 0.1;
      }
    });
    return () => {
      for (const [m, was] of touched) {
        (m as THREE.MeshStandardMaterial).emissive.copy(was.color);
        (m as THREE.MeshStandardMaterial).emissiveIntensity = was.intensity;
      }
      touched.clear();
    };
  }, [root, on]);
}
