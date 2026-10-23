/**
 * Whole recorded broadcasts on the Internet Archive that play as one channel,
 * part after part, looping on the shared clock like SNICK. Each part streams
 * the item's own h.264 copy straight from archive.org.
 */

export interface ArchivePart {
  /** Exact file in the item (the browser-playable .mp4 copy). */
  file: string;
  /** Runtime from archive.org's metadata. */
  seconds: number;
  title: string;
}

export interface ArchiveBlock {
  /** archive.org item id. */
  id: string;
  parts: ArchivePart[];
}

const CCF_DIR = 'Cartoon Cartoon Fridays 2000 The Mayor Hosts/VIDEO_TS/';

/**
 * Cartoon Network's Cartoon Cartoon Fridays, a 2000 airing hosted by the Mayor,
 * with bumpers and commercials: Johnny Bravo, Cow and Chicken, Dexter's
 * Laboratory, The Powerpuff Girls, Mike, Lu & Og, Sheep in the Big City,
 * Courage the Cowardly Dog and Ed, Edd n Eddy.
 * https://archive.org/details/CCF-2000
 */
export const CCF_2000: ArchiveBlock = {
  id: 'CCF-2000',
  parts: [
    { file: `${CCF_DIR}VTS_01_1.mp4`, seconds: 3618, title: 'Cartoon Cartoon Fridays · part 1 of 4' },
    { file: `${CCF_DIR}VTS_01_2.mp4`, seconds: 3639, title: 'Cartoon Cartoon Fridays · part 2 of 4' },
    { file: `${CCF_DIR}VTS_01_3.mp4`, seconds: 3645, title: 'Cartoon Cartoon Fridays · part 3 of 4' },
    { file: `${CCF_DIR}VTS_01_4.mp4`, seconds: 3713, title: 'Cartoon Cartoon Fridays · part 4 of 4' },
  ],
};

/** Which part is on air at `at` (seconds on the shared clock), and how far into it. */
export function blockOnAir(block: ArchiveBlock, at: number): { part: ArchivePart; index: number; offset: number } {
  const total = block.parts.reduce((a, p) => a + p.seconds, 0);
  let t = at % total;
  for (let i = 0; i < block.parts.length; i += 1) {
    const part = block.parts[i];
    if (t < part.seconds) return { part, index: i, offset: t };
    t -= part.seconds;
  }
  return { part: block.parts[0], index: 0, offset: 0 };
}
