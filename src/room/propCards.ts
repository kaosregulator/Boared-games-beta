/**
 * Time capsules for everything in the room, down to the stuff baked into the
 * desks and shelves (see hotspots.ts). Each one is a little story about how
 * the thing actually got used, a few real photos you can swipe through, and
 * sometimes an old commercial from the Internet Archive.
 *
 * Photos are hot-linked from Wikimedia Commons (free licences, credited on
 * the card). Videos play from archive.org's own embed player.
 */

export interface CardPhoto {
  src: string;
  credit: string;
  alt: string;
}

export interface CardVideo {
  /** archive.org item identifier. */
  archiveId: string;
  title: string;
  /** The .mp4 inside the item to play. */
  file?: string;
  /** How long it runs, in seconds. */
  length?: number | null;
}

export interface CardFact {
  label: string;
  value: string;
}

export type CardAction = 'tv' | 'nes' | 'radio' | 'gameboy' | 'tamagotchi' | 'rubik' | 'hotwheels' | 'army' | 'furby' | 'ispy' | 'poochi' | 'pc' | 'viewmaster';

export interface PropCard {
  id: string;
  title: string;
  era: string;
  /** The memory, told like you were there. */
  story: string;
  /** Short, funny bullet points. */
  memories: string[];
  photos?: CardPhoto[];
  video?: CardVideo;
  action?: { kind: CardAction; label: string };
  /** Header line on the hologram card: what it is, when, and who made it. */
  kind?: string;
  year?: string | null;
  maker?: string | null;
  /** "Childhood Pro Tip": one funny line. */
  joke?: string;
  /** "The Real Story": true history of the real thing. */
  history?: string;
  facts?: CardFact[];
}

/** A Commons file as a sized thumbnail. Special:FilePath follows renames. */
function wm(file: string, credit: string, alt: string): CardPhoto {
  return {
    src: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=640`,
    credit: `${credit} · Wikimedia Commons`,
    alt,
  };
}

const P = {
  gameboy: wm('Game-Boy-Original.jpg', 'Evan-Amos, public domain', 'An original gray Game Boy'),
  gameboyFl: wm('Game-Boy-FL.png', 'Evan-Amos, public domain', 'Game Boy, front'),
  nes: wm('NES-Console-Set.png', 'Evan-Amos, public domain', 'NES console with controller'),
  snes: wm('SNES-Mod1-Console-Set.png', 'Evan-Amos, CC BY-SA 3.0', 'Super Nintendo console'),
  snesCarts: wm('SNES-SFAM-Cartridges.jpg', 'Evan-Amos, public domain', 'Super Nintendo and Super Famicom cartridges'),
  boombox: wm('Sharp GF-9494 (22W) Ghetto Blaster (edited).jpg', 'Stephen Michael Barnett, CC BY 2.0', 'Sharp GF-9494 boombox'),
  vhs: wm('VHS cassette with ruler.jpg', 'Damian Yerrick, public domain', 'A VHS cassette'),
  vhsKodak: wm('Kodak T-120 VHS cassette tape.jpg', 'Runningboards, CC BY-SA 4.0', 'Kodak T-120 blank VHS tape'),
  vcr: wm('VHS recorder, camera and cassette b.jpg', 'Santeri Viinamäki / Georgfotoart, CC BY-SA 4.0', 'VHS recorder, camcorder and tape'),
  tv: wm('Museum für Kommunikation - Depot Heusenstamm - Technik 12 - Flickr - KlausNahr.jpg', 'Klaus Nahr, CC BY-SA 2.0', 'Old tube televisions'),
  lava: wm('Lava lamps (16136876840).jpg', 'Dean Hochman, CC BY 2.0', 'Lava lamps glowing'),
  teddy: wm('Teddy bear early 1900s - Smithsonian Museum of Natural History.jpg', 'Smithsonian, CC BY-SA 2.0', 'An early teddy bear'),
  rubik: wm('Rubiks cube solved.jpg', 'Mike Gonzalez, CC BY-SA 3.0', "A solved Rubik's Cube"),
  beanbag: wm('Zanotta Sacco chair with houndstooth upholstery.jpg', 'Daniela De Ponti, CC0', 'A bean bag chair'),
  walkman: wm('Sony-wm-fx421-walkman.jpg', 'Evan-Amos, public domain', 'Sony Walkman cassette player'),
  walkmanFamily: wm('SonyWalkmanFamily.JPG', 'Marc Zimmermann, CC BY-SA 3.0', 'A family of Sony Walkmans'),
  cassette: wm('Compactcassette.jpg', 'Thegreenj, CC BY-SA 3.0', 'A compact cassette'),
  tamagotchi: wm('Tamagotchi 0124 ubt.jpeg', 'Tomasz Sienicki, CC BY-SA 3.0', 'A Tamagotchi'),
  eightBall: wm('Magic8ball.jpg', 'ChristianHeldt, public domain', 'A Magic 8 Ball'),
  pogs: wm('POG Carton at supermarket.png', 'SilliGuy.wiki, CC0', 'A carton of POG juice'),
  yoyo: wm('Yo-Yo-Plastic-Toy-Green.jpg', 'Evan-Amos, public domain', 'A plastic yo-yo'),
  viewmaster: wm('View-Master Model G.jpg', 'ThePassenger, CC BY-SA 3.0', 'A View-Master viewer'),
  jordans: wm('Nike Air Jordan I.jpg', 'Osyffar, CC0', 'Nike Air Jordan I sneakers'),
  army: wm('Green army plastic soldiers.jpg', 'A S Morton, CC BY 2.0', 'Green plastic army men'),
  // No free photo of a 1998 Furby exists, so these are renders of the room's own.
  furby: { src: '/cards/furby-1998.jpg', credit: 'The Furby from this room', alt: 'A grey spotted 1998 Furby' },
  furbyBoxed: { src: '/cards/furby-1998-boxed.jpg', credit: 'The Furby from this room', alt: 'A 1998 Furby in its window box' },
  // The room's own Poo-Chi (renders of the user's model), and a real pair from Commons.
  poochi: { src: '/cards/poochi-bone.jpg', credit: 'The Poo-Chi from this room', alt: 'A silver and blue Poo-Chi robot dog with his toy bone' },
  poochiHearts: { src: '/cards/poochi.jpg', credit: 'The Poo-Chi from this room', alt: 'Poo-Chi with red heart eyes' },
  poochiPair: wm('Poo-Chi.jpg', 'VofDoom, CC BY-SA 3.0', 'Two Poo-Chi robot dogs'),
  hotPocket: wm('Hot pocket.jpg', 'Schuym1, CC BY-SA 3.0', 'A Hot Pocket'),
  hotPocketBox: wm('Hot Pocket Pepperoni Pizzeria.jpg', 'Lenin and McCarthy, CC BY-SA 3.0', 'Pepperoni Hot Pocket'),
  pizzaRolls: wm("Totino's Pizza Rolls, May 2019.jpg", 'Thomson200, CC0', "Totino's Pizza Rolls"),
  gushers: wm('Betty Crocker Fruit Gushers pieces (cropped).jpg', 'Thomson200, CC0', 'Fruit Gushers'),
  backpack: wm('Rucksack1.jpg', 'sjr, CC BY-SA 3.0', 'A school backpack'),
  smiley: wm('Smiley.svg', 'Pumbaa80, public domain', 'A yellow smiley face'),
  sketchbook: wm('Sketch-book.jpg', 'sanya, public domain', 'An open sketchbook'),
  nokia: wm('Nokia 5110.jpg', 'Soltys0, CC BY-SA 2.5', 'A Nokia 5110 phone'),
  pager: wm('GSL 28R.png', 'Galizant, CC BY-SA 4.0', 'A pager'),
  invaders: wm('Arcade1up Space Invaders, Arcade1up Street Fighter II Arcade Games.jpg', 'Tim Sheerman-Chase, CC BY 2.0', 'Space Invaders arcade cabinet'),
  lamp: wm('Anglepoise 1227.jpg', 'renaissance chambara, CC BY 2.0', 'A balanced-arm desk lamp'),
  chair: wm('Desk chair.jpg', 'Emiellaiendiay, public domain', 'A swivel desk chair'),
  mug: wm('Mug of Tea.JPG', 'Factorylad, public domain', 'A mug'),
  quilt: wm('Russellquilter.jpg', 'Russell Lee, public domain', 'Quilting by hand'),
  blinds: wm('Some window blinds.JPG', 'Chuck Marean, CC BY 3.0', 'Window blinds'),
  figures: wm('Soldier action figures.jpg', 'puuikibeach, CC BY 2.0', 'Action figures'),
  markers: wm('Felt Tip.jpg', 'Prosthetic Head, CC BY-SA 4.0', 'Felt-tip markers'),
  pencils: wm('Pencils hb.jpg', 'Dmgerman, CC BY 3.0', 'HB pencils'),
  tmnt: wm('Teenage Mutant Ninja Turtles (5234965966).jpg', 'Calvin Walton, CC BY-SA 2.0', 'Teenage Mutant Ninja Turtles figures'),
  pokemon: wm('Pokemon cards and sets.jpg', 'Fernando Martello, CC BY-SA 4.0', 'Pokémon cards and sets'),
  skate: wm('Hainerberg Skate Park Now Open (6317086).jpg', 'U.S. Army / Lisa Bishop, public domain', 'Kids at a skate park'),
  hwCollection: wm('Hot Wheels collection.jpg', 'Matt, CC BY 2.0', 'A whole wall of Hot Wheels cars'),
  hwFleet: wm('The Hot Wheels fleet.jpg', 'Jake Spurlock, CC BY 2.0', 'A fleet of Hot Wheels cars'),
  clock: wm('2010-07-20 Black windup alarm clock face.jpg', 'Sun Ladder, CC BY-SA 3.0', 'An alarm clock face'),
};

import { PROP_FACTS, PROP_VIDEOS } from './propFacts';
import { EXTRA_PHOTOS } from './cardPhotos';

const V = (archiveId: string, title: string): CardVideo => ({ archiveId, title });

const CARDS: PropCard[] = [
  // ---------- the big stuff ----------
  {
    id: 'crt-tv',
    title: 'The TV',
    era: '1990s tube · 27 inches of pure weight',
    story:
      'Saturday morning cartoons were the main event. Kids got up before their parents, poured a bowl of cereal and sat way too close to the screen. Friday nights were TGIF on ABC, and the whole family watched the same show at the same time, because there was no other way to see it.',
    memories: [
      'It took two grown-ups and one pulled muscle to get it up on the dresser.',
      'Rabbit ears wrapped in tinfoil, angled toward wherever the signal felt like being that day.',
      'Turning it off left a little white dot that took forever to die.',
    ],
    photos: [P.tv],
    video: V('1989-commercial-for-sony-trinitron', 'Sony Trinitron commercial, 1989'),
    action: { kind: 'tv', label: 'Turn it on' },
  },
  {
    id: 'crt-vcr',
    title: 'The VCR',
    era: 'Be kind, rewind',
    story:
      'If you missed a show, it was gone until the rerun. So somebody in every family learned the VCR timer: channel, start time, stop time, then press Timer and walk away. Get one step wrong and you came home to forty minutes of the weather instead of Goosebumps.',
    memories: [
      'Eats tapes for fun. Knew a pencil-in-the-reel rescue by age eight.',
      'The tracking button was basically a slot machine.',
      'Fast-forward made the whole thing whine like it was in pain.',
    ],
    photos: [P.vcr, P.vhs],
  },
  {
    id: 'crt-cable',
    title: 'The cable box',
    era: 'Channels 2 through 60',
    story:
      'Getting cable was a big deal. It meant Nickelodeon, MTV and, from 1992, Cartoon Network, right at home. Kids without it went over to a friend\'s house to watch Rugrats. The remote was always lost in the couch, so the buttons on the box did most of the work.',
    memories: [
      'The scrambled channels were the forbidden zone. You squinted anyway.',
      'Waiting for the guide to scroll back around to your channel. It never came back in time.',
      'Green numbers glowing in the dark all night like a tiny nightlight.',
    ],
    action: { kind: 'tv', label: 'Turn the TV on' },
  },
  {
    id: 'nes',
    title: 'Nintendo Entertainment System',
    era: '1985 · the gray box',
    story:
      'Step one: blow on the cartridge. Step two: push it down, hit Power, pray. Every kid in every house did it, every time. Then you played Super Mario Bros. until somebody\'s mom called up the stairs that it was time to go home.',
    memories: [
      'The controller cord was exactly three feet too short.',
      'Duck Hunt dog laughed at you and you never forgave him.',
      'If somebody hit Reset during a save, a friendship ended.',
    ],
    photos: [P.nes],
    video: V('nintendo-woolworths', 'Woolworth Nintendo: NES & Game Boy (1990)'),
    action: { kind: 'nes', label: 'Power on' },
  },
  {
    id: 'boombox',
    title: 'The boombox',
    era: '1980s · twin decks, eight D batteries',
    story:
      'On weekends Casey Kasem counted down the American Top 40, and kids sat by the radio with a blank tape ready for their favorite song. Then the boombox went to the park, the pool and the driveway, playing the same tape until it wore thin.',
    memories: [
      'Every song you taped has the DJ talking over the first ten seconds.',
      'The handle is not designed for shoulders. We used it on shoulders.',
    ],
    photos: [P.boombox, P.cassette],
    video: V('walkmandec81', 'Walkman commercial, 1981'),
    action: { kind: 'radio', label: 'Tune in' },
  },
  {
    id: 'gameboy',
    title: 'Game Boy',
    era: '1989 · Nintendo',
    story:
      'The Game Boy made long car rides a lot shorter. It came along to Grandma\'s, to the dentist\'s waiting room and under the covers with a clip-on worm light so nobody saw. When the screen started to fade, the batteries were dying and you had about ten minutes left.',
    memories: [
      'You had to tilt it toward a lamp to see anything.',
      'Link cable battles in the backseat.',
      'It survived a fall down the stairs. The stairs had a dent.',
    ],
    photos: [P.gameboy, P.gameboyFl],
    video: V('1989-nintendo-game-boy-commercial', 'Nintendo Game Boy commercial, 1989'),
    action: { kind: 'gameboy', label: 'Sit down & play' },
  },
  {
    id: 'tamagotchi',
    title: 'Tamagotchi',
    era: '1997 · Bandai',
    story:
      'In 1997 they sold out everywhere, and kids clipped them to backpacks, belt loops and zipper pulls. Teachers had a whole drawer of them by lunch. When one died, the kid next to you helped hold a little funeral at recess, then you started a new one.',
    memories: [
      'Hide it in your sock drawer and it beeps right when Mom opens the drawer.',
      'Pulling the battery tab was the closest thing to opening a present.',
      'Somebody always says theirs grew up into the "good one".',
    ],
    photos: [P.tamagotchi],
    video: V('youtube-OxVMTxJvd7g', 'Tamagotchi toy hunting at FAO Schwarz, 1997'),
    action: { kind: 'tamagotchi', label: 'Play with it' },
  },
  {
    id: 'bed',
    title: 'The bed',
    era: 'Never been made',
    story:
      'Sleepovers meant sleeping bags all over the floor, a rented movie, a pizza, and whispering way past midnight until somebody\'s dad said "Go to sleep" for the third time. This bed has hosted every one of them, plus one "it was the dog" situation that is still not discussed.',
    memories: [
      'Monsters live under it. Snacks live under it too, so it evens out.',
      'Making it every morning was a rule that lasted three days.',
      'The quilt has been washed so many times the pattern gave up.',
    ],
    photos: [P.quilt],
  },
  {
    id: 'bed-pillow',
    title: 'The smiley pillow',
    era: 'Prize from the fair',
    story:
      'Won at the county fair for three tickets after missing the ring toss eleven times. The fair was the best week of summer: corn dogs, the Gravitron, and a game booth that never really let you win. It has absorbed tears, drool and one whole juice box. Still smiling.',
    memories: [
      'Smells faintly of Kool-Aid forever.',
      'Flip it over at night so it isn\'t smiling at you in the dark.',
    ],
    photos: [P.smiley],
  },
  {
    id: 'backpack',
    title: 'The backpack',
    era: 'One strap only',
    story:
      'Back to school started at the store, picking out a Trapper Keeper, Lisa Frank folders and a new backpack. By June, the bottom held a permission slip from October, a flattened Lunchable, three pencils with no erasers and a library book that is now officially stolen.',
    memories: [
      'Worn on one shoulder for six years. Looking cool cost a lot of back pain.',
      'The zipper broke in October. It stayed broken until June.',
    ],
    photos: [P.backpack],
  },
  {
    id: 'beanbag',
    title: 'The bean bag',
    era: 'The best seat in the house',
    story:
      'Lots of 90s kids\' rooms had one, usually in a loud color or with a team logo. It was the best seat for video games because you could sink in right in front of the TV. One seam always leaked foam beads, and they turned up in the carpet for years.',
    memories: [
      'Everybody fought over it during sleepovers.',
      'Getting out of it took two tries and a noise.',
    ],
    photos: [P.beanbag],
  },
  {
    id: 'window',
    title: 'The window',
    era: 'Grounded view',
    story:
      'Summer break meant playing outside until the streetlights came on. That was the rule in a lot of houses. Kids rode bikes, played tag and knocked on doors to see who could come out. If you were grounded, you watched it all from here through one bent blind slat.',
    memories: [
      'Opening the window at night meant one more bug in the room. Worth it.',
    ],
    photos: [P.blinds],
  },
  {
    id: 'window-south',
    title: 'The back window',
    era: 'Streetlight side',
    story:
      'At night the streetlight out back turned the whole room orange, and the tree outside threw moving shadows on the wall. Before phones, falling asleep meant lying in the dark with your thoughts and the sound of the house settling.',
    memories: [
      'Rain on this window was the best sleep sound ever made.',
    ],
    photos: [P.blinds],
  },
  {
    id: 'door',
    title: 'The door',
    era: 'KEEP OUT (this means you)',
    story:
      'Slamming the door was how arguments ended in the 90s. Every "You\'re not the boss of me!" ended right here, followed by "Don\'t slam that door!" from downstairs. The KEEP OUT sign went up the same week.',
    memories: [
      'Knock first. Nobody knocked first.',
      'Every parent knew the trick to open it. Every kid pretended they didn\'t.',
    ],
  },
  {
    id: 'door-poster',
    title: '"I Want to Believe" poster',
    era: 'The X-Files was on at 9',
    story:
      'The X-Files was on Friday nights at first, then moved to Sundays, and the next day the whole school talked about the scary episode. We were too scared to watch the whole thing, but we still wanted the poster. Mom thought it was about Jesus.',
    memories: [
      'Stayed up for the theme song and then hid under the blanket for the rest.',
      'Whistling the theme song in a dark hallway was a whole move.',
    ],
  },
  {
    id: 'door-cap',
    title: 'Space Invaders cap',
    era: 'Worn backwards',
    story:
      'The arcade at the mall was the place to be on a Saturday. Quarters went into Street Fighter II, tickets came out of Skee-Ball, and 4,000 of them got you this cap from the prize counter. It hangs on the door because hats indoors were "disrespectful".',
    memories: [
      'Worn backwards, obviously.',
      'Never washed. Will never be washed.',
    ],
    photos: [P.invaders],
  },
  {
    id: 'door-pins',
    title: 'The pin collection',
    era: 'Planet, smiley, alien, star',
    story:
      'Every pin here was a trade. The alien cost two Pokémon cards and a pudding cup. The star came free in a cereal box. In the 90s you could tell who someone was from across the hall just by their pins.',
    memories: [
      'Every pin poked your finger at least once.',
      'Pinned to the backpack until the backpack ripped.',
    ],
    photos: [P.smiley],
  },
  // ---------- the nightstand ----------
  {
    id: 'nightstand',
    title: 'The nightstand',
    era: 'Mission control',
    story:
      'Everything important lived within arm\'s reach of the pillow: the alarm clock, a cup of water and, if you could sneak it upstairs, the cordless phone. Late-night calls under the covers with your best friend were the whole point of a cordless phone.',
    memories: [
      'Candy goes in the back of the drawer, behind the socks, under the Game Boy instructions.',
      'The drawer sticks unless you lift and pull. Learned that by age five.',
    ],
  },
  {
    id: 'ns-clock',
    title: 'Alarm clock',
    era: '9:47 and lying',
    story:
      'Before cell phones, this was how you woke up for school: red numbers, a loud beep, and a snooze button big enough to hit with your eyes closed. On weekends you stayed up just to watch it flip to 12:00 and felt like a rebel.',
    memories: [
      'Red numbers you could see from space.',
      'Set it seven minutes fast so you\'d be early. Hit snooze seven times. Late anyway.',
    ],
    photos: [P.clock],
  },
  {
    id: 'ns-lava',
    title: 'Lava lamp',
    era: 'Mood lighting, 1990s edition',
    story:
      'Every mall in the 90s had a gift shop with a whole wall of lava lamps glowing in the dark, and that\'s where most of them came from. On the nightstand it doubled as a nightlight, a slow, blobby one.',
    memories: [
      'Swearing you saw a blob shaped exactly like a dinosaur.',
      'Too hot to touch, so naturally everybody touched it.',
    ],
    photos: [P.lava],
  },
  {
    id: 'ns-mug',
    title: 'Smiley mug',
    era: 'Hot cocoa only',
    story:
      'Snow days were the best days. You spent the morning sledding and came inside soaked to the bone, with red cheeks and wet socks. Hot cocoa in this mug, made for Mother\'s Day in art class and then quietly taken back, was how every snow day ended.',
    memories: [
      'Art class glaze, a little lumpy, still holds cocoa just fine.',
      'Correct marshmallow count: too many.',
    ],
    photos: [P.mug],
  },
  {
    id: 'ns-teddy',
    title: 'Night-shift bear',
    era: 'Guarding the bed since day one',
    story:
      'Almost every kid had a bear on night watch. Lights out, closet door shut all the way, and one bear on guard. This one has never let a single monster through. Perfect record.',
    memories: [
      'Lost an eye in a tug-of-war. Still on duty.',
    ],
    photos: [P.teddy],
  },
  {
    id: 'ns-recorder',
    title: 'The blue Sony',
    era: 'Tape recorder · pause button pro',
    story:
      'Before anybody had a camera in their pocket, a tape recorder was how you made a show. Kids recorded fake radio shows with their cousins, songs off the radio and the family singing Happy Birthday. Somewhere in a shoebox there\'s a forty-minute tape that should never be played.',
    memories: [
      'Prank calls were recorded. Allegedly.',
      'Every recording starts with somebody whispering "Is it on?"',
    ],
    photos: [P.walkman, P.cassette],
  },
  {
    id: 'ns-yoshi',
    title: 'Yoshi sticker',
    era: 'From a cereal box',
    story:
      'Cereal boxes used to have toys and stickers inside, sealed in a little plastic bag at the bottom. Kids picked the cereal by the prize, not the taste. This sticker took two days of eating a whole box to get, and it went on the drawer the second it came out.',
    memories: [
      'Worth the stomach ache.',
      'It\'s never coming off. We tried.',
    ],
  },
  {
    id: 'ns-tapes',
    title: 'The bedtime stack',
    era: 'Goosebumps, Space Jam, Sonic, R.L. Stine',
    story:
      'The Scholastic book order form came home in your backpack, and you circled half the page. Book order day, when the box came to class, felt like a holiday. Goosebumps covers were the thing everybody wanted, all bright colors and a monster on the front.',
    memories: [
      '"Reader beware" was not a suggestion.',
      'When the flashlight died, you just lay there thinking about the Haunted Mask.',
    ],
  },
  {
    id: 'ns-vhs',
    title: 'Movie night tapes',
    era: 'Toy Story, Hocus Pocus, Jurassic Park',
    story:
      'Movie night meant the same few tapes over and over. Hocus Pocus came out every October, Jurassic Park every Tuesday, and Toy Story whenever a little cousin came over. Watching the same movie fifty times wasn\'t weird. It was normal.',
    memories: [
      'Hocus Pocus is worn thin right at the part where they sing.',
      'Jurassic Park has a crinkle in the kitchen scene from being paused too many times.',
    ],
    photos: [P.vhs],
  },
  {
    id: 'ns-gameboy',
    title: 'Backup Game Boy',
    era: 'For emergencies',
    story:
      'The spare one, for when the main Game Boy\'s batteries died at the worst possible moment. In a lot of houses batteries were a big deal, kept in the kitchen drawer and counted. When they ran out, you took them from the TV remote and blamed the cat.',
    memories: [
      'Every house had one TV remote with no batteries in it. This is why.',
    ],
    photos: [P.gameboy],
  },
  // ---------- the high shelf on the south wall ----------
  {
    id: 'south-shelf',
    title: 'The high shelf',
    era: 'Display only, do not touch',
    story:
      'When family came over for the holidays, the good stuff went up here. Little cousins got the toy bins. Big Ted, the lava lamp, the good Game Boy and the View-Master nobody remembers how to load stayed safe, out of reach.',
    memories: [
      'Needed the desk chair to reach it. The chair spins. That went great.',
    ],
  },
  {
    id: 'sh-lava',
    title: 'The other lava lamp',
    era: 'Yes, we had two',
    story:
      'In the 90s a lava lamp was the go-to present for any kid who was hard to shop for. Every aunt knew it. This one came on a birthday with a card that said "Groovy!" and it sat on the shelf glowing purple for years.',
    memories: [
      'Named it. It never answered.',
    ],
    photos: [P.lava],
  },
  {
    id: 'sh-vhs',
    title: 'Home Alone, Jurassic Park, Aladdin',
    era: 'The holy trinity',
    story:
      'Disney movies came out on tape in big white plastic cases, and every kid had a stack of them. Home Alone was on every holiday, and every kid tried a trap at least once. Ours was a paint can on a string over the door. It got Dad.',
    memories: [
      'Rewound the trap scene until the tape got wobbly.',
      'The Aladdin tape is the white clamshell one. The good one.',
    ],
    photos: [P.vhs],
  },
  {
    id: 'sh-car',
    title: 'Red Hot Wheels',
    era: 'Fastest car on the orange track',
    story:
      'Hot Wheels cost about a dollar each at the grocery store checkout, right where kids could see them. Every trip with Mom was a chance to beg for one more. This red one won every race on the loop, except when it flew off and hit the dog.',
    memories: [
      'The orange track connectors left marks on everything.',
      'Paint chips from launching it off the stairs. For science.',
    ],
    video: V('DET-012_52007-52915', 'Hot Wheels Attack Pack commercial, 1993'),
  },
  {
    id: 'sh-teddy',
    title: 'Big Ted',
    era: 'Retired with honors',
    story:
      'Big Ted came to every tea party, sat in the car seat next to you, and rode in the shopping cart to the store. He went through the washing machine four times. Retired to the high shelf around fourth grade, where he can still see the whole room.',
    memories: [
      'The bow tie has been retied by every person in the family.',
    ],
    photos: [P.teddy],
  },
  {
    id: 'sh-gameboy',
    title: 'The good Game Boy',
    era: 'Not allowed at school',
    story:
      'Bringing a Game Boy to school was risky. Teachers took them away and gave them back at the end of the day, or sometimes the end of the week. This one spent a terrifying weekend in the principal\'s desk. It lives up here now. Safe.',
    memories: [
      'The principal definitely played it over the weekend.',
    ],
    photos: [P.gameboyFl],
  },
  {
    id: 'sh-turtle',
    title: 'Leonardo',
    era: 'Leads, does not do machines',
    story:
      'Everybody wanted to be Raphael or Michelangelo, so you got stuck with Leonardo and acted like you didn\'t care. You cared. The figures came with tiny weapons, and both of his swords were gone by Christmas.',
    memories: [
      '"Cowabunga" was a full answer to any question.',
      'Turtle-shaped pizza was technically just pizza.',
    ],
    photos: [P.tmnt],
    video: V('teenage-mutant-ninja-turtles-toon-turtles-action-figure-commercial', 'TMNT Toon Turtles action figure commercial'),
  },
  {
    id: 'sh-viewmaster',
    title: 'View-Master',
    era: 'Click. Click. Click.',
    story:
      'View-Master reels came in little paper envelopes, with cartoons, movies and faraway places on them. Kids got them at gift shops on family trips, and somehow you looked at the same Grand Canyon reel four hundred times.',
    memories: [
      'The orange lever had the most satisfying click in history.',
    ],
    photos: [P.viewmaster],
    video: V('youtube-JxG0HuHNqKU', 'Talking View-Master commercial, 1983'),
    action: { kind: 'viewmaster', label: 'Look through it' },
  },
  {
    id: 'sh-books',
    title: 'Goosebumps & The Lost World',
    era: 'Too scary, read it anyway',
    story:
      'Reading programs like Book It! gave you a free Pizza Hut pizza for reading books. So kids read a lot, especially short ones. The Lost World was way too long for a fifth grader, but it had a T. rex on the cover. Goosebumps you actually read. Twice.',
    memories: [
      'Nobody ever finished The Lost World. Not even the teacher.',
    ],
  },
  // ---------- toy cubby on the east wall ----------
  {
    id: 'toyshelf',
    title: 'The toy cubby',
    era: 'Where everything got thrown at cleanup time',
    story:
      '"Go clean your room" was the most said sentence in the 90s. Archaeologists will one day dig into these bins and find a Pokémon box, three socks and a single roller skate.',
    memories: [
      'The bins never closed. They were never meant to close.',
    ],
  },
  {
    id: 'ts-teddy',
    title: 'Scruffy',
    era: 'Loved too hard',
    story:
      'Scruffy went everywhere: the store, the car, the bath, and the dog\'s mouth once. If he got left at a restaurant, the whole family drove back. Every 90s family had a story about the stuffed animal they almost lost.',
    memories: [
      'Mom sewed his arm back on during a sleepover emergency.',
      'All the fur rubbed off one ear from being held while falling asleep.',
    ],
    photos: [P.teddy],
  },
  {
    id: 'ts-handheld',
    title: 'Pocket game',
    era: 'Tiger handheld energy',
    story:
      'Tiger handhelds cost about twenty dollars and were everywhere at Christmas and birthday parties. One game, one sound effect, no pause button. This one came from a birthday party goodie bag and kept everybody busy for a whole car ride.',
    memories: [
      'The beep. Just the beep. Forever.',
      'The pictures on the screen never moved, they just lit up.',
    ],
  },
  {
    id: 'ts-clock',
    title: 'Clock radio',
    era: 'Woke you up to the morning DJ',
    story:
      'On snowy mornings, the whole family listened to this. The radio read the list of school closings in alphabetical order, and you lay there waiting for your school\'s name. If it came, you went back to sleep happy.',
    memories: [
      'The radio station only came in if the antenna wire touched the window.',
    ],
    photos: [P.clock],
  },
  {
    id: 'ts-skateboard',
    title: 'The RAD skateboard',
    era: 'Mostly for sitting on',
    story:
      'In the 90s, skateboarding was everywhere: Tony Hawk was on TV, skate shops were in every mall, and kids wore skate shoes who had never touched a board. We learned exactly one trick: sitting on it and rolling down the driveway. Still a skater.',
    memories: [
      'The stickers are worth more than the board.',
      'The griptape shredded three pairs of jeans and one knee.',
    ],
    photos: [P.skate],
  },
  {
    id: 'ts-vhs',
    title: 'Recorded-off-TV tapes',
    era: 'Labels in three handwritings',
    story:
      'Families recorded everything: the Super Bowl, a special TV movie, Grandma\'s favorite show. Tapes got reused over and over, so most of them say one thing on the label and have something else on them. The one marked "Lion King" is a Bills game and twenty minutes of a cooking show.',
    memories: [
      'Commercials included, which, honestly, were the best part.',
    ],
    photos: [P.vhsKodak],
  },
  {
    id: 'ts-lava',
    title: 'Orange lava lamp',
    era: 'The tall one',
    story:
      'Turning the big light off and the lava lamp on was how you set the mood in the 90s, for a sleepover or a sad song. This tall one glows like a campfire, and the whole room looks like the inside of a fruit roll-up.',
    memories: [
      'Fell asleep watching it once. Woke up still watching it.',
    ],
    photos: [P.lava],
  },
  {
    id: 'ts-pokebox',
    title: 'Pokémon bin',
    era: 'Gotta catch \'em all, gotta store \'em somewhere',
    story:
      'In 1999 Pokémon was everything: the cards, the cartoon after school, the Game Boy game and the toys in Burger King kids\' meals. This bin has the card binders, a Pikachu that talks when you squeeze it too hard and the box the Game Boy game came in. The Charizard is not in here.',
    memories: [
      'Nobody knows where the Charizard went. Ask your cousin.',
    ],
    photos: [P.pokemon],
    video: V('2000-commercial-for-pokemon-trading-card-game', 'Pokémon Trading Card Game commercial, 2000'),
  },
  {
    id: 'ts-magazines',
    title: 'Magazine bin',
    era: 'Strategy guides and posters',
    story:
      'Before the internet, game magazines were how you learned secrets. Kids passed them around at school and copied codes onto notebook paper. The back pages had ads for sea-monkeys and X-ray glasses, and we did fill out the sea-monkey form.',
    memories: [
      'Sea-Monkeys did not look like the ad. At all.',
      'The poster in the middle was pulled out the day it came.',
    ],
  },
  // ---------- the game shelf ----------
  {
    id: 'shelf',
    title: 'The game closet',
    era: 'String lights stay on all year',
    story:
      'Family game night was a weekly thing in a lot of 90s houses. It started with an argument about which game and ended with somebody flipping the Monopoly board. The Christmas lights went up in 1995 and never came down.',
    memories: [
      'Half the boxes are missing pieces. The other half have pieces from other boxes.',
    ],
  },
  {
    id: 'gs-helmet',
    title: 'Bills helmet',
    era: 'Four Super Bowls in a row',
    story:
      'Super Bowl Sunday was a holiday in a lot of houses: chips, dip, everybody on the couch and the commercials that came out that day. Buffalo kids wore this helmet in the backyard for every big game and tackled the hedges.',
    memories: [
      'Football in the yard ended when somebody cried. Usually you.',
      'Four Super Bowl trips in a row. That\'s all we\'ll say.',
    ],
  },
  {
    id: 'gs-smiley',
    title: 'Smiley lamp',
    era: 'Have a nice day',
    story:
      'The smiley face was everywhere in the 90s, on shirts, stickers, notebooks and lamps. This one glows all night and stares directly at the bed. Comforting when you\'re five. Terrifying at eleven. Back to comforting at thirty.',
    memories: [
      'Won it at the fair along with a goldfish that lasted three days.',
    ],
    photos: [P.smiley],
  },
  {
    id: 'gs-plant',
    title: 'The plant',
    era: 'Somehow alive',
    story:
      'Every 90s house had a plant somebody brought home from the grocery store and nobody ever watered. This one lives in a kid\'s room, next to the game closet, and it is somehow thriving. Science can\'t explain it.',
    memories: [
      'Got the leftover Kool-Aid once. Grew an inch.',
    ],
  },
  {
    id: 'gs-lights',
    title: 'The string lights',
    era: 'Christmas, forever',
    story:
      'Putting up Christmas lights was a family job. Somebody untangled the strand on the living room floor, somebody held the ladder and somebody yelled "Try it now!" These went up in 1995 and never came down, because the room just looked better.',
    memories: [
      'Unplug them at night or they "start fires" (they never started fires).',
    ],
  },
  // ---------- dresser ----------
  {
    id: 'dresser',
    title: 'The dresser',
    era: 'Sticker museum',
    story:
      'Nobody was allowed to put stickers on the furniture. We put stickers on the furniture. In a lot of 90s rooms, the dresser was basically a history book: Mario, Yoshi, No Fear and a smiley face that won\'t come off.',
    memories: [
      'The top drawer never closed all the way.',
    ],
  },
  {
    id: 'dr-stickers',
    title: 'Mario & Yoshi stickers',
    era: 'Nintendo Power freebies',
    story:
      'Stickers came free in magazines, cereal boxes and at the doctor\'s office, and kids put them on everything. These went straight onto the dresser before anybody could stop it. They\'ve survived three moves and one very hard scrubbing.',
    memories: [
      'Peeling one off halfway and then putting it back was worse than leaving it.',
    ],
  },
  {
    id: 'dr-nofear',
    title: 'No Fear sticker',
    era: 'The most 90s sentence',
    story:
      'No Fear shirts were the cool shirts in the 90s, with sayings like "Second place is the first loser" across the back. We thought that was deep. Some schools even banned the shirts, which only made them cooler.',
    memories: [
      'Fear: medium.',
    ],
  },
  // ---------- the cluttered desk (west) ----------
  {
    id: 'clutterdesk',
    title: 'The homework desk',
    era: 'Homework was never done here',
    story:
      'After school, the routine was a snack, cartoons, and "homework" at the desk. This desk was used for building LEGO, drawing, eating pizza rolls, playing Super Nintendo with the sound off and hiding the report card. Homework happened on the bus.',
    memories: [
      'Every drawer is a junk drawer.',
      'The stickers are load-bearing.',
    ],
  },
  {
    id: 'cd-lava',
    title: 'Desk lava lamp',
    era: 'Homework mood lighting',
    story:
      'A lava lamp on a homework desk was supposed to help you focus. Instead you spent the next hour naming the blobs. That one\'s Gary. Gary just split into two Garys.',
    memories: [
      'Lost one blue crayon to science. It\'s still stuck to the base.',
    ],
    photos: [P.lava],
  },
  {
    id: 'cd-cup',
    title: 'Smiley pencil cup',
    era: 'Full of pens that don\'t work',
    story:
      'Gel pens took over schools in the late 90s: glitter, milky, scented, the works. Kids traded them and wrote notes in every color. Somehow this cup has twenty pens and not one of them writes, except the grape-scented gel pen at the bottom.',
    memories: [
      'Click pens: clicked eight thousand times during tests.',
    ],
    photos: [P.pencils],
  },
  {
    id: 'cd-tapes',
    title: 'Video game tape stack',
    era: 'Rented, not returned',
    story:
      'Renting was how you tried new games. Walking the aisles at the video store on a Friday night, picking one game for the weekend, and then begging for one more day. A couple of these still have the store\'s sticker on the case.',
    memories: [
      'The late fee is now worth more than the store.',
      'Blockbuster night was a Friday-night ritual.',
    ],
    photos: [P.vhs],
  },
  {
    id: 'cd-car',
    title: 'Red sports car',
    era: 'Dream car, 1:64 scale',
    story:
      'Every kid had a dream car picked out by age ten, usually red and usually Italian. Posters of sports cars went on the wall next to the basketball players. This one does laps around the pencil cup until you can buy the real one.',
    memories: [
      'Engine noises: done with your mouth, very loud.',
    ],
    video: V('hotwheels-commercial', 'Hot Wheels commercial, 1980s'),
  },
  {
    id: 'cd-clock',
    title: 'Clock radio',
    era: '5:41 · way too early',
    story:
      'Lots of kids had a paper route in the 90s, up before school to toss newspapers onto porches for a few dollars a week. The alarm got set for paper route time once, as a business plan. The business lasted a week. The alarm stayed at 5:41 for another year.',
    memories: [
      'Hitting the snooze button blind in the dark is a skill.',
    ],
    photos: [P.clock],
  },
  {
    id: 'cd-phone',
    title: 'Brick phone',
    era: 'Only for emergencies',
    story:
      'Cell phones in the 90s were for grown-ups and emergencies. Calls cost money by the minute, so kids barely got to touch one. This was Mom\'s old phone, "only for emergencies". Twenty minutes of Snake counted as an emergency, right?',
    memories: [
      'Ringtone: composed yourself, note by note, one awful afternoon.',
      'The antenna pulled out. It did nothing. You pulled it out anyway.',
    ],
    photos: [P.nokia],
    video: V('nokia-1998-tv-commercial-drew-carey', 'Nokia commercial, 1998'),
  },
  {
    id: 'cd-pogs',
    title: 'POGs',
    era: 'Playing for keeps',
    story:
      'POGs swept through schools in the mid-90s. Kids carried them in plastic tubes and played at recess, and a lot of schools banned them after kids lost whole collections playing "for keeps". The heavy slammer on top is the one that won all these.',
    memories: [
      'The skull slammer was the most powerful object in the cafeteria.',
      'Named after a juice. Nobody drank the juice.',
    ],
    photos: [P.pogs],
  },
  {
    id: 'cd-sketch',
    title: 'The sketchbook (and the Cool S)',
    era: 'Graffiti letters, every page',
    story:
      'Doodling in the margins was a 90s art form. Every notebook had the same things: the Cool S, a 3D cube, bubble letters and a dragon that doesn\'t look like a dragon. Nobody taught it. Everybody knew it.',
    memories: [
      'Back page: fake signatures, practicing for the report card.',
      'Everybody drew the S. Nobody knows who invented the S.',
    ],
    photos: [P.sketchbook],
  },
  {
    id: 'cd-lamp',
    title: 'Desk lamp',
    era: 'Burns fingers on contact',
    story:
      'Old light bulbs got hot. Really hot. The desk lamp kept your hands warm during winter homework, and once, as a test, a Hot Pocket. We did not try that. Okay, we tried that.',
    memories: [
      'Burned a finger on the shade at least once a year.',
      'Moths found it every summer night.',
    ],
    photos: [P.lamp],
  },
  {
    id: 'cd-frog',
    title: 'Little green guy',
    era: 'Came free with a kid\'s meal',
    story:
      'Kids\' meals came with a toy, and the toys changed every few weeks, so you begged to go back until you had the whole set. This little guy came free with one. Worth more than the meal. He\'s been the desk lamp\'s security guard ever since.',
    memories: [
      'Had a name once. Nobody remembers it.',
    ],
    photos: [P.figures],
  },
  {
    id: 'cd-8ball',
    title: 'Magic 8 Ball',
    era: 'Reply hazy, try again',
    story:
      'The Magic 8 Ball was the sleepover question machine. Kids passed it around the circle asking about crushes, tests and if it would snow tomorrow. Asked it if you\'d pass the spelling test. It said "Outlook not so good". It was right.',
    memories: [
      'Asked if your crush liked you back. It said "Ask again later". It\'s been later for a long time.',
    ],
    photos: [P.eightBall],
  },
  {
    id: 'cd-photo',
    title: 'The photo',
    era: 'School picture day',
    story:
      'School picture day meant your nicest shirt, a laser background, and a photographer combing your hair with the same comb as everyone else. Then you traded wallet-size photos with friends and wrote on the back.',
    memories: [
      'The retake was somehow worse.',
      'Practiced a smile in the mirror for a week. Blinked.',
    ],
  },
  {
    id: 'cd-tmnt',
    title: 'Ninja Turtles cup',
    era: 'From the pizza place',
    story:
      'Pizza places and fast food spots sold big plastic cups with movie and cartoon characters on them, and kids collected the whole set. This one came with a large pizza and a toy that broke in the car. It holds markers now.',
    memories: [
      'Turtle Power.',
      'Smells faintly of Sprite and a little like pizza.',
    ],
    photos: [P.markers],
    video: V('tmnt-pizza_202509', 'Pizza Hut Ninja Turtles kids meal commercial, 1990'),
  },
  {
    id: 'cd-walkman',
    title: 'Walkman',
    era: 'Headphones on, world off',
    story:
      'Bus rides and long car trips were a whole movie with headphones on. Kids carried a little case of tapes and swapped them with friends. The foam earpieces were orange once. Now they\'re a color science doesn\'t have a name for.',
    memories: [
      'The tape got eaten right at the best part. Every time.',
      'Sharing one pair of headphones, one ear each.',
    ],
    photos: [P.walkmanFamily, P.cassette],
    video: V('walkmandec81', 'Walkman commercial, 1981'),
  },
  {
    id: 'cd-snes',
    title: 'Donkey Kong Country cartridge',
    era: 'Super Nintendo · 1994',
    story:
      'Christmas morning 1994. Unwrapped, plugged in, played until the TV got hot. Donkey Kong Country looked like nothing else on the Super Nintendo, and the minecart levels made grown-ups throw controllers. This cartridge has seen things.',
    memories: [
      'Blowing on Super Nintendo carts did nothing either. We did it anyway.',
    ],
    photos: [P.snesCarts, P.snes],
    video: V('Super_Nintendo_commercial_1992', 'Super Nintendo commercial, 1992'),
  },
  {
    id: 'cd-yoyo',
    title: 'Yo-yo',
    era: 'Walk the dog, hit the dog',
    story:
      'The yo-yo guy came to school, did tricks in the gym and everybody bought one that afternoon. For a few months the whole playground was yo-yos. "Around the world" hit the lamp. "Rock the baby" tied the string into a knot that\'s still in there.',
    memories: [
      '"Walk the dog" actually hit the dog.',
    ],
    photos: [P.yoyo],
    video: V('youtube-dfqykR14O3Y', 'Duncan Yo-yo commercial, 1976'),
  },
  {
    id: 'cd-sonic',
    title: 'Sonic tape',
    era: 'Gotta go fast',
    story:
      'Sega vs Nintendo was the real war of the 90s. Kids picked a side, and the TV ads picked fights too. Sonic had two cartoons on Saturday mornings, taped and watched again on Sunday. This desk was Switzerland: both of them lived here.',
    memories: [
      'Chili dogs became the only acceptable food for a month.',
    ],
  },
  {
    id: 'cd-vhs',
    title: 'The movie row',
    era: 'Space Jam on top',
    story:
      'Space Jam came out in 1996 and every kid wanted to be Michael Jordan. Mini hoops went up on closet doors everywhere. The Space Jam soundtrack lived in the Walkman for a year.',
    memories: [
      'Monstars were the scariest villains ever made, change my mind.',
    ],
    photos: [P.vhs],
    video: V('trailer-for-space-jam', 'Space Jam trailer, 1996'),
  },
  {
    id: 'cd-trophy',
    title: 'Participation trophy',
    era: 'Everybody won',
    story:
      'Saturday mornings in spring meant tee-ball. Parents in folding chairs, a snack schedule on the fridge and juice boxes after the game. This team lost every single game and everybody got a trophy anyway. It is the proudest thing on this desk.',
    memories: [
      'Orange slices at halftime were the actual reason anybody played.',
    ],
  },
  {
    id: 'cd-stickers',
    title: 'Drawer stickers',
    era: 'Skater, No Fear, Saturn',
    story:
      'Every drawer has a sticker from a different phase: the skater phase, the space phase, the No Fear phase. In the 90s, the stickers on your stuff told everybody who you were trying to be.',
    memories: [
      'The planet sticker glows if the lights were on long enough.',
    ],
  },
  {
    id: 'cd-chair',
    title: 'The spinny chair',
    era: 'Mission control',
    story:
      'The spinny chair was the best seat in the house, and every kid with one tested how fast it could go. The cushion has a hole that grows a little every year. It still rolls perfectly to the TV.',
    memories: [
      'Office chair races down the hallway. Banned.',
    ],
    photos: [P.chair],
  },
  // ---------- the computer desk (east corner) ----------
  {
    id: 'desk',
    title: 'The family computer',
    era: 'Windows 98, dial-up, one phone line',
    story:
      'The family computer sat in the corner and the whole house took turns. A kitchen timer decided whose turn it was. Kids did homework in Encarta, played games, and waited an hour for one song to download.',
    memories: [
      'That dial-up screech meant you were about to be online.',
      '"Get off the internet, I need to use the phone!"',
    ],
    action: { kind: 'pc', label: 'Use the computer' },
  },
  {
    id: 'pc-monitor',
    title: 'Beige CRT monitor',
    era: 'Fifteen glorious inches',
    story:
      'Starting the computer took a while. The Windows logo came up and you waited, and waited, and then the desktop showed up and you waited some more. Kids changed the wallpaper the first day and then forgot about it for a whole year.',
    memories: [
      '3D Pipes screensaver, for hours.',
      'Heavier than you were.',
    ],
    action: { kind: 'pc', label: 'Turn on the computer' },
  },
  {
    id: 'pc-tower',
    title: 'The tower',
    era: 'Pentium inside',
    story:
      'A beige box under the desk was the most expensive thing in a lot of 90s houses. It came with a CD tray that kids used as a cup holder at least once, and a sticker on the front that seemed more important than anything inside.',
    memories: [
      'Pressing the power button and hearing every fan wake up.',
    ],
    action: { kind: 'pc', label: 'Press the power button' },
  },
  {
    id: 'pc-printer',
    title: 'Inkjet printer',
    era: 'Out of cyan again',
    story:
      'Printing a school report was an event. You hit Print and listened to it go one slow line at a time while the whole house heard it. Most reports got printed the night before they were due.',
    memories: [
      'It jammed every single time it was the night before.',
    ],
  },
  {
    id: 'pc-keyboard',
    title: 'Clicky keyboard',
    era: 'Typing class, home edition',
    story:
      'Lots of schools had computer class in the 90s, with a whole lab of beige computers and typing games. Kids learned to type there, and then got really fast at home typing instant messages late at night.',
    memories: [
      'Crumbs between the keys. All of them.',
      'Loud enough to wake the house at midnight.',
    ],
    action: { kind: 'pc', label: 'Use the computer' },
  },
  {
    id: 'pc-mouse',
    title: 'Ball mouse',
    era: 'Clean the ball, clean the rollers',
    story:
      'Kids learned the mouse playing Solitaire and Minesweeper, and the family computer had a free mouse pad from a bank or a store. Double-clicking was a skill that took grown-ups years.',
    memories: [
      'The mouse pad was a free one from a bank.',
      'Grandma clicked once and waited. Every time.',
    ],
    action: { kind: 'pc', label: 'Use the computer' },
  },
  {
    id: 'pc-cds',
    title: 'CD-ROMs and floppies',
    era: 'Insert disk 2 of 7',
    story:
      'Encyclopedias came on CD in the 90s, so school reports started with Encarta instead of the big books at the library. Demo discs came in cereal boxes and magazines, and the free AOL discs showed up in the mail almost every week.',
    memories: [
      '1,000 free hours! (must be used within one month).',
    ],
  },
  {
    id: 'pc-pencils',
    title: 'Pencil cup',
    era: 'Every colour but the one you need',
    story:
      'State projects, science fair posters and book report covers were all colored in pencil. Every class had one kid with the 64-pack, and everybody was nice to that kid. Somebody always took the blue.',
    memories: [
      'Electric pencil sharpeners: ate half the pencil every time.',
    ],
    photos: [P.pencils],
  },
  {
    id: 'pc-stickers',
    title: 'Drawer stickers',
    era: 'MTV, a smiley and a bit of rebellion',
    story:
      'Every drawer got a sticker the day you got it. Free stickers came with magazines, CDs and every trip to the mall. Peeling them off now would take the paint with them, so they stay.',
    memories: [
      'The drawer with the RAD sticker is where the good stuff is hidden.',
    ],
  },
  {
    id: 'pc-games',
    title: 'PC game boxes',
    era: 'Big boxes, tiny discs',
    story:
      'Computer games were sold in big boxes on shelves at the electronics store, and kids picked them by the picture on the front. The system requirements on the back were a test your computer never quite passed.',
    memories: [
      'Installing took an hour. Worth it.',
    ],
  },
  // ---------- little things on the floor and walls ----------
  {
    id: 'gushers',
    title: 'Fruit Gushers',
    era: 'Snack trading currency',
    story:
      'Lunch tables in the 90s worked like a stock market. One pack of Gushers could buy two Fruit Roll-Ups and a Capri Sun, or one pudding cup if the market was bad. Everybody\'s lunch box was open for business.',
    memories: [
      'Gushers were worth more than money in the cafeteria.',
      'The commercial said your head would turn into a fruit. Still waiting.',
    ],
    photos: [P.gushers],
    video: V('fruit-gushers-1992-commercial', 'Fruit Gushers commercial, 1992'),
  },
  {
    id: 'cards',
    title: 'Pokémon cards',
    era: '1999 · Base Set',
    story:
      'In 1999 every recess was a trading floor. Kids carried binders to school, traded doubles at lunch, and argued over who got the better deal. The pile on the floor here is the trade pile. The holographic Charizard was traded for a bike, and that is a decision we live with.',
    memories: [
      'Rubber bands ruined everything.',
      'Banned at school after the "it\'s mine, you traded it" incident.',
    ],
    photos: [P.pokemon],
    video: V('2000-commercial-for-pokemon-trading-card-game', 'Pokémon Trading Card Game commercial, 2000'),
  },
  {
    id: 'hotpockets',
    title: 'Hot Pockets & pizza rolls',
    era: 'After-school dinner',
    story:
      'After school in the 90s, a lot of kids made their own snack while their parents were still at work. The microwave was the kitchen. Two minutes: lava on the outside, still frozen in the middle. Pizza rolls were worse, a tiny pocket of sun in every bite. We never learned.',
    memories: [
      'The crisping sleeve did nothing and we all knew it.',
      'Eaten on the floor because the desk was full and the table was "for grown-ups".',
    ],
    photos: [P.pizzaRolls, P.hotPocket, P.hotPocketBox],
    video: V('1992-hot-pockets-a-hot-meal-without-a-big-deal-tv-commercial', 'Hot Pockets commercial, 1992'),
  },
  {
    id: 'jordans',
    title: 'The high-tops',
    era: 'Do not step on them',
    story:
      'Saved birthday money for six months for these. In the 90s, new sneakers came out on Saturdays, and kids lined up at the mall before it opened. Wore them once outside, got a scuff, and they\'ve lived on the floor by the shelf ever since, toes pointed out like they\'re on display. Because they are.',
    memories: [
      'Pump them up, lace them tight, look fresh.',
    ],
    photos: [P.jordans],
  },
  {
    id: 'car',
    title: 'RC trucks',
    era: 'Batteries not included',
    story:
      'Christmas morning: three RC trucks and zero batteries in the whole house. Most stores were closed, so you had to wait until the next day. Then they drove under the bed and didn\'t come out for three years.',
    memories: [
      'Racing a friend meant both remotes drove both trucks. Chaos.',
    ],
  },
  {
    id: 'hotwheels',
    title: 'Hot Wheels track',
    era: '1968 · Mattel · orange track forever',
    story:
      'It started as one loop. Then the track went off the toy shelf, under the bed, across the hallway and down the stairs, held together with tape and a dictionary for the jump. Building track all over the house was a whole Saturday plan.',
    memories: [
      'The orange track doubled as a sword, a whip and the thing Mom swore she\'d throw out.',
      'Zero to sixty in one flick of the finger. Sixty to under the couch forever.',
      'Only the slow, ugly station wagon ever made it all the way through the loop.',
    ],
    photos: [P.hwCollection, P.hwFleet],
    video: V('videoplayback_20240819_1919', 'Hot Wheels Criss Cross Crash commercial, 1999'),
    action: { kind: 'hotwheels', label: 'Shrink down & race' },
  },
  {
    id: 'army',
    title: 'Army men',
    era: 'Green plastic war',
    story:
      'A bag of army men cost about a dollar, and one bag gave you a whole war. Battles went across the carpet, the bed and the bathtub, and the losers got flicked. The guy lying down with the rifle could never stand up for anything.',
    memories: [
      'Stepping on one barefoot is worse than LEGO. Fight us.',
      'The parachute guys never once landed where you threw them.',
    ],
    photos: [P.army],
    action: { kind: 'army', label: 'Send the troops!' },
  },
  {
    id: 'ispy-book',
    title: 'I Spy',
    era: '1992 · Scholastic · picture riddles by Jean Marzollo & Walter Wick',
    story:
      'Every Scholastic book fair it was right there on the front table, shrink-wrapped, $12.95, and you had exactly 85 cents and a pencil topper. So you checked it out from the school library instead. Then you checked it out again. This copy still has the library pocket glued in the front. The due date says October 1998.',
    memories: [
      'Somebody always circled the answers in pen, so every library copy was already half solved.',
      'The riddles rhyme, so you read them in a sing-song voice whether you wanted to or not.',
      'Late fee is ten cents a day. It has been a while. The librarian has not forgotten.',
    ],
    video: V('how-i-spy-books-are-made', "How 'I Spy' books are made"),
    action: { kind: 'ispy', label: 'Open the book' },
  },
  {
    id: 'furby',
    title: 'Furby',
    era: '1998 · the Christmas everyone fought over',
    story:
      'Furby was the toy of Christmas 1998. Stores sold out, parents waited in line before the doors opened, and some people paid hundreds of dollars for one. Mom stood in line at 6 a.m. for this one, and a lady in the next aisle offered her a hundred dollars for it.',
    memories: [
      'It says "me sleepy" in a dark closet at 3 a.m. anyway.',
      'Two Furbies in the same room will talk to each other forever. Nobody knows what they\'re planning.',
      'Turn it upside down and it screams. Turn off the light and it snores. Basically a little brother.',
      'Somebody at school swore you could make it say a bad word. You could not.',
    ],
    photos: [P.furby, P.furbyBoxed],
    video: V('youtube-ouh2Q_-pYLQ', 'Tiger Electronics Furby TV commercial'),
    action: { kind: 'furby', label: 'Pick it up' },
  },
  {
    id: 'poochi',
    title: 'Poo-Chi',
    era: '2000 · Sega Toys and Tiger Electronics · $24.99',
    story:
      'After the Furby craze, Poo-Chi was the cool new thing for Christmas 2000: a robot puppy whose eyes turned into hearts when he was happy. He came with his own bone, and he loved that bone more than he loved you. The box said Poo-Chis could talk to each other. Every kid on the street tried it.',
    memories: [
      'He sang six songs, all in beeps.',
      'His voice was a speaker the size of a dime, so a bark sounded like a calculator having feelings.',
      'Held two of them nose to nose for a whole recess, waiting for them to talk. One fell asleep.',
      'His bones are all over this room somewhere. He never could find them on his own.',
    ],
    photos: [P.poochi, P.poochiHearts, P.poochiPair],
    video: V('2001-commercial-for-robo-chi-pets', 'Robo-Chi Pets commercial, 2001'),
    action: { kind: 'poochi', label: 'Play with him' },
  },
  {
    id: 'armor',
    title: 'Action figure',
    era: 'Cool guy with a backpack',
    story:
      'Action figures were the toy aisle in the 90s: G.I. Joe, Ninja Turtles, Power Rangers, a whole wall of them. Each came with tiny gear that was all gone within the first hour. This one keeps watch over the NES now, which is a very important job.',
    memories: [
      'Had a whole backstory on the card. Never read it.',
      'Gun: couch. Backpack: vacuum. Helmet: the dog.',
    ],
    photos: [P.figures],
  },
  {
    id: 'rubik',
    title: "Rubik's Cube",
    era: 'Solved once, by peeling the stickers',
    story:
      'Lots of 90s kids found their parents\' old Rubik\'s Cube from the 80s in a closet. Never solved it for real. Peeled the stickers off and put them back once, and showed everybody. Nobody believed it. They were right not to.',
    memories: [
      'Took it apart with a screwdriver. Couldn\'t get it back together.',
      'One kid at school could solve it in a minute and everybody treated him like a wizard.',
      'Got one side done once. Took a picture. Never touched it again.',
    ],
    photos: [P.rubik],
    action: { kind: 'rubik', label: 'Pick it up & twist it' },
  },
  {
    id: 'vhs-stack',
    title: 'The big VHS tower',
    era: 'Space Jam to Home Alone',
    story:
      'Every kid had a stack like this. Saturday morning shows, a few Disney movies and the tape you watched every day after school. These have been watched so many times the box art is worn white at the corners. The Pokémon tape has the Pikachu Thunderbolt part worn out.',
    memories: [
      'Be kind, rewind.',
      'Power Rangers on the tape, a little rental sticker on the spine.',
    ],
    photos: [P.vhs, P.vhsKodak],
  },
  {
    id: 'vhs-loose',
    title: 'Loose tapes',
    era: 'Out of their cases',
    story:
      'Tapes out of their cases, because the cases were in the other room, because nobody puts things back. In the 90s, every TV stand had a pile like this. One is labeled "DO NOT TAPE OVER" and has been taped over.',
    memories: [
      'The cases are somewhere. Probably.',
    ],
    photos: [P.vhsKodak],
  },
  {
    id: 'books',
    title: 'The book stack',
    era: 'Book report material',
    story:
      'In the late 90s Harry Potter got kids reading books thicker than their arms. Kids read them at recess, at dinner and in the car, and a few years later whole towns had midnight parties for the new book.',
    memories: [
      'Book reports written from the back cover only.',
    ],
  },
  {
    id: 'poster-pokemon',
    title: 'Pokémon poster',
    era: 'Came with the magazine',
    story:
      'Posters came folded up in the middle of magazines, and kids pulled them out the second they got home. This one has staple holes right through Pikachu\'s face. It\'s still the best poster in the room.',
    memories: [
      'Taped up, fell down, taped up again with way more tape.',
    ],
  },
  {
    id: 'poster-mummy',
    title: 'The Mummy poster',
    era: '1999 · watched at a sleepover',
    story:
      'The Mummy was the big movie of summer 1999, and kids who were too young went anyway. The scarab beetle scene. That\'s all there is to say. Nobody slept.',
    memories: [
      'The poster faces the bed. That was a mistake.',
    ],
  },
  {
    id: 'poster-giant',
    title: 'The Iron Giant poster',
    era: '1999',
    story:
      'Hardly anyone saw The Iron Giant in theaters, so most kids found it on tape. Then it got passed around from friend to friend. "Superman." If you know, you know. Watched it at a sleepover and three kids said they had something in their eye.',
    memories: [
      'Everyone wanted a giant robot friend after this.',
    ],
  },
  {
    id: 'poster-babe',
    title: 'Babe poster',
    era: '1995 · that\'ll do, pig',
    story:
      'After Babe hit theaters, kids across America were suddenly very into pigs. Got this poster free with a Happy Meal. Sang "La la la" around the house for a month.',
    memories: [
      'Tried to herd the dog. The dog did not herd.',
    ],
  },
];

export const PROP_CARDS: Record<string, PropCard> = Object.fromEntries(CARDS.map(card => [card.id, card]));

/** Old ids from before the shelf got its own card. */
const ALIASES: Record<string, string> = { teddy: 'south-shelf' };

/** The Commons file name behind a photo, to drop the same picture found twice. */
const photoKey = (photo: CardPhoto) => decodeURIComponent(photo.src.replace(/\?.*$/, '').split('/').pop() ?? '').replace(/^\d+px-/, '').replace(/_/g, ' ');

export function propCardFor(id: string): PropCard | null {
  const card = PROP_CARDS[id] ?? PROP_CARDS[ALIASES[id] ?? ''] ?? null;
  if (!card) return null;
  const extra = PROP_FACTS[card.id];
  const video = PROP_VIDEOS[card.id];
  const seen = new Set<string>();
  const photos = [...(card.photos ?? []), ...(EXTRA_PHOTOS[card.id] ?? [])].filter(photo => {
    const key = photoKey(photo);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { ...card, ...(extra ?? {}), photos: photos.slice(0, 5), video: video === undefined ? card.video : video ?? undefined };
}
