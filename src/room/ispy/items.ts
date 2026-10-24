import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COLORS, type ColorName, type KindId } from './puzzle';

/**
 * The toys in the I Spy pile, built from plain shapes (nothing to download).
 * Each toy's parts are baked into one or two meshes with vertex colours, one
 * shiny plastic and one metal, so a carpet with 180 toys stays a few hundred
 * draw calls. Letters, numbers and the library book's stamp are small
 * decals on top. Sizes are real toy sizes in metres; the bottom sits at y=0.
 */

type Finish = 'plastic' | 'metal' | 'glass' | 'matte';

interface Part {
  geo: THREE.BufferGeometry;
  color: string;
  finish?: Finish;
}

interface Decal {
  geo: THREE.BufferGeometry;
  tex: THREE.Texture;
}

export interface ToyMesh {
  /** One geometry per finish, vertex coloured. */
  layers: { finish: Finish; geo: THREE.BufferGeometry }[];
  decals: Decal[];
  /** Bounds before any tip-over. */
  size: THREE.Vector3;
  center: THREE.Vector3;
}

// ---------------------------------------------------------------------------
// Shared materials

const MATERIALS: Record<Finish, THREE.MeshStandardMaterial> = {
  plastic: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.02 }),
  metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.75 }),
  glass: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.06, metalness: 0.12 }),
  matte: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }),
};

export function toyMaterial(finish: Finish) {
  return MATERIALS[finish];
}

const decalMats = new Map<THREE.Texture, THREE.MeshStandardMaterial>();
export function decalMaterial(tex: THREE.Texture) {
  let m = decalMats.get(tex);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
    decalMats.set(tex, m);
  }
  return m;
}

// ---------------------------------------------------------------------------
// Little geometry helpers. Each returns a fresh geometry already moved into place.

type V3 = [number, number, number];
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();

function place(geo: THREE.BufferGeometry, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]) {
  _e.set(rot[0], rot[1], rot[2]);
  _q.setFromEuler(_e);
  _m.compose(new THREE.Vector3(...pos), _q, new THREE.Vector3(...scale));
  geo.applyMatrix4(_m);
  return geo;
}

const box = (w: number, h: number, d: number, pos?: V3, rot?: V3) => place(new THREE.BoxGeometry(w, h, d), pos, rot);
const cyl = (rt: number, rb: number, h: number, pos?: V3, rot?: V3, seg = 16) => place(new THREE.CylinderGeometry(rt, rb, h, seg), pos, rot);
const sph = (r: number, pos?: V3, scale?: V3, seg = 14) => place(new THREE.SphereGeometry(r, seg, Math.max(6, Math.round(seg * 0.7))), pos, undefined, scale);
const cone = (r: number, h: number, pos?: V3, rot?: V3, seg = 14) => place(new THREE.ConeGeometry(r, h, seg), pos, rot);
const torus = (R: number, t: number, pos?: V3, rot?: V3, arc = Math.PI * 2) => place(new THREE.TorusGeometry(R, t, 8, 20, arc), pos, rot);

function extrude(shape: THREE.Shape, depth: number, pos?: V3, rot?: V3, bevel = 0.0015) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -depth / 2);
  return place(geo, pos, rot);
}

function lathe(points: [number, number][], pos?: V3, rot?: V3, seg = 18) {
  return place(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(Math.max(0.0001, x), y)), seg), pos, rot);
}

function starShape(outer: number, inner: number, points = 5) {
  const s = new THREE.Shape();
  for (let i = 0; i <= points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? outer : inner;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  return s;
}

function heartShape(size: number) {
  const s = new THREE.Shape();
  const k = size / 0.05;
  s.moveTo(0, -0.022 * k);
  s.bezierCurveTo(0.03 * k, 0.0 * k, 0.026 * k, 0.026 * k, 0.012 * k, 0.026 * k);
  s.bezierCurveTo(0.004 * k, 0.026 * k, 0, 0.018 * k, 0, 0.014 * k);
  s.bezierCurveTo(0, 0.018 * k, -0.004 * k, 0.026 * k, -0.012 * k, 0.026 * k);
  s.bezierCurveTo(-0.026 * k, 0.026 * k, -0.03 * k, 0.0 * k, 0, -0.022 * k);
  return s;
}

function eggProfile(w: number, h: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push([(w / 2) * Math.sqrt(Math.sin(Math.PI * t)) * (1 - 0.18 * t), t * h]);
  }
  return pts;
}

// ---------------------------------------------------------------------------
// Decal textures (canvas), cached by what they say.

const texCache = new Map<string, THREE.CanvasTexture>();

function canvasTex(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void) {
  const hit = texCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  draw(g, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}

function glyphTex(text: string, ink: string, paper: string | null) {
  return canvasTex(`glyph:${text}:${ink}:${paper}`, 128, (g, s) => {
    if (paper) {
      g.fillStyle = paper;
      g.fillRect(0, 0, s, s);
    }
    g.fillStyle = ink;
    g.font = `900 ${Math.round(s * 0.78)}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, s / 2, s * 0.54);
  });
}

function eightTex() {
  return canvasTex('eightball', 128, (g, s) => {
    g.fillStyle = '#f7f4ec';
    g.beginPath();
    g.arc(s / 2, s / 2, s * 0.48, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#111';
    g.font = `900 ${Math.round(s * 0.7)}px Arial, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('8', s / 2, s * 0.54);
  });
}

function libraryTex() {
  return canvasTex('library-book', 256, (g, s) => {
    g.fillStyle = '#1f4f9e';
    g.fillRect(0, 0, s, s);
    g.strokeStyle = '#e9d9a6';
    g.lineWidth = 6;
    g.strokeRect(14, 14, s - 28, s - 28);
    g.fillStyle = '#f3e6b8';
    g.font = '900 34px Georgia, serif';
    g.textAlign = 'center';
    g.fillText('PICTURE', s / 2, 70);
    g.fillText('RIDDLES', s / 2, 108);
    g.font = '700 18px Georgia, serif';
    g.fillText('PUBLIC LIBRARY COPY', s / 2, 140);
    // The stamp.
    g.save();
    g.translate(s / 2, 196);
    g.rotate(-0.2);
    g.strokeStyle = '#d42a2a';
    g.lineWidth = 6;
    g.strokeRect(-92, -26, 184, 52);
    g.fillStyle = '#d42a2a';
    g.font = '900 34px "Arial Black", Arial, sans-serif';
    g.fillText('OVERDUE', 0, 12);
    g.restore();
  });
}

function screenTex(kind: 'tama' | 'etch') {
  return canvasTex(`screen:${kind}`, 128, (g, s) => {
    if (kind === 'tama') {
      g.fillStyle = '#b9c7a3';
      g.fillRect(0, 0, s, s);
      g.fillStyle = '#2b3324';
      // A pixel blob, like the one on the desk.
      const px = s / 16;
      const blob = ['......####......', '....########....', '...##########...', '...##..##..##...', '...##########...', '...###....###...', '....########....', '.....#....#.....'];
      blob.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && g.fillRect(x * px, (y + 4) * px, px, px)));
    } else {
      g.fillStyle = '#c9c9c4';
      g.fillRect(0, 0, s, s);
      g.strokeStyle = '#4b4b4b';
      g.lineWidth = 2;
      // The house everybody drew.
      g.beginPath();
      g.moveTo(20, 104);
      g.lineTo(20, 60);
      g.lineTo(64, 24);
      g.lineTo(108, 60);
      g.lineTo(108, 104);
      g.lineTo(20, 104);
      g.moveTo(54, 104);
      g.lineTo(54, 76);
      g.lineTo(74, 76);
      g.lineTo(74, 104);
      g.stroke();
    }
  });
}

/** A flat decal quad lying on a face. `normal` is the face direction. */
function decal(tex: THREE.Texture, w: number, h: number, pos: V3, rot: V3 = [0, 0, 0]): Decal {
  return { geo: place(new THREE.PlaneGeometry(w, h), pos, rot), tex };
}

// ---------------------------------------------------------------------------
// Builders

const WOOD = '#e2bd84';
const DARK = '#1d1b22';
const WHITE = '#f6f2e9';
const SKIN_GOLD = '#d4a531';
const FINISH_FOR: Partial<Record<ColorName, Finish>> = { gold: 'metal', silver: 'metal' };

type Built = { parts: Part[]; decals?: Decal[] };
type Builder = (c: string, color: ColorName, label?: string) => Built;

const P = (geo: THREE.BufferGeometry, color: string, finish?: Finish): Part => ({ geo, color, finish });

function pips(n: number, s: number, face: 'top' | 'front' | 'right' | 'back' | 'left' | 'bottom', color: string): Part[] {
  const spots: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  };
  const h = s / 2;
  const d = s * 0.27;
  return spots[n].map(([u, v]) => {
    const pip = new THREE.CylinderGeometry(s * 0.09, s * 0.09, 0.001, 10);
    const at: Record<typeof face, { pos: V3; rot: V3 }> = {
      top: { pos: [u * d, s + 0.0004, v * d], rot: [0, 0, 0] },
      bottom: { pos: [u * d, -0.0004, v * d], rot: [0, 0, 0] },
      front: { pos: [u * d, h + v * d, h + 0.0004], rot: [Math.PI / 2, 0, 0] },
      back: { pos: [u * d, h + v * d, -h - 0.0004], rot: [Math.PI / 2, 0, 0] },
      right: { pos: [h + 0.0004, h + v * d, u * d], rot: [0, 0, Math.PI / 2] },
      left: { pos: [-h - 0.0004, h + v * d, u * d], rot: [0, 0, Math.PI / 2] },
    };
    return P(place(pip, at[face].pos, at[face].rot), color);
  });
}

const BUILD: Record<KindId, Builder> = {
  marble: c => ({
    parts: [P(sph(0.013, [0, 0.013, 0], undefined, 18), c, 'glass'), P(torus(0.0105, 0.0022, [0, 0.013, 0], [0.5, 0.3, 0]), WHITE, 'glass')],
  }),
  yoyo: c => ({
    parts: [
      P(cyl(0.028, 0.028, 0.012, [-0.009, 0.028, 0], [0, 0, Math.PI / 2], 24), c),
      P(cyl(0.028, 0.028, 0.012, [0.009, 0.028, 0], [0, 0, Math.PI / 2], 24), c),
      P(cyl(0.008, 0.008, 0.0062, [0, 0.028, 0], [0, 0, Math.PI / 2]), WHITE),
      P(cyl(0.012, 0.012, 0.0005, [0.0152, 0.028, 0], [0, 0, Math.PI / 2], 18), WHITE),
    ],
  }),
  die: (c, color) => {
    const s = 0.024;
    const ink = color === 'white' ? DARK : WHITE;
    return {
      parts: [
        P(place(new THREE.BoxGeometry(s, s, s), [0, s / 2, 0]), c),
        ...pips(6, s, 'top', ink),
        ...pips(1, s, 'bottom', ink),
        ...pips(2, s, 'front', ink),
        ...pips(5, s, 'back', ink),
        ...pips(3, s, 'right', ink),
        ...pips(4, s, 'left', ink),
      ],
    };
  },
  crayon: c => ({
    parts: [
      P(cyl(0.0065, 0.0065, 0.062, [0, 0.0065, 0], [0, 0, Math.PI / 2], 12), c, 'matte'),
      P(cone(0.0065, 0.014, [0.038, 0.0065, 0], [0, 0, -Math.PI / 2], 12), c, 'matte'),
      P(cyl(0.0069, 0.0069, 0.004, [-0.014, 0.0065, 0], [0, 0, Math.PI / 2], 12), DARK, 'matte'),
      P(cyl(0.0069, 0.0069, 0.004, [0.014, 0.0065, 0], [0, 0, Math.PI / 2], 12), DARK, 'matte'),
    ],
  }),
  block: (c, _color, label = 'A') => {
    const s = 0.04;
    const tex = glyphTex(label, c, null);
    return {
      parts: [P(box(s, s, s, [0, s / 2, 0]), WOOD, 'matte'), P(box(s * 1.02, s * 0.06, s * 1.02, [0, s - 0.0012, 0]), c, 'matte')],
      decals: [
        decal(tex, s * 0.8, s * 0.8, [0, s + 0.0006, 0], [-Math.PI / 2, 0, 0]),
        decal(tex, s * 0.8, s * 0.8, [0, s / 2, s / 2 + 0.0006]),
        decal(tex, s * 0.8, s * 0.8, [s / 2 + 0.0006, s / 2, 0], [0, Math.PI / 2, 0]),
        decal(tex, s * 0.8, s * 0.8, [-s / 2 - 0.0006, s / 2, 0], [0, -Math.PI / 2, 0]),
        decal(tex, s * 0.8, s * 0.8, [0, s / 2, -s / 2 - 0.0006], [0, Math.PI, 0]),
      ],
    };
  },
  number: (c, _color, label = '1') => {
    const s = 0.038;
    const tex = glyphTex(label, WHITE, null);
    return {
      parts: [P(box(s, s, s, [0, s / 2, 0]), c)],
      decals: [
        decal(tex, s * 0.82, s * 0.82, [0, s + 0.0006, 0], [-Math.PI / 2, 0, 0]),
        decal(tex, s * 0.82, s * 0.82, [0, s / 2, s / 2 + 0.0006]),
        decal(tex, s * 0.82, s * 0.82, [s / 2 + 0.0006, s / 2, 0], [0, Math.PI / 2, 0]),
        decal(tex, s * 0.82, s * 0.82, [-s / 2 - 0.0006, s / 2, 0], [0, -Math.PI / 2, 0]),
        decal(tex, s * 0.82, s * 0.82, [0, s / 2, -s / 2 - 0.0006], [0, Math.PI, 0]),
      ],
    };
  },
  ball: c => ({
    parts: [P(sph(0.022, [0, 0.022, 0], undefined, 18), c), P(torus(0.0222, 0.0022, [0, 0.022, 0], [0.4, 0, 0.2]), WHITE)],
  }),
  car: c => ({
    parts: [
      P(box(0.072, 0.014, 0.032, [0, 0.013, 0]), c),
      P(box(0.034, 0.012, 0.028, [-0.006, 0.026, 0]), c),
      P(box(0.035, 0.009, 0.0285, [-0.006, 0.026, 0]), '#2a3a4a', 'glass'),
      P(cyl(0.0075, 0.0075, 0.006, [0.022, 0.0075, 0.016], [Math.PI / 2, 0, 0], 14), DARK, 'matte'),
      P(cyl(0.0075, 0.0075, 0.006, [-0.022, 0.0075, 0.016], [Math.PI / 2, 0, 0], 14), DARK, 'matte'),
      P(cyl(0.0075, 0.0075, 0.006, [0.022, 0.0075, -0.016], [Math.PI / 2, 0, 0], 14), DARK, 'matte'),
      P(cyl(0.0075, 0.0075, 0.006, [-0.022, 0.0075, -0.016], [Math.PI / 2, 0, 0], 14), DARK, 'matte'),
      P(box(0.002, 0.004, 0.006, [0.036, 0.016, 0.01]), '#fff6c2'),
      P(box(0.002, 0.004, 0.006, [0.036, 0.016, -0.01]), '#fff6c2'),
    ],
  }),
  duck: c => ({
    parts: [
      P(sph(0.024, [0, 0.019, 0], [1.25, 0.8, 1]), c),
      P(sph(0.014, [0.016, 0.042, 0]), c),
      P(cone(0.006, 0.014, [0.034, 0.04, 0], [0, 0, -Math.PI / 2]), '#f28c28'),
      P(sph(0.0025, [0.026, 0.047, 0.007]), DARK),
      P(sph(0.0025, [0.026, 0.047, -0.007]), DARK),
      P(cone(0.01, 0.016, [-0.03, 0.03, 0], [0, 0, 1.0]), c),
    ],
  }),
  robot: (c, color) => {
    const f: Finish = color === 'silver' ? 'metal' : 'plastic';
    return {
      parts: [
        P(box(0.008, 0.014, 0.01, [-0.008, 0.007, 0]), DARK, 'matte'),
        P(box(0.008, 0.014, 0.01, [0.008, 0.007, 0]), DARK, 'matte'),
        P(box(0.032, 0.032, 0.022, [0, 0.03, 0]), c, f),
        P(box(0.026, 0.022, 0.02, [0, 0.058, 0]), c, f),
        P(sph(0.0035, [-0.006, 0.06, 0.0105]), '#ffe14a'),
        P(sph(0.0035, [0.006, 0.06, 0.0105]), '#ffe14a'),
        P(box(0.012, 0.002, 0.001, [0, 0.052, 0.0105]), DARK),
        P(cyl(0.0008, 0.0008, 0.012, [-0.008, 0.074, 0]), '#999'),
        P(cyl(0.0008, 0.0008, 0.012, [0.008, 0.074, 0]), '#999'),
        P(sph(0.0025, [-0.008, 0.081, 0]), '#d7263d'),
        P(sph(0.0025, [0.008, 0.081, 0]), '#d7263d'),
        P(cyl(0.003, 0.003, 0.022, [-0.02, 0.03, 0], [0, 0, 0.25]), c, f),
        P(cyl(0.003, 0.003, 0.022, [0.02, 0.03, 0], [0, 0, -0.25]), c, f),
        P(box(0.012, 0.012, 0.012, [0, 0.03, 0.011]), '#2f6fd6'),
        P(torus(0.005, 0.0012, [0, 0.032, -0.014], [0, 0, 0]), SKIN_GOLD, 'metal'),
      ],
    };
  },
  cube: () => {
    const s = 0.042;
    const parts: Part[] = [P(box(s, s, s, [0, s / 2, 0]), '#141414')];
    const faceColors = ['#f3efe6', '#f6d32d', '#d7263d', '#f28c28', '#2f6fd6', '#3fa34d'];
    const t = s / 3;
    const st = t * 0.86;
    const faces: { color: string; at: (u: number, v: number) => V3; rot: V3 }[] = [
      { color: faceColors[0], at: (u, v) => [u * t, s + 0.0005, v * t], rot: [0, 0, 0] },
      { color: faceColors[2], at: (u, v) => [u * t, s / 2 + v * t, s / 2 + 0.0005], rot: [Math.PI / 2, 0, 0] },
      { color: faceColors[3], at: (u, v) => [u * t, s / 2 + v * t, -s / 2 - 0.0005], rot: [Math.PI / 2, 0, 0] },
      { color: faceColors[4], at: (u, v) => [s / 2 + 0.0005, s / 2 + v * t, u * t], rot: [0, 0, Math.PI / 2] },
      { color: faceColors[5], at: (u, v) => [-s / 2 - 0.0005, s / 2 + v * t, u * t], rot: [0, 0, Math.PI / 2] },
    ];
    for (const f of faces) for (let u = -1; u <= 1; u++) for (let v = -1; v <= 1; v++) parts.push(P(box(st, 0.0012, st, f.at(u, v), f.rot), f.color));
    return { parts };
  },
  tamagotchi: c => ({
    parts: [
      P(lathe(eggProfile(0.046, 0.052), [0, 0, 0], [0, 0, 0]), c),
      P(sph(0.0028, [-0.009, 0.012, 0.019]), '#f6d32d'),
      P(sph(0.0028, [0, 0.01, 0.0205]), '#f6d32d'),
      P(sph(0.0028, [0.009, 0.012, 0.019]), '#f6d32d'),
      P(torus(0.005, 0.0015, [0, 0.054, 0], [Math.PI / 2, 0, 0]), DARK),
    ],
    decals: [decal(screenTex('tama'), 0.02, 0.016, [0, 0.028, 0.0215], [-0.12, 0, 0])],
  }),
  etch: c => ({
    parts: [
      P(box(0.11, 0.018, 0.085, [0, 0.009, 0]), c),
      P(cyl(0.007, 0.007, 0.006, [-0.045, 0.02, 0.032]), WHITE),
      P(cyl(0.007, 0.007, 0.006, [0.045, 0.02, 0.032]), WHITE),
    ],
    decals: [decal(screenTex('etch'), 0.078, 0.052, [0, 0.0186, -0.006], [-Math.PI / 2, 0, 0])],
  }),
  jumprope: c => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.07, 0.003, -0.03),
      new THREE.Vector3(-0.03, 0.003, 0.04),
      new THREE.Vector3(0.02, 0.003, -0.02),
      new THREE.Vector3(0.05, 0.003, 0.05),
      new THREE.Vector3(0.08, 0.003, 0.0),
    ]);
    return {
      parts: [
        P(new THREE.TubeGeometry(curve, 40, 0.0025, 6, false), c, 'matte'),
        P(cyl(0.005, 0.0045, 0.03, [-0.085, 0.005, -0.045], [Math.PI / 2, 0.8, 0]), WOOD, 'matte'),
        P(cyl(0.005, 0.0045, 0.03, [0.095, 0.005, -0.01], [Math.PI / 2, -0.5, 0]), WOOD, 'matte'),
      ],
    };
  },
  top: c => ({
    parts: [
      P(cone(0.022, 0.024, [0, 0.012, 0], [Math.PI, 0, 0], 18), c),
      P(cyl(0.022, 0.022, 0.006, [0, 0.027, 0], undefined, 18), c),
      P(cyl(0.0225, 0.0225, 0.002, [0, 0.025, 0], undefined, 18), WHITE),
      P(cyl(0.003, 0.003, 0.016, [0, 0.036, 0]), WOOD),
    ],
  }),
  jack: (c, color) => {
    const f = FINISH_FOR[color] ?? 'plastic';
    const L = 0.024;
    const y = 0.013;
    return {
      parts: [
        P(cyl(0.0016, 0.0016, L, [0, y, 0]), c, f),
        P(cyl(0.0016, 0.0016, L, [0, y, 0], [Math.PI / 2, 0, 0]), c, f),
        P(cyl(0.0016, 0.0016, L, [0, y, 0], [0, 0, Math.PI / 2]), c, f),
        ...([[0, L / 2, 0], [0, -L / 2, 0], [L / 2, 0, 0], [-L / 2, 0, 0], [0, 0, L / 2], [0, 0, -L / 2]] as V3[]).map(([x, yy, z]) =>
          P(sph(0.0028, [x, y + yy, z], undefined, 8), c, f),
        ),
      ],
    };
  },
  domino: (c, color) => {
    const ink = color === 'white' ? DARK : WHITE;
    const parts: Part[] = [P(box(0.024, 0.008, 0.048, [0, 0.004, 0]), c), P(box(0.018, 0.0008, 0.0015, [0, 0.0082, 0]), ink)];
    const dot = (x: number, z: number) => P(cyl(0.0022, 0.0022, 0.0008, [x, 0.0083, z], undefined, 10), ink);
    parts.push(dot(-0.006, -0.018), dot(0.006, -0.006), dot(0, -0.012));
    parts.push(dot(-0.006, 0.006), dot(0.006, 0.006), dot(-0.006, 0.018), dot(0.006, 0.018));
    return { parts };
  },
  button: c => ({
    parts: [
      P(cyl(0.013, 0.013, 0.004, [0, 0.002, 0], undefined, 20), c),
      P(torus(0.011, 0.0012, [0, 0.004, 0], [Math.PI / 2, 0, 0]), c),
      ...([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([u, v]) => P(cyl(0.0018, 0.0018, 0.0006, [u * 0.0035, 0.0042, v * 0.0035], undefined, 8), DARK)),
    ],
  }),
  key: c => ({
    parts: [
      P(torus(0.008, 0.0025, [-0.02, 0.0025, 0], [Math.PI / 2, 0, 0]), c, 'metal'),
      P(box(0.032, 0.004, 0.005, [0.004, 0.0025, 0]), c, 'metal'),
      P(box(0.004, 0.004, 0.006, [0.014, 0.0025, 0.005]), c, 'metal'),
      P(box(0.004, 0.004, 0.004, [0.019, 0.0025, 0.004]), c, 'metal'),
    ],
  }),
  coin: c => ({
    parts: [P(cyl(0.012, 0.012, 0.0022, [0, 0.0011, 0], undefined, 24), c, 'metal'), P(torus(0.011, 0.0008, [0, 0.0022, 0], [Math.PI / 2, 0, 0]), c, 'metal')],
  }),
  star: (c, color) => ({
    parts: [P(extrude(starShape(0.028, 0.012), 0.007, [0, 0.0055, 0], [-Math.PI / 2, 0, 0]), c, FINISH_FOR[color])],
  }),
  heart: c => ({
    parts: [P(extrude(heartShape(0.05), 0.012, [0, 0.023, 0]), c), P(box(0.02, 0.003, 0.014, [0, 0.0015, 0]), c)],
  }),
  egg: c => ({ parts: [P(lathe(eggProfile(0.032, 0.042), [-0.021, 0.016, 0], [0, 0, -Math.PI / 2 + 0.15]), c, 'matte')] }),
  cake: c => {
    const wedge = new THREE.Shape();
    wedge.moveTo(0, 0);
    wedge.lineTo(0.06, -0.018);
    wedge.lineTo(0.06, 0.018);
    wedge.lineTo(0, 0);
    const layer = (y: number, h: number, color: string) => {
      const g = new THREE.ExtrudeGeometry(wedge, { depth: h, bevelEnabled: false });
      return P(place(g, [-0.03, y, 0], [Math.PI / 2, 0, 0]), color, 'matte');
    };
    return {
      parts: [
        layer(0.011, 0.011, '#f2d49a'),
        layer(0.014, 0.003, c),
        layer(0.025, 0.011, '#f2d49a'),
        layer(0.03, 0.005, c),
        P(sph(0.0055, [0.018, 0.035, 0]), '#c8102e'),
        P(cyl(0.0006, 0.0006, 0.01, [0.02, 0.043, 0], [0, 0, -0.4]), '#3f6f2a'),
      ],
    };
  },
  cupcake: c => ({
    parts: [
      P(cyl(0.017, 0.012, 0.02, [0, 0.01, 0], undefined, 16), '#efe6d6', 'matte'),
      P(sph(0.017, [0, 0.023, 0], [1, 0.7, 1]), c, 'matte'),
      P(cone(0.011, 0.016, [0, 0.036, 0]), c, 'matte'),
      P(sph(0.0045, [0, 0.046, 0]), '#c8102e'),
    ],
  }),
  lollipop: c => ({
    parts: [
      P(cyl(0.017, 0.017, 0.006, [0.022, 0.003, 0], undefined, 22), c, 'glass'),
      P(torus(0.009, 0.0018, [0.022, 0.0062, 0], [Math.PI / 2, 0, 0]), WHITE, 'glass'),
      P(cyl(0.0018, 0.0018, 0.05, [-0.018, 0.0025, 0], [0, 0, Math.PI / 2]), WHITE, 'matte'),
    ],
  }),
  candy: c => ({
    parts: [
      P(sph(0.011, [0, 0.009, 0], [1.4, 0.8, 0.9]), c, 'glass'),
      P(cone(0.008, 0.012, [0.021, 0.009, 0], [0, 0, Math.PI / 2], 8), c, 'glass'),
      P(cone(0.008, 0.012, [-0.021, 0.009, 0], [0, 0, -Math.PI / 2], 8), c, 'glass'),
    ],
  }),
  cherry: c => ({
    parts: [
      P(sph(0.0085, [-0.006, 0.0085, 0]), c, 'glass'),
      P(sph(0.0085, [0.008, 0.0085, 0.004]), c, 'glass'),
      P(cyl(0.0008, 0.0008, 0.024, [-0.002, 0.024, 0], [0, 0, 0.35]), '#4c7a2c', 'matte'),
      P(cyl(0.0008, 0.0008, 0.024, [0.005, 0.024, 0.002], [0, 0, -0.3]), '#4c7a2c', 'matte'),
    ],
  }),
  eightball: () => ({
    parts: [P(sph(0.028, [0, 0.028, 0], undefined, 22), '#0e0e12', 'glass')],
    decals: [decal(eightTex(), 0.026, 0.026, [0, 0.042, 0.0235], [-0.55, 0, 0])],
  }),
  crown: c => {
    const parts: Part[] = [P(place(new THREE.CylinderGeometry(0.022, 0.022, 0.016, 20, 1, true), [0, 0.008, 0]), c, 'metal')];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      parts.push(P(cone(0.0055, 0.014, [Math.cos(a) * 0.021, 0.023, Math.sin(a) * 0.021], undefined, 6), c, 'metal'));
      parts.push(P(sph(0.0028, [Math.cos(a + 0.6) * 0.0225, 0.008, Math.sin(a + 0.6) * 0.0225]), i % 2 ? '#d7263d' : '#2f6fd6', 'glass'));
    }
    return { parts };
  },
  rocket: (c, color) => ({
    parts: [
      P(cyl(0.011, 0.011, 0.05, [0, 0.033, 0], undefined, 16), c, color === 'white' ? 'plastic' : 'plastic'),
      P(cone(0.011, 0.02, [0, 0.068, 0], undefined, 16), color === 'red' ? WHITE : '#d7263d'),
      P(sph(0.0045, [0, 0.042, 0.0098], [1, 1, 0.5]), '#7fd0ff', 'glass'),
      ...[0, 1, 2].map(i => P(box(0.0015, 0.016, 0.012, [Math.cos((i / 3) * Math.PI * 2) * 0.012, 0.012, Math.sin((i / 3) * Math.PI * 2) * 0.012], [0, -(i / 3) * Math.PI * 2, 0]), color === 'red' ? WHITE : '#d7263d')),
      P(cone(0.007, 0.008, [0, 0.004, 0], [Math.PI, 0, 0], 10), '#666', 'metal'),
    ],
  }),
  pencil: c => ({
    parts: [
      P(cyl(0.005, 0.005, 0.07, [0, 0.005, 0], [0, 0, Math.PI / 2], 6), c, 'matte'),
      P(cone(0.005, 0.014, [0.042, 0.005, 0], [0, 0, -Math.PI / 2], 6), '#eac79a', 'matte'),
      P(cone(0.0018, 0.0052, [0.0471, 0.005, 0], [0, 0, -Math.PI / 2], 6), DARK, 'matte'),
      P(cyl(0.0053, 0.0053, 0.006, [-0.038, 0.005, 0], [0, 0, Math.PI / 2], 10), '#c0c4c8', 'metal'),
      P(cyl(0.005, 0.005, 0.007, [-0.0445, 0.005, 0], [0, 0, Math.PI / 2], 10), '#f48fb1', 'matte'),
    ],
  }),
  spool: c => ({
    parts: [
      P(cyl(0.015, 0.015, 0.004, [0, 0.002, 0], undefined, 18), WOOD, 'matte'),
      P(cyl(0.012, 0.012, 0.024, [0, 0.016, 0], undefined, 18), c, 'matte'),
      P(cyl(0.015, 0.015, 0.004, [0, 0.03, 0], undefined, 18), WOOD, 'matte'),
    ],
  }),
  thimble: c => ({
    parts: [P(cyl(0.0075, 0.009, 0.016, [0, 0.008, 0], undefined, 16), c, 'metal'), P(sph(0.0075, [0, 0.016, 0], [1, 0.5, 1]), c, 'metal')],
  }),
  bell: c => ({
    parts: [
      P(sph(0.016, [0, 0.016, 0], undefined, 16), c, 'metal'),
      P(box(0.024, 0.002, 0.004, [0, 0.009, 0.013]), DARK),
      P(torus(0.005, 0.0015, [0, 0.034, 0]), c, 'metal'),
    ],
  }),
  shell: c => {
    const parts: Part[] = [P(place(new THREE.SphereGeometry(0.024, 18, 8, 0, Math.PI, 0, Math.PI / 2), [0, 0.001, -0.004], undefined, [1, 0.45, 1]), c, 'matte')];
    for (let i = 1; i < 6; i++) {
      const a = (i / 6) * Math.PI;
      parts.push(P(box(0.0015, 0.0025, 0.022, [Math.cos(a) * 0.011, 0.007, -0.004 + Math.sin(a) * 0.011], [0, -a + Math.PI / 2, 0]), '#e8d0c0', 'matte'));
    }
    parts.push(P(box(0.012, 0.004, 0.006, [0, 0.002, -0.006]), c, 'matte'));
    return { parts };
  },
  fish: c => ({
    parts: [
      P(sph(0.018, [0, 0.016, 0], [1.6, 0.9, 0.55]), c),
      P(cone(0.012, 0.016, [-0.034, 0.016, 0], [0, 0, Math.PI / 2], 3), c),
      P(sph(0.003, [0.019, 0.02, 0.0085]), DARK),
      P(sph(0.003, [0.019, 0.02, -0.0085]), DARK),
    ],
  }),
  apple: c => ({
    parts: [
      P(sph(0.022, [0, 0.02, 0], [1, 0.9, 1]), c, 'glass'),
      P(cyl(0.0012, 0.0012, 0.01, [0, 0.042, 0], [0, 0, 0.2]), '#6b4226', 'matte'),
      P(sph(0.006, [0.006, 0.043, 0], [1.4, 0.3, 0.7]), '#3fa34d', 'matte'),
    ],
  }),
  mushroom: c => {
    const parts: Part[] = [
      P(cyl(0.007, 0.009, 0.018, [0, 0.009, 0], undefined, 12), WHITE, 'matte'),
      P(place(new THREE.SphereGeometry(0.02, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0.016, 0], undefined, [1, 0.75, 1]), c),
    ];
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3;
      parts.push(P(sph(0.0028, [Math.cos(a) * 0.011, 0.0285 - (i % 2) * 0.002, Math.sin(a) * 0.011], [1, 0.4, 1], 8), WHITE, 'matte'));
    }
    return { parts };
  },
  pumpkin: c => {
    const parts: Part[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      parts.push(P(sph(0.013, [Math.cos(a) * 0.011, 0.016, Math.sin(a) * 0.011], [0.8, 1.1, 0.8], 12), c, 'matte'));
    }
    parts.push(P(cyl(0.0025, 0.003, 0.012, [0, 0.034, 0], [0, 0, 0.2], 8), '#3f6f2a', 'matte'));
    return { parts };
  },
  ghost: c => ({
    parts: [
      P(lathe([[0.0, 0.05], [0.012, 0.047], [0.018, 0.038], [0.019, 0.02], [0.022, 0.006], [0.025, 0.0], [0.0, 0.0]]), c, 'matte'),
      P(sph(0.003, [-0.006, 0.036, 0.017], [1, 1.5, 0.5]), DARK),
      P(sph(0.003, [0.006, 0.036, 0.017], [1, 1.5, 0.5]), DARK),
      P(sph(0.003, [0, 0.027, 0.018], [1.2, 1, 0.5]), DARK),
    ],
  }),
  bat: c => {
    const wing = new THREE.Shape();
    wing.moveTo(0, 0);
    wing.quadraticCurveTo(0.02, 0.016, 0.04, 0.01);
    wing.lineTo(0.034, 0.0);
    wing.lineTo(0.028, 0.006);
    wing.lineTo(0.022, -0.002);
    wing.lineTo(0.016, 0.004);
    wing.lineTo(0.008, -0.004);
    wing.lineTo(0, 0);
    return {
      parts: [
        P(sph(0.008, [0, 0.008, 0], [1, 0.8, 1.4]), c),
        P(extrude(wing, 0.002, [0.004, 0.004, 0], [-Math.PI / 2, 0, 0], 0), c),
        P(extrude(wing, 0.002, [-0.004, 0.004, 0], [-Math.PI / 2, Math.PI, 0], 0), c),
        P(cone(0.0025, 0.006, [-0.004, 0.0065, 0.011]), c),
        P(cone(0.0025, 0.006, [0.004, 0.0065, 0.011]), c),
        P(sph(0.0014, [-0.003, 0.011, 0.009]), '#ffe14a'),
        P(sph(0.0014, [0.003, 0.011, 0.009]), '#ffe14a'),
      ],
    };
  },
  moon: (c, color) => {
    const s = new THREE.Shape();
    s.absarc(0, 0, 0.026, Math.PI * 0.25, Math.PI * 1.75, false);
    s.absarc(0.012, 0, 0.02, Math.PI * 1.6, Math.PI * 0.4, true);
    return { parts: [P(extrude(s, 0.008, [0, 0.026, 0]), c, FINISH_FOR[color]), P(box(0.02, 0.003, 0.012, [-0.012, 0.0015, 0]), c, FINISH_FOR[color])] };
  },
  gem: c => ({
    parts: [P(cone(0.014, 0.008, [0, 0.016, 0], undefined, 8), c, 'glass'), P(cone(0.014, 0.012, [0, 0.006, 0], [Math.PI, 0, 0], 8), c, 'glass')],
  }),
  compass: c => ({
    parts: [
      P(cyl(0.022, 0.022, 0.008, [0, 0.004, 0], undefined, 24), c, 'metal'),
      P(cyl(0.019, 0.019, 0.0005, [0, 0.0083, 0], undefined, 24), WHITE, 'matte'),
      P(box(0.003, 0.0008, 0.026, [0, 0.009, 0], [0, 0.5, 0]), '#d7263d'),
      P(torus(0.005, 0.0016, [0, 0.004, -0.026], [0, 0, 0]), c, 'metal'),
    ],
  }),
  anchor: c => ({
    parts: [
      P(box(0.005, 0.004, 0.05, [0, 0.0025, 0]), c, 'metal'),
      P(torus(0.006, 0.0018, [0, 0.0025, -0.029], [Math.PI / 2, 0, 0]), c, 'metal'),
      P(box(0.028, 0.004, 0.004, [0, 0.0025, -0.014]), c, 'metal'),
      P(torus(0.02, 0.0025, [0, 0.0025, 0.006], [Math.PI / 2, 0, Math.PI * 0.08], Math.PI * 0.84), c, 'metal'),
      P(cone(0.005, 0.008, [0.02, 0.0025, 0.004], [Math.PI / 2, 0, -0.4], 6), c, 'metal'),
      P(cone(0.005, 0.008, [-0.02, 0.0025, 0.004], [Math.PI / 2, 0, 0.4], 6), c, 'metal'),
    ],
  }),
  boat: c => {
    const sail = new THREE.Shape();
    sail.moveTo(0, 0);
    sail.lineTo(0.026, 0);
    sail.lineTo(0, 0.04);
    sail.lineTo(0, 0);
    return {
      parts: [
        P(place(new THREE.CylinderGeometry(0.03, 0.022, 0.014, 4, 1), [0, 0.007, 0], [0, Math.PI / 4, 0], [1.6, 1, 0.55]), c),
        P(cyl(0.0012, 0.0012, 0.05, [0, 0.038, 0]), WOOD, 'matte'),
        P(extrude(sail, 0.0012, [0.002, 0.018, 0], undefined, 0), WHITE, 'matte'),
      ],
    };
  },
  whistle: (c, color) => ({
    parts: [
      P(cyl(0.01, 0.01, 0.018, [0, 0.01, 0], [Math.PI / 2, 0, 0], 16), c, FINISH_FOR[color]),
      P(box(0.012, 0.008, 0.02, [0, 0.008, 0.018]), c, FINISH_FOR[color]),
      P(torus(0.005, 0.0013, [0, 0.01, -0.013], [0, Math.PI / 2, 0]), '#c0c4c8', 'metal'),
    ],
  }),
  libraryBook: c => ({
    parts: [
      P(box(0.072, 0.003, 0.094, [0, 0.0015, 0]), c, 'matte'),
      P(box(0.068, 0.011, 0.09, [0.002, 0.0085, 0]), '#efe6cf', 'matte'),
      P(box(0.072, 0.003, 0.094, [0, 0.0155, 0]), c, 'matte'),
      P(box(0.004, 0.017, 0.094, [-0.036, 0.0085, 0]), c, 'matte'),
      P(box(0.0012, 0.008, 0.012, [-0.0382, 0.0085, 0.03]), WHITE, 'matte'),
    ],
    decals: [decal(libraryTex(), 0.068, 0.068, [0.001, 0.0172, 0], [-Math.PI / 2, 0, 0])],
  }),
};

const cache = new Map<string, ToyMesh>();

function bake(parts: Part[]) {
  const byFinish = new Map<Finish, THREE.BufferGeometry[]>();
  const color = new THREE.Color();
  for (const part of parts) {
    let geo = part.geo.index ? part.geo.toNonIndexed() : part.geo;
    // mergeGeometries wants the same attributes on every piece.
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal') geo.deleteAttribute(name);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    color.set(part.color).convertSRGBToLinear();
    const n = geo.attributes.position.count;
    const cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) cols.set([color.r, color.g, color.b], i * 3);
    geo = geo.clone();
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const finish = part.finish ?? 'plastic';
    const list = byFinish.get(finish) ?? [];
    list.push(geo);
    byFinish.set(finish, list);
    part.geo.dispose();
  }
  const layers: ToyMesh['layers'] = [];
  for (const [finish, list] of byFinish) {
    const merged = mergeGeometries(list, false);
    list.forEach(g => g.dispose());
    if (merged) {
      merged.computeBoundingSphere();
      layers.push({ finish, geo: merged });
    }
  }
  return layers;
}

/** The toy's meshes, built once per kind, colour and label. */
export function toyMesh(kind: KindId, color: ColorName, label?: string): ToyMesh {
  const key = `${kind}:${color}:${label ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const built = BUILD[kind](COLORS[color], color, label);
  const layers = bake(built.parts);
  const bounds = new THREE.Box3();
  for (const l of layers) {
    l.geo.computeBoundingBox();
    bounds.union(l.geo.boundingBox!);
  }
  const toy: ToyMesh = {
    layers,
    decals: built.decals ?? [],
    size: bounds.getSize(new THREE.Vector3()),
    center: bounds.getCenter(new THREE.Vector3()),
  };
  cache.set(key, toy);
  return toy;
}

/** A ready Object3D for one toy: meshes centred so it can be tipped over. */
export function makeToy(kind: KindId, color: ColorName, label: string | undefined, tip: number) {
  const toy = toyMesh(kind, color, label);
  const inner = new THREE.Group();
  for (const l of toy.layers) {
    const mesh = new THREE.Mesh(l.geo, MATERIALS[l.finish]);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    inner.add(mesh);
  }
  for (const d of toy.decals) inner.add(new THREE.Mesh(d.geo, decalMaterial(d.tex)));
  inner.position.set(-toy.center.x, -toy.center.y, -toy.center.z);
  const tipGroup = new THREE.Group();
  tipGroup.add(inner);
  tipGroup.rotation.x = tip;
  // Resting height: half the toy's height, or half its depth once it's on its side.
  tipGroup.position.y = tip === 0 ? toy.size.y / 2 : toy.size.z / 2;
  return { object: tipGroup, toy };
}
