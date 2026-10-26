import type { GameMetadata } from '../../types';

/**
 * Poo-Chi's table session: from his card on the dresser ("Play with him"),
 * or ?play=poochi.
 */
export const POOCHI_GAME: GameMetadata = {
  id: 'poochi',
  title: 'Poo-Chi',
  subtitle: 'Sega Toys / Tiger Electronics, 2000',
  players: '1',
  duration: 'Until the batteries die',
  boxColor: '#1d6f8f',
  boxAccent: '#c9ced6',
  badge: 'NEW',
  description: 'The interactive robot puppy. Press his head and he wakes up.',
  rules: ['Press his head to turn him on.', 'He sings, barks, begs and naps. Then help him find his bones.'],
  icon: '🐶',
  rating: 'Ages 5+',
};

/** The table's "Find my bones" button reaches the room through this. */
export const poochiBus = {
  hunt: null as null | (() => void),
};
