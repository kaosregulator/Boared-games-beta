// Pure TypeScript Classic & Living Pop-Up Mouse Trap 3D Game Engine
// Supports Mode 1 (Classic 3D Pop-Up Contraption) & Mode 2 (Popped-Up Square Trail & Interactive 3D Scenes)

export type MouseColor = 'red' | 'blue' | 'yellow' | 'green';

export const MOUSE_COLORS: MouseColor[] = ['red', 'blue', 'yellow', 'green'];

export type MouseTrapBoardMode = 'mode1_classic' | 'mode2_living_square';

export type InteractiveSceneId =
  | 'cheese_vat'
  | 'basketball_hoop'
  | 'slime_tunnel'
  | 'cat_dog_fridge';

export interface InteractiveSceneInfo {
  id: InteractiveSceneId;
  name: string;
  shortName: string;
  badge: string;
  description: string;
}

export const INTERACTIVE_SCENES: InteractiveSceneInfo[] = [
  {
    id: 'cheese_vat',
    name: 'Bubbling Cheese Vat & Mixer Arm',
    shortName: 'Cheese Vat Mixer',
    badge: '+2 🧀 Splash!',
    description:
      'Blue industrial vat with bubbling molten golden cheese and a spinning purple mixer paddle.',
  },
  {
    id: 'basketball_hoop',
    name: 'Slam-Dunk Marble Hoop & Chute',
    shortName: 'Basketball Hoop',
    badge: 'Slam Dunk!',
    description:
      'Elevated red launcher chute that fires a steel marble through the orange backboard & net.',
  },
  {
    id: 'slime_tunnel',
    name: 'Glowing Green Portal & Gear Crane',
    shortName: 'Green Gear Portal',
    badge: 'Turbo Gear!',
    description:
      'Glowing green portal tunnel and oversized green gear crane arm holding the riveted Red Cage.',
  },
  {
    id: 'cat_dog_fridge',
    name: 'Fat Cat, Mad Bulldog & Raided Fridge',
    shortName: 'Cat, Dog & Fridge',
    badge: 'Kitchen Chaos!',
    description:
      'Pop-up 3D Orange Fat Cat, barking Brown Bulldog by the bone, and open kitchen refrigerator.',
  },
];

export const MOUSE_META: Record<
  MouseColor,
  {
    name: string;
    hex: string;
    accentHex: string;
    earHex: string;
    shirtHex: string;
    hatHex: string;
  }
> = {
  red: {
    name: 'Red Mouse',
    hex: '#ef4444',
    accentHex: '#fca5a5',
    earHex: '#fda4af',
    shirtHex: '#2563eb',
    hatHex: '#facc15',
  },
  blue: {
    name: 'Blue Mouse',
    hex: '#0ea5e9',
    accentHex: '#7dd3fc',
    earHex: '#bae6fd',
    shirtHex: '#f97316',
    hatHex: '#ec4899',
  },
  yellow: {
    name: 'Yellow Mouse',
    hex: '#eab308',
    accentHex: '#fde047',
    earHex: '#fef08a',
    shirtHex: '#9333ea',
    hatHex: '#38bdf8',
  },
  green: {
    name: 'Green Mouse',
    hex: '#22c55e',
    accentHex: '#86efac',
    earHex: '#f9a8d4',
    shirtHex: '#2563eb',
    hatHex: '#f472b6',
  },
};

export type MouseTrapSpaceType =
  | 'start'
  | 'cheese_1'
  | 'cheese_2'
  | 'build'
  | 'turn_crank'
  | 'cheese_wheel'
  | 'safe'
  | 'steal_cheese'
  | 'hazard_back'
  | 'fat_cat'
  | 'dog_bone'
  | 'mad_dog'
  | 'move_ahead';

export interface MouseTrapSpace {
  index: number;
  type: MouseTrapSpaceType;
  label: string;
  shortTag: string;
  /** Normalized square board coordinates u, v in [-0.5, 0.5] */
  u: number;
  v: number;
  isLoop: boolean;
  /** Which interactive 3D scene is near/triggered by this space */
  linkedScene?: InteractiveSceneId;
}

export interface ContraptionStageInfo {
  stage: number; // 1..5
  id: 'crank_gears' | 'boot_bucket' | 'stairs_chute' | 'tub_diver' | 'cage_pole';
  name: string;
  shortName: string;
  description: string;
}

export const CONTRAPTION_STAGES: ContraptionStageInfo[] = [
  {
    stage: 1,
    id: 'crank_gears',
    name: 'Stage 1: Hand Crank, Interlocking Gears & Stop Sign Lever',
    shortName: '1. Crank, Gears & Stop Sign',
    description:
      'Pops up the green peg baseplate, red/yellow gears, hand crank, and octagonal Stop Sign lever.',
  },
  {
    stage: 2,
    id: 'boot_bucket',
    name: 'Stage 2: Streetlamp, Trigger Rod & Swinging Green Boot',
    shortName: '2. Lamp & Swinging Boot',
    description:
      'Pops up the ornate yellow lamp post, trigger rod, and suspended green rubber boot pendulum.',
  },
  {
    stage: 3,
    id: 'stairs_chute',
    name: 'Stage 3: Blue Stairs, Candy-Striped Chute & Helping Hand',
    shortName: '3. Stairs, Chute & Hand',
    description:
      'Pops up the 6-step blue staircase, tipping bucket, red/yellow candy-striped chute, and Helping Hand rod.',
  },
  {
    stage: 4,
    id: 'tub_diver',
    name: 'Stage 4: Red Bathtub, See-Saw Lever, Diver & Green Vault',
    shortName: '4. Bathtub, See-Saw & Diver',
    description:
      'Pops up the blue plumbing tower, red bathtub, see-saw catapult, green diver, yellow tub & green vault plate.',
  },
  {
    stage: 5,
    id: 'cage_pole',
    name: 'Stage 5: Green Gear Crane, Notched Pole & Riveted Red Cage',
    shortName: '5. Gear Crane & Red Cage',
    description:
      'Pops up the notched pole, giant green gear crane arm, and riveted Red Dome Cage over the Cheese Wheel!',
  },
];

/**
 * Generates the 36-space SQUARE Mouse Trap path matching the classic square board
 * (`s-l1600_44b1412a.webp`) and the popped-up 3D square trail (`Screenshot_2026-10-26_7.53.56_PM`):
 * - Spaces 0..29 trace the 4 straight sides of the Square Board perimeter:
 *   - West Edge (0..6): START -> BUILD -> TAKE 2 CHEESE -> BUILD -> CAT'S MEOW -> 2-3-4 -> Corner
 *   - South Edge (7..14): TAKE 1 CHEESE -> BUILD -> MOVE AHEAD 4 -> CHEESE -> FAT CAT! -> BUILD -> GO BACK 6 -> CHEESE
 *   - East Edge (15..22): DOG BONE -> BUILD -> LOSE 2 CHEESE -> BUILD -> MAD DOG! -> CHEESE -> MOVE TO CHEESE WHEEL -> CHEESE
 *   - North Edge (23..29): GO BACK 4 -> BUILD -> CHEESE -> STEAL 3 CHEESE -> CAUGHT NAPPING -> BUILD -> GO BACK 6
 * - Spaces 30..35 form the 6-space Corner Loop around the Giant Golden Cheese Wheel:
 *   - 30: TURN CRANK
 *   - 31: BUILD 2-3-4
 *   - 32: CHEESE WHEEL (Directly under the Riveted Red Cage!)
 *   - 33: SAFE
 *   - 34: TAKE 2 CHEESE
 *   - 35: BUILD 2-3-4
 */
export const MOUSE_TRAP_SPACES: MouseTrapSpace[] = (() => {
  const spaces: MouseTrapSpace[] = [];

  // 30 Square Perimeter Coordinates (West -> South -> East -> North)
  const perimeterCoords: [number, number][] = [
    // West Edge (going down from middle-left START to bottom-left corner: indices 0..6)
    [-0.41, -0.04], // 0: START
    [-0.41, 0.04],  // 1: BUILD
    [-0.41, 0.12],  // 2: TAKE 2 CHEESE
    [-0.41, 0.20],  // 3: BUILD
    [-0.41, 0.28],  // 4: CAT'S MEOW (Back 2)
    [-0.41, 0.35],  // 5: CHEESE
    [-0.41, 0.42],  // 6: BUILD
    // South Edge (bottom-left to bottom-right: indices 7..14)
    [-0.32, 0.42],  // 7: TAKE 1 CHEESE
    [-0.22, 0.42],  // 8: BUILD
    [-0.12, 0.42],  // 9: MOVE AHEAD 4
    [-0.02, 0.42],  // 10: CHEESE
    [0.08, 0.42],   // 11: FAT CAT!
    [0.18, 0.42],   // 12: STEAL CHEESE
    [0.28, 0.42],   // 13: BUILD
    [0.36, 0.42],   // 14: DOUBLE CHEESE
    // East Edge (bottom-right DOG BONE up to top-right: indices 15..22)
    [0.42, 0.42],   // 15: DOG BONE
    [0.42, 0.32],   // 16: BUILD
    [0.42, 0.22],   // 17:SLEEPING DOG (Back 2)
    [0.42, 0.12],   // 18: BUILD
    [0.42, 0.02],   // 19: MAD DOG! (Back to Bone)
    [0.42, -0.08],  // 20: CHEESE
    [0.42, -0.18],  // 21: MOVE AHEAD TO CHEESE WHEEL
    [0.42, -0.29],  // 22: DOUBLE CHEESE
    // North Edge (top-right corner to top-left loop entry: indices 23..29)
    [0.42, -0.41],  // 23: STEAL 3 CHEESE FROM LEADER
    [0.31, -0.41],  // 24: BUILD
    [0.20, -0.41],  // 25: CHEESE
    [0.09, -0.41],  // 26: BUILD
    [-0.02, -0.41], // 27: CAUGHT NAPPING!
    [-0.13, -0.41], // 28: DOUBLE CHEESE
    [-0.24, -0.41], // 29: BUILD (Enters Loop!)
  ];

  for (let i = 0; i < perimeterCoords.length; i++) {
    const [u, v] = perimeterCoords[i];
    let type: MouseTrapSpaceType = 'cheese_1';
    let label = 'Floating Cheese (+1 🧀)';
    let shortTag = '+1 🧀';
    let linkedScene: InteractiveSceneId | undefined;

    if (i === 0) {
      type = 'start';
      label = 'START — Scamper Out!';
      shortTag = 'START';
      linkedScene = 'cat_dog_fridge';
    } else if (i === 1 || i === 3 || i === 6 || i === 8 || i === 13 || i === 16 || i === 18 || i === 24 || i === 26 || i === 29) {
      type = 'build';
      label = 'BUILD 2·3·4 (+1 Pop-Up Trap & +1 Cheese)';
      shortTag = 'BUILD';
      linkedScene = i < 10 ? 'cheese_vat' : i < 20 ? 'basketball_hoop' : 'slime_tunnel';
    } else if (i === 2 || i === 7 || i === 14 || i === 22 || i === 28) {
      type = 'cheese_2';
      label = 'TAKE 2 PIECES OF CHEESE (+2 🧀)';
      shortTag = '+2 🧀';
      linkedScene = 'cheese_vat';
    } else if (i === 4) {
      type = 'hazard_back';
      label = "CAT'S MEOW! Scamper Back 2 Spaces";
      shortTag = 'MEOW -2';
      linkedScene = 'cat_dog_fridge';
    } else if (i === 9) {
      type = 'move_ahead';
      label = 'MOVE AHEAD 4 SPACES! (+1 Cheese)';
      shortTag = 'AHEAD 4';
      linkedScene = 'cheese_vat';
    } else if (i === 11) {
      type = 'fat_cat';
      label = 'FAT CAT! Orange Tabby Pounces — Back 3 Spaces!';
      shortTag = 'FAT CAT';
      linkedScene = 'cat_dog_fridge';
    } else if (i === 12 || i === 23) {
      type = 'steal_cheese';
      label = 'TAKE 2 CHEESE FROM RIVAL WITH THE MOST!';
      shortTag = 'STEAL 🧀';
      linkedScene = 'basketball_hoop';
    } else if (i === 15) {
      type = 'dog_bone';
      label = 'DOG BONE SAFE HAVEN (+1 Cheese)';
      shortTag = 'BONE';
      linkedScene = 'cat_dog_fridge';
    } else if (i === 17) {
      type = 'hazard_back';
      label = 'LOSE TIME! Scamper Back 2 Spaces';
      shortTag = 'BACK 2';
      linkedScene = 'cat_dog_fridge';
    } else if (i === 19) {
      type = 'mad_dog';
      label = 'MAD DOG! Grumpy Bulldog Barks — Back to Dog Bone!';
      shortTag = 'MAD DOG';
      linkedScene = 'cat_dog_fridge';
    } else if (i === 21) {
      type = 'move_ahead';
      label = 'SHORTCUT! Dash Ahead Toward the Loop!';
      shortTag = 'DASH';
      linkedScene = 'basketball_hoop';
    } else if (i === 27) {
      type = 'hazard_back';
      label = 'CAUGHT NAPPING! Scamper Back 2 Spaces';
      shortTag = 'NAPPING';
      linkedScene = 'slime_tunnel';
    }

    spaces.push({
      index: i,
      type,
      label,
      shortTag,
      u,
      v,
      isLoop: false,
      linkedScene,
    });
  }

  // The 6-Space Corner Loop in the Top-Left Quadrant around the Cheese Wheel (Spaces 30..35)
  const loopDefs: {
    index: number;
    type: MouseTrapSpaceType;
    label: string;
    shortTag: string;
    u: number;
    v: number;
    linkedScene?: InteractiveSceneId;
  }[] = [
    {
      index: 30,
      type: 'turn_crank',
      label: 'TURN CRANK! Activate the Contraption!',
      shortTag: 'CRANK',
      u: -0.38,
      v: -0.22,
      linkedScene: 'slime_tunnel',
    },
    {
      index: 31,
      type: 'build',
      label: 'BUILD 2·3·4 (+1 Pop-Up Piece)',
      shortTag: 'BUILD',
      u: -0.34,
      v: -0.12,
      linkedScene: 'cheese_vat',
    },
    {
      index: 32,
      type: 'cheese_wheel',
      label: 'CHEESE WHEEL! (+2 Cheese — Danger: Under Red Cage!)',
      shortTag: 'WHEEL',
      u: -0.22,
      v: -0.24,
      linkedScene: 'slime_tunnel',
    },
    {
      index: 33,
      type: 'safe',
      label: 'SAFE SPACE (Protected from Trap)',
      shortTag: 'SAFE',
      u: -0.34,
      v: -0.38,
      linkedScene: 'slime_tunnel',
    },
    {
      index: 34,
      type: 'cheese_2',
      label: 'TAKE 2 PIECES OF CHEESE (+2 🧀)',
      shortTag: '+2 🧀',
      u: -0.22,
      v: -0.12,
      linkedScene: 'cheese_vat',
    },
    {
      index: 35,
      type: 'cheese_1',
      label: 'LOOP CHEESE (+1 🧀)',
      shortTag: '+1 🧀',
      u: -0.14,
      v: -0.28,
      linkedScene: 'slime_tunnel',
    },
  ];

  for (const ld of loopDefs) {
    spaces.push({
      ...ld,
      isLoop: true,
    });
  }

  return spaces;
})();

export const CHEESE_WHEEL_SPACE_INDEX = 32;
export const TURN_CRANK_SPACE_INDEX = 30;
export const DOG_BONE_SPACE_INDEX = 15;

export interface MousePawnState {
  color: MouseColor;
  trackIndex: number;
  cheeseCount: number;
  /** When true, the Red Cage has dropped over this mouse and it CANNOT move until freed! */
  isTrapped: boolean;
  /** Free-roam world offset when player takes direct control of the mouse */
  freeRoamU: number;
  freeRoamV: number;
}

export interface MouseTrapGameState {
  boardMode: MouseTrapBoardMode;
  mice: Record<MouseColor, MousePawnState>;
  currentTurn: MouseColor;
  turnPhase: 'roll' | 'animating_move' | 'chain_reaction' | 'gameover';
  lastDiceRoll: number | null;
  /** Number of 3D Contraption Stages popped up out of the board (0..5) */
  builtStages: number;
  /** Whether the Red Cage is currently dropped down over the Cheese Wheel space */
  cageDropped: boolean;
  /** Which mouse is currently locked inside the dropped Red Cage (if any) */
  trappedMouse: MouseColor | null;
  /** Most recently triggered interactive 3D scene on the square board */
  activeSceneId: InteractiveSceneId | null;
  /** Number of interactive 3D scenes triggered */
  sceneTriggerCount: number;
  winner: MouseColor | null;
  winReason: string;
  lastActionLog: string;
  turnCount: number;
  /** Count of chain reactions triggered */
  trapsTriggered: number;
}

export function createInitialMouseTrapState(
  boardMode: MouseTrapBoardMode = 'mode2_living_square'
): MouseTrapGameState {
  const startSpace = MOUSE_TRAP_SPACES[0];
  const mice: Record<MouseColor, MousePawnState> = {
    red: {
      color: 'red',
      trackIndex: 0,
      cheeseCount: 2,
      isTrapped: false,
      freeRoamU: startSpace.u - 0.02,
      freeRoamV: startSpace.v + 0.02,
    },
    blue: {
      color: 'blue',
      trackIndex: 0,
      cheeseCount: 2,
      isTrapped: false,
      freeRoamU: startSpace.u + 0.02,
      freeRoamV: startSpace.v + 0.02,
    },
    yellow: {
      color: 'yellow',
      trackIndex: 0,
      cheeseCount: 2,
      isTrapped: false,
      freeRoamU: startSpace.u - 0.02,
      freeRoamV: startSpace.v - 0.02,
    },
    green: {
      color: 'green',
      trackIndex: 0,
      cheeseCount: 2,
      isTrapped: false,
      freeRoamU: startSpace.u + 0.02,
      freeRoamV: startSpace.v - 0.02,
    },
  };

  return {
    boardMode,
    mice,
    currentTurn: 'red',
    turnPhase: 'roll',
    lastDiceRoll: null,
    // In Mode 2, start with all 5 contraption stages popped up; in Mode 1, start at 1 to build up to 5!
    builtStages: boardMode === 'mode2_living_square' ? 5 : 1,
    cageDropped: false,
    trappedMouse: null,
    activeSceneId: null,
    sceneTriggerCount: 0,
    winner: null,
    winReason: '',
    lastActionLog:
      boardMode === 'mode2_living_square'
        ? 'Mode 2 Active: Popped-Up 3D Square Trail & Interactive Scenes! Roll the Die, trigger scenes, or Switch between Mode 1 & Mode 2!'
        : 'Mode 1 Active: Classic 3D Pop-Up Contraption Board! Roll the Die, pop up all 5 trap stages, or Switch to Mode 2!',
    turnCount: 1,
    trapsTriggered: 0,
  };
}

/**
 * Toggles or sets the Mouse Trap 3D Board Mode between Mode 1 (Classic Pop-Up)
 * and Mode 2 (Popped-Up 3D Square Trail & Interactive Scenes) while preserving game progress!
 */
export function setMouseTrapBoardMode(
  state: MouseTrapGameState,
  mode?: MouseTrapBoardMode
): MouseTrapGameState {
  const nextMode: MouseTrapBoardMode =
    mode ??
    (state.boardMode === 'mode1_classic' ? 'mode2_living_square' : 'mode1_classic');
  return {
    ...state,
    boardMode: nextMode,
    // When entering Mode 2, ensure all 5 contraption stages are popped up so the entire square world is maximally popped up!
    builtStages: nextMode === 'mode2_living_square' ? 5 : state.builtStages,
    lastActionLog:
      nextMode === 'mode2_living_square'
        ? 'Switched to MODE 2: Popped-Up 3D Square Trail, Stacked Cheese Towers & Interactive 3D Scenes!'
        : 'Switched to MODE 1: Classic 3D Tabletop Pop-Up Board with All Remainder Pieces!',
  };
}

/**
 * Triggers one of the 4 Interactive 3D Scenes on the Square Board!
 */
export function triggerInteractiveScene(
  state: MouseTrapGameState,
  sceneId: InteractiveSceneId
): MouseTrapGameState {
  const sceneMeta = INTERACTIVE_SCENES.find((s) => s.id === sceneId) ?? INTERACTIVE_SCENES[0];
  const actor = state.currentTurn;
  const nextMice: Record<MouseColor, MousePawnState> = {
    red: { ...state.mice.red },
    blue: { ...state.mice.blue },
    yellow: { ...state.mice.yellow },
    green: { ...state.mice.green },
  };

  if (sceneId === 'cheese_vat') {
    nextMice[actor].cheeseCount += 2;
  } else {
    nextMice[actor].cheeseCount += 1;
  }

  return {
    ...state,
    mice: nextMice,
    activeSceneId: sceneId,
    sceneTriggerCount: state.sceneTriggerCount + 1,
    lastActionLog: `Interactive Scene Triggered: ${sceneMeta.name} (${sceneMeta.badge})! ${MOUSE_META[actor].name} now has ${nextMice[actor].cheeseCount} Cheese!`,
  };
}

/**
 * Advances a track index along the 36-space square board.
 * Once a mouse enters The Loop (spaces 30..35), it circles within spaces 30..35!
 */
export function advanceMouseTrackIndex(currentIndex: number, steps: number): number[] {
  const path: number[] = [];
  let cur = currentIndex;
  for (let s = 0; s < steps; s++) {
    if (cur < 30) {
      cur = cur + 1;
    } else {
      // Circle inside the 6-space Loop (30..35)
      cur = 30 + ((cur - 30 + 1) % 6);
    }
    path.push(cur);
  }
  return path;
}

export function getNextMouseTurn(current: MouseColor): MouseColor {
  const idx = MOUSE_COLORS.indexOf(current);
  return MOUSE_COLORS[(idx + 1) % MOUSE_COLORS.length];
}

export interface MouseRollOutcome {
  nextState: MouseTrapGameState;
  dice: number;
  stepIndices: number[];
  poppedNewStage: boolean;
  triggeredChainReaction: boolean;
  targetVictimMouse: MouseColor | null;
  triggeredSceneId: InteractiveSceneId | null;
}

/**
 * Executes a dice roll (1..6) for the current mouse.
 * - If the mouse is physically TRAPPED inside the lowered Red Cage (`isTrapped === true`),
 *   it CANNOT move along the track unless it escapes (by rolling a 5 or 6 or spending 2 Cheese)!
 */
export function rollMouseTrapTurn(
  state: MouseTrapGameState,
  forcedDice?: number
): MouseRollOutcome {
  if (state.winner) {
    return {
      nextState: state,
      dice: 1,
      stepIndices: [],
      poppedNewStage: false,
      triggeredChainReaction: false,
      targetVictimMouse: null,
      triggeredSceneId: null,
    };
  }

  const dice = forcedDice ?? Math.floor(Math.random() * 6) + 1;
  const actor = state.currentTurn;
  const actorMeta = MOUSE_META[actor];
  const mouse = { ...state.mice[actor] };
  const nextMice: Record<MouseColor, MousePawnState> = {
    red: { ...state.mice.red },
    blue: { ...state.mice.blue },
    yellow: { ...state.mice.yellow },
    green: { ...state.mice.green },
  };

  // CASE 1: Mouse is physically trapped inside the Red Cage on the Cheese Wheel!
  if (mouse.isTrapped) {
    if (dice >= 5 || mouse.cheeseCount >= 2) {
      const paidCheese = dice < 5;
      if (paidCheese) {
        mouse.cheeseCount = Math.max(0, mouse.cheeseCount - 2);
      }
      mouse.isTrapped = false;
      nextMice[actor] = mouse;
      const nextTurn = getNextMouseTurn(actor);
      return {
        nextState: {
          ...state,
          mice: nextMice,
          lastDiceRoll: dice,
          cageDropped: false,
          trappedMouse: null,
          currentTurn: nextTurn,
          turnCount: state.turnCount + 1,
          lastActionLog: paidCheese
            ? `${actorMeta.name} paid 2 Floating Cheese wedges to lift the Red Cage and escape! Now free to move next turn!`
            : `${actorMeta.name} rolled a ${dice} and wriggled out from under the Red Cage!`,
        },
        dice,
        stepIndices: [],
        poppedNewStage: false,
        triggeredChainReaction: false,
        targetVictimMouse: null,
        triggeredSceneId: null,
      };
    } else {
      // Still trapped — cannot move!
      const nextTurn = getNextMouseTurn(actor);
      return {
        nextState: {
          ...state,
          mice: nextMice,
          lastDiceRoll: dice,
          currentTurn: nextTurn,
          turnCount: state.turnCount + 1,
          lastActionLog: `${actorMeta.name} is TRAPPED inside the Red Cage on the Cheese Wheel (rolled ${dice}) and CANNOT move!`,
        },
        dice,
        stepIndices: [],
        poppedNewStage: false,
        triggeredChainReaction: false,
        targetVictimMouse: null,
        triggeredSceneId: null,
      };
    }
  }

  // CASE 2: Normal movement along the square popped-up trail
  const stepIndices = advanceMouseTrackIndex(mouse.trackIndex, dice);
  const landedIndex =
    stepIndices.length > 0 ? stepIndices[stepIndices.length - 1] : mouse.trackIndex;
  mouse.trackIndex = landedIndex;

  const landedSpace = MOUSE_TRAP_SPACES[landedIndex];
  let builtStages = state.builtStages;
  let poppedNewStage = false;
  let triggeredSceneId: InteractiveSceneId | null = landedSpace.linkedScene ?? null;
  let actionDetails = `${actorMeta.name} rolled ${dice} → landed on ${landedSpace.label}.`;

  // Apply space effects
  if (landedSpace.type === 'cheese_1' || landedSpace.type === 'dog_bone') {
    mouse.cheeseCount += 1;
    actionDetails = `${actorMeta.name} rolled ${dice} and snatched +1 Floating Cheese Wedge! (${mouse.cheeseCount} total)`;
  } else if (landedSpace.type === 'cheese_2') {
    mouse.cheeseCount += 2;
    actionDetails = `${actorMeta.name} rolled ${dice} and leaped for +2 Stacked Cheese Wedges! (${mouse.cheeseCount} total)`;
  } else if (landedSpace.type === 'cheese_wheel') {
    mouse.cheeseCount += 2;
    actionDetails = `${actorMeta.name} rolled ${dice} and landed right on the CHEESE WHEEL (+2 Cheese)! Look out for the Red Cage overhead!`;
  } else if (landedSpace.type === 'build') {
    mouse.cheeseCount += 1;
    if (builtStages < 5) {
      builtStages += 1;
      poppedNewStage = true;
      const stageInfo = CONTRAPTION_STAGES[builtStages - 1];
      actionDetails = `${actorMeta.name} rolled ${dice} → POP-UP TRAP! ${stageInfo.shortName} bursts out of the board (${builtStages}/5 built) +1 Cheese!`;
    } else {
      actionDetails = `${actorMeta.name} rolled ${dice} → All 5 Contraption Stages are live! Collected +1 Floating Cheese.`;
    }
  } else if (landedSpace.type === 'steal_cheese') {
    const rivals = MOUSE_COLORS.filter((c) => c !== actor).sort(
      (a, b) => nextMice[b].cheeseCount - nextMice[a].cheeseCount
    );
    const richest = rivals[0];
    if (richest && nextMice[richest].cheeseCount > 0) {
      const amt = Math.min(2, nextMice[richest].cheeseCount);
      nextMice[richest].cheeseCount -= amt;
      mouse.cheeseCount += amt;
      actionDetails = `${actorMeta.name} rolled ${dice} and stole ${amt} Floating Cheese from ${MOUSE_META[richest].name}!`;
    }
  } else if (landedSpace.type === 'hazard_back') {
    mouse.trackIndex = Math.max(0, mouse.trackIndex - 2);
    const backSpace = MOUSE_TRAP_SPACES[mouse.trackIndex];
    stepIndices.push(mouse.trackIndex);
    actionDetails = `${actorMeta.name} rolled ${dice} → ${landedSpace.shortTag}! Scampered back 2 spaces to ${backSpace.shortTag}.`;
  } else if (landedSpace.type === 'fat_cat') {
    mouse.trackIndex = Math.max(0, mouse.trackIndex - 3);
    stepIndices.push(mouse.trackIndex);
    triggeredSceneId = 'cat_dog_fridge';
    actionDetails = `${actorMeta.name} rolled ${dice} → FAT CAT POUNCED! Scampered back 3 spaces!`;
  } else if (landedSpace.type === 'mad_dog') {
    mouse.trackIndex = DOG_BONE_SPACE_INDEX;
    stepIndices.push(DOG_BONE_SPACE_INDEX);
    triggeredSceneId = 'cat_dog_fridge';
    actionDetails = `${actorMeta.name} rolled ${dice} → MAD DOG BARKED! Chased back to the Dog Bone space!`;
  } else if (landedSpace.type === 'move_ahead') {
    const bonusSteps = advanceMouseTrackIndex(mouse.trackIndex, 4);
    for (const bs of bonusSteps) stepIndices.push(bs);
    mouse.trackIndex = bonusSteps[bonusSteps.length - 1] ?? mouse.trackIndex;
    mouse.cheeseCount += 1;
    actionDetails = `${actorMeta.name} rolled ${dice} → SHORTCUT! Dashed ahead 4 extra spaces (+1 Cheese)!`;
  }

  const finalSpace = MOUSE_TRAP_SPACES[mouse.trackIndex];
  mouse.freeRoamU = finalSpace.u;
  mouse.freeRoamV = finalSpace.v;
  nextMice[actor] = mouse;

  // Check if landing on TURN CRANK (or if all 5 stages are built and an opponent is on CHEESE WHEEL)
  const victimOnCheeseWheel = MOUSE_COLORS.find(
    (c) =>
      c !== actor &&
      nextMice[c].trackIndex === CHEESE_WHEEL_SPACE_INDEX &&
      !nextMice[c].isTrapped
  );

  let targetVictimMouse: MouseColor | null = victimOnCheeseWheel ?? null;
  let triggeredChainReaction = false;

  if (landedSpace.type === 'turn_crank') {
    if (builtStages < 5) {
      builtStages = Math.min(5, builtStages + 1);
      poppedNewStage = true;
    }
    if (!targetVictimMouse) {
      const candidates = MOUSE_COLORS.filter((c) => c !== actor && !nextMice[c].isTrapped).sort(
        (a, b) => nextMice[b].trackIndex - nextMice[a].trackIndex
      );
      if (candidates.length > 0) {
        targetVictimMouse = candidates[0];
        const cwSpace = MOUSE_TRAP_SPACES[CHEESE_WHEEL_SPACE_INDEX];
        nextMice[targetVictimMouse] = {
          ...nextMice[targetVictimMouse],
          trackIndex: CHEESE_WHEEL_SPACE_INDEX,
          freeRoamU: cwSpace.u,
          freeRoamV: cwSpace.v,
        };
      }
    }
    if (builtStages >= 5 && targetVictimMouse) {
      triggeredChainReaction = true;
      actionDetails = `${actorMeta.name} landed on TURN CRANK! Cranking the gears — watch the Rube Goldberg contraption drop the Red Cage on ${MOUSE_META[targetVictimMouse].name}!`;
    }
  } else if (builtStages >= 5 && victimOnCheeseWheel) {
    triggeredChainReaction = true;
    targetVictimMouse = victimOnCheeseWheel;
    actionDetails = `${actorMeta.name} triggered the completed Mouse Trap contraption while ${MOUSE_META[victimOnCheeseWheel].name} is on the Cheese Wheel!`;
  }

  return {
    nextState: {
      ...state,
      mice: nextMice,
      lastDiceRoll: dice,
      builtStages,
      activeSceneId: triggeredSceneId ?? state.activeSceneId,
      sceneTriggerCount: triggeredSceneId
        ? state.sceneTriggerCount + 1
        : state.sceneTriggerCount,
      turnPhase: triggeredChainReaction ? 'chain_reaction' : 'roll',
      currentTurn: triggeredChainReaction ? actor : getNextMouseTurn(actor),
      turnCount: state.turnCount + 1,
      lastActionLog: actionDetails,
    },
    dice,
    stepIndices,
    poppedNewStage,
    triggeredChainReaction,
    targetVictimMouse,
    triggeredSceneId,
  };
}

/**
 * Pops up the next unbuilt Contraption Stage (or all 5 stages) out of the living board.
 */
export function buildNextContraptionStage(
  state: MouseTrapGameState,
  buildAll: boolean = false
): MouseTrapGameState {
  const nextStages = buildAll ? 5 : Math.min(5, state.builtStages + 1);
  const stageInfo = CONTRAPTION_STAGES[nextStages - 1];
  return {
    ...state,
    builtStages: nextStages,
    lastActionLog: buildAll
      ? 'All 5 3D Contraption Stages & Remainder Pieces have popped up out of the living Mouse Trap board!'
      : `Pop-Up Contraption! ${stageInfo.name} rose up out of the board (${nextStages}/5)!`,
  };
}

/**
 * Completes the Rube Goldberg Contraption Chain Reaction:
 * Drops the Red Cage (`cageDropped = true`) and physically locks the target mouse on the Cheese Wheel
 * so it cannot move (`isTrapped = true`)!
 */
export function completeContraptionChainReaction(
  state: MouseTrapGameState,
  victimColor?: MouseColor | null
): MouseTrapGameState {
  const actor = state.currentTurn;
  const actualVictim: MouseColor =
    victimColor ??
    MOUSE_COLORS.find(
      (c) => c !== actor && state.mice[c].trackIndex === CHEESE_WHEEL_SPACE_INDEX
    ) ??
    (actor === 'red' ? 'blue' : 'red');

  const cwSpace = MOUSE_TRAP_SPACES[CHEESE_WHEEL_SPACE_INDEX];
  const nextMice: Record<MouseColor, MousePawnState> = {
    red: { ...state.mice.red },
    blue: { ...state.mice.blue },
    yellow: { ...state.mice.yellow },
    green: { ...state.mice.green },
  };

  for (const c of MOUSE_COLORS) {
    nextMice[c].isTrapped = false;
  }

  nextMice[actualVictim] = {
    ...nextMice[actualVictim],
    trackIndex: CHEESE_WHEEL_SPACE_INDEX,
    freeRoamU: cwSpace.u,
    freeRoamV: cwSpace.v,
    isTrapped: true,
  };

  const stolen = Math.min(2, nextMice[actualVictim].cheeseCount);
  nextMice[actualVictim].cheeseCount -= stolen;
  nextMice[actor].cheeseCount += stolen + 1;

  const trapsTriggered = state.trapsTriggered + 1;
  const actorWon = nextMice[actor].cheeseCount >= 12 && trapsTriggered >= 2;

  return {
    ...state,
    mice: nextMice,
    builtStages: 5,
    cageDropped: true,
    trappedMouse: actualVictim,
    turnPhase: actorWon ? 'gameover' : 'roll',
    currentTurn: getNextMouseTurn(actor),
    trapsTriggered,
    winner: actorWon ? actor : null,
    winReason: actorWon
      ? `${MOUSE_META[actor].name} sprang the 3D Contraption Trap, locked ${MOUSE_META[actualVictim].name} inside the Red Cage, and amassed ${nextMice[actor].cheeseCount} Floating Cheese Wedges!`
      : '',
    lastActionLog: `CLANG! The riveted Red Cage dropped down the pole and TRAPPED ${MOUSE_META[actualVictim].name} on the Cheese Wheel! ${MOUSE_META[actualVictim].name} cannot move until freed!`,
  };
}

/**
 * Allows the player (when zoomed into the board controlling their mouse) to collect a floating cheese wedge directly!
 */
export function collectFloatingCheeseInControlMode(
  state: MouseTrapGameState,
  color: MouseColor = 'red'
): MouseTrapGameState {
  const m = state.mice[color];
  if (m.isTrapped) {
    return {
      ...state,
      lastActionLog: `${MOUSE_META[color].name} is locked inside the Red Cage! Roll the Die or spend 2 Cheese to lift the cage first!`,
    };
  }
  const updatedMouse: MousePawnState = {
    ...m,
    cheeseCount: m.cheeseCount + 1,
  };
  return {
    ...state,
    mice: {
      ...state.mice,
      [color]: updatedMouse,
    },
    lastActionLog: `${MOUSE_META[color].name} leaped up on the living board and snatched a Floating Cheese Wedge! (${updatedMouse.cheeseCount} Cheese)`,
  };
}
