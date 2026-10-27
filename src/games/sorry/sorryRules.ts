// Classic Sorry rules from the owner's Bored-games project. The board in this
// room draws from these positions; the flat Pawn Rush screen is not used.
export type PlayerColor = 'red' | 'blue' | 'yellow' | 'green';

export const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'yellow', 'green'];

export const PLAYER_META: Record<
  PlayerColor,
  {
    name: string;
    hex: string;
    accentHex: string;
    sideIndex: number; // 0 = Top (Red), 1 = Right (Blue), 2 = Bottom (Yellow), 3 = Left (Green) in board texture or standard clockwise
    safetyEntryTrack: number;
    startExitTrack: number;
  }
> = {
  // Matching the uploaded reference image orientation:
  // Red = Top-Left / Left-Top side (side 0), Blue = Top-Right (side 1), Yellow = Bottom-Right (side 2), Green = Bottom-Left (side 3)
  red: {
    name: 'Red',
    hex: '#ef4444',
    accentHex: '#fca5a5',
    sideIndex: 0,
    safetyEntryTrack: 2,
    startExitTrack: 4,
  },
  blue: {
    name: 'Blue',
    hex: '#3b82f6',
    accentHex: '#93c5fd',
    sideIndex: 1,
    safetyEntryTrack: 17,
    startExitTrack: 19,
  },
  yellow: {
    name: 'Yellow',
    hex: '#eab308',
    accentHex: '#fde047',
    sideIndex: 2,
    safetyEntryTrack: 32,
    startExitTrack: 34,
  },
  green: {
    name: 'Green',
    hex: '#22c55e',
    accentHex: '#86efac',
    sideIndex: 3,
    safetyEntryTrack: 47,
    startExitTrack: 49,
  },
};

export type CardRank =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '7'
  | '8'
  | '10'
  | '11'
  | '12'
  | 'SORRY!';

export interface CardInfo {
  rank: CardRank;
  title: string;
  ruleSummary: string;
}

export const CARD_INFO: Record<CardRank, CardInfo> = {
  '1': {
    rank: '1',
    title: 'Move 1 or Start',
    ruleSummary: 'Move a pawn from START onto the track, or move a pawn forward 1 space.',
  },
  '2': {
    rank: '2',
    title: 'Move 2 or Start + Draw Again',
    ruleSummary: 'Move a pawn from START or forward 2 spaces. Then DRAW AGAIN!',
  },
  '3': {
    rank: '3',
    title: 'Move Forward 3',
    ruleSummary: 'Move one of your pawns forward 3 spaces.',
  },
  '4': {
    rank: '4',
    title: 'Move Backward 4',
    ruleSummary: 'Move one of your pawns backward 4 spaces.',
  },
  '5': {
    rank: '5',
    title: 'Move Forward 5',
    ruleSummary: 'Move one of your pawns forward 5 spaces.',
  },
  '7': {
    rank: '7',
    title: 'Move 7 or Split 7',
    ruleSummary: 'Move one pawn forward 7 spaces, or split 7 forward spaces between two pawns.',
  },
  '8': {
    rank: '8',
    title: 'Move Forward 8',
    ruleSummary: 'Move one of your pawns forward 8 spaces.',
  },
  '10': {
    rank: '10',
    title: 'Move Forward 10 or Back 1',
    ruleSummary: 'Move one pawn forward 10 spaces, or move one pawn backward 1 space.',
  },
  '11': {
    rank: '11',
    title: 'Move 11 or Swap Places',
    ruleSummary: 'Move forward 11 spaces, or swap any of your open-track pawns with an opponent pawn.',
  },
  '12': {
    rank: '12',
    title: 'Move Forward 12',
    ruleSummary: 'Move one of your pawns forward 12 spaces.',
  },
  'SORRY!': {
    rank: 'SORRY!',
    title: 'SORRY! Sweet Revenge',
    ruleSummary:
      'Take a pawn from your START and replace any opponent pawn on the open track, bumping them back to START!',
  },
};

export type PawnZone = 'start' | 'track' | 'safety' | 'home';

export interface PawnState {
  id: string; // e.g., 'red-0'
  color: PlayerColor;
  pawnIndex: number; // 0..3
  zone: PawnZone;
  trackIndex: number; // 0..59 when zone === 'track'
  safetyIndex: number; // 0..4 when zone === 'safety'
}

export interface SlideSegment {
  color: PlayerColor;
  startTrack: number;
  endTrack: number;
  squares: number[];
}

// Each side of the 60-square perimeter (0..59) has 2 slides:
// Short slide: +1 to +4 (4 squares)
// Long slide: +9 to +13 (5 squares)
export const SLIDE_SEGMENTS: SlideSegment[] = [
  { color: 'red', startTrack: 1, endTrack: 4, squares: [1, 2, 3, 4] },
  { color: 'red', startTrack: 9, endTrack: 13, squares: [9, 10, 11, 12, 13] },
  { color: 'blue', startTrack: 16, endTrack: 19, squares: [16, 17, 18, 19] },
  { color: 'blue', startTrack: 24, endTrack: 28, squares: [24, 25, 26, 27, 28] },
  { color: 'yellow', startTrack: 31, endTrack: 34, squares: [31, 32, 33, 34] },
  { color: 'yellow', startTrack: 39, endTrack: 43, squares: [39, 40, 41, 42, 43] },
  { color: 'green', startTrack: 46, endTrack: 49, squares: [46, 47, 48, 49] },
  { color: 'green', startTrack: 54, endTrack: 58, squares: [54, 55, 56, 57, 58] },
];

export interface StepWaypoint {
  zone: PawnZone;
  trackIndex: number;
  safetyIndex: number;
  isSlide?: boolean;
}

export interface BumpedPawnEvent {
  pawnId: string;
  color: PlayerColor;
  pawnIndex: number;
  fromTrackIndex: number;
}

export interface LegalMove {
  id: string;
  label: string;
  description: string;
  primaryPawnId: string;
  primarySteps: StepWaypoint[];
  secondaryPawnId?: string;
  secondarySteps?: StepWaypoint[];
  isSwap?: boolean;
  swapTargetPawnId?: string;
  isSorryStrike?: boolean;
  bumpedPawns: BumpedPawnEvent[];
  triggeredSlide: boolean;
  entersHome: boolean;
  leavesStart: boolean;
  scoreWeight: number; // Used for AI heuristics
}

export interface GameStats {
  turnsPlayed: number;
  cardsDrawn: number;
  bumpsInflicted: Record<PlayerColor, number>;
  slidesTriggered: Record<PlayerColor, number>;
}

export interface SorryGameState {
  pawns: PawnState[];
  deck: CardRank[];
  discardPile: CardRank[];
  currentCard: CardRank | null;
  currentTurn: PlayerColor;
  turnPhase: 'draw' | 'move' | 'animating' | 'gameover';
  legalMoves: LegalMove[];
  winner: PlayerColor | null;
  lastActionLog: string;
  extraTurnPending: boolean;
  stats: GameStats;
}

/**
 * Creates a standard 45-card Classic Sorry! deck (five 1s, four of each other rank).
 */
export function createStandardDeck(rng: () => number = Math.random): CardRank[] {
  const ranks: CardRank[] = ['2', '3', '4', '5', '7', '8', '10', '11', '12', 'SORRY!'];
  const deck: CardRank[] = ['1', '1', '1', '1', '1'];
  for (const r of ranks) {
    deck.push(r, r, r, r);
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

export function createInitialPawns(): PawnState[] {
  const pawns: PawnState[] = [];
  for (const color of PLAYER_COLORS) {
    for (let i = 0; i < 4; i++) {
      pawns.push({
        id: `${color}-${i}`,
        color,
        pawnIndex: i,
        zone: 'start',
        trackIndex: -1,
        safetyIndex: -1,
      });
    }
  }
  return pawns;
}

export function createInitialGameState(rng: () => number = Math.random): SorryGameState {
  const deck = createStandardDeck(rng);
  // Ensure the very first drawn card (top of stack = end of array) is a '1' or '2'
  // so the player can immediately move a 3D pawn out of START on Turn 1!
  const lastIdx = deck.length - 1;
  if (deck[lastIdx] !== '1' && deck[lastIdx] !== '2') {
    const startCardIdx = deck.findIndex((c) => c === '1' || c === '2');
    if (startCardIdx !== -1) {
      const tmp = deck[lastIdx];
      deck[lastIdx] = deck[startCardIdx];
      deck[startCardIdx] = tmp;
    }
  }
  return {
    pawns: createInitialPawns(),
    deck,
    discardPile: [],
    currentCard: null,
    currentTurn: 'red',
    turnPhase: 'draw',
    legalMoves: [],
    winner: null,
    lastActionLog: 'Walk up to the table and unfold the SORRY! box to begin.',
    extraTurnPending: false,
    stats: {
      turnsPlayed: 0,
      cardsDrawn: 0,
      bumpsInflicted: { red: 0, blue: 0, yellow: 0, green: 0 },
      slidesTriggered: { red: 0, blue: 0, yellow: 0, green: 0 },
    },
  };
}

export function wrapTrackIndex(idx: number): number {
  return ((idx % 60) + 60) % 60;
}

/**
 * Simulates moving a single pawn step-by-step forward (+1) or backward (-1).
 * Returns null if the path is illegal (e.g. overshooting HOME or moving backward from START/HOME).
 */
export function computeStepWaypoints(
  pawn: PawnState,
  steps: number
): StepWaypoint[] | null {
  if (pawn.zone === 'start' || pawn.zone === 'home' || steps === 0) {
    return null;
  }

  const waypoints: StepWaypoint[] = [];
  let curZone: PawnZone = pawn.zone;
  let curTrack = pawn.trackIndex;
  let curSafety = pawn.safetyIndex;
  const meta = PLAYER_META[pawn.color];

  const dir = steps > 0 ? 1 : -1;
  const count = Math.abs(steps);

  for (let s = 0; s < count; s++) {
    if (dir === 1) {
      // Moving forward
      if (curZone === 'track') {
        if (curTrack === meta.safetyEntryTrack) {
          curZone = 'safety';
          curTrack = -1;
          curSafety = 0;
        } else {
          curTrack = wrapTrackIndex(curTrack + 1);
        }
      } else if (curZone === 'safety') {
        if (curSafety < 4) {
          curSafety += 1;
        } else if (curSafety === 4) {
          curZone = 'home';
          curSafety = -1;
        } else {
          return null;
        }
      } else {
        // Already in home before finishing steps -> overshoot!
        return null;
      }
    } else {
      // Moving backward (never enters safety zone when backing up!)
      if (curZone === 'safety') {
        if (curSafety > 0) {
          curSafety -= 1;
        } else {
          curZone = 'track';
          curSafety = -1;
          curTrack = meta.safetyEntryTrack;
        }
      } else if (curZone === 'track') {
        curTrack = wrapTrackIndex(curTrack - 1);
      } else {
        return null;
      }
    }

    waypoints.push({
      zone: curZone,
      trackIndex: curTrack,
      safetyIndex: curSafety,
    });
  }

  return waypoints;
}

/**
 * Checks if landing on `finalStep` triggers a slide or bumps any pawns,
 * or is blocked by own pawn.
 */
function evaluateFinalLanding(
  movingColor: PlayerColor,
  movingPawnId: string,
  baseWaypoints: StepWaypoint[],
  allPawns: PawnState[]
): {
  valid: boolean;
  fullWaypoints: StepWaypoint[];
  bumpedPawns: BumpedPawnEvent[];
  triggeredSlide: boolean;
} {
  if (baseWaypoints.length === 0) {
    return { valid: false, fullWaypoints: [], bumpedPawns: [], triggeredSlide: false };
  }

  const fullWaypoints = baseWaypoints.map((w) => ({ ...w }));
  const last = fullWaypoints[fullWaypoints.length - 1];
  const bumpedPawns: BumpedPawnEvent[] = [];
  let triggeredSlide = false;

  if (last.zone === 'home') {
    return { valid: true, fullWaypoints, bumpedPawns, triggeredSlide: false };
  }

  if (last.zone === 'safety') {
    // Cannot land on own pawn in safety zone
    const occupiedBySelf = allPawns.some(
      (p) =>
        p.id !== movingPawnId &&
        p.color === movingColor &&
        p.zone === 'safety' &&
        p.safetyIndex === last.safetyIndex
    );
    if (occupiedBySelf) {
      return { valid: false, fullWaypoints: [], bumpedPawns: [], triggeredSlide: false };
    }
    return { valid: true, fullWaypoints, bumpedPawns, triggeredSlide: false };
  }

  if (last.zone === 'track') {
    // Check if last.trackIndex is the start of a foreign slide!
    const slide = SLIDE_SEGMENTS.find(
      (seg) => seg.startTrack === last.trackIndex && seg.color !== movingColor
    );

    if (slide) {
      // Check if another own pawn is sitting at the VERY END of the slide?
      // Actually in Classic Sorry!, sliding bumps ALL pawns on the slide (including your own),
      // so you can never end up sharing the final square with your own pawn because it gets bumped to START!
      triggeredSlide = true;
      for (let i = 1; i < slide.squares.length; i++) {
        fullWaypoints.push({
          zone: 'track',
          trackIndex: slide.squares[i],
          safetyIndex: -1,
          isSlide: true,
        });
      }

      // Collect any pawns on any square of the slide
      for (const sq of slide.squares) {
        const victim = allPawns.find(
          (p) => p.id !== movingPawnId && p.zone === 'track' && p.trackIndex === sq
        );
        if (victim) {
          bumpedPawns.push({
            pawnId: victim.id,
            color: victim.color,
            pawnIndex: victim.pawnIndex,
            fromTrackIndex: sq,
          });
        }
      }

      return { valid: true, fullWaypoints, bumpedPawns, triggeredSlide };
    } else {
      // Standard track landing: cannot land on own pawn
      const ownOccupant = allPawns.find(
        (p) =>
          p.id !== movingPawnId &&
          p.color === movingColor &&
          p.zone === 'track' &&
          p.trackIndex === last.trackIndex
      );
      if (ownOccupant) {
        return { valid: false, fullWaypoints: [], bumpedPawns: [], triggeredSlide: false };
      }

      // Check opponent bump
      const opponentOccupant = allPawns.find(
        (p) =>
          p.id !== movingPawnId &&
          p.color !== movingColor &&
          p.zone === 'track' &&
          p.trackIndex === last.trackIndex
      );
      if (opponentOccupant) {
        bumpedPawns.push({
          pawnId: opponentOccupant.id,
          color: opponentOccupant.color,
          pawnIndex: opponentOccupant.pawnIndex,
          fromTrackIndex: last.trackIndex,
        });
      }

      return { valid: true, fullWaypoints, bumpedPawns, triggeredSlide: false };
    }
  }

  return { valid: false, fullWaypoints: [], bumpedPawns: [], triggeredSlide: false };
}

function scoreMoveHeuristic(
  color: PlayerColor,
  pawn: PawnState,
  finalWaypoint: StepWaypoint,
  bumpedPawns: BumpedPawnEvent[],
  triggeredSlide: boolean,
  leavesStart: boolean
): number {
  let score = 10;
  if (finalWaypoint.zone === 'home') score += 120;
  if (finalWaypoint.zone === 'safety') score += 60 + finalWaypoint.safetyIndex * 5;
  if (leavesStart) score += 75;
  if (triggeredSlide) score += 45;

  for (const b of bumpedPawns) {
    if (b.color !== color) {
      score += 90; // Bumping an opponent is high value!
    } else {
      score -= 65; // Avoid bumping own pawn on a slide if possible
    }
  }

  // Prefer advancing pawns that are closer to safety entry
  if (pawn.zone === 'track' && finalWaypoint.zone === 'track') {
    const safetyEntry = PLAYER_META[color].safetyEntryTrack;
    const distBefore = wrapTrackIndex(safetyEntry - pawn.trackIndex);
    const distAfter = wrapTrackIndex(safetyEntry - finalWaypoint.trackIndex);
    if (distAfter < distBefore) {
      score += (60 - distAfter) * 0.4;
    }
  }

  return score;
}

/**
 * Generates all legal moves for `playerColor` given `card` and current `pawns`.
 */
export function getLegalMovesForCard(
  pawns: PawnState[],
  playerColor: PlayerColor,
  card: CardRank
): LegalMove[] {
  const moves: LegalMove[] = [];
  const myPawns = pawns.filter((p) => p.color === playerColor);
  const meta = PLAYER_META[playerColor];

  // Helper to add a start exit move (used by '1' and '2')
  const tryAddStartExitMove = () => {
    const startPawn = myPawns.find((p) => p.zone === 'start');
    if (!startPawn) return;

    const exitStep: StepWaypoint = {
      zone: 'track',
      trackIndex: meta.startExitTrack,
      safetyIndex: -1,
    };
    const evalRes = evaluateFinalLanding(playerColor, startPawn.id, [exitStep], pawns);
    if (evalRes.valid) {
      const bumpText =
        evalRes.bumpedPawns.length > 0
          ? ` & Bump ${PLAYER_META[evalRes.bumpedPawns[0].color].name}!`
          : '';
      moves.push({
        id: `start-${startPawn.id}`,
        label: `Pawn #${startPawn.pawnIndex + 1}: Leave START${bumpText}`,
        description: `Move Pawn #${startPawn.pawnIndex + 1} onto the Start Exit square.`,
        primaryPawnId: startPawn.id,
        primarySteps: evalRes.fullWaypoints,
        bumpedPawns: evalRes.bumpedPawns,
        triggeredSlide: evalRes.triggeredSlide,
        entersHome: false,
        leavesStart: true,
        scoreWeight: scoreMoveHeuristic(
          playerColor,
          startPawn,
          evalRes.fullWaypoints[evalRes.fullWaypoints.length - 1],
          evalRes.bumpedPawns,
          evalRes.triggeredSlide,
          true
        ),
      });
    }
  };

  // Helper to add standard step moves for each active pawn
  const tryAddStepMoves = (steps: number, labelPrefix?: string) => {
    for (const pawn of myPawns) {
      if (pawn.zone === 'start' || pawn.zone === 'home') continue;
      const waypoints = computeStepWaypoints(pawn, steps);
      if (!waypoints) continue;

      const evalRes = evaluateFinalLanding(playerColor, pawn.id, waypoints, pawns);
      if (!evalRes.valid) continue;

      const finalWp = evalRes.fullWaypoints[evalRes.fullWaypoints.length - 1];
      const destLabel =
        finalWp.zone === 'home'
          ? 'into HOME!'
          : finalWp.zone === 'safety'
          ? `to Safety Zone ${finalWp.safetyIndex + 1}`
          : evalRes.triggeredSlide
          ? `to Slide (Square ${finalWp.trackIndex})`
          : `to Square ${finalWp.trackIndex}`;

      const bumpSuffix =
        evalRes.bumpedPawns.length > 0
          ? ` [Bumps ${evalRes.bumpedPawns.map((b) => PLAYER_META[b.color].name).join(', ')}]`
          : '';

      const dirWord = steps > 0 ? `+${steps}` : `${steps}`;
      moves.push({
        id: `step-${pawn.id}-${steps}`,
        label: `${labelPrefix ?? `Pawn #${pawn.pawnIndex + 1} (${dirWord})`}: ${destLabel}${bumpSuffix}`,
        description: `Move Pawn #${pawn.pawnIndex + 1} ${
          steps > 0 ? `forward ${steps}` : `backward ${Math.abs(steps)}`
        } spaces ${destLabel}.`,
        primaryPawnId: pawn.id,
        primarySteps: evalRes.fullWaypoints,
        bumpedPawns: evalRes.bumpedPawns,
        triggeredSlide: evalRes.triggeredSlide,
        entersHome: finalWp.zone === 'home',
        leavesStart: false,
        scoreWeight: scoreMoveHeuristic(
          playerColor,
          pawn,
          finalWp,
          evalRes.bumpedPawns,
          evalRes.triggeredSlide,
          false
        ),
      });
    }
  };

  switch (card) {
    case '1':
      tryAddStartExitMove();
      tryAddStepMoves(1);
      break;

    case '2':
      tryAddStartExitMove();
      tryAddStepMoves(2);
      break;

    case '3':
      tryAddStepMoves(3);
      break;

    case '4':
      tryAddStepMoves(-4);
      break;

    case '5':
      tryAddStepMoves(5);
      break;

    case '7': {
      // Full 7 on a single pawn
      tryAddStepMoves(7);

      // Or split 7 between any two distinct active pawns (p1 takes s1, p2 takes 7 - s1)
      const activePawns = myPawns.filter((p) => p.zone === 'track' || p.zone === 'safety');
      if (activePawns.length >= 2) {
        for (let i = 0; i < activePawns.length; i++) {
          for (let j = i + 1; j < activePawns.length; j++) {
            const pA = activePawns[i];
            const pB = activePawns[j];
            for (let sA = 6; sA >= 1; sA--) {
              const sB = 7 - sA;
              const wpA = computeStepWaypoints(pA, sA);
              const wpB = computeStepWaypoints(pB, sB);
              if (!wpA || !wpB) continue;

              const evalA = evaluateFinalLanding(playerColor, pA.id, wpA, pawns);
              if (!evalA.valid) continue;

              // Simulate pA moved to its final spot before evaluating pB
              const endA = evalA.fullWaypoints[evalA.fullWaypoints.length - 1];
              const tempPawns = pawns.map((p) => {
                if (p.id === pA.id) {
                  return {
                    ...p,
                    zone: endA.zone,
                    trackIndex: endA.trackIndex,
                    safetyIndex: endA.safetyIndex,
                  };
                }
                if (evalA.bumpedPawns.some((b) => b.pawnId === p.id)) {
                  return { ...p, zone: 'start' as PawnZone, trackIndex: -1, safetyIndex: -1 };
                }
                return p;
              });

              const evalB = evaluateFinalLanding(playerColor, pB.id, wpB, tempPawns);
              if (!evalB.valid) continue;

              const endB = evalB.fullWaypoints[evalB.fullWaypoints.length - 1];
              const combinedBumps = [...evalA.bumpedPawns, ...evalB.bumpedPawns];
              const triggeredSlide = evalA.triggeredSlide || evalB.triggeredSlide;

              moves.push({
                id: `split7-${pA.id}-${sA}-${pB.id}-${sB}`,
                label: `Split 7: Pawn #${pA.pawnIndex + 1} (+${sA}) & Pawn #${pB.pawnIndex + 1} (+${sB})`,
                description: `Advance Pawn #${pA.pawnIndex + 1} by ${sA} and Pawn #${pB.pawnIndex + 1} by ${sB}.`,
                primaryPawnId: pA.id,
                primarySteps: evalA.fullWaypoints,
                secondaryPawnId: pB.id,
                secondarySteps: evalB.fullWaypoints,
                bumpedPawns: combinedBumps,
                triggeredSlide,
                entersHome: endA.zone === 'home' || endB.zone === 'home',
                leavesStart: false,
                scoreWeight:
                  scoreMoveHeuristic(
                    playerColor,
                    pA,
                    endA,
                    evalA.bumpedPawns,
                    evalA.triggeredSlide,
                    false
                  ) +
                  scoreMoveHeuristic(
                    playerColor,
                    pB,
                    endB,
                    evalB.bumpedPawns,
                    evalB.triggeredSlide,
                    false
                  ) *
                    0.85,
              });
            }
          }
        }
      }
      break;
    }

    case '8':
      tryAddStepMoves(8);
      break;

    case '10':
      tryAddStepMoves(10);
      tryAddStepMoves(-1);
      break;

    case '11': {
      tryAddStepMoves(11);
      // Also allow swapping any own track pawn with any opponent track pawn
      const myTrackPawns = myPawns.filter((p) => p.zone === 'track');
      const oppTrackPawns = pawns.filter(
        (p) => p.color !== playerColor && p.zone === 'track'
      );

      for (const myP of myTrackPawns) {
        for (const oppP of oppTrackPawns) {
          const targetStep: StepWaypoint = {
            zone: 'track',
            trackIndex: oppP.trackIndex,
            safetyIndex: -1,
          };
          // If swapping onto the start of a foreign slide, it also triggers that slide!
          const otherPawnsWithoutOpp = pawns.filter((p) => p.id !== oppP.id);
          const evalRes = evaluateFinalLanding(
            playerColor,
            myP.id,
            [targetStep],
            otherPawnsWithoutOpp
          );
          if (!evalRes.valid) continue;

          const oppFinalStep: StepWaypoint = {
            zone: 'track',
            trackIndex: myP.trackIndex,
            safetyIndex: -1,
          };

          moves.push({
            id: `swap11-${myP.id}-${oppP.id}`,
            label: `Swap Pawn #${myP.pawnIndex + 1} with ${PLAYER_META[oppP.color].name} Pawn #${oppP.pawnIndex + 1}`,
            description: `Switch places on the perimeter track with ${PLAYER_META[oppP.color].name}.`,
            primaryPawnId: myP.id,
            primarySteps: evalRes.fullWaypoints,
            secondaryPawnId: oppP.id,
            secondarySteps: [oppFinalStep],
            isSwap: true,
            swapTargetPawnId: oppP.id,
            bumpedPawns: evalRes.bumpedPawns,
            triggeredSlide: evalRes.triggeredSlide,
            entersHome: false,
            leavesStart: false,
            scoreWeight: 65 + (evalRes.triggeredSlide ? 35 : 0),
          });
        }
      }
      break;
    }

    case '12':
      tryAddStepMoves(12);
      break;

    case 'SORRY!': {
      const startPawn = myPawns.find((p) => p.zone === 'start');
      const oppTrackPawns = pawns.filter(
        (p) => p.color !== playerColor && p.zone === 'track'
      );

      if (startPawn && oppTrackPawns.length > 0) {
        for (const oppP of oppTrackPawns) {
          const strikeStep: StepWaypoint = {
            zone: 'track',
            trackIndex: oppP.trackIndex,
            safetyIndex: -1,
          };
          const evalRes = evaluateFinalLanding(
            playerColor,
            startPawn.id,
            [strikeStep],
            pawns
          );
          if (!evalRes.valid) continue;

          // Ensure oppP is included in bumpedPawns even if a slide happened
          const bumps = [...evalRes.bumpedPawns];
          if (!bumps.some((b) => b.pawnId === oppP.id)) {
            bumps.unshift({
              pawnId: oppP.id,
              color: oppP.color,
              pawnIndex: oppP.pawnIndex,
              fromTrackIndex: oppP.trackIndex,
            });
          }

          moves.push({
            id: `sorry-${startPawn.id}-${oppP.id}`,
            label: `SORRY! Bump ${PLAYER_META[oppP.color].name} Pawn #${oppP.pawnIndex + 1} (Sq ${oppP.trackIndex})`,
            description: `Take Pawn #${startPawn.pawnIndex + 1} from START and send ${PLAYER_META[oppP.color].name} back to START!`,
            primaryPawnId: startPawn.id,
            primarySteps: evalRes.fullWaypoints,
            isSorryStrike: true,
            bumpedPawns: bumps,
            triggeredSlide: evalRes.triggeredSlide,
            entersHome: false,
            leavesStart: true,
            scoreWeight: 135 + (evalRes.triggeredSlide ? 30 : 0),
          });
        }
      }
      break;
    }
  }

  // Sort moves so highest tactical value is first
  moves.sort((a, b) => b.scoreWeight - a.scoreWeight);
  return moves;
}

/**
 * Draws the next card from the deck (reshuffling discard pile if needed) and computes legal moves.
 */
export function drawNextCard(
  state: SorryGameState,
  rng: () => number = Math.random
): SorryGameState {
  let deck = [...state.deck];
  let discardPile = [...state.discardPile];

  if (deck.length === 0) {
    deck = createStandardDeck(rng);
    discardPile = [];
  }

  const card = deck.pop()!;
  discardPile.push(card);

  const legalMoves = getLegalMovesForCard(state.pawns, state.currentTurn, card);
  const extraTurnPending = card === '2';

  const playerName = PLAYER_META[state.currentTurn].name;
  const actionLog =
    legalMoves.length > 0
      ? `${playerName} drew [${card}] — ${CARD_INFO[card].title}.`
      : `${playerName} drew [${card}], but has no legal moves.`;

  return {
    ...state,
    deck,
    discardPile,
    currentCard: card,
    turnPhase: 'move',
    legalMoves,
    extraTurnPending,
    lastActionLog: actionLog,
    stats: {
      ...state.stats,
      cardsDrawn: state.stats.cardsDrawn + 1,
    },
  };
}

/**
 * Applies a chosen `LegalMove` (or passes the turn if `move === null`) and returns the updated state.
 */
export function applyMoveToState(
  state: SorryGameState,
  move: LegalMove | null
): SorryGameState {
  const currentColor = state.currentTurn;
  const playerName = PLAYER_META[currentColor].name;

  const updatedPawns = state.pawns.map((p) => ({ ...p }));
  const stats: GameStats = {
    turnsPlayed: state.stats.turnsPlayed + 1,
    cardsDrawn: state.stats.cardsDrawn,
    bumpsInflicted: { ...state.stats.bumpsInflicted },
    slidesTriggered: { ...state.stats.slidesTriggered },
  };

  let log = `${playerName} had no legal moves and passed.`;

  if (move) {
    // 1. Update primary pawn
    const primary = updatedPawns.find((p) => p.id === move.primaryPawnId);
    if (primary && move.primarySteps.length > 0) {
      const finalWp = move.primarySteps[move.primarySteps.length - 1];
      primary.zone = finalWp.zone;
      primary.trackIndex = finalWp.trackIndex;
      primary.safetyIndex = finalWp.safetyIndex;
    }

    // 2. Update secondary pawn (for Split 7 or 11 Swap)
    if (move.secondaryPawnId && move.secondarySteps && move.secondarySteps.length > 0) {
      const secondary = updatedPawns.find((p) => p.id === move.secondaryPawnId);
      if (secondary) {
        const finalSecWp = move.secondarySteps[move.secondarySteps.length - 1];
        secondary.zone = finalSecWp.zone;
        secondary.trackIndex = finalSecWp.trackIndex;
        secondary.safetyIndex = finalSecWp.safetyIndex;
      }
    }

    // 3. Apply bumps (send bumped pawns back to START)
    for (const bumped of move.bumpedPawns) {
      const victim = updatedPawns.find((p) => p.id === bumped.pawnId);
      if (victim) {
        victim.zone = 'start';
        victim.trackIndex = -1;
        victim.safetyIndex = -1;
        if (victim.color !== currentColor) {
          stats.bumpsInflicted[currentColor] += 1;
        }
      }
    }

    if (move.triggeredSlide) {
      stats.slidesTriggered[currentColor] += 1;
    }

    log = `${playerName}: ${move.label}`;
  }

  // Check if currentColor won (all 4 pawns in 'home')
  const won = updatedPawns
    .filter((p) => p.color === currentColor)
    .every((p) => p.zone === 'home');

  if (won) {
    return {
      ...state,
      pawns: updatedPawns,
      turnPhase: 'gameover',
      legalMoves: [],
      winner: currentColor,
      lastActionLog: `${playerName} got all 4 pawns HOME and won the game!`,
      extraTurnPending: false,
      stats,
    };
  }

  // Advance turn unless extraTurnPending (Card '2')
  const nextTurn = state.extraTurnPending
    ? currentColor
    : PLAYER_COLORS[(PLAYER_COLORS.indexOf(currentColor) + 1) % PLAYER_COLORS.length];

  if (state.extraTurnPending) {
    log += ` (${playerName} gets an extra turn for drawing a 2!)`;
  }

  return {
    ...state,
    pawns: updatedPawns,
    currentTurn: nextTurn,
    turnPhase: 'draw',
    legalMoves: [],
    extraTurnPending: false,
    lastActionLog: log,
    stats,
  };
}

/**
 * Converts a logical board position into normalized 2D board coordinates `[-0.5, 0.5]`
 * (where board width = 1.0, height = 1.0, centered at (0,0)).
 * This guarantees 1-to-1 alignment between the 2D board canvas texture and 3D pawn positions!
 */
export function getNormalizedBoardCoords(
  zone: PawnZone,
  color: PlayerColor,
  index: number, // trackIndex (0..59), safetyIndex (0..4), or pawnIndex (0..3) for start/home
  pawnSlot: number = 0
): { u: number; v: number } {
  // The board has a 16x16 grid inside a small outer black border.
  // Outer border takes 3.5% on each side -> grid spans [-0.465, +0.465].
  // 16 cells across -> cellSize = 0.93 / 16 = 0.058125.
  // Cell centers (0..15) are at -0.465 + (col + 0.5) * cellSize.
  const gridHalf = 0.465;
  const cellSize = (gridHalf * 2) / 16;
  const cellCenter = (c: number) => -gridHalf + (c + 0.5) * cellSize;

  // Helper to rotate (col, row) for side 0 (top, Red), side 1 (right, Blue), side 2 (bottom, Yellow), side 3 (left, Green)
  const rotateGridCell = (col: number, row: number, sideIndex: number): { u: number; v: number } => {
    const x0 = cellCenter(col);
    const y0 = cellCenter(row);
    switch (sideIndex % 4) {
      case 0: // Top side (Red)
        return { u: x0, v: y0 };
      case 1: // Right side (Blue) - rotated 90 deg clockwise
        return { u: -y0, v: x0 };
      case 2: // Bottom side (Yellow) - rotated 180 deg
        return { u: -x0, v: -y0 };
      case 3: // Left side (Green) - rotated 270 deg clockwise
      default:
        return { u: y0, v: -x0 };
    }
  };

  if (zone === 'track') {
    const t = wrapTrackIndex(index);
    const side = Math.floor(t / 15);
    const offset = t % 15; // 0..14 along top edge from left (col=offset, row=0)
    return rotateGridCell(offset, 0, side);
  }

  const sideIndex = PLAYER_META[color].sideIndex;

  if (zone === 'safety') {
    // Safety zone is column 2, rows 1..5
    const row = 1 + Math.max(0, Math.min(4, index));
    return rotateGridCell(2, row, sideIndex);
  }

  // Slot offsets for multiple pawns inside START or HOME circles
  const slotAngles = [
    (-3 * Math.PI) / 4,
    -Math.PI / 4,
    (3 * Math.PI) / 4,
    Math.PI / 4,
  ];
  const angle = slotAngles[pawnSlot % 4];
  const slotRadius = cellSize * 0.52;

  if (zone === 'start') {
    // Circular START zone is centered below column 4, row 2.45
    const center = rotateGridCell(4, 2.45, sideIndex);
    return {
      u: center.u + Math.cos(angle) * slotRadius,
      v: center.v + Math.sin(angle) * slotRadius,
    };
  }

  // zone === 'home'
  // Circular HOME zone is centered at column 2, row 6.35 (at the end of the 5-square Safety Zone)
  const homeCenter = rotateGridCell(2, 6.35, sideIndex);
  return {
    u: homeCenter.u + Math.cos(angle) * slotRadius,
    v: homeCenter.v + Math.sin(angle) * slotRadius,
  };
}
