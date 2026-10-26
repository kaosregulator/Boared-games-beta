/**
 * Builds the 90s commercials channel's library from Internet Archive items:
 * single spots named "1994 Burger King Broiler Commercial", plus whole breaks
 * as they aired, cut from kids' TV tapes. Titles, years and genres come from
 * the file names (Retro Viewer's MetaEditor does this by hand; here it is one
 * pass), and promos, PSAs, station IDs, duplicates and late-night hotline
 * spots are left out so the channel is commercials only.
 *
 *   node scripts/tv-ads.mjs [cache-dir] > src/tv/lineups/ads90sLibrary.ts
 *
 * With a cache dir, each item's file list is read from <dir>/<id>.json (the
 * `result` of archive.org/metadata/<id>/files); without one it is fetched.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const cacheDir = process.argv[2];

/** Collections of single spots, one file per commercial. */
const SPOT_ITEMS = [
  '1990variouscommercials',
  '1993variouscommercials',
  '1994variouscommercials',
  'earlyjan1995commercials',
  '1996VariousCommercials',
  '1997variouscommercials',
  '1998variouscommercials',
  '1999variouscommercials',
];

/** A 34 GB box of tapes; only its 1990s breaks and spots are used. */
const VINTAGE = 'Vintage_Commercials_Advertisements_80s';

/** Real breaks cut from tapes in the vintage box, with what they aired around. */
const VINTAGE_TAPES = [
  [/^Animaniacs 09 1993 Commercials/, 1993, 'Kids', 'Fox Kids break · Animaniacs, Sept 1993'],
  [/^Batman 09 1993 Commercials/, 1993, 'Kids', 'Fox Kids break · Batman: The Animated Series, Sept 1993'],
  [/^Family Channel Adverts 1993/, 1993, 'Kids', 'The Family Channel break · 1993'],
  [/^Family Channel3 Commercials/, 1993, 'Kids', 'The Family Channel break · 1993'],
  [/^1991 NOTV Commercials/, 1991, 'Network', 'Commercial break · 1991'],
  [/^1 CBS Adverts 1994 Restored Garfield B/, 1994, 'Kids', 'CBS Saturday morning break · Garfield and Friends, 1994'],
  [/^Nintendo MegaMan6 Ad/, 1994, 'Kids', 'Saturday morning break · Mega Man 6, 1994'],
  [/^Nintendo Warioland Ad etc/, 1994, 'Kids', 'Saturday morning break · Wario Land, 1994'],
];

/** Single 90s spots in the vintage box: file name → [year, title]. */
const VINTAGE_SPOTS = {
  'Burger King BeetleJuice 1990.mp4': [1990, 'Burger King Beetlejuice Toys'],
  'beetlejuice toys, andre the giant honeycomb 1990.mp4': [1990, 'Beetlejuice Toys & Honeycomb Cereal'],
  'Festers Quest Nintendo 1990.mp4': [1990, "Nintendo Fester's Quest"],
  'Sega Genesis HAG Street Smart Winter 1991.mp4': [1991, 'Sega Genesis Street Smart'],
  'Sega Genesis Sonic Hedgehog Winter 1991.mp4': [1991, 'Sega Genesis Sonic the Hedgehog'],
  'Crash Test Roast, Jeopardy Museum Winter 1991.mp4': [1991, 'Crash Test Dummies Seat Belt Roast'],
  'Nintendo Game Genie Winter 1992.mp4': [1992, 'Game Genie'],
  'Nintendo Metroid 2 Winter 1992.mp4': [1992, 'Game Boy Metroid II'],
  'Nintendo SNES Paul Rudd Winter 1992.mp4': [1992, 'Super Nintendo with Paul Rudd'],
  'Super Mario Bros Movie Ertl Toys 1993 Commercials.mp4': [1993, 'Super Mario Bros. Movie Ertl Toys'],
  'Darkwing Duck Pasta 09 15 1993 Commercial FOX.mp4': [1993, 'Darkwing Duck Pasta'],
  'SuperMarioAllStars.mp4': [1993, 'Super Mario All-Stars'],
  'LinksAwakening Nintendo Ad.mp4': [1993, "Zelda: Link's Awakening"],
  'Nintendo Warioland Ad.mp4': [1994, 'Wario Land'],
};

/** Whole tapes of breaks, one long file each; the channel plays them a break-length window at a time. */
const LONG_TAPES = [
  ['NickelodeonApril131995Commercials', 'Nickelodeon - April 13, 1995 Commercials.mp4', 32.18, 1995, 'Kids', 'Nickelodeon break · April 1995'],
  ['1996-nick-jr-nickelodeon-commercials', '1996 Nick Jr⧸Nickelodeon commercials.mp4', 909.18, 1996, 'Kids', 'Nick Jr. & Nickelodeon breaks · 1996'],
  ['youtube-8rQYE-JXmss', 'Nickelodeon_Commercial_Breaks_April_1998-8rQYE-JXmss.mp4', 1634.55, 1998, 'Kids', 'Nickelodeon breaks · April 1998'],
  ['nickelodeon-commercials-may-3-1999480p', 'Nickelodeon Commercials May 3 1999480p.ia.mp4', 436.26, 1999, 'Kids', 'Nickelodeon breaks · May 1999'],
  ['1999-disney-channel-commercials', '1999 Disney Channel commercials.mp4', 250.75, 1999, 'Kids', 'Disney Channel breaks · 1999'],
  ['cartoon-network-commercials-november-27-1999', 'Cartoon Network Commercials (November 27, 1999).mp4', 2789.85, 1999, 'Kids', 'Cartoon Network breaks · November 1999'],
  ['fox-kids-abc-saturday-morning-nypd-blue-commercials-1995-1996', 'Fox Kids ABC Saturday Morning NYPD Blue Commercials 1995-1996.mp4', 4910.76, 1995, 'Kids', 'Fox Kids & ABC Saturday morning breaks · 1995–96'],
  ['90s-commercials-compilation-nbc-1999-720p', '90s Commercials Compilation NBC 1999 720p.mp4', 2142.34, 1999, 'Network', 'NBC breaks · October 1999'],
];

/** How long one window of a long tape runs: about one real break. */
const WINDOW = 150;

/** Not commercials, or not for this room: promos, IDs, PSAs, news, shopping-channel segments, hotlines. */
const SKIP = [
  /\bpromos?\b/i, /\bpsa\b/i, /\bclips?\b/i, /credits/i, /\bintro\b/i, /\bnews\b/i, /\bupdate\b/i,
  /hotline/i, /\badult\b/i, /love phone/i, /pregnan/i, /pregnac/i, /monistat/i, /diagnosis murder/i, /figure skating/i, /sea quest/i, /superstation/i, /femcare/i, /\bfds\b/i, /preparation h/i, /aqua-ban/i,
  /\bdup\b/i, /\bdup\d/i, /diff format/i, /different encoding/i, /bad video/i, /short clip/i, /tape end/i,
  /\bqvc\b/i, /\bpbs\b/i, /\bptv\b/i, /idaho/i, /kvie/i, /sewing/i, /quilting/i, /notes from nancy/i, /hometime/i,
  /^(abc|cbs|nbc|fox|fox23|foxorama|wb|wb 11|the wb|tnt|tbs|usa|a&e|starz|hbo|wrgb|wrwd|wabc|thirteen|discovery|discovey|history channel|sci-fi|sfc)\b/i,
  /\bpay per view\b/i, /cable support/i, /call your cable/i, /channels magazine/i, /tonight at/i, /primetime ad/i,
  /larry king/i, /crossfire/i, /charlie rose/i, /masterpiece/i, /agatha christie/i, /babylon 5/i, /days of our lives/i,
  /dr\. quinn/i, /conan/i, /eye to eye/i, /90210/i, /melrose/i, /the omen/i, /fox kids killing kids/i, /kids killing kids/i,
  /gold channel/i, /june bugs/i, /omen iii/i, /covert bailey/i, /pole to pole/i, /pointman/i, /sophisticated ladies/i,
  /la cage/i, /mid-hudson civic/i, /bridal fair/i, /moscow circus/i, /big break music/i, /plastics? coun/i, /sewing/i,
  /in theathers trailer/i, /^195 /, /^1995 94 /,
];

/** Genres, first match wins. Order matters: "Burger King" is food before it is anything else. */
const GENRES = [
  ['Toys & Games', /nintendo|sega|game genie|game boy|super mario|zelda|wario|metroid|mega ?man|toys?\b|crayola|lego|barbie|hot wheels|ertl|fleer|basketball cards|baseball cards|paintball|six flags/i],
  ['Food & Drink', /burger|whopper|wendy|mcdonald|domino|dominios|pizza|little caesars|long john|red lobster|friendly's|dunkin|cereal|cheerios|kellog|chex|bran|fingos|oreo|cookie|snack|candy|skittles|snickers|hershey|gum\b|bubblicious|freedent|trident|tictac|mentos|cinn a burst|slim jim|soda|coca|coke|pepsi|dew|dr\. pepper|7-up|sunkist|kool-aid|gatorade|powerade|tropicana|juice|grapefruit|v8|evian|water commercial|crystal light|tea\b|teas\b|coffee|cocoa|hot chocolate|carnation|boost|ensure|lactaid|milk|cheese|cheez|velveeta|kraft|campbell|soup|prego|sauce|uncle ben|hormel|healthy choice|sara lee|eggo|waffle|toaster strudel|pop-?tarts|jello|jell-o|pudding|reddi wip|smucker|raisins|lettuce|tyson|mrs\.?dash|crisco|mayo|dressing|hidden valley|country crock|equal sweetener|birds eye|easy recipe|easy vegetables|chips|lays|garnola|granola|honeycomb|pasta|maxwell house|butterworth|fig newtons|nabisco|ortega|salsa|peanut butter|skippy|starburst|sunny delight|budget gourmet|olive garden|taco bell|restaurant|resturant|syrup|food/i],
  ['Beer', /beer|bud light|budweiser|coors|michelob/i],
  ['Cars', /\bcars?\b|truck|suv|minivan|ford|chevy|chevrolet|camero|honda|acura|accura|toyota|dodge|chrysler|plymouth|nissan|jeep|lexus|bmw|audi|saturn|\bvw\b|volkswagen|voltswagen|hyundai|pontiac|cadillac|oldsmobile|olds\b|gmc|geo prizm|mazda|castrol|motor oil|midas|armor all|tire|auto\b|auto body|auto park|\bgm\b/i],
  ['Movies', /movie|trailer|video release|vhs release|home video|on ice|star wars|spiceworld|dreamworks|small soldiers|universal studios/i],
  ['Phones & Tech', /at&t|mci\b|sprint|10-10-220|phone|cellphone|cell phone|omnipoint|telecom|highland tel|lci telephone|internet|online|america online|software|quickbooks|computer|intel|pentium|amazon\.com|copiers|ibm|encyclopaedia/i],
  ['Health & Beauty', /advil|anacin|tums|pepcid|drixoral|dayquil|theraflu|robitussin|sucrets|ricola|comtrex|benadryl|alka-seltzer|excedrin|pediatric|unisom|primatene|fibercon|centrum|nicotrol|aspercreme|ben-gay|momentum|lanacane|band-aid|blistex|chapstick|visine|cerenex|drug|meds|medicine|shampoo|denorex|head & shoulders|finesse|tresemme|clairol|hydrience|hair|perm|toothpaste|crest|colgate|plus white|arm & hammer dental|sonicare|tooth brush|efferdent|listerine|deodorant|arrid|anti-perspirant|gillette|schick|razor|soap|lever 2000|irish spring|body wash|neutrogena|jergens|olay|lancome|loreal|maybelline|clinique|perfume|elizabeth arden|alpha hydrox|tanning|shower to shower|tylenol|vicks|slim fast|huggies|pampers|diaper|noxzema|pantene|vitamins|sine-aid|puffs|skintimate|shave gel|slim-fast|weight watchers|cybergenics|breathe right|bowflex|workout|lens|eyeglasses|glasses|ray bans|contacts|vision center|back pain|chiropract|pecoraro|jesman|health/i],
  ['Home', /cleaner|detergent|tide\b|gain bleach|clorox|woolite|jet dry|comet|pine-sol|lysol|bounty|charmin|mr\. clean|flea control|stowaways|cat litter|scoop away|johnny cat|whiskas|mighty dog|pedigree|terminix|bug|batteries|duracell|culligan|heater|mattress|serta|craftmatic|sleep shops|furniture|ethan allen|thomasville|kitchenaid|kenmore|appliance|overhead door|lawn|fireside|lumber/i],
];

const DUP_TAIL = /\s*\((\d)\)$/;

function cleanTitle(raw) {
  return raw
    .trim()
    .replace(/\.ia\.mp4$|\.mp4$/i, '')
    .replace(DUP_TAIL, '')
    .trim()
    .replace(/^\d{4}\s+/, '')
    .replace(/\s+Comm?er?cials?$/i, '')
    .replace(/\s+Commerical$/i, '')
    .replace(/\s+Ad$/i, '')
    .replace(/\s+-\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function genreOf(title) {
  for (const [g, re] of GENRES) if (re.test(title)) return g;
  return 'Stores & Services';
}

/** Christmas and Halloween spots air only in their season. */
function seasonOf(title) {
  if (/christmas|xmas|santa|\bnoel\b/i.test(title)) return 'xmas';
  if (/halloween|trick or treat|costume/i.test(title)) return 'halloween';
  return undefined;
}

async function filesOf(id) {
  const local = cacheDir && join(cacheDir, `${id}.json`);
  if (local && existsSync(local)) return JSON.parse(readFileSync(local, 'utf8'));
  const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(id)}/files`);
  if (!res.ok) throw new Error(`${id}: ${res.status}`);
  return (await res.json()).result;
}

/** One browser-playable file per clip: the h.264 IA derivative, then any h.264, then the original. */
function playable(files) {
  const byClip = new Map();
  const rank = f => (/\.ia\.mp4$/i.test(f.name) ? 0 : f.format === 'h.264' ? 1 : 2);
  for (const f of files) {
    if (!/\.mp4$/i.test(f.name) || !f.length) continue;
    const clip = f.name.replace(/\.ia\.mp4$|\.mp4$/i, '');
    const have = byClip.get(clip);
    if (!have || rank(f) < rank(have)) byClip.set(clip, f);
  }
  return [...byClip.entries()];
}

const ads = [];
const seen = new Set();

for (const id of SPOT_ITEMS) {
  for (const [clip, f] of playable(await filesOf(id))) {
    const year = Number(clip.match(/^(199\d)\b/)?.[1]);
    if (!year) continue;
    const title = cleanTitle(clip);
    if (SKIP.some(re => re.test(clip) || re.test(title))) continue;
    const s = Number(f.length);
    if (s < 8 || s > 75) continue;
    // the same spot uploaded twice under slightly different names
    const key = `${year} ${title.toLowerCase()} ${clip.match(DUP_TAIL)?.[1] ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    ads.push({ id, file: f.name, s: Math.round(s * 100) / 100, t: title, y: year, g: genreOf(title), season: seasonOf(title) });
  }
}

const vintage = playable(await filesOf(VINTAGE));
for (const [clip, f] of vintage) {
  const name = `${clip}.mp4`;
  const spot = VINTAGE_SPOTS[name] ?? VINTAGE_SPOTS[f.name];
  if (spot) {
    ads.push({ id: VINTAGE, file: f.name, s: Math.round(Number(f.length) * 100) / 100, t: spot[1], y: spot[0], g: genreOf(spot[1]), season: seasonOf(spot[1]) });
    continue;
  }
  const tape = VINTAGE_TAPES.find(([re]) => re.test(clip));
  if (!tape) continue;
  const s = Number(f.length);
  if (s < 20) continue;
  ads.push({ id: VINTAGE, file: f.name, s: Math.round(s * 100) / 100, t: tape[3], y: tape[1], g: tape[2], break: true });
}

for (const [id, file, length, year, genre, title] of LONG_TAPES) {
  // whole windows only, so a slice never runs off the end of the tape
  const count = Math.max(1, Math.floor(length / WINDOW));
  const span = length / count;
  for (let i = 0; i < count; i += 1) {
    const from = Math.round(i * span);
    const to = i === count - 1 ? length : Math.round((i + 1) * span);
    ads.push({ id, file, from, s: Math.round((to - from) * 100) / 100, t: title, y: year, g: genre, break: true });
  }
}

ads.sort((a, b) => a.y - b.y || a.t.localeCompare(b.t) || (a.from ?? 0) - (b.from ?? 0));

const counts = {};
for (const a of ads) counts[a.g] = (counts[a.g] ?? 0) + 1;
console.error(`${ads.length} entries`, counts);

const items = [...new Set(ads.map(a => a.id))];
const row = a =>
  `  [${items.indexOf(a.id)}, ${JSON.stringify(a.file)}, ${a.s}, ${JSON.stringify(a.t)}, ${a.y}, ${JSON.stringify(a.g)}${
    a.break || a.from !== undefined || a.season ? `, ${a.break ? 1 : 0}` : ''
  }${a.from !== undefined || a.season ? `, ${a.from ?? 0}` : ''}${a.season ? `, ${JSON.stringify(a.season)}` : ''}],`;

process.stdout.write(`// Generated by scripts/tv-ads.mjs from the Internet Archive's 90s commercial collections. Do not edit by hand.

/** archive.org items the rows point into, by index. */
export const AD_ITEMS: string[] = ${JSON.stringify(items, null, 2)};

/**
 * [item, file, seconds, title, year, genre, isBreak?, fromSecond?, season?]
 * A break is a stretch of real broadcast (several spots as they aired); the
 * rest are single spots. \`from\` is where a window into a long tape starts.
 */
export type AdRow = [number, string, number, string, number, string, (0 | 1)?, number?, ('xmas' | 'halloween')?];

export const AD_ROWS: AdRow[] = [
${ads.map(row).join('\n')}
];
`);
