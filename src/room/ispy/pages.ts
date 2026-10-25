import { makePuzzle, type Puzzle } from './puzzle';

/**
 * The book you read in the bean bag: real photographed pages first, then
 * pages built from the toy box (same seeds every time, so they're set pages
 * you can come back to). Spots are where each thing sits in the picture,
 * as fractions of the picture's width and height; `r` is how close a click
 * has to be, as a fraction of the width.
 */

export interface Spot {
  /** As the checklist says it. */
  label: string;
  x: number;
  y: number;
  r: number;
}

export interface PhotoPage {
  kind: 'photo';
  title: string;
  src: string;
  rhyme: string[];
  spots: Spot[];
}

export interface ToyPage {
  kind: 'toys';
  title: string;
  seed: number;
}

export type BookPage = PhotoPage | ToyPage;

export const PHOTO_PAGES: PhotoPage[] = [
  {
    kind: 'photo',
    title: 'Toy Explosion',
    src: '/ispy/pages/photo-3.webp',
    rhyme: [
      'A bright red phone and a duck that is small,',
      'A blue number eight and a maze for a ball,',
      'A question mark, a swan, and a big yellow e,',
      'A crab and a race car. How many can you see?',
    ],
    spots: [
      { label: 'a bright red phone', x: 0.37, y: 0.4, r: 0.09 },
      { label: 'a little rubber duck', x: 0.07, y: 0.514, r: 0.045 },
      { label: 'a blue number eight', x: 0.855, y: 0.619, r: 0.075 },
      { label: 'a maze for a ball', x: 0.2, y: 0.696, r: 0.075 },
      { label: 'a question mark', x: 0.6, y: 0.11, r: 0.075 },
      { label: 'a white swan', x: 0.89, y: 0.155, r: 0.07 },
      { label: 'a big yellow e', x: 0.85, y: 0.376, r: 0.055 },
      { label: 'a crab', x: 0.56, y: 0.95, r: 0.065 },
      { label: 'a red race car', x: 0.57, y: 0.762, r: 0.065 },
    ],
  },
  {
    kind: 'photo',
    title: 'The Mystery Cabinet',
    src: '/ispy/pages/photo-1.webp',
    rhyme: [
      'A moth in a frame and a mouse dressed in red,',
      'An owl made of wood and some coral instead,',
      'A butterfly, elephant, zebra so small,',
      'A volcano, a skull, and a red egg. Find them all!',
    ],
    spots: [
      { label: 'a moth in a frame', x: 0.51, y: 0.23, r: 0.075 },
      { label: 'a mouse dressed in red', x: 0.14, y: 0.46, r: 0.06 },
      { label: 'a wooden owl', x: 0.34, y: 0.68, r: 0.07 },
      { label: 'red coral', x: 0.2, y: 0.89, r: 0.085 },
      { label: 'an orange butterfly', x: 0.74, y: 0.36, r: 0.055 },
      { label: 'an orange elephant', x: 0.57, y: 0.44, r: 0.065 },
      { label: 'a tiny zebra', x: 0.47, y: 0.48, r: 0.04 },
      { label: 'a volcano', x: 0.53, y: 0.66, r: 0.075 },
      { label: 'a skull', x: 0.77, y: 0.88, r: 0.065 },
      { label: 'a red egg', x: 0.34, y: 0.92, r: 0.045 },
    ],
  },
  {
    kind: 'photo',
    title: 'Grandma\'s Toy Chest',
    src: '/ispy/pages/photo-2.webp',
    rhyme: [
      'A clown with a red nose, a cat with a bow,',
      'A G and an F on the blocks down below,',
      'A drum and a nest and a button that\'s purple,',
      'A milk bottle, a top, and a marble so circle!',
    ],
    spots: [
      { label: 'a clown with a red nose', x: 0.32, y: 0.34, r: 0.11 },
      { label: 'a cat with a bow', x: 0.17, y: 0.6, r: 0.065 },
      { label: 'the letter G', x: 0.26, y: 0.86, r: 0.065 },
      { label: 'the letter F', x: 0.07, y: 0.92, r: 0.065 },
      { label: 'a drum', x: 0.57, y: 0.32, r: 0.075 },
      { label: "a bird's nest", x: 0.15, y: 0.19, r: 0.08 },
      { label: 'a purple button', x: 0.64, y: 0.81, r: 0.05 },
      { label: 'a milk bottle', x: 0.52, y: 0.55, r: 0.065 },
      { label: 'a spinning top', x: 0.05, y: 0.71, r: 0.055 },
      { label: 'a marble', x: 0.92, y: 0.2, r: 0.07 },
    ],
  },
];

const TOY_PAGES: ToyPage[] = [
  { kind: 'toys', title: 'The Toy Box Spill', seed: 1992 },
  { kind: 'toys', title: 'After the Bake Sale', seed: 1997 },
  { kind: 'toys', title: 'Buried Treasure', seed: 1999 },
  { kind: 'toys', title: 'Recess Pockets', seed: 2001 },
  { kind: 'toys', title: 'Lights Out', seed: 2003 },
  { kind: 'toys', title: 'Super Challenger', seed: 2011 },
];

export const BOOK_PAGES: BookPage[] = [...PHOTO_PAGES, ...TOY_PAGES];

/** The little table-top a toy page is shot on, in metres. */
export const PAGE_AREA = { x: 0, z: 0, w: 0.34, d: 0.44 };

/** The pile on a toy page: same seed, same pile, every time. */
export function toyPagePuzzle(page: ToyPage): Puzzle {
  return makePuzzle(page.seed, 'medium', {
    area: PAGE_AREA,
    anyTheme: true,
    rules: { items: 60, targets: 8, scale: [0.9, 1.1], spread: 0.86, tipped: 0.25, lookAlikes: 1 },
  });
}
