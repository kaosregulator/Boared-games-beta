/**
 * The mute control is only offered while the television is actually on
 * (at the set, or left on in the room) or while the radio is playing.
 * The Furby's attentive distance and lines are not part of this.
 */
export function furbyMuteAvailable(input: { tvMode: string; atTelevision: boolean; radioOn: boolean }) {
  return (input.tvMode !== 'off' && input.atTelevision) || input.radioOn;
}

export const FURBY_QUIET_LINES = [
  'They never gave a Furby a mute switch.',
  'How are you even doing this?',
  'Next time, throw it out the window.',
] as const;
