import { TAPE_SEGMENTS } from './tapeSegments';

/**
 * Whole recorded broadcasts on the Internet Archive that play as one channel,
 * part after part, looping on the shared clock like SNICK. Each part streams
 * the item's own h.264 copy straight from archive.org.
 */

export interface ArchivePart {
  /** archive.org item, when this tape lives in a different item from the block's. */
  id?: string;
  /** Exact file in the item (the browser-playable .mp4 copy). */
  file: string;
  /** Runtime from archive.org's metadata. */
  seconds: number;
  title: string;
  /** Episode key in the home vault (vault/), when the block's show is collected there. */
  vault?: string;
  /** What airs inside the tape, from its captions: each entry runs until the next. */
  segments?: Segment[];
}

/** One stretch of a tape: a show, a commercial break, or a channel bumper. */
export interface Segment {
  /** Seconds into the part. */
  at: number;
  kind: 'show' | 'ads' | 'bumper';
  title: string;
}

export interface ArchiveBlock {
  /** archive.org item id. */
  id: string;
  /** Show name in the home vault; parts with a `vault` key play from there when it has them. */
  vaultShow?: string;
  parts: ArchivePart[];
}

/** The broadcast day signs on at 6 AM local time, like the stations did. */
const SIGN_ON_HOUR = 6;
const DAY = 86400;

/**
 * Where a channel is in its own tape loop at `at`. A channel's footage is laid
 * end to end from 6 AM: under a day's worth, it reruns from the top when it runs
 * out and starts fresh every morning; over a day, each morning picks up where
 * the last day stopped, so every hour gets its turn.
 */
export function broadcastClock(total: number, at: number): number {
  const local = at - new Date(at * 1000).getTimezoneOffset() * 60 - SIGN_ON_HOUR * 3600;
  const intoDay = ((local % DAY) + DAY) % DAY;
  if (total <= DAY) return intoDay % total;
  const day = Math.floor(local / DAY);
  return (day * DAY + intoDay) % total;
}

const CCF_DIR = 'Cartoon Cartoon Fridays 2000 The Mayor Hosts/VIDEO_TS/';

/**
 * Cartoon Network's Cartoon Cartoon Fridays, a 2000 airing hosted by the Mayor,
 * with bumpers and commercials: Johnny Bravo, Cow and Chicken, Dexter's
 * Laboratory, The Powerpuff Girls, Mike, Lu & Og, Sheep in the Big City,
 * Courage the Cowardly Dog and Ed, Edd n Eddy.
 * https://archive.org/details/CCF-2000
 */
/**
 * Goosebumps, the 1995 TV series, every Season 1 episode back to back on the
 * shared clock. The AI-enhanced season sits in one Internet Archive item, one
 * file per broadcast (the double-length premieres and two-parters play whole).
 * https://archive.org/details/goosebumps-s01
 */
export const GOOSEBUMPS_S01: ArchiveBlock = {
  id: 'goosebumps-s01',
  parts: [
    { file: 'S01_01-02.mp4', seconds: 2589, title: 'Goosebumps · Episodes 1–2 · The Haunted Mask' },
    { file: 'S01_03.mp4', seconds: 1317, title: 'Goosebumps · Episode 3' },
    { file: 'S01_04.mp4', seconds: 1290, title: 'Goosebumps · Episode 4' },
    { file: 'S01_05.mp4', seconds: 1320, title: 'Goosebumps · Episode 5' },
    { file: 'S01_06.mp4', seconds: 1320, title: 'Goosebumps · Episode 6' },
    { file: 'S01_07.mp4', seconds: 1282, title: 'Goosebumps · Episode 7' },
    { file: 'S01_08.mp4', seconds: 1316, title: 'Goosebumps · Episode 8' },
    { file: 'S01_09.mp4', seconds: 1317, title: 'Goosebumps · Episode 9' },
    { file: 'S01_10.mp4', seconds: 1313, title: 'Goosebumps · Episode 10' },
    { file: 'S01_11.mp4', seconds: 1313, title: 'Goosebumps · Episode 11' },
    { file: 'S01_12.mp4', seconds: 1312, title: 'Goosebumps · Episode 12' },
    { file: 'S01_13.mp4', seconds: 1313, title: 'Goosebumps · Episode 13' },
    { file: 'S01_14.mp4', seconds: 1313, title: 'Goosebumps · Episode 14' },
    { file: 'S01_15.mp4', seconds: 1312, title: 'Goosebumps · Episode 15' },
    { file: 'S01_E16-E17.mp4', seconds: 2652, title: 'Goosebumps · Episodes 16–17' },
    { file: 'S01_E18-E19.mp4', seconds: 2694, title: 'Goosebumps · Episodes 18–19' },
  ],
};

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
  let t = broadcastClock(total, at);
  for (let i = 0; i < block.parts.length; i += 1) {
    const part = block.parts[i];
    if (t < part.seconds) return { part, index: i, offset: t };
    t -= part.seconds;
  }
  return { part: block.parts[0], index: 0, offset: 0 };
}

/**
 * A viewer's VHS dump of turn-of-the-millennium Cartoon Network, ads and all,
 * plus a Nick night and a Fox Kids morning. Lengths are archive.org's own.
 * https://archive.org/details/CNdump
 */
const CN_DUMP = 'CNdump';

/** Cartoon Network as taped from Dec 1999 to Apr 2003, oldest tape first. */
export const CN_TAPES: ArchiveBlock = {
  id: CN_DUMP,
  parts: [
    { file: '1999-12-00 - Scooby Doo, Chipmunks, Tiny Toons on CN.mp4', seconds: 7405, title: 'Scooby-Doo, Chipmunks & Tiny Toons · Dec 1999' },
    { file: '2000-01-00 - CN Scooby Doo, Tiny Toons, Chipmunks, etc.mp4', seconds: 15405, title: 'Scooby-Doo, Tiny Toons, Chipmunks & more · Jan 2000' },
    { file: '2000-01-00 - More CN.mp4', seconds: 6892, title: 'More Cartoon Network · Jan 2000' },
    { file: '2000-05-00 - Scooby Doo on Cartoon Network.mp4', seconds: 15406, title: 'Scooby-Doo on Cartoon Network · May 2000' },
    { file: '2002-02-10 - Scooby Doo and the Alien Invaders and other CN.mp4', seconds: 7204, title: 'Scooby-Doo and the Alien Invaders · Feb 10 2002' },
    { file: '2002-02-17 - Balto Wolf Quest and other CN.mp4', seconds: 13476, title: 'Balto: Wolf Quest · Feb 17 2002' },
    { file: '2002-05-31 - Powerpuff Girls Top 10.mp4', seconds: 6617, title: 'The Powerpuff Girls Top 10 · May 31 2002' },
    { file: '2003-04-11 - Powerpuff Girls Sleepover Marathon.mp4', seconds: 7390, title: 'Powerpuff Girls Sleepover Marathon · Apr 11 2003' },
  ],
};

/** One Saturday in Aug 2003, flipping between Nickelodeon and Cartoon Network. */
export const NICK_CN_2003: ArchiveBlock = {
  id: CN_DUMP,
  parts: [{ file: '2003-08-02 Nickelodeon, Cartoon Network.mp4', seconds: 18665, title: 'Nickelodeon & Cartoon Network · Aug 2 2003' }],
};

/**
 * Fox Kids mornings: The Magic School Bus in Jan 2000, then a fall 2001 tape of
 * Transformers: Robots in Disguise off KTVU Oakland.
 * https://archive.org/details/transformers-rid-2-k-1
 */
export const FOX_KIDS: ArchiveBlock = {
  id: CN_DUMP,
  parts: [
    { file: '2000-01-00 - Magic School Bus on Fox Kids.mp4', seconds: 1733, title: 'The Magic School Bus on Fox Kids · Jan 2000' },
    { id: 'transformers-rid-2-k-1', file: 'Transformers RID 2K1.mp4', seconds: 7562, title: 'Transformers: Robots in Disguise · Fall 2001' },
  ],
};

/**
 * Kids' WB on Saturday, Feb 10 2001, ads and all.
 * https://archive.org/details/kids-wb-10-feb-2k-1_202005
 */
export const KIDS_WB_2001: ArchiveBlock = {
  id: 'kids-wb-10-feb-2k-1_202005',
  parts: [
    {
      file: "Kids' WB 10 Feb 2k1.mp4",
      seconds: 2711,
      title: "Kids' WB · Feb 10 2001",
      // From the tape's captions, matched to episode transcripts; breaks land on its black frames.
      segments: [
        { at: 0, kind: 'show', title: 'Pokémon: The Johto Journeys · Foul Weather Friends' },
        { at: 58, kind: 'ads', title: "L'Oréal Kids, Max Steel, Froot Loops, LEGO Star Wars" },
        { at: 210, kind: 'bumper', title: "Kids' WB: The Zeta Project, all new, coming up next" },
        { at: 234, kind: 'show', title: 'Pokémon: The Johto Journeys · Foul Weather Friends' },
        { at: 818, kind: 'ads', title: 'See Spot Run, Max Steel, Oreos for breakfast, Static Shock promo' },
        { at: 1012, kind: 'show', title: 'Pokémon: The Johto Journeys · Foul Weather Friends' },
        { at: 1650, kind: 'ads', title: 'Batman Beyond and Max Steel promos, Fruit Roll-Ups' },
        { at: 1785, kind: 'show', title: 'Pokémon Karaoke · My Best Friends' },
        { at: 1836, kind: 'bumper', title: "Kids' WB: the Poké Read-A-Rama contest" },
        { at: 1879, kind: 'show', title: 'The Zeta Project · Remote Control' },
        { at: 2348, kind: 'ads', title: 'Recess: School’s Out, Tang, Power Rangers Time Force, Happy Meal' },
        { at: 2517, kind: 'show', title: 'The Zeta Project · Remote Control' },
      ],
    },
  ],
};
/** A part's segments: written by hand on the part, else from the generated tape sheets. */
const segmentsOf = (part: ArchivePart): Segment[] => part.segments ?? TAPE_SEGMENTS[part.file] ?? [];

/** The segment airing `offset` seconds into a part, and the next show after it. */
export function segmentAt(part: ArchivePart, offset: number): { now: Segment | null; nextShow: Segment | null } {
  const segs = segmentsOf(part);
  const showing = showTitleAt(part, offset);
  let now: Segment | null = null;
  let nextShow: Segment | null = null;
  for (const seg of segs) {
    if (seg.at <= offset) now = seg;
    else if (seg.kind === 'show' && seg.title !== showing) {
      nextShow = seg;
      break;
    }
  }
  return { now, nextShow };
}

/** What the guide calls the current stretch of a part: the show it belongs to, not the ad. */
export function showTitleAt(part: ArchivePart, offset: number): string {
  let title = part.title;
  for (const seg of segmentsOf(part)) {
    if (seg.at > offset) break;
    if (seg.kind === 'show') title = seg.title;
  }
  return title;
}
