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
  backpack: {
    id: 'backpack',
    title: 'Backpack',
    era: '1990s school bag',
    image: '',
    blurb: 'Nylon, one broken zipper, and homework that stayed in the bag. It lives on the quilt now.',
    facts: ['Tossed on the bed after school, still half-zipped.', 'The straps sink into the quilt instead of floating above it.'],
  },
  nes: {
    id: 'nes',
    title: 'NES',
    era: '1985 · Nintendo',
    image: '',
    blurb: 'The gray box that put the arcade on the carpet. Blow the cartridge, press Power, wait for the blink.',
    facts: [
      'The Nintendo Entertainment System launched in the US in October 1985.',
      'The front-loader (NES-001) and its blinking red light defined a generation of after-school play.',
    ],
  },
  rubik: {
    id: 'rubik',
    title: "Rubik's Cube",
    era: '1974 · Ernő Rubik',
    image: '',
    blurb: 'A pocket puzzle that took over recess. Most of them stayed two sides away from solved.',
    facts: ['Ernő Rubik invented the cube in 1974 in Budapest.', 'It became a worldwide craze in the early 1980s.'],
  },
  armor: {
    id: 'armor',
    title: 'Mini figure',
    era: 'Shelf guardian',
    image: '',
    blurb: 'The little blue guy who never left the shelf. He watches the console.',
    facts: ['Small enough to stand beside the NES without crowding the toys.', 'Painted plastic, the kind that lived next to the lava lamp.'],
  },
  hotpockets: {
    id: 'hotpockets',
    title: 'Hot Pockets',
    era: '1983 · microwave night',
    image: '',
    blurb: 'A plate on the floor because the desk was already full. Still too hot in the middle.',
    facts: ['The snack launched in the early 1980s as a microwave meal you could eat over a notebook.'],
  },
  door: {
    id: 'door',
    title: 'Bedroom door',
    era: 'Keep out',
    image: '',
    blurb: 'Closed. The rest of the house can wait.',
    facts: ['The door sits on the north wall, between the television and the window.'],
  },
  teddy: {
    id: 'teddy',
    title: 'Teddy bear',
    image: '',
    era: 'On the quilt',
    blurb: 'Flattened from being slept on. He shares the bed with the backpack.',
    facts: ['A soft prop, not a game — he stays on the quilt.'],
  },
  gushers: {
    id: 'gushers',
    title: 'Fruit snacks',
    era: 'Lunchbox years',
    image: '',
    blurb: 'The bag that never made it back to the kitchen. It sits on the nightstand.',
    facts: ['Fruit snacks were the unofficial currency of 90s car rides and sleepovers.'],
  },
  army: {
    id: 'army',
    title: 'Army men',
    era: 'Green plastic',
    image: '',
    blurb: 'A handful of soldiers parked on the desk, mid-mission, forever.',
    facts: ['Little plastic army men have been a bedroom staple since the mid-20th century.'],
  },
  jordans: {
    id: 'jordans',
    title: 'High-tops',
    era: 'Kicked off by the door',
    image: '',
    blurb: 'Left where they came off. The laces are still loose.',
    facts: ['Basketball high-tops moved from the court to the bedroom floor in the late 80s and 90s.'],
  },
  car: {
    id: 'car',
    title: 'Toy car',
    era: 'Rug traffic',
    image: '',
    blurb: 'A small car abandoned mid-lap on the rug.',
    facts: ['Palm-sized, the kind that lived under the dresser until someone kicked it back into the room.'],
  },
};

export function propCardFor(id: string | null | undefined): PropCard | null {
  if (!id) return null;
  return PROP_CARDS[id] ?? null;
}
