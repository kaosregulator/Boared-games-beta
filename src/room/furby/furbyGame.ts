import type { GameMetadata } from '../../types';

/**
 * The Furbies' table session. Not on the shelf: it starts from the Furby
 * in your hands ("Open the new ones"), or ?play=furby.
 */
export const FURBY_GAME: GameMetadata = {
  id: 'furby',
  title: 'Furby',
  subtitle: 'Tiger Electronics, 1998',
  players: '1',
  duration: 'Until the batteries die',
  boxColor: '#a51fa0',
  boxAccent: '#f4c430',
  badge: 'NEW',
  description: 'A brand-new Furby in its box, and a Furby Boom dancing beside it.',
  rules: ['Pet its head, tickle its tummy, feed it through its beak.', 'Turn the lights off and it goes to sleep.'],
  icon: '🦉',
  rating: 'Ages 6+',
};
