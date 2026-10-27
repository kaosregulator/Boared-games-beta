import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import {
  CHEESE_WHEEL_SPACE_INDEX,
  InteractiveSceneId,
  MOUSE_COLORS,
  MOUSE_META,
  MOUSE_TRAP_SPACES,
  MouseColor,
  MouseTrapGameState,
} from '../mousetrap/mouseTrapRules';
import { soundFX } from './soundStub';

const BOARD_WORLD_SIZE = 1.16;

function uvToLocal(u: number, v: number, y: number = 0): THREE.Vector3 {
  return new THREE.Vector3(u * BOARD_WORLD_SIZE, y, v * BOARD_WORLD_SIZE);
}

export interface LivingMouseRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  earLeft: THREE.Mesh;
  earRight: THREE.Mesh;
  tailMesh: THREE.Mesh;
  noseMesh: THREE.Mesh;
  costumeGroup: THREE.Group;
}

export interface FloatingCheeseRig {
  group: THREE.Group;
  spaceIndex: number;
  baseLocalPos: THREE.Vector3;
  phaseOffset: number;
}

export interface MouseTrap3DSceneHandles {
  rootGroup: THREE.Group;
  boardMesh: THREE.Mesh;
  diceMesh: THREE.Mesh;
  stageGroups: THREE.Group[];
  stagePopProgress: number[];
  poppedUpTrailGroup: THREE.Group;
  interactiveScenesGroup: THREE.Group;
  sceneHitboxes: THREE.Object3D[];
  crankArmGroup: THREE.Group;
  gearMeshes: THREE.Mesh[];
  stopSignGroup: THREE.Group;
  bootPivotGroup: THREE.Group;
  marbleBucketGroup: THREE.Group;
  helpingHandGroup: THREE.Group;
  chromeMarbleMesh: THREE.Mesh;
  bathtubGroup: THREE.Group;
  seesawGroup: THREE.Group;
  diverGroup: THREE.Group;
  redCageGroup: THREE.Group;
  greenCraneGearMesh: THREE.Mesh;
  cageDustPuffs: THREE.Mesh[];
  floatingCheeses: FloatingCheeseRig[];
  mouseRigs: Map<MouseColor, LivingMouseRig>;
  updateLivingMouseTrapScene: (params: {
    elapsed: number;
    dt: number;
    state: MouseTrapGameState;
    activeMouseStepAnim: {
      color: MouseColor;
      stepIndices: number[];
      startIndex: number;
      startTimeMs: number;
    } | null;
    chainReactionStartMs: number | null;
    scenePulseStartMs: number | null;
    nowMs: number;
    mouseControlMode: boolean;
    playerControlWorldPos: THREE.Vector3;
    playerControlYaw: number;
    playerIsMoving: boolean;
  }) => {
    activeActionWorldPos: THREE.Vector3 | null;
    redMouseWorldPos: THREE.Vector3;
    redMouseLookWorldPos: THREE.Vector3;
  };
  triggerPhysicsBump: (strength?: number) => void;
}

// ============================================================================
// PROCEDURAL TOY GEOMETRY BUILDERS (ExtrudeGeometry, LatheGeometry, TubeGeometry)
// ============================================================================

/**
 * Creates a rounded rectangle 2D shape centered at (0, 0).
 */
function makeRoundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  const rad = Math.min(r, hw * 0.9, hh * 0.9);
  shape.moveTo(-hw + rad, -hh);
  shape.lineTo(hw - rad, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + rad);
  shape.lineTo(hw, hh - rad);
  shape.quadraticCurveTo(hw, hh, hw - rad, hh);
  shape.lineTo(-hw + rad, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - rad);
  shape.lineTo(-hw, -hh + rad);
  shape.quadraticCurveTo(-hw, -hh, -hw + rad, -hh);
  return shape;
}

/**
 * Creates an injection-molded horizontal slab with rounded corners and beveled edges.
 */
function createMoldedSlabGeometry(
  w: number,
  d: number,
  thickness: number,
  cornerRadius: number = 0.012,
  bevelSize: number = 0.0025
): THREE.BufferGeometry {
  const shape = makeRoundedRectShape(w, d, cornerRadius);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.002, thickness - bevelSize * 2),
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize,
    bevelThickness: bevelSize,
  });
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a true involute-style toothed gear geometry using ExtrudeGeometry with axle hole and spoke cutouts.
 */
function createExtrudedGearGeometry(
  outerRadius: number,
  rootRadius: number,
  numTeeth: number,
  thickness: number,
  holeRadius: number = 0.006
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / numTeeth;

  for (let i = 0; i < numTeeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.18;
    const a2 = a0 + step * 0.32;
    const a3 = a0 + step * 0.68;
    const a4 = a0 + step * 0.82;

    const p0x = Math.cos(a0) * rootRadius;
    const p0y = Math.sin(a0) * rootRadius;
    if (i === 0) shape.moveTo(p0x, p0y);
    else shape.lineTo(p0x, p0y);

    shape.lineTo(Math.cos(a1) * rootRadius, Math.sin(a1) * rootRadius);
    shape.lineTo(Math.cos(a2) * outerRadius, Math.sin(a2) * outerRadius);
    shape.lineTo(Math.cos(a3) * outerRadius, Math.sin(a3) * outerRadius);
    shape.lineTo(Math.cos(a4) * rootRadius, Math.sin(a4) * rootRadius);
  }
  shape.closePath();

  // Central axle hole
  const axlePath = new THREE.Path();
  axlePath.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
  shape.holes.push(axlePath);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.0014,
    bevelThickness: 0.0014,
  });
  geo.translate(0, 0, -thickness / 2);
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a crisp extruded octagonal Stop Sign (#7) with beveled edges.
 */
function createOctagonStopSignGeometry(
  radius: number,
  thickness: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4 + Math.PI / 8;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.0018,
    bevelThickness: 0.0018,
  });
  geo.translate(0, 0, -thickness / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates an authentic extruded triangular Swiss Cheese wedge with recessed cheese holes.
 */
function createSwissCheeseWedgeGeometry(
  radius: number = 0.028,
  height: number = 0.011
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const angleSpan = Math.PI * 0.34;
  shape.moveTo(0, 0);
  shape.lineTo(Math.cos(-angleSpan / 2) * radius, Math.sin(-angleSpan / 2) * radius);
  shape.absarc(0, 0, radius, -angleSpan / 2, angleSpan / 2, false);
  shape.closePath();

  const h1 = new THREE.Path();
  h1.absarc(radius * 0.56, 0.002, radius * 0.13, 0, Math.PI * 2, true);
  shape.holes.push(h1);

  const h2 = new THREE.Path();
  h2.absarc(radius * 0.74, -0.005, radius * 0.1, 0, Math.PI * 2, true);
  shape.holes.push(h2);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.0012,
    bevelThickness: 0.0012,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(-radius * 0.52, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds the sculpted Green Rubber Boot (#9) with sole, heel, toe box, shaft, and top loop.
 */
function createSculptedBootGroup(
  bootMat: THREE.Material,
  soleMat: THREE.Material,
  isSoftwareGl: boolean
): THREE.Group {
  const bootGroup = new THREE.Group();

  // Upper calf shaft
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0115, 0.01, 0.036, 16),
    bootMat
  );
  shaft.position.set(0, 0.022, 0);
  shaft.castShadow = !isSoftwareGl;
  bootGroup.add(shaft);

  // Top rolled boot cuff
  const cuff = new THREE.Mesh(
    new THREE.TorusGeometry(0.0115, 0.0026, 10, 18).rotateX(Math.PI / 2),
    bootMat
  );
  cuff.position.set(0, 0.04, 0);
  bootGroup.add(cuff);

  // Ankle & Arch
  const ankle = new THREE.Mesh(
    new THREE.SphereGeometry(0.011, 14, 12),
    bootMat
  );
  ankle.position.set(0, 0.008, 0.002);
  bootGroup.add(ankle);

  // Sculpted Toe Box pointing toward -Z (to kick the bucket!)
  const toeGeo = new THREE.SphereGeometry(0.0115, 16, 12);
  toeGeo.scale(0.95, 0.78, 1.48);
  const toeMesh = new THREE.Mesh(toeGeo, bootMat);
  toeMesh.position.set(0, 0.007, -0.012);
  toeMesh.castShadow = !isSoftwareGl;
  bootGroup.add(toeMesh);

  // Molded Sole & Heel Block
  const soleMesh = new THREE.Mesh(
    createMoldedSlabGeometry(0.021, 0.038, 0.0045, 0.008, 0.001),
    soleMat
  );
  soleMesh.position.set(0, 0.0, -0.008);
  bootGroup.add(soleMesh);

  const heelMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.019, 0.006, 0.012),
    soleMat
  );
  heelMesh.position.set(0, -0.002, 0.004);
  bootGroup.add(heelMesh);

  return bootGroup;
}

/**
 * Builds the sculpted open-cavity Red Bathtub (#17) with rolled lip, deep basin, and exit spout.
 */
function createSculptedBathtubGroup(
  redPlasticMat: THREE.Material,
  darkHoleMat: THREE.Material,
  isSoftwareGl: boolean
): THREE.Group {
  const tubGroup = new THREE.Group();

  // Outer tub walls formed by a rounded extruded ring + bottom curved basin
  const outerShape = makeRoundedRectShape(0.068, 0.132, 0.028);
  const innerHole = new THREE.Path();
  const hw = 0.026;
  const hh = 0.056;
  const r = 0.022;
  innerHole.moveTo(-hw + r, -hh);
  innerHole.lineTo(hw - r, -hh);
  innerHole.quadraticCurveTo(hw, -hh, hw, -hh + r);
  innerHole.lineTo(hw, hh - r);
  innerHole.quadraticCurveTo(hw, hh, hw - r, hh);
  innerHole.lineTo(-hw + r, hh);
  innerHole.quadraticCurveTo(-hw, hh, -hw, hh - r);
  innerHole.lineTo(-hw, -hh + r);
  innerHole.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  outerShape.holes.push(innerHole);

  const tubWallGeo = new THREE.ExtrudeGeometry(outerShape, {
    depth: 0.034,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.0025,
    bevelThickness: 0.0025,
  });
  tubWallGeo.rotateX(-Math.PI / 2);
  tubWallGeo.computeVertexNormals();

  const tubWallMesh = new THREE.Mesh(tubWallGeo, redPlasticMat);
  tubWallMesh.castShadow = !isSoftwareGl;
  tubWallMesh.receiveShadow = !isSoftwareGl;
  tubGroup.add(tubWallMesh);

  // Rolled top rim lip around the bathtub
  const rimShape = makeRoundedRectShape(0.076, 0.14, 0.032);
  rimShape.holes.push(innerHole);
  const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
    depth: 0.005,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.002,
    bevelThickness: 0.002,
  });
  rimGeo.rotateX(-Math.PI / 2);
  const rimMesh = new THREE.Mesh(rimGeo, redPlasticMat);
  rimMesh.position.y = 0.033;
  tubGroup.add(rimMesh);

  // Bottom floor slab of the tub
  const floorSlab = new THREE.Mesh(
    createMoldedSlabGeometry(0.064, 0.128, 0.005, 0.026, 0.001),
    redPlasticMat
  );
  floorSlab.position.y = 0.001;
  tubGroup.add(floorSlab);

  // Drain / Marble Drop Exit Hole at front (-Z) end of the bathtub
  const drainHole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.013, 0.013, 0.008, 16),
    darkHoleMat
  );
  drainHole.position.set(0, 0.004, -0.038);
  tubGroup.add(drainHole);

  return tubGroup;
}

/**
 * Builds the Sculpted Green Diver Figurine (#21) with raised arms ready to somersault into the Washtub.
 */
function createSculptedDiverGroup(
  greenPlasticMat: THREE.Material,
  isSoftwareGl: boolean
): THREE.Group {
  const diver = new THREE.Group();

  // Molded circular footpad base
  const baseDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.017, 0.005, 18),
    greenPlasticMat
  );
  baseDisc.position.y = 0.0025;
  diver.add(baseDisc);

  // Legs
  for (const sx of [-0.0045, 0.0045]) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0036, 0.0032, 0.024, 10),
      greenPlasticMat
    );
    leg.position.set(sx, 0.016, 0);
    leg.castShadow = !isSoftwareGl;
    diver.add(leg);
  }

  // Swim trunks & athletic torso
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0082, 0.0062, 0.025, 12),
    greenPlasticMat
  );
  torso.position.set(0, 0.038, 0);
  torso.castShadow = !isSoftwareGl;
  diver.add(torso);

  // Diver Head & Swim Cap
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.0076, 14, 12),
    greenPlasticMat
  );
  head.position.set(0, 0.056, 0.001);
  diver.add(head);

  // Raised Diving Arms poised forward
  for (const sx of [-0.009, 0.009]) {
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0026, 0.0024, 0.024, 8),
      greenPlasticMat
    );
    arm.position.set(sx, 0.056, -0.006);
    arm.rotation.x = -Math.PI * 0.32;
    arm.rotation.z = sx < 0 ? -0.18 : 0.18;
    diver.add(arm);
  }

  return diver;
}

/**
 * Builds the iconic Domed Slotted Red Bell Cage (#23) with 3 tiered rings,
 * 10 curved ribs, golden rivet studs, and top guide sleeve.
 */
function createDomedRedCageGroup(
  redPlasticMat: THREE.Material,
  goldStudMat: THREE.Material,
  isSoftwareGl: boolean
): THREE.Group {
  const cageGroup = new THREE.Group();

  // 3 Horizontal structural rings (wide base skirt, middle waist band, upper crown ring)
  const ringConfigs: [number, number, number][] = [
    [0.058, 0.0052, 0.006],
    [0.048, 0.0045, 0.046],
    [0.031, 0.004, 0.084],
  ];
  for (const [rad, tube, ry] of ringConfigs) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(rad, tube, 12, 28).rotateX(Math.PI / 2),
      redPlasticMat
    );
    ring.position.y = ry;
    ring.castShadow = !isSoftwareGl;
    cageGroup.add(ring);
  }

  // 10 Curved Bell Ribs using CatmullRomCurve3 + TubeGeometry
  const numRibs = 10;
  for (let i = 0; i < numRibs; i++) {
    const angle = (i / numRibs) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const ribCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cos * 0.058, 0.006, sin * 0.058),
      new THREE.Vector3(cos * 0.049, 0.046, sin * 0.049),
      new THREE.Vector3(cos * 0.032, 0.084, sin * 0.032),
      new THREE.Vector3(cos * 0.012, 0.104, sin * 0.012),
    ]);
    const ribGeo = new THREE.TubeGeometry(ribCurve, 16, 0.0034, 8, false);
    const ribMesh = new THREE.Mesh(ribGeo, redPlasticMat);
    ribMesh.castShadow = !isSoftwareGl;
    cageGroup.add(ribMesh);

    // Golden Rivet Studs around lower & middle bands
    const studLow = new THREE.Mesh(
      new THREE.SphereGeometry(0.0036, 8, 8),
      goldStudMat
    );
    studLow.position.set(cos * 0.061, 0.006, sin * 0.061);
    cageGroup.add(studLow);

    const studMid = new THREE.Mesh(
      new THREE.SphereGeometry(0.0032, 8, 8),
      goldStudMat
    );
    studMid.position.set(cos * 0.051, 0.046, sin * 0.051);
    cageGroup.add(studMid);
  }

  // Top guide collar sleeve that slides down the Notched Yellow Pole
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.015, 0.026, 16),
    redPlasticMat
  );
  collar.position.y = 0.108;
  collar.castShadow = !isSoftwareGl;
  cageGroup.add(collar);

  return cageGroup;
}

/**
 * Builds an articulated, sculpted 3D Toy Mouse character on a molded pawn base
 * with arched back, expressive snout, whiskers, concave ears, wagging tail, and Mode 2 outfit.
 */
function createLivingMouseRig(
  color: MouseColor,
  isSoftwareGl: boolean
): LivingMouseRig {
  const meta = MOUSE_META[color];
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const furMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(meta.hex),
    roughness: 0.24,
    metalness: 0.04,
    clearcoat: 0.82,
    clearcoatRoughness: 0.14,
  });
  const earInnerMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(meta.earHex),
    roughness: 0.36,
    clearcoat: 0.4,
  });
  const darkEyeMat = new THREE.MeshPhysicalMaterial({
    color: 0x090a0f,
    roughness: 0.08,
    clearcoat: 1.0,
  });
  const pinkNoseMat = new THREE.MeshPhysicalMaterial({
    color: 0xf43f5e,
    roughness: 0.2,
    clearcoat: 0.85,
  });

  // Molded toy pawn base disc so the mouse sits cleanly on every space
  const baseDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.019, 0.021, 0.0045, 20),
    furMat
  );
  baseDisc.position.y = 0.0022;
  baseDisc.castShadow = !isSoftwareGl;
  baseDisc.receiveShadow = !isSoftwareGl;
  bodyGroup.add(baseDisc);

  // Sculpted Haunches & Arched Mouse Torso
  const haunchGeo = new THREE.SphereGeometry(0.017, 16, 14);
  haunchGeo.scale(1.02, 1.08, 1.15);
  const haunchMesh = new THREE.Mesh(haunchGeo, furMat);
  haunchMesh.position.set(0, 0.018, -0.005);
  haunchMesh.castShadow = !isSoftwareGl;
  bodyGroup.add(haunchMesh);

  const torsoGeo = new THREE.SphereGeometry(0.0155, 16, 14);
  torsoGeo.scale(0.94, 1.12, 1.18);
  const torsoMesh = new THREE.Mesh(torsoGeo, furMat);
  torsoMesh.position.set(0, 0.026, 0.006);
  torsoMesh.castShadow = !isSoftwareGl;
  bodyGroup.add(torsoMesh);

  // Expressive Head & Tapered Snout
  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.0135, 16, 14),
    furMat
  );
  headMesh.position.set(0, 0.038, 0.014);
  headMesh.castShadow = !isSoftwareGl;
  bodyGroup.add(headMesh);

  const snoutGeo = new THREE.ConeGeometry(0.0105, 0.022, 14);
  snoutGeo.rotateX(Math.PI / 2);
  const snoutMesh = new THREE.Mesh(snoutGeo, furMat);
  snoutMesh.position.set(0, 0.036, 0.026);
  bodyGroup.add(snoutMesh);

  // White buck teeth
  const teethMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.0052, 0.004, 0.0018),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
  );
  teethMesh.position.set(0, 0.029, 0.03);
  bodyGroup.add(teethMesh);

  // Twitching Pink Nose
  const noseMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.0042, 10, 10),
    pinkNoseMat
  );
  noseMesh.position.set(0, 0.036, 0.037);
  bodyGroup.add(noseMesh);

  // Delicate Whiskers on both cheeks
  for (const side of [-1, 1]) {
    for (const wy of [-0.08, 0.08]) {
      const whisker = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0005, 0.0005, 0.016, 6).rotateZ(Math.PI / 2),
        darkEyeMat
      );
      whisker.position.set(side * 0.01, 0.034 + wy * 0.015, 0.03);
      whisker.rotation.y = side * -0.25;
      whisker.rotation.z = side * wy;
      bodyGroup.add(whisker);
    }
  }

  // Glossy Eyes with white catchlights
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.0032, 10, 10),
      darkEyeMat
    );
    eye.position.set(side * 0.0072, 0.042, 0.024);
    bodyGroup.add(eye);
  }

  // Iconic Oversized Round Mouse Ears
  const earGeo = new THREE.CylinderGeometry(0.0135, 0.0135, 0.0035, 16);
  earGeo.rotateX(Math.PI / 2);
  const earLeft = new THREE.Mesh(earGeo, furMat);
  earLeft.position.set(-0.0135, 0.049, 0.011);
  earLeft.rotation.y = -0.28;
  earLeft.castShadow = !isSoftwareGl;
  bodyGroup.add(earLeft);

  const earInnerGeo = new THREE.CylinderGeometry(0.0092, 0.0092, 0.004, 14).rotateX(
    Math.PI / 2
  );
  earLeft.add(new THREE.Mesh(earInnerGeo, earInnerMat));

  const earRight = new THREE.Mesh(earGeo, furMat);
  earRight.position.set(0.0135, 0.049, 0.011);
  earRight.rotation.y = 0.28;
  earRight.castShadow = !isSoftwareGl;
  bodyGroup.add(earRight);
  earRight.add(new THREE.Mesh(earInnerGeo, earInnerMat));

  // 4 Molded Scampering Paws
  const pawGeo = new THREE.SphereGeometry(0.0052, 8, 8);
  const pawOffsets: [number, number, number][] = [
    [-0.01, 0.006, 0.012],
    [0.01, 0.006, 0.012],
    [-0.011, 0.024, 0.018],
    [0.011, 0.024, 0.018],
  ];
  for (const [px, py, pz] of pawOffsets) {
    const paw = new THREE.Mesh(pawGeo, earInnerMat);
    paw.position.set(px, py, pz);
    bodyGroup.add(paw);
  }

  // Curled Toy Tail using CatmullRomCurve3 + TubeGeometry
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.0, 0),
    new THREE.Vector3(0, 0.008, -0.016),
    new THREE.Vector3(0.006, 0.018, -0.03),
    new THREE.Vector3(-0.004, 0.028, -0.038),
  ]);
  const tailGeo = new THREE.TubeGeometry(tailCurve, 14, 0.0022, 8, false);
  const tailMesh = new THREE.Mesh(tailGeo, earInnerMat);
  tailMesh.position.set(0, 0.012, -0.014);
  bodyGroup.add(tailMesh);

  // Mode 2 Popped-Up Character Costume Group (Cheese T-Shirt, Glasses & Cap)
  const costumeGroup = new THREE.Group();
  bodyGroup.add(costumeGroup);

  const shirtHex =
    color === 'green'
      ? 0x2563eb
      : color === 'red'
      ? 0xfacc15
      : color === 'blue'
      ? 0xef4444
      : 0x9333ea;
  const shirtMat = new THREE.MeshPhysicalMaterial({
    color: shirtHex,
    roughness: 0.35,
    clearcoat: 0.5,
  });
  const shirtMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0155, 0.0175, 0.018, 14),
    shirtMat
  );
  shirtMesh.position.set(0, 0.024, 0.004);
  costumeGroup.add(shirtMesh);

  // Cap on top of head
  const capColor =
    color === 'green'
      ? 0xd8b4fe
      : color === 'red'
      ? 0x38bdf8
      : color === 'blue'
      ? 0xfde047
      : 0x4ade80;
  const capMat = new THREE.MeshPhysicalMaterial({
    color: capColor,
    roughness: 0.32,
    clearcoat: 0.6,
  });
  const capDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.0105, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    capMat
  );
  capDome.position.set(0, 0.047, 0.012);
  costumeGroup.add(capDome);

  // Glasses frames
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.25,
    metalness: 0.5,
  });
  for (const side of [-1, 1]) {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.0048, 0.001, 6, 12),
      frameMat
    );
    rim.position.set(side * 0.0068, 0.042, 0.026);
    costumeGroup.add(rim);
  }

  return {
    root,
    bodyGroup,
    earLeft,
    earRight,
    tailMesh,
    noseMesh,
    costumeGroup,
  };
}

/**
 * Builds the 3D Numbered Die resting near the front-right corner of the board.
 */
function create3DDiceMesh(isSoftwareGl: boolean): THREE.Mesh {
  const size = 128;
  const makeFaceMat = (pips: [number, number][]) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, size - 6, size - 6);
    ctx.fillStyle = '#0f172a';
    for (const [px, py] of pips) {
      ctx.beginPath();
      ctx.arc(px * size, py * size, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      map: tex,
      roughness: 0.18,
      clearcoat: 0.85,
    });
  };

  const mats = [
    makeFaceMat([[0.5, 0.5]]),
    makeFaceMat([
      [0.28, 0.28],
      [0.72, 0.72],
    ]),
    makeFaceMat([
      [0.26, 0.26],
      [0.5, 0.5],
      [0.74, 0.74],
    ]),
    makeFaceMat([
      [0.28, 0.28],
      [0.72, 0.28],
      [0.28, 0.72],
      [0.72, 0.72],
    ]),
    makeFaceMat([
      [0.26, 0.26],
      [0.74, 0.26],
      [0.5, 0.5],
      [0.26, 0.74],
      [0.74, 0.74],
    ]),
    makeFaceMat([
      [0.28, 0.24],
      [0.72, 0.24],
      [0.28, 0.5],
      [0.72, 0.5],
      [0.28, 0.76],
      [0.72, 0.76],
    ]),
  ];

  const diceMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.036, 0.036, 0.036),
    mats
  );
  diceMesh.position.set(0.39, 0.034, 0.43);
  diceMesh.castShadow = !isSoftwareGl;
  diceMesh.receiveShadow = !isSoftwareGl;
  return diceMesh;
}

// ============================================================================
// MAIN 3D MOUSE TRAP BUILDER — ULTIMATE NOSTALGIA REMASTER
// ============================================================================

export function buildMouseTrap3DScene(
  boardTexture: THREE.Texture,
  isSoftwareGl: boolean
): MouseTrap3DSceneHandles {
  const rootGroup = new THREE.Group();

  // =========================================================================
  // 1. PROFESSIONAL INJECTION-MOLDED TOY MATERIAL LIBRARY
  // =========================================================================
  const makeToyPlastic = (hex: number, roughness = 0.24, metalness = 0.02) =>
    new THREE.MeshPhysicalMaterial({
      color: hex,
      roughness,
      metalness,
      clearcoat: 0.78,
      clearcoatRoughness: 0.14,
      reflectivity: 0.85,
    });

  const yellowPlastic = makeToyPlastic(0xeab308, 0.22);
  const redPlastic = makeToyPlastic(0xdc2626, 0.2);
  const bluePlastic = makeToyPlastic(0x0284c7, 0.22);
  const greenPlastic = makeToyPlastic(0x16a34a, 0.22);
  const orangePlastic = makeToyPlastic(0xea580c, 0.22);
  const purplePlastic = makeToyPlastic(0x7e22ce, 0.24);
  const whitePlastic = makeToyPlastic(0xf1f5f9, 0.22);
  const darkHoleMat = new THREE.MeshStandardMaterial({
    color: 0x090a0f,
    roughness: 0.85,
  });

  // Matte molded rubber for Green Boot (#9) & Stop Sign Band
  const rubberGreenMat = new THREE.MeshPhysicalMaterial({
    color: 0x15803d,
    roughness: 0.55,
    metalness: 0.02,
    clearcoat: 0.18,
  });
  const rubberSoleMat = new THREE.MeshStandardMaterial({
    color: 0x052e16,
    roughness: 0.78,
  });

  // Brushed Steel & Mirror Chrome Marble
  const steelRailMat = new THREE.MeshPhysicalMaterial({
    color: 0x94a3b8,
    roughness: 0.28,
    metalness: 0.68,
    clearcoat: 0.45,
  });
  const chromeMetal = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    roughness: 0.05,
    metalness: 0.96,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });
  const cheeseMat = new THREE.MeshPhysicalMaterial({
    color: 0xfacc15,
    roughness: 0.28,
    metalness: 0.02,
    clearcoat: 0.45,
    emissive: 0xb45309,
    emissiveIntensity: 0.08,
  });

  // =========================================================================
  // 2. MANUFACTURED PHYSICAL BOARD BASE, BEVELED FRAME & MOLDED TRACK
  // =========================================================================
  // Beveled dark bound outer board frame
  const outerFrameGeo = createMoldedSlabGeometry(
    BOARD_WORLD_SIZE + 0.036,
    BOARD_WORLD_SIZE + 0.036,
    0.015,
    0.018,
    0.003
  );
  const outerFrameMat = new THREE.MeshPhysicalMaterial({
    color: 0x14110f,
    roughness: 0.45,
    clearcoat: 0.35,
  });
  const outerFrameMesh = new THREE.Mesh(outerFrameGeo, outerFrameMat);
  outerFrameMesh.position.y = 0.001;
  outerFrameMesh.castShadow = !isSoftwareGl;
  outerFrameMesh.receiveShadow = !isSoftwareGl;
  rootGroup.add(outerFrameMesh);

  // Printed Semi-Gloss Laminated Game Board Surface
  const boardGeo = new THREE.BoxGeometry(BOARD_WORLD_SIZE, 0.016, BOARD_WORLD_SIZE);
  const boardTopMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: boardTexture,
    roughness: 0.48,
    metalness: 0.02,
  });
  const boardSideMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.72,
  });
  const boardMesh = new THREE.Mesh(boardGeo, [
    boardSideMat,
    boardSideMat,
    boardTopMat,
    boardSideMat,
    boardSideMat,
    boardSideMat,
  ]);
  boardMesh.position.y = 0.008;
  boardMesh.receiveShadow = !isSoftwareGl;
  boardMesh.castShadow = !isSoftwareGl;
  rootGroup.add(boardMesh);

  // Tactile 3D Molded Rim Pads on every space even in Classic Mode so spaces look manufactured
  const classicTrackPadsGroup = new THREE.Group();
  rootGroup.add(classicTrackPadsGroup);

  MOUSE_TRAP_SPACES.forEach((sp, idx) => {
    const pos = uvToLocal(sp.u, sp.v, 0.016);
    if (sp.type === 'cheese_wheel') {
      // Sculpted 3D Golden Swiss Cheese Wheel Platform at space 32
      const cwGroup = new THREE.Group();
      cwGroup.position.copy(pos);
      const wheelCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.072, 0.008, 28),
        cheeseMat
      );
      wheelCyl.position.y = 0.004;
      wheelCyl.receiveShadow = !isSoftwareGl;
      cwGroup.add(wheelCyl);

      for (const [hx, hz, hr] of [
        [-0.024, -0.018, 0.009],
        [0.022, -0.02, 0.008],
        [-0.025, 0.018, 0.0085],
        [0.024, 0.018, 0.01],
      ]) {
        const dimple = new THREE.Mesh(
          new THREE.CylinderGeometry(hr, hr, 0.009, 14),
          orangePlastic
        );
        dimple.position.set(hx, 0.0045, hz);
        cwGroup.add(dimple);
      }
      classicTrackPadsGroup.add(cwGroup);
      return;
    }

    // Subtle 3D molded rim around each space
    const nextIdx = idx === 35 ? 30 : idx + 1;
    const prevIdx = idx === 0 ? 0 : idx - 1;
    const nextSp = MOUSE_TRAP_SPACES[nextIdx] ?? sp;
    const prevSp = MOUSE_TRAP_SPACES[prevIdx] ?? sp;
    const yaw = Math.atan2(nextSp.u - prevSp.u, nextSp.v - prevSp.v);

    const rimColor =
      sp.type === 'cheese_1' || sp.type === 'cheese_2'
        ? yellowPlastic
        : sp.type === 'build'
        ? bluePlastic
        : sp.type === 'turn_crank'
        ? orangePlastic
        : sp.type === 'safe'
        ? greenPlastic
        : purplePlastic;

    const padRing = new THREE.Mesh(
      createMoldedSlabGeometry(0.056, 0.044, 0.0032, 0.009, 0.0008),
      rimColor
    );
    padRing.position.copy(pos);
    padRing.rotation.y = yaw;
    padRing.receiveShadow = !isSoftwareGl;
    classicTrackPadsGroup.add(padRing);
  });

  // =========================================================================
  // 3. MODE 2: POPPED-UP 3D MOLDED SQUARE TRAIL, GUARDRAILS & CHEESE TOWERS
  // =========================================================================
  const poppedUpTrailGroup = new THREE.Group();
  rootGroup.add(poppedUpTrailGroup);

  MOUSE_TRAP_SPACES.forEach((sp, idx) => {
    const pos = uvToLocal(sp.u, sp.v, 0.016);
    const nextIdx = idx === 35 ? 30 : idx + 1;
    const prevIdx = idx === 0 ? 0 : idx - 1;
    const nextSp = MOUSE_TRAP_SPACES[nextIdx] ?? sp;
    const prevSp = MOUSE_TRAP_SPACES[prevIdx] ?? sp;
    const tangentYaw = Math.atan2(nextSp.u - prevSp.u, nextSp.v - prevSp.v);

    if (sp.type === 'cheese_wheel') {
      const cwDrum = new THREE.Mesh(
        new THREE.CylinderGeometry(0.072, 0.076, 0.022, 28),
        cheeseMat
      );
      cwDrum.position.set(pos.x, pos.y + 0.011, pos.z);
      cwDrum.castShadow = !isSoftwareGl;
      cwDrum.receiveShadow = !isSoftwareGl;
      poppedUpTrailGroup.add(cwDrum);
      return;
    }

    const tileGroup = new THREE.Group();
    tileGroup.position.copy(pos);
    tileGroup.rotation.y = tangentYaw;

    const tileMat =
      sp.type === 'cheese_1' || sp.type === 'cheese_2'
        ? yellowPlastic
        : sp.type === 'build'
        ? bluePlastic
        : sp.type === 'turn_crank'
        ? orangePlastic
        : sp.type === 'safe'
        ? greenPlastic
        : sp.type === 'fat_cat' || sp.type === 'mad_dog' || sp.type === 'dog_bone'
        ? redPlastic
        : purplePlastic;

    const cushionMesh = new THREE.Mesh(
      createMoldedSlabGeometry(0.062, 0.048, 0.014, 0.01, 0.002),
      tileMat
    );
    cushionMesh.castShadow = !isSoftwareGl;
    cushionMesh.receiveShadow = !isSoftwareGl;
    tileGroup.add(cushionMesh);

    // Metallic Side Guardrails & Rivet Bolts
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(
        createMoldedSlabGeometry(0.007, 0.052, 0.019, 0.003, 0.001),
        steelRailMat
      );
      rail.position.set(side * 0.033, 0.002, 0);
      tileGroup.add(rail);

      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0032, 0.0032, 0.005, 8).rotateZ(Math.PI / 2),
        purplePlastic
      );
      bolt.position.set(side * 0.036, 0.009, 0);
      tileGroup.add(bolt);
    }

    // Stacked Swiss Cheese Block Towers on Cheese spaces
    if (sp.type === 'cheese_1' || sp.type === 'cheese_2') {
      const stackCount = sp.type === 'cheese_2' ? 3 : 2;
      for (let c = 0; c < stackCount; c++) {
        const block = new THREE.Mesh(
          createMoldedSlabGeometry(0.018, 0.018, 0.012, 0.004, 0.001),
          cheeseMat
        );
        block.position.set(-0.022, 0.014 + c * 0.012, 0);
        block.rotation.y = c * 0.25;
        block.castShadow = !isSoftwareGl;
        tileGroup.add(block);
      }
    }

    poppedUpTrailGroup.add(tileGroup);
  });

  // =========================================================================
  // 4. CONNECTED 5-STAGE RUBE GOLDBERG MECHANICAL CONTRAPTION
  // =========================================================================
  // Every component is physically positioned so the chain reaction connects
  // seamlessly from Stage 1 -> Stage 2 -> Stage 3 -> Stage 4 -> Stage 5 -> Cheese Wheel!
  const stageGroups: THREE.Group[] = [];
  const stagePopProgress = [0, 0, 0, 0, 0];
  const gearMeshes: THREE.Mesh[] = [];

  // -------------------------------------------------------------------------
  // STAGE 1: GEAR SUPPORT BASE (#1), HAND CRANK (#2) & INTERLOCKING GEARS (#3, #4, #5)
  // Positioned at lower-middle-right: (0.00, 0, 0.21) to (0.14, 0, 0.21)
  // -------------------------------------------------------------------------
  const stage1Group = new THREE.Group();
  rootGroup.add(stage1Group);
  stageGroups.push(stage1Group);

  // Molded Yellow Gear Base Plate (#1) with side support A-frames
  const gearBasePlate = new THREE.Mesh(
    createMoldedSlabGeometry(0.24, 0.095, 0.014, 0.018, 0.002),
    yellowPlastic
  );
  gearBasePlate.position.set(0.06, 0.016, 0.21);
  gearBasePlate.castShadow = !isSoftwareGl;
  gearBasePlate.receiveShadow = !isSoftwareGl;
  stage1Group.add(gearBasePlate);

  // Twin vertical A-frame gear support towers on the base
  for (const gx of [-0.01, 0.065]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.012, 0.095, 16),
      yellowPlastic
    );
    post.position.set(gx, 0.068, 0.21);
    post.castShadow = !isSoftwareGl;
    stage1Group.add(post);
  }

  // Gear #3: Vertical Toothed Blue Drive Gear driven directly by Hand Crank (#2)
  const gear3Geo = createExtrudedGearGeometry(0.036, 0.027, 12, 0.01, 0.006);
  gear3Geo.rotateX(Math.PI / 2); // Vertical orientation in XY plane
  const gear3Mesh = new THREE.Mesh(gear3Geo, bluePlastic);
  gear3Mesh.position.set(-0.01, 0.095, 0.21);
  gear3Mesh.castShadow = !isSoftwareGl;
  stage1Group.add(gear3Mesh);
  gearMeshes.push(gear3Mesh);

  // Hand Crank (#2) attached to Gear #3 axle
  const crankArmGroup = new THREE.Group();
  crankArmGroup.position.set(-0.01, 0.095, 0.232);
  stage1Group.add(crankArmGroup);

  const crankAxle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0055, 0.0055, 0.036, 12).rotateX(Math.PI / 2),
    steelRailMat
  );
  crankAxle.position.z = -0.01;
  crankArmGroup.add(crankAxle);

  const crankArm = new THREE.Mesh(
    createMoldedSlabGeometry(0.012, 0.034, 0.008, 0.004, 0.001).rotateX(Math.PI / 2),
    redPlastic
  );
  crankArm.position.set(0, 0.014, 0.004);
  crankArmGroup.add(crankArm);

  const crankKnob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.024, 12).rotateX(Math.PI / 2),
    yellowPlastic
  );
  crankKnob.position.set(0, 0.028, 0.016);
  crankArmGroup.add(crankKnob);

  // Gear #5: Horizontal Toothed Yellow Pinion Gear meshing with Gear #3 & Gear #4
  const gear5Geo = createExtrudedGearGeometry(0.038, 0.029, 12, 0.01, 0.006);
  const gear5Mesh = new THREE.Mesh(gear5Geo, yellowPlastic);
  gear5Mesh.position.set(0.065, 0.088, 0.21);
  gear5Mesh.castShadow = !isSoftwareGl;
  stage1Group.add(gear5Mesh);
  gearMeshes.push(gear5Mesh);

  // Gear #4: Vertical Red Spur Gear with cam pin that pushes the Stop Sign lever (#6)!
  const gear4Geo = createExtrudedGearGeometry(0.042, 0.032, 14, 0.01, 0.006);
  gear4Geo.rotateX(Math.PI / 2);
  const gear4Mesh = new THREE.Mesh(gear4Geo, redPlastic);
  gear4Mesh.position.set(0.115, 0.095, 0.195);
  gear4Mesh.castShadow = !isSoftwareGl;
  stage1Group.add(gear4Mesh);
  gearMeshes.push(gear4Mesh);

  // -------------------------------------------------------------------------
  // STAGE 2: SPRING-LOADED LEVER (#6), OCTAGONAL RED STOP SIGN (#7),
  //          ORNATE YELLOW STREETLAMP (#8) & SWINGING GREEN RUBBER BOOT (#9)
  // Connects directly from Gear #4 (0.115, 0.095, 0.195) -> Stop Sign (0.175, 0.09, 0.175)
  // -> Streetlamp Boot at (0.24, 0.165, 0.055) right behind the Yellow Bucket!
  // -------------------------------------------------------------------------
  const stage2Group = new THREE.Group();
  rootGroup.add(stage2Group);
  stageGroups.push(stage2Group);

  // Molded Red Stop Sign & Lever Bracket (#6, #7)
  const stopSignGroup = new THREE.Group();
  stopSignGroup.position.set(0.16, 0.016, 0.185);
  stage2Group.add(stopSignGroup);

  // Horizontal L-bar connecting from Gear #4 cam to the Stop Sign post
  const leverBar = new THREE.Mesh(
    createMoldedSlabGeometry(0.095, 0.016, 0.012, 0.005, 0.001),
    redPlastic
  );
  leverBar.position.set(-0.02, 0.072, 0);
  leverBar.castShadow = !isSoftwareGl;
  stopSignGroup.add(leverBar);

  const stopPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0065, 0.008, 0.125, 14),
    redPlastic
  );
  stopPost.position.set(0.025, 0.062, -0.01);
  stopPost.castShadow = !isSoftwareGl;
  stopSignGroup.add(stopPost);

  const stopOctagon = new THREE.Mesh(
    createOctagonStopSignGeometry(0.032, 0.007),
    redPlastic
  );
  stopOctagon.position.set(0.025, 0.125, -0.01);
  stopOctagon.castShadow = !isSoftwareGl;
  stopSignGroup.add(stopOctagon);

  // White inner border on Stop Sign
  const stopRim = new THREE.Mesh(
    new THREE.RingGeometry(0.022, 0.026, 8),
    whitePlastic
  );
  stopRim.rotation.z = Math.PI / 8;
  stopRim.position.set(0.025, 0.125, -0.0055);
  stopSignGroup.add(stopRim);

  // Ornate Yellow Streetlamp Post (#8) standing at (0.24, 0.016, 0.145)
  const lampBase = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.028, 0),
        new THREE.Vector2(0.024, 0.012),
        new THREE.Vector2(0.012, 0.028),
        new THREE.Vector2(0.008, 0.045),
      ],
      20
    ),
    yellowPlastic
  );
  lampBase.position.set(0.24, 0.016, 0.145);
  lampBase.castShadow = !isSoftwareGl;
  stage2Group.add(lampBase);

  const lampPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0065, 0.008, 0.255, 16),
    yellowPlastic
  );
  lampPole.position.set(0.24, 0.144, 0.145);
  lampPole.castShadow = !isSoftwareGl;
  stage2Group.add(lampPole);

  // Overhanging Streetlamp Arm extending toward -Z (over the Boot & Bucket!)
  const lampArm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0055, 0.0055, 0.135, 12).rotateX(Math.PI / 2),
    yellowPlastic
  );
  lampArm.position.set(0.24, 0.268, 0.095);
  lampArm.castShadow = !isSoftwareGl;
  stage2Group.add(lampArm);

  // Ornate S-scroll bracket under the streetlamp arm
  const scrollCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.24, 0.21, 0.145),
    new THREE.Vector3(0.24, 0.235, 0.125),
    new THREE.Vector3(0.24, 0.25, 0.105),
    new THREE.Vector3(0.24, 0.268, 0.085),
  ]);
  const scrollMesh = new THREE.Mesh(
    new THREE.TubeGeometry(scrollCurve, 16, 0.0035, 8, false),
    yellowPlastic
  );
  stage2Group.add(scrollMesh);

  // Decorative Streetlamp Lantern Bulb
  const lanternBulb = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.002, 0),
        new THREE.Vector2(0.014, 0.012),
        new THREE.Vector2(0.018, 0.024),
        new THREE.Vector2(0.008, 0.036),
        new THREE.Vector2(0.004, 0.044),
      ],
      16
    ),
    yellowPlastic
  );
  lanternBulb.position.set(0.24, 0.222, 0.108);
  stage2Group.add(lanternBulb);

  // Swinging Green Boot Pivot (#9) hanging at (0.24, 0.268, 0.042)
  // When it swings forward (-Z), the boot at y = 0.155 strikes the Yellow Bucket at (0.24, 0.155, -0.015)!
  const bootPivotGroup = new THREE.Group();
  bootPivotGroup.position.set(0.24, 0.268, 0.042);
  stage2Group.add(bootPivotGroup);

  const bootHangerRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0042, 0.0042, 0.092, 12),
    greenPlastic
  );
  bootHangerRod.position.y = -0.046;
  bootHangerRod.castShadow = !isSoftwareGl;
  bootPivotGroup.add(bootHangerRod);

  const sculptedBoot = createSculptedBootGroup(
    rubberGreenMat,
    rubberSoleMat,
    isSoftwareGl
  );
  sculptedBoot.position.set(0, -0.118, 0);
  bootPivotGroup.add(sculptedBoot);

  // -------------------------------------------------------------------------
  // STAGE 3: MOLDED 6-STEP ZIG-ZAG BLUE STAIRS (#10), TIPPING BUCKET (#11)
  //          & CURVED RED MARBLE CHUTE (#12)
  // Stairs ascend along +X from (0.07, 0.09, -0.02) up to (0.24, 0.152, -0.02)
  // where the Yellow Bucket (#11) sits right in front of the Green Boot!
  // -------------------------------------------------------------------------
  const stage3Group = new THREE.Group();
  rootGroup.add(stage3Group);
  stageGroups.push(stage3Group);

  const stairsGroup = new THREE.Group();
  stage3Group.add(stairsGroup);

  // 6 Molded Zig-Zag Blue Steps ascending from x=0.07 (y=0.095) up to x=0.22 (y=0.148) at z=-0.02
  const numSteps = 6;
  for (let s = 0; s < numSteps; s++) {
    const sx = 0.07 + s * 0.03;
    const sy = 0.095 + s * 0.0105;
    const stepTread = new THREE.Mesh(
      createMoldedSlabGeometry(0.034, 0.068, 0.011, 0.005, 0.0015),
      bluePlastic
    );
    stepTread.position.set(sx, sy, -0.02);
    stepTread.castShadow = !isSoftwareGl;
    stepTread.receiveShadow = !isSoftwareGl;
    stairsGroup.add(stepTread);
  }

  // Side zig-zag staircase stringer walls with center guide ridge
  for (const sz of [-0.056, 0.016]) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.185, 0.022, 0.008),
      bluePlastic
    );
    wall.position.set(0.145, 0.128, sz);
    wall.rotation.z = 0.31;
    wall.castShadow = !isSoftwareGl;
    stairsGroup.add(wall);
  }

  // 4 Molded Blue Support Legs under the Staircase
  const stairLegs: [number, number, number][] = [
    [0.07, 0.095, -0.048],
    [0.07, 0.095, 0.008],
    [0.22, 0.148, -0.048],
    [0.22, 0.148, 0.008],
  ];
  for (const [lx, lh, lz] of stairLegs) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.007, 0.009, lh, 12),
      bluePlastic
    );
    leg.position.set(lx, 0.016 + lh / 2, lz);
    leg.castShadow = !isSoftwareGl;
    stairsGroup.add(leg);
  }

  // Hinged Yellow Tipping Marble Bucket (#11) perched at top of the Blue Stairs at (0.23, 0.162, -0.02)
  const marbleBucketGroup = new THREE.Group();
  marbleBucketGroup.position.set(0.23, 0.162, -0.02);
  stage3Group.add(marbleBucketGroup);

  // Open hollow bucket cup using LatheGeometry
  const bucketLathe = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.014, 0),
      new THREE.Vector2(0.018, 0.028),
      new THREE.Vector2(0.02, 0.032),
      new THREE.Vector2(0.016, 0.032),
      new THREE.Vector2(0.012, 0.004),
      new THREE.Vector2(0, 0.004),
    ],
    20
  );
  bucketLathe.rotateZ(Math.PI * 0.32); // Tilted slightly toward the stairs
  const bucketMesh = new THREE.Mesh(bucketLathe, yellowPlastic);
  bucketMesh.castShadow = !isSoftwareGl;
  marbleBucketGroup.add(bucketMesh);

  // Curvy Red Marble Chute (#12) sweeping from the bottom of the Blue Stairs (0.06, 0.092, -0.02)
  // around an S-curve to the Helping Hand / Plumbing Tower at (-0.18, 0.065, -0.02)!
  const chuteCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.062, 0.092, -0.02),
    new THREE.Vector3(0.01, 0.084, 0.045),
    new THREE.Vector3(-0.065, 0.076, -0.035),
    new THREE.Vector3(-0.135, 0.068, 0.015),
    new THREE.Vector3(-0.195, 0.062, -0.02),
  ]);

  // Center chute trough + twin raised side rails
  const chuteMainTube = new THREE.Mesh(
    new THREE.TubeGeometry(chuteCurve, 36, 0.011, 12, false),
    redPlastic
  );
  chuteMainTube.scale.set(1, 0.55, 1);
  chuteMainTube.position.y = 0.028;
  chuteMainTube.castShadow = !isSoftwareGl;
  stage3Group.add(chuteMainTube);

  for (const offsetZ of [-0.012, 0.012]) {
    const railPts = chuteCurve.getPoints(24).map(
      (p) => new THREE.Vector3(p.x, p.y + 0.006, p.z + offsetZ)
    );
    const railCurve = new THREE.CatmullRomCurve3(railPts);
    const railMesh = new THREE.Mesh(
      new THREE.TubeGeometry(railCurve, 32, 0.0042, 8, false),
      redPlastic
    );
    stage3Group.add(railMesh);
  }

  // Support legs under the Red Chute
  for (const [cx, cy, cz] of [
    [0.01, 0.084, 0.045],
    [-0.065, 0.076, -0.035],
    [-0.135, 0.068, 0.015],
  ]) {
    const cLeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0055, 0.007, cy, 10),
      redPlastic
    );
    cLeg.position.set(cx, 0.016 + cy / 2, cz);
    stage3Group.add(cLeg);
  }

  // Heavy Chrome Steel Marble resting in the Yellow Tipping Bucket
  const chromeMarbleMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.014, 24, 24),
    chromeMetal
  );
  chromeMarbleMesh.position.set(0.225, 0.174, -0.02);
  chromeMarbleMesh.castShadow = !isSoftwareGl;
  stage3Group.add(chromeMarbleMesh);

  // -------------------------------------------------------------------------
  // STAGE 4: HELPING HAND ROD (#13), BLUE PLUMBING TOWER (#14),
  //          RED BATHTUB RAMP (#17), SEE-SAW LEVER (#20) & GREEN DIVER (#21)
  // Positioned along the left interior spine (-0.22, 0, -0.02 to -0.22)
  // -------------------------------------------------------------------------
  const stage4Group = new THREE.Group();
  rootGroup.add(stage4Group);
  stageGroups.push(stage4Group);

  // Twin-Pipe Blue Plumbing Tower (#14) at (-0.22, 0.016, -0.02)
  const plumbingBase = new THREE.Mesh(
    createMoldedSlabGeometry(0.092, 0.092, 0.014, 0.016, 0.002),
    bluePlastic
  );
  plumbingBase.position.set(-0.22, 0.016, -0.02);
  stage4Group.add(plumbingBase);

  for (const px of [-0.242, -0.198]) {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0075, 0.0085, 0.255, 14),
      bluePlastic
    );
    pipe.position.set(px, 0.144, -0.02);
    pipe.castShadow = !isSoftwareGl;
    stage4Group.add(pipe);
  }

  // Plumbing cross-pipes & decorative valve wheel
  for (const py of [0.085, 0.155, 0.225]) {
    const crossPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.052, 10).rotateZ(Math.PI / 2),
      bluePlastic
    );
    crossPipe.position.set(-0.22, py, -0.02);
    stage4Group.add(crossPipe);
  }

  // Helping Hand Rod (#13) inside the Plumbing Tower that drops when struck by the first marble
  // and releases the upper marble into the Red Bathtub!
  const helpingHandGroup = new THREE.Group();
  helpingHandGroup.position.set(-0.22, 0.248, -0.02);
  stage4Group.add(helpingHandGroup);

  const handRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0038, 0.0038, 0.18, 10),
    greenPlastic
  );
  handRod.position.y = -0.08;
  helpingHandGroup.add(handRod);

  const topHandPusher = new THREE.Mesh(
    createMoldedSlabGeometry(0.028, 0.042, 0.01, 0.008, 0.0015),
    greenPlastic
  );
  topHandPusher.position.set(0, 0.008, -0.018);
  helpingHandGroup.add(topHandPusher);

  // Sculpted Open-Cavity Red Bathtub (#17) perched atop the Plumbing Tower at (-0.22, 0.215, -0.085)
  const bathtubGroup = createSculptedBathtubGroup(
    redPlastic,
    darkHoleMat,
    isSoftwareGl
  );
  bathtubGroup.position.set(-0.22, 0.205, -0.088);
  bathtubGroup.rotation.x = -0.22; // Tilted toward the front drain hole at z = -0.13
  stage4Group.add(bathtubGroup);

  // Molded Yellow See-Saw Base & Hinged Blue Lever (#20) at (-0.22, 0.016, -0.165)
  // Back end of See-Saw sits at z = -0.125 directly under the Bathtub drain hole!
  // Front end of See-Saw sits at z = -0.205 directly under the Green Diver (#21)!
  const seesawBase = new THREE.Mesh(
    createMoldedSlabGeometry(0.068, 0.125, 0.018, 0.014, 0.002),
    yellowPlastic
  );
  seesawBase.position.set(-0.22, 0.016, -0.165);
  stage4Group.add(seesawBase);

  const seesawGroup = new THREE.Group();
  seesawGroup.position.set(-0.22, 0.042, -0.165);
  stage4Group.add(seesawGroup);

  const seesawPlank = new THREE.Mesh(
    createMoldedSlabGeometry(0.036, 0.115, 0.009, 0.008, 0.0015),
    bluePlastic
  );
  seesawPlank.castShadow = !isSoftwareGl;
  seesawGroup.add(seesawPlank);

  // Sculpted Green Diver Figurine (#21) poised on the launch pad at (-0.22, 0.048, -0.205)
  const diverGroup = createSculptedDiverGroup(greenPlastic, isSoftwareGl);
  diverGroup.position.set(-0.22, 0.048, -0.205);
  // Face toward the Yellow Washtub at (-0.175, 0.025, -0.275)
  diverGroup.rotation.y = -0.52;
  stage4Group.add(diverGroup);

  // -------------------------------------------------------------------------
  // STAGE 5: YELLOW WASHTUB (#19), NOTCHED POLE (#22), GIANT GREEN CRANE GEAR
  //          & DOMED SLOTTED RED BELL CAGE (#23) OVER THE CHEESE WHEEL!
  // -------------------------------------------------------------------------
  const stage5Group = new THREE.Group();
  rootGroup.add(stage5Group);
  stageGroups.push(stage5Group);

  const cwSp = MOUSE_TRAP_SPACES[CHEESE_WHEEL_SPACE_INDEX];
  const cwPos = uvToLocal(cwSp.u, cwSp.v, 0.016); // (-0.0812, 0.016, -0.2784)

  // Molded Red Base Plate connecting the Yellow Washtub (#19) to the Cheese Wheel Notched Pole (#22)
  const trapLinkPlate = new THREE.Mesh(
    createMoldedSlabGeometry(0.165, 0.095, 0.012, 0.022, 0.002),
    redPlastic
  );
  trapLinkPlate.position.set(cwPos.x - 0.055, 0.016, cwPos.z);
  trapLinkPlate.castShadow = !isSoftwareGl;
  stage5Group.add(trapLinkPlate);

  // Open Hollow Ribbed Yellow Washtub (#19) at (cwPos.x - 0.095, 0.026, cwPos.z)
  const washtubLathe = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.038, 0),
      new THREE.Vector2(0.044, 0.048),
      new THREE.Vector2(0.047, 0.052),
      new THREE.Vector2(0.041, 0.052),
      new THREE.Vector2(0.035, 0.006),
      new THREE.Vector2(0, 0.006),
    ],
    24
  );
  const washtubMesh = new THREE.Mesh(washtubLathe, yellowPlastic);
  washtubMesh.position.set(cwPos.x - 0.095, 0.026, cwPos.z);
  washtubMesh.castShadow = !isSoftwareGl;
  washtubMesh.receiveShadow = !isSoftwareGl;
  stage5Group.add(washtubMesh);

  // Tall Notched Yellow Pole (#22) rising from the edge of the Cheese Wheel
  // with an overhanging top arm centered at (cwPos.x, y, cwPos.z) so the Red Cage drops straight over the mouse!
  const poleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(cwPos.x - 0.032, 0.022, cwPos.z - 0.032),
    new THREE.Vector3(cwPos.x - 0.028, 0.075, cwPos.z - 0.028),
    new THREE.Vector3(cwPos.x, 0.11, cwPos.z),
    new THREE.Vector3(cwPos.x, 0.34, cwPos.z),
  ]);
  const notchedPoleMesh = new THREE.Mesh(
    new THREE.TubeGeometry(poleCurve, 28, 0.0058, 12, false),
    yellowPlastic
  );
  notchedPoleMesh.castShadow = !isSoftwareGl;
  stage5Group.add(notchedPoleMesh);

  // Molded horizontal ratchet notches along the vertical pole shaft
  for (let ny = 0.13; ny <= 0.31; ny += 0.018) {
    const notch = new THREE.Mesh(
      new THREE.TorusGeometry(0.0072, 0.0018, 6, 12).rotateX(Math.PI / 2),
      yellowPlastic
    );
    notch.position.set(cwPos.x, ny, cwPos.z);
    stage5Group.add(notch);
  }

  // Giant Green Crane Gear at top of the Notched Pole
  const craneGearGeo = createExtrudedGearGeometry(0.036, 0.027, 10, 0.012, 0.006);
  craneGearGeo.rotateX(Math.PI / 2);
  const greenCraneGearMesh = new THREE.Mesh(craneGearGeo, greenPlastic);
  greenCraneGearMesh.position.set(cwPos.x, 0.345, cwPos.z);
  greenCraneGearMesh.castShadow = !isSoftwareGl;
  stage5Group.add(greenCraneGearMesh);

  // Domed Slotted Red Bell Cage (#23) perched at top of the Notched Pole (y = 0.215)
  // When triggered, it slides straight down to y = 0.018 to enclose the mouse on the Cheese Wheel!
  const redCageGroup = createDomedRedCageGroup(
    redPlastic,
    yellowPlastic,
    isSoftwareGl
  );
  redCageGroup.position.set(cwPos.x, 0.215, cwPos.z);
  stage5Group.add(redCageGroup);

  // 8 Cartoon Dust Puffs that burst around the Cheese Wheel when the Red Cage slams shut
  const cageDustPuffs: THREE.Mesh[] = [];
  const dustMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    roughness: 0.75,
    transparent: true,
    opacity: 0.85,
  });
  for (let d = 0; d < 8; d++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 10), dustMat);
    puff.visible = false;
    stage5Group.add(puff);
    cageDustPuffs.push(puff);
  }

  // =========================================================================
  // 5. MODE 2 INTERACTIVE 3D SCENES (OUTSIDE PERIMETER SO THEY NEVER CLUTTER THE BOARD)
  // =========================================================================
  const interactiveScenesGroup = new THREE.Group();
  rootGroup.add(interactiveScenesGroup);
  const sceneHitboxes: THREE.Object3D[] = [];

  // Scene A: Bubbling Molten Cheese Vat Mixer (North-West Corner)
  const cheeseVatGroup = new THREE.Group();
  cheeseVatGroup.position.set(-0.48, 0.016, -0.48);
  interactiveScenesGroup.add(cheeseVatGroup);

  const vatTub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.056, 0.068, 20),
    bluePlastic
  );
  vatTub.position.y = 0.034;
  vatTub.castShadow = !isSoftwareGl;
  vatTub.userData = { sceneId: 'cheese_vat' as InteractiveSceneId };
  cheeseVatGroup.add(vatTub);
  sceneHitboxes.push(vatTub);

  const moltenCheeseTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.058, 0.058, 0.012, 20),
    cheeseMat
  );
  moltenCheeseTop.position.y = 0.064;
  moltenCheeseTop.userData = { sceneId: 'cheese_vat' as InteractiveSceneId };
  cheeseVatGroup.add(moltenCheeseTop);
  sceneHitboxes.push(moltenCheeseTop);

  const mixerPaddleGroup = new THREE.Group();
  mixerPaddleGroup.position.set(0, 0.068, 0);
  cheeseVatGroup.add(mixerPaddleGroup);

  const paddleRod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.085, 10),
    purplePlastic
  );
  paddleRod.position.y = 0.032;
   paddleRod.rotation.z = 0.22;
  mixerPaddleGroup.add(paddleRod);

  // Scene B: 3D Basketball Hoop & Pipe Ramp (North-East Corner)
  const hoopSceneGroup = new THREE.Group();
  hoopSceneGroup.position.set(0.49, 0.016, -0.47);
  interactiveScenesGroup.add(hoopSceneGroup);

  const hoopPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.01, 0.18, 12),
    bluePlastic
  );
  hoopPost.position.set(0, 0.09, 0);
  hoopSceneGroup.add(hoopPost);

  const backboard = new THREE.Mesh(
    createMoldedSlabGeometry(0.078, 0.01, 0.058, 0.012, 0.002),
    orangePlastic
  );
  backboard.position.set(0, 0.165, 0.01);
  backboard.userData = { sceneId: 'basketball_hoop' as InteractiveSceneId };
  hoopSceneGroup.add(backboard);
  sceneHitboxes.push(backboard);

  const hoopRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.022, 0.003, 8, 18).rotateX(Math.PI / 2),
    redPlastic
  );
  hoopRim.position.set(0, 0.145, 0.034);
  hoopSceneGroup.add(hoopRim);

  // Scene C: Swirling Green Warp Portal Ring (East Perimeter)
  const portalSceneGroup = new THREE.Group();
  portalSceneGroup.position.set(0.51, 0.016, 0.04);
  portalSceneGroup.rotation.y = -Math.PI / 2;
  interactiveScenesGroup.add(portalSceneGroup);

  const portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.068, 0.012, 14, 28),
    orangePlastic
  );
  portalRing.position.y = 0.078;
  portalRing.userData = { sceneId: 'green_portal' as InteractiveSceneId };
  portalSceneGroup.add(portalRing);
  sceneHitboxes.push(portalRing);

  const portalVortexMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x22c55e,
    emissiveIntensity: 0.45,
    roughness: 0.2,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide,
  });
  const portalDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.058, 24),
    portalVortexMat
  );
  portalDisc.position.y = 0.078;
  portalDisc.userData = { sceneId: 'green_portal' as InteractiveSceneId };
  portalSceneGroup.add(portalDisc);
  sceneHitboxes.push(portalDisc);

  // Scene D: Pop-Up Kitchen Fridge Raid (West Perimeter)
  const kitchenRaidGroup = new THREE.Group();
  kitchenRaidGroup.position.set(-0.5, 0.016, 0.12);
  interactiveScenesGroup.add(kitchenRaidGroup);

  const fridgeBody = new THREE.Mesh(
    createMoldedSlabGeometry(0.068, 0.058, 0.115, 0.01, 0.002),
    whitePlastic
  );
  fridgeBody.position.set(0, 0.002, 0);
  fridgeBody.castShadow = !isSoftwareGl;
  fridgeBody.userData = { sceneId: 'cat_dog_raid' as InteractiveSceneId };
  kitchenRaidGroup.add(fridgeBody);
  sceneHitboxes.push(fridgeBody);

  // =========================================================================
  // 6. EXTRUDED FLOATING 3D SWISS CHEESE WEDGES OVER CHEESE SPACES
  // =========================================================================
  const floatingCheeses: FloatingCheeseRig[] = [];
  const wedgeGeo = createSwissCheeseWedgeGeometry(0.032, 0.011);

  MOUSE_TRAP_SPACES.forEach((sp) => {
    if (
      sp.type !== 'cheese_1' &&
      sp.type !== 'cheese_2' &&
      sp.type !== 'steal_cheese' &&
      sp.type !== 'cheese_wheel'
    ) {
      return;
    }
    const basePos = uvToLocal(sp.u, sp.v, 0.056);
    const group = new THREE.Group();
    group.position.copy(basePos);

    const wedgeMesh = new THREE.Mesh(wedgeGeo, cheeseMat);
    wedgeMesh.castShadow = !isSoftwareGl;
    group.add(wedgeMesh);

    const haloMesh = new THREE.Mesh(
      new THREE.RingGeometry(0.016, 0.025, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
      })
    );
    haloMesh.position.y = -0.028;
    group.add(haloMesh);

    rootGroup.add(group);
    floatingCheeses.push({
      group,
      spaceIndex: sp.index,
      baseLocalPos: basePos.clone(),
      phaseOffset: sp.index * 0.75,
    });
  });

  // =========================================================================
  // 7. 4 ARTICULATED SCULPTED 3D MICE + 3D DICE
  // =========================================================================
  const mouseRigs = new Map<MouseColor, LivingMouseRig>();
  for (const color of MOUSE_COLORS) {
    const rig = createLivingMouseRig(color, isSoftwareGl);
    rootGroup.add(rig.root);
    mouseRigs.set(color, rig);
  }

  const diceMesh = create3DDiceMesh(isSoftwareGl);
  rootGroup.add(diceMesh);

  // =========================================================================
  // 7B. CANNON.JS (cannon-es) REALISTIC PHYSICS WORLD FOR PAWNS, DIE & WEDGES
  // =========================================================================
  const physicsWorld = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
  });
  physicsWorld.broadphase = new CANNON.SAPBroadphase(physicsWorld);
  physicsWorld.allowSleep = true;

  const boardPhysMat = new CANNON.Material('boardSurface');
  const pawnPhysMat = new CANNON.Material('mousePawn');
  const dicePhysMat = new CANNON.Material('plasticDie');
  const cheesePhysMat = new CANNON.Material('cheeseWedge');

  physicsWorld.addContactMaterial(
    new CANNON.ContactMaterial(boardPhysMat, pawnPhysMat, {
      friction: 0.35,
      restitution: 0.42,
    })
  );
  physicsWorld.addContactMaterial(
    new CANNON.ContactMaterial(pawnPhysMat, pawnPhysMat, {
      friction: 0.18,
      restitution: 0.72,
    })
  );
  physicsWorld.addContactMaterial(
    new CANNON.ContactMaterial(boardPhysMat, dicePhysMat, {
      friction: 0.32,
      restitution: 0.58,
    })
  );
  physicsWorld.addContactMaterial(
    new CANNON.ContactMaterial(boardPhysMat, cheesePhysMat, {
      friction: 0.38,
      restitution: 0.35,
    })
  );

  // Static Board Floor Plane at y = 0.016
  const floorBody = new CANNON.Body({
    mass: 0,
    material: boardPhysMat,
    shape: new CANNON.Plane(),
  });
  floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  floorBody.position.set(0, 0.016, 0);
  physicsWorld.addBody(floorBody);

  // Dynamic Cannon.js Rigid Bodies for the 4 Mouse Pawns (for physical pawn-on-pawn & trap collisions)
  const mousePhysBodies = new Map<MouseColor, CANNON.Body>();
  let lastClackSoundTimeMs = 0;

  for (const color of MOUSE_COLORS) {
    const startSp = MOUSE_TRAP_SPACES[0];
    const startPos = uvToLocal(startSp.u, startSp.v, 0.036);
    const body = new CANNON.Body({
      mass: 0.16,
      material: pawnPhysMat,
      shape: new CANNON.Sphere(0.02),
      linearDamping: 0.55,
      angularDamping: 0.65,
    });
    body.position.set(startPos.x, startPos.y, startPos.z);
    body.addEventListener('collide', (ev: { contact: { getImpactVelocityAlongNormal: () => number } }) => {
      const impact = Math.abs(ev.contact.getImpactVelocityAlongNormal());
      const now = performance.now();
      if (impact > 0.45 && now - lastClackSoundTimeMs > 90) {
        lastClackSoundTimeMs = now;
        soundFX.playPhysicsCollisionClack(Math.min(1, impact / 2.5));
      }
    });
    physicsWorld.addBody(body);
    mousePhysBodies.set(color, body);
  }

  // Dynamic Cannon.js Rigid Body for the 3D Numbered Die
  const dicePhysBody = new CANNON.Body({
    mass: 0.08,
    material: dicePhysMat,
    shape: new CANNON.Box(new CANNON.Vec3(0.018, 0.018, 0.018)),
    linearDamping: 0.35,
    angularDamping: 0.35,
  });
  dicePhysBody.position.set(0.39, 0.055, 0.43);
  physicsWorld.addBody(dicePhysBody);

  // 8 Scattered Physical 3D Swiss Cheese Wedges around the board perimeter (driven by Cannon.js!)
  const physicalCheeseWedges: { mesh: THREE.Mesh; body: CANNON.Body; homeX: number; homeZ: number }[] = [];
  const perimeterWedgeCoords: [number, number, number][] = [
    [-0.46, 0.55, 0.4],
    [-0.36, 0.57, -0.5],
    [-0.25, 0.56, 1.1],
    [0.36, 0.56, -0.8],
    [0.47, 0.55, 0.3],
    [0.52, 0.57, 1.4],
    [-0.55, 0.44, -0.2],
    [0.55, 0.43, 0.9],
  ];
  for (const [wx, wz, rotY] of perimeterWedgeCoords) {
    const pWedgeMesh = new THREE.Mesh(wedgeGeo, cheeseMat);
    pWedgeMesh.castShadow = !isSoftwareGl;
    pWedgeMesh.receiveShadow = !isSoftwareGl;
    pWedgeMesh.position.set(wx, 0.025, wz);
    pWedgeMesh.rotation.y = rotY;
    rootGroup.add(pWedgeMesh);

    const wBody = new CANNON.Body({
      mass: 0.05,
      material: cheesePhysMat,
      shape: new CANNON.Box(new CANNON.Vec3(0.016, 0.006, 0.016)),
      linearDamping: 0.5,
      angularDamping: 0.55,
    });
    wBody.position.set(wx, 0.028, wz);
    wBody.quaternion.setFromEuler(0, rotY, 0);
    physicsWorld.addBody(wBody);
    physicalCheeseWedges.push({ mesh: pWedgeMesh, body: wBody, homeX: wx, homeZ: wz });
  }

  let prevDiceRollVal: number | null = null;
  let prevChainReactionTriggerMs: number | null = null;

  const triggerPhysicsBump = (strength = 1.0) => {
    dicePhysBody.wakeUp();
    dicePhysBody.velocity.set(
      (Math.random() - 0.5) * 0.45 * strength,
      0.85 * strength,
      (Math.random() - 0.5) * 0.45 * strength
    );
    dicePhysBody.angularVelocity.set(
      (Math.random() - 0.5) * 14 * strength,
      (Math.random() - 0.5) * 14 * strength,
      (Math.random() - 0.5) * 14 * strength
    );

    for (const body of mousePhysBodies.values()) {
      body.wakeUp();
      body.velocity.set(
        (Math.random() - 0.5) * 0.38 * strength,
        0.55 * strength,
        (Math.random() - 0.5) * 0.38 * strength
      );
    }

    for (const pw of physicalCheeseWedges) {
      pw.body.wakeUp();
      pw.body.velocity.set(
        (Math.random() - 0.5) * 0.32 * strength,
        0.48 * strength,
        (Math.random() - 0.5) * 0.32 * strength
      );
      pw.body.angularVelocity.set(
        (Math.random() - 0.5) * 8 * strength,
        (Math.random() - 0.5) * 10 * strength,
        (Math.random() - 0.5) * 8 * strength
      );
    }
    soundFX.playPhysicsCollisionClack(Math.min(1, 0.65 * strength));
  };

  const _tmpWorld = new THREE.Vector3();
  const _tmpLook = new THREE.Vector3();

  // =========================================================================
  // 8. REAL-TIME ANIMATION, CANNON.JS PHYSICS & RUBE GOLDBERG CHAIN REACTION
  // =========================================================================
  const updateLivingMouseTrapScene: MouseTrap3DSceneHandles['updateLivingMouseTrapScene'] = ({
    elapsed,
    dt,
    state,
    activeMouseStepAnim,
    chainReactionStartMs,
    scenePulseStartMs,
    nowMs,
    mouseControlMode,
    playerControlWorldPos,
    playerControlYaw,
    playerIsMoving,
  }) => {
    let activeActionWorldPos: THREE.Vector3 | null = null;
    const isMode2 = state.boardMode === 'mode2_living_square';

    poppedUpTrailGroup.visible = isMode2;
    interactiveScenesGroup.visible = isMode2;
    classicTrackPadsGroup.visible = !isMode2;

    const trailElevation = isMode2 ? 0.015 : 0.003;

    // 1. Animate Mode 2 Interactive 3D Scenes
    if (isMode2) {
      const scenePulse =
        scenePulseStartMs !== null
          ? Math.max(0, 1 - (nowMs - scenePulseStartMs) / 1400)
          : 0;
      const speedMult = 1 + scenePulse * 4.5;
      mixerPaddleGroup.rotation.y = elapsed * 2.8 * speedMult;
      portalDisc.rotation.z = -elapsed * 2.4 * speedMult;
    }

    // 2. Pop-Up Contraption Stages (1..5) scale smoothly from the board as built!
    for (let i = 0; i < 5; i++) {
      const isBuilt = state.builtStages >= i + 1;
      const targetPop = isBuilt ? 1 : 0;
      stagePopProgress[i] = THREE.MathUtils.damp(
        stagePopProgress[i],
        targetPop,
        7.5,
        dt
      );
      const p = stagePopProgress[i];
      const sg = stageGroups[i];
      sg.visible = p > 0.005;
      const bounceScale = p < 1 ? p * (1 + Math.sin(p * Math.PI) * 0.14) : 1.0;
      sg.scale.set(
        THREE.MathUtils.lerp(0.25, 1.0, p),
        Math.max(0.01, bounceScale),
        THREE.MathUtils.lerp(0.25, 1.0, p)
      );
    }

    // 3. Spin & Bob Floating 3D Swiss Cheese Wedges
    for (const fc of floatingCheeses) {
      const bob = Math.sin(elapsed * 3.1 + fc.phaseOffset) * 0.01;
      fc.group.position.set(
        fc.baseLocalPos.x,
        fc.baseLocalPos.y + trailElevation + bob,
        fc.baseLocalPos.z
      );
      fc.group.rotation.y = elapsed * 1.85 + fc.phaseOffset;
    }

    // 3B. Step the Cannon.js Physics World & Sync Physical Die + Scattered Cheese Wedges
    if (state.lastDiceRoll !== prevDiceRollVal) {
      prevDiceRollVal = state.lastDiceRoll;
      if (state.lastDiceRoll !== null) {
        dicePhysBody.wakeUp();
        dicePhysBody.position.set(0.39, 0.14, 0.43);
        dicePhysBody.velocity.set(
          (Math.random() - 0.5) * 0.35,
          1.15,
          (Math.random() - 0.5) * 0.35
        );
        dicePhysBody.angularVelocity.set(
          (Math.random() - 0.5) * 18,
          (Math.random() - 0.5) * 18,
          (Math.random() - 0.5) * 18
        );
      }
    }

    if (
      chainReactionStartMs !== null &&
      chainReactionStartMs !== prevChainReactionTriggerMs
    ) {
      prevChainReactionTriggerMs = chainReactionStartMs;
      triggerPhysicsBump(0.85);
    }

    physicsWorld.step(1 / 60, Math.min(dt, 0.05), 3);

    // Sync scattered perimeter Swiss Cheese Wedges from Cannon.js bodies
    for (const pw of physicalCheeseWedges) {
      // Soft tether spring so wedges stay near the board rim
      const dx = pw.homeX - pw.body.position.x;
      const dz = pw.homeZ - pw.body.position.z;
      pw.body.velocity.x += dx * 2.5 * dt;
      pw.body.velocity.z += dz * 2.5 * dt;
      if (pw.body.position.y < 0.022) {
        pw.body.position.y = 0.022;
      }
      pw.mesh.position.set(
        pw.body.position.x,
        pw.body.position.y,
        pw.body.position.z
      );
      pw.mesh.quaternion.set(
        pw.body.quaternion.x,
        pw.body.quaternion.y,
        pw.body.quaternion.z,
        pw.body.quaternion.w
      );
    }

    // 4. Sync 3D Numbered Die with Cannon.js Physical Tumbling + Hover Prompt
    dicePhysBody.velocity.x += (0.39 - dicePhysBody.position.x) * 3.2 * dt;
    dicePhysBody.velocity.z += (0.43 - dicePhysBody.position.z) * 3.2 * dt;
    if (
      state.turnPhase === 'roll' &&
      state.currentTurn === 'red' &&
      dicePhysBody.velocity.lengthSquared() < 0.02
    ) {
      diceMesh.position.set(
        0.39,
        0.036 + trailElevation + Math.abs(Math.sin(elapsed * 4.2)) * 0.018,
        0.43
      );
      diceMesh.rotation.y = elapsed * 2.1;
      diceMesh.rotation.x = Math.sin(elapsed * 3.0) * 0.35;
    } else {
      diceMesh.position.set(
        dicePhysBody.position.x,
        Math.max(0.034 + trailElevation, dicePhysBody.position.y),
        dicePhysBody.position.z
      );
      diceMesh.quaternion.set(
        dicePhysBody.quaternion.x,
        dicePhysBody.quaternion.y,
        dicePhysBody.quaternion.z,
        dicePhysBody.quaternion.w
      );
    }

    // 5. Connected 6-Phase Physical Rube Goldberg Chain Reaction!
    if (chainReactionStartMs !== null) {
      const crSec = (nowMs - chainReactionStartMs) / 1000;

      // Phase 1 (0.0s - 0.8s): Crank (#2) & Interlocking Gears (#3, #4, #5) spin & push Stop Sign (#7)
      const gearAngle = crSec * 11.5;
      crankArmGroup.rotation.z = -gearAngle;
      if (gearMeshes[0]) gearMeshes[0].rotation.z = -gearAngle;
      if (gearMeshes[1]) gearMeshes[1].rotation.y = gearAngle;
      if (gearMeshes[2]) gearMeshes[2].rotation.z = gearAngle * 0.85;

      const stopPushT = THREE.MathUtils.smoothstep(crSec, 0.35, 0.85);
      stopSignGroup.position.z = THREE.MathUtils.lerp(0.185, 0.142, stopPushT);
      stopSignGroup.rotation.x = -stopPushT * 0.25;

      // Phase 2 (0.7s - 1.35s): Swinging Green Rubber Boot (#9) arcs forward (-Z) to kick the Yellow Bucket (#11)!
      const bootSwingT = THREE.MathUtils.smoothstep(crSec, 0.68, 1.15);
      bootPivotGroup.rotation.x =
        -Math.sin(bootSwingT * Math.PI) * 0.72 - (crSec > 1.15 ? 0.22 : 0);

      // Phase 3 (1.05s - 2.35s): Yellow Bucket (#11) tips & Chrome Marble rolls down Blue Stairs (#10) and Curved Red Chute (#12)!
      const tipT = THREE.MathUtils.smoothstep(crSec, 1.0, 1.38);
      marbleBucketGroup.rotation.z = tipT * 0.88;

      if (crSec < 1.05) {
        chromeMarbleMesh.position.set(0.225, 0.174, -0.02);
      } else if (crSec < 1.65) {
        // Marble bounces down the 6 Blue Zig-Zag Stairs from x=0.225 down to x=0.062
        const stT = (crSec - 1.05) / 0.6;
        const hopBounce = Math.abs(Math.sin(stT * Math.PI * 6)) * 0.015;
        chromeMarbleMesh.position.set(
          THREE.MathUtils.lerp(0.225, 0.062, stT),
          THREE.MathUtils.lerp(0.168, 0.098, stT) + hopBounce,
          -0.02
        );
      } else if (crSec < 2.35) {
        // Marble glides along the Curved Red Chute (#12) into the Plumbing Tower!
        const chT = (crSec - 1.65) / 0.7;
        const pt = chuteCurve.getPointAt(Math.min(1, chT));
        chromeMarbleMesh.position.set(pt.x, pt.y + 0.014, pt.z);
      } else if (crSec < 2.95) {
        // Phase 4 (2.35s - 2.95s): Helping Hand Rod (#13) drops & upper marble rolls down Red Bathtub (#17) and drops onto See-Saw (#20)!
        const tbT = (crSec - 2.35) / 0.6;
        chromeMarbleMesh.position.set(
          -0.22,
          THREE.MathUtils.lerp(0.225, 0.048, tbT * tbT),
          THREE.MathUtils.lerp(-0.045, -0.128, tbT)
        );
      } else {
        chromeMarbleMesh.position.set(-0.22, 0.044, -0.128);
      }

      const handDropT = THREE.MathUtils.smoothstep(crSec, 2.25, 2.6);
      helpingHandGroup.position.y = THREE.MathUtils.lerp(0.248, 0.212, handDropT);
      bathtubGroup.rotation.x = THREE.MathUtils.lerp(-0.22, -0.34, handDropT);

      // Phase 5 (2.85s - 3.55s): See-Saw (#20) tilts & launches Sculpted Green Diver (#21) in a high somersault arc into the Yellow Washtub (#19)!
      const seesawT = THREE.MathUtils.smoothstep(crSec, 2.82, 3.12);
      seesawGroup.rotation.x = seesawT * 0.42;

      if (crSec < 2.88) {
        diverGroup.position.set(-0.22, 0.048, -0.205);
        diverGroup.rotation.set(0, -0.52, 0);
      } else {
        const diveT = Math.min(1, (crSec - 2.88) / 0.64);
        const diveArc = Math.sin(diveT * Math.PI) * 0.165;
        diverGroup.position.set(
          THREE.MathUtils.lerp(-0.22, cwPos.x - 0.095, diveT),
          THREE.MathUtils.lerp(0.048, 0.036, diveT) + diveArc,
          THREE.MathUtils.lerp(-0.205, cwPos.z, diveT)
        );
        diverGroup.rotation.x = -diveT * Math.PI * 2.0;
      }

      // Phase 6 (3.45s - 4.35s): Giant Green Crane Gear spins & Domed Slotted Red Bell Cage (#23) drops down the Notched Pole!
      const cageDropT = THREE.MathUtils.smoothstep(crSec, 3.42, 3.92);
      greenCraneGearMesh.rotation.z = cageDropT * Math.PI * 4;

      if (state.builtStages >= 5) {
        const dropBounce =
          cageDropT >= 1
            ? Math.abs(Math.sin((crSec - 3.92) * 14)) *
              0.018 *
              Math.max(0, 1 - (crSec - 3.92) * 2.5)
            : 0;
        redCageGroup.position.y =
          THREE.MathUtils.lerp(0.215, 0.016 + trailElevation, cageDropT) +
          dropBounce;
        redCageGroup.rotation.y = cageDropT * Math.PI * 1.5;

        const showDust = crSec >= 3.85 && crSec <= 4.45;
        const dustT = Math.max(0, Math.min(1, (crSec - 3.85) / 0.55));
        cageDustPuffs.forEach((puff, idx) => {
          puff.visible = showDust;
          if (showDust) {
            const angle = (idx / cageDustPuffs.length) * Math.PI * 2;
            const rad = 0.042 + dustT * 0.055;
            puff.position.set(
              cwPos.x + Math.cos(angle) * rad,
              0.025 + trailElevation + Math.sin(dustT * Math.PI) * 0.024,
              cwPos.z + Math.sin(angle) * rad
            );
            puff.scale.setScalar(Math.sin(dustT * Math.PI) * 1.35);
          }
        });
      } else {
        // Malfunction jam rattle halfway down the Notched Pole!
        const jamT = THREE.MathUtils.smoothstep(crSec, 3.42, 3.75);
        redCageGroup.position.y = THREE.MathUtils.lerp(0.215, 0.135, jamT);
        redCageGroup.rotation.z =
          crSec > 3.55 ? Math.sin(crSec * 42) * 0.14 : 0;
        cageDustPuffs.forEach((p) => (p.visible = false));
      }

      // Camera Focus Target follows the active stage of the chain reaction!
      const focusLocal =
        crSec < 1.15
          ? new THREE.Vector3(0.18, 0.16, 0.12)
          : crSec < 2.35
          ? chromeMarbleMesh.position.clone()
          : crSec < 3.4
          ? diverGroup.position.clone()
          : new THREE.Vector3(cwPos.x, redCageGroup.position.y, cwPos.z);
      rootGroup.localToWorld(_tmpWorld.copy(focusLocal));
      activeActionWorldPos = _tmpWorld.clone();
    } else {
      // Idle / Ready State for all Contraption Pieces
      crankArmGroup.rotation.z = Math.sin(elapsed * 1.5) * 0.12;
      if (gearMeshes[0]) gearMeshes[0].rotation.z = -Math.sin(elapsed * 1.5) * 0.12;
      if (gearMeshes[1]) gearMeshes[1].rotation.y = Math.sin(elapsed * 1.5) * 0.12;
      if (gearMeshes[2]) gearMeshes[2].rotation.z = Math.sin(elapsed * 1.5) * 0.1;
      stopSignGroup.position.set(0.16, 0.016, 0.185);
      stopSignGroup.rotation.set(0, 0, 0);
      bootPivotGroup.rotation.x = Math.sin(elapsed * 2.0) * 0.05;
      marbleBucketGroup.rotation.z = 0;
      chromeMarbleMesh.position.set(0.225, 0.174, -0.02);
      helpingHandGroup.position.y = 0.248;
      bathtubGroup.rotation.x = -0.22;
      seesawGroup.rotation.x = 0;
      diverGroup.position.set(-0.22, 0.048, -0.205);
      diverGroup.rotation.set(0, -0.52, 0);
      greenCraneGearMesh.rotation.z = 0;
      cageDustPuffs.forEach((p) => (p.visible = false));

      const anyMouseTrapped = Object.values(state.mice).some((m) => m.isTrapped);
      redCageGroup.position.y = anyMouseTrapped
        ? 0.016 + trailElevation
        : 0.215;
      redCageGroup.rotation.set(0, 0, 0);
    }

    // 6. Update the 4 Articulated Sculpted Mice (Idle Breathing, Scampering Hops & Direct Mouse POV)
    const laneOffsets: Record<MouseColor, [number, number]> = {
      red: [-0.012, 0.012],
      blue: [0.012, 0.012],
      yellow: [-0.012, -0.012],
      green: [0.012, -0.012],
    };

    for (const color of MOUSE_COLORS) {
      const rig = mouseRigs.get(color)!;
      const mState = state.mice[color];
      const [ox, oz] = laneOffsets[color];

      rig.costumeGroup.visible = isMode2;

      const phase =
        color === 'red'
          ? 0
          : color === 'blue'
          ? 1.6
          : color === 'yellow'
          ? 3.1
          : 4.7;
      rig.earLeft.rotation.z = Math.sin(elapsed * 5.2 + phase) * 0.15;
      rig.earRight.rotation.z = -Math.sin(elapsed * 5.2 + phase) * 0.15;
      rig.tailMesh.rotation.y = Math.sin(elapsed * 6.5 + phase) * 0.32;
      rig.noseMesh.scale.setScalar(1 + Math.sin(elapsed * 9.0 + phase) * 0.14);

      if (color === 'red' && mouseControlMode && !mState.isTrapped) {
        rig.root.position.set(
          playerControlWorldPos.x,
          0.016 + trailElevation + (playerIsMoving ? Math.abs(Math.sin(elapsed * 14)) * 0.014 : 0),
          playerControlWorldPos.z
        );
        rig.root.rotation.y = playerControlYaw;
        rig.bodyGroup.rotation.x = playerIsMoving
          ? Math.sin(elapsed * 14) * 0.16
          : 0;
        continue;
      }

      if (activeMouseStepAnim && activeMouseStepAnim.color === color) {
        const steps = activeMouseStepAnim.stepIndices;
        const stepDur = 220;
        const elapsedAnim = nowMs - activeMouseStepAnim.startTimeMs;
        const exactFloat = Math.max(0, elapsedAnim / stepDur);
        const sIdx = Math.min(steps.length - 1, Math.floor(exactFloat));
        const frac = Math.min(1, exactFloat - sIdx);

        const fromSpaceIdx =
          sIdx === 0 ? activeMouseStepAnim.startIndex : steps[sIdx - 1];
        const toSpaceIdx = steps[sIdx];

        const sp0 = MOUSE_TRAP_SPACES[fromSpaceIdx] ?? MOUSE_TRAP_SPACES[0];
        const sp1 = MOUSE_TRAP_SPACES[toSpaceIdx] ?? MOUSE_TRAP_SPACES[0];

        const p0 = uvToLocal(sp0.u, sp0.v, 0.016 + trailElevation);
        const p1 = uvToLocal(sp1.u, sp1.v, 0.016 + trailElevation);

        const curX = THREE.MathUtils.lerp(p0.x, p1.x, frac);
        const curZ = THREE.MathUtils.lerp(p0.z, p1.z, frac);
        const hopY = Math.sin(frac * Math.PI) * 0.044;

        const stepPhysBody = mousePhysBodies.get(color)!;
        stepPhysBody.wakeUp();
        stepPhysBody.position.set(curX, 0.036 + trailElevation + hopY, curZ);
        stepPhysBody.velocity.set(
          (p1.x - p0.x) * 3.2,
          0,
          (p1.z - p0.z) * 3.2
        );

        rig.root.position.set(curX, 0.016 + trailElevation + hopY, curZ);
        rig.root.rotation.y = Math.atan2(p1.x - p0.x, p1.z - p0.z);
        rig.bodyGroup.rotation.x = -Math.sin(frac * Math.PI) * 0.24;

        if (!activeActionWorldPos) {
          rootGroup.localToWorld(_tmpWorld.copy(rig.root.position));
          activeActionWorldPos = _tmpWorld.clone();
        }
      } else {
        const sp = MOUSE_TRAP_SPACES[mState.trackIndex] ?? MOUSE_TRAP_SPACES[0];
        const nextIdx = mState.trackIndex === 35 ? 30 : mState.trackIndex + 1;
        const nextSp = MOUSE_TRAP_SPACES[nextIdx] ?? sp;

        const baseLocal = uvToLocal(sp.u, sp.v, 0.016 + trailElevation);
        const nextLocal = uvToLocal(nextSp.u, nextSp.v, 0.016 + trailElevation);

        const isSoleOnCheeseWheel =
          mState.trackIndex === CHEESE_WHEEL_SPACE_INDEX;
        // Couple Mouse Pawn to Cannon.js Rigid Body for realistic physical collisions when mice share/enter spaces!
        const physBody = mousePhysBodies.get(color)!;
        const targetX = baseLocal.x + (isSoleOnCheeseWheel ? 0 : ox);
        const targetZ = baseLocal.z + (isSoleOnCheeseWheel ? 0 : oz);
        const springK = 18.0;
        physBody.wakeUp();
        physBody.velocity.x += (targetX - physBody.position.x) * springK * dt;
        physBody.velocity.z += (targetZ - physBody.position.z) * springK * dt;

        // Clamp max drift so pawn stays readable near its space while still physically bumping neighbors
        const offsetX = THREE.MathUtils.clamp(
          physBody.position.x - targetX,
          -0.032,
          0.032
        );
        const offsetZ = THREE.MathUtils.clamp(
          physBody.position.z - targetZ,
          -0.032,
          0.032
        );
        const physHopY = Math.max(0, physBody.position.y - 0.036);

        rig.root.position.set(
          targetX + offsetX,
          baseLocal.y + physHopY,
          targetZ + offsetZ
        );
        rig.root.rotation.y = Math.atan2(
          nextLocal.x - baseLocal.x,
          nextLocal.z - baseLocal.z
        );

        const breathe = 1 + Math.sin(elapsed * 3.8 + phase) * 0.04;
        rig.bodyGroup.scale.set(1, breathe, 1);
        rig.bodyGroup.rotation.x = mState.isTrapped
          ? Math.sin(elapsed * 12) * 0.1
          : THREE.MathUtils.clamp(-physBody.velocity.z * 0.22, -0.28, 0.28);
        rig.bodyGroup.rotation.z = THREE.MathUtils.clamp(
          physBody.velocity.x * 0.22,
          -0.28,
          0.28
        );
      }
    }

    const redRig = mouseRigs.get('red')!;
    rootGroup.localToWorld(_tmpWorld.copy(redRig.root.position));
    const redMouseWorldPos = _tmpWorld.clone();

    const forwardOffset = new THREE.Vector3(
      Math.sin(redRig.root.rotation.y) * 0.18,
      0.032,
      Math.cos(redRig.root.rotation.y) * 0.18
    );
    rootGroup.localToWorld(
      _tmpLook.copy(redRig.root.position).add(forwardOffset)
    );
    const redMouseLookWorldPos = _tmpLook.clone();

    return {
      activeActionWorldPos,
      redMouseWorldPos,
      redMouseLookWorldPos,
    };
  };

  return {
    rootGroup,
    boardMesh,
    diceMesh,
    stageGroups,
    stagePopProgress,
    poppedUpTrailGroup,
    interactiveScenesGroup,
    sceneHitboxes,
    crankArmGroup,
    gearMeshes,
    stopSignGroup,
    bootPivotGroup,
    marbleBucketGroup,
    helpingHandGroup,
    chromeMarbleMesh,
    bathtubGroup,
    seesawGroup,
    diverGroup,
    redCageGroup,
    greenCraneGearMesh,
    cageDustPuffs,
    floatingCheeses,
    mouseRigs,
    updateLivingMouseTrapScene,
    triggerPhysicsBump,
  };
}
