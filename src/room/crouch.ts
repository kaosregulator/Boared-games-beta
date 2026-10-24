/**
 * Room crouch is a latch. C flips it. Space only stands, so it never
 * crouches by itself. Key repeat is ignored, so holding the key does not
 * flicker. Hot Wheels and Army Men keep C for their own cameras; the walker
 * only asks while it is the thing being driven.
 */
export function crouchKeyAction(crouched: boolean, code: string, repeat: boolean): 'toggle' | 'stand' | 'ignore' {
  if (repeat) return 'ignore';
  if (code === 'Space') return crouched ? 'stand' : 'ignore';
  if (code === 'KeyC') return 'toggle';
  return 'ignore';
}
