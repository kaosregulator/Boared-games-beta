import type { ArchiveBlock, ArchivePart } from './archiveBlocks';
import { withBreaks, type Audience } from './breaks';

/**
 * The 90s cable networks, rebuilt from what people taped and uploaded to the
 * Internet Archive. Two kinds of footage go on a channel:
 *
 * - Off-air VHS recordings, which already carry the network's own commercials,
 *   bumpers and promos, so they play as they aired.
 * - Clean episode uploads, which get real 90s commercial breaks cut in after
 *   each episode (lineups/breaks.ts), picked for the channel's audience.
 *
 * File names and runtimes were read from archive.org's metadata API
 * (archive.org/metadata/<id>/files). A file starting with "~" is matched by
 * part of its name, for names with characters that don't survive copying.
 */

const tape = (id: string, file: string, seconds: number, title: string): ArchivePart => ({ id, file, seconds, title });

/** One show's episodes in an item: [file, seconds, episode title]. */
const series = (id: string, show: string, eps: [string, number, string][]): ArchivePart[] =>
  eps.map(([file, seconds, ep]) => ({ id, file, seconds, title: `${show} · ${ep}` }));

/**
 * A network's day: the shows take turns an episode at a time, the way a
 * block ran them back to back, a taped broadcast airs every `perTape`
 * episodes, and every episode goes to a commercial break when it ends.
 */
function lineup(id: string, opts: { tapes?: ArchivePart[]; shows?: ArchivePart[][]; audience: Audience; seed: number; perTape?: number }): ArchiveBlock {
  const tapes = opts.tapes ?? [];
  const shows = opts.shows ?? [];
  const episodes: ArchivePart[] = [];
  for (let round = 0; shows.some(s => round < s.length); round += 1) for (const s of shows) if (round < s.length) episodes.push(s[round]);
  const perTape = opts.perTape ?? 3;
  const order: ArchivePart[] = [];
  let e = 0;
  for (const t of tapes) {
    order.push(t);
    for (let k = 0; k < perTape && e < episodes.length; k += 1) order.push(episodes[e++]);
  }
  order.push(...episodes.slice(e));
  const isEpisode = new Set(episodes);
  return { id, parts: withBreaks(order, opts.audience, opts.seed, part => isEpisode.has(part)) };
}

/**
 * Toonami, Cartoon Network's after-school action block, from 1999 to 2004:
 * Moltar and TOM, Dragon Ball Z, Sailor Moon, Gundam Wing, Tenchi, Outlaw Star,
 * Cardcaptors, all with the original commercials.
 * Starts with https://archive.org/details/toonami-vhs-recording-circa-2001-reupload
 */
const TOONAMI_TAPES: ArchivePart[] = [
  tape('toonami-vhs-recording-circa-2001-reupload', 'Toonami VHS Recording {circa 2001} (REUPLOAD).mp4', 5042.61, 'Toonami · circa 2001'),
  tape('toonami1999', 'Toonami 1999.ia.mp4', 7440.02, 'Toonami · September 1999'),
  tape('toonamiRS2000', 'toonami2000.mp4', 3424.76, 'Toonami · September 2000'),
  tape('ToonamiDBZTenchiCardcaptor', '~VTS_01_1.mp4', 1800.4, 'Toonami · Cardcaptors, Tenchi Universe, Dragon Ball Z · part 1'),
  tape('ToonamiDBZTenchiCardcaptor', '~VTS_01_2.mp4', 1806.94, 'Toonami · Cardcaptors, Tenchi Universe, Dragon Ball Z · part 2'),
  tape('ToonamiDBZTenchiCardcaptor', '~VTS_01_3.mp4', 1813.21, 'Toonami · Cardcaptors, Tenchi Universe, Dragon Ball Z · part 3'),
  tape('ToonamiDBZTenchiCardcaptor', '~VTS_01_4.mp4', 1754.02, 'Toonami · Cardcaptors, Tenchi Universe, Dragon Ball Z · part 4'),
  tape('kids-wb-cartoon-network-toonami-full-block-july-2001-woc-monster-rancher-batman-', '~VTS_01_1.mp4', 5200.6, 'Toonami · July 2001 · part 1'),
  tape('kids-wb-cartoon-network-toonami-full-block-july-2001-woc-monster-rancher-batman-', '~VTS_01_2.mp4', 5241.9, 'Toonami · July 2001 · part 2'),
  tape('kids-wb-cartoon-network-toonami-full-block-july-2001-woc-monster-rancher-batman-', '~VTS_01_3.mp4', 4528.93, 'Toonami · July 2001 · part 3'),
  tape('ToonamiNovember2002', 'Toonami - November 2002 7.mp4', 14577.28, 'Toonami · November 2002'),
  tape('tooonami-giant-robot-week-complete-event-2003-with-commercials', 'Giant Robot Week/Day 1.mp4', 3253.2, 'Toonami Giant Robot Week · Day 1 · 2003'),
  tape('tooonami-giant-robot-week-complete-event-2003-with-commercials', 'Giant Robot Week/Day 2.mp4', 3279.67, 'Toonami Giant Robot Week · Day 2 · 2003'),
  tape('tooonami-giant-robot-week-complete-event-2003-with-commercials', 'Giant Robot Week/Day 3.mp4', 3442.4, 'Toonami Giant Robot Week · Day 3 · 2003'),
  tape('tooonami-giant-robot-week-complete-event-2003-with-commercials', 'Giant Robot Week/Day 4.mp4', 3396.73, 'Toonami Giant Robot Week · Day 4 · 2003'),
  tape('tooonami-giant-robot-week-complete-event-2003-with-commercials', 'Giant Robot Week/Day 5.mp4', 3399.93, 'Toonami Giant Robot Week · Day 5 · 2003'),
  tape('Toonami-April-2004-vhs', '~Part 1', 7203.71, 'Toonami · April 24 2004 · part 1'),
  tape('Toonami-April-2004-vhs', '~Part 2', 2861.36, 'Toonami · April 24 2004 · part 2'),
  tape('sailormoontape1', 'Sailor Moon Tape 1.mp4', 5881, 'Sailor Moon on Toonami · tape 1'),
];

/** Outlaw Star as Toonami cut it, off a VHS rip (episodes 18 and 23 never aired). */
const OUTLAW_STAR = series('outlaw-star-toonami', 'Outlaw Star', [
  ['~-ZsBn8xKROLc.mp4', 1243.5, 'Outlaw World'],
  ['~-eE-c6t_jPyk.mp4', 1737.74, 'World of Desires'],
  ['~-MXf-P55iWNY.mp4', 1723.41, 'Into Burning Space'],
  ['~-MJEVMy84aq8.mp4', 1298.65, 'When the Hot Ice Melts'],
  ['~-u_WDvlFPnV0.mp4', 1260.24, 'The Beast Girl Ready to Pounce'],
  ['~-adgCPVOQOLM.mp4', 1189.35, 'The Beautiful Assassin'],
  ['~-GYJM24vA_nQ.mp4', 1260.05, 'Creeping Evil'],
  ['~-jTvepDk2yQo.mp4', 1445.07, 'Forced Departure'],
  ['~-tYgrsaEsWhA.mp4', 1262.28, 'A Journey of Adventure, Huh?'],
  ['~-9VtOQSmlhFM.mp4', 1266.42, 'Gathering for the Space Race'],
  ['~-2CcyVsRUUwI.mp4', 1646.2, 'Adrift in Subspace'],
  ['~-XBIyXM_ns3o.mp4', 1241.36, 'Mortal Combat with the El Dorado'],
  ['~-K15IB23NtK4.mp4', 1289.47, 'Advance Guard from Another Planet'],
  ['~-ZoGETXDufWs.mp4', 1730.4, 'Final Countdown'],
  ['~-6dAcbCzXYxg.mp4', 1115.91, 'The Seven Emerge'],
  ['~-lirwZJEVPRI.mp4', 1423.71, 'Demon of the Water Planet'],
  ['~-n0OTUhS3uPg.mp4', 1280.98, 'Between Life and Machine'],
  ['~-rahX7Ym26PQ.mp4', 1270.74, 'Law and Lawlessness'],
  ['~-PHSy9kXCGXI.mp4', 1288.45, 'Cats and Girls and Spaceships'],
  ['~-KKJR22zEPpE.mp4', 1298.23, 'Grave of the Dragon'],
  ['~-umD_07QkTrs.mp4', 1289.59, 'Gravity Jailbreak'],
  ['~-b-25s7SOTxM.mp4', 1238.83, 'Cutting the Galactic Leyline'],
  ['~-P7fJ-pSS2DE.mp4', 1308.03, 'Maze of Despair'],
  ['~--aZJRrHfCgk.mp4', 1436.36, 'Return to Space'],
]);

/** Tenchi Universe in the Toonami broadcast cut, all 26. */
const TENCHI_UNIVERSE = series(
  'tenchi-universe-toonami-version',
  'Tenchi Universe',
  (
    [
      [1296.95, 'No Need for Discussions!'], [1308.86, 'No Need for a Princess!'], [1308.17, 'No Need for Worries!'],
      [1287.48, 'No Need for Monsters!'], [1231.93, 'No Need for Partners!'], [1301.76, 'No Need for Resident Officers!'],
      [1261.56, 'No Need for a Carnival!'], [1295.35, 'No Need for a Genius!'], [1302.24, 'No Need for Memories!'],
      [1297.41, 'No Need for an Arch Rival!'], [1347.27, 'Time and Space Adventures Part 1'], [1289.03, 'Time and Space Adventures Part 2'],
      [1333.92, 'Time and Space Adventures Part 3'], [1300.81, 'No Need for a Rebellion!'], [1294.05, 'No Need for an Escape!'],
      [1213.82, 'No Need for Hiding!'], [1283.16, 'No Need for Hunger!'], [1305.19, 'No Need for a Ghost!'],
      [1291.45, 'No Need for Runaways!'], [1369.81, 'No Need for Swimsuits!'], [1297.02, 'No Need for a Checkpoint!'],
      [1303.78, 'No Need for Knights!'], [1300.22, 'No Need for Karma!'], [1304.06, 'No Need for Ryoko!'],
      [1334.82, 'No Need for a Showdown!'], [1315.81, 'No Need for a Conclusion!'],
    ] as [number, string][]
  ).map(([seconds, ep], i): [string, number, string] => [`~Episode ${String(i + 1).padStart(2, '0')} - `, seconds, ep]),
);

export const TOONAMI = lineup('toonami-vhs-recording-circa-2001-reupload', {
  tapes: TOONAMI_TAPES,
  shows: [OUTLAW_STAR, TENCHI_UNIVERSE],
  audience: 'teen',
  seed: 16,
  perTape: 4,
});

/**
 * MTV when it still played videos: 120 Minutes, Headbangers Ball, Beavis and
 * Butt-Head, countdowns and Spring Break, off viewers' tapes with the ads in.
 */
const MTV_TAPES: ArchivePart[] = [
  tape('1990.11.00_MTV_4_Hours_MultiRecording_November_1990', '1990.11.00_MTV_4_Hours_MultiRecording_November_1990.mp4', 14686.64, 'MTV · November 1990'),
  tape('1991.08.11_MTV_120_Minutes_with_Dave_Kendall_August_11th_1991', '~.ia.mp4', 5746.01, 'MTV 120 Minutes with Dave Kendall · Aug 1991'),
  tape('1992.12.05-mtv-headbangers-ball-hosted-by-riki-rachtman-with-stone-temple-pilots', '~Headbangers Ball', 12191.68, 'Headbangers Ball with Riki Rachtman · Dec 1992'),
  tape('mtv-4-hours-of-music-videos-and-beavis-and-butt-head-july-1993-full-episode-of-h', '~.ia.mp4', 14826.82, 'MTV videos & Beavis and Butt-Head · July 1993'),
  tape('TheVistaGroup-MTVBarenakedCountdownIncomplete', '~.ia.mp4', 3159.23, 'MTV Barenaked Countdown · 1997'),
  tape('VHSMTVBlockWOC', 'VHS-MTV-Block-WOC.mp4', 14756.94, 'MTV · late 90s block'),
  tape('mtv-spring-break-2000', '~.ia.mp4', 21605.55, 'MTV Spring Break 2000'),
];

export const MTV_90S = lineup('1990.11.00_MTV_4_Hours_MultiRecording_November_1990', { tapes: MTV_TAPES, audience: 'teen', seed: 17 });
