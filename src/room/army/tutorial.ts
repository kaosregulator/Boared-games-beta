/**
 * The green soldier who walks over at the start of a story attack.
 * Three short lines. Each one waits until you have done it, then he goes back to the parade.
 */

export type Tip = 'move' | 'aim' | 'shoot' | 'done';

export function tutorialLine(tip: Tip, touch: boolean) {
  if (tip === 'move') return touch ? 'The arrows walk you around the town.' : 'W and S walk. A and D turn you.';
  if (tip === 'aim') return touch ? 'Drag on the town to turn. Shots go the way you face.' : 'Drag on the floor to turn. Shots go the way you face.';
  if (tip === 'shoot') return touch ? 'Fire is the big button on the right.' : 'Space fires along the way you are facing.';
  return '';
}

/** The next line, once the player has actually done this one. */
export function advanceTip(tip: Tip, did: { moved: boolean; turned: boolean; shot: boolean }): Tip {
  if (tip === 'move' && did.moved) return 'aim';
  if (tip === 'aim' && did.turned) return 'shoot';
  if (tip === 'shoot' && did.shot) return 'done';
  return tip;
}
