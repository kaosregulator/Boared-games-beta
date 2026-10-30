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
  ['~02x05 ', 1218.48, "Mutants' Revenge"],
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
  ['~S01 E02', 1420.02, "Doug Can't Dance and Doug Gets Busted"],
  ['~S01 E04', 1419.09, "Doug's Dog Date and Doug's Big Nose"],
  ['~S01 E06', 1415.95, 'Doug Takes a Hike and Doug Rocks'],
  ['~S01 E08', 1421.39, "Doug Can't Dig It and Doug Didn't Do It"],
  ['~S01 E10', 1421.2, "Mayor for a Day and Doug's No Dummy"],
  ['~S01 E12', 1427.49, "Doug's Cool Shoes and Doug to the Rescue"],
  ['~S01 E14', 1418.18, 'Doug Gets His Ears Lowered and Doug on the Wild Side'],
  ['~S02 E17', 1427.03, "Doug's a Big Fat Liar and Doug Wears Tights"],
  ['~S07 E20', 1373.78, 'Doug, Beebe Goes Broke'],
  ['~S07 E22', 1370.37, "Patti's Dad Dilemma"],
  ['~S07 E30', 1369.73, "Doug's Grand Band Plan"],
]);


/** One uploader's box of old tapes: Saturday mornings from 1988 and a 1995 Nickelodeon morning. */
const OLD_TAPES = 'nickelodeon-saturday-morning-cartoons-1995-full-episodes-with-commercials';

/**
 * Saturday morning on the big networks: ABC in 1993, CBS in 1990, Fox Kids'
 * X-Men block and a 1994 Fox afternoon, a 1999 morning, Kids' WB in 2003 and
 * ABC and CBS in 1988,
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
    tape(OLD_TAPES, '~ABC Saturday Morning Cartoon Lineup Part 1', 5275.71, 'ABC Saturday morning · 1988 · part 1'),
    tape(OLD_TAPES, '~ABC Saturday Morning Lineup Part 2', 5111.36, 'ABC Saturday morning · 1988 · part 2'),
    tape(OLD_TAPES, '~CBS Saturday Morning Cartoon Line Up', 13073.51, 'CBS Saturday morning · 1988'),
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

// ---- Nickelodeon ----

/** Clarissa Explains It All, season 1 (Nickelodeon, 1991). */
const CLARISSA = series('clarissa-explains-it-all-season-1', 'Clarissa Explains It All', [
  ["CEIA S01 E01 - Clarissa'a Revenge.mp4", 1200.98, "Clarissa's Revenge"],
  ['CEIA S01 E02 - School Picture.mp4', 1539.94, 'School Picture'],
  ['CEIA S01 E03 - No T.V..mp4', 1536.6, 'No T.V.'],
  ['CEIA S01 E04 - Urge to Drive.mp4', 1535, 'Urge to Drive'],
  ['CEIA S01 E05 - Clarissa News Network.mp4', 1528.06, 'Clarissa News Network'],
  ['CEIA S01 E06 - Haunted House.mp4', 1575.91, 'Haunted House'],
  ['CEIA S01 E07 - The Bully.mp4', 1552.95, 'The Bully'],
  ['CEIA S01 E08 - New Addition.mp4', 1511.98, 'New Addition'],
  ['CEIA S01 E09 - Brain Drain.mp4', 1565.03, 'Brain Drain'],
  ['CEIA S01 E10 - Clarissa Makes a Cake.mp4', 1541.97, 'Clarissa Makes a Cake'],
  ['CEIA S01 E11 - Parents Who Say No.mp4', 1544.01, 'Parents Who Say No'],
  ['CEIA S01 E12 - Cool Dad.mp4', 1535.07, 'Cool Dad'],
  ['CEIA S01 E13 - Sick Days.mp4', 1550.95, 'Sick Days'],
]);

/** Hey Arnold!, season 1 (Nickelodeon, 1996). */
const HEY_ARNOLD = series('hey-arnold-1996', 'Hey Arnold!', [
  ["Season 1/Hey Arnold! S01E01 - Downtown As Fruits - Eugene's Bike.mp4", 1432.07, "Downtown As Fruits / Eugene's Bike"],
  ['Season 1/Hey Arnold! S01E02 - The Little Pink Book - Field Trip.mp4', 1405.09, 'The Little Pink Book / Field Trip'],
  ["Season 1/Hey Arnold! S01E03 - Arnold's Hat - The Stoop Kid.mp4", 1415.1, "Arnold's Hat / The Stoop Kid"],
  ["Season 1/Hey Arnold! S01E04 - Helga's Makeover - The Old Building.mp4", 1449.08, "Helga's Makeover / The Old Building"],
  ['Season 1/Hey Arnold! S01E05 - Sixth Grade Girls - The Baseball.mp4', 1415.1, 'Sixth Grade Girls / The Baseball'],
  ['Season 1/Hey Arnold! S01E06 - Heat - Snow.mp4', 1415.1, 'Heat / Snow'],
  ['Season 1/Hey Arnold! S01E07 - Operation Ruthless - The Vacant Lot.mp4', 1415.1, 'Operation Ruthless / The Vacant Lot'],
  ['Season 1/Hey Arnold! S01E08 - The List - The Haunted Train.mp4', 1417.1, 'The List / The Haunted Train'],
  ["Season 1/Hey Arnold! S01E09 - Mugged - Roughin' It.mp4", 1416.1, "Mugged / Roughin' It"],
  ['Season 1/Hey Arnold! S01E10 - Door 16 - Arnold As Cupid.mp4', 1416.1, 'Door 16 / Arnold As Cupid'],
  ['Season 1/Hey Arnold! S01E11 - Bench Warmer - Cool Jerk.mp4', 1416.1, 'Bench Warmer / Cool Jerk'],
  ["Season 1/Hey Arnold! S01E12 - Das Subway - Wheezin' Ed.mp4", 1416.1, "Das Subway / Wheezin' Ed"],
  ['Season 1/Hey Arnold! S01E13 - Tutoring Torvald - Gerald Comes Over.mp4', 1416.1, 'Tutoring Torvald / Gerald Comes Over'],
  ['Season 1/Hey Arnold! S01E14 - The Spelling Bee - Pigeon Man.mp4', 1415.1, 'The Spelling Bee / Pigeon Man'],
  ["Season 1/Hey Arnold! S01E15 - Olga Comes Home - Salley's Comet.mp4", 1416.06, "Olga Comes Home / Salley's Comet"],
  ['Season 1/Hey Arnold! S01E16 - Abner Comes Home - The Sewer King.mp4', 1415.1, 'Abner Comes Home / The Sewer King'],
  ['Season 1/Hey Arnold! S01E17 - False Alarm - World Records.mp4', 1415.1, 'False Alarm / World Records'],
  ['Season 1/Hey Arnold! S01E18 - Magic Show - Twenty Four Hours To Live.mp4', 1416.06, 'Magic Show / Twenty Four Hours To Live'],
  ['Season 1/Hey Arnold! S01E19 - Part Time Friends - Runaway Float.mp4', 1415.1, 'Part Time Friends / Runaway Float'],
  ["Season 1/Hey Arnold! S01E20 - Arnold's Christmas.mp4", 1445.08, "Arnold's Christmas"],
]);

/** The Adventures of Pete & Pete, season 3 (Nickelodeon, 1995–96). */
const PETE_AND_PETE = series('peteandpeteS3', 'The Adventures of Pete & Pete', [
  ['S03E01 - 35 Hours.mp4', 1460.82, '35 Hours'],
  ['S03E02 - The Trouble+With+Teddy.mp4', 1458.46, 'The Trouble With Teddy'],
  ['S03E03 - The Good, the Bad, and the Lucky.mp4', 1460.22, 'The Good, the Bad, and the Lucky'],
  ['S03E04 - Splashdown.mp4', 1460.06, 'Splashdown'],
  ['S03E05 - Dance Fever.mp4', 1460.63, 'Dance Fever'],
  ['S03E06 - Crisis In The Love Zone.mp4', 1461.05, 'Crisis In The Love Zone'],
  ['S03E07 - Last Laugh.mp4', 1457.37, 'Last Laugh'],
  ['S03E08 - Allnighter.mp4', 1460.22, 'Allnighter'],
  ['S03E09 - Road Warrior.mp4', 1460.57, 'Road Warrior'],
  ['S03E10 - Pinned.mp4', 1461.31, 'Pinned'],
  ['S03E11 - O Christmas Pete.mp4', 1458.54, 'O Christmas Pete'],
  ['S03E12 - Das Bus.mp4', 1460.04, 'Das Bus'],
  ['S03E13 - Saturday.mp4', 1460.57, 'Saturday'],
]);

/**
 * Nickelodeon through the 90s off viewers' tapes: Nick Jr. in 1990, a 1993
 * day, Frightfest and Mushfest in 1994, a 1995 Saturday, summer 1996, 1999
 * and 2000, and SpongeBob, Invader Zim and KaBlam! in 2001. Hey Arnold!,
 * Clarissa and Pete & Pete episodes run between the tapes.
 */
export const NICK_90S = lineup('nickelodeon-july-august96-complete', {
  tapes: [
    tape('youtube-QUgPrhArLvo', '~QUgPrhArLvo.mp4', 12529.74, 'Nick Jr. & Nickelodeon · Dec 1990'),
    tape('nickelodeon-1993_202408', '~.ia.mp4', 22155.9, 'Nickelodeon · 1993'),
    tape('nickelodeon-frightfest-1994-vhs_202206', 'Nickelodeon Frightfest 1994 VHS.mp4', 3062.93, 'Nickelodeon Frightfest · 1994'),
    tape(OLD_TAPES, '~Nickelodeon Saturday Morning Cartoons', 21561.12, 'Nickelodeon Saturday morning · 1995'),
    tape('nickelodeon-mushfest-1994-vhs', 'Nickelodeon Mushfest 1994 VHS.mp4', 3395.8, 'Nickelodeon Mushfest · 1994'),
    tape('nickelodeon-july-august96-complete', '~.ia.mp4', 15559.19, 'Nickelodeon · July 15 1996'),
    tape('2026-01-05-17-43-20-1', '~.ia.mp4', 14800.22, 'Nickelodeon · May 22 1999'),
    tape('march-11-and-12-2000-nickelodeon', '~Tape 1.ia.mp4', 9841.4, 'Nickelodeon · March 11 2000 · tape 1'),
    tape('march-11-and-12-2000-nickelodeon', '~Tape 2.ia.mp4', 9825.38, 'Nickelodeon · March 11 2000 · tape 2'),
    tape('spongebobsync', 'spongebobsync.mp4', 5155.44, 'Nickelodeon: SpongeBob, Invader Zim, KaBlam! · Oct 12 2001'),
  ],
  shows: [HEY_ARNOLD, CLARISSA, PETE_AND_PETE],
  audience: 'kids',
  seed: 20,
  perTape: 3,
});

// ---- PBS Kids ----

/** Bill Nye the Science Guy, all 100 (PBS, 1993–98). */
const BILL_NYE = series('billnyethescienceguythecompleteseries-07-28-2021', 'Bill Nye the Science Guy', [
  ['01 Flight.mp4', 1380.79, 'Flight'],
  ["02 Earth's Crust.mp4", 1390.15, "Earth's Crust"],
  ['03 Dinosaurs.mp4', 1377.21, 'Dinosaurs'],
  ['04 Skin.mp4', 1357.7, 'Skin'],
  ['05 Buoyancy.mp4', 1353.02, 'Buoyancy'],
  ['06 Gravity.mp4', 1375.68, 'Gravity'],
  ['07 Digestion.mp4', 1381.46, 'Digestion'],
  ['08 Phases of Matter.mp4', 1360.36, 'Phases of Matter'],
  ['09 Biodiversity.mp4', 1378.38, 'Biodiversity'],
  ['10 Simple Machines.mp4', 1352.92, 'Simple Machines'],
  ['11 The Moon.mp4', 1379.45, 'The Moon'],
  ['12 Sound.mp4', 1383.76, 'Sound'],
  ['13 Garbage.mp4', 1380.26, 'Garbage'],
  ['14 Structures.mp4', 1358.16, 'Structures'],
  ['15 Earth Seasons.mp4', 1380.98, 'Earth Seasons'],
  ['16 Light and Color.mp4', 1380.19, 'Light and Color'],
  ['17 Cells.mp4', 1376.4, 'Cells'],
  ['18 Electricity.mp4', 1381.53, 'Electricity'],
  ['19 Outer Space.mp4', 1376.44, 'Outer Space'],
  ['20 Eyeball.mp4', 1379.85, 'Eyeball'],
  ['21 Magnetism.mp4', 1381.46, 'Magnetism'],
  ['22 Wind.mp4', 1351.25, 'Wind'],
  ['23 Blood & Circulation.mp4', 1377.43, 'Blood & Circulation'],
  ['24 Chemical Reactions.mp4', 1381.53, 'Chemical Reactions'],
  ['25 Static Electricity.mp4', 1380, 'Static Electricity'],
  ['26 Food Web.mp4', 1383.33, 'Food Web'],
  ['27 Light Optics.mp4', 1380, 'Light Optics'],
  ['28 Bones & Muscles.mp4', 1361.64, 'Bones & Muscles'],
  ['29 Ocean Currents.mp4', 1381.89, 'Ocean Currents'],
  ['30 Heat.mp4', 1306.84, 'Heat'],
  ['31 Insects.mp4', 1374.43, 'Insects'],
  ['32 Balance.mp4', 1384.39, 'Balance'],
  ['33 Sun.mp4', 1375.03, 'Sun'],
  ['34 Brain.mp4', 1381.15, 'Brain'],
  ['35 Forest.mp4', 1375.08, 'Forest'],
  ['36 Communication.mp4', 1375.04, 'Communication'],
  ['37 Momentum.mp4', 1375.89, 'Momentum'],
  ['38 Reptiles.mp4', 1382.04, 'Reptiles'],
  ['39 Atmosphere.mp4', 1385.49, 'Atmosphere'],
  ['40 Respiration.mp4', 1384.63, 'Respiration'],
  ['41 Planets.mp4', 1377.45, 'Planets'],
  ['42 Pressure.mp4', 1388.11, 'Pressure'],
  ['43 Plants.mp4', 1385.85, 'Plants'],
  ['44 Rocks & Soil.mp4', 1384.57, 'Rocks & Soil'],
  ['45 Energy.mp4', 1378.25, 'Energy'],
  ['46 Evolution.mp4', 1380.28, 'Evolution'],
  ['47 Water Cycle.mp4', 1385.06, 'Water Cycle'],
  ['48 Friction.mp4', 1377.62, 'Friction'],
  ['49 Germs.mp4', 1381.44, 'Germs'],
  ['50 Climate.mp4', 1351.77, 'Climate'],
  ['51 Waves.mp4', 1382.04, 'Waves'],
  ['52 Ocean Life.mp4', 1379.52, 'Ocean Life'],
  ['53 Mammals.mp4', 1376.83, 'Mammals'],
  ['54 Spinning Things.mp4', 1376.83, 'Spinning Things'],
  ['55 Fish.mp4', 1382.83, 'Fish'],
  ['56 Human Transportation.mp4', 1383.12, 'Human Transportation'],
  ['57 Wetlands.mp4', 1381.56, 'Wetlands'],
  ['58 Birds.mp4', 1361.23, 'Birds'],
  ['59 Populations.mp4', 1384.12, 'Populations'],
  ['60 Animal Locomotion.mp4', 1389.39, 'Animal Locomotion'],
  ['61 Rivers and Streams.mp4', 1387.86, 'Rivers and Streams'],
  ['62 Nutrition.mp4', 1377.62, 'Nutrition'],
  ['63 Marine Mammals.mp4', 1378.92, 'Marine Mammals'],
  ['64 Earthquakes.mp4', 1382.9, 'Earthquakes'],
  ['65 NTV Top 11 Countdown.mp4', 1380.28, 'NTV Top 11 Countdown'],
  ['66 Spiders.mp4', 1389.82, 'Spiders'],
  ['67 Pollution Solutions.mp4', 1381.55, 'Pollution Solutions'],
  ['68 Probability.mp4', 1387.02, 'Probability'],
  ['69 Pseudoscience.mp4', 1381.95, 'Pseudoscience'],
  ['70 Flowers.mp4', 1391.56, 'Flowers'],
  ['71 Archaeology.mp4', 1354.99, 'Archaeology'],
  ['72 Deserts.mp4', 1385.42, 'Deserts'],
  ['73 Amphibians.mp4', 1385.85, 'Amphibians'],
  ['74 Volcanoes.mp4', 1381.6, 'Volcanoes'],
  ['75 Invertebrates.mp4', 1380.41, 'Invertebrates'],
  ['76 Heart.mp4', 1387.22, 'Heart'],
  ['77 Inventing.mp4', 1380.21, 'Inventing'],
  ['78 Computers.mp4', 1374.68, 'Computers'],
  ['79 Fossils.mp4', 1383.62, 'Fossils'],
  ['80 Time.mp4', 1386.35, 'Time'],
  ['81 Forensics.mp4', 1381.15, 'Forensics'],
  ['82 Space Exploration.mp4', 1390.62, 'Space Exploration'],
  ['83 Genes.mp4', 1382.38, 'Genes'],
  ['84 Architecture.mp4', 1384.56, 'Architecture'],
  ['85 Farming.mp4', 1392.43, 'Farming'],
  ['86 Life Cycles.mp4', 1375.51, 'Life Cycles'],
  ['87 Do-It-Yourself Science.mp4', 1392.66, 'Do-It-Yourself Science'],
  ['88 Atoms & Molecules.mp4', 1373.57, 'Atoms & Molecules'],
  ['89 Ocean Exploration.mp4', 1380.72, 'Ocean Exploration'],
  ['90 Lakes & Ponds.mp4', 1378.53, 'Lakes & Ponds'],
  ['91 Smell.mp4', 1381.58, 'Smell'],
  ['92 Caves.mp4', 1380.19, 'Caves'],
  ['93 Fluids.mp4', 1385.32, 'Fluids'],
  ['94 Erosion.mp4', 1376.4, 'Erosion'],
  ['95 Comets & Meteors.mp4', 1390.32, 'Comets & Meteors'],
  ['96 Storms.mp4', 1377.69, 'Storms'],
  ['97 Measurement.mp4', 1390.94, 'Measurement'],
  ['98 Patterns.mp4', 1382.9, 'Patterns'],
  ['99 Science of Music.mp4', 1382.9, 'Science of Music'],
  ['100 Motion.mp4', 1396.77, 'Motion'],
]);

/** Zoboomafoo, season 1 (PBS Kids, 1999). */
const ZOBOOMAFOO = series('zoboomafoo-season-1', 'Zoboomafoo', [
  ['Zoboomafoo.S01E01.The.Nose.Knows.HDTV-720p.ia.mp4', 1673.91, 'The Nose Knows'],
  ['Zoboomafoo.S01E02.Eye.Spy.HDTV-720p.ia.mp4', 1674.44, 'Eye Spy'],
  ['Zoboomafoo.S01E03.Dinosaurs.HDTV-720p.ia.mp4', 1677.48, 'Dinosaurs'],
  ['Zoboomafoo.S01E04.Whos.In.the.Hole.HDTV-720p.ia.mp4', 1680.67, "Who's In the Hole"],
  ['Zoboomafoo.S01E05.Happy.Lemur.Day.HDTV-720p.ia.mp4', 1676.21, 'Happy Lemur Day'],
  ['Zoboomafoo.S01E06.Swimming.HDTV-720p.ia.mp4', 1674.24, 'Swimming'],
  ['Zoboomafoo.S01E07.Slimy.Buddies.HDTV-720p.ia.mp4', 1675.37, 'Slimy Buddies'],
  ['Zoboomafoo.S01E08.Snow.Day.HDTV-720p.ia.mp4', 1674.73, 'Snow Day'],
  ['Zoboomafoo.S01E09.Night.Time.HDTV-720p.ia.mp4', 1674.26, 'Night Time'],
  ['Zoboomafoo.S01E10.Climbing.HDTV-720p.ia.mp4', 1677.36, 'Climbing'],
  ['Zoboomafoo.S01E11.Fierce.Creatures.HDTV-720p.ia.mp4', 1674.95, 'Fierce Creatures'],
  ['Zoboomafoo.S01E12.Homes.HDTV-720p.ia.mp4', 1674.28, 'Homes'],
  ['Zoboomafoo.S01E13.Puppies.HDTV-720p.ia.mp4', 1676.48, 'Puppies'],
  ['Zoboomafoo.S01E14.Tracks.HDTV-720p.ia.mp4', 1676.23, 'Tracks'],
  ['Zoboomafoo.S01E15.Fling.HDTV-720p.ia.mp4', 1674.16, 'Fling'],
  ['Zoboomafoo.S01E16.Itchy.HDTV-720p.ia.mp4', 1675.21, 'Itchy'],
  ['Zoboomafoo.S01E17.Ears.Hear.HDTV-720p.ia.mp4', 1674.79, 'Ears Hear'],
  ['Zoboomafoo.S01E18.Feeling.Good.HDTV-720p.ia.mp4', 1674.53, 'Feeling Good'],
  ['Zoboomafoo.S01E19.Running.HDTV-720p.ia.mp4', 1674.37, 'Running'],
  ['Zoboomafoo.S01E20.Animal.Daycare.HDTV-720p.ia.mp4', 1674.89, 'Animal Daycare'],
  ['Zoboomafoo.S01E21.Giants.HDTV-720p.ia.mp4', 1676.34, 'Giants'],
  ['Zoboomafoo.S01E22.Pets.HDTV-720p.ia.mp4', 1678.61, 'Pets'],
  ['Zoboomafoo.S01E23.Bears.HDTV-720p.ia.mp4', 1676.53, 'Bears'],
  ['Zoboomafoo.S01E24.Lids.HDTV-720p.ia.mp4', 1675.65, 'Lids'],
  ['Zoboomafoo.S01E25.Great.Singers.HDTV-720p.ia.mp4', 1675.61, 'Great Singers'],
  ['Zoboomafoo.S01E26.Playtime.HDTV-720p.ia.mp4', 1676.68, 'Playtime'],
  ['Zoboomafoo.S01E27.Fast.and.Slow.HDTV-720p.ia.mp4', 1676.41, 'Fast and Slow'],
  ['Zoboomafoo.S01E28.Horses.HDTV-720p.ia.mp4', 1664.85, 'Horses'],
  ['Zoboomafoo.S01E29.Bathtime.HDTV-720p.ia.mp4', 1669.54, 'Bathtime'],
  ['Zoboomafoo.S01E30.Jumpers.HDTV-720p.ia.mp4', 1662.04, 'Jumpers'],
  ['Zoboomafoo.S01E31.Funny.Faces.HDTV-720p.ia.mp4', 1678.32, 'Funny Faces'],
  ['Zoboomafoo.S01E32.Spots.and.Stripes.HDTV-720p.ia.mp4', 1675.16, 'Spots and Stripes'],
  ['Zoboomafoo.S01E33.Sand.Creatures.HDTV-720p.ia.mp4', 1676.13, 'Sand Creatures'],
  ['Zoboomafoo.S01E34.Water.Creatures.HDTV-720p.ia.mp4', 1676.25, 'Water Creatures'],
  ['Zoboomafoo.S01E35.Whos.In.the.Egg.HDTV-720p.ia.mp4', 1676.69, "Who's In the Egg"],
  ['Zoboomafoo.S01E36.Hail.to.Tails.HDTV-720p.ia.mp4', 1673.95, 'Hail to Tails'],
  ['Zoboomafoo.S01E37.Cats.HDTV-720p.ia.mp4', 1675.97, 'Cats'],
  ["Zoboomafoo.S01E38.The.Four.F's.HDTV-720p.ia.mp4", 1676.51, "The Four F's"],
  ['Zoboomafoo.S01E39.Stinky.HDTV-720p.ia.mp4', 1676.05, 'Stinky'],
  ['Zoboomafoo.S01E40.Bzzz.HDTV-720p.ia.mp4', 1675.31, 'Bzzz'],
]);


/** The Magic School Bus, all 52 (PBS, 1994–97). */
const MAGIC_SCHOOL_BUS = series(
  'MagicSchoolBusAllEpisodes',
  'The Magic School Bus',
  [
    1537.81, 1553.47, 1553.6, 1553.54, 1553.6, 1552.94, 1553.24, 1553.4, 1553.4, 1553.35, 1553.44, 1553.37, 1507.52, 1555.09, 1553.39,
    1553.44, 1553.39, 1553.39, 1553.29, 1553.33, 1553.39, 1553.39, 1553.35, 1554.14, 1553.35, 1553.32, 1553.39, 1555.09, 1553.39, 1553.39,
    1553.39, 1553.39, 1553.39, 1553.39, 1553.39, 1553.39, 1553.54, 1553.27, 1553.47, 1553.45, 1553.45, 1553.45, 1553.45, 1553.45, 1553.45,
    1553.74, 1553.45, 1553.45, 1553.45, 1553.28, 1553.45, 1553.45,
  ].map((seconds, i): [string, number, string] => [`s01e${String(i + 1).padStart(2, '0')}.mp4`, seconds, `Episode ${i + 1}`]),
);

/** Where in the World Is Carmen Sandiego?, the PBS game show, season 1 (1991). */
const CARMEN_SANDIEGO = series(
  '65_20231114',
  'Where in the World Is Carmen Sandiego?',
  [
    1660.97, 1635.15, 1666.17, 1646.83, 1554.3, 1384.05, 1706.67, 1604.52, 1603.85, 1659.55, 1643.09, 1653.82, 1658.25, 1689.16, 1560.78,
    1667.38, 1731.05, 1661.48, 1627.07, 1681.8, 1504.65, 1669.75, 1629.88, 1697.1, 1613.72, 1570.02, 1650.17, 1621.94, 1689.58, 1807.63,
    1651.47, 1610.4, 1655.84, 1549.1, 1525.32, 1532.47, 1551.14, 1632.94, 1614.88, 1649.13, 1651.98, 1551.53, 1617.9, 1645.18, 1678.64,
    1572.43, 1516.59, 1524.41, 1452.99, 1646.5, 1569.58, 1425.94, 1493.88, 1579.03, 1696.85, 1556.09, 1673.07, 1589.1, 1539.85, 1378.64,
    1641.72, 1654.35, 1654.96, 1528.25, 1713.66,
  ].map((seconds, i): [string, number, string] => [`${String(i + 1).padStart(2, '0')}.mp4`, seconds, `Episode ${i + 1}`]),
);

/** WQED Pittsburgh's PBS Kids mornings, 2000–02, taped whole. */
const WQED = 'WQEDump';

/**
 * PBS Kids: WQED's mornings and the Bookworm Bunch off tape (Arthur,
 * Clifford, Dragon Tales, Mister Rogers, Barney, Teletubbies), a 1990s tape
 * and Katie and Orbie, with Bill Nye, The Magic School Bus, Zoboomafoo and
 * Carmen Sandiego episodes between them.
 */
export const PBS_KIDS = lineup(WQED, {
  tapes: [
    tape('videoplayback_20211123_1551', 'videoplayback.mp4', 3717.68, 'PBS Kids · 1990s tape'),
    tape(WQED, '~Arthur, Clifford, Dragon Tales, Mr Rogers.ia', 7412.94, 'WQED PBS Kids: Arthur, Clifford, Dragon Tales, Mister Rogers · 2000'),
    tape(WQED, '~2 hours of PBS Kdis.ia', 7404.72, 'WQED PBS Kids · two hours'),
    tape(WQED, '~Bookworm Bunch 1.ia', 5438.96, 'WQED Bookworm Bunch · 1'),
    tape('katie-and-orbie-re-runs', 'mister rogers full tape.mp4', 20817.63, "Mister Rogers' Neighborhood · a whole tape"),
    tape(WQED, '~Dragon Tales, Mr Rogers, Barney, Teletubbies.ia', 7403.65, 'WQED PBS Kids: Dragon Tales, Mister Rogers, Barney, Teletubbies · 2000'),
    tape(WQED, '~2.5 hours PBS Kids.ia', 8590.5, 'WQED PBS Kids · two and a half hours'),
    tape(WQED, '~Bookworm Bunch 2.ia', 7500.28, 'WQED Bookworm Bunch · 2'),
    tape('katie-and-orbie-re-runs', 'katie and orbie I.mp4', 20912.96, 'Katie and Orbie reruns · tape 1'),
    tape(WQED, '~Dragon Tales and Clifford 2.ia', 7383.21, 'WQED PBS Kids: Dragon Tales and Clifford · 2'),
    tape(WQED, '~Various PBS Kids.ia', 7402.72, 'WQED PBS Kids · 2000'),
    tape(WQED, '~Bookworm Bunch 2000-11-13.ia', 7390.16, 'WQED Bookworm Bunch · Nov 13 2000'),
    tape(WQED, '~Dragon Tales and Clifford 3.ia', 7410.48, 'WQED PBS Kids: Dragon Tales and Clifford · 3'),
    tape(WQED, '~6 hours of PBS Kids.ia', 22047.15, 'WQED PBS Kids · six hours'),
    tape('katie-and-orbie-re-runs', 'katie and orbie II.mp4', 21919, 'Katie and Orbie reruns · tape 2'),
    tape(WQED, '~Bookworm Bunch 3.ia', 7405.1, 'WQED Bookworm Bunch · 3'),
    tape(WQED, '~Dragon Tales and Clifford 4.ia', 7200.3, 'WQED PBS Kids: Dragon Tales and Clifford · 4'),
    tape(WQED, '~Dragon Tales and Barney - 2000.ia', 7370.54, 'WQED PBS Kids: Dragon Tales and Barney · 2000'),
    tape(WQED, '~Cyberchase Premiere', 13967.76, 'WQED Bookworm Bunch · Jan 2002'),
  ],
  shows: [BILL_NYE, MAGIC_SCHOOL_BUS, ZOBOOMAFOO, CARMEN_SANDIEGO],
  audience: 'kids',
  seed: 21,
  perTape: 4,
});

// ---- Animal Planet & Discovery ----

/** Kratts' Creatures, all 50 (PBS, 1996). */
const KRATTS = series('kratts-creatures-complete-series', "Kratts' Creatures", [
  ['Episode 1 - Big Five, Little Five.mp4', 1670.67, 'Big Five, Little Five'],
  ['Episode 2 - City Critters.mp4', 1670.77, 'City Critters'],
  ['Episode 3 - Sharks.mp4', 1670.28, 'Sharks'],
  ['Episode 4 - Running with the Wild Dogs.mp4', 1670.77, 'Running with the Wild Dogs'],
  ['Episode 5 - In Search of the Tasmanian Tiger.mp4', 1670.6, 'In Search of the Tasmanian Tiger'],
  ['Episode 6 - The Great Defenders.mp4', 1670.77, 'The Great Defenders'],
  ['Episode 7 - Pan troglodytes.mp4', 1670.38, 'Pan troglodytes'],
  ['Episode 8 - The Great Canadians.mp4', 1670.67, 'The Great Canadians'],
  ['Episode 9 - Rainforests.mp4', 1670.28, 'Rainforests'],
  ['Episode 10 - Creatures of the Night.mp4', 1664.04, 'Creatures of the Night'],
  ['Episode 11 - Educating Emily.mp4', 1670.54, 'Educating Emily'],
  ["Episode 12 - Wild Elephants Couldn't Drag Me Away.mp4", 1667, "Wild Elephants Couldn't Drag Me Away"],
  ['Episode 13 - Weird Creatures.mp4', 1670.81, 'Weird Creatures'],
  ['Episode 14 - Planet of the Dolphins.mp4', 1670.71, 'Planet of the Dolphins'],
  ['Episode 15 - The Great Bear Show.mp4', 1671.04, 'The Great Bear Show'],
  ['Episode 16 - Mgobo of Baboon Mountain.mp4', 1670.87, 'Mgobo of Baboon Mountain'],
  ['Episode 17 - The How Show.mp4', 1670.71, 'The How Show'],
  ['Episode 18 - Kickboxing Kangaroos.mp4', 1670.77, 'Kickboxing Kangaroos'],
  ['Episode 19 - The Giant Bug Invasion.mp4', 1670.87, 'The Giant Bug Invasion'],
  ['Episode 20 - Heavyweights of Africa.mp4', 1671.05, 'Heavyweights of Africa'],
  ['Episode 21 - The Redcoats Are Coming.mp4', 1670.94, 'The Redcoats Are Coming'],
  ['Episode 22 - The Cow Show.mp4', 1670.81, 'The Cow Show'],
  ['Episode 23 - Maximum Cheetah Velocity.mp4', 1669.68, 'Maximum Cheetah Velocity'],
  ['Episode 24 - Wild Ponies.mp4', 1670.78, 'Wild Ponies'],
  ["Episode 25 - Who's Who.mp4", 1670.87, "Who's Who"],
  ['Episode 26 - The Sea Turtle Invasion.mp4', 1670.77, 'The Sea Turtle Invasion'],
  ['Episode 27 - Running the Gauntlet.mp4', 1626.83, 'Running the Gauntlet'],
  ['Episode 28 - Around Australia in Eight Days.mp4', 1670.54, 'Around Australia in Eight Days'],
  ['Episode 29 - Hyenas Are Cool.mp4', 1670.67, 'Hyenas Are Cool'],
  ["Episode 30 - Mungu's Revenge.mp4", 1670.6, "Mungu's Revenge"],
  ['Episode 31 - Creature Rescue.mp4', 1670.71, 'Creature Rescue'],
  ['Episode 32 - Lion, King of the Beasts.mp4', 1628.9, 'Lion, King of the Beasts'],
  ['Episode 33 - Marshmania.mp4', 1670.6, 'Marshmania'],
  ['Episode 34 - Why.mp4', 1670.77, 'Why'],
  ['Episode 35 - Koalas and Wombats.mp4', 1670.71, 'Koalas and Wombats'],
  ['Episode 36 - Backyard Bandits.mp4', 1670.94, 'Backyard Bandits'],
  ['Episode 37 - Hanging with the Monkeys.mp4', 1670.77, 'Hanging with the Monkeys'],
  ['Episode 38 - The Best of the Best.mp4', 1671.04, 'The Best of the Best'],
  ['Episode 39 - Polyp Power.mp4', 1670.99, 'Polyp Power'],
  ['Episode 40 - Wings.mp4', 1670.87, 'Wings'],
  ['Episode 41 - Phantom Wolves.mp4', 1670.94, 'Phantom Wolves'],
  ['Episode 42 - Australia, Land of Mystery and Intrigue.mp4', 1670.54, 'Australia, Land of Mystery and Intrigue'],
  ['Episode 43 - Leopard, Prince of Stealth.mp4', 1670.77, 'Leopard, Prince of Stealth'],
  ['Episode 44 - When.mp4', 1669.84, 'When'],
  ['Episode 45 - Parched and Thirsty in the Outback.mp4', 1670.27, 'Parched and Thirsty in the Outback'],
  ['Episode 46 - Gatorglades.mp4', 1670.77, 'Gatorglades'],
  ['Episode 47 - Spots and Stripes Forever.mp4', 1670.94, 'Spots and Stripes Forever'],
  ['Episode 48 - Three Cool Cats.mp4', 1669.17, 'Three Cool Cats'],
  ['Episode 49 - Where.mp4', 1671.27, 'Where'],
  ['Episode 50 - Around Africa in Eight Hours.mp4', 1670.77, 'Around Africa in Eight Hours'],
]);

/** The Crocodile Hunter with Steve Irwin (Animal Planet, 1996–2004). */
const CROC_HUNTER = series('the-crocodile-hunter', 'The Crocodile Hunter', [
  ['s00e02 - Lights! Croc! Action!.mp4', 3002.65, 'Lights! Croc! Action!'],
  ['s00e04 - Big Croc Diaries Special Edition.mp4', 2932.63, 'Big Croc Diaries Special Edition'],
  ['s02e05 - Reptiles of the Deep Turtles.mp4', 3124.67, 'Reptiles of the Deep Turtles'],
  ['s02e06 - Where Devils Run Wild.mp4', 2940.97, 'Where Devils Run Wild'],
  ['s02e07 - Last Waterholes of the Outback.mp4', 2979.6, 'Last Waterholes of the Outback'],
  ['s02e10 - Sharks Outside the Cage.mp4', 2811.9, 'Sharks Outside the Cage'],
  ['s03e01 - Legends of the Galapagos.mp4', 3003, 'Legends of the Galapagos'],
  ["s03e02 - America's Deadliest Snakes.mp4", 3002, "America's Deadliest Snakes"],
  ['s03e03 - Reptiles of the Deep Sea Snakes.mp4', 3020.03, 'Reptiles of the Deep Sea Snakes'],
  ['s03e04 - Reptiles of the Deep Saurians.mp4', 3004.77, 'Reptiles of the Deep Saurians'],
  ['s03e05 - Steve and the Dragon.mp4', 3003.07, 'Steve and the Dragon'],
  ["s03e06 - Australia's Wild Frontier.mp4", 3009.37, "Australia's Wild Frontier"],
  ['s03e07 - Faces in the Forest.mp4', 3001.33, 'Faces in the Forest'],
  ["s03e08 - Steve's Story.mp4", 3988.33, "Steve's Story"],
  ["s03e09 - Steve's Most Dangerous Adventures.mp4", 3439.57, "Steve's Most Dangerous Adventures"],
  ["s03e10 - Steve's Greatest Crocodile Captures.mp4", 3127.73, "Steve's Greatest Crocodile Captures"],
  ['s03e11 - Wild River of Africa.mp4', 3005.33, 'Wild River of Africa'],
  ['s03e12 - A Handful of Elephants.mp4', 3005.6, 'A Handful of Elephants'],
  ['s03e13 - Jungle in the Clouds.mp4', 3217.57, 'Jungle in the Clouds'],
  ['s03e14 - Wildest Baby Animal Videos.mp4', 3004.6, 'Wildest Baby Animal Videos'],
  ['s03e15 - Wildlife in Combat.mp4', 3006.83, 'Wildlife in Combat'],
  ['s03e16 - Forces of Nature.mp4', 3007.03, 'Forces of Nature'],
  ['s04e01 - Sidewinders of Arizona.mp4', 3009.37, 'Sidewinders of Arizona'],
  ['s04e02 - Captured on Camera.mp4', 2585.2, 'Captured on Camera'],
  ['s04e03 - Crocodiles of the Revolution.mp4', 3002.37, 'Crocodiles of the Revolution'],
  ['s04e04 - Journey to the Red Centre.mp4', 3005.37, 'Journey to the Red Centre'],
  ["s04e05 - Africa's Deadliest Snakes.mp4", 3006.07, "Africa's Deadliest Snakes"],
  ['s04e06 - Wildest Home Videos.mp4', 2595.63, 'Wildest Home Videos'],
  ['s04e07 - Big Croc Diaries.mp4', 2601.94, 'Big Croc Diaries'],
  ['s04e08 - Swimming with Alligators.mp4', 3002, 'Swimming with Alligators'],
  ['s04e09 - Surfing Snakes.mp4', 3002.57, 'Surfing Snakes'],
  ['s04e10 - Last Primates of Madagascar.mp4', 3002.6, 'Last Primates of Madagascar'],
  ['s04e11 - Reptiles of the Lost Continent.mp4', 3003.57, 'Reptiles of the Lost Continent'],
  ['s04e12 - Spitting Cobras of the World.mp4', 3002, 'Spitting Cobras of the World'],
  ['s04e13 - Dangerous Africans.mp4', 3001.73, 'Dangerous Africans'],
  ['s04e16 - Operation Steve.mp4', 1320.07, 'Operation Steve'],
  ["s04e17 - Africa's Final Frontier.mp4", 3001.7, "Africa's Final Frontier"],
  ["s04e18 - Graham's Revenge.mp4", 2941.3, "Graham's Revenge"],
  ['s05e01 - Outback to Hollywood.mp4', 2882.97, 'Outback to Hollywood'],
  ['s05e02 - Casper - The White Crocodile.mp4', 3971.6, 'Casper - The White Crocodile'],
  ['s05e03 - Whale Sharks of the Wild West.mp4', 3002.33, 'Whale Sharks of the Wild West'],
  ['s05e04 - Crocodile Coast.mp4', 3002.58, 'Crocodile Coast'],
  ['s05e05 - River of the Dammed.mp4', 3002.57, 'River of the Dammed'],
  ["s05e06 - They Shoot Crocodiles Don't They.mp4", 2820.63, "They Shoot Crocodiles Don't They"],
  ['s05e07 - Search for a Super Croc.mp4', 2577.2, 'Search for a Super Croc'],
  ['s05e08 - Crocs in the City.mp4', 2880.6, 'Crocs in the City'],
  ['s05e09 - Island of Snakes.mp4', 3122.01, 'Island of Snakes'],
  ['s05e10 - Tigers of Shark Bay.mp4', 3001.6, 'Tigers of Shark Bay'],
  ['s05e11 - Ice Breaker.mp4', 2880.03, 'Ice Breaker'],
]);

/** Crocodile Hunter Diaries, seasons 1–2 (Animal Planet, 2002–03). */
const CROC_DIARIES = series('crocodile-hunter-diaries', 'Crocodile Hunter Diaries', [
  ['Crocodile Hunter Diaries S01E01 Wild About Harry.mp4', 2669.18, 'Wild About Harry'],
  ["Crocodile Hunter Diaries S01E02 What's The Buzz.mp4", 2668.29, "What's The Buzz"],
  ["Crocodile Hunter Diaries S01E03 Steve's Birthday.mp4", 2668.16, "Steve's Birthday"],
  ['Crocodile Hunter Diaries S01E04 Operation Sui.mp4', 2668.29, 'Operation Sui'],
  ["Crocodile Hunter Diaries S01E05 Kelly's Big Day.mp4", 2668.93, "Kelly's Big Day"],
  ["Crocodile Hunter Diaries S01E06 It's A Girl.mp4", 2668.16, "It's A Girl"],
  ['Crocodile Hunter Diaries S01E07 Zoo Mates.mp4', 2668.16, 'Zoo Mates'],
  ['Crocodile Hunter Diaries S01E08 A Jellybean For Jodie.mp4', 2668.17, 'A Jellybean For Jodie'],
  ['Crocodile Hunter Diaries S01E09 The Day Of The Devils.mp4', 2667.93, 'The Day Of The Devils'],
  ['Crocodile Hunter Diaries S01E10 Pelican Wars.mp4', 2693.02, 'Pelican Wars'],
  ['Crocodile Hunter Diaries S01E11 Gator Raid.mp4', 2691.71, 'Gator Raid'],
  ['Crocodile Hunter Diaries S01E12 The Big Wet.mp4', 2689.79, 'The Big Wet'],
  ["Crocodile Hunter Diaries S01E13 Mary's Farewell.mp4", 2665.26, "Mary's Farewell"],
  ['Crocodile Hunter Diaries S02E01 Pressure Point.mp4', 2690.35, 'Pressure Point'],
  ['Crocodile Hunter Diaries S02E02 Teamwork.mp4', 2687.38, 'Teamwork'],
  ['Crocodile Hunter Diaries S02E03 Battle Of The Pythons.mp4', 2688.51, 'Battle Of The Pythons'],
  ['Crocodile Hunter Diaries S02E04 To The Rescue.mp4', 2719, 'To The Rescue'],
  ['Crocodile Hunter Diaries S02E05 Dancing With Devils.mp4', 2688.28, 'Dancing With Devils'],
  ['Crocodile Hunter Diaries S02E06 Surgical Marvels.mp4', 2688.77, 'Surgical Marvels'],
  ["Crocodile Hunter Diaries S02E07 Something's Burning.mp4", 2686.32, "Something's Burning"],
  ['Crocodile Hunter Diaries S02E08 Mateship.mp4', 2701.18, 'Mateship'],
  ['Crocodile Hunter Diaries S02E09 Wombats, Kangaroos, Koalas.mp4', 2688.81, 'Wombats, Kangaroos, Koalas'],
  ['Crocodile Hunter Diaries S02E10 Grumpy Gators.mp4', 2700.4, 'Grumpy Gators'],
  ['Crocodile Hunter Diaries S02E11 Aliens In The Outback.mp4', 2687.45, 'Aliens In The Outback'],
  ['Crocodile Hunter Diaries S02E12 Breaking The Record.mp4', 2691.12, 'Breaking The Record'],
  ["Crocodile Hunter Diaries S02E13 Steve's Dream.mp4", 2685.15, "Steve's Dream"],
]);

/**
 * Animal Planet in its first years: off-air tapes, then The Crocodile Hunter,
 * Crocodile Hunter Diaries and Kratts' Creatures taking turns.
 */
export const ANIMAL_PLANET = lineup('old-animal-planet-episodes', {
  tapes: [
    tape('old-animal-planet-episodes', '~.ia.mp4', 7457.14, 'Animal Planet · late 90s tape'),
    tape('the-crocodile-hunter-diaries-xx-xx-200x-animal-planet-eua', '~Crocodile Hunter Diaries', 3604.5, 'Crocodile Hunter Diaries · off-air'),
    ...chapters('vts-01-1_20260211_2356', 'Animal Planet & Fox 45 · 2000 / 2005', [5469.5, 5481.54, 5463.96, 5474.6]),
    tape('animal-planet-30-aug-2004', 'AnimalPlanet-30Aug2004.mp4', 967.17, 'Animal Planet · Aug 30 2004'),
  ],
  shows: [CROC_HUNTER, CROC_DIARIES, KRATTS],
  audience: 'family',
  seed: 22,
  perTape: 4,
});

/** Wild Discovery, the Discovery Channel's nightly nature hour, 1995–99. */
const WILD_DISCOVERY = series('WildDiscoveryCollection', 'Wild Discovery', [
  ['Wild Discovery 1995-09-26 The Sisterhood.mp4', 3357, 'The Sisterhood'],
  ['Wild Discovery 1995-09-29 A Cheetah Family.mp4', 2809.21, 'A Cheetah Family'],
  ['Wild Discovery 1995-10-03 Subtle as a Serpent (BROADCAST).mp4', 2897.16, 'Subtle as a Serpent'],
  ['Wild Discovery 1995-10-04 The Komodo Dragons.mp4', 2926.84, 'The Komodo Dragons'],
  ['Wild Discovery 1995-10-09 Wonderful Kangaroo.mp4', 3134.72, 'Wonderful Kangaroo'],
  ['Wild Discovery 1995-10-16 Giant Otter (BROADCAST).mp4', 2832.56, 'Giant Otter'],
  ['Wild Discovery 1995-10-19 Elephant Seals - Those Magnificent Diving Machines.mp4', 3461.39, 'Elephant Seals - Those Magnificent Diving Machines'],
  ["Wild Discovery 1995-10-27 The Story of America's Great Volcanoes (Broadcast).mp4", 2814.28, "The Story of America's Great Volcanoes"],
  ['Wild Discovery 1995-11-02 The Crawling Kingdom.mp4', 3125.2, 'The Crawling Kingdom'],
  ['Wild Discovery 1995-11-07 The Giant Grizzlies.mp4', 2998.56, 'The Giant Grizzlies'],
  ["Wild Discovery 1995-11-08 Alaska's Whales and Wildlife.mp4", 2883.26, "Alaska's Whales and Wildlife"],
  ['Wild Discovery 1995-11-09 The Great Bears of Alaska.mp4', 2902.24, 'The Great Bears of Alaska'],
  ['Wild Discovery 1995-11-14 Patagonia.mp4', 3347.74, 'Patagonia'],
  ['Wild Discovery 1995-11-21 Season of the Whitetail Buck.mp4', 2690.25, 'Season of the Whitetail Buck'],
  ["Wild Discovery 1995-11-23 America's Wild Horses.mp4", 3303.87, "America's Wild Horses"],
  ['Wild Discovery 1995-11-27 Creatures of the Magic Water.mp4', 3070.42, 'Creatures of the Magic Water'],
  ['Wild Discovery 1995-11-29 Orangutans of the Rain Forest.mp4', 3320.94, 'Orangutans of the Rain Forest'],
  ['Wild Discovery 1995-12-01 Amazonia - A Burning Question.mp4', 3430.78, 'Amazonia - A Burning Question'],
  ['Wild Discovery 1995-12-05 Dining Alone.mp4', 2984.61, 'Dining Alone'],
  ['Wild Discovery 1995-12-06 Dressing for Dinner.mp4', 2897.14, 'Dressing for Dinner'],
  ['Wild Discovery 1995-12-07 Lions of Etosha.mp4', 3093.03, 'Lions of Etosha'],
  ['Wild Discovery 1995-12-08 Tiger, Tiger.mp4', 3119.02, 'Tiger, Tiger'],
  ['Wild Discovery 1995-12-12 The Dangerous Sea.mp4', 2999.55, 'The Dangerous Sea'],
  ['Wild Discovery 1995-12-13 Rulers Of The Deep.mp4', 3000.04, 'Rulers Of The Deep'],
  ['Wild Discovery 1995-12-15 Shark Shooters.mp4', 2884.15, 'Shark Shooters'],
  ['Wild Discovery 1995-12-19 Jurassic Reef.mp4', 2823.56, 'Jurassic Reef'],
  ['Wild Discovery 1995-12-20 Rhino on the Run.mp4', 3436.17, 'Rhino on the Run'],
  ['Wild Discovery 1995-12-26 Gorillas in the Midst of Man.mp4', 2979.43, 'Gorillas in the Midst of Man'],
  ['Wild Discovery 1995-12-27 Two in the Bush (BROADCAST).mp4', 2801.83, 'Two in the Bush'],
  ['Wild Discovery 1995-12-29 The Waterhole (BROADCAST).mp4', 2771.4, 'The Waterhole'],
  ['Wild Discovery 1996-01-02 The Language of Antlers.mp4', 2793.86, 'The Language of Antlers'],
  ['Wild Discovery 1996-01-03 In The Company Of Moose.mp4', 2630.91, 'In The Company Of Moose'],
  ['Wild Discovery 1996-01-08 Crater Lions Of Ngorongoro.mp4', 2725.16, 'Crater Lions Of Ngorongoro'],
  ['Wild Discovery 1996-01-12 The World of the Wily Black Bear.mp4', 2583.23, 'The World of the Wily Black Bear'],
  ['Wild Discovery 1996-01-18 Grand Teton Wilderness.mp4', 3296.78, 'Grand Teton Wilderness'],
  ['Wild Discovery 1996-01-19 Yellowstone in Winter.mp4', 3299.13, 'Yellowstone in Winter'],
  ['Wild Discovery 1996-01-29 Eye Of The Serpent.mp4', 3029.6, 'Eye Of The Serpent'],
  ['Wild Discovery 1996-02-01 Kalahari.mp4', 3420.74, 'Kalahari'],
  ['Wild Discovery 1996-02-02 Saguaro - Sentinel of the Desert.mp4', 3237.12, 'Saguaro - Sentinel of the Desert'],
  ['Wild Discovery 1997-10-28 Polar Bears on the Ice.mp4', 3300.84, 'Polar Bears on the Ice'],
  ['Wild Discovery 1998-02-15 Blue Whales - Giants of the Deep.mp4', 2871.07, 'Blue Whales - Giants of the Deep'],
  ['Wild Discovery 1998-10-25 Vanishing Pools of the Zambezi.mp4', 2898.84, 'Vanishing Pools of the Zambezi'],
  ['Wild Discovery 1998-11-05 Ice Age Survivors.mp4', 3045.4, 'Ice Age Survivors'],
  ['Wild Discovery 1998-11-08 Last Charge of the Rhino.mp4', 2873.07, 'Last Charge of the Rhino'],
  ["Wild Discovery 1998-11-19 Alaska's Arctic Wildlife.mp4", 3127.4, "Alaska's Arctic Wildlife"],
  ['Wild Discovery 1998-11-20 Spirits of the Forest.mp4', 3005.3, 'Spirits of the Forest'],
  ['Wild Discovery 1998-12-15 The Frozen Kingdom (BROADCAST).mp4', 2930.89, 'The Frozen Kingdom'],
  ['Wild Discovery 1999-02-06 Animal Weapons - Armed to the Teeth.mp4', 2643.87, 'Animal Weapons - Armed to the Teeth'],
  ['Wild Discovery 1999-02-13 Animal Weapons - Fatal Encounters.mp4', 2546.53, 'Animal Weapons - Fatal Encounters'],
  ['Wild Discovery 1999-02-20 Animal Weapons - Chemical Warfare.mp4', 2537.18, 'Animal Weapons - Chemical Warfare'],
  ['Wild Discovery 1999-04-19 Wild Asia - Tropical Forest.mp4', 3155.87, 'Wild Asia - Tropical Forest'],
  ['Wild Discovery 1999-04-20 Wild Asia - Island Magic.mp4', 2767.46, 'Wild Asia - Island Magic'],
  ['Wild Discovery 1999-10-02 Swamp Hogs.mp4', 3144.32, 'Swamp Hogs'],
  ['Wild Discovery 1999-12-11 Sea Serpents.mp4', 3124.03, 'Sea Serpents'],
  ['Wild Discovery 1999-12-20 The Great White - In Search of Giants.mp4', 3123.04, 'The Great White - In Search of Giants'],
  ['Wild Discovery 1999-12-27 Wild Asia - Deserts.mp4', 3157.75, 'Wild Asia - Deserts'],
]);


/** The Discovery Channel's Wild Discovery, every night of 1995–99 the uploader kept. */
export const DISCOVERY = lineup('WildDiscoveryCollection', {
  tapes: [tape('WildDiscoveryCollection', 'Promos for Wild Discovery (1995-1999).mp4', 497.16, 'Wild Discovery promos · 1995–99')],
  shows: [WILD_DISCOVERY],
  audience: 'family',
  seed: 23,
  perTape: 0,
});

// ---- Disney ----

/**
 * The Disney Channel and Toon Disney off tape: a winter 1990 day, four long
 * late-90s tapes and two from Toon Disney. Disney ran no commercials, only
 * its own promos, so nothing is cut in.
 */
const DISNEY_1990 = 'Disney_Channel_Winter_1990_Disneyland_Special__Raccoons_Wuzzles__Donald__CareBea';

export const DISNEY = lineup('katie-and-orbie-re-runs', {
  tapes: [
    tape('katie-and-orbie-re-runs', 'disney channel tape 1.mp4', 26290.63, 'The Disney Channel · late 90s tape 1'),
    ...[1, 2, 4, 5].map((n, i) =>
      tape(DISNEY_1990, `~Disc 1/VIDEO_TS/VTS_01_${n}.mp4`, [1515.01, 1565.1, 1575.68, 746.55][i], `The Disney Channel · Winter 1990 · disc 1 part ${i + 1}`),
    ),
    tape('2HourToonDisney', '2 Hour Toon Disney.mp4', 9211.71, 'Toon Disney · early 2000s'),
    tape('katie-and-orbie-re-runs', 'disney channel tape 2.mp4', 21926.57, 'The Disney Channel · late 90s tape 2'),
    ...[1552.92, 1541.37, 1530.66, 1536.17].map((seconds, i) =>
      tape(DISNEY_1990, `~Disc 2/VIDEO_TS/VTS_01_${i + 1}.mp4`, seconds, `The Disney Channel · Winter 1990 · disc 2 part ${i + 1}`),
    ),
    tape('katie-and-orbie-re-runs', 'disney channel tape 3.mp4', 21829.68, 'The Disney Channel · late 90s tape 3'),
    tape('20180918135347', '2018-09-18 13-53-47.mp4', 22132.23, 'Toon Disney · 2004'),
    tape('katie-and-orbie-re-runs', 'pbs + disney channel tape 1.mp4', 21828.97, 'The Disney Channel & PBS · late 90s'),
    tape('katie-and-orbie-re-runs', 'disney channel tape 4.mp4', 21977.26, 'The Disney Channel · late 90s tape 4'),
  ],
  audience: 'kids',
  seed: 24,
});

// ---- ABC TGIF ----

/** Muppets Tonight, both seasons (ABC TGIF, 1996–98). */
const MUPPETS_TONIGHT = series('Muppets-Tonight-1996', 'Muppets Tonight', [
  ['~101 Michelle', 1512, 'Michelle Pfeiffer'],
  ['~102 Martin', 1528.24, 'Martin Short'],
  ['~103 Paula', 1501.74, 'Paula Abdul'],
  ['~104 Billy', 1510.56, 'Billy Crystal and Larry King'],
  ['~105 Garth', 1522.56, 'Garth Brooks'],
  ['~106 John', 1501.92, 'John Goodman'],
  ['~107 Cindy', 1522.08, 'Cindy Crawford'],
  ['~108 Sandra', 1512, 'Sandra Bullock'],
  ['~109 Tony', 1521.6, 'Tony Bennett'],
  ['~110 Whoopi', 1517.2, 'Whoopi Goldberg'],
  ['~111 Heather', 1500.65, 'Heather Locklear'],
  ['~112 Jason', 1520.64, 'Jason Alexander'],
  ['~113 Pierce', 1519.79, 'Pierce Brosnan'],
  ['~201 Cameo', 1520.93, 'The Cameo Show'],
  ['~202 Coolio', 1507.9, 'Coolio & Don Rickles'],
  ['~203 Dennis', 1507.93, 'Dennis Quaid and Gilbert Gottfried'],
  ['~204 Andie', 1507.81, 'Andie MacDowell, Captain Kangaroo, Ben Stein'],
  ['~205 Gary', 1488.02, 'Penn & Teller'],
  ['~206 Prince', 1503.5, 'Prince'],
  ['~207 Rick', 1516.02, 'Rick Moranis'],
  ['~208 Johnny', 1504.25, 'Johnny Fiama Leaves Home'],
  ['~209 Best', 1501.87, 'Best of Muppets Tonight'],
]);

/** Teen Angel, all 17 (ABC TGIF, 1997–98). */
const TEEN_ANGEL = series('teen-angel-1997-1998', 'Teen Angel', [
  ['~01 Marty', 1248.03, 'Marty Buys the Farm'],
  ['~02 Date', 1306.12, 'Date with an Angel'],
  ['~03 Sings', 1190.46, 'Sings Like an Angel'],
  ['~04 Honest', 1280.47, 'Honest Abe and Popular Steve'],
  ['~05 Wrestling', 1279.88, 'Wrestling with an Angel'],
  ['~06 I Love', 1297.97, 'I Love Nitzke'],
  ['~07 One Dog', 1324.26, 'One Dog Night'],
  ['~08 Jeremiah', 1226.5, 'Jeremiah Was a Bullfrog'],
  ['~09 Feather', 1299.17, "Feather's Day"],
  ['~10 The Play', 1279.86, "The Play's the Thing"],
  ['~11 Living', 1324.1, 'Living Doll'],
  ['~12 Steve', 1244.85, 'Steve & Marty & Jordan & Uncle Lou'],
  ['~13 Grumpy', 1312.05, 'Grumpy Young Men'],
  ['~14 Who', 1289.2, "Who's the Boss"],
  ['~15 Look', 1279.17, 'Look Ma, No Face'],
  ['~16 The Un', 1279.08, 'The Un-Natural'],
  ['~17 Back', 1185.19, 'Back to Depolo'],
]);

/** You Wish, all 13 (ABC TGIF, 1997–98). */
const YOU_WISH = series('you-wish-1997-1998', 'You Wish', [
  ['~01 Pilot', 1242.28, 'Pilot'],
  ['~02  Jillions', 1238.54, 'Jillions of Gillians'],
  ['~03 The Bad', 1275.43, 'The Bad Influence'],
  ['~04 A Real', 1265.23, 'A Real Don Juan'],
  ['~05 The Big', 1271.11, 'The Big Ride'],
  ['~06 Mind', 1144.44, 'Mind Games'],
  ['~07 Halloween', 1302.77, 'Halloween'],
  ['~08 Genie', 1300.74, 'Genie Without a Cause'],
  ['~09 Future', 1280.98, 'Future Shock'],
  ['~10 Welcome', 1280.02, 'Welcome to the Dollhouse'],
  ['~11 All In', 1279.58, 'All in the Family Room'],
  ['~12 Bride', 1264.5, 'Bride and Prejudice'],
  ['~13 Gift', 1246.85, 'Gift of the Travi'],
]);

/** Aliens in the Family, all 8 (ABC TGIF, 1996). */
const ALIENS_IN_THE_FAMILY = series('Aliens-in-the-Family', 'Aliens in the Family', [
  ['~01 Meet', 1339.21, 'Meet the Brodys'],
  ['~02 Bobut', 1339.01, 'Bobut Conquers All'],
  ['~03 Cookie', 1337.15, 'Cookie Makes Some Dough'],
  ['~04 You Don', 1285.32, "You Don't Have a Pet to Be Popular"],
  ['~05 Too Good', 1348.55, 'Too Good to Be True'],
  ['~06 Respect', 1339.07, 'Respect Your Elders'],
  ['~07  Dissected', 1334.13, 'Dissected and Neglected'],
  ['~08 A Very', 1343.31, 'A Very Brody Tweeznax'],
]);


/** ABC's Friday night TGIF, off tape, with the TGIF shows the uploaders kept whole. */
export const TGIF = lineup('TGIF_ABC_WOC_1997-05-09', {
  tapes: [
    ...[1622.86, 1716.42, 1758.52, 1731.5].map((seconds, i) =>
      tape('TGIF_-_Boy_Meets_World_-_Step_by_Step_-_December_1993', `~VTS_0${i + 1}_1.mp4`, seconds, `TGIF · December 1993 · part ${i + 1}`),
    ),
    tape('TGIF_ABC_WOC_1997-05-09', 'TGIF_ABC_WOC_1997-05-09.mp4', 7824.05, 'TGIF · May 9, 1997'),
    tape('1997-11-07-the-tgif-time-warp', '1997-11-07 The TGIF Time Warp.mp4', 7075.15, 'TGIF Time Warp · November 7, 1997'),
    tape('TGIF_ABC_WOC_1998-12-11', '~.mp4', 8660.49, 'TGIF · December 11, 1998'),
  ],
  shows: [MUPPETS_TONIGHT, TEEN_ANGEL, YOU_WISH, ALIENS_IN_THE_FAMILY],
  audience: 'family',
  seed: 25,
});

// ---- CBS ----

/** Old CBS prime time and specials off tape, with the ads as they aired. */
export const CBS = lineup('CBS_Thursday_Block_WOC_2001-03-29', {
  tapes: [
    tape('CBS_Thursday_Block_WOC_2001-03-29', 'CBS_Thursday_Block_WOC_2001-03-29.mp4', 11100.03, 'CBS Thursday · Survivor, CSI · March 29, 2001'),
    tape('Mysteries_Of_Ancient_World_CBS_WOC_1994-04-28', 'Mysteries_Of_Ancient_World_CBS_WOC_1994-04-28.mp4', 7144.07, 'Mysteries of the Ancient World · CBS 1994'),
    tape('the-outer-limits-s01e13-cbs-kyw3-woc-1995-10', 'the-outer-limits-s01e13-cbs-kyw3-woc-1995-10.mp4', 3582.48, 'The Outer Limits · CBS late night 1995'),
    tape('Grumpy_Old_Men_CBS_WOC_1997-05-15', 'Grumpy_Old_Men_CBS_WOC_1997-05-15.mp4', 7102.04, 'CBS Thursday Movie · Grumpy Old Men · 1997'),
    tape('blank-vhs-tape-5', '~.ia.mp4', 21856.7, 'Survivor: Borneo · episodes 1–6 · summer 2000'),
    tape('Survivor_CBS_WOC_2001-02-22', 'Survivor_CBS_WOC_2001-02-22.mp4', 4105.04, 'Survivor: The Australian Outback · February 2001'),
    tape('2025-08-24-08-38-23-1', '~.ia.mp4', 29533.2, 'CBS · November 26, 2000'),
  ],
  audience: 'adult',
  seed: 26,
});

// ---- VH1 ----

/** VH1 in the 90s off tape: Pop-Up Video, Behind the Music, I Love the '90s, Divas Live and whole nights. */
export const VH1 = lineup('VH1ILoveThe90s', {
  tapes: [
    tape('VH1ILoveThe90s', 'VH1 - I Love the 90s (96-99) WOC.mp4', 11895.16, "VH1 · I Love the '90s · 1996–99"),
    tape('pop-up-video-episode-10', 'Pop-Up Video Episode 10.ia.mp4', 1353.79, 'Pop-Up Video · episode 10'),
    tape('2022.1.1-vh-1-1991-flix', '2022.1.1-VH1_1991-FLIX.mp4', 1828, 'VH1 · FLIX · 1991'),
    tape('2022.1.1-vh-1-1991-flix', '2022.1.2-VH1_1991-The Soul of VH1 - Cover Songs.mp4', 3719, 'The Soul of VH1 · Cover Songs · 1991'),
    tape('TheVistaGroup-TVBroadcastFleetwoodMacBehindtheMusicVH1_1997', '~Fleetwood Mac', 2678, 'Behind the Music · Fleetwood Mac · 1997'),
    tape('20250408_20250408_2141', '~8-Track Flashback', 7373.87, 'VH1 · 8-Track Flashback, Archives, Classic Albums · May 1997'),
    tape('pop-up-video-elton-john', 'Pop-Up Video Elton John.ia.mp4', 1324, 'Pop-Up Video · Elton John special'),
    tape('1997-06-19-vh-1-hollywood-vinyl-batman-lost-world-lost-videos-disney-videos', '~Hollywood & Vinyl', 5937, 'VH1 · Hollywood & Vinyl · June 19, 1997'),
    tape('behind-the-music-styx', 'Behind the Music - Styx.mp4', 2605, 'Behind the Music · Styx'),
    tape('vh1-divas-live', 'Analog 20220902 1004-A-A.mp4', 4803.37, 'VH1 Divas Live · 1998'),
    tape('pop-up-video-cold-war-80s', "Pop-Up Video Cold War 80's.ia.mp4", 1323, "Pop-Up Video · Cold War '80s"),
    tape('random-vh-1-and-a-ray-charles-concert-1999', 'Random VH1 and a Ray Charles concert, 1999.ia.mp4', 5383, 'VH1 · 1999, with a Ray Charles concert'),
  ],
  audience: 'teen',
  seed: 28,
});

// ---- UPN ----

/** A UPN WOC tape: the uploaders name the file after the item. */
const upn = (id: string, seconds: number, title: string) => tape(id, `${id}.mp4`, seconds, title);

/** UPN off tape: Conan, Paranormal Borderline, Moesha, Buffy's sixth season and a Halloween night. */
export const UPN = lineup('upn-woc', {
  tapes: [
    upn('The_Paranormal_Borderline_UPN_WOC_1996-03-19', 3598, 'The Paranormal Borderline · UPN · March 19, 1996'),
    upn('Conan_The_Adventurer_S01E12_UPN_WOC_1998-01', 3752, 'Conan the Adventurer · UPN · January 1998'),
    upn('Buffy_S06E04_UPN_WOC_2001-10-16', 3430.06, 'Buffy the Vampire Slayer · "Flooded" · UPN · October 16, 2001'),
    tape('upn-woc', 'UPN WOC.ia.mp4', 7360.73, 'UPN Halloween night'),
    upn('Conan_The_Adventurer_S01E15_UPN_WOC_1998-02', 3452, 'Conan the Adventurer · UPN · February 1998'),
    upn('Buffy_S06E05_UPN_WOC_2001-10-23', 3827.42, 'Buffy the Vampire Slayer · "Life Serial" · UPN · October 23, 2001'),
    tape('moesha-s-05e-12-woc', 'Moesha - s05e12 - WOC.mp4', 1961, 'Moesha · "He Doth Protest Too Much" · UPN'),
    upn('Buffy_S06E06_UPN_WOC_2001-10-30', 3738.87, 'Buffy the Vampire Slayer · "All the Way" · UPN · October 30, 2001'),
    upn('Conan_The_Adventurer_S01E20_UPN_WOC_1998-05', 3773, 'Conan the Adventurer · UPN · May 1998'),
    upn('Buffy_S06E07_UPN_WOC_2001-11-06', 4161, 'Buffy the Vampire Slayer · "Once More, with Feeling" · UPN · November 6, 2001'),
    upn('Buffy_S06E08_UPN_WOC_2001-11-13', 3758, 'Buffy the Vampire Slayer · "Tabula Rasa" · UPN · November 13, 2001'),
  ],
  audience: 'teen',
  seed: 27,
});

// ---- Comedy Central ----

/** Comedy Central off tape: MST3K, Dr. Katz, South Park's first season, Win Ben Stein's Money, BattleBots. */
export const COMEDY_CENTRAL = lineup('Dr_Katz_Comedy_Central_WOC_1997-10', {
  tapes: [
    tape('423-1-23-93', '423 1-23-93.mp4', 7861.25, 'Mystery Science Theater 3000 · Bride of the Monster · January 1993'),
    tape('Dr_Katz_Comedy_Central_WOC_1997-10', 'Dr_Katz_Comedy_Central_WOC_1997-10.mp4', 2408, 'Dr. Katz, Professional Therapist · October 1997'),
    tape('stuffandthenSOUTHPARKYAYYY', 'stuffandthenSOUTHPARKYAYYY.mp4', 19914, 'Discovery, Cinemax & Comedy Central · South Park · 1997'),
    tape('win-ben-steins-money-march-1999-with-ads', "Win Ben Stein's Money - March 1999 with ads.mp4", 1846, "Win Ben Stein's Money · March 30, 1999"),
    tape('615-3-14-96', '615 3-14-96.mp4', 7279, 'Mystery Science Theater 3000 · Kitten with a Whip · March 1996'),
    tape('uncommon-ephemera-vhs-V1910-1', 'V1910-1.mp4', 1992.97, 'Comedy Central breaks from South Park season 1 · 1997–98'),
    tape('the-n.-y.-friars-club-roast-of-jerry-stiller-october-27th-1999-woc', '~.ia.mp4', 3596, 'The Friars Club Roast of Jerry Stiller · October 1999'),
    tape('battlebotstape1', 'battle bots tape 1.mp4', 3563.38, 'BattleBots · Comedy Central · 2001'),
  ],
  audience: 'adult',
  seed: 29,
});

// ---- Wrestling ----

/** A Monday Nitro night: the uploader names each file by its date. */
const nitro = (id: string, date: string, seconds: number) => tape(id, `${date.toUpperCase()}.mp4`, seconds, `WCW Monday Nitro · ${date}`);

/**
 * WWF pay-per-views and Saturday Night's Main Event, against WCW Monday Nitro
 * from the end of the Monday Night War, all off tape.
 */
export const WRESTLING = lineup('nov.-09-1997', {
  tapes: [
    tape('nov.-09-1997', 'NOV. 09, 1997.mp4', 9775.7, 'WWF Survivor Series · November 9, 1997'),
    nitro('nov.-1999', 'Nov. 01, 1999', 8260),
    tape('1987-wwf-saturday-night-main-event-10-w.-o.-c-720p', '~.ia.mp4', 5200, "WWF Saturday Night's Main Event · 1987"),
    nitro('nov.-1999', 'Nov. 08, 1999', 7999),
    tape('oct.-05-1997', 'OCT. 05, 1997.mp4', 10158, 'WWF Badd Blood: In Your House · October 5, 1997'),
    nitro('nov.-1999', 'Nov. 15, 1999', 8213),
    tape('wwf-wrestlemanias-greatest-matches-1994-vhs', '20240816_024519.ia.mp4', 3522, "WWF WrestleMania's Greatest Matches · 1994 tape"),
    nitro('nov.-1999', 'Nov. 22, 1999', 8300),
    tape('dec.-07-1997', 'DEC. 07, 1997.mp4', 9930, 'WWF D-Generation X: In Your House · December 7, 1997'),
    nitro('nov.-1999', 'Nov. 29, 1999', 8374),
    nitro('dec.-1999', 'Dec. 06, 1999', 8145),
    tape('may-31-1998', 'MAY 31, 1998.mp4', 10044, 'WWF Over the Edge: In Your House · May 31, 1998'),
    nitro('dec.-1999', 'Dec. 13, 1999', 8121),
    nitro('dec.-1999', 'Dec. 20, 1999', 8604),
    nitro('dec.-1999', 'Dec. 27, 1999', 6889),
  ],
  audience: 'teen',
  seed: 30,
});

// ---- NBC ----

/** NBC's Must See TV years off tape: Seinfeld, Mad About You, Fresh Prince, SNL. */
export const NBC = lineup('nbc-primetime-with-seinfeld-finale', {
  tapes: [
    tape('nbc-mtv-mad-about-you-seinfeld-the-real-world-fleetwood-mac-documentary-seinfeld-october-1994', '~Mad About You', 18844, 'NBC & MTV · Mad About You, Seinfeld, The Real World · October 1994'),
    tape('acc-holl-1998-05-14', 'AccHoll-1998-05-14.mp4', 1746, 'Access Hollywood · May 14, 1998'),
    tape('nbc-fresh-prince-of-bel-aire-blossom-nbc-mini-series-a-women-of-independent-mean', '~Fresh Prince', 21569, 'NBC · The Fresh Prince of Bel-Air, Blossom · February 1995'),
    tape('union-square-1997-98', '~01 Union Square', 1677.32, 'Union Square · "Hasta la Muerta, Baby" · September 25, 1997'),
    tape('20250714_20250714_0226', '~Saturday Night Live', 14857, 'Saturday Night Live · Joe Pesci & Spin Doctors · October 10, 1992'),
    tape('union-square-1997-98', '~09_Union Square', 1645.62, 'Union Square · "No Sex \'Til After Homework"'),
    tape('nbc-primetime-with-seinfeld-finale', 'NBC Primetime with Seinfeld Finale.ia.mp4', 22160, 'NBC prime time · the Seinfeld finale · May 14, 1998'),
    tape('20YearsOfMustSeeTV', '20 Years of Must See TV.mp4', 5367.93, '20 Years of Must See TV · 2002'),
  ],
  audience: 'adult',
  seed: 31,
});

// ---- Fox ----

/** Fox prime time off tape: In Living Color, 90210, Married… with Children, The Simpsons, MADtv, The X-Files. */
export const FOX = lineup('fox-march-2000', {
  tapes: [
    tape('vhs-fb-market-box-1-tape-38-in-living-color-broadcast-premiere-april-15-1990-wit', '~In Living Color', 8111, 'In Living Color · series premiere · April 15, 1990'),
    tape('90210-marathon-1992', '~.ia.mp4', 7265, 'Beverly Hills, 90210 · back to back · August 26, 1992'),
    tape('simpsons-halloween-specials-fox-no-woc-1993-10', 'simpsons-halloween-specials-fox-no-woc-1993-10.mp4', 5280, 'The Simpsons · Treehouse of Horror · October 1993'),
    tape('fox-4-10-94', 'Fox 4-10-94.mp4', 1715.6, 'Married… with Children · April 10, 1994'),
    ...[5452, 5466, 6668, 5282].map((seconds, i) => tape('vts-01-1_202603', `VTS_01_${i + 1}.mp4`, seconds, `Fox prime time · October 1994 · part ${i + 1}`)),
    tape('fox-december-16th-1995-madtv-s-01e-9-episode-premiere-woc-te-nos', '~.ia.mp4', 3545, 'MADtv · season 1 · December 16, 1995'),
    tape('fox-01-15-1997-tape3pt2yr2026', 'fox-01-15-1997-tape3pt2yr2026.mp4', 7194, 'Beverly Hills, 90210 & Party of Five · January 15, 1997'),
    tape('10-25-to-11-20-1997-mst-3-k-x-files-mst-3-k-seinfeld-mst-3-k-te-nos', '~.ia.mp4', 22234, 'The X-Files, MST3K & Seinfeld · fall 1997'),
    tape('madtv-s-4-e-23-woc-kbca-august-28-1999', '~.ia.mp4', 3605, 'MADtv · August 28, 1999'),
    tape('fox-march-2000', 'fox march 2000.mp4', 22044, 'Fox prime time · March 2000'),
  ],
  audience: 'adult',
  seed: 32,
});

// ---- Nick at Nite ----

/**
 * Nick at Nite's 1998 "Norman Lear Picks" All in the Family marathon, every
 * episode with the ads it aired with: [number, seconds, title].
 */
const AITF_1998: [string, number, string][] = [
  ['01 1971', 1830.76, 'Meet the Bunkers'],
  ['02 1971', 1845.59, 'Oh, My Aching Back'],
  ['03 1971', 1801.26, 'Lionel Moves into the Neighborhood'],
  ['04 1971', 1832.62, 'Archie Gives Blood'],
  ['05 1971', 1789.44, "Mike's Problem"],
  ['06 1971', 1816.75, 'The First and Last Supper'],
  ['07 1971', 1848.04, 'Gloria Has a Belly Full'],
  ['08 1971', 1681.71, 'Judging Books by Covers'],
  ['09 1971', 1819.03, "Edith's Accident"],
  ['10 1971', 1694.57, 'Mike Meets Archie'],
  ['11 1972', 1805.48, "Sammy's Visit"],
  ['12 1971', 1422.53, 'The Saga of Cousin Oscar'],
  ['13 1971', 1779.65, 'Cousin Maude Comes to Visit'],
  ['14 1972', 1773.78, 'The Elevator Story'],
  ['15 1972', 1789.18, 'Archie and the Editorial'],
  ['16 1973', 1696.04, 'Archie Is Branded'],
  ['17 1972', 1757.8, 'Edith Flips Her Wig'],
  ['18 1971', 1859.99, 'Edith Writes a Song'],
  ['19 1972', 1834.73, "Edith's Problem"],
  ['20 1972', 1797.99, 'The Bunkers and the Swingers'],
  ['21 1973', 1789.12, "We're Having a Heat Wave"],
  ['22 1973', 1790.06, "We're Still Having a Heat Wave"],
  ['23 1973', 1832, 'Battle of the Month'],
  ['24 1973', 1692.48, 'Edith Finds an Old Man'],
  ['25 1975', 1851.67, 'The Very Moving Day'],
];
const AITF_ID = '1998-all-in-the-family-nick-at-nite-norman-lear-picks-marathon-5-nights-woc_202506';

/** Nick at Nite and TV Land off tape: the classic sitcoms with their 90s promos and ads. */
export const NICK_AT_NITE = lineup('nick-at-nite-1994_202601', {
  tapes: [
    tape('nick-at-nite-1994_202601', 'Nick At Nite 1994.mp4', 1630, 'Nick at Nite · 1994'),
    ...AITF_1998.slice(0, 5).map(([n, seconds, title]) => tape(AITF_ID, `~WOC/${n}`, seconds, `All in the Family · "${title}" · Nick at Nite 1998`)),
    ...[5435.4, 5464.56, 5476.34, 5599.33].map((seconds, i) => tape('vts-01-1_20260307', `VTS_01_${i + 1}.mp4`, seconds, `Fox 11, Nick at Nite & HBO · fall 1992 · part ${i + 1}`)),
    ...AITF_1998.slice(5, 15).map(([n, seconds, title]) => tape(AITF_ID, `~WOC/${n}`, seconds, `All in the Family · "${title}" · Nick at Nite 1998`)),
    tape('vb-tape-0043-commercials-and-promos-during-i-love-lucy-on-nick-at-nite', '~I Love Lucy', 4824, 'Nick at Nite · the breaks from I Love Lucy'),
    tape('adam-12_202507', 'ADAM-12.mp4', 6702, 'Adam-12 · two hours'),
    ...AITF_1998.slice(15).map(([n, seconds, title]) => tape(AITF_ID, `~WOC/${n}`, seconds, `All in the Family · "${title}" · Nick at Nite 1998`)),
    tape('alfred-hitchcock-any-griffith-man-from-uncle-get-smart-x-2-mr.-and-mrs.-notyh-the-persuaders', '~Alfred Hitchcock', 20836, 'Hitchcock, Andy Griffith, U.N.C.L.E., Get Smart'),
    tape('allinthe-family-special-at-end', 'AllintheFamily special at end.mp4', 18785, 'All in the Family · five hours'),
  ],
  audience: 'family',
  seed: 33,
});

/** A tape whose one file is named after its item, the way most WOC uploads are. */
const woc = (id: string, seconds: number, title: string) => tape(id, `${id}.mp4`, seconds, title);

// ---- Sci-Fi Channel ----

/** The Sci-Fi Channel off tape: Star Trek at 7:30, MST3K's Sci-Fi years, Godzilla and late-night movies. */
export const SCI_FI = lineup('Star_Trek_Sci-Fi_Channel_WOC_1998-11-02_0730PM', {
  tapes: [
    woc('Star_Trek_Sci-Fi_Channel_WOC_1998-11-02_0730PM', 5280, 'Star Trek · Sci-Fi Channel · November 2, 1998'),
    woc('Suspiria_Sci-Fi_Channel_WOC_1995-09-02', 7233, 'Suspiria · Sci-Fi Channel · September 2, 1995'),
    woc('Star_Trek_Sci-Fi_Channel_WOC_1998-11-13_0730PM', 5379, 'Star Trek · Sci-Fi Channel · November 13, 1998'),
    tape('godzilla-on-monster-island-godzilla-vs-hedorah-destroy-all-monsters-on-sci-fi-1996', '~.ia.mp4', 17499, 'Godzilla night · Sci-Fi Channel · 1996'),
    woc('Star_Trek_Sci-Fi_Channel_WOC_1998-11-18_0730PM', 5343, 'Star Trek · Sci-Fi Channel · November 18, 1998'),
    woc('MST3K_The_She_Creature_Sci-Fi_Channel_WOC_1998-09-12-11pm', 6930, 'Mystery Science Theater 3000 · The She-Creature · September 1998'),
    woc('Time_Runner_Sci-Fi_Channel_WOC_1996-04-06', 6849, 'Time Runner · Sci-Fi Channel · April 6, 1996'),
    woc('Star_Trek_Sci-Fi_Channel_WOC_1998-11-25_0730PM', 5293, 'Star Trek · Sci-Fi Channel · November 25, 1998'),
    woc('Official_Denial_Sci-Fi_Channel_WOC_1995-09-16', 6900, 'Official Denial · Sci-Fi Channel · September 16, 1995'),
  ],
  audience: 'teen',
  seed: 34,
});

// ---- TBS & TNT ----

/** Turner's two superstations off tape: TNT Toons, MonsterVision, WCW, Little House, Babylon 5, Captain Planet. */
export const TURNER = lineup('tnt-toons-1993-woc', {
  tapes: [
    tape('tnt-toons-1993-woc', '~TNT Toons', 6078.65, 'TNT Toons · Hanna-Barbera · September 26, 1993'),
    tape('tbs-captain-planet-lpga-sega-womens-golf-april-1992', '~Captain Planet', 3782.78, 'TBS · Captain Planet · April 1992'),
    tape('tnt-monstervionvision-june-12-1993-penn-and-teller-the-best-of-the-outer-limits-', '~Monstervionvision', 15425, 'TNT MonsterVision · The Outer Limits · June 12, 1993'),
    ...[5218.11, 5243.64].map((seconds, i) => tape('1998_tbs_lhotp_marathon', `~VTS_01_${i + 1}.mp4`, seconds, `TBS · Little House on the Prairie marathon · 1998 · part ${i + 1}`)),
    tape('wcw-all-nighter-1994', 'WCW ALL NIGHTER 1994.mp4', 18162, 'TBS · WCW All Nighter · 1994'),
    woc('Mazes_And_Monsters_TBS_WOC_1995-02-11', 7226, 'TBS · Mazes and Monsters · February 11, 1995'),
    ...[5236.5, 5240.9, 977.51].map((seconds, i) => tape('1998_tbs_lhotp_marathon', `~VTS_01_${i + 3}.mp4`, seconds, `TBS · Little House on the Prairie marathon · 1998 · part ${i + 3}`)),
    woc('Babylon_5_S05E18_TNT_WOC_1998-10-28', 3792.32, 'Babylon 5 · TNT · October 28, 1998'),
    woc('Werewolves_On_Wheels_TNT_WOC_1995-08-19', 6077, 'TNT MonsterVision · Werewolves on Wheels · August 1995'),
  ],
  audience: 'family',
  seed: 35,
});

// ---- Boomerang ----

/** Boomerang, Cartoon Network's classic-cartoon block and then its own channel, plus a 1994 Scooby-Doo marathon. */
export const BOOMERANG = lineup('cartoon-network-boomerang-block-1965-january-20th-2001-woc', {
  tapes: [
    tape('cartoon-network-boomerang-block-1965-january-20th-2001-woc', '~Boomerang Block 1965', 7428, 'Cartoon Network · Boomerang 1965 · January 20, 2001'),
    tape('pixie-dixie-boomerang-recording-may-june-2000', '~.ia.mp4', 1274, 'Boomerang · Pixie & Dixie · 2000'),
    tape('cartoon-network-october-november-1994-woc', 'cartoonnetwork_scoobydoomarathon1994.mp4', 19520.83, 'Cartoon Network · Scooby-Doo marathon · fall 1994'),
    tape('top-cat-boomerang-recording-may-june-2000', '~.ia.mp4', 1374, 'Boomerang · Top Cat · 2000'),
    tape('cartoon-network-boomerang-marathon-april-1-2000-woc', '~.ia.mp4', 11832, 'Cartoon Network · Boomerang marathon & Super Chunk · April 1, 2000'),
    tape('boomerang-august-18-2002-woc', '~.ia.mp4', 9560.37, 'Boomerang · August 18, 2002'),
  ],
  audience: 'kids',
  seed: 36,
});
