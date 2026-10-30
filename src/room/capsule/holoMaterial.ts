import * as THREE from 'three';

/**
 * The hologram look for a time capsule's piece: the piece's own texture,
 * turned to blue light, with a bright rim, rolling scanlines and a faint
 * flicker. It keeps the real texture's detail, so the thing still reads.
 *
 * A plain, untextured model used to come out as one flat blue blob, so the
 * light also picks out its shape: a soft key light, bright creases where the
 * surface folds, and contour lines that climb the piece (after the
 * holographic visualizer's scan lines and Anderson Mancini's holographic
 * material). It builds up from the bottom with a bright edge when it appears.
 * All the pieces' materials share one set of uniforms.
 */

export const holoUniforms = {
  uTime: { value: 0 },
  /** 0..1, dips now and then for the flicker. */
  uFlicker: { value: 1 },
  /** Builds the hologram up from the bottom when it appears: 0..1. */
  uReveal: { value: 0 },
  /** A short sideways tear when the signal stutters: 0..1. */
  uGlitch: { value: 0 },
  /** The piece's centre height and radius in the world, for the reveal and contour lines. */
  uCenterY: { value: 0 },
  uRadius: { value: 1 },
};

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uGlitch;
  uniform float uRadius;
  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  #ifdef USE_COLOR
    varying vec3 vColor;
  #endif
  float vhash(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    vUv = uv;
    #ifdef USE_COLOR
      vColor = color;
    #endif
    vec4 world = modelMatrix * vec4(position, 1.0);
    // The tear: a thin band of the piece slides sideways for a moment.
    float band = floor((world.y / uRadius) * 9.0 + floor(uTime * 14.0));
    world.x += (vhash(band) - 0.5) * uGlitch * uRadius * 0.12 * step(0.72, vhash(band + 3.1));
    vWorldPos = world.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uFlicker;
  uniform float uReveal;
  uniform float uCenterY;
  uniform float uRadius;
  uniform vec3 uTint;
  uniform vec3 uBase;
  uniform float uTextured;
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
    // Bottom (0) to top (1) of the piece.
    float h = (vWorldPos.y - uCenterY) / (2.0 * uRadius) + 0.5;
    float front = uReveal * 1.25 - 0.1;
    if (h > front) discard;
    float edgeLine = smoothstep(0.06, 0.0, front - h) * step(uReveal, 0.999);

    vec3 base = uBase;
    #ifdef USE_MAP
      base *= texture2D(uMap, vUv).rgb;
    #endif
    #ifdef USE_COLOR
      base *= vColor;
    #endif
    float lum = dot(base, vec3(0.299, 0.587, 0.114));

    vec3 n = normalize(vWorldNormal) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 view = normalize(cameraPosition - vWorldPos);
    float facing = clamp(abs(dot(n, view)), 0.0, 1.0);
    float rim = pow(1.0 - facing, 2.2);

    // Shape: a key light from above-left, so a plain model still shows its form.
    float key = 0.42 + 0.58 * max(dot(n, normalize(vec3(-0.45, 0.8, 0.4))), 0.0);
    // Creases: where the surface turns sharply, a bright line.
    float crease = clamp(length(fwidth(n)) * 2.2 - 0.08, 0.0, 1.0);
    // Contour lines climbing the piece; stronger on a plain model, which has no texture to show.
    float contour = pow(fract(h * 26.0 - uTime * 0.35), 6.0) * mix(0.55, 0.22, uTextured);

    // Keep a little of the real colour so a red toy still reads as a red toy.
    vec3 body = mix(uTint * (0.3 + lum * 1.6), base * 1.3 + uTint * 0.2, 0.22) * key;

    // Scanlines in screen space, so they're the same fine pitch at any size, rolling down slowly.
    float line = sin(gl_FragCoord.y * 1.35 - uTime * 6.0) * 0.5 + 0.5;
    float band = smoothstep(0.92, 1.0, sin(gl_FragCoord.y * 0.018 - uTime * 1.6));
    float grain = hash(floor(gl_FragCoord.xy * 0.5) + floor(uTime * 24.0));

    vec3 col = body * (0.78 + line * 0.22) + uTint * (rim * 1.6 + band * 0.35 + crease * 0.9 + contour);
    col += vec3(0.75, 0.95, 1.0) * edgeLine * 1.4;
    col *= (0.9 + grain * 0.1) * uFlicker;

    float alpha = (0.6 + rim * 0.35 + band * 0.1 + crease * 0.25 + contour * 0.3) * (0.88 + line * 0.12) * uFlicker;
    alpha = max(alpha, edgeLine);
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
      uTextured: { value: map || hasColor ? 1 : 0 },
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

let matcap: THREE.CanvasTexture | null = null;

/** A soft studio light baked into a little sphere picture, so the real piece is lit without adding a light to the room. */
function studioMatcap() {
  if (matcap) return matcap;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const fill = g.createRadialGradient(size * 0.38, size * 0.32, size * 0.02, size * 0.5, size * 0.5, size * 0.52);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(0.35, '#e9e6e1');
  fill.addColorStop(0.75, '#a9a7a6');
  fill.addColorStop(1, '#5d6066');
  g.fillStyle = fill;
  g.fillRect(0, 0, size, size);
  // A cool rim from behind, so the edges separate from the dark room.
  const rim = g.createRadialGradient(size / 2, size / 2, size * 0.4, size / 2, size / 2, size * 0.5);
  rim.addColorStop(0, 'rgba(160, 220, 255, 0)');
  rim.addColorStop(1, 'rgba(160, 220, 255, 0.55)');
  g.fillStyle = rim;
  g.fillRect(0, 0, size, size);
  matcap = new THREE.CanvasTexture(canvas);
  matcap.colorSpace = THREE.SRGBColorSpace;
  return matcap;
}

/**
 * The real thing, in its own colours and texture, for the Images tab: the full
 * asset shrunk down, not the hologram. Lit by a baked studio light (matcap).
 */
export function realMaterial(source: THREE.Material, hasUv = true, hasColor = false): THREE.MeshMatcapMaterial {
  const src = source as THREE.MeshStandardMaterial;
  return new THREE.MeshMatcapMaterial({
    matcap: studioMatcap(),
    map: hasUv ? (src.map ?? null) : null,
    color: src.color ? src.color.clone() : new THREE.Color(1, 1, 1),
    vertexColors: !!src.vertexColors && hasColor,
    side: THREE.DoubleSide,
    // Drawn in the transparent pass, so it comes after the depth clear like the hologram.
    transparent: true,
    opacity: 1,
    depthWrite: true,
  });
}

/** Advance the shared clock; call once a frame while a hologram is up. */
export function tickHolo(t: number, dt: number, reduceMotion: boolean) {
  holoUniforms.uTime.value = t;
  holoUniforms.uReveal.value = Math.min(1, holoUniforms.uReveal.value + dt * (reduceMotion ? 6 : 1.1));
  if (reduceMotion) {
    holoUniforms.uFlicker.value = 1;
    holoUniforms.uGlitch.value = 0;
    return;
  }
  // Mostly steady, with a brief stutter (and a sideways tear) every few seconds.
  const k = t % 4.3;
  holoUniforms.uFlicker.value = k < 0.09 ? 0.55 + 0.35 * Math.sin(k * 160) : k > 2.1 && k < 2.14 ? 0.8 : 0.97 + 0.03 * Math.sin(t * 37);
  holoUniforms.uGlitch.value = k < 0.14 ? 1 : k > 2.1 && k < 2.16 ? 0.5 : 0;
}
