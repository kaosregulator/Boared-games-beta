import { Pawn, PawnColor, PawnRushCard, PawnRushState } from '../../types';

export const TRACK_LENGTH = 60; // 0 to 59 perimeter

export const PLAYER_CONFIG: Record<
  PawnColor,
  {
    name: string;
    startIndex: number; // Entry onto track
    safetyEntryIndex: number; // Index to turn into safety zone
    colorHex: string;
    bgClass: string;
    borderClass: string;
  }
> = {
  blue: {
    name: 'Blue Legion',
    startIndex: 4,
    safetyEntryIndex: 2,
    colorHex: '#3b82f6',
    bgClass: 'bg-blue-500',
    borderClass: 'border-blue-400'
  },
  red: {
    name: 'Red Raiders',
    startIndex: 19,
    safetyEntryIndex: 17,
    colorHex: '#ef4444',
    bgClass: 'bg-red-500',
    borderClass: 'border-red-400'
  },
  green: {
    name: 'Green Serpents',
    startIndex: 34,
    safetyEntryIndex: 32,
    colorHex: '#10b981',
    bgClass: 'bg-emerald-500',
    borderClass: 'border-emerald-400'
  },
  yellow: {
    name: 'Yellow Sparks',
    startIndex: 49,
    safetyEntryIndex: 47,
    colorHex: '#f59e0b',
    bgClass: 'bg-amber-500',
    borderClass: 'border-amber-400'
  }
};

export const CARD_DECK_PRESETS: Omit<PawnRushCard, 'id'>[] = [
  { value: '1', title: 'Card 1', description: 'Start a pawn or move forward 1 step.', canStart: true },
  { value: '2', title: 'Card 2', description: 'Start a pawn or move forward 2 steps. BONUS: Draw again!', canStart: true },
  { value: '3', title: 'Card 3', description: 'Move forward 3 spaces.', canStart: false },
  { value: '4', title: 'Card 4', description: 'Move BACKWARDS 4 spaces!', canStart: false },
  { value: '5', title: 'Card 5', description: 'Move forward 5 spaces.', canStart: false },
  { value: '7', title: 'Card 7', description: 'Move forward 7 spaces.', canStart: false },
  { value: '8', title: 'Card 8', description: 'Move forward 8 spaces.', canStart: false },
  { value: '10', title: 'Card 10', description: 'Move forward 10 spaces or move back 1 space.', canStart: false },
  { value: '11', title: 'Card 11', description: 'Move forward 11 spaces or SWAP with any opponent!', canStart: false },
  { value: '12', title: 'Card 12', description: 'Move forward 12 spaces.', canStart: false },
  { value: 'SORRY', title: 'SORRY! Card', description: 'Take a pawn from START and bump an opponent back to START!', canStart: false }
];

export function generateDeck(): PawnRushCard[] {
  const cards: PawnRushCard[] = [];
  // 4 of each card type
  CARD_DECK_PRESETS.forEach(preset => {
    for (let i = 0; i < 4; i++) {
      cards.push({
        ...preset,
        id: `card_${preset.value}_${i}_${Math.random()}`
      });
    }
  });
  // Shuffle Fisher-Yates
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function initializePawnRush(): PawnRushState {
  const players: PawnColor[] = ['blue', 'red', 'green', 'yellow'];
  const pawns: Record<PawnColor, Pawn[]> = {
    blue: [
      { id: 1, color: 'blue', position: -1, stepIndex: 0 },
      { id: 2, color: 'blue', position: -1, stepIndex: 0 },
      { id: 3, color: 'blue', position: -1, stepIndex: 0 }
    ],
    red: [
      { id: 1, color: 'red', position: -1, stepIndex: 0 },
      { id: 2, color: 'red', position: -1, stepIndex: 0 },
      { id: 3, color: 'red', position: -1, stepIndex: 0 }
    ],
    green: [
      { id: 1, color: 'green', position: -1, stepIndex: 0 },
      { id: 2, color: 'green', position: -1, stepIndex: 0 },
      { id: 3, color: 'green', position: -1, stepIndex: 0 }
    ],
    yellow: [
      { id: 1, color: 'yellow', position: -1, stepIndex: 0 },
      { id: 2, color: 'yellow', position: -1, stepIndex: 0 },
      { id: 3, color: 'yellow', position: -1, stepIndex: 0 }
    ]
  };

  return {
    players,
    pawns,
    currentTurnIndex: 0,
    currentCard: null,
    deck: generateDeck(),
    discardPile: [],
    selectedPawn: null,
    validMoveOptions: [],
    winner: null,
    message: "Draw a card to begin Pawn Rush!"
  };
}

export function calculateValidMovesForCard(
  card: PawnRushCard,
  playerColor: PawnColor,
  allPawns: Record<PawnColor, Pawn[]>
): { pawn: Pawn; targetPosition: number; description: string; swapWith?: Pawn }[] {
  const options: { pawn: Pawn; targetPosition: number; description: string; swapWith?: Pawn }[] = [];
  const playerPawns = allPawns[playerColor];
  const cfg = PLAYER_CONFIG[playerColor];

  // If Card is SORRY!
  if (card.value === 'SORRY') {
    const startPawn = playerPawns.find(p => p.position === -1);
    if (startPawn) {
      // Find all opponent pawns on open track
      Object.entries(allPawns).forEach(([col, pawns]) => {
        if (col !== playerColor) {
          pawns.forEach(oppPawn => {
            if (oppPawn.position >= 0 && oppPawn.position < TRACK_LENGTH) {
              options.push({
                pawn: startPawn,
                targetPosition: oppPawn.position,
                description: `SORRY! Bump ${PLAYER_CONFIG[oppPawn.color].name}'s pawn at space ${oppPawn.position} back to Start!`,
                swapWith: oppPawn
              });
            }
          });
        }
      });
    }
    return options;
  }

  // Normal Card moves
  for (const pawn of playerPawns) {
    // If Pawn is at Home, can't move
    if (pawn.position === 100) continue;

    // If at START (-1)
    if (pawn.position === -1) {
      if (card.canStart) {
        options.push({
          pawn,
          targetPosition: cfg.startIndex,
          description: `Enter Track at Start position (${cfg.startIndex})`
        });
      }
      continue;
    }

    // If already in Safety Zone (60..65)
    if (pawn.position >= 60 && pawn.position <= 65) {
      const stepVal = parseInt(card.value);
      if (!isNaN(stepVal)) {
        const nextPos = pawn.position + stepVal;
        if (nextPos <= 66) {
          options.push({
            pawn,
            targetPosition: nextPos === 66 ? 100 : nextPos,
            description: nextPos === 66 ? 'Move into HOME!' : `Advance in Safety Zone to step ${nextPos - 59}`
          });
        }
      }
      continue;
    }

    // Pawn is on main track (0..59)
    if (card.value === '4') {
      // Backwards 4
      const nextPos = (pawn.position - 4 + TRACK_LENGTH) % TRACK_LENGTH;
      options.push({
        pawn,
        targetPosition: nextPos,
        description: `Move backwards 4 steps to space ${nextPos}`
      });
    } else if (card.value === '10') {
      // Forward 10
      const nextPos = (pawn.position + 10) % TRACK_LENGTH;
      options.push({
        pawn,
        targetPosition: nextPos,
        description: `Advance forward 10 steps to space ${nextPos}`
      });
      // Back 1
      const backPos = (pawn.position - 1 + TRACK_LENGTH) % TRACK_LENGTH;
      options.push({
        pawn,
        targetPosition: backPos,
        description: `Move back 1 step to space ${backPos}`
      });
    } else if (card.value === '11') {
      // Forward 11
      const nextPos = (pawn.position + 11) % TRACK_LENGTH;
      options.push({
        pawn,
        targetPosition: nextPos,
        description: `Advance 11 steps to space ${nextPos}`
      });
      // Swap with any opponent on track
      Object.entries(allPawns).forEach(([col, pawns]) => {
        if (col !== playerColor) {
          pawns.forEach(oppPawn => {
            if (oppPawn.position >= 0 && oppPawn.position < TRACK_LENGTH) {
              options.push({
                pawn,
                targetPosition: oppPawn.position,
                description: `SWAP positions with ${PLAYER_CONFIG[oppPawn.color].name}'s pawn!`,
                swapWith: oppPawn
              });
            }
          });
        }
      });
    } else {
      const stepVal = parseInt(card.value);
      if (!isNaN(stepVal)) {
        // Check if passing safety entry
        const distToSafety = (cfg.safetyEntryIndex - pawn.position + TRACK_LENGTH) % TRACK_LENGTH;
        if (distToSafety < stepVal && distToSafety >= 0 && pawn.stepIndex + stepVal >= TRACK_LENGTH - 4) {
          const remainingSteps = stepVal - distToSafety - 1;
          if (remainingSteps <= 6) {
            const targetPos = remainingSteps === 6 ? 100 : 60 + remainingSteps;
            options.push({
              pawn,
              targetPosition: targetPos,
              description: targetPos === 100 ? 'Enter HOME!' : `Turn into Safety Zone step ${remainingSteps + 1}`
            });
            continue;
          }
        }

        const nextPos = (pawn.position + stepVal) % TRACK_LENGTH;
        options.push({
          pawn,
          targetPosition: nextPos,
          description: `Advance forward ${stepVal} spaces to ${nextPos}`
        });
      }
    }
  }

  return options;
}
