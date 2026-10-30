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

// ---- Saturday morning ----

/** A DVD-recorder rip: the tape's VIDEO_TS chapters, half an hour each. */
const chapters = (id: string, title: string, lengths: number[]): ArchivePart[] =>
  lengths.map((seconds, i) => tape(id, `~VTS_01_${i + 1}.mp4`, seconds, `${title} · part ${i + 1} of ${lengths.length}`));

/** Spider-Man: The Animated Series (Fox Kids, 1994–98), all 65. */
const SPIDER_MAN = series('spider-mantheanimatedseries', 'Spider-Man', [
  ['~01x01 ', 1149.13, 'Night of the Lizard'],
  ['~01x02 ', 1196.97, 'The Spider Slayer'],
  ['~01x03 ', 1194.8, 'Return of the Spider Slayers'],
  ['~01x04 ', 1185.77, 'Doctor Octopus - Armed and Dangerous'],
  ['~01x05 ', 1155.02, 'The Menace of Mysterio'],
  ['~01x06 ', 1192.72, 'The Sting of the Scorpion'],
  ['~01x07 ', 1134.06, 'Kraven The Hunter'],
  ['~01x08 ', 1212.81, 'The Alien Costume (Part 1)'],
  ['~01x09 ', 1196.46, 'The Alien Costume (Part 2)'],
  ['~01x10 ', 1192.17, 'The Alien Costume (Part 3)'],
  ['~01x11 ', 1221.16, 'The Hobgoblin (Part 1)'],
  ['~01x12 ', 1223.92, 'The Hobgoblin (Part 2)'],
  ['~01x13 ', 1192.01, 'Day of the Chameleon'],
  ['~02x01 ', 1220.24, 'The Insidious Six'],
  ['~02x02 ', 1191.12, 'Battle of the Insidious Six'],
  ['~02x03 ', 1190.86, 'Hydro-Man'],
  ['~02x04 ', 1152.78, 'The Mutant Agenda'],
  ['~02x05 ', 1218.48, 'Mutants\' Revenge'],
  ['~02x06 ', 1221.42, 'Morbius'],
  ['~02x07 ', 1220.11, 'Enter the Punisher'],
  ['~02x08 ', 1220.81, 'Duel of the Hunters'],
  ['~02x09 ', 1201.55, 'Blade, The Vampire Hunter'],
  ['~02x10 ', 1222.48, 'The Immortal Vampire'],
  ['~02x11 ', 1223.56, 'Tablet of Time'],
  ['~02x12 ', 1220.81, 'Ravages of Time'],
  ['~02x13 ', 1221.87, 'Shriek of the Vulture'],
  ['~02x14 ', 1217.74, 'The Final Nightmare'],
  ['~03x01 ', 1193.42, 'Doctor Strange'],
  ['~03x02 ', 1221.9, 'Make A Wish'],
  ['~03x03 ', 1221.9, 'Attack of the Octobot'],
  ['~03x04 ', 1220.62, 'Enter the Green Goblin'],
  ['~03x05 ', 1221.52, 'The Rocket Racer'],
  ['~03x06 ', 1222.03, 'Framed'],
  ['~03x07 ', 1221.64, 'The Man Without Fear'],
  ['~03x08 ', 1221.32, 'The Ultimate Slayer'],
  ['~03x09 ', 1220.33, 'Tombstone'],
  ['~03x10 ', 1216.4, 'Venom Returns'],
  ['~03x11 ', 1221.9, 'Carnage'],
  ['~03x12 ', 1183.37, 'The Spot'],
  ['~03x13 ', 1222.44, 'Goblin War'],
  ['~03x14 ', 1222.73, 'Turning Point'],
  ['~04x01 ', 1191.95, 'Guilty'],
  ['~04x02 ', 1193.61, 'The Cat'],
  ['~04x03 ', 1220.33, 'The Black Cat'],
  ['~04x04 ', 1197.55, 'The Return of Kraven'],
  ['~04x05 ', 1219.53, 'Partners'],
  ['~04x06 ', 1219.92, 'The Awakening'],
  ['~04x07 ', 1221.07, 'The Vampire Queen'],
  ['~04x08 ', 1220.49, 'The Return of the Green Goblin'],
  ['~04x09 ', 1222.03, 'The Haunting of Mary Jane Watson'],
  ['~04x10 ', 1222.38, 'The Lizard King'],
  ['~04x11 ', 1193.04, 'The Prowler'],
  ['~05x01 ', 1220.75, 'The Wedding'],
  ['~05x02 ', 1222.25, 'Six Forgotten Warriors'],
  ['~05x03 ', 1220.46, 'Unclaimed Legacy'],
  ['~05x04 ', 1221.9, 'Secrets of the Six'],
  ['~05x05 ', 1221.23, 'The Six Fight Again'],
  ['~05x06 ', 1221.36, 'The Price of Heroism'],
  ['~05x07 ', 1221.42, 'The Return of Hydro-Man (Part 1)'],
  ['~05x08 ', 1221.52, 'The Return of Hydro-Man (Part 2)'],
  ['~05x09 ', 1192.17, 'Arrival'],
  ['~05x10 ', 1221.32, 'The Gauntlet of the Red Skull'],
  ['~05x11 ', 1220.68, 'Doom'],
  ['~05x12 ', 1221.2, 'I Really, Really Hate Clones'],
  ['~05x13 ', 1220.94, 'Farewell, Spider-Man'],
]);

/** X-Men: The Animated Series (Fox Kids, 1992), season 1. */
const X_MEN = series('x-men-1_202406', 'X-Men', [
  ['~EP01 - ', 1276.36, 'Night of the Sentinels'],
  ['~EP02 - ', 1277.29, 'Night of the Sentinels Pt. 2'],
  ['~EP03 - ', 1278.16, 'Enter Magneto'],
  ['~EP04 - ', 1267.76, 'Deadly Reunions'],
  ['~EP05 - ', 1276.36, 'Captive Hearts'],
  ['~EP06 - ', 1277.74, 'Cold Vengeance'],
  ['~EP07 - ', 1277.13, 'Slave Island'],
  ['~EP08 - ', 1278.99, 'The Unstoppable Juggernaut'],
  ['~EP09 - ', 1278.12, 'The Cure'],
  ['~EP10 - ', 1278.41, 'Come the Apocalypse'],
  ['~EP11 - ', 1279.24, 'Days of Future Past'],
  ['~EP12 - ', 1278.12, 'Days of Future Past Pt. 2'],
  ['~EP13 - ', 1276.46, 'The Final Decision'],
]);

/** Doug, the Nickelodeon years and Disney's One Saturday Morning run. */
const DOUG = series('doug-cartoon-all-seasons', 'Doug', [
  ['~S01 E01', 1419.89, 'Doug Bags a Neematoad'],
  ['~S01 E02', 1420.02, 'Doug Can\'t Dance and Doug Gets Busted'],
  ['~S01 E04', 1419.09, 'Doug\'s Dog Date and Doug\'s Big Nose'],
  ['~S01 E06', 1415.95, 'Doug Takes a Hike and Doug Rocks'],
  ['~S01 E08', 1421.39, 'Doug Can\'t Dig It and Doug Didn\'t Do It'],
  ['~S01 E10', 1421.2, 'Mayor for a Day and Doug\'s No Dummy'],
  ['~S01 E12', 1427.49, 'Doug\'s Cool Shoes and Doug to the Rescue'],
  ['~S01 E14', 1418.18, 'Doug Gets His Ears Lowered and Doug on the Wild Side'],
  ['~S02 E17', 1427.03, 'Doug\'s a Big Fat Liar and Doug Wears Tights'],
  ['~S07 E20', 1373.78, 'Doug, Beebe Goes Broke'],
  ['~S07 E22', 1370.37, 'Patti\'s Dad Dilemma'],
  ['~S07 E30', 1369.73, 'Doug\'s Grand Band Plan'],
]);


/**
 * Saturday morning on the big networks: ABC in 1993, CBS in 1990, Fox Kids'
 * X-Men block and a 1994 Fox afternoon, a 1999 morning and Kids' WB in 2003,
 * with Spider-Man and X-Men episodes between the tapes.
 */
export const SATURDAY_MORNING = lineup('vts-01-2_20200824', {
  tapes: [
    ...chapters('vts-01-2_20200824', 'ABC Saturday morning · Aug 21 1993', [1753.25, 1762.16, 1759.16, 1759.13]),
    tape('videoplayback_20230810_1325', 'videoplayback.mp4', 7310.29, 'CBS Saturday morning · 1990'),
    tape('fox-kids', '~.ia.mp4', 5129.24, 'Fox Kids · the X-Men block'),
    tape('abc-sat-morning-4-3-93-woc-d-1', 'ABC Sat Morning 4-3-93 woc D1.mp4', 7239.76, 'ABC Saturday morning · Apr 3 1993'),
    ...chapters('vts-01-1_20250621', 'Saturday morning · Sept 1999', [1806.91, 1713.61]),
    tape('videoplayback_20230812', 'videoplayback.mp4', 7254.73, 'More CBS Saturday morning · 1990'),
    tape('1994-08-19-block-of-fox-programming-animaniacs-batman-bonkers-full-house-star-tr_202508', '~Block of Fox programming', 10901.89, 'Fox: Animaniacs, Batman, Bonkers · Aug 1994'),
    ...chapters('vts-01-3_20240907', 'ABC Saturday morning · Feb 6 1993', [1743.24, 1764.66, 1764.06, 1756.62]),
    ...chapters('kids-wb-saturday-morning-cartoons-july-2003-woc', "Kids' WB Saturday morning · July 2003", [1796.3, 1812.85, 1815.05, 1341.31]),
  ],
  shows: [SPIDER_MAN, X_MEN],
  audience: 'kids',
  seed: 18,
  perTape: 2,
});

/** Disney's One Saturday Morning on ABC, 1997–2000, with Doug between the tapes. */
export const ONE_SATURDAY_MORNING = lineup('vts-01-1_20250118', {
  tapes: [
    tape('onesaturdaymorningonfridaynight1998', '~ABC.One Saturday Morning on Friday Night', 1635.38, 'One Saturday Morning on Friday Night · 1998'),
    ...chapters('vts-01-1_20250118', "Disney's One Saturday Morning · 1998", [1807.81, 1813.61, 1807.41, 1800.77]),
    tape('onesaturdaymorningonfridaynight1998', '~Preview.1996', 1369.31, 'ABC Saturday Morning Preview · 1996'),
    tape('disneysonesaturdaymorningonabc2000', "~One Saturday Morning on ABC 2000", 18003.79, "Disney's One Saturday Morning · 2000"),
    tape('onesaturdaymorningonfridaynight1998', '~Preview.1997', 1333.57, 'ABC Saturday Morning Preview · 1997'),
    tape('onesaturdaymorningonfridaynight1998', '~Preview.1999', 1369.98, 'ABC Saturday Morning Preview · 1999'),
  ],
  shows: [DOUG],
  audience: 'kids',
  seed: 19,
  perTape: 3,
});
