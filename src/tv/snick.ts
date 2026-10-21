/**
 * SNICK broadcasts on the Internet Archive, ported from chairpants/snick-tv
 * (MIT, https://github.com/chairpants/snick-tv). Episode ids, lineups,
 * hand-labelled show segments and runtimes are theirs; the video itself
 * streams straight from archive.org and nothing is hosted here.
 */

/** [archive.org item id, display title, exact filename when the item bundles several tapes] */
export type SnickEpisode = [string, string, string?];

export const SNICK_EPISODES: SnickEpisode[] = [
  ['snick-premiere-08-15-92', 'SNICK - 08/15/1992 (Premiere)'],
  ['snick-09-05-92',  'SNICK - 09/05/1992'],
  ['snick-09-19-92',  'SNICK - 09/19/1992'],
  ['snick-09-26-92',  'SNICK - 09/26/1992'],
  ['snick-10-03-92',  'SNICK - 10/03/1992'],
  ['snick-sep-19-1992', 'SNICK - 10/24/1992'],
  ['snick-11-07-92',  'SNICK - 11/07/1992'],
  ['snick-12-12-92',  'SNICK - 12/12/1992'],
  ['snick-12-26-92',  'SNICK - 12/26/1992'],
  ['snick-01-02-93',  'SNICK - 01/02/1993'],
  ['snick-01-23-93',  'SNICK - 01/23/1993'],
  ['02-13-93-nick-snick', 'SNICK - 02/13/1993'],
  ['snick-03-20-93',  'SNICK - 03/20/1993'],
  ['snick-05-01-93-nick-takes-over-your-school',
                      'SNICK - 05/01/1993 (Nick Takes Over Your School)'],
  ['snick-05-08-93',  'SNICK - 05/08/1993'],
  ['snick-1993-05-22-woc-archiver-sketch-the-cow', 'SNICK - 05/15/1993',
    'SNICK (1993-05-15) WOC {Archiver mushbrain}.mp4'],
  ['snick-1993-05-22-woc-archiver-sketch-the-cow', 'SNICK - 05/22/1993',
    'SNICK (1993-05-22) WOC {Archiver Sketch the Cow}.mp4'],
  ['snick-1993-05-22-woc-archiver-sketch-the-cow', 'SNICK - 05/29/1993',
    'SNICK (1993-05-29) Clarissa, Roundhouse, Ren & Stimpy, AYAOTD {Archiver ACarchives}.mp4'],
  ['snick-06-05-93_202410', 'SNICK - 06/05/1993'],
  ['snick-06-12-93_202410', 'SNICK - 06/12/1993'],
  ['snick-1993-05-22-woc-archiver-sketch-the-cow', 'SNICK - 06/19/1993',
    'SNICK (1993-06-19) WOC {Archived by mushbrain}.mp4'],
  ['snick-1993-05-22-woc-archiver-sketch-the-cow', 'SNICK - 06/26/1993',
    'SNICK (1993-06-26) {Archiver mushbrain} (WOC).mp4'],
  ['snick-1993-05-22-woc-archiver-sketch-the-cow', 'SNICK - 07/03/1993',
    'SNICK (1993-07-03) WOC {Archiver mushbrain}.mp4'],
  ['snick-1993-05-22-woc-archiver-sketch-the-cow', 'SNICK - 07/10/1993',
    'SNICK (1993-07-10) WOC {Archiver musbrain}.mp4'],
  ['snick-07-17-93',  'SNICK - 07/17/1993'],
  ['snick-07-24-93',  'SNICK - 07/24/1993'],
  ['snick-07-31-93',  'SNICK - 07/31/1993'],
  ['snick-08-07-93',  'SNICK - 08/07/1993'],
  ['snick-08-14-93',  'SNICK - 08/14/1993'],
  ['snick-08-21-93',  'SNICK - 08/21/1993'],
  ['snick-08-28-93',  'SNICK - 08/28/1993'],
  ['snick-10-02-93',  'SNICK - 10/02/1993'],
  ['snick-10-09-93',  'SNICK - 10/09/1993'],
  ['snick-october-1993', 'SNICK - 10/23/1993'],
  ['snick-or-treat-1993', 'SNICK - 10/30/1993'],
  ['snick-11-06-93',  'SNICK - 11/06/1993'],
  ['snick-11-13-93',  'SNICK - 11/13/1993'],
  ['snick-11-20-93',  'SNICK - 11/20/1993'],
  ['snick-11-27-93',  'SNICK - 11/27/1993'],
  ['snick-12-04-93',  'SNICK - 12/04/1993'],
  ['snick-12-11-93',  'SNICK - 12/11/1993'],
  ['snick-12-18-93',  'SNICK - 12/18/1993'],
  ['snick-12-25-93',  'SNICK - 12/25/1993'],
  ['snick-01-08-94',  'SNICK - 01/08/1994'],
  ['snick-01-22-94',  'SNICK - 01/22/1994'],
  ['snick-01-29-94',  'SNICK - 01/29/1994'],
  ['snick-02-26-94',  'SNICK - 02/26/1994'],
  ['snick03121994',   'SNICK - 03/05/1994'],
  ['snick-03-26-94',  'SNICK - 03/26/1994'],
  ['snick-04-09-94',  'SNICK - 04/09/1994'],
  ['snick-04-09-94-pete-pete', 'SNICK - 04/09/1994 (Pete & Pete)'],
  ['16-snick-04-23-94-ferguson', 'SNICK - 04/23/1994'],
  ['snick-05-07-94',  'SNICK - 05/07/1994'],
  ['snick-05-28-94',  'SNICK - 05/28/1994'],
  ['snick-06-04-94',  'SNICK - 06/04/1994'],
  ['snick-06-25-94',  'SNICK - 06/25/1994'],
  ['snick-july-2-1994_202209', 'SNICK - 07/02/1994'],
  ['snick-07-23-94',  'SNICK - 07/23/1994'],
  ['snick-08-06-94',  'SNICK - 08/06/1994'],
  ['snick-08-20-94',  'SNICK - 08/20/1994'],
  ['snick-09-03-94',  'SNICK - 09/03/1994'],
  ['snick-10-01-94',  'SNICK - 10/01/1994'],
  ['snick-10-08-94',  'SNICK - 10/08/1994'],
  ['snick-10-29-94',  'SNICK - 10/29/1994'],
  ['snick-11-05-94',  'SNICK - 11/05/1994'],
  ['snick-11-12-94',  'SNICK - 11/12/1994'],
  ['snick-12-03-94',  'SNICK - 12/03/1994'],
  ['snick-02-04-95',  'SNICK - 02/04/1995'],
  ['snick-may-4-1996_202209', 'SNICK - 05/04/1996'],
  ['snick-08-10-96',  'SNICK - 08/10/1996'],
  ['snick-10-04-97',  'SNICK - 10/04/1997'],
  ['snick-january-3-1998', 'SNICK - 01/03/1998'],
];

export const epKey = ([id, , file]: SnickEpisode) => (file ? id + '::' + file : id);

const AYAOTD = 'Are You Afraid of the Dark?';
/** [first air date using this lineup, the block's four shows] */
export const SNICK_LINEUPS: [string, string[]][] = [ // [first air date using this lineup, shows]
  ['1992-08-15', ['Clarissa Explains It All', 'Roundhouse', 'The Ren & Stimpy Show', AYAOTD]],
  ['1994-06-01', ['The Adventures of Pete & Pete', 'Roundhouse', 'The Ren & Stimpy Show', AYAOTD]],
  ['1994-10-01', ['The Secret World of Alex Mack', 'Roundhouse', 'The Ren & Stimpy Show', AYAOTD]],
  ['1995-01-01', ['Clarissa Explains It All', 'All That', 'The Ren & Stimpy Show', AYAOTD]],
  ['1996-03-01', ['The Adventures of Pete & Pete', 'Space Cases', 'All That', AYAOTD]],
  ['1996-10-12', ['Kenan & Kel', 'All That', 'Space Cases', AYAOTD]],
  ['1997-02-01', ['The Mystery Files of Shelby Woo', 'All That', 'KaBlam!', AYAOTD]],
  ['1997-08-01', ['Rugrats', 'Kenan & Kel', 'KaBlam!', AYAOTD]],
  ['1997-11-01', ['The Journey of Allen Strange', 'Rugrats', 'Kenan & Kel', AYAOTD]],
];

/** Hand-labelled [start, end, show] segments in seconds, keyed by epKey. */
export const SNICK_SEGMENTS: Record<string, [number, number, string][]> = {
  '02-13-93-nick-snick': [
    [0, 1950, 'Doug'],
    [1950, 3725, 'Rugrats'],
    [3725, 5361, 'Clarissa Explains It All'],
    [5361, 7083, 'Roundhouse'],
    [7072, 8778, 'Ren And Stimpy'],
    [8804, 10420, 'Are You Afraid Of The Dark'],
  ],
  'snick-05-28-94': [ // Pete & Pete marathon
    [0, 1850, 'The Adventures of Pete and Pete'],
    [1850, 3830, 'The Adventures of Pete and Pete'],
    [3830, 5725, 'The Adventures of Pete and Pete'],
    [5870, 7450, 'The Adventures of Pete and Pete'],
    [7541, 9174, 'The Adventures of Pete and Pete'],
  ],
  'snick-06-04-94': [
    [16, 1631, 'Clarissa Explains It All'],
    [1821, 3423, 'The Adventures of Pete and Pete'],
    [3648, 5189, 'Ren And Stimpy'],
    [5285, 6949, 'Are You Afraid Of The Dark'],
    [7100, 8927, 'Roundhouse'],
  ],
  'snick-06-25-94': [
    [200, 1765, 'Clarissa Explains It All'],
    [1923, 3632, 'The Adventures of Pete and Pete'],
    [3831, 5257, 'Ren And Stimpy'],
    [5382, 6968, 'Are You Afraid Of The Dark'],
    [7129, 8979, 'Roundhouse'],
  ],
  'snick-july-2-1994_202209': [
    [234, 1841, 'Clarissa Explains It All'],
    [2045, 3621, 'The Adventures of Pete and Pete'],
    [3825, 5483, 'Ren And Stimpy'],
    [5687, 7209, 'Are You Afraid Of The Dark'],
    [7474, 9263, 'Roundhouse'],
  ],
  'snick-07-23-94': [
    [0, 1703, 'Clarissa Explains It All'],
    [1914, 3619, 'The Adventures of Pete and Pete'],
    [3740, 5220, 'Ren And Stimpy'],
    [5416, 6973, 'Are You Afraid Of The Dark'],
    [7160, 9068, 'Roundhouse'],
  ],
  'snick-08-06-94': [ // AYAOTD marathon after the regular block
    [0, 1706, 'Clarissa Explains It All'],
    [1955, 3600, 'The Adventures of Pete and Pete'],
    [3609, 5046, 'Ren And Stimpy'],
    [5198, 6803, 'Are You Afraid Of The Dark'],
    [7004, 8640, 'Are You Afraid Of The Dark'],
    [8938, 10551, 'Are You Afraid Of The Dark'],
    [10672, 12279, 'Are You Afraid Of The Dark'],
    [12478, 14215, 'Are You Afraid Of The Dark'],
  ],
  'snick-08-20-94': [
    [259, 1816, 'Clarissa Explains It All'],
    [2068, 3732, 'The Adventures of Pete and Pete'],
    [3969, 5524, 'Ren And Stimpy'],
    [5738, 7335, 'Are You Afraid Of The Dark'],
    [7492, 9235, 'Roundhouse'],
  ],
};

/** Runtime in seconds, from archive.org metadata, keyed by epKey. */
export const SNICK_DURATIONS: Record<string, number> = {
  "snick-premiere-08-15-92": 6924,
  "snick-09-05-92": 7217,
  "snick-09-19-92": 7155,
  "snick-09-26-92": 7085,
  "snick-10-03-92": 7157,
  "snick-sep-19-1992": 4901,
  "snick-11-07-92": 7191,
  "snick-12-12-92": 7284,
  "snick-12-26-92": 7163,
  "snick-01-02-93": 6979,
  "snick-01-23-93": 7420,
  "02-13-93-nick-snick": 10430,
  "snick-03-20-93": 6885,
  "snick-05-01-93-nick-takes-over-your-school": 7206,
  "snick-05-08-93": 7163,
  "snick-1993-05-22-woc-archiver-sketch-the-cow::SNICK (1993-05-15) WOC {Archiver mushbrain}.mp4": 7033,
  "snick-1993-05-22-woc-archiver-sketch-the-cow::SNICK (1993-05-22) WOC {Archiver Sketch the Cow}.mp4": 7277,
  "snick-1993-05-22-woc-archiver-sketch-the-cow::SNICK (1993-05-29) Clarissa, Roundhouse, Ren & Stimpy, AYAOTD {Archiver ACarchives}.mp4": 7127,
  "snick-06-05-93_202410": 6999,
  "snick-06-12-93_202410": 7154,
  "snick-1993-05-22-woc-archiver-sketch-the-cow::SNICK (1993-06-19) WOC {Archived by mushbrain}.mp4": 7116,
  "snick-1993-05-22-woc-archiver-sketch-the-cow::SNICK (1993-06-26) {Archiver mushbrain} (WOC).mp4": 7212,
  "snick-1993-05-22-woc-archiver-sketch-the-cow::SNICK (1993-07-03) WOC {Archiver mushbrain}.mp4": 7016,
  "snick-1993-05-22-woc-archiver-sketch-the-cow::SNICK (1993-07-10) WOC {Archiver musbrain}.mp4": 7084,
  "snick-07-17-93": 7025,
  "snick-07-24-93": 7029,
  "snick-07-31-93": 7211,
  "snick-08-07-93": 6889,
  "snick-08-14-93": 6987,
  "snick-08-21-93": 6896,
  "snick-08-28-93": 7131,
  "snick-10-02-93": 6710,
  "snick-10-09-93": 6993,
  "snick-october-1993": 7180,
  "snick-or-treat-1993": 7302,
  "snick-11-06-93": 7262,
  "snick-11-13-93": 7251,
  "snick-11-20-93": 6969,
  "snick-11-27-93": 7426,
  "snick-12-04-93": 7193,
  "snick-12-11-93": 7280,
  "snick-12-18-93": 7462,
  "snick-12-25-93": 6611,
  "snick-01-08-94": 7252,
  "snick-01-22-94": 7002,
  "snick-01-29-94": 7378,
  "snick-02-26-94": 6984,
  "snick03121994": 7055,
  "snick-03-26-94": 7148,
  "snick-04-09-94": 6849,
  "snick-04-09-94-pete-pete": 6982,
  "16-snick-04-23-94-ferguson": 7069,
  "snick-05-07-94": 7447,
  "snick-05-28-94": 9174,
  "snick-06-04-94": 8927,
  "snick-06-25-94": 8979,
  "snick-july-2-1994_202209": 9264,
  "snick-07-23-94": 9069,
  "snick-08-06-94": 14263,
  "snick-08-20-94": 9175,
  "snick-09-03-94": 6836,
  "snick-10-01-94": 7071,
  "snick-10-08-94": 7205,
  "snick-10-29-94": 7158,
  "snick-11-05-94": 7124,
  "snick-11-12-94": 7454,
  "snick-12-03-94": 7273,
  "snick-02-04-95": 6953,
  "snick-may-4-1996_202209": 7022,
  "snick-08-10-96": 6926,
  "snick-10-04-97": 7636,
  "snick-january-3-1998": 7929,
};

/** The four shows a broadcast carried, by its air date. */
export function snickLineup(title: string): string[] {
  const m = title.match(/(\d\d)\/(\d\d)\/(\d{4})/);
  if (!m) return SNICK_LINEUPS[0][1];
  const d = `${m[3]}-${m[1]}-${m[2]}`;
  let shows = SNICK_LINEUPS[0][1];
  for (const [from, list] of SNICK_LINEUPS) if (d >= from) shows = list;
  return shows;
}

/** What show is on at `t` seconds into a broadcast. */
export function snickShowAt(ep: SnickEpisode, t: number): string {
  const key = epKey(ep);
  const seg = SNICK_SEGMENTS[key];
  if (seg) {
    let name = seg[0][2];
    for (const [start, , show] of seg) if (t >= start) name = show;
    return name;
  }
  const dur = SNICK_DURATIONS[key] ?? 7200;
  return snickLineup(ep[1])[Math.min(3, Math.floor((t / dur) * 4))];
}
