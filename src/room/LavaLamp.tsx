import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * A working lava lamp, fitted over the glass of a lamp that's baked into a
 * Tripo mesh. The glass is a tapered cylinder; inside it a raymarched field
 * of wax blobs does what lava lamps actually do: the pool on the hot coil
 * swells, a blob necks off and rises, slows and stretches near the cool cap,
 * then sinks back and melts into the pool. Blobs that meet merge smoothly.
 */
export interface LavaSpec {
  /** Centre of the glass on the floor plan, in the prop's placed frame. */
  x: number;
  z: number;
  /** Bottom and top of the glass (where the base and the cap meet it). */
  y0: number;
  y1: number;
  /** Glass radius at the bottom and at the top. */
  r0: number;
  r1: number;
  /** Liquid and wax colours. */
  liquid: string;
  wax: string;
  /** Seconds offset so the lamps in the room aren't in sync. */
  seed: number;
}

const vertex = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vCam;
  varying vec3 vNormal;
  void main() {
    vPos = position;
    vNormal = normal;
    vCam = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uH;
  uniform float uR0;
  uniform float uR1;
  uniform vec3 uLiquid;
  uniform vec3 uWax;
  uniform float uHeat;
  uniform float uDebug;
  varying vec3 vPos;
  varying vec3 vCam;
  varying vec3 vNormal;

  const int BLOBS = 6;

  float radiusAt(float y) { return mix(uR0, uR1, clamp(y / uH, 0.0, 1.0)); }

  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  // One blob's height (0..1 of the glass) over its cycle: it sits melted in
  // the pool, swells off the coil and rises, hangs under the cool cap for a
  // moment, then sinks back and melts in.
  float cycle(float s) {
    s = fract(s);
    float rise = smoothstep(0.42, 0.68, s);
    float fall = smoothstep(0.76, 0.99, s);
    return rise * (1.0 - fall);
  }

  float waxField(vec3 p) {
    float t = uTime;
    float rb = uR0;
    // The pool on the coil, breathing as it heats.
    float pool = length((p - vec3(0.0, -0.02 * uH, 0.0)) / vec3(1.0, 0.36, 1.0)) - rb * (0.8 + 0.05 * sin(t * 0.23));
    float d = pool;
    for (int i = 0; i < BLOBS; i++) {
      float fi = float(i);
      float period = 21.0 + fi * 3.9;
      // Spread the blobs through their cycles so only two or three are up at once.
      float phase = fi / float(BLOBS) + 0.07 * sin(fi * 3.1);
      float s0 = t / period + phase;
      float u = cycle(s0);
      float speed = abs(cycle(s0 + 0.015) - u) * 22.0;
      float y = mix(0.05, 0.8, u) * uH;
      float r = radiusAt(y);
      float drift = r * 0.42;
      float ang = fi * 2.39996 + t * 0.03;
      vec3 c = vec3(cos(ang) * drift, y, sin(ang) * drift);
      float size = r * (0.3 + 0.12 * fract(fi * 0.381)) * (1.0 + 0.08 * sin(t * 0.4 + fi));
      // Moving blobs pull a little long; resting ones round out.
      float stretch = 1.0 + min(speed, 1.0) * 0.4;
      vec3 q = (p - c) / vec3(1.0 / sqrt(stretch), stretch, 1.0 / sqrt(stretch));
      float blob = length(q) - size;
      d = smin(d, blob, rb * 0.14);
    }
    return d;
  }

  bool inside(vec3 p) {
    return p.y > 0.0 && p.y < uH && length(p.xz) < radiusAt(p.y) * 0.985;
  }

  void main() {
    if (uDebug > 0.5) {
      gl_FragColor = vec4(0.0, 1.0, 0.2, 1.0);
      return;
    }
    vec3 ro = vPos;
    vec3 rd = normalize(vPos - vCam);
    float h01 = clamp(vPos.y / uH, 0.0, 1.0);

    // The liquid glows hottest near the bulb and darkens toward the cap.
    float facingGlass = clamp(dot(normalize(vNormal), -rd), 0.0, 1.0);
    vec3 liquid = uLiquid * mix(1.25, 0.5, h01) * (0.55 + 0.5 * facingGlass) * uHeat;

    float span = uR0 * 2.4;
    float stepLen = span / 56.0;
    vec3 p = ro + rd * stepLen * 0.5;
    vec3 col = liquid;
    float hit = 0.0;
    float travelled = 0.0;
    for (int i = 0; i < 56; i++) {
      if (!inside(p) && travelled > stepLen * 2.0) break;
      float d = waxField(p);
      if (d < 0.0) {
        // Refine to the surface.
        p -= rd * stepLen * 0.5;
        if (waxField(p) < 0.0) p -= rd * stepLen * 0.25;
        vec2 e = vec2(uR0 * 0.02, 0.0);
        vec3 n = normalize(vec3(
          waxField(p + e.xyy) - waxField(p - e.xyy),
          waxField(p + e.yxy) - waxField(p - e.yxy),
          waxField(p + e.yyx) - waxField(p - e.yyx)
        ));
        float hp = clamp(p.y / uH, 0.0, 1.0);
        // Lit through the wax from the bulb underneath: bright, soft cores,
        // deeper colour at the edges where light travels through less wax.
        float wrap = clamp(dot(n, vec3(0.0, -1.0, 0.0)) * 0.5 + 0.5, 0.0, 1.0);
        float facing = clamp(dot(n, -rd), 0.0, 1.0);
        vec3 deep = uWax * vec3(1.0, 0.62, 0.42);
        vec3 wax = mix(deep, uWax * 1.25, pow(facing, 1.5)) * (0.55 + 0.6 * wrap) * mix(1.3, 0.75, hp);
        float spec = pow(clamp(dot(reflect(rd, n), normalize(vec3(0.3, 0.8, 0.5))), 0.0, 1.0), 24.0);
        col = (wax + spec * 0.25) * uHeat;
        hit = 1.0;
        break;
      }
      p += rd * stepLen;
      travelled += stepLen;
    }

    // Glass: a cool edge and one vertical highlight streak.
    float fres = pow(1.0 - abs(dot(normalize(vNormal), -rd)), 3.0);
    col = mix(col, vec3(1.0), fres * 0.18);
    float streak = smoothstep(0.08, 0.0, abs(atan(vPos.x, vPos.z) - 0.9)) * 0.22;
    col += streak;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * Drop-in for a placed prop: render as a child of that prop's RoomModel so
 * the spec's coordinates line up with the mesh.
 */
export function LavaLamp({ spec, light = true }: { spec: LavaSpec; light?: boolean }) {
  const H = spec.y1 - spec.y0;
  const geometry = useMemo(() => {
    // Slightly proud of the baked glass so the old painted lava never shows.
    const grow = 1.03;
    const geo = new THREE.CylinderGeometry(spec.r1 * grow, spec.r0 * grow, H, 40, 1, true);
    geo.translate(0, H / 2, 0);
    return geo;
  }, [H, spec.r0, spec.r1]);
  const uniforms = useMemo(
    () => ({
      uTime: { value: spec.seed },
      uH: { value: H },
      uR0: { value: spec.r0 },
      uR1: { value: spec.r1 },
      uLiquid: { value: new THREE.Color(spec.liquid) },
      uWax: { value: new THREE.Color(spec.wax) },
      uHeat: { value: 1 },
      uDebug: { value: typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('lavadebug') ? 1 : 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const glow = useRef<THREE.PointLight>(null);
  const material = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock }) => {
    // Capture scripts can pin the lamps to a moment with window.__lavaTime.
    const pinned = (window as unknown as { __lavaTime?: number }).__lavaTime;
    const t = (pinned ?? clock.elapsedTime) + spec.seed;
    const u = material.current?.uniforms;
    if (u) {
      u.uTime.value = t;
      // The bulb hums a little brighter and dimmer as wax crosses it.
      u.uHeat.value = 1 + Math.sin(t * 0.21) * 0.04;
    }
    if (glow.current) glow.current.intensity = 0.55 + Math.sin(t * 0.21) * 0.05;
  });

  return (
    <group position={[spec.x, spec.y0, spec.z]}>
      <mesh geometry={geometry} renderOrder={2}>
        <shaderMaterial ref={material} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} side={THREE.FrontSide} />
      </mesh>
      {light && (
        <pointLight ref={glow} position={[0, H * 0.45, 0]} color={spec.wax} intensity={0.55} distance={1.5} decay={2} />
      )}
    </group>
  );
}

/** The four lamps in the room, measured off their meshes. */
export const LAVA: Record<'nightstand' | 'teddy' | 'toyshelf' | 'clutterdesk', LavaSpec> = {
  nightstand: { x: 0.026, z: -0.165, y0: 0.638, y1: 0.816, r0: 0.079, r1: 0.05, liquid: '#e0105c', wax: '#ffc04a', seed: 3 },
  teddy: { x: -0.622, z: 0.04, y0: 0.399, y1: 0.583, r0: 0.066, r1: 0.0345, liquid: '#ef1d5a', wax: '#ffd44f', seed: 41 },
  toyshelf: { x: 0.587, z: -0.165, y0: 0.935, y1: 1.251, r0: 0.0936, r1: 0.0435, liquid: '#d81a10', wax: '#ffae3a', seed: 77 },
  clutterdesk: { x: -0.791, z: -0.342, y0: 0.817, y1: 1.027, r0: 0.075, r1: 0.038, liquid: '#e2163e', wax: '#ffc747', seed: 19 },
};
