/**
 * Sergeant Green, the glowing soldier who meets you when you shrink down.
 * Walk up to him and talk (F, or tap the bubble): the camera closes in on
 * him and he runs through moving, looking and shooting, one line at a time,
 * then the first tan wave steps out from behind the books. With Sarge's
 * voice loaded, each of his recorded intro lines plays first and its step
 * card (coachCards) comes up once he's said it.
 */

export type Coach = 'wait' | 'talk' | 'done';

export const COACH_NAME = 'Sgt. Green';

/** Where he waits for you, a few steps from where you land. */
export const COACH_SPOT = { x: 0.27, z: 0.27 };

/** How close you need to be before he'll talk. */
export const COACH_REACH = 0.11;

export function coachLesson(touch: boolean): string[] {
  return [
    "At ease, soldier! Welcome to the rug. I'm Sergeant Green. Listen up, this'll be quick.",
    touch ? 'The arrows on the left walk you around the town.' : 'WASD walks you. W and S go forward and back, A and D step sideways. Hold Shift to run.',
    touch
      ? 'Drag on the town to turn and look around.'
      : 'The arrow keys look around: left and right turn you, up and down tilt your view. Dragging works too.',
    touch ? 'Fire is the big button on the right. Point first, then pop.' : "Space fires the way you're facing. Point first, then pop 'em.",
    'C swaps the camera. F talks to people, and boards the chopper on the helipad.',
    "The tan army's behind the books by the door. Here they come. Get to the sandbags!",
  ];
}

/** The step cards under Sarge's five intro lines: the lesson without its hello. */
export function coachCards(touch: boolean) {
  return coachLesson(touch).slice(1);
}

/** Seconds a line stays up before the next one, long enough to read. */
export function lineSeconds(text: string) {
  return Math.min(7, 1.8 + text.length * 0.045);
}

/** The next line, or null once he's done talking. */
export function nextLine(index: number, lines: readonly unknown[]) {
  return index + 1 < lines.length ? index + 1 : null;
}
