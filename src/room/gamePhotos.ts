/**
 * Real photographs for the glass cards. Every file is from Wikimedia Commons
 * under a free license. Modern box scans that are still under copyright are
 * not included — Life has no free photo we can ship.
 */
export interface CardPhoto {
  src: string;
  credit: string;
}

export const GAME_PHOTOS: Record<string, CardPhoto> = {
  monopoly: {
    src: '/cards/monopoly.jpg',
    credit: 'Small-box Monopoly, public domain (Wikimedia Commons)',
  },
  battleship: {
    src: '/cards/battleship.svg',
    credit: 'Battleship grid, CC BY-SA 4.0, Actam',
  },
  pawnrush: {
    src: '/cards/sorry.jpg',
    credit: 'Sorry! board, CC BY 2.0 (Wikimedia Commons)',
  },
  clue: {
    src: '/cards/clue.jpg',
    credit: 'Cluedo set, CC BY-SA 4.0, Matěj Baťha',
  },
  yahtzee: {
    src: '/cards/yahtzee.jpg',
    credit: 'Yahtzee, 1961, public domain (Wikimedia Commons)',
  },
};

export const PROP_PHOTOS: Record<string, CardPhoto> = {
  gameboy: {
    src: '/cards/gameboy.jpg',
    credit: 'Original Game Boy, public domain photo by Evan-Amos',
  },
  'vhs-stack': {
    src: '/cards/vhs.jpg',
    credit: 'VHS cassette, CC BY-SA 4.0, LoMit',
  },
};
