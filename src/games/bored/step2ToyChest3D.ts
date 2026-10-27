import * as THREE from 'three';

// The owner's Step2 lift-and-hide chest, taken from Bored-games
// step2ToyChestAndViewMaster3D.ts. The room places the root; the builder's
// own studio position is cleared by the caller. The fake animal reels are not
// part of this file.

export interface Step2ToyChestHandles {
  rootGroup: THREE.Group;
  slidingBlueDoorGroup: THREE.Group;
  hitboxes: THREE.Object3D[];
  storedBoxMeshes: Map<'sorry' | 'guess_who' | 'mouse_trap' | 'view_master', THREE.Mesh>;
  updateToyChest: (dt: number, isOpen: boolean, activeGame: string) => void;
}

function createStep2LogoTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // White rounded border plate
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 256, 256);

  // Iconic Step2 Red Square Badge
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.roundRect(14, 14, 228, 228, 28);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(128, 48);
  ctx.lineTo(196, 110);
  ctx.lineTo(176, 110);
  ctx.lineTo(176, 190);
  ctx.lineTo(80, 190);
  ctx.lineTo(80, 110);
  ctx.lineTo(60, 110);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(108, 134, 40, 56);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createViewMasterBoxLidTexture(
  maxAniso = 4
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#dc2626');
  grad.addColorStop(1, '#7f1d1d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, 476, 476);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 68px "Bricolage Grotesque", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VIEW-MASTER', 256, 185);
  ctx.fillStyle = '#fde047';
  ctx.font = '900 54px "Bricolage Grotesque", sans-serif';
  ctx.fillText('3D VIEWER & REELS', 256, 265);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('VIEWER', 256, 350);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

const createViewMasterBoxTexture = createViewMasterBoxLidTexture;

/**
 * Builds the 1990s Step2 Lift & Hide Molded Toy Chest with its royal-blue 3-panel
 * sliding door and interior cavity that stores all the 3D game boxes right beside the table.
 */
export function buildStep2ToyChest3D(
  boxTextures: {
    sorry: THREE.Texture;
    guess_who: THREE.Texture;
    mouse_trap: THREE.Texture;
    view_master?: THREE.Texture;
  },
  isSoftwareGl: boolean
): Step2ToyChestHandles {
  const rootGroup = new THREE.Group();
  // Positioned right beside the table on the left side, angled slightly toward the viewer
  rootGroup.position.set(-1.32, 0, -0.08);
  rootGroup.rotation.y = Math.PI * 0.34;

  const hitboxes: THREE.Object3D[] = [];

  // Roto-molded warm beige/taupe plastic material matching reference image 1
  const beigePlasticMat = new THREE.MeshPhysicalMaterial({
    color: 0xc8c2b4,
    roughness: 0.38,
    metalness: 0.02,
    clearcoat: 0.28,
    clearcoatRoughness: 0.35,
  });

  // Iconic Step2 royal blue sliding door plastic material
  const blueDoorMat = new THREE.MeshPhysicalMaterial({
    color: 0x0058d6,
    roughness: 0.26,
    metalness: 0.04,
    clearcoat: 0.65,
    clearcoatRoughness: 0.18,
  });

  const blueRecessMat = new THREE.MeshPhysicalMaterial({
    color: 0x0046ad,
    roughness: 0.32,
    metalness: 0.04,
    clearcoat: 0.5,
  });

  const darkInteriorMat = new THREE.MeshStandardMaterial({
    color: 0x181512,
    roughness: 0.85,
  });

  // 1. Lower Storage Bin Base (width: 0.88m, height: 0.34m, depth: 0.54m)
  const lowerBin = new THREE.Mesh(
    new THREE.BoxGeometry(0.88, 0.32, 0.54),
    beigePlasticMat
  );
  lowerBin.position.set(0, 0.16, 0);
  lowerBin.castShadow = !isSoftwareGl;
  lowerBin.receiveShadow = !isSoftwareGl;
  lowerBin.userData = { type: 'toy_chest_toggle' };
  rootGroup.add(lowerBin);
  hitboxes.push(lowerBin);

  // Horizontal molded seam groove across the front fascia
  const frontFasciaBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.09, 0.56),
    beigePlasticMat
  );
  frontFasciaBar.position.set(0, 0.33, 0);
  frontFasciaBar.castShadow = !isSoftwareGl;
  frontFasciaBar.userData = { type: 'toy_chest_toggle' };
  rootGroup.add(frontFasciaBar);
  hitboxes.push(frontFasciaBar);

  // Red Square "STEP 2" Logo Badge centered on the front lower seam
  const step2Badge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.088, 0.088),
    new THREE.MeshStandardMaterial({
      map: createStep2LogoTexture(),
      roughness: 0.25,
    })
  );
  step2Badge.position.set(0, 0.285, 0.282);
  step2Badge.userData = { type: 'toy_chest_toggle' };
  rootGroup.add(step2Badge);
  hitboxes.push(step2Badge);

  // 2. Dark Hollow Storage Cavity Inside the Toy Chest (where the game boxes sit!)
  const interiorWell = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.34, 0.34),
    darkInteriorMat
  );
  interiorWell.position.set(0, 0.45, -0.07);
  rootGroup.add(interiorWell);

  // 3. Sloped Side Pillars & Back Wall of Upper Toy Chest Hutch
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.095, 0.44, 0.52),
      beigePlasticMat
    );
    pillar.position.set(side * 0.395, 0.54, -0.01);
    pillar.rotation.x = -0.14;
    pillar.castShadow = !isSoftwareGl;
    pillar.userData = { type: 'toy_chest_toggle' };
    rootGroup.add(pillar);
    hitboxes.push(pillar);
  }

  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.88, 0.46, 0.08),
    beigePlasticMat
  );
  backWall.position.set(0, 0.55, -0.24);
  backWall.castShadow = !isSoftwareGl;
  rootGroup.add(backWall);

  // 4. Recessed Top Display Shelf Rim (matching the top tray of the Step2 chest)
  const topShelfFloor = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, 0.045, 0.48),
    beigePlasticMat
  );
  topShelfFloor.position.set(0, 0.77, -0.03);
  topShelfFloor.castShadow = !isSoftwareGl;
  topShelfFloor.receiveShadow = !isSoftwareGl;
  topShelfFloor.userData = { type: 'toy_chest_toggle' };
  rootGroup.add(topShelfFloor);
  hitboxes.push(topShelfFloor);

  // Raised molded rim around the top shelf (back + left + right)
  const backRim = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, 0.045, 0.045),
    beigePlasticMat
  );
  backRim.position.set(0, 0.805, -0.25);
  rootGroup.add(backRim);

  for (const side of [-1, 1]) {
    const sideRim = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.045, 0.48),
      beigePlasticMat
    );
    sideRim.position.set(side * 0.41, 0.805, -0.03);
    rootGroup.add(sideRim);
  }

  // 5. Royal-Blue 3-Panel Sliding Door (`slidingBlueDoorGroup`)
  // When closed (progress = 0): sits across the sloped front opening at (0, 0.55, 0.195), rotation.x = -0.32
  // When slid open (progress = 1): lifts up and slides back under the top shelf at (0, 0.73, -0.04), rotation.x = -Math.PI / 2!
  const slidingBlueDoorGroup = new THREE.Group();
  slidingBlueDoorGroup.position.set(0, 0.55, 0.195);
  slidingBlueDoorGroup.rotation.x = -0.32;
  rootGroup.add(slidingBlueDoorGroup);

  const doorSlab = new THREE.Mesh(
    new THREE.BoxGeometry(0.71, 0.36, 0.032),
    blueDoorMat
  );
  doorSlab.castShadow = !isSoftwareGl;
  doorSlab.receiveShadow = !isSoftwareGl;
  doorSlab.userData = { type: 'toy_chest_toggle' };
  slidingBlueDoorGroup.add(doorSlab);
  hitboxes.push(doorSlab);

  // 3 Vertical Recessed Rectangular Panels on the Blue Door (exact match to photo!)
  for (const px of [-0.21, 0, 0.21]) {
    const panelFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.165, 0.24, 0.012),
      blueRecessMat
    );
    panelFrame.position.set(px, 0.02, 0.014);
    panelFrame.userData = { type: 'toy_chest_toggle' };
    slidingBlueDoorGroup.add(panelFrame);
    hitboxes.push(panelFrame);
  }

  // Molded Oval Handle Pocket at bottom-center of the Blue Door
  const handlePocket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.075, 14).rotateZ(Math.PI / 2),
    blueRecessMat
  );
  handlePocket.position.set(0, -0.135, 0.016);
  handlePocket.userData = { type: 'toy_chest_toggle' };
  slidingBlueDoorGroup.add(handlePocket);
  hitboxes.push(handlePocket);

  // 6. Stored 3D Game Boxes Inside the Step2 Toy Chest!
  // Clicking any stored game box inside the open Toy Chest switches to that game!
  const storedBoxMeshes = new Map<
    'sorry' | 'guess_who' | 'mouse_trap' | 'view_master',
    THREE.Mesh
  >();
  const viewMasterBoxTex = boxTextures.view_master ?? createViewMasterBoxTexture();
  const boxSideCardboard = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.6,
  });

  const gameConfigs: {
    id: 'sorry' | 'guess_who' | 'mouse_trap' | 'view_master';
    tex: THREE.Texture;
    x: number;
  }[] = [
    { id: 'sorry', tex: boxTextures.sorry, x: -0.24 },
    { id: 'guess_who', tex: boxTextures.guess_who, x: -0.08 },
    { id: 'mouse_trap', tex: boxTextures.mouse_trap, x: 0.08 },
    { id: 'view_master', tex: viewMasterBoxTex, x: 0.24 },
  ];

  for (const cfg of gameConfigs) {
    const coverMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: cfg.tex,
      roughness: 0.32,
    });
    const boxMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.25, 0.22),
      [
        boxSideCardboard,
        boxSideCardboard,
        coverMat,
        boxSideCardboard,
        coverMat,
        coverMat,
      ]
    );
    boxMesh.position.set(cfg.x, 0.44, -0.04);
    boxMesh.rotation.x = -0.25;
    boxMesh.castShadow = !isSoftwareGl;
    boxMesh.userData = { type: 'toy_chest_box', gameId: cfg.id };
    rootGroup.add(boxMesh);
    storedBoxMeshes.set(cfg.id, boxMesh);
    hitboxes.push(boxMesh);
  }

  let slideProgress = 0;

  const updateToyChest = (dt: number, isOpen: boolean, activeGame: string) => {
    const target = isOpen ? 1 : 0;
    slideProgress = THREE.MathUtils.damp(slideProgress, target, 16, Math.max(dt, 0.035));
    if (Math.abs(target - slideProgress) < 0.015) {
      slideProgress = target;
    }

    // Phase 1 (0..0.45): Lift the blue door up & tilt flat under the top shelf
    // Phase 2 (0.25..1.0): Slide the blue door horizontally back into the upper recess pocket!
    const liftT = THREE.MathUtils.smoothstep(slideProgress, 0.0, 0.48);
    const retractT = THREE.MathUtils.smoothstep(slideProgress, 0.22, 1.0);

    slidingBlueDoorGroup.position.set(
      0,
      THREE.MathUtils.lerp(0.55, 0.75, liftT),
      THREE.MathUtils.lerp(0.195, -0.18, retractT)
    );
    slidingBlueDoorGroup.rotation.x = THREE.MathUtils.lerp(
      -0.32,
      -Math.PI * 0.48,
      liftT
    );
    // Tuck deeper into the pocket as it finishes retracting so the top-down view into the bin is wide open
    slidingBlueDoorGroup.scale.set(
      1,
      THREE.MathUtils.lerp(1, 0.28, retractT),
      1
    );

    // Raise and angle the 4 stored 3D game boxes forward when the chest slides open so the player can see & click them!
    storedBoxMeshes.forEach((mesh, gameId) => {
      const isCurrent = gameId === activeGame;
      const targetY = isCurrent
        ? 0.52 + slideProgress * 0.05
        : 0.48 + slideProgress * 0.08;
      const targetZ = THREE.MathUtils.lerp(-0.05, 0.06, slideProgress);
      mesh.position.y = targetY;
      mesh.position.z = targetZ;
      mesh.visible = slideProgress > 0.08;
    });
  };

  return {
    rootGroup,
    slidingBlueDoorGroup,
    hitboxes,
    storedBoxMeshes,
    updateToyChest,
  };
}
