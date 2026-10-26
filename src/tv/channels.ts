import { SNICK_DURATIONS, SNICK_EPISODES, epKey, snickShowAt, type SnickEpisode } from './snick';
import { TV247_ON } from './tv247';
import { CCF_2000, CN_TAPES, FOX_KIDS, KIDS_WB_2001, NICK_CN_2003, blockOnAir, segmentAt, showTitleAt, type ArchiveBlock } from './lineups/archiveBlocks';
import { ARTHUR } from './lineups/arthur';
import { MTV_CHANNEL, PICK_CHANNEL, YT_CHANNELS, ytOnAir, ytShowAt, type YtChannel } from './lineups/youtube247';

/**
 * The cable lineup. Channel 2 is SNICK, running the archived Saturday nights
 * back to back. Every other channel is one Golden Age cartoon from the
 * Internet Archive — the same public-domain shorts Cartoon Vault
 * (cartoon-vault.com) streams — so each title gets its own number in the guide.
 * Item ids were read from archive.org's search API; files resolve at tune-in.
 */

export interface Cartoon {
  id: string;
  title: string;
  year: number;
  studio: string;
}

export const CARTOONS: Cartoon[] = [
  { id: 'popeye_patriotic_popeye', title: 'Patriotic Popeye', year: 1957, studio: 'Famous Studios' },
  { id: 'popeye_private_eye_popeye', title: 'Private Eye Popeye', year: 1954, studio: 'Famous Studios' },
  { id: 'popeye_shuteye_popeye', title: 'Shuteye Popeye', year: 1952, studio: 'Famous Studios' },
  { id: 'popeye_i_dont_scare', title: "Popeye: I Don't Scare", year: 1956, studio: 'Famous Studios' },
  { id: 'popeye_taxi-turvey', title: 'Popeye: Taxi-Turvy', year: 1954, studio: 'Famous Studios' },
  { id: 'popeye_fright_to_the_finish', title: 'Popeye: Fright to the Finish', year: 1954, studio: 'Famous Studios' },
  { id: 'popeye_the_sailor_ancient_fantasy', title: 'Popeye: Ancient Fistory', year: 1953, studio: 'Famous Studios' },
  { id: 'popeye_big_bad_sinbad', title: 'Popeye: Big Bad Sinbad', year: 1952, studio: 'Famous Studios' },
  { id: 'superman_the_mechanical_monsters', title: 'Superman: The Mechanical Monsters', year: 1941, studio: 'Fleischer Studios' },
  { id: 'superman_the_mad_scientist', title: 'Superman: The Mad Scientist', year: 1941, studio: 'Fleischer Studios' },
  { id: 'superman_electric_earthquake', title: 'Superman: Electric Earthquake', year: 1942, studio: 'Fleischer Studios' },
  { id: 'superman_eleventh_hour', title: 'Superman: Eleventh Hour', year: 1942, studio: 'Fleischer Studios' },
  { id: 'bb_snow_white', title: 'Betty Boop: Snow White', year: 1933, studio: 'Fleischer Studios' },
  { id: 'bb_minnie_the_moocher', title: 'Betty Boop: Minnie the Moocher', year: 1932, studio: 'Fleischer Studios' },
  { id: 'Betty_Boop_for_President_1932', title: 'Betty Boop for President', year: 1932, studio: 'Fleischer Studios' },
  { id: 'bb_and_grampy', title: 'Betty Boop and Grampy', year: 1935, studio: 'Fleischer Studios' },
  { id: 'bb_be_human', title: 'Betty Boop: Be Human', year: 1936, studio: 'Fleischer Studios' },
  { id: 'bb_big_boss', title: "Betty Boop's Big Boss", year: 1933, studio: 'Fleischer Studios' },
  { id: 'bb_swat_the_fly', title: 'Betty Boop: Swat the Fly', year: 1935, studio: 'Fleischer Studios' },
  { id: 'bb_poor_cinderella', title: 'Betty Boop: Poor Cinderella', year: 1934, studio: 'Fleischer Studios' },
  { id: 'Betty_Boop_Training_Pigeons_1936', title: 'Betty Boop: Training Pigeons', year: 1936, studio: 'Fleischer Studios' },
  { id: 'Betty_Boop_and_Little_Jimmy_1936', title: 'Betty Boop and Little Jimmy', year: 1936, studio: 'Fleischer Studios' },
  { id: 'SteamboatWillie', title: 'Steamboat Willie', year: 1928, studio: 'Disney' },
  { id: 'OswaldTheLuckyRabbitInOhTeacher', title: 'Oswald the Lucky Rabbit: Oh Teacher', year: 1927, studio: 'Disney' },
  { id: 'ACornyConcerto1943BugsBunny', title: 'Bugs Bunny: A Corny Concerto', year: 1943, studio: 'Leon Schlesinger' },
  { id: 'AintNatureGrand1930', title: "Bosko: Ain't Nature Grand", year: 1930, studio: 'Looney Tunes' },
  { id: 'mighty_mouse_wolf_wolf', title: 'Mighty Mouse: Wolf! Wolf!', year: 1944, studio: 'Terrytoons' },
  { id: 'woody_woodpecker_pantry_panic', title: 'Woody Woodpecker: Pantry Panic', year: 1941, studio: 'Walter Lantz' },
  { id: 'noveltoon_casper_tfg_theres_good_boos_tonight', title: "Casper: There's Good Boos Tonight", year: 1948, studio: 'Famous Studios' },
  { id: 'FLIP_FROG-FIDDLESTICKS', title: 'Flip the Frog: Fiddlesticks', year: 1930, studio: 'Ub Iwerks' },
  { id: 'FlipTheFrog-SodaSquirt1933', title: 'Flip the Frog: Soda Squirt', year: 1933, studio: 'Ub Iwerks' },
  { id: 'felix_the_cat_the_goos_that_laid_the_golden_egg', title: 'Felix the Cat: The Goose That Laid the Golden Egg', year: 1936, studio: 'Van Beuren' },
  { id: 'Felix_BoldKingCole', title: 'Felix the Cat: Bold King Cole', year: 1936, studio: 'Van Beuren' },
  { id: 'Felix_NeptuneNonsense', title: 'Felix the Cat: Neptune Nonsense', year: 1936, studio: 'Van Beuren' },
  { id: 'FelixTheCat-FelineFollies1919', title: 'Felix the Cat: Feline Follies', year: 1919, studio: 'Pat Sullivan' },
  { id: 'FelixTheCat-FelixRevolts1923', title: 'Felix the Cat: Felix Revolts', year: 1923, studio: 'Pat Sullivan' },
  { id: 'FelixTheCat-TheStoneAge1922', title: 'Felix the Cat: The Stone Age', year: 1922, studio: 'Pat Sullivan' },
  { id: 'FelixTheCat-FelixSavesTheDay1922', title: 'Felix the Cat: Felix Saves the Day', year: 1922, studio: 'Pat Sullivan' },
  { id: 'the_big_bad_wolf', title: 'The Big Bad Wolf', year: 1934, studio: 'Disney' },
  { id: 'the_cobweb_hotel', title: 'The Cobweb Hotel', year: 1936, studio: 'Fleischer Studios' },
  { id: 'hectors_hectic_life', title: "Hector's Hectic Life", year: 1948, studio: 'Famous Studios' },
  { id: 'JackFrost_', title: 'Jack Frost', year: 1934, studio: 'Ub Iwerks' },
  { id: 'LittleBoyBlue', title: 'Little Boy Blue', year: 1936, studio: 'Ub Iwerks' },
  { id: 'OldMotherHubbardiwerks', title: 'Old Mother Hubbard', year: 1935, studio: 'Ub Iwerks' },
  { id: 'TheLittleStranger1936', title: 'The Little Stranger', year: 1936, studio: 'Fleischer Studios' },
  { id: 'LittleLambkins-1940', title: 'Little Lambkins', year: 1940, studio: 'Fleischer Studios' },
  { id: 'SomewhereInDreamland_24', title: 'Somewhere in Dreamland', year: 1936, studio: 'Fleischer Studios' },
  { id: 'hawaiianbirds1936', title: 'Hawaiian Birds', year: 1936, studio: 'Fleischer Studios' },
  { id: 'greedy-humpty-dumpty-1936', title: 'Greedy Humpty Dumpty', year: 1936, studio: 'Fleischer Studios' },
  { id: 'Little_Lulu_Cad_And_Caddy_1947', title: 'Little Lulu: Cad and Caddy', year: 1947, studio: 'Famous Studios' },
  { id: '1948ScreenSongBaseBrawl', title: 'Base Brawl', year: 1948, studio: 'Famous Studios' },
  { id: 'gabby_alls_well', title: "Gabby: All's Well", year: 1941, studio: 'Fleischer Studios' },
  { id: 'mother_goose_little_miss_muffet', title: 'Mother Goose: Little Miss Muffet', year: 1938, studio: 'Fleischer Studios' },
  { id: 'noveltoon_naughty_but_nice', title: 'Noveltoon: Naughty But Mice', year: 1947, studio: 'Famous Studios' },
  { id: 'little_audry_goofy_goofy_gander', title: 'Little Audrey: Goofy Goofy Gander', year: 1950, studio: 'Famous Studios' },
  { id: 'the_new_three_stooges_dinopoodi', title: 'The New Three Stooges: Dinopoodi', year: 1965, studio: 'Cambria' },
  { id: 'RudolphTheRed-nosedReindeer1948', title: 'Rudolph the Red-Nosed Reindeer', year: 1948, studio: 'Fleischer Studios' },
  { id: 'SantasSuprise', title: "Santa's Surprise", year: 1947, studio: 'Famous Studios' },
];

export type Channel =
  | { number: number; call: string; kind: 'snick'; name: string }
  | { number: number; call: string; kind: 'block'; name: string; block: ArchiveBlock }
  | { number: number; call: string; kind: 'cartoon'; name: string; cartoon: Cartoon }
  | { number: number; call: string; kind: 'youtube'; name: string; yt: YtChannel };

function callSign(c: Cartoon): string {
  const t = c.title.toUpperCase();
  if (t.startsWith('POPEYE') || t.includes('POPEYE')) return 'POP';
  if (t.startsWith('SUPERMAN')) return 'SUP';
  if (t.startsWith('BETTY')) return 'BTY';
  if (t.startsWith('FELIX')) return 'FLX';
  if (t.startsWith('FLIP')) return 'FLP';
  if (c.studio === 'Disney') return 'DIS';
  if (c.studio.startsWith('Ub')) return 'UBI';
  if (c.studio.includes('Lantz')) return 'WDY';
  if (c.studio.includes('Terry')) return 'TRY';
  return 'TOON';
}

const ytChannel = (yt: YtChannel): Channel => ({ number: yt.number, call: yt.call, kind: 'youtube', name: yt.name, yt });

export const CHANNELS: Channel[] = [
  // The 24/7 YouTube channels, only with the 24/7 switch on: channel 1 leads the dial.
  ...(TV247_ON ? YT_CHANNELS.map(ytChannel) : []),
  { number: 2, call: 'SNICK', kind: 'snick', name: 'SNICK — Saturday Night Nickelodeon' },
  { number: 3, call: 'CCF', kind: 'block', name: 'Cartoon Cartoon Fridays (2000)', block: CCF_2000 },
  { number: 4, call: 'CN', kind: 'block', name: 'Cartoon Network (1999–2003 tapes)', block: CN_TAPES },
  { number: 5, call: 'NICK', kind: 'block', name: 'Nickelodeon & Cartoon Network (Aug 2003)', block: NICK_CN_2003 },
  { number: 6, call: 'FOXK', kind: 'block', name: 'Fox Kids (2000–2001)', block: FOX_KIDS },
  { number: 7, call: 'KWB', kind: 'block', name: "Kids' WB (Feb 2001)", block: KIDS_WB_2001 },
  { number: 8, call: 'PBS', kind: 'block', name: 'Arthur 24/7 — every season (1996–2022)', block: ARTHUR },
  ...CARTOONS.map((cartoon, i): Channel => ({
    number: i + 9,
    call: callSign(cartoon),
    kind: 'cartoon',
    name: cartoon.title,
    cartoon,
  })),
  ...(TV247_ON ? [ytChannel(MTV_CHANNEL), ytChannel(PICK_CHANNEL)] : []),
];

export function channelByNumber(n: number) {
  return CHANNELS.find(c => c.number === n) ?? null;
}

/** Seconds since the epoch; every channel is "live" off this one clock. */
export const nowSeconds = () => Date.now() / 1000;

const SNICK_LOOP = SNICK_EPISODES.map(ep => SNICK_DURATIONS[epKey(ep)] ?? 7200);
const SNICK_TOTAL = SNICK_LOOP.reduce((a, b) => a + b, 0);

/** Which archived Saturday night is "on air" right now, and how far into it. */
export function snickOnAir(at = nowSeconds()): { episode: SnickEpisode; index: number; offset: number } {
  let t = at % SNICK_TOTAL;
  for (let i = 0; i < SNICK_EPISODES.length; i += 1) {
    if (t < SNICK_LOOP[i]) return { episode: SNICK_EPISODES[i], index: i, offset: t };
    t -= SNICK_LOOP[i];
  }
  return { episode: SNICK_EPISODES[0], index: 0, offset: 0 };
}

/** Program text for the guide: what is on now and next on a channel. */
export function guideRow(channel: Channel, at = nowSeconds()): { now: string; next: string } {
  if (channel.kind === 'snick') {
    const air = snickOnAir(at);
    const now = snickShowAt(air.episode, air.offset);
    let next = now;
    for (let step = 60; step < 4 * 3600 && next === now; step += 60) {
      const later = snickOnAir(at + step);
      next = snickShowAt(later.episode, later.offset);
    }
    return { now, next };
  }
  if (channel.kind === 'block') {
    const air = blockOnAir(channel.block, at);
    const parts = channel.block.parts;
    const clock = (t: number) => new Date(t * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const { nextShow } = segmentAt(air.part, air.offset);
    if (nextShow) return { now: showTitleAt(air.part, air.offset), next: `${clock(at + nextShow.at - air.offset)} ${nextShow.title}` };
    const after = parts[(air.index + 1) % parts.length];
    return { now: showTitleAt(air.part, air.offset), next: `${clock(at + air.part.seconds - air.offset)} ${showTitleAt(after, 0)}` };
  }
  if (channel.kind === 'youtube') {
    const air = ytOnAir(channel.yt, at);
    if (!air) return { now: 'Paste a YouTube link from the menu', next: '' };
    const links = channel.yt.links;
    if (air.offset === null) {
      return { now: air.link.title, next: links.length > 1 ? links[(air.index + 1) % links.length].title : '24/7 · loops all day' };
    }
    // the next show and the clock time it starts, from the video's timestamps or the next video
    const show = ytShowAt(air.link, air.offset);
    const after = links[(air.index + 1) % links.length];
    const next = show.next
      ? { at: at + show.next.at - air.offset, title: show.next.title }
      : { at: at + (air.link.seconds as number) - air.offset, title: ytShowAt(after, 0).now };
    const when = new Date(next.at * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return { now: show.now, next: `${when} ${next.title}` };
  }
  const label = `${channel.cartoon.title} (${channel.cartoon.year})`;
  return { now: label, next: `${channel.cartoon.studio} encore` };
}
