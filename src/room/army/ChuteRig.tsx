import { useMemo } from 'react';
import * as THREE from 'three';
import { MAN_HEIGHT } from './town';

/**
 * The army man's canopy: an olive and khaki dome with eight gores, shroud
 * lines down to his shoulders, and a red ripcord handle. Built once and moved
 * by hand every frame, like the tracers.
 */

const R = 0.07;
/** How far round the dome goes from the top (radians): a shallow cap, like a real round chute. */
const CAP = 1.15;
const SQUASH = 0.62;
const GORES = 8;
/** Shoulders, where the lines meet. */
const HARNESS = MAN_HEIGHT * 0.82;
/** The dome's top, over the harness. */
const LIFT = 0.13;

function canopyGeometry() {
  const geo = new THREE.SphereGeometry(R, GORES * 3, 7, 0, Math.PI * 2, 0, CAP).toNonIndexed();
  geo.scale(1, SQUASH, 1);
  // Drop it so the top sits at y = 0.
  geo.translate(0, -R * SQUASH, 0);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const olive = new THREE.Color('#5f6d34');
  const khaki = new THREE.Color('#d9cfa4');
  for (let i = 0; i < pos.count; i += 3) {
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const a = (Math.atan2(cx, cz) + Math.PI) / (Math.PI * 2);
    const c = Math.floor(a * GORES) % 2 ? olive : khaki;
    for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (i + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

export interface ChuteRig {
  root: THREE.Group;
  /** Moves with the dome; the lines stretch from it down to the harness. */
  canopy: THREE.Group;
  lines: THREE.LineSegments;
  handle: THREE.Mesh;
  /**
   * open 0..1+ (overshoots as it bangs open), fold 0..1 after touchdown,
   * sway in radians, handle 0..1 (the ripcord yanked out and tossed).
   */
  pose(open: number, fold: number, sway: number, handle: number): void;
}

export function useChuteRig(): ChuteRig {
  return useMemo(() => {
    const root = new THREE.Group();
    root.visible = false;
    const canopy = new THREE.Group();
    const dome = new THREE.Mesh(
      canopyGeometry(),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide }),
    );
    dome.frustumCulled = false;
    canopy.add(dome);
    // A little vent hole cap on top.
    const vent = new THREE.Mesh(new THREE.CircleGeometry(R * 0.16, 12), new THREE.MeshStandardMaterial({ color: '#3d4722', side: THREE.DoubleSide }));
    vent.rotation.x = -Math.PI / 2;
    vent.position.y = 0.0004;
    canopy.add(vent);
    root.add(canopy);

    // Shroud lines: from points round the rim down to the harness.
    const rimY = -R * SQUASH * (1 - Math.cos(CAP));
    const rimR = R * Math.sin(CAP);
    const rim: THREE.Vector3[] = [];
    for (let i = 0; i < GORES; i++) {
      const a = (i / GORES) * Math.PI * 2;
      rim.push(new THREE.Vector3(Math.sin(a) * rimR, rimY, Math.cos(a) * rimR));
    }
    const linePos = new Float32Array(GORES * 6);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: '#2d2a20', transparent: true, opacity: 0.8 }));
    lines.frustumCulled = false;
    root.add(lines);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.003, 0.003), new THREE.MeshBasicMaterial({ color: '#e0261b' }));
    root.add(handle);

    const _p = new THREE.Vector3();
    return {
      root,
      canopy,
      lines,
      handle,
      pose(open, fold, sway, yank) {
        const shown = open > 0.001 && fold < 1;
        canopy.visible = shown;
        lines.visible = shown;
        // Streams out long and thin, then fills wide.
        const fill = Math.max(0, open);
        const wide = 0.12 + 0.88 * fill;
        const tall = 1 + 1.4 * Math.max(0, 1 - fill);
        // Folding: it sags, tips over to one side and lies flat.
        const sag = fold * fold;
        canopy.scale.set(wide * (1 + sag * 0.3), tall * (1 - sag * 0.85), wide * (1 + sag * 0.3));
        const up = HARNESS + LIFT * Math.min(1, fill + 0.25) * (1 - sag * 0.85);
        canopy.position.set(Math.sin(sway) * LIFT + sag * 0.06, up, 0);
        canopy.rotation.set(0, 0, -sway - sag * 1.2);
        canopy.updateMatrix();
        for (let i = 0; i < GORES; i++) {
          _p.copy(rim[i]).applyMatrix4(canopy.matrix);
          linePos.set([_p.x, _p.y, _p.z, 0, HARNESS, 0], i * 6);
        }
        lineGeo.attributes.position.needsUpdate = true;
        // The red handle: in his hand at the yank, then flung off to the side.
        handle.visible = yank > 0 && yank < 1;
        const k = Math.min(1, yank);
        handle.position.set(0.012 + k * 0.05, HARNESS - 0.012 + Math.sin(k * Math.PI) * 0.03 - k * 0.04, 0.01);
        handle.rotation.z = k * 9;
      },
    };
  }, []);
}
