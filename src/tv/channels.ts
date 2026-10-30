import { SNICK_DURATIONS, SNICK_EPISODES, epKey, snickShowAt, type SnickEpisode } from './snick';
import { TV247_ON } from './tv247';
import { CCF_2000, CN_TAPES, FOX_KIDS, GOOSEBUMPS_S01, KIDS_WB_2001, NICK_CN_2003, blockOnAir, segmentAt, showTitleAt, type ArchiveBlock } from './lineups/archiveBlocks';
import { ARTHUR } from './lineups/arthur';
import { ADS_NUMBER, adsGuide } from './lineups/ads90s';
import { MTV_CHANNEL, PICK_CHANNEL, YT_CHANNELS, ytOnAir, ytShowAt, type YtChannel } from './lineups/youtube247';
import { PACK_SLOT, packOnAir } from './packSchedule';
import { MTV_90S, TOONAMI } from './lineups/networks';

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
  // Pantry Panic is the only Woody short in the public domain, so his station
  // fills out with the Lantz studio's other public-domain cartoons: the
  // Oswalds Lantz made from 1930 (all 1930 films are public domain now) and
  // the unrenewed later ones.
  { id: 'Boy_Meets_Dog_1938', title: 'Boy Meets Dog!', year: 1938, studio: 'Walter Lantz' },
  { id: 'africa-1930', title: 'Oswald the Lucky Rabbit: Africa', year: 1930, studio: 'Walter Lantz' },
  { id: 'broadway-folly-1930', title: 'Oswald the Lucky Rabbit: Broadway Folly', year: 1930, studio: 'Walter Lantz' },
  { id: 'the-hash-shop-1930-480p-1', title: 'Oswald the Lucky Rabbit: The Hash Shop', year: 1930, studio: 'Walter Lantz' },
  { id: 'the-detective-1930', title: 'Oswald the Lucky Rabbit: The Detective', year: 1930, studio: 'Walter Lantz' },
  { id: 'my-pal-paul-oswald-the-lucky-rabbit', title: 'Oswald the Lucky Rabbit: My Pal Paul', year: 1930, studio: 'Walter Lantz' },
  { id: 'oswald-rabbit-henpecked', title: 'Oswald the Lucky Rabbit: Henpecked', year: 1930, studio: 'Walter Lantz' },
  { id: 'spooks_202610', title: 'Oswald the Lucky Rabbit: Spooks', year: 1930, studio: 'Walter Lantz' },
  { id: '0801_20260801', title: 'Oswald the Lucky Rabbit: The Bandmaster', year: 1931, studio: 'Walter Lantz' },
  { id: '1932OswaldTheLuckyRabbitMechanicalManWaltDisney', title: 'Oswald the Lucky Rabbit: Mechanical Man', year: 1932, studio: 'Walter Lantz' },
  { id: 'oswald-rabbit-the-plumber-480p', title: 'Oswald the Lucky Rabbit: The Plumber', year: 1933, studio: 'Walter Lantz' },
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
  { id: 'TheValiantTailor', title: 'The Valiant Tailor', year: 1934, studio: 'Ub Iwerks' },
  { id: 'UbIwerksComiColorMarysLittleLamb1935', title: "Mary's Little Lamb", year: 1935, studio: 'Ub Iwerks' },
  { id: 'Summertime_232', title: 'Summertime', year: 1935, studio: 'Ub Iwerks' },
  { id: 'UbIwerksCartoonSinbadTheSailor1935OldFreeCartoonsPublicDomainYouTube720p', title: 'Sinbad the Sailor', year: 1935, studio: 'Ub Iwerks' },
  { id: 'UBIwerksComiColorCartoonBalloonLand1935', title: 'Balloon Land', year: 1935, studio: 'Ub Iwerks' },
  { id: 'SimpleSimon1935', title: 'Simple Simon', year: 1935, studio: 'Ub Iwerks' },
  { id: 'HumptyDumptyUBIwerksComiColor', title: 'Humpty Dumpty', year: 1935, studio: 'Ub Iwerks' },
  { id: '35094-ub-iwerks-cartoon-comicolor-tom-thumb-1936-old-cartoons-b', title: 'Tom Thumb', year: 1936, studio: 'Ub Iwerks' },
  { id: 'ComiColorCartoonsDickWhittingtonsCat1936HD', title: "Dick Whittington's Cat", year: 1936, studio: 'Ub Iwerks' },
  { id: 'FlyingFists1930UbIwerks', title: 'Flip the Frog: Flying Fists', year: 1930, studio: 'Ub Iwerks' },
  { id: 'PuddlePranks1930UbIwerks', title: 'Flip the Frog: Puddle Pranks', year: 1930, studio: 'Ub Iwerks' },
  { id: 'TheVillageBarber1930UbIwerks', title: 'Flip the Frog: The Village Barber', year: 1930, studio: 'Ub Iwerks' },
  { id: 'LittleOrphanWillie1930FlipTheFrogSoundCartoon_201810', title: 'Flip the Frog: Little Orphan Willie', year: 1930, studio: 'Ub Iwerks' },
  { id: 'TheCuckooMurderCase1930UbIwerks', title: 'Flip the Frog: The Cuckoo Murder Case', year: 1930, studio: 'Ub Iwerks' },
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

export type PackId = 'toon' | 'heroes' | 'felix' | 'betty' | 'woody' | 'ubi';

export type Channel =
  | { number: number; call: string; kind: 'snick'; name: string }
  | { number: number; call: string; kind: 'block'; name: string; block: ArchiveBlock }
  | { number: number; call: string; kind: 'pack'; name: string; pack: PackId; cartoons: Cartoon[] }
  | { number: number; call: string; kind: 'youtube'; name: string; yt: YtChannel }
  | { number: number; call: string; kind: 'ads'; name: string };

/** Which station a short belongs on. Named shows leave the grab-bag TOON station. */
export function cartoonPack(c: Cartoon): PackId {
  const t = c.title.toUpperCase();
  if (t.includes('POPEYE') || t.startsWith('SUPERMAN')) return 'heroes';
  if (t.startsWith('FELIX')) return 'felix';
  if (t.startsWith('BETTY')) return 'betty';
  if (t.includes('WOODY') || c.studio.includes('Lantz')) return 'woody';
  if (t.startsWith('FLIP') || c.studio.startsWith('Ub')) return 'ubi';
  return 'toon';
}

const PACKS: { id: PackId; number: number; call: string; name: string }[] = [
  { id: 'toon', number: 9, call: 'TOON', name: 'Toon Party — every short, once around' },
  { id: 'heroes', number: 10, call: 'HERO', name: 'Popeye & Superman' },
  { id: 'felix', number: 11, call: 'FLX', name: 'Felix the Cat' },
  { id: 'betty', number: 12, call: 'BTY', name: 'Betty Boop' },
  { id: 'woody', number: 13, call: 'WDY', name: 'Woody Woodpecker & Walter Lantz' },
  { id: 'ubi', number: 14, call: 'UBI', name: 'Ub Iwerks' },
];

function filmsFor(id: PackId) {
  return CARTOONS.filter(c => cartoonPack(c) === id);
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
  ...PACKS.map((pack): Channel => ({
    number: pack.number,
    call: pack.call,
    kind: 'pack',
    name: pack.name,
    pack: pack.id,
    cartoons: filmsFor(pack.id),
  })),
  { number: 15, call: 'GOOSE', kind: 'block', name: 'Goosebumps — Season 1, every episode (1995)', block: GOOSEBUMPS_S01 },
  // The 90s networks, off viewers' tapes and episode uploads (lineups/networks.ts).
  { number: 16, call: 'TNMI', kind: 'block', name: 'Toonami (1999–2004)', block: TOONAMI },
  { number: 17, call: 'MTV', kind: 'block', name: 'MTV — the 90s, off VHS', block: MTV_90S },
  // Nothing but 90s commercial breaks, on the channel number of the decade.
  { number: ADS_NUMBER, call: 'ADS', kind: 'ads', name: '90s Commercial Breaks' },
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
  if (channel.kind === 'ads') return adsGuide(at);
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
  const air = packOnAir(channel.cartoons, channel.pack, at);
  const when = new Date((at + air.remain) * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return { now: `${air.film.title} (${air.film.year})`, next: `${when} ${air.next.title}` };
}

export { PACK_SLOT };
