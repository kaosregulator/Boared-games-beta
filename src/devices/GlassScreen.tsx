import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFrame, useThree } from '@react-three/fiber';
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

const eps = (v: number) => (Math.abs(v) < 1e-10 ? 0 : v);

function cssMatrix(m: THREE.Matrix4, mul: number[], prepend = '') {
  let out = 'matrix3d(';
  for (let i = 0; i < 16; i += 1) out += eps(mul[i] * m.elements[i]) + (i !== 15 ? ',' : ')');
  return prepend + out;
}

const CAMERA_MUL = [1, -1, 1, 1, 1, -1, 1, 1, 1, -1, 1, 1, 1, -1, 1, 1];
const objectMul = (f: number) => [1 / f, 1 / f, 1 / f, 1, -1 / f, -1 / f, -1 / f, -1, 1 / f, 1 / f, 1 / f, 1, 1, 1, 1, 1];

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

/** Canvas side: where the glass is. Writes the CSS transform every frame. */
export function GlassAnchor({ id, position, rotation = [0, 0, 0], width, widthPx }: GlassAnchorProps) {
  const { camera, size } = useThree();
  const anchor = useRef<THREE.Group>(null);
  const factor = widthPx / width;

  useEffect(
    () => () => {
      const nodes = surfaces.get(id);
      if (nodes) nodes.root.style.display = 'none';
    },
    [id],
  );

  useFrame(() => {
    const group = anchor.current;
    const nodes = surfaces.get(id);
    if (!group || !nodes) return;
    const cam = camera as THREE.PerspectiveCamera;
    const w = size.width;
    const h = size.height;
    const fov = cam.projectionMatrix.elements[5] * (h / 2);
    nodes.root.style.perspective = `${fov}px`;
    nodes.cam.style.width = `${w}px`;
    nodes.cam.style.height = `${h}px`;
    nodes.cam.style.transform = `translateZ(${fov}px)${cssMatrix(cam.matrixWorldInverse, CAMERA_MUL)}translate(${w / 2}px,${h / 2}px)`;
    nodes.obj.style.transform = cssMatrix(group.matrixWorld, objectMul(factor), 'translate(-50%,-50%)');
    // Only show the glass from in front.
    toCam.setFromMatrixPosition(cam.matrixWorld).sub(here.setFromMatrixPosition(group.matrixWorld));
    normal.set(0, 0, 1).transformDirection(group.matrixWorld);
    nodes.root.style.display = toCam.dot(normal) > 0 ? 'block' : 'none';
  });

  return <group ref={anchor} position={position} rotation={rotation} />;
}
