import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Live DOM (a <video>, the guide, an emulator iframe) glued onto a surface in
 * the 3D scene with a CSS 3D transform — the same math as drei's
 * <Html transform>.
 *
 * It is split in two. <GlassSurface> lives in the page's normal React DOM
 * tree and owns the content. <GlassAnchor> lives in the canvas and only writes
 * the transform each frame. drei instead mounts a second React root from
 * inside the canvas, and when a sibling model suspends React tears that root
 * down mid-render and the glass goes blank.
 */

interface Nodes {
  root: HTMLDivElement;
  cam: HTMLDivElement;
  obj: HTMLDivElement;
}

const surfaces = new Map<string, Nodes>();

/**
 * Big screen: instead of riding the 3D surface, the glass is laid flat and
 * scaled to fill a rectangle of the page. It is the same DOM node either
 * way, so a show keeps playing and a game keeps running when you switch.
 */
export interface FlatRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
const flat = new Map<string, FlatRect>();

export function setGlassBig(id: string, rect: FlatRect | null) {
  if (rect) flat.set(id, rect);
  else flat.delete(id);
}

const eps = (v: number) => (Math.abs(v) < 1e-10 ? 0 : v);

/**
 * Writes a style only when it changed. The glass is placed every frame, and
 * re-writing the same transform still makes the browser restyle the layer;
 * with Windows or a show in it, that is work taken from the frame for nothing
 * whenever the camera is still.
 */
const written = new WeakMap<HTMLElement, Record<string, string>>();
function put(el: HTMLElement, key: 'transform' | 'perspective' | 'width' | 'height' | 'display' | 'background' | 'transformOrigin', value: string) {
  let rec = written.get(el);
  if (!rec) {
    rec = {};
    written.set(el, rec);
  }
  if (rec[key] === value) return;
  rec[key] = value;
  el.style[key] = value;
}

function cssMatrix(m: THREE.Matrix4, mul: number[], prepend = '') {
  let out = 'matrix3d(';
  for (let i = 0; i < 16; i += 1) out += eps(mul[i] * m.elements[i]) + (i !== 15 ? ',' : ')');
  return prepend + out;
}

/**
 * CSS pixels per metre for the 3D transforms. Scaling the whole world by the
 * same amount leaves the picture unchanged, but metres-as-pixels put a held
 * Game Boy's screen a fraction of a pixel from the eye, magnified thousands of
 * times: browsers lose precision there (soft, slightly off edges) and some
 * stop drawing the layer at all.
 */
const K = 1000;
const CAMERA_MUL = [1, -1, 1, 1, 1, -1, 1, 1, 1, -1, 1, 1, K, -K, K, 1];
const objectMul = (f: number) => {
  const s = K / f;
  return [s, s, s, 1, -s, -s, -s, -1, s, s, s, 1, K, K, K, 1];
};

/** DOM side. Render it as a sibling of the <Canvas>, inside the same positioned box. */
export function GlassSurface({ id, children, zIndex = 10 }: { id: string; children: React.ReactNode; zIndex?: number }) {
  const [nodes] = useState<Nodes>(() => {
    const root = document.createElement('div');
    const cam = document.createElement('div');
    const obj = document.createElement('div');
    root.style.cssText = `position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:${zIndex};display:none;`;
    cam.style.cssText = 'position:absolute;top:0;left:0;transform-style:preserve-3d;pointer-events:none;';
    obj.style.cssText = 'position:absolute;top:0;left:0;pointer-events:auto;';
    root.appendChild(cam);
    cam.appendChild(obj);
    return { root, cam, obj };
  });
  const holder = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    nodes.root.style.zIndex = String(zIndex);
  }, [nodes, zIndex]);

  useLayoutEffect(() => {
    holder.current?.appendChild(nodes.root);
    surfaces.set(id, nodes);
    return () => {
      if (surfaces.get(id) === nodes) surfaces.delete(id);
      nodes.root.remove();
    };
  }, [id, nodes]);

  return (
    <div ref={holder} className="contents">
      {createPortal(children, nodes.obj)}
    </div>
  );
}

interface GlassAnchorProps {
  id: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  /** Width of the glass in metres, spanned by `widthPx` CSS pixels. */
  width: number;
  widthPx: number;
}

const toCam = new THREE.Vector3();
const here = new THREE.Vector3();
const normal = new THREE.Vector3();

/**
 * The glass is placed from inside three's render, after it has refreshed the
 * camera's matrices for the frame being drawn. Placing it in useFrame read the
 * camera before the walk controller moved it, so the picture trailed the set
 * by a frame while turning.
 */
const placers = new Set<() => void>();
const hooked = new WeakSet<THREE.Scene>();

function hookScene(scene: THREE.Scene) {
  if (hooked.has(scene)) return;
  hooked.add(scene);
  const prev = scene.onBeforeRender;
  scene.onBeforeRender = function (...args) {
    prev.apply(this, args);
    placers.forEach(place => place());
  };
}

/** Canvas side: where the glass is. Writes the CSS transform every frame. */
export function GlassAnchor({ id, position, rotation = [0, 0, 0], width, widthPx }: GlassAnchorProps) {
  const get = useThree(state => state.get);
  const scene = useThree(state => state.scene);
  const anchor = useRef<THREE.Group>(null);
  const factor = widthPx / width;
  const place = useRef<() => void>(() => {});

  useEffect(
    () => () => {
      const nodes = surfaces.get(id);
      if (nodes) put(nodes.root, 'display', 'none');
    },
    [id],
  );

  useLayoutEffect(() => {
    hookScene(scene);
    const run = () => place.current();
    placers.add(run);
    return () => {
      placers.delete(run);
    };
  }, [scene]);

  place.current = () => {
    const { camera, size } = get();
    const group = anchor.current;
    const nodes = surfaces.get(id);
    if (!group || !nodes) return;
    const big = flat.get(id);
    if (big) {
      const content = nodes.obj.firstElementChild as HTMLElement | null;
      const nw = content?.offsetWidth || widthPx;
      const nh = content?.offsetHeight || widthPx * 0.75;
      const k = Math.min(big.w / nw, big.h / nh);
      const x = big.x + (big.w - nw * k) / 2;
      const y = big.y + (big.h - nh * k) / 2;
      put(nodes.root, 'perspective', 'none');
      put(nodes.root, 'background', '#000');
      put(nodes.cam, 'transform', 'none');
      put(nodes.obj, 'transformOrigin', '0 0');
      put(nodes.obj, 'transform', `translate(${x}px,${y}px) scale(${k})`);
      put(nodes.root, 'display', 'block');
      return;
    }
    put(nodes.root, 'background', '');
    put(nodes.obj, 'transformOrigin', '');
    const cam = camera as THREE.PerspectiveCamera;
    const w = size.width;
    const h = size.height;
    const fov = cam.projectionMatrix.elements[5] * (h / 2);
    put(nodes.root, 'perspective', `${fov}px`);
    put(nodes.cam, 'width', `${w}px`);
    put(nodes.cam, 'height', `${h}px`);
    put(nodes.cam, 'transform', `translateZ(${fov}px)${cssMatrix(cam.matrixWorldInverse, CAMERA_MUL)}translate(${w / 2}px,${h / 2}px)`);
    put(nodes.obj, 'transform', cssMatrix(group.matrixWorld, objectMul(factor), 'translate(-50%,-50%)'));
    // Only show the glass from in front.
    toCam.setFromMatrixPosition(cam.matrixWorld).sub(here.setFromMatrixPosition(group.matrixWorld));
    normal.set(0, 0, 1).transformDirection(group.matrixWorld);
    put(nodes.root, 'display', toCam.dot(normal) > 0 ? 'block' : 'none');
  };

  return <group ref={anchor} position={position} rotation={rotation} />;
}
