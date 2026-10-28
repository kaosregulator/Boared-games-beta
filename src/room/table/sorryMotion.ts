import {
  getNormalizedBoardCoords,
  type LegalMove,
  type PawnState,
  type PawnZone,
  type PlayerColor,
  type SorryGameState,
  type StepWaypoint,
} from '../../games/sorry/sorryRules';

/** A point on the board in the rules' own normalized coordinates. */
export interface BoardUV {
  u: number;
  v: number;
  /** A slide square: the pawn whizzes across it. */
  slide?: boolean;
}

export function squareUV(zone: PawnZone, color: PlayerColor, trackIndex: number, safetyIndex: number, pawnIndex: number): BoardUV {
  const index = zone === 'track' ? trackIndex : zone === 'safety' ? safetyIndex : pawnIndex;
  return getNormalizedBoardCoords(zone, color, index, pawnIndex);
}

export function pawnUV(pawn: PawnState): BoardUV {
  return squareUV(pawn.zone, pawn.color, pawn.trackIndex, pawn.safetyIndex, pawn.pawnIndex);
}

function stepsUV(pawn: PawnState, steps: StepWaypoint[]): BoardUV[] {
  return steps.map(s => ({ ...squareUV(s.zone, pawn.color, s.trackIndex, s.safetyIndex, pawn.pawnIndex), slide: s.isSlide }));
}

/**
 * The squares every pawn crosses during `move`, one entry per square, so the
 * table can walk each pawn square by square. A pawn that only changes place
 * (a swap, or a bumped pawn going back to START) gets a single hop.
 * Pawns that stay put are left out.
 */
export function movePaths(state: SorryGameState, move: LegalMove): Map<string, BoardUV[]> {
  const paths = new Map<string, BoardUV[]>();
  const pawn = (id: string) => state.pawns.find(p => p.id === id);
  const primary = pawn(move.primaryPawnId);
  if (primary) paths.set(primary.id, stepsUV(primary, move.primarySteps));
  const secondary = move.secondaryPawnId ? pawn(move.secondaryPawnId) : undefined;
  if (secondary && move.secondarySteps) paths.set(secondary.id, stepsUV(secondary, move.secondarySteps));
  // the bumped go back to START
  for (const b of move.bumpedPawns) {
    const victim = pawn(b.pawnId);
    if (victim && !paths.has(victim.id)) paths.set(victim.id, [squareUV('start', victim.color, -1, -1, victim.pawnIndex)]);
  }
  return paths;
}

/** Where a move ends for the mover, for the destination rings. */
export function moveDestination(state: SorryGameState, move: LegalMove): BoardUV | null {
  const pawn = state.pawns.find(p => p.id === move.primaryPawnId);
  const last = move.primarySteps[move.primarySteps.length - 1];
  return pawn && last ? squareUV(last.zone, pawn.color, last.trackIndex, last.safetyIndex, pawn.pawnIndex) : null;
}
