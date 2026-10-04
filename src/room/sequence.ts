/**
 * Simulator beats. The source clip's door-open shot is trimmed:
 * the door stays a prop. Play always walks to the shelf.
 */
export const SIM_SEQUENCE = [
  { id: 'idle', label: 'Idle stance', clip: 'Wide bedroom, hands down, CRT on PLAY' },
  { id: 'walk', label: 'Walk to shelf', clip: 'Look and slide toward the game shelf' },
  { id: 'choose', label: 'Choose a game', clip: 'Box highlights under the crosshair' },
  { id: 'take', label: 'Take out the box', clip: 'Box lifts off the shelf with a white edge' },
  { id: 'open', label: 'Open the box', clip: 'Lid creaks open on the table' },
  { id: 'setup', label: 'Game sets up', clip: 'Board unfolds in front of the player' },
  { id: 'play', label: 'Play the game', clip: 'The real board stays on the table in the room' },
  { id: 'pack', label: 'Pack up & return', clip: 'Board folds, lid closes, box is shown' },
  { id: 'away', label: 'Put it away', clip: 'Box slides back, player returns to idle' },
] as const;
