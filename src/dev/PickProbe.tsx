import React, { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrthographicCamera, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { LAYOUT } from '../room/roomLayout';
import { MODEL_URL, type ModelId } from '../room/RoomModel';

/**
 * Dev tool: `?pick-probe=<layout id>&view=front|top&pick=x,y;x,y` renders a
 * prop at its room size, front-on, and logs the surface point under each
 * pixel in the prop's own placed frame (metres, floor at y=0). That frame is
 * what hotspots and lamp overlays are written in.
 */
function Model({ id, view }: { id: keyof typeof LAYOUT; view: string }) {
  const p = LAYOUT[id];
  const { scene } = useGLTF(MODEL_URL[id as ModelId]);
  const { camera, size, gl, scene: world } = useThree();
  const fitted = useMemo(() => {
    const root = scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const dims = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const len = p.axis === 'x' ? dims.x : p.axis === 'y' ? dims.y : dims.z;
    const s = p.meters / len;
    return { root, s, offset: new THREE.Vector3(-center.x * s, -box.min.y * s, -center.z * s), dims: dims.multiplyScalar(s) };
  }, [scene, p.axis, p.meters]);

  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    const { dims } = fitted;
    const top = view === 'top';
    const w = dims.x;
    const h = top ? dims.z : dims.y;
    cam.zoom = Math.min(size.width / w, size.height / h) * 0.9;
    if (top) {
      cam.position.set(0, 5, 0.0001);
      cam.lookAt(0, 0, 0);
    } else {
      cam.position.set(0, dims.y / 2, 5);
      cam.lookAt(0, dims.y / 2, 0);
    }
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const out: Record<string, unknown> = { id, dims: dims.toArray().map(v => +v.toFixed(3)), zoom: +cam.zoom.toFixed(2) };
    const picks = new URLSearchParams(location.search).get('pick');
    if (picks) {
      const ray = new THREE.Raycaster();
      const hits: unknown[] = [];
      world.updateMatrixWorld(true);
      for (const pair of picks.split(';')) {
        const [px, py] = pair.split(',').map(Number);
        ray.setFromCamera(new THREE.Vector2((px / size.width) * 2 - 1, -(py / size.height) * 2 + 1), cam);
        const hit = ray.intersectObject(fitted.root, true)[0];
        hits.push(hit ? [px, py, ...hit.point.toArray().map(v => +v.toFixed(3))] : [px, py, null]);
      }
      out.hits = hits;
    }
    // eslint-disable-next-line no-console
    console.log('PICK ' + JSON.stringify(out));
    gl.domElement.dataset.ready = '1';
  }, [camera, fitted, gl, id, size.height, size.width, view, world]);

  return (
    <group position={fitted.offset} scale={fitted.s}>
      <primitive object={fitted.root} />
    </group>
  );
}

export function PickProbe() {
  const q = new URLSearchParams(location.search);
  const id = q.get('pick-probe') as keyof typeof LAYOUT;
  const view = q.get('view') ?? 'front';
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#222' }}>
      <Canvas>
        <OrthographicCamera makeDefault position={[0, 0.5, 5]} near={0.01} far={20} />
        <ambientLight intensity={2.2} />
        <directionalLight position={[1, 2, 3]} intensity={1.6} />
        <Suspense fallback={null}>
          <Model id={id} view={view} />
        </Suspense>
      </Canvas>
    </div>
  );
}
