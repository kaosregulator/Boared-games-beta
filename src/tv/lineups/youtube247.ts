import { parseYouTube } from '../youtube';

/**
 * The 24/7 channels that play from YouTube (through YouTube's own player).
 * Each channel is a list of videos that loops on the shared clock, so tuning
 * in drops you mid-show and everyone watching sees the same moment. Adding a
 * video is one line. `seconds` is optional: without it the player reads the
 * length itself when the video loads.
 */

export interface YtShow {
  /** Seconds into the video where this show starts (from the video's own timestamps). */
  at: number;
  title: string;
}

export interface YtLink {
  id: string;
  title: string;
  seconds?: number;
  /** The shows inside a long block, for the guide and the on-screen caption. */
  shows?: YtShow[];
}

export interface YtChannel {
  number: number;
  call: string;
  name: string;
  links: YtLink[];
}

const show = (at: number, title: string): YtShow => ({ at, title });

/**
 * Channel 1 plays these in order, around the clock: when one ends the next
 * (already loaded) starts, and after the last it starts over from the first.
 * Lengths and show times are from each video's YouTube page.
 */
export const YT_CHANNELS: YtChannel[] = [
  {
    number: 1,
    call: 'TOON',
    name: 'Saturday Morning 24/7',
    links: [
      {
        id: 'spTop8Y61Z0',
        title: "Fox Kids Cartoon Cabana · mid-late '90s",
        seconds: 36413,
        shows: [
          show(0, 'Fox Kids Cartoon Cabana'),
          show(177, 'Eek! The Cat / Eek! Stravaganza'),
          show(26550, 'Dog City'),
          show(29984, 'Mighty Mouse: The New Adventures'),
          show(33216, 'Little Shop of Horrors'),
        ],
      },
      {
        id: 'utufECFYSx4',
        title: "Nickelodeon Saturday Morning · 1995-1999",
        seconds: 12269,
        shows: [
          show(0, 'Nickelodeon Saturday Morning'),
          show(50, 'Rugrats'),
          show(1639, 'Legends of the Hidden Temple'),
          show(3387, 'KaBlam!'),
          show(5106, 'All That'),
          show(6696, 'Rocket Power'),
          show(8451, 'The Adventures of Pete & Pete'),
          show(10471, "Rocko's Modern Life"),
        ],
      },
      {
        id: 'dBvrly7OOxo',
        title: "Kids' WB Christmas · 1998-2002",
        seconds: 12192,
        shows: [
          show(0, "Kids' WB Saturday Morning"),
          show(44, 'Jackie Chan Adventures'),
          show(1741, 'Men in Black: The Series'),
          show(3420, 'Max Steel'),
          show(5093, 'Cardcaptors'),
          show(6734, 'Generation O!'),
          show(8454, 'Rescue Heroes'),
          show(10347, 'Detention'),
        ],
      },
      {
        id: '_PNWLx4s7Aw',
        title: 'Classic Looney Tunes',
        seconds: 3607,
        shows: [
          show(0, 'Classic Looney Tunes'),
          show(27, 'Dumb Patrol'),
          show(404, 'Case of the Missing Hare'),
          show(893, 'Yankee Doodle Daffy'),
          show(1300, 'The Wacky Wabbit'),
          show(1740, 'To Duck or Not to Duck'),
          show(2139, 'A Corny Concerto'),
          show(2614, 'Daffy the Commando'),
          show(3056, 'Falling Hare'),
        ],
      },
      {
        id: 'xBFuNlPzZrk',
        title: "Cartoon Network · '90s, with bumpers",
        seconds: 31179,
        shows: [
          show(0, 'Cartoon Network'),
          show(64, "Dexter's Laboratory"),
          show(4350, 'Sailor Moon'),
          show(8595, 'The Pink Panther'),
          show(12862, 'Mighty Man and Yukk'),
          show(17127, 'The Smurfs'),
          show(21390, 'Betty Boop'),
          show(22194, 'George of the Jungle'),
          show(22840, 'Pound Puppies'),
          show(27015, 'Harlem Globetrotters'),
          show(27940, 'ReBoot'),
          show(28810, 'Fantastic Max'),
          show(29750, 'Capitol Critters'),
          show(30239, 'The Gary Coleman Show'),
        ],
      },
      {
        id: 'JQlHGeZdJz4',
        title: 'Cartoon Network & Boomerang · June 2002',
        seconds: 11576,
        shows: [show(0, 'Boomeraction · G.I. Joe')],
      },
    ],
  },
];

/** "Your pick": whatever link was pasted on the TV, remembered in this browser. */
/** After the last cable channel, so it never takes another channel's number. */
export const PICK_NUMBER = 99;

function savedPick(): YtLink[] {
  try {
    const raw = window.localStorage.getItem('tv247-pick');
    if (!raw) return [];
    const v = JSON.parse(raw) as YtLink;
    return v && typeof v.id === 'string' ? [v] : [];
  } catch {
    return [];
  }
}

export const PICK_CHANNEL: YtChannel = {
  number: PICK_NUMBER,
  call: 'PICK',
  name: 'Your pick',
  links: typeof window === 'undefined' ? [] : savedPick(),
};

/** Put a pasted link on the "Your pick" channel. Returns false if it isn't a YouTube video link. */
export function setPick(input: string): boolean {
  const ref = parseYouTube(input);
  if (!ref?.id) return false;
  const link: YtLink = { id: ref.id, title: 'Your pick' };
  PICK_CHANNEL.links = [link];
  try {
    window.localStorage.setItem('tv247-pick', JSON.stringify(link));
  } catch {
    // plays now, just isn't remembered
  }
  return true;
}

/** The show playing `offset` seconds into a video, and the one after it (if any). */
export function ytShowAt(link: YtLink, offset: number): { now: string; next: YtShow | null } {
  const shows = link.shows ?? [];
  let i = -1;
  for (let k = 0; k < shows.length; k += 1) if (shows[k].at <= offset) i = k;
  return { now: i >= 0 ? shows[i].title : link.title, next: shows[i + 1] ?? null };
}

/** Which video of a channel is on air now. With known lengths it is exact; otherwise one per day. */
export function ytOnAir(ch: YtChannel, at: number): { link: YtLink; index: number; offset: number | null } | null {
  if (!ch.links.length) return null;
  if (ch.links.every(l => l.seconds && l.seconds > 0)) {
    const total = ch.links.reduce((a, l) => a + (l.seconds as number), 0);
    let t = at % total;
    for (let i = 0; i < ch.links.length; i += 1) {
      const s = ch.links[i].seconds as number;
      if (t < s) return { link: ch.links[i], index: i, offset: t };
      t -= s;
    }
  }
  const index = Math.floor(at / 86400) % ch.links.length;
  return { link: ch.links[index], index, offset: null };
}
