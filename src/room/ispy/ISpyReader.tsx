import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fitFov, isTouchDevice } from '../input';
import { BEANBAG_SEAT } from '../roomLayout';
import { carpetTexture } from './carpet';
import { makeToy } from './items';
import { ispySfx, wakeISpyAudio } from './ispyAudio';
import { BOOK_PAGES, PAGE_AREA, toyPagePuzzle, type BookPage, type Spot } from './pages';
import { rng } from './puzzle';

/**
 * Book mode: sit in the bean bag with the I Spy book open in your lap.
 * The left page has the riddle as a checklist, the right page the picture.
 * Click something in the picture and it gets circled in pink pen (like the
 * library copy everyone already wrote in) and crossed off the list. Turn
 * the pages with the arrows. The photo pages come first, then pages shot
 * from the toy box, always the same ones.
 */

const PAGE_W = 0.2;
const PAGE_H = 0.26;
const CANVAS_W = 768;
const CANVAS_H = Math.round((CANVAS_W * PAGE_H) / PAGE_W);
const MARGIN = 26;

export const reader = {
  page: 0,
  /** Found spots per page, with when they were circled. */
  found: new Map<number, Map<number, number>>(),
  hint: null as null | { page: number; spot: number; until: number },
  turning: 0 as -1 | 0 | 1,
  ready: false,
  toast: null as null | { text: string; until: number },
  listeners: new Set<() => void>(),
};

function emit() {
  reader.listeners.forEach(fn => fn());
}

export function useReader() {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump(n => n + 1);
    reader.listeners.add(fn);
    return () => {
      reader.listeners.delete(fn);
    };
  }, []);
  return reader;
}

const controls = { turn: null as null | ((dir: -1 | 1) => void), hint: null as null | (() => void) };

function foundOn(page: number) {
  let m = reader.found.get(page);
  if (!m) {
    m = new Map();
    reader.found.set(page, m);
  }
  return m;
}

// ---------------------------------------------------------------------------
// Page pictures

interface Picture {
  image: CanvasImageSource;
  w: number;
  h: number;
  spots: Spot[];
  rhyme: string[];
}

const pictures = new Map<number, Picture>();
const loading = new Map<number, Promise<Picture>>();

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

const strikeImages: HTMLImageElement[] = [];
function strikes() {
  if (!strikeImages.length && typeof window !== 'undefined') {
    for (let i = 1; i <= 5; i++) {
      const img = new Image();
      img.src = `/ispy/strike-${i}.webp`;
      strikeImages.push(img);
    }
  }
  return strikeImages;
}

/** Shoot a toy page: the pile laid out on its carpet, photographed from above. */
function shootToyPage(gl: THREE.WebGLRenderer, page: Extract<BookPage, { kind: 'toys' }>): Picture {
  const puzzle = toyPagePuzzle(page);
  const scene = new THREE.Scene();
  const floorTex = carpetTexture(puzzle.theme.carpet, puzzle.seed);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_AREA.w * 1.3, PAGE_AREA.d * 1.3), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  for (const item of puzzle.items) {
    const { object } = makeToy(item.kind, item.color, item.label, item.tip);
    const root = new THREE.Group();
    root.add(object);
    root.position.set(item.x, 0, item.z);
    root.rotation.y = item.yaw;
    root.scale.setScalar(item.scale);
    scene.add(root);
  }
  scene.add(new THREE.HemisphereLight('#ffffff', '#806050', 1.1));
  const sun = new THREE.DirectionalLight('#fff4e0', 2.2);
  sun.position.set(-0.3, 1, 0.4);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(puzzle.theme.light, 0.5));
  const aspect = PAGE_AREA.w / PAGE_AREA.d;
  const h = Math.round(1100);
  const w = Math.round(h * aspect);
  const camera = new THREE.PerspectiveCamera(30, aspect, 0.05, 5);
  const dist = (PAGE_AREA.d * 0.5) / Math.tan(THREE.MathUtils.degToRad(15));
  camera.position.set(0, dist, 0.0001);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const prev = gl.getRenderTarget();
  gl.setRenderTarget(rt);
  gl.setClearColor('#000', 1);
  gl.clear();
  gl.render(scene, camera);
  const pixels = new Uint8Array(w * h * 4);
  gl.readRenderTargetPixels(rt, 0, 0, w, h, pixels);
  gl.setRenderTarget(prev);
  rt.dispose();
  floorTex.dispose();
  floor.geometry.dispose();
  (floor.material as THREE.Material).dispose();
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const data = ctx.createImageData(w, h);
  // GL rows run bottom-up.
  for (let y = 0; y < h; y++) data.data.set(pixels.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  ctx.putImageData(data, 0, 0);
  // Where each target landed in the picture.
  const v = new THREE.Vector3();
  const spots: Spot[] = puzzle.targets.map((id, i) => {
    const item = puzzle.items[id];
    v.set(item.x, 0.01, item.z).project(camera);
    const edge = new THREE.Vector3(item.x + item.radius * 1.4 + 0.006, 0.01, item.z).project(camera);
    return {
      label: puzzle.phrases[i],
      x: (v.x + 1) / 2,
      y: (1 - v.y) / 2,
      r: Math.max(0.03, Math.abs(edge.x - v.x) / 2),
    };
  });
  return { image: canvas, w, h, spots, rhyme: [puzzle.opener, `I spy... ${puzzle.closer}`] };
}

function getPicture(index: number, gl: THREE.WebGLRenderer): Promise<Picture> {
  const hit = pictures.get(index);
  if (hit) return Promise.resolve(hit);
  const busy = loading.get(index);
  if (busy) return busy;
  const page = BOOK_PAGES[index];
  const job =
    page.kind === 'photo'
      ? loadImage(page.src).then(img => ({ image: img, w: img.naturalWidth, h: img.naturalHeight, spots: page.spots, rhyme: page.rhyme }))
      : new Promise<Picture>(resolve => requestAnimationFrame(() => resolve(shootToyPage(gl, page))));
  const done = job.then(pic => {
    pictures.set(index, pic);
    return pic;
  });
  loading.set(index, done);
  return done;
}

/** Where the picture sits on the right page canvas (fit inside the margins). */
function fit(pic: Picture) {
  const s = Math.min((CANVAS_W - MARGIN * 2) / pic.w, (CANVAS_H - MARGIN * 2 - 40) / pic.h);
  const w = pic.w * s;
  const h = pic.h * s;
  return { x: (CANVAS_W - w) / 2, y: MARGIN + (CANVAS_H - MARGIN * 2 - 40 - h) / 2, w, h, s };
}

/** A wobbly pink pen circle, drawn up to `t` of the way round. */
function penCircle(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number, seed: number, color = '#ec5fa8', dashed = false) {
  const rand = rng(seed);
  const wob = [rand(), rand(), rand()];
  const start = rand() * Math.PI * 2;
  const turns = 1.15;
  const steps = 60;
  g.save();
  g.strokeStyle = color;
  g.lineWidth = Math.max(4, r * 0.09);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (dashed) g.setLineDash([10, 10]);
  g.beginPath();
  for (let i = 0; i <= steps * t; i++) {
    const a = start + (i / steps) * Math.PI * 2 * turns;
    const k = 1 + Math.sin(a * 2 + wob[0] * 6) * 0.06 + (i / steps) * 0.08;
    const x = cx + Math.cos(a) * r * k * (1.08 + wob[1] * 0.1);
    const y = cy + Math.sin(a) * r * k * (0.92 + wob[2] * 0.1);
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  g.restore();
}

function drawRight(g: CanvasRenderingContext2D, index: number, pic: Picture | undefined, now: number) {
  g.fillStyle = '#f4ecd8';
  g.fillRect(0, 0, CANVAS_W, CANVAS_H);
  g.fillStyle = '#6b4e2a';
  g.font = 'italic 22px Georgia, serif';
  g.textAlign = 'right';
  g.fillText(String(index * 2 + 3), CANVAS_W - MARGIN, CANVAS_H - 18);
  if (!pic) {
    g.textAlign = 'center';
    g.fillText('turning...', CANVAS_W / 2, CANVAS_H / 2);
    return;
  }
  const f = fit(pic);
  g.drawImage(pic.image, f.x, f.y, f.w, f.h);
  const found = foundOn(index);
  for (const [spot, at] of found) {
    const s = pic.spots[spot];
    const t = Math.min(1, (now - at) / 450);
    penCircle(g, f.x + s.x * f.w, f.y + s.y * f.h, s.r * f.w, t, index * 31 + spot * 7);
  }
  const h = reader.hint;
  if (h && h.page === index && now < h.until && !found.has(h.spot)) {
    const s = pic.spots[h.spot];
    const pulse = 1 + Math.sin(now / 120) * 0.08;
    penCircle(g, f.x + s.x * f.w, f.y + s.y * f.h, s.r * f.w * 1.6 * pulse, 1, 99, 'rgba(255,214,64,0.95)', true);
  }
}

function wrapText(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxW && line) {
      g.fillText(line, x, y);
      y += lh;
      line = w;
    } else line = test;
  }
  if (line) g.fillText(line, x, y);
  return y + lh;
}

function drawLeft(g: CanvasRenderingContext2D, index: number, pic: Picture | undefined, now: number) {
  const page = BOOK_PAGES[index];
  g.fillStyle = '#f4ecd8';
  g.fillRect(0, 0, CANVAS_W, CANVAS_H);
  g.fillStyle = '#6b4e2a';
  g.font = 'italic 22px Georgia, serif';
  g.textAlign = 'left';
  g.fillText(String(index * 2 + 2), MARGIN, CANVAS_H - 18);
  g.fillStyle = '#16131c';
  g.font = '900 52px Georgia, serif';
  g.fillText('I SPY', MARGIN + 6, 84);
  g.font = '700 30px Georgia, serif';
  g.fillStyle = '#c0201a';
  g.fillText(page.title, MARGIN + 6, 128);
  if (!pic) return;
  g.fillStyle = '#3a2a1a';
  g.font = 'italic 26px Georgia, serif';
  let y = 182;
  for (const line of pic.rhyme) y = wrapText(g, line, MARGIN + 6, y, CANVAS_W - MARGIN * 2 - 12, 34);
  y += 18;
  const found = foundOn(index);
  g.font = '700 30px Georgia, serif';
  const marks = strikes();
  pic.spots.forEach((s, i) => {
    const done = found.has(i);
    const boxY = y - 24;
    g.strokeStyle = '#6b4e2a';
    g.lineWidth = 3;
    g.strokeRect(MARGIN + 8, boxY, 26, 26);
    if (done) {
      g.strokeStyle = '#ec5fa8';
      g.lineWidth = 5;
      g.beginPath();
      g.moveTo(MARGIN + 12, boxY + 13);
      g.lineTo(MARGIN + 20, boxY + 22);
      g.lineTo(MARGIN + 34, boxY - 2);
      g.stroke();
    }
    g.fillStyle = done ? 'rgba(58,42,26,0.45)' : '#3a2a1a';
    const text = s.label;
    g.fillText(text, MARGIN + 50, y);
    if (done) {
      const w = g.measureText(text).width;
      const t = Math.min(1, (now - (found.get(i) ?? 0)) / 400);
      const img = marks[i % marks.length];
      if (img?.complete && img.naturalWidth) g.drawImage(img, 0, 0, img.naturalWidth * t, img.naturalHeight, MARGIN + 46, y - 20, (w + 8) * t, 18);
      else {
        g.strokeStyle = '#4aa8d8';
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(MARGIN + 46, y - 10);
        g.lineTo(MARGIN + 46 + (w + 8) * t, y - 12);
        g.stroke();
      }
    }
    y += 46;
  });
  y += 10;
  g.font = 'italic 22px Georgia, serif';
  g.fillStyle = '#6b4e2a';
  const all = found.size === pic.spots.length;
  g.fillText(all ? 'All found! Turn the page →' : `${found.size} of ${pic.spots.length} found`, MARGIN + 8, y);
}

// ---------------------------------------------------------------------------

function pageCanvas() {
  const c = document.createElement('canvas');
  c.width = CANVAS_W;
  c.height = CANVAS_H;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { canvas: c, ctx: c.getContext('2d')!, tex };
}

/** Where the book sits: in your lap, tipped up toward your eyes. */
const SEAT = new THREE.Vector3(...BEANBAG_SEAT.at);
const BOOK_POS = new THREE.Vector3(SEAT.x, SEAT.y - 0.2, SEAT.z - 0.25);
const BOOK_TILT = 0.98;
const EYE = new THREE.Vector3(SEAT.x, SEAT.y + 0.02, SEAT.z + 0.04);

export function ReaderScene() {
  const { camera, gl, size } = useThree();
  const left = useMemo(pageCanvas, []);
  const right = useMemo(pageCanvas, []);
  const flipFront = useMemo(pageCanvas, []);
  const flipBack = useMemo(pageCanvas, []);
  const rightMesh = useRef<THREE.Mesh>(null);
  const flipGroup = useRef<THREE.Group>(null);
  const glide = useRef({ t: 0, from: new THREE.Vector3(), look: new THREE.Vector3(), started: false });
  const saved = useRef<{ fov: number; near: number } | null>(null);
  const flip = useRef({ t: 0, dir: 0 as -1 | 0 | 1, to: 0 });
  const drag = useRef({ on: false, x: 0, y: 0, moved: 0, at: 0 });
  const look = useRef({ x: 0, y: 0 });
  const dirty = useRef(true);
  const busyUntil = useRef(0);

  useEffect(() => {
    reader.ready = false;
    reader.turning = 0;
    document.exitPointerLock?.();
    // Shoot the first pages ahead of time so flipping is instant.
    void getPicture(reader.page, gl).then(() => (dirty.current = true));
    void getPicture(Math.min(BOOK_PAGES.length - 1, reader.page + 1), gl);
    return () => {
      [left, right, flipFront, flipBack].forEach(p => p.tex.dispose());
      const persp = camera as THREE.PerspectiveCamera;
      if (saved.current) {
        persp.fov = saved.current.fov;
        persp.near = saved.current.near;
        persp.updateProjectionMatrix();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function turn(dir: -1 | 1) {
    const to = reader.page + dir;
    if (to < 0 || to >= BOOK_PAGES.length || flip.current.dir !== 0) return;
    const now = performance.now();
    void getPicture(to, gl).then(() => (dirty.current = true));
    void getPicture(Math.max(0, Math.min(BOOK_PAGES.length - 1, to + dir)), gl);
    // The sheet that turns: going forward it carries this right page over to
    // become the next left page; going back it brings the previous right page in.
    if (dir === 1) {
      drawRight(flipFront.ctx, reader.page, pictures.get(reader.page), now);
      drawLeft(flipBack.ctx, to, pictures.get(to), now);
    } else {
      drawLeft(flipBack.ctx, reader.page, pictures.get(reader.page), now);
      drawRight(flipFront.ctx, to, pictures.get(to), now);
    }
    flipFront.tex.needsUpdate = true;
    flipBack.tex.needsUpdate = true;
    flip.current = { t: 0, dir, to };
    reader.turning = dir;
    reader.page = to;
    reader.hint = null;
    ispySfx.pageTurn();
    dirty.current = true;
    emit();
  }

  function hint() {
    const pic = pictures.get(reader.page);
    if (!pic) return;
    const found = foundOn(reader.page);
    const next = pic.spots.findIndex((_, i) => !found.has(i));
    if (next < 0) return;
    reader.hint = { page: reader.page, spot: next, until: performance.now() + 2600 };
    ispySfx.hint();
    dirty.current = true;
    emit();
  }

  function tap(clientX: number, clientY: number) {
    const mesh = rightMesh.current;
    const pic = pictures.get(reader.page);
    if (!mesh || !pic || flip.current.dir !== 0) return;
    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(mesh, false)[0];
    if (!hit?.uv) {
      // Clicked the left page or the room: nothing to circle.
      return;
    }
    const f = fit(pic);
    const px = hit.uv.x * CANVAS_W;
    const py = (1 - hit.uv.y) * CANVAS_H;
    const ix = (px - f.x) / f.w;
    const iy = (py - f.y) / f.h;
    const found = foundOn(reader.page);
    let best = -1;
    let bestD = Infinity;
    pic.spots.forEach((s, i) => {
      const d = Math.hypot((ix - s.x) * f.w, (iy - s.y) * f.h) / f.w;
      if (d < s.r && d < bestD) {
        best = i;
        bestD = d;
      }
    });
    if (best >= 0 && !found.has(best)) {
      found.set(best, performance.now());
      busyUntil.current = performance.now() + 500;
      ispySfx.found();
      if (found.size === pic.spots.length) {
        window.setTimeout(() => ispySfx.done(), 350);
        reader.toast = { text: 'Page done! Turn the page', until: performance.now() + 2500 };
      } else reader.toast = { text: `I spy ${pic.spots[best].label}!`, until: performance.now() + 1500 };
    } else if (best < 0) {
      ispySfx.wrong();
      reader.toast = { text: 'Not on the list. Keep looking!', until: performance.now() + 1200 };
    }
    dirty.current = true;
    emit();
  }

  useEffect(() => {
    const typing = (e: KeyboardEvent) => Boolean((e.target as HTMLElement | null)?.closest('input, textarea, select'));
    const down = (e: KeyboardEvent) => {
      if (typing(e) || e.repeat) return;
      wakeISpyAudio();
      if (e.code === 'ArrowRight' || e.code === 'KeyD') turn(1);
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') turn(-1);
      if (e.code === 'KeyH') hint();
    };
    const pDown = (e: PointerEvent) => {
      if (!(e.target instanceof HTMLCanvasElement)) return;
      wakeISpyAudio();
      drag.current = { on: true, x: e.clientX, y: e.clientY, moved: 0, at: performance.now() };
    };
    const pMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d.on) return;
      d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.x, e.clientY - d.y));
      // Drag to glance around a little, like turning your head in the bean bag.
      look.current.x = THREE.MathUtils.clamp(look.current.x + e.movementX * 0.003, -0.6, 0.6);
      look.current.y = THREE.MathUtils.clamp(look.current.y - e.movementY * 0.003, -0.3, 0.5);
    };
    const pUp = (e: PointerEvent) => {
      const d = drag.current;
      if (!d.on) return;
      d.on = false;
      if (d.moved < 7 && performance.now() - d.at < 600) tap(e.clientX, e.clientY);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('pointerdown', pDown);
    window.addEventListener('pointermove', pMove);
    window.addEventListener('pointerup', pUp);
    controls.turn = turn;
    controls.hint = hint;
    if (import.meta.env.DEV) (window as unknown as { __ispyReader: unknown }).__ispyReader = { reader, turn, tap, pictures };
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('pointerdown', pDown);
      window.removeEventListener('pointermove', pMove);
      window.removeEventListener('pointerup', pUp);
      controls.turn = null;
      controls.hint = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const now = performance.now();
    const persp = camera as THREE.PerspectiveCamera;
    if (!saved.current) {
      saved.current = { fov: persp.fov, near: persp.near };
      glide.current.from.copy(camera.position);
      camera.getWorldDirection(glide.current.look);
      glide.current.look.multiplyScalar(1).add(camera.position);
    }
    // Sink into the bean bag.
    const g = glide.current;
    g.t = Math.min(1, g.t + dt / 1.5);
    const e = g.t * g.t * (3 - 2 * g.t);
    // Ease back toward the book when you let go.
    if (!drag.current.on) {
      look.current.x *= 1 - Math.min(1, dt * 1.5);
      look.current.y *= 1 - Math.min(1, dt * 1.5);
    }
    const target = new THREE.Vector3(BOOK_POS.x + look.current.x, BOOK_POS.y + 0.02 + look.current.y, BOOK_POS.z - look.current.y * 0.2);
    camera.position.lerpVectors(g.from, EYE, e);
    const lookAt = new THREE.Vector3().lerpVectors(g.look, target, e);
    camera.up.set(0, 1, 0);
    camera.lookAt(lookAt);
    const fov = fitFov(52, size.width / Math.max(1, size.height), 1.6, 100);
    if (Math.abs(persp.fov - fov) > 0.1 || persp.near !== 0.02) {
      persp.fov = fov;
      persp.near = 0.02;
      persp.updateProjectionMatrix();
    }
    if (!reader.ready && g.t >= 1) {
      reader.ready = true;
      emit();
    }

    // The turning sheet.
    const fl = flip.current;
    const sheet = flipGroup.current;
    if (fl.dir !== 0) {
      fl.t = Math.min(1, fl.t + dt / 0.7);
      const k = fl.t * fl.t * (3 - 2 * fl.t);
      if (sheet) {
        sheet.visible = true;
        // Forward: from lying on the right to lying on the left (0 → π about the spine).
        sheet.rotation.z = fl.dir === 1 ? k * Math.PI : (1 - k) * Math.PI;
        sheet.position.y = 0.004 + Math.sin(k * Math.PI) * 0.01;
      }
      if (fl.t >= 1) {
        fl.dir = 0;
        reader.turning = 0;
        if (sheet) sheet.visible = false;
        dirty.current = true;
        emit();
      }
    }

    // Redraw the pages while something is animating (pen circles, hints).
    const animating = now < busyUntil.current || (reader.hint !== null && now < reader.hint.until + 200) || fl.dir !== 0;
    if (dirty.current || animating) {
      dirty.current = false;
      const page = reader.page;
      // While turning forward the old left page stays until the sheet lands.
      const leftIdx = fl.dir === 1 ? page - 1 : page;
      const rightIdx = fl.dir === -1 ? page + 1 : page;
      drawLeft(left.ctx, leftIdx, pictures.get(leftIdx), now);
      drawRight(right.ctx, rightIdx, pictures.get(rightIdx), now);
      left.tex.needsUpdate = true;
      right.tex.needsUpdate = true;
    }
    if (reader.toast && now > reader.toast.until) {
      reader.toast = null;
      emit();
    }
  });

  return (
    <group position={BOOK_POS} rotation={[BOOK_TILT, 0, 0]}>
      {/* Covers under the pages */}
      <mesh position={[0, -0.006, 0]}>
        <boxGeometry args={[PAGE_W * 2 + 0.016, 0.004, PAGE_H + 0.014]} />
        <meshStandardMaterial color="#c52a22" roughness={0.6} />
      </mesh>
      <mesh position={[-PAGE_W / 2, -0.002, 0]}>
        <boxGeometry args={[PAGE_W - 0.004, 0.006, PAGE_H]} />
        <meshStandardMaterial color="#efe6cf" roughness={0.9} />
      </mesh>
      <mesh position={[PAGE_W / 2, -0.002, 0]}>
        <boxGeometry args={[PAGE_W - 0.004, 0.006, PAGE_H]} />
        <meshStandardMaterial color="#efe6cf" roughness={0.9} />
      </mesh>
      <mesh position={[-PAGE_W / 2, 0.0012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PAGE_W, PAGE_H]} />
        <meshBasicMaterial map={left.tex} color="#ebe4d6" toneMapped={false} />
      </mesh>
      <mesh ref={rightMesh} position={[PAGE_W / 2, 0.0012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[PAGE_W, PAGE_H]} />
        <meshBasicMaterial map={right.tex} color="#ebe4d6" toneMapped={false} />
      </mesh>
      {/* The page being turned, hinged on the spine. */}
      <group ref={flipGroup} visible={false}>
        <mesh position={[PAGE_W / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[PAGE_W, PAGE_H]} />
          <meshBasicMaterial map={flipFront.tex} color="#e2dbcc" toneMapped={false} />
        </mesh>
        <mesh position={[PAGE_W / 2, -0.0004, 0]} rotation={[Math.PI / 2, 0, Math.PI]}>
          <planeGeometry args={[PAGE_W, PAGE_H]} />
          <meshBasicMaterial map={flipBack.tex} color="#e2dbcc" toneMapped={false} />
        </mesh>
      </group>
      <pointLight position={[0, 0.3, 0.15]} color="#fff3dc" intensity={0.9} distance={1.2} decay={2} />
    </group>
  );
}

export function ReaderHud({ onExit }: { onExit: () => void }) {
  const r = useReader();
  const [isTouch] = useState(isTouchDevice);
  const btn = 'pointer-events-auto rounded-xl border border-white/25 bg-black/60 px-4 py-2 text-[12px] font-black uppercase tracking-wider text-white disabled:opacity-35';
  const found = foundOn(r.page).size;
  const pic = pictures.get(r.page);
  return (
    <div data-ispy="reading" className="pointer-events-none absolute inset-0 z-40 text-white">
      <div className="pointer-events-auto absolute left-4 top-4 flex gap-2">
        <button type="button" onClick={onExit} className="rounded-xl bg-white/90 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-black">
          Stand up
        </button>
        <button type="button" onClick={() => controls.hint?.()} className="rounded-xl border border-white/25 bg-black/55 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-200">
          Hint (H)
        </button>
      </div>
      {r.toast && (
        <p className="absolute left-1/2 top-[12%] -translate-x-1/2 whitespace-nowrap rounded-full bg-black/65 px-4 py-1.5 font-serif text-lg font-bold text-[#fff6c8]">{r.toast.text}</p>
      )}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3">
        <button type="button" className={btn} disabled={r.page === 0} onClick={() => controls.turn?.(-1)}>
          ◀ Back
        </button>
        <span className="rounded-full bg-black/60 px-4 py-1.5 font-serif text-sm">
          {BOOK_PAGES[r.page].title} · page {r.page + 1} of {BOOK_PAGES.length}
          {pic ? ` · ${found}/${pic.spots.length}` : ''}
        </span>
        <button type="button" className={btn} disabled={r.page === BOOK_PAGES.length - 1} onClick={() => controls.turn?.(1)}>
          Next ▶
        </button>
      </div>
      {!isTouch && (
        <p className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/60">
          Click a thing in the picture to circle it · ← → turn pages · drag to look up · H hint
        </p>
      )}
    </div>
  );
}
