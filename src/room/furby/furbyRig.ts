import * as THREE from 'three';

/**
 * Turns the Tripo plush (one static mesh, model units, 0.94 tall, facing +z,
 * feet on y = 0) into a skinned puppet with the same moving parts the 1998
 * toy had: a body that leans, a head that nods, two ears, a beak that opens
 * and the tuft on top. The eyes are new: eyeballs and lids built here and
 * set over the painted eyes, because a texture can't blink.
 *
 * scripts/build-furby.mjs tags every vertex with the part it belongs to
 * (`_part`: 0 body, 1 left ear, 2 left foot, 3 face, 4 right ear, 5 right
 * foot), taken from the user's in-pieces mesh, so the ears come off cleanly
 * instead of by guesswork.
 */

const PART = { body: 0, earL: 1, footL: 2, face: 3, earR: 4, footR: 5 };

/** Bone pivots in model units, read off orthographic shots of the mesh. */
export const PIVOT = {
  waist: new THREE.Vector3(0, 0.14, 0),
  head: new THREE.Vector3(0, 0.46, 0.02),
  /** The ear's own side is +x/-x; the root sits where it meets the head. */
  ear: new THREE.Vector3(0.2, 0.6, 0.03),
  jaw: new THREE.Vector3(0, 0.405, 0.24),
  tuft: new THREE.Vector3(0, 0.74, -0.04),
};
/** The painted eyes, centre of each iris. */
export const EYE = { x: 0.087, y: 0.516, r: 0.05 };

export interface FurbyRig {
  root: THREE.Group;
  mesh: THREE.SkinnedMesh;
  bones: {
    root: THREE.Bone;
    waist: THREE.Bone;
    head: THREE.Bone;
    earL: THREE.Bone;
    earR: THREE.Bone;
    jaw: THREE.Bone;
    tuft: THREE.Bone;
  };
  eyes: { ball: THREE.Object3D; lid: THREE.Object3D; lower: THREE.Object3D }[];
  /** Fur material, shared by every copy of this rig. */
  material: THREE.MeshPhysicalMaterial;
  dispose: () => void;
}

const smooth = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

function irisTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f3efe6';
  g.fillRect(0, 0, s, s);
  // Blue-grey iris like the painted one, with a darker rim and fibres.
  const cx = s / 2;
  const iris = s * 0.3;
  const grad = g.createRadialGradient(cx, cx, iris * 0.2, cx, cx, iris);
  grad.addColorStop(0, '#6f8db0');
  grad.addColorStop(0.7, '#4a6488');
  grad.addColorStop(1, '#1d2a3c');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(cx, cx, iris, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(200,220,255,0.25)';
  g.lineWidth = 1.2;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * iris * 0.38, cx + Math.sin(a) * iris * 0.38);
    g.lineTo(cx + Math.cos(a) * iris * 0.92, cx + Math.sin(a) * iris * 0.92);
    g.stroke();
  }
  g.fillStyle = '#05070a';
  g.beginPath();
  g.arc(cx, cx, iris * 0.42, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A sphere whose front (+z) hemisphere is mapped flat, so the iris sits at the front pole. */
function eyeballGeometry(r: number) {
  const geo = new THREE.SphereGeometry(r, 28, 20);
  const p = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / r;
    const y = p.getY(i) / r;
    const z = p.getZ(i);
    // Back half gets the white corner of the texture.
    if (z < 0) uv.setXY(i, 0.02, 0.02);
    else uv.setXY(i, 0.5 + x * 0.5, 0.5 + y * 0.5);
  }
  return geo;
}

let shared: { iris: THREE.Texture; ball: THREE.BufferGeometry; lid: THREE.BufferGeometry; lash: THREE.BufferGeometry } | null = null;
function eyeParts() {
  if (shared) return shared;
  const r = EYE.r;
  // Upper lid: the top hemisphere of a slightly bigger shell. Rotated about x
  // it rolls down over the eyeball (closed) or back into the head (open).
  const lid = new THREE.SphereGeometry(r * 1.1, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const lash = new THREE.TorusGeometry(r * 1.1, r * 0.06, 6, 28, Math.PI);
  lash.rotateX(Math.PI / 2);
  shared = { iris: irisTexture(), ball: eyeballGeometry(r), lid, lash };
  return shared;
}

/**
 * Builds a rig from the loaded GLB. The source geometry is shared; the
 * bones, skinned mesh and eyes are this rig's own, so the bed Furby and a
 * table Furby can move independently.
 */
export function buildFurbyRig(source: THREE.Object3D, tint?: THREE.ColorRepresentation): FurbyRig {
  let src: THREE.Mesh | null = null;
  source.traverse(o => {
    if (!src && (o as THREE.Mesh).isMesh) src = o as THREE.Mesh;
  });
  if (!src) throw new Error('furby.glb has no mesh');
  const base = src as THREE.Mesh;
  // meshopt quantizes positions and puts the scale back on the node; bake
  // it in so the rig works in plain model units.
  source.updateMatrixWorld(true);
  const geo = base.geometry.clone().applyMatrix4(base.matrixWorld);
  const pos = geo.attributes.position;
  const part = geo.attributes._part as THREE.BufferAttribute | undefined;
  const n = pos.count;

  const bones = {
    root: new THREE.Bone(),
    waist: new THREE.Bone(),
    head: new THREE.Bone(),
    earL: new THREE.Bone(),
    earR: new THREE.Bone(),
    jaw: new THREE.Bone(),
    tuft: new THREE.Bone(),
  };
  bones.root.name = 'root';
  bones.waist.position.copy(PIVOT.waist);
  bones.root.add(bones.waist);
  bones.head.position.copy(PIVOT.head).sub(PIVOT.waist);
  bones.waist.add(bones.head);
  const earAt = (side: number) => new THREE.Vector3(PIVOT.ear.x * side, PIVOT.ear.y, PIVOT.ear.z).sub(PIVOT.head);
  bones.earL.position.copy(earAt(-1));
  bones.earR.position.copy(earAt(1));
  bones.jaw.position.copy(PIVOT.jaw).sub(PIVOT.head);
  bones.tuft.position.copy(PIVOT.tuft).sub(PIVOT.head);
  bones.head.add(bones.earL, bones.earR, bones.jaw, bones.tuft);
  const list = [bones.root, bones.waist, bones.head, bones.earL, bones.earR, bones.jaw, bones.tuft];
  const B = { root: 0, waist: 1, head: 2, earL: 3, earR: 4, jaw: 5, tuft: 6 };

  const skinIndex = new Uint16Array(n * 4);
  const skinWeight = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const p = part ? Math.round(part.getX(i)) : PART.body;
    const foot = p === PART.footL || p === PART.footR;
    const lean = foot ? 0 : smooth(0.08, 0.32, y);
    const nod = foot ? 0 : smooth(0.36, 0.56, y);
    let special = 0;
    let bone: number = B.tuft;
    if (p === PART.earL || p === PART.earR) {
      bone = p === PART.earL ? B.earL : B.earR;
      special = smooth(0.17, 0.25, Math.abs(x));
    } else if (p === PART.face && y < 0.41 && z > 0.18 && Math.abs(x) < 0.1) {
      bone = B.jaw;
      special = smooth(0.414, 0.398, y);
    } else if (y > 0.72) {
      bone = B.tuft;
      special = smooth(0.72, 0.84, y);
    }
    const rem = 1 - special;
    const head = rem * nod;
    const rem2 = rem * (1 - nod);
    skinIndex.set([bone, B.head, B.waist, B.root], i * 4);
    skinWeight.set([special, head, rem2 * lean, rem2 * (1 - lean)], i * 4);
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
  geo.deleteAttribute('_part');

  // Fur: a velvet sheen does most of what "fur" means at this size; the
  // painted strands and the normal map do the rest. Tripo ships a fully
  // metallic material, which renders the plush black without an env map.
  const srcMat = base.material as THREE.MeshStandardMaterial;
  const material = new THREE.MeshPhysicalMaterial({
    map: srcMat.map,
    normalMap: srcMat.normalMap,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughnessMap: srcMat.roughnessMap,
    roughness: 1,
    metalness: 0,
    sheen: 1,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color('#fff3e6'),
    envMapIntensity: 0.35,
  });
  if (tint) material.color.set(tint);

  const mesh = new THREE.SkinnedMesh(geo, material);
  mesh.name = 'furby';
  // Culled like everything else, against a sphere roomy enough for any pose:
  // the bones nod, lean, squash and hop it at most a hand's width out of its
  // rest shape. Never culling it drew its 130k triangles in every frame, even
  // with the bed behind you.
  geo.computeBoundingSphere();
  mesh.boundingSphere = geo.boundingSphere!.clone();
  mesh.boundingSphere.radius = mesh.boundingSphere.radius * 1.5 + 0.25;
  mesh.add(bones.root);
  // Bind in the rest pose: the inverses come from the bones' world matrices.
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(list), mesh.matrixWorld);
  // Picking goes through simple pick shapes, never the 130k triangles.
  mesh.raycast = () => {};

  // Eyes and the inside of the mouth ride on the head bone.
  const parts = eyeParts();
  const ballMat = new THREE.MeshPhysicalMaterial({ map: parts.iris, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
  const lidMat = new THREE.MeshStandardMaterial({ color: '#e9dcc0', roughness: 0.7 });
  const lashMat = new THREE.MeshStandardMaterial({ color: '#2a2018', roughness: 0.9 });
  const eyes: FurbyRig['eyes'] = [];
  const surface = (cx: number, cy: number) => {
    // Front-most vertex of the face near the iris centre: the eye's surface.
    let best = 0.2;
    for (let i = 0; i < n; i++) {
      if (part && Math.round(part.getX(i)) !== PART.face) continue;
      const dx = pos.getX(i) - cx;
      const dy = pos.getY(i) - cy;
      if (dx * dx + dy * dy < 0.012 * 0.012) best = Math.max(best, pos.getZ(i));
    }
    return best;
  };
  [-1, 1].forEach(side => {
    const front = part ? surface(EYE.x * side, EYE.y) : 0.27;
    const at = new THREE.Vector3(EYE.x * side, EYE.y, front - EYE.r * 0.72).sub(PIVOT.head);
    const socket = new THREE.Group();
    socket.position.copy(at);
    // The painted eyes look a touch outward; so do these.
    socket.rotation.y = side * 0.12;
    const ball = new THREE.Mesh(parts.ball, ballMat);
    ball.raycast = () => {};
    const lid = new THREE.Group();
    const lidMesh = new THREE.Mesh(parts.lid, lidMat);
    const lash = new THREE.Mesh(parts.lash, lashMat);
    lid.add(lidMesh, lash);
    const lower = new THREE.Group();
    const lowerMesh = new THREE.Mesh(parts.lid, lidMat);
    lowerMesh.rotation.x = Math.PI;
    lower.add(lowerMesh);
    socket.add(ball, lid, lower);
    bones.head.add(socket);
    eyes.push({ ball, lid, lower });
  });
  const mouth = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 16, 12),
    new THREE.MeshStandardMaterial({ color: '#3a0710', roughness: 0.9 }),
  );
  mouth.scale.set(1.1, 0.8, 0.7);
  mouth.position.copy(PIVOT.jaw).sub(PIVOT.head).add(new THREE.Vector3(0, -0.005, -0.03));
  bones.head.add(mouth);

  const root = new THREE.Group();
  root.add(mesh);
  return {
    root,
    mesh,
    bones,
    eyes,
    material,
    dispose: () => {
      geo.dispose();
      material.dispose();
      ballMat.dispose();
      lidMat.dispose();
      lashMat.dispose();
      mouth.geometry.dispose();
      (mouth.material as THREE.Material).dispose();
    },
  };
}
