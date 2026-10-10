/**
 * Nostalgia flash-card copy for important room props. Aimed when the player
 * looks at the object; opened with E / tap. Keep these short — Discord-length.
 */

export interface PropCard {
  id: string;
  title: string;
  era: string;
  image: string;
  blurb: string;
  facts: string[];
}

export const PROP_CARDS: Record<string, PropCard> = {
  gameboy: {
    id: 'gameboy',
    title: 'Game Boy',
    era: '1989 · Nintendo',
    image: '/models/gameboy.glb',
    blurb:
      'The gray brick that left the living room. Four AA batteries, a green LCD, and Tetris in every backpack.',
    facts: [
      'Launched in Japan in 1989, then North America in 1990.',
      'Over 118 million Game Boy family units sold worldwide.',
      'Tetris bundled with the NA launch pack made it a phenomenon.',
    ],
  },
  boombox: {
    id: 'boombox',
    title: 'Boombox',
    era: '1980s portable stereo',
    image: '/models/boombox.glb',
    blurb: 'Twin speakers, twin decks, and a handle — sidewalk radio before earbuds took over.',
    facts: [
      'Peak street culture icon of the late 70s through mid-80s.',
      'Dual cassette decks meant you could record radio or mix tapes.',
      'Press play in this room to flip the ambient tape.',
    ],
  },
  'crt-tv': {
    id: 'crt-tv',
    title: 'CRT Television',
    era: '1990s living-room tube',
    image: '/models/crt.glb',
    blurb: 'Heavy glass, warm scanlines, and a VCR stacked on top — how Friday night looked.',
    facts: [
      'CRTs ruled bedrooms until flat panels took over in the mid-2000s.',
      'The glowing PLAY graphic is the VCR’s pause between tapes.',
      'Open the flat game list from this set for a quick pick.',
    ],
  },
  bed: {
    id: 'bed',
    title: 'The Quilt Bed',
    era: 'Saturday-morning nest',
    image: '/models/bed.glb',
    blurb: 'Geometric quilt, snack wrappers, and a handheld half under the pillow.',
    facts: [
      'Goosebumps paperbacks and fruit snacks were standard nightstand spillover.',
      'The quilt pattern is pure mid-90s catalog energy.',
    ],
  },
  cards: {
    id: 'cards',
    title: 'Trading Cards',
    era: 'Binder culture',
    image: '/models/cards.glb',
    blurb: 'Holofoils, commons, and the smell of fresh pack plastic on the rug.',
    facts: [
      'Trading-card crazes peaked in school lunchrooms through the 90s.',
      'Holofoil rares were the flex before digital collections existed.',
    ],
  },
  'vhs-stack': {
    id: 'vhs-stack',
    title: 'VHS Stack',
    era: 'Magnetic memories',
    image: '/models/vhs_stack.glb',
    blurb: 'Handwritten spines, rental stickers, and “be kind, rewind.”',
    facts: [
      'Blockbuster and mom-and-pop shops ran on these bricks of tape.',
      'Tracking lines meant you were one twist of the dial from a clean picture.',
    ],
  },
};

export function propCardFor(id: string | null | undefined): PropCard | null {
  if (!id) return null;
  return PROP_CARDS[id] ?? null;
}
