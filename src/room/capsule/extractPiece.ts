import * as THREE from 'three';

/**
 * Cut one thing out of the room, as it really is. The room's props are Tripo
 * scans, one mesh per piece of furniture with the lamp, clock and tapes baked
 * in, so a hotspot's box is the only thing that says where the Walkman ends.
 * This copies every triangle of the room that sits inside that box (same
 * materials, same textures) and centres the copy on the origin, for a time
 * capsule to turn on its little stand.
 */

export interface Piece {
  group: THREE.Group;
  /** Radius of the piece's bounding sphere, metres. */
  radius: number;
  triangles: number;
  /**
   * The piece's geometry is shared with the room (a clone of a real prop, not
   * a fresh cut), so it must not be disposed with the hologram.
   */
  shared?: boolean;
}

/** Fewer triangles than this and the box missed: no piece. */
export const MIN_TRIANGLES = 40;
/** Safety cap so a huge scan can't stall the frame. */
export const MAX_TRIANGLES = 120_000;

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _centroid = new THREE.Vector3();
const _meshBox = new THREE.Box3();

function isHotspot(o: THREE.Object3D) {
  return Boolean(o.userData?.interactable);
}

function cutMesh(mesh: THREE.Mesh, box: THREE.Box3, budget: number): THREE.BufferGeometry | null {
  const src = mesh.geometry as THREE.BufferGeometry;
  const pos = src.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!pos) return null;
  const nrm = src.getAttribute('normal') as THREE.BufferAttribute | undefined;
  const uv = src.getAttribute('uv') as THREE.BufferAttribute | undefined;
  const col = src.getAttribute('color') as THREE.BufferAttribute | undefined;
  const index = src.getIndex();
  const tris = (index ? index.count : pos.count) / 3;
  const world = mesh.matrixWorld;
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(world);

  const outP: number[] = [];
  const outN: number[] = [];
  const outU: number[] = [];
  const outC: number[] = [];
  const v = (i: number) => (index ? index.getX(i) : i);
  let kept = 0;
  for (let t = 0; t < tris && kept < budget; t++) {
    const i0 = v(t * 3);
    const i1 = v(t * 3 + 1);
    const i2 = v(t * 3 + 2);
    _a.fromBufferAttribute(pos, i0).applyMatrix4(world);
    _b.fromBufferAttribute(pos, i1).applyMatrix4(world);
    _c.fromBufferAttribute(pos, i2).applyMatrix4(world);
    _centroid.copy(_a).add(_b).add(_c).multiplyScalar(1 / 3);
    if (!box.containsPoint(_centroid)) continue;
    kept++;
    outP.push(_a.x, _a.y, _a.z, _b.x, _b.y, _b.z, _c.x, _c.y, _c.z);
    for (const i of [i0, i1, i2]) {
      if (nrm) {
        _a.fromBufferAttribute(nrm, i).applyMatrix3(normalMatrix).normalize();
        outN.push(_a.x, _a.y, _a.z);
      }
      if (uv) outU.push(uv.getX(i), uv.getY(i));
      if (col) outC.push(col.getX(i), col.getY(i), col.getZ(i));
    }
  }
  if (!kept) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(outP, 3));
  if (nrm) geo.setAttribute('normal', new THREE.Float32BufferAttribute(outN, 3));
  else geo.computeVertexNormals();
  if (uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(outU, 2));
  if (col) geo.setAttribute('color', new THREE.Float32BufferAttribute(outC, 3));
  return geo;
}

/**
 * Everything in `root` that sits inside `box` (world space), centred on the
 * origin. Hotspot boxes and anything under `skip` are left out. The copy shares
 * the room's materials, so it must be drawn by the room's own renderer.
 */
export function extractPiece(root: THREE.Object3D, box: THREE.Box3, skip?: THREE.Object3D | null): Piece | null {
  root.updateMatrixWorld(true);
  const group = new THREE.Group();
  let triangles = 0;
  const visit = (o: THREE.Object3D) => {
    if (o === skip || isHotspot(o) || !o.visible) return;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !(mesh as THREE.SkinnedMesh).isSkinnedMesh && !(mesh as THREE.InstancedMesh).isInstancedMesh) {
      const mat = mesh.material as THREE.Material | THREE.Material[];
      const first = Array.isArray(mat) ? mat[0] : mat;
      if (first && first.visible !== false && !(first.transparent && first.opacity === 0)) {
        if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
        _meshBox.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld);
        if (_meshBox.intersectsBox(box)) {
          const geo = cutMesh(mesh, box, MAX_TRIANGLES - triangles);
          if (geo) {
            triangles += geo.getAttribute('position').count / 3;
            group.add(new THREE.Mesh(geo, Array.isArray(mat) ? mat[0] : mat));
          }
        }
      }
    }
    for (const child of o.children) visit(child);
  };
  visit(root);
  if (triangles < MIN_TRIANGLES) {
    group.traverse(o => (o as THREE.Mesh).geometry?.dispose());
    return null;
  }
  const bounds = new THREE.Box3().setFromObject(group);
  const centre = bounds.getCenter(new THREE.Vector3());
  for (const child of group.children) (child as THREE.Mesh).geometry.translate(-centre.x, -centre.y, -centre.z);
  const radius = Math.max(0.001, bounds.getSize(new THREE.Vector3()).length() / 2);
  return { group, radius, triangles };
}

export function disposePiece(piece: Piece | null) {
  // A cloned prop shares the room's geometry; disposing it would wreck the room.
  if (!piece || piece.shared) return;
  piece.group.traverse(o => (o as THREE.Mesh).geometry?.dispose());
}

const _rootInv = new THREE.Matrix4();
const _rel = new THREE.Matrix4();
const _cloneBox = new THREE.Box3();
const _cloneCentre = new THREE.Vector3();
const _cloneSize = new THREE.Vector3();

/**
 * The hologram of a prop that has its own scanned model: a clone of the real
 * thing in the room — the exact asset, by itself, with nothing of the shelf or
 * desk it sits on. Meshes are copied in the model's own frame (so it stands the
 * way it does in the room), their geometry shared with the room, centred on the
 * origin, with an optional extra rotation to pose it. The hologram look is put
 * on afterwards, so the real materials are left untouched.
 */
export function cloneModelPiece(root: THREE.Object3D, rotation?: [number, number, number]): Piece | null {
  root.updateWorldMatrix(true, true);
  _rootInv.copy(root.matrixWorld).invert();
  const inner = new THREE.Group();
  let triangles = 0;
  root.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh || (mesh as THREE.InstancedMesh).isInstancedMesh) return;
    if (!mesh.visible) return;
    const mat = mesh.material as THREE.Material | THREE.Material[];
    const first = Array.isArray(mat) ? mat[0] : mat;
    if (!first || first.visible === false || (first.transparent && (first as THREE.Material).opacity === 0)) return;
    const copy = new THREE.Mesh(mesh.geometry, first);
    copy.matrixAutoUpdate = false;
    _rel.multiplyMatrices(_rootInv, mesh.matrixWorld);
    copy.matrix.copy(_rel);
    copy.frustumCulled = false;
    inner.add(copy);
    const pos = mesh.geometry.getAttribute('position');
    if (pos) triangles += (mesh.geometry.getIndex()?.count ?? pos.count) / 3;
  });
  // A whole scanned prop is a clean clone; a whole piece of furniture is far too
  // many triangles to spin as a hologram, so let it fall back to the bounded cut.
  if (!inner.children.length || triangles > MAX_TRIANGLES) {
    return null;
  }
  inner.updateMatrixWorld(true);
  _cloneBox.setFromObject(inner);
  _cloneBox.getCenter(_cloneCentre);
  inner.position.sub(_cloneCentre);
  const group = new THREE.Group();
  if (rotation) {
    const posed = new THREE.Group();
    posed.rotation.set(rotation[0], rotation[1], rotation[2]);
    posed.add(inner);
    group.add(posed);
  } else {
    group.add(inner);
  }
  const radius = Math.max(0.001, _cloneBox.getSize(_cloneSize).length() / 2);
  return { group, radius, triangles, shared: true };
}
