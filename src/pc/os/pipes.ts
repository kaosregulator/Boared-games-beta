import * as THREE from 'three';

/**
 * 3D Pipes: pipes grow through a 3D grid one segment at a time, turning at
 * ball joints, until the box is full; then the screen clears and it starts
 * over. Our own take on the classic.
 */
export function startPipes(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(1);
  renderer.setSize(canvas.clientWidth || 800, canvas.clientHeight || 600, false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000');
  const camera = new THREE.PerspectiveCamera(45, (canvas.clientWidth || 800) / (canvas.clientHeight || 600), 0.1, 200);
  camera.position.set(0, 0, 34);
  scene.add(new THREE.AmbientLight('#404040', 1.2));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(10, 14, 20);
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#8090ff', 0.6);
  fill.position.set(-12, -6, 8);
  scene.add(fill);

  const N = 13;
  const STEP = 2;
  const half = ((N - 1) * STEP) / 2;
  const used = new Set<string>();
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  const world = (v: THREE.Vector3) => new THREE.Vector3(v.x * STEP - half, v.y * STEP - half, v.z * STEP - half);
  const DIRS = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ];
  const COLORS = ['#d42a2a', '#2ab04a', '#2a5ad4', '#d4c02a', '#c02ad4', '#2ac4d4', '#e0e0e0', '#d4802a'];
  const cyl = new THREE.CylinderGeometry(0.42, 0.42, STEP, 14, 1, true);
  const ball = new THREE.SphereGeometry(0.62, 16, 12);
  const group = new THREE.Group();
  scene.add(group);

  let pipe: { at: THREE.Vector3; dir: THREE.Vector3; mat: THREE.MeshPhongMaterial } | null = null;
  let pipes = 0;
  let segments = 0;

  const free = (v: THREE.Vector3) => v.x >= 0 && v.y >= 0 && v.z >= 0 && v.x < N && v.y < N && v.z < N && !used.has(key(v.x, v.y, v.z));

  function newPipe() {
    for (let tries = 0; tries < 40; tries += 1) {
      const at = new THREE.Vector3(Math.floor(Math.random() * N), Math.floor(Math.random() * N), Math.floor(Math.random() * N));
      if (!free(at)) continue;
      used.add(key(at.x, at.y, at.z));
      const mat = new THREE.MeshPhongMaterial({ color: COLORS[pipes % COLORS.length], shininess: 80, specular: '#ffffff' });
      const cap = new THREE.Mesh(ball, mat);
      cap.position.copy(world(at));
      group.add(cap);
      pipe = { at, dir: DIRS[Math.floor(Math.random() * 6)].clone(), mat };
      pipes += 1;
      return;
    }
    pipe = null;
  }

  function reset() {
    group.children.slice().forEach(c => {
      group.remove(c);
      const m = (c as THREE.Mesh).material as THREE.Material;
      m.dispose?.();
    });
    used.clear();
    pipes = 0;
    segments = 0;
    group.rotation.set((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.8, 0);
    newPipe();
  }

  function grow() {
    if (!pipe) {
      newPipe();
      if (!pipe) reset();
      return;
    }
    // mostly straight, sometimes turn
    const options = DIRS.filter(d => free(pipe!.at.clone().add(d)));
    if (!options.length) {
      const cap = new THREE.Mesh(ball, pipe.mat);
      cap.position.copy(world(pipe.at));
      group.add(cap);
      pipe = null;
      if (pipes > 7 || segments > 420) reset();
      return;
    }
    const straight = options.find(d => d.equals(pipe!.dir));
    const dir = straight && Math.random() < 0.72 ? straight : options[Math.floor(Math.random() * options.length)];
    if (!dir.equals(pipe.dir)) {
      const joint = new THREE.Mesh(ball, pipe.mat);
      joint.position.copy(world(pipe.at));
      group.add(joint);
    }
    const next = pipe.at.clone().add(dir);
    const seg = new THREE.Mesh(cyl, pipe.mat);
    seg.position.copy(world(pipe.at).add(world(next)).multiplyScalar(0.5));
    if (dir.x !== 0) seg.rotation.z = Math.PI / 2;
    if (dir.z !== 0) seg.rotation.x = Math.PI / 2;
    group.add(seg);
    used.add(key(next.x, next.y, next.z));
    pipe.at = next;
    pipe.dir = dir.clone();
    segments += 1;
  }

  reset();
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  const loop = (now: number) => {
    acc += now - last;
    last = now;
    while (acc > 45) {
      grow();
      acc -= 45;
    }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    reset();
    cyl.dispose();
    ball.dispose();
    renderer.dispose();
  };
}
