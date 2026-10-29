import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { capsule, setCapsulePiece } from './capsuleBus';
import { cloneModelPiece, disposePiece, extractPiece, type Piece } from './extractPiece';
import { HOLO_BORROW, HOLO_POSE } from './holoAssets';
import { holoMaterial, holoUniforms, tickHolo } from './holoMaterial';

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

/** The real, whole model behind a card (tagged in RoomModel), for a clean clone. */
function findHoloRoot(scene: THREE.Object3D, id: string): THREE.Object3D | null {
  let hit: THREE.Object3D | null = null;
  scene.traverse(o => {
    if (hit) return;
    if (o.visible && o.userData?.holoRoot === id) hit = o;
  });
  return hit;
}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Draw the piece over the room as a hologram: after everything else, depth cleared first. */
function overlay(piece: Piece) {
  const clones: THREE.Material[] = [];
  piece.group.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    // Only a fresh cut may have its normals rebuilt; a clone shares the room's geometry.
    if (!piece.shared && !mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals();
    const mat = holoMaterial(mesh.material as THREE.Material, !!mesh.geometry.getAttribute('uv'), !!mesh.geometry.getAttribute('color'));
    clones.push(mat);
    mesh.material = mat;
    mesh.renderOrder = 10001;
    mesh.frustumCulled = false;
  });
  return clones;
}

export function CapsuleHologram() {
  const { scene, camera, gl } = useThree();
  const holder = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const [piece, setPiece] = useState<Piece | null>(null);
  const [id, setId] = useState<string | null>(capsule.id);
  const source = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    const on = () => setId(capsule.id);
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
    let made: Piece | null = null;
    let clones: THREE.Material[] = [];
    let tries = 0;
    let timer = 0;
    // Cut it a frame after the card opens, so its first paint isn't held up. A card
    // opened before the room has loaded keeps looking until the room is in.
    const attempt = () => {
      // A prop with its own scanned model gets cloned whole — the real thing by
      // itself, no shelf or desk around it. Everything else falls back to cutting
      // a box out of the room scan.
      const root = findHoloRoot(scene, HOLO_BORROW[id] ?? id);
      if (root) {
        made = cloneModelPiece(root, HOLO_POSE[id]);
        if (made) source.current = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
      }
      if (!made) {
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
        clones = overlay(made);
        setPiece(made);
        setCapsulePiece(true);
      } else if (++tries < 40) timer = window.setTimeout(attempt, 500);
      else setCapsulePiece(false);
    };
    timer = window.setTimeout(attempt, 30);
    return () => {
      window.clearTimeout(timer);
      disposePiece(made);
      for (const m of clones) m.dispose();
    };
  }, [id, scene]);

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
    if (!piece || !stage || canvas.height <= 0) {
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
    g.scale.setScalar((fit * 0.56) / piece.radius);
    const still = reduceMotion();
    tickHolo(state.clock.elapsedTime, dt, still);
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
            <Projector radius={piece.radius} ring={ring} />
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
