import { getTvStatus } from '../tv/tvBus';

/**
 * House rule: the TV or the radio, not both. Trying to switch one on while
 * the other is going gets you yelled at from the kitchen, and it stays off.
 */

export interface Yell {
  who: string;
  line: string;
}

const YELLS: Yell[] = [
  { who: 'MOM, FROM THE KITCHEN', line: "Is that the TV AND the radio?! Pick one. We are not made of electricity!" },
  { who: 'DAD', line: "Were you raised in a barn? One thing on at a time. I'm not paying to power a whole arcade!" },
  { who: 'MOM', line: "I can hear both of those from downstairs. One of them goes off. NOW." },
  { who: 'DAD', line: "You think money grows on trees? Turn something off before I turn it off for you!" },
  { who: 'MOM', line: "Don't make me come up there! TV or radio — your choice, you have five seconds." },
  { who: 'GRANDMA', line: "Back in my day we had ONE radio for the whole house. Turn one off, sweetie." },
];

let radioOn = () => false;
/** The radio tells the rules whether it's playing (avoids an import cycle). */
export function watchRadio(isOn: () => boolean) {
  radioOn = isOn;
}

const listeners = new Set<(yell: Yell) => void>();
export function onYell(fn: (yell: Yell) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

let last = -1;
function yell() {
  let i = Math.floor(Math.random() * YELLS.length);
  if (i === last) i = (i + 1) % YELLS.length;
  last = i;
  listeners.forEach(fn => fn(YELLS[i]));
}

/** May the TV or the radio be switched on? If the other one is going, a parent yells and it stays off. */
export function mayTurnOn(what: 'tv' | 'radio', quiet = false) {
  const otherOn = what === 'tv' ? radioOn() : getTvStatus().mode !== 'off';
  if (!otherOn) return true;
  if (!quiet) yell();
  return false;
}
