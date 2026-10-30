import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { capsule, setCapsulePiece } from './capsuleBus';
import { cloneModelPiece, disposePiece, extractPiece, type Piece } from './extractPiece';
import { HOLO_BORROW, HOLO_POSE, HOLO_SKIP } from './holoAssets';
import { boardSrcFor, buildBoardPiece } from './gameBoard';
import { holoMaterial, holoUniforms, realMaterial, tickHolo } from './holoMaterial';

/**
 * The time capsule's hologram: the real piece of the room the card is about,
 * cut out of the scan (extractPiece), turned to blue light (holoMaterial) and
 * turning slowly over a little projector beside the card. It is drawn by the room's own renderer, in
 * the room, so there is no image or model file on the card to save.
 */

/** How far in front of the camera the piece floats, metres. */
const DEPTH = 0.42;
const SPIN = 0.7;

const _box = new THREE.Box3();
const _ndc = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _fwd = new THREE.Vector3();

function findHotspot(scene: THREE.Object3D, id: string): THREE.Mesh | null {
  let hit: THREE.Mesh | null = null;
  scene.traverse(o => {
    if (hit) return;
    const data = o.userData?.interactable as { id?: string } | undefined;
    if (data?.id === id && (o as THREE.Mesh).isMesh) hit = o as THREE.Mesh;
  });
  return hit;
}

/** True only if this object and every ancestor is visible (world-visible). */
function shownInWorld(o: THREE.Object3D): boolean {
  for (let n: THREE.Object3D | null = o; n; n = n.parent) if (!n.visible) return false;
  return true;
}

/** The real, whole model behind a card (tagged in RoomModel), for a clean clone. */
function findHoloRoot(scene: THREE.Object3D, id: string): THREE.Object3D | null {
  let hit: THREE.Object3D | null = null;
  scene.traverse(o => {
    if (hit) return;
    // The toy may be in the scene several times (bed / hand / table); take the
    // one actually on screen, so a held Furby doesn't clone the hidden bed one.
    if (o.userData?.holoRoot === id && shownInWorld(o)) hit = o;
  });
  return hit;
}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Looks {
  meshes: THREE.Mesh[];
  holo: THREE.Material[];
  real: THREE.Material[];
}

/**
 * Draw the piece over the room: after everything else, depth cleared first.
 * Each mesh gets two looks, the hologram and the real thing in its own colours
 * (the Images tab), swapped by the card.
 */
function overlay(piece: Piece): Looks {
  const looks: Looks = { meshes: [], holo: [], real: [] };
  piece.group.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    // Only a fresh cut may have its normals rebuilt; a clone shares the room's geometry.
    if (!piece.shared && !mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals();
    const src = mesh.material as THREE.Material;
    const uv = !!mesh.geometry.getAttribute('uv');
    const color = !!mesh.geometry.getAttribute('color');
    const holo = holoMaterial(src, uv, color);
    looks.meshes.push(mesh);
    looks.holo.push(holo);
    looks.real.push(realMaterial(src, uv, color));
    mesh.material = holo;
    mesh.renderOrder = 10001;
    mesh.frustumCulled = false;
  });
  return looks;
}

function wear(looks: Looks, real: boolean) {
  const set = real ? looks.real : looks.holo;
  looks.meshes.forEach((m, i) => (m.material = set[i]));
}

export function CapsuleHologram() {
  const { scene, camera, gl } = useThree();
  const holder = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const [piece, setPiece] = useState<Piece | null>(null);
  const [id, setId] = useState<string | null>(capsule.id);
  const [mode, setMode] = useState(capsule.mode);
  const looks = useRef<Looks | null>(null);
  const source = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    const on = () => {
      setId(capsule.id);
      setMode(capsule.mode);
    };
    capsule.listeners.add(on);
    return () => {
      capsule.listeners.delete(on);
    };
  }, []);

  // Cut the piece out when a card opens.
  useEffect(() => {
    if (!id) {
      setPiece(null);
      source.current = null;
      return;
    }
    // A flat decal (poster, sticker) has no 3D to turn; show the card, no hologram.
    if (HOLO_SKIP.has(id)) {
      setPiece(null);
      source.current = null;
      setCapsulePiece(false);
      return;
    }
    let made: Piece | null = null;
    let madeLooks: Looks | null = null;
    let tries = 0;
    let timer = 0;
    // Cut it a frame after the card opens, so its first paint isn't held up. A card
    // opened before the room has loaded keeps looking until the room is in.
    const boardSrc = boardSrcFor(id);
    const attempt = () => {
      // A game box shows a clean two-sided board of its real box art, not a cut
      // of the shelf. (Retries while the art loads.)
      if (boardSrc) {
        made = buildBoardPiece(boardSrc);
        if (made) {
          const spot = findHotspot(scene, id);
          if (spot) source.current = new THREE.Box3().setFromObject(spot).getCenter(new THREE.Vector3());
        }
      }
      // A prop with its own scanned model gets cloned whole — the real thing by
      // itself, no shelf or desk around it. Everything else falls back to cutting
      // a box out of the room scan.
      if (!made) {
        const root = findHoloRoot(scene, HOLO_BORROW[id] ?? id);
        if (root) {
          made = cloneModelPiece(root, HOLO_POSE[id]);
          if (made) source.current = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
        }
      }
      if (!made && !boardSrc) {
        const spot = findHotspot(scene, id);
        if (spot) {
          spot.updateWorldMatrix(true, false);
          if (!spot.geometry.boundingBox) spot.geometry.computeBoundingBox();
          const cut = spot.userData.cut as { offset: [number, number, number]; size: [number, number, number] } | undefined;
          if (cut) {
            _box.setFromCenterAndSize(new THREE.Vector3(...cut.offset), new THREE.Vector3(...cut.size));
          } else _box.copy(spot.geometry.boundingBox!);
          _box.applyMatrix4(spot.matrixWorld).expandByScalar(0.008);
          source.current = _box.getCenter(new THREE.Vector3());
          made = extractPiece(scene, _box, holder.current);
        }
      }
      if (made) {
        holoUniforms.uReveal.value = 0;
        madeLooks = overlay(made);
        looks.current = madeLooks;
        wear(madeLooks, capsule.mode === 'real');
        setPiece(made);
        setCapsulePiece(true);
      } else if (++tries < 40) timer = window.setTimeout(attempt, 500);
      else setCapsulePiece(false);
    };
    timer = window.setTimeout(attempt, 30);
    return () => {
      window.clearTimeout(timer);
      disposePiece(made);
      if (madeLooks) for (const m of [...madeLooks.holo, ...madeLooks.real]) m.dispose();
      if (looks.current === madeLooks) looks.current = null;
    };
  }, [id, scene]);

  // The card picks the look: the hologram builds itself up again each time it comes back.
  useEffect(() => {
    if (!looks.current) return;
    wear(looks.current, mode === 'real');
    if (mode === 'holo') holoUniforms.uReveal.value = 0;
  }, [mode, piece]);

  // Clears the depth buffer just before the piece, so the room never cuts into it.
  const clearer = useMemo(() => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.001, 0.001),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    );
    mesh.renderOrder = 10000;
    mesh.frustumCulled = false;
    mesh.onBeforeRender = renderer => renderer.clearDepth();
    return mesh;
  }, []);
  useEffect(() => () => {
    clearer.geometry.dispose();
    (clearer.material as THREE.Material).dispose();
  }, [clearer]);

  const ring = useRef<THREE.Group>(null);
  const projector = useRef<THREE.Group>(null);
  useFrame((state, dt) => {
    const g = holder.current;
    if (!g) return;
    const cam = camera as THREE.PerspectiveCamera;
    const canvas = gl.domElement.getBoundingClientRect();

    // Where the real thing is on screen, for the beam.
    if (source.current && canvas.width > 0) {
      _ndc.copy(source.current).project(cam);
      capsule.source =
        _ndc.z < 1 && Math.abs(_ndc.x) < 1.2 && Math.abs(_ndc.y) < 1.2
          ? { x: canvas.left + ((_ndc.x + 1) / 2) * canvas.width, y: canvas.top + ((1 - _ndc.y) / 2) * canvas.height }
          : null;
    } else capsule.source = null;

    const stage = capsule.stage;
    if (!piece || !stage || canvas.height <= 0 || capsule.mode === 'off') {
      g.visible = false;
      return;
    }
    const r = stage.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) {
      g.visible = false;
      return;
    }
    g.visible = true;
    // Through the middle of the window, DEPTH metres out.
    const nx = ((r.left + r.width / 2 - canvas.left) / canvas.width) * 2 - 1;
    const ny = -(((r.top + r.height / 2 - canvas.top) / canvas.height) * 2 - 1);
    _dir.set(nx, ny, 0.5).unproject(cam).sub(cam.position).normalize();
    g.position.copy(cam.position).addScaledVector(_dir, DEPTH);
    g.quaternion.copy(cam.quaternion);
    // Fit it to the window: the frustum's height at this depth, times the window's share of the screen.
    cam.getWorldDirection(_fwd);
    const along = DEPTH * Math.max(0.2, _dir.dot(_fwd));
    const viewH = 2 * along * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    const fit = (Math.min(r.height, r.width * 0.9) / canvas.height) * viewH;
    const real = capsule.mode === 'real';
    g.scale.setScalar((fit * (real ? 0.62 : 0.56)) / piece.radius);
    const still = reduceMotion();
    tickHolo(state.clock.elapsedTime, dt, still);
    // The reveal and contour lines run bottom to top of the piece, in the world.
    holoUniforms.uCenterY.value = g.position.y;
    holoUniforms.uRadius.value = piece.radius * g.scale.x;
    if (projector.current) projector.current.visible = !real;
    if (spin.current) {
      spin.current.rotation.y += dt * (still ? SPIN * 0.3 : SPIN);
      // It floats: a slow bob above the projector.
      spin.current.position.y = still ? 0 : Math.sin(state.clock.elapsedTime * 1.3) * piece.radius * 0.05;
    }
    if (ring.current) ring.current.rotation.z -= dt * 0.4;
  });

  return (
    <group ref={holder} visible={false}>
      <primitive object={clearer} />
      {piece && (
        <>
          <group rotation={[0.22, 0, 0]}>
            <group ref={spin}>
              <primitive object={piece.group} />
            </group>
            <group ref={projector}>
              <Glow radius={piece.radius} />
              <Projector radius={piece.radius} ring={ring} />
            </group>
          </group>
        </>
      )}
    </group>
  );
}

const BLUE = '#5fd4ff';

/** The projector under the piece: two rings of blue light and a faint cone up into it. */
function Projector({ radius, ring }: { radius: number; ring: RefObject<THREE.Group | null> }) {
  const y = -radius * 0.98;
  return (
    <group position={[0, y, 0]}>
      <group ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh renderOrder={10002}>
          <ringGeometry args={[radius * 0.82, radius * 0.88, 64]} />
          <meshBasicMaterial color={BLUE} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh renderOrder={10002}>
          <ringGeometry args={[radius * 0.5, radius * 0.74, 48, 1, 0, Math.PI * 1.6]} />
          <meshBasicMaterial color={BLUE} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh renderOrder={10002}>
          <circleGeometry args={[radius * 0.16, 32]} />
          <meshBasicMaterial color="#c9f3ff" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      {/* The beam: an open cone, brightest at the bottom. */}
      <mesh position={[0, radius * 0.9, 0]} renderOrder={10003}>
        <cylinderGeometry args={[radius * 0.95, radius * 0.18, radius * 1.8, 48, 1, true]} />
        <meshBasicMaterial color={BLUE} transparent opacity={0.022} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

const GLOW_VERTEX = /* glsl */ `
  varying vec3 vPosition;
  varying vec3 vNormal;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vPosition = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

// After Anderson Mancini's fake glow material: brightest facing you, falling off to nothing at the edge.
const GLOW_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uFlicker;
  varying vec3 vPosition;
  varying vec3 vNormal;
  void main() {
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    float fresnel = max(dot(normalize(cameraPosition - vPosition), n), 0.0);
    fresnel = pow(fresnel, 3.0);
    float glow = fresnel * smoothstep(0.0, 0.35, fresnel) * 0.32 * uFlicker;
    gl_FragColor = vec4(uColor * fresnel, glow);
  }
`;

/** A soft halo of blue light around the hologram, so it glows instead of sitting flat on the room. */
function Glow({ radius }: { radius: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(BLUE) }, uFlicker: holoUniforms.uFlicker },
        vertexShader: GLOW_VERTEX,
        fragmentShader: GLOW_FRAGMENT,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh renderOrder={10000.5} material={material}>
      <sphereGeometry args={[radius * 1.15, 32, 16]} />
    </mesh>
  );
}
