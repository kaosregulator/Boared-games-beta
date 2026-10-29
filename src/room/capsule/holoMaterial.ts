import * as THREE from 'three';

/**
 * The hologram look for a time capsule's piece: the piece's own texture,
 * turned to blue light, with a bright rim, rolling scanlines and a faint
 * flicker. It keeps the real texture's detail, so the thing still reads.
 * All the pieces' materials share one set of time uniforms.
 */

export const holoUniforms = {
  uTime: { value: 0 },
  /** 0..1, dips now and then for the flicker. */
  uFlicker: { value: 1 },
  /** Fades the hologram in when it appears. */
  uReveal: { value: 0 },
};

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  #ifdef USE_COLOR
    varying vec3 vColor;
  #endif
  void main() {
    vUv = uv;
    #ifdef USE_COLOR
      vColor = color;
    #endif
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uFlicker;
  uniform float uReveal;
  uniform vec3 uTint;
  uniform vec3 uBase;
  #ifdef USE_MAP
    uniform sampler2D uMap;
  #endif
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  #ifdef USE_COLOR
    varying vec3 vColor;
  #endif

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    vec3 base = uBase;
    #ifdef USE_MAP
      base *= texture2D(uMap, vUv).rgb;
    #endif
    #ifdef USE_COLOR
      base *= vColor;
    #endif
    float lum = dot(base, vec3(0.299, 0.587, 0.114));
    // Keep a little of the real colour so a red toy still reads as a red toy.
    vec3 body = mix(uTint * (0.34 + lum * 1.7), base * 1.3 + uTint * 0.2, 0.22);

    vec3 n = normalize(vWorldNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 view = normalize(cameraPosition - vWorldPos);
    float rim = pow(1.0 - clamp(abs(dot(n, view)), 0.0, 1.0), 2.2);

    // Scanlines in screen space, so they're the same fine pitch at any size, rolling down slowly.
    float line = sin(gl_FragCoord.y * 1.35 - uTime * 6.0) * 0.5 + 0.5;
    float band = smoothstep(0.92, 1.0, sin(gl_FragCoord.y * 0.018 - uTime * 1.6));
    float grain = hash(floor(gl_FragCoord.xy * 0.5) + floor(uTime * 24.0));

    vec3 col = body * (0.78 + line * 0.22) + uTint * rim * 1.6 + uTint * band * 0.35;
    col *= (0.9 + grain * 0.1) * uFlicker;

    // The reveal sweeps up the piece.
    float alpha = (0.6 + rim * 0.35 + band * 0.1) * (0.88 + line * 0.12) * uFlicker * uReveal;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

const TINT = new THREE.Color('#5fd4ff');

export function holoMaterial(source: THREE.Material, hasUv = true, hasColor = false): THREE.ShaderMaterial {
  const src = source as THREE.MeshStandardMaterial;
  const map = hasUv ? (src.map ?? null) : null;
  const defines: Record<string, string> = {};
  if (map) defines.USE_MAP = '';
  return new THREE.ShaderMaterial({
    defines,
    uniforms: {
      ...holoUniforms,
      uTint: { value: TINT },
      uBase: { value: src.color ? src.color.clone() : new THREE.Color(1, 1, 1) },
      uMap: { value: map },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    vertexColors: !!src.vertexColors && hasColor,
    transparent: true,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

/** Advance the shared clock; call once a frame while a hologram is up. */
export function tickHolo(t: number, dt: number, reduceMotion: boolean) {
  holoUniforms.uTime.value = t;
  holoUniforms.uReveal.value = Math.min(1, holoUniforms.uReveal.value + dt * 2.2);
  if (reduceMotion) {
    holoUniforms.uFlicker.value = 1;
    return;
  }
  // Mostly steady, with a brief stutter every few seconds.
  const k = t % 4.3;
  holoUniforms.uFlicker.value = k < 0.09 ? 0.55 + 0.35 * Math.sin(k * 160) : k > 2.1 && k < 2.14 ? 0.8 : 0.97 + 0.03 * Math.sin(t * 37);
}
