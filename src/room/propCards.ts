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
    image: '/cards/gameboy.jpg',
    blurb:
      'The gray brick that left the living room. Four AA batteries, a green LCD, and Tetris in every backpack.',
    facts: [
      'Gunpei Yokoi’s team shipped the original DMG-01 in Japan on 21 April 1989.',
      'North America got it in July 1989, bundled with Tetris.',
      'The dot-matrix screen and link cable defined handheld play for a decade.',
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
    title: 'Pokémon Cards',
    era: '1996 · Creatures / Wizards',
    image: '',
    blurb:
      'A stack on the floor. Base Set holos, lunch-table trades, and sleeves that never quite fit the binder.',
    facts: [
      'The Pokémon Trading Card Game launched in Japan in October 1996.',
      'The English Base Set arrived in January 1999, with Charizard as the chase holo.',
      'Official card art stays off these menus — that artwork is still copyrighted. The stack in the room is your mesh.',
    ],
  },
  'vhs-stack': {
    id: 'vhs-stack',
    title: 'VHS',
    era: '1976 · JVC',
    image: '/cards/vhs.jpg',
    blurb: 'The first home tape most families owned. Handwritten spines, rental stickers, and “be kind, rewind.”',
    facts: [
      'JVC introduced VHS in Japan in 1976. The first recorder was the HR-3300.',
      'It won the format war against Sony Betamax through longer tapes and cheaper decks.',
      'A standard cassette holds about 2 hours at SP, or 6 at EP — tracking lines included.',
    ],
  },
};

export function propCardFor(id: string | null | undefined): PropCard | null {
  if (!id) return null;
  return PROP_CARDS[id] ?? null;
}
