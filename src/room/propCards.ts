/**
 * Memory cards for everything in the room, down to the stuff baked into the
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
}

export type CardAction = 'tv' | 'nes' | 'radio' | 'gameboy' | 'tamagotchi' | 'rubik' | 'hotwheels' | 'army' | 'furby' | 'ispy';

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

const V = (archiveId: string, title: string): CardVideo => ({ archiveId, title });

const CARDS: PropCard[] = [
  // ---------- the big stuff ----------
  {
    id: 'crt-tv',
    title: 'The TV',
    era: '1990s tube · 27 inches of pure weight',
    story:
      'It took two grown-ups and one pulled muscle to get it up on the dresser. Saturday mornings started here at 6:58 sharp, two minutes before cartoons, so you could sit through the test pattern like a professional.',
    memories: [
      'Rabbit ears wrapped in tinfoil, angled toward wherever the signal felt like being that day.',
      'Touch the screen and every hair on your arm stood up.',
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
      'The clock on it has blinked 12:00 since the day it came home. We set it to record one episode of Goosebumps and it recorded forty minutes of the weather instead.',
    memories: [
      'Eats tapes for fun. Knew a pencil-in-the-reel rescue by age eight.',
      'The tracking button was basically a slot machine.',
      'Late fees from the video store are still technically owed.',
    ],
    photos: [P.vcr, P.vhs],
  },
  {
    id: 'crt-cable',
    title: 'The cable box',
    era: 'Channels 2 through 60',
    story:
      'Somebody always sat on the remote, so the cable box buttons were the real remote. Click through the guide and wait for the Prevue channel to scroll back around to what you wanted. It never did. You watched whatever was on.',
    memories: [
      'The scrambled channels were the forbidden zone. You squinted anyway.',
      'Green numbers glowing in the dark all night like a tiny nightlight.',
    ],
    action: { kind: 'tv', label: 'Turn the TV on' },
  },
  {
    id: 'nes',
    title: 'Nintendo Entertainment System',
    era: '1985 · the gray box',
    story:
      'Step one: blow on the cartridge. Step two: blow on the console. Step three: push it down, hit Power, pray. Step four: the screen flashes, so you blow on it again even though Nintendo said blowing does nothing. It works. It always works.',
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
      'This thing recorded every Top 40 countdown, each one with the DJ talking over the first ten seconds. Mixtapes were made on it with the patience of a bomb technician: finger on Pause, waiting for the song to start.',
    memories: [
      'Ate D batteries like a car eats gas.',
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
      'This Game Boy has survived a drop down the stairs, a long car ride to Grandma\'s and one full Tetris marathon under the covers, with the worm light clipped on so nobody saw. The screen is green, the batteries are always almost dead, and that is perfect.',
    memories: [
      'Four AA batteries lasted about ten hours, or one road trip.',
      'Link cable battles in the backseat.',
      'You had to tilt it toward a lamp to see anything.',
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
      'It got confiscated in math class twice. The first one died during a fire drill. This one has been alive for nine days and it poops more than a real dog. Feed it, play with it, clean up after it, and do not, under any circumstances, let it get sick on a school night.',
    memories: [
      'Hide it in your sock drawer and it beeps at 3 a.m. to be fed.',
      'Pulling the battery tab was the closest thing to opening a present.',
      'Somebody always says theirs evolved into the "good one".',
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
      'This bed has hosted every sleepover, every fort, and at least one "it was the dog" situation that is still not discussed. The quilt has been washed so many times the pattern gave up and went psychedelic.',
    memories: [
      'Monsters live under it. Snacks live under it too, so it evens out.',
      'Jumping on it is illegal. Everybody did it anyway.',
      'Making it every morning was a rule that lasted three days.',
    ],
    photos: [P.quilt],
  },
  {
    id: 'bed-pillow',
    title: 'The smiley pillow',
    era: 'Prize from the fair',
    story:
      'Won it at the fair for three tickets after missing the ring toss eleven times. It has absorbed tears, drool and one whole juice box. Still smiling. Kind of creepy, honestly.',
    memories: ['Best pillow-fight weapon in the house.', 'Smells faintly of Kool-Aid forever.'],
    photos: [P.smiley],
  },
  {
    id: 'backpack',
    title: 'The backpack',
    era: 'One strap only',
    story:
      'Wearing both straps was for nerds, so this lived on one shoulder for six years. Inside: a permission slip from 1996, a flattened Lunchable, three pencils with no erasers, and a library book that is now officially stolen.',
    memories: [
      'Patches and pins added until it weighed five pounds empty.',
      'The zipper broke in October. It stayed broken until June.',
    ],
    photos: [P.backpack],
  },
  {
    id: 'beanbag',
    title: 'The bean bag',
    era: 'The best seat in the house',
    story:
      'Sit down and it swallows you whole. Getting out takes two tries and a noise. One seam leaks little foam beads and they were found in the carpet for years. Grab the Game Boy and sink in.',
    memories: [
      'Everybody fought over it during sleepovers.',
      'Slowly flattens until you\'re basically sitting on the floor in a bag.',
    ],
    photos: [P.beanbag],
  },
  {
    id: 'window',
    title: 'The window',
    era: 'Grounded view',
    story:
      'This is the window you stared out of while grounded, listening to everybody else play outside. The blinds have one bent slat where you peeked out to see if the ice cream truck was real.',
    memories: [
      'Talked to a friend through a can-and-string phone from here once. It did not work.',
      'Summer nights: window open, box fan humming, cicadas screaming.',
    ],
    photos: [P.blinds],
  },
  {
    id: 'window-south',
    title: 'The back window',
    era: 'Streetlight side',
    story:
      'The streetlight outside turned the whole room orange after midnight. Perfect for reading Goosebumps when you were supposed to be asleep, which made the Goosebumps worse.',
    memories: ['Rain on this window was the best sleep sound ever made.'],
    photos: [P.blinds],
  },
  {
    id: 'door',
    title: 'The door',
    era: 'KEEP OUT (this means you)',
    story:
      'This door has slammed in more arguments than any door in history. Every "you\'re not the boss of me" ended here. It never locked properly, which was the entire problem.',
    memories: [
      'Knock first. Nobody knocked first.',
      'The lock could be picked with a butter knife. Everybody in the house knew.',
    ],
  },
  {
    id: 'door-poster',
    title: '"I Want to Believe" poster',
    era: 'The X-Files was on at 9',
    story:
      'Too scared to watch The X-Files, but we still wanted the poster. It stayed on the door so the aliens would know where we stood. Mom thought it was about Jesus.',
    memories: ['Stayed up to watch the intro and then hid under the blanket for the rest.'],
  },
  {
    id: 'door-cap',
    title: 'Space Invaders cap',
    era: 'Worn backwards',
    story:
      'Got this from the arcade prize counter for 4,000 tickets. That is roughly 400 rounds of Skee-Ball and one sprained wrist. It hangs on the door because hats indoors were "disrespectful".',
    memories: ['Worn backwards, obviously.', 'Never washed. Will never be washed.'],
    photos: [P.invaders],
  },
  {
    id: 'door-pins',
    title: 'The pin collection',
    era: 'Planet, smiley, alien, star',
    story:
      'Each pin is a trade. The alien cost two Pokémon cards and a pudding cup. The star came free in a cereal box and is probably made of lead.',
    memories: ['Pinned to the backpack until the backpack ripped.'],
    photos: [P.smiley],
  },
  // ---------- the nightstand ----------
  {
    id: 'nightstand',
    title: 'The nightstand',
    era: 'Mission control',
    story:
      'Everything important within arm\'s reach of the pillow: the alarm clock, the lava lamp, the spare Game Boy, and a drawer of contraband candy that was checked on every night.',
    memories: ['The drawer sticks unless you lift and pull. Learned that by age five.'],
  },
  {
    id: 'ns-clock',
    title: 'Alarm clock',
    era: '9:47 and lying',
    story:
      'It\'s been seven minutes fast since 1994, on purpose, so you\'d "have extra time". You knew it was seven minutes fast. You hit snooze seven times.',
    memories: ['Red numbers you could see from orbit.', 'The power went out once and it blinked 12:00 for a month.'],
    photos: [P.clock],
  },
  {
    id: 'ns-lava',
    title: 'Lava lamp',
    era: 'Mood lighting, 1990s edition',
    story:
      'Takes forty-five minutes to warm up and in that time you will stare at it for forty-five minutes. Do not shake it. We shook it. It went cloudy and never forgave us.',
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
      'Made in an art class for Mother\'s Day, then reclaimed when nobody was looking. Holds exactly one packet of Swiss Miss with too many marshmallows.',
    memories: ['There\'s a fossilised marshmallow at the bottom. Leave it.'],
    photos: [P.mug],
  },
  {
    id: 'ns-teddy',
    title: 'Night-shift bear',
    era: 'Guarding the bed since day one',
    story:
      'This one stays on the nightstand to keep an eye on the closet door. Has never let a single monster through. Perfect record.',
    memories: ['Lost an eye in a tug-of-war. Still on duty.'],
    photos: [P.teddy],
  },
  {
    id: 'ns-recorder',
    title: 'The blue Sony',
    era: 'Tape recorder · pause button pro',
    story:
      'Recorded songs off the radio, prank calls (allegedly), and a forty-minute "radio show" with your cousin that is still somewhere in a shoebox. Somebody should destroy that tape.',
    memories: ['Hearing your own voice on tape for the first time: horrifying.'],
    photos: [P.walkman, P.cassette],
  },
  {
    id: 'ns-yoshi',
    title: 'Yoshi sticker',
    era: 'From a cereal box',
    story:
      'Ate a whole box of cereal in two days to get to this sticker. Put it on the drawer the second it came out. It\'s never coming off. We tried with a butter knife.',
    memories: ['Worth the stomach ache.'],
  },
  {
    id: 'ns-tapes',
    title: 'The bedtime stack',
    era: 'Goosebumps, Space Jam, Sonic, R.L. Stine',
    story:
      'Bottom shelf, for bedtime only, except it was never bedtime when they came out. Read under the blanket with a flashlight until the batteries died, then you had to lie there in the dark thinking about the haunted mask.',
    memories: ['"Reader beware" was not a suggestion.', 'Scholastic book fair day was a national holiday.'],
  },
  {
    id: 'ns-vhs',
    title: 'Movie night tapes',
    era: 'Toy Story, Hocus Pocus, Jurassic Park',
    story:
      'Watched every October and most Tuesdays. Hocus Pocus is worn thin right at the part where they sing. Jurassic Park has a little crinkle in the kitchen scene from being paused too many times.',
    memories: ['Rewind before returning. We never returned these.'],
    photos: [P.vhs],
  },
  {
    id: 'ns-gameboy',
    title: 'Backup Game Boy',
    era: 'For emergencies',
    story:
      'The spare one, for when the main Game Boy\'s batteries died at the worst possible moment. Took the batteries out of the TV remote to keep it running. Blamed the remote on the cat.',
    memories: ['Every house had one TV remote with no batteries in it. This is why.'],
    photos: [P.gameboy],
  },
  // ---------- the high shelf on the south wall ----------
  {
    id: 'south-shelf',
    title: 'The high shelf',
    era: 'Display only, do not touch',
    story:
      'The good stuff lives up here where little cousins can\'t reach. Lava lamp, the big teddy, the Game Boy you\'re not allowed to bring to school, and the View-Master that nobody remembers how to load.',
    memories: ['Needed the desk chair to reach it. The chair spins. That went great.'],
  },
  {
    id: 'sh-lava',
    title: 'The other lava lamp',
    era: 'Yes, we had two',
    story:
      'Birthday present from the aunt who gave everybody lava lamps. This one took a full hour to bloop. Turn it on before homework and check on it every five minutes instead of doing homework.',
    memories: ['If the blobs stick at the top, it\'s too hot. Nobody listened.'],
    photos: [P.lava],
  },
  {
    id: 'sh-vhs',
    title: 'Home Alone, Jurassic Park, Aladdin',
    era: 'The holy trinity',
    story:
      'Every kid tried a Home Alone trap at least once. Ours was a paint can on a string over the door, and it got Dad. We were not allowed to watch Home Alone for a while after that.',
    memories: [
      '"Keep the change, ya filthy animal."',
      'The Aladdin tape is the white clamshell one. The good one.',
    ],
    photos: [P.vhs],
  },
  {
    id: 'sh-car',
    title: 'Red Hot Wheels',
    era: 'Fastest car on the orange track',
    story:
      'This one won every race on the orange track loop-de-loop, except when it flew off and hit the dog. It has paint chips from launching it off the stairs, for science.',
    memories: ['The orange track connectors left marks on everything.'],
    video: V('DET-012_52007-52915', 'Hot Wheels Attack Pack commercial, 1993'),
  },
  {
    id: 'sh-teddy',
    title: 'Big Ted',
    era: 'Retired with honors',
    story:
      'Big Ted has been through the washing machine four times and a tea party with very strict rules. Retired to the high shelf when you got "too old for teddy bears". He still comes down during thunderstorms.',
    memories: ['The bow tie has been retied by every person in the family.'],
    photos: [P.teddy],
  },
  {
    id: 'sh-gameboy',
    title: 'The good Game Boy',
    era: 'Not allowed at school',
    story:
      'The one that went to school once, got confiscated, and spent a terrifying weekend in the principal\'s desk. It lives up here now. Safe.',
    memories: ['The principal definitely played it over the weekend.'],
    photos: [P.gameboyFl],
  },
  {
    id: 'sh-turtle',
    title: 'Leonardo',
    era: 'Leads, does not do machines',
    story:
      'Everybody wanted to be Raphael or Michelangelo, so you got stuck with Leonardo and acted like you didn\'t care. You cared. Both swords got lost by Christmas.',
    memories: ['"Cowabunga" was a full answer to any question.', 'Turtle-shaped pizza was technically just pizza.'],
    photos: [P.tmnt],
    video: V('teenage-mutant-ninja-turtles-toon-turtles-action-figure-commercial', 'TMNT Toon Turtles action figure commercial'),
  },
  {
    id: 'sh-viewmaster',
    title: 'View-Master',
    era: 'Click. Click. Click.',
    story:
      'Seven tiny pictures in 3D, and somehow you looked at the same Grand Canyon reel four hundred times. Pointing it at the lamp made it work better. Pointing it at the sun was a mistake.',
    memories: ['The orange lever had the most satisfying click in history.'],
    photos: [P.viewmaster],
    video: V('youtube-JxG0HuHNqKU', 'Talking View-Master commercial, 1983'),
  },
  {
    id: 'sh-books',
    title: 'Goosebumps & The Lost World',
    era: 'Too scary, read it anyway',
    story:
      'The Lost World was way too long for a fifth grader but it had a T. rex on the cover, so you carried it around to look smart. Goosebumps you actually read. Twice.',
    memories: ['Night of the Living Dummy ruined ventriloquists forever.'],
  },
  // ---------- toy cubby on the east wall ----------
  {
    id: 'toyshelf',
    title: 'The toy cubby',
    era: 'Where everything got thrown at cleanup time',
    story:
      '"Clean your room" meant throwing everything into these bins in under ninety seconds. Archaeologists will one day find a Pokémon box, three socks and a single roller skate in here.',
    memories: ['The bins never closed. They were never meant to close.'],
  },
  {
    id: 'ts-teddy',
    title: 'Scruffy',
    era: 'Loved too hard',
    story:
      'Scruffy went everywhere: the store, the car, the bath, the dog\'s mouth once. All the fur rubbed off one ear from being held while falling asleep.',
    memories: ['Mom sewed his arm back on during a sleepover emergency.'],
    photos: [P.teddy],
  },
  {
    id: 'ts-handheld',
    title: 'Pocket game',
    era: 'Tiger handheld energy',
    story:
      'One game, one sound effect, no pause button. It came from a birthday party goodie bag and kept everybody busy for a whole car ride.',
    memories: ['The beep could not be turned off. Parents tried.'],
  },
  {
    id: 'ts-clock',
    title: 'Clock radio',
    era: 'Woke you up to the morning DJ',
    story:
      'Set it to the radio instead of the buzzer and woke up to a stranger yelling about traffic. Hit snooze, dreamed about traffic.',
    memories: ['The radio station only came in if the antenna wire touched the window.'],
    photos: [P.clock],
  },
  {
    id: 'ts-skateboard',
    title: 'The RAD skateboard',
    era: 'Mostly for sitting on',
    story:
      'Learned exactly one trick: sitting on it and rolling down the driveway. Still a skater. The griptape shredded three pairs of jeans and one knee.',
    memories: ['The stickers are worth more than the board.'],
    photos: [P.skate],
  },
  {
    id: 'ts-vhs',
    title: 'Recorded-off-TV tapes',
    era: 'Labels in three handwritings',
    story:
      'Half these tapes say one thing on the label and have something completely different on them. The one marked "Lion King" is a Bears game and twenty minutes of a cooking show.',
    memories: ['Commercials included, which, honestly, were the best part.'],
    photos: [P.vhsKodak],
  },
  {
    id: 'ts-lava',
    title: 'Orange lava lamp',
    era: 'The tall one',
    story:
      'This is the tall one that glows like a campfire. Turn the big light off, turn this on, and the whole room looks like the inside of a fruit roll-up.',
    memories: ['It took up the entire desk outlet. Nobody could charge anything.'],
    photos: [P.lava],
  },
  {
    id: 'ts-pokebox',
    title: 'Pokémon bin',
    era: 'Gotta catch \'em all, gotta store \'em somewhere',
    story:
      'Card binders, a Pikachu that talks when you squeeze it too hard, and the box the Game Boy Pokémon came in. The Charizard is not in here. Nobody knows where the Charizard went. Ask your cousin.',
    memories: ['Banned at school by October 1999.'],
    photos: [P.pokemon],
    video: V('2000-commercial-for-pokemon-trading-card-game', 'Pokémon Trading Card Game commercial, 2000'),
  },
  {
    id: 'ts-magazines',
    title: 'Magazine bin',
    era: 'Strategy guides and posters',
    story:
      'Game magazines with the cheat codes circled in pen, a poster pulled out of the middle, and an order form for sea-monkeys that we did fill out.',
    memories: ['Up, Up, Down, Down, Left, Right, Left, Right, B, A, Start.'],
  },
  // ---------- the game shelf ----------
  {
    id: 'shelf',
    title: 'The game closet',
    era: 'String lights stay on all year',
    story:
      'Every family game night started with an argument here about which game, and ended with somebody flipping the Monopoly board. The Christmas lights went up in 1995 and were never taken down.',
    memories: ['Half the boxes are missing pieces. The other half have pieces from other boxes.'],
  },
  {
    id: 'gs-helmet',
    title: 'Bills helmet',
    era: 'Four Super Bowls in a row',
    story:
      'Four straight Super Bowl trips in the early 90s, and that\'s all we\'ll say about that. Wore it in the backyard for every big game and tackled the hedges.',
    memories: ['Football in the yard ended when somebody cried. Usually you.'],
  },
  {
    id: 'gs-smiley',
    title: 'Smiley lamp',
    era: 'Have a nice day',
    story:
      'A glowing smiley face that stays on all night and stares directly at the bed. Comforting when you\'re five. Terrifying at eleven. Back to comforting at thirty.',
    memories: ['Won it at the fair along with a goldfish that lasted three days.'],
    photos: [P.smiley],
  },
  {
    id: 'gs-plant',
    title: 'The plant',
    era: 'Somehow alive',
    story:
      'Nobody waters this plant. Nobody has ever watered this plant. It is thriving. Science can\'t explain it.',
    memories: ['Got the leftover Kool-Aid once. Grew an inch.'],
  },
  {
    id: 'gs-lights',
    title: 'The string lights',
    era: 'Christmas, forever',
    story:
      'Put up for Christmas 1995 and never taken down, because the room just looked better. One bulb goes out and you have to test every single bulb on the strand. It took an entire Saturday.',
    memories: ['Unplug them at night or they "start fires" (they never started fires).'],
  },
  // ---------- dresser ----------
  {
    id: 'dresser',
    title: 'The dresser',
    era: 'Sticker museum',
    story:
      'Nobody was allowed to put stickers on the furniture. We put stickers on the furniture. Now the dresser is basically a history book: Mario, Yoshi, No Fear, and a smiley face that won\'t come off.',
    memories: ['Bottom drawer: clothes. Top drawer: anything important.'],
  },
  {
    id: 'dr-stickers',
    title: 'Mario & Yoshi stickers',
    era: 'Nintendo Power freebies',
    story:
      'They came free in a magazine and went straight onto the dresser before anybody could stop it. They\'ve survived three moves and one aggressive scrubbing.',
    memories: ['Peeling one off halfway and then putting it back was worse than leaving it.'],
  },
  {
    id: 'dr-nofear',
    title: 'No Fear sticker',
    era: 'The most 90s sentence',
    story:
      'No Fear shirts had sayings like "Second place is the first loser". We thought that was deep. Put this sticker on the dresser and immediately got scared of getting caught.',
    memories: ['Fear: medium.'],
  },
  // ---------- the cluttered desk (west) ----------
  {
    id: 'clutterdesk',
    title: 'The homework desk',
    era: 'Homework was never done here',
    story:
      'This desk was for homework. It was used for building Lego, drawing, eating pizza rolls, playing Super Nintendo with the sound off, and hiding the report card. Homework happened on the bus.',
    memories: ['Every drawer is a junk drawer.', 'The stickers are load-bearing.'],
  },
  {
    id: 'cd-lava',
    title: 'Desk lava lamp',
    era: 'Homework mood lighting',
    story:
      'Turned on "to help focus". Spent the next hour naming the blobs. That one\'s Gary. Gary just split into two Garys.',
    memories: ['Do not put your crayons next to it. Learned that the waxy way.'],
    photos: [P.lava],
  },
  {
    id: 'cd-cup',
    title: 'Smiley pencil cup',
    era: 'Full of pens that don\'t work',
    story:
      'Twenty pens in here and not one writes. Somehow you keep putting dead pens back in. There\'s a gel pen at the bottom that smells like grapes.',
    memories: ['Click pens: clicked eight thousand times during tests.'],
    photos: [P.pencils],
  },
  {
    id: 'cd-tapes',
    title: 'Video game tape stack',
    era: 'Rented, not returned',
    story:
      'A stack from the rental store, a couple of them still in their own cases with the store\'s sticker. The late fee is now worth more than the store.',
    memories: ['Blockbuster night was a Friday-night ritual.'],
    photos: [P.vhs],
  },
  {
    id: 'cd-car',
    title: 'Red sports car',
    era: 'Dream car, 1:64 scale',
    story:
      'Somebody\'s going to buy this car for real one day. Somebody being you. Until then it lives next to the lava lamp, doing laps around the pencil cup.',
    memories: ['Engine noises: done with your mouth, very loud.'],
    video: V('hotwheels-commercial', 'Hot Wheels commercial, 1980s'),
  },
  {
    id: 'cd-clock',
    title: 'Clock radio',
    era: '5:41 · way too early',
    story:
      'The alarm was set for paper-route time once, as a business venture. The business lasted a week. The alarm stayed at 5:41 for another year because nobody knew how to change it.',
    memories: ['Hitting the snooze button blind in the dark is a skill.'],
    photos: [P.clock],
  },
  {
    id: 'cd-phone',
    title: 'Brick phone',
    era: 'Only for emergencies',
    story:
      'Mom\'s old phone, "only for emergencies". Every time it was used was not an emergency. Twenty minutes of Snake counts as a call to grandma, right?',
    memories: ['Ringtone: composed yourself, note by note, one awful afternoon.'],
    photos: [P.nokia],
    video: V('nokia-1998-tv-commercial-drew-carey', 'Nokia commercial, 1998'),
  },
  {
    id: 'cd-pogs',
    title: 'POGs',
    era: 'Playing for keeps',
    story:
      'POGs got banned at school because a kid lost his whole collection playing "for keeps" and cried in the nurse\'s office. The heavy slammer on top is the one that won all these.',
    memories: ['The skull slammer was the most powerful object in the cafeteria.', 'Named after a juice. Nobody drank the juice.'],
    photos: [P.pogs],
  },
  {
    id: 'cd-sketch',
    title: 'The sketchbook (and the Cool S)',
    era: 'Graffiti letters, every page',
    story:
      'Every page is the same cool S, over and over, plus a dragon that doesn\'t look like a dragon. Everyone drew the S. Nobody knows who invented the S.',
    memories: ['Drew in the margins of every worksheet too.', 'Back page: fake signatures, practicing for the report card.'],
    photos: [P.sketchbook],
  },
  {
    id: 'cd-lamp',
    title: 'Desk lamp',
    era: 'Burns fingers on contact',
    story:
      'The bulb got so hot you could warm up a Hot Pocket on it. We did not try that. Okay, we tried that.',
    memories: ['Pointed at your face during "interrogations" with your little brother.'],
    photos: [P.lamp],
  },
  {
    id: 'cd-frog',
    title: 'Little green guy',
    era: 'Came free with a kid\'s meal',
    story:
      'Came free with a kid\'s meal. Worth more than the meal. He\'s been the desk lamp\'s security guard ever since.',
    memories: ['Had a name once. Nobody remembers it.'],
    photos: [P.figures],
  },
  {
    id: 'cd-8ball',
    title: 'Magic 8 Ball',
    era: 'Reply hazy, try again',
    story:
      'Asked it if you\'d pass the spelling test. It said "Outlook not so good". It was right. Asked it if your crush liked you back. It said "Ask again later". It\'s been later for a long time.',
    memories: ['Shook it until it gave you the answer you wanted.'],
    photos: [P.eightBall],
  },
  {
    id: 'cd-photo',
    title: 'The photo',
    era: 'School picture day',
    story:
      'School picture day: laser background, a comb the photographer used on everyone, and a smile you practiced in the mirror. Ordered the wallet sizes, gave them to everybody.',
    memories: ['The retake was somehow worse.'],
  },
  {
    id: 'cd-tmnt',
    title: 'Ninja Turtles cup',
    era: 'From the pizza place',
    story:
      'This cup came with a large pizza and a toy that broke in the car. It holds markers now. Smells faintly of Sprite and a little like pizza.',
    memories: ['Turtle Power.'],
    photos: [P.markers],
    video: V('tmnt-pizza_202509', 'Pizza Hut Ninja Turtles kids meal commercial, 1990'),
  },
  {
    id: 'cd-walkman',
    title: 'Walkman',
    era: 'Headphones on, world off',
    story:
      'Bus rides were a whole movie with this on. The foam earpieces were orange once. Now they\'re a color science doesn\'t have a name for. Auto-reverse was basically magic.',
    memories: ['Rewinding a tape with a pencil to save batteries.', 'The tape got eaten right at the best part. Every time.'],
    photos: [P.walkmanFamily, P.cassette],
    video: V('walkmandec81', 'Walkman commercial, 1981'),
  },
  {
    id: 'cd-snes',
    title: 'Donkey Kong Country cartridge',
    era: 'Super Nintendo · 1994',
    story:
      'Christmas morning 1994. Unwrapped, plugged in, played until the TV got hot. The minecart levels made grown men throw controllers. This cartridge has seen things.',
    memories: ['Blowing on SNES carts did nothing either. We did it anyway.'],
    photos: [P.snesCarts, P.snes],
    video: V('Super_Nintendo_commercial_1992', 'Super Nintendo commercial, 1992'),
  },
  {
    id: 'cd-yoyo',
    title: 'Yo-yo',
    era: 'Walk the dog, hit the dog',
    story:
      '"Walk the dog" actually hit the dog. "Around the world" hit the lamp. "Rock the baby" got the string tangled into a knot that\'s still in there.',
    memories: ['The yo-yo guy came to school and everybody bought one that afternoon.'],
    photos: [P.yoyo],
    video: V('youtube-dfqykR14O3Y', 'Duncan Yo-yo commercial, 1976'),
  },
  {
    id: 'cd-sonic',
    title: 'Sonic tape',
    era: 'Gotta go fast',
    story:
      'The Sonic cartoon taped off Saturday morning TV. Sonic vs Mario was the real war of the 90s, and this desk was Switzerland: both of them lived here.',
    memories: ['Chili dogs became the only acceptable food for a month.'],
  },
  {
    id: 'cd-vhs',
    title: 'The movie row',
    era: 'Space Jam on top',
    story:
      'Space Jam came out and everybody tried to dunk like Michael Jordan on the mini hoop on the closet door. Monstars were the scariest villains ever made, change my mind.',
    memories: ['The Space Jam soundtrack lived in the Walkman for a year.'],
    photos: [P.vhs],
    video: V('trailer-for-space-jam', 'Space Jam trailer, 1996'),
  },
  {
    id: 'cd-trophy',
    title: 'Participation trophy',
    era: 'Everybody won',
    story:
      'Tee-ball, 1995. The team lost every single game and everybody got a trophy anyway. It\'s gold-colored plastic and it is the proudest thing on this desk.',
    memories: ['Orange slices at halftime were the actual reason anybody played.'],
  },
  {
    id: 'cd-stickers',
    title: 'Drawer stickers',
    era: 'Skater, No Fear, Saturn',
    story:
      'Every drawer has a sticker from a different phase: the skater phase, the space phase, the No Fear phase. The drawers are a timeline of who you were trying to be.',
    memories: ['The planet sticker glows in the dark if the lights were on long enough.'],
  },
  {
    id: 'cd-chair',
    title: 'The spinny chair',
    era: 'Mission control',
    story:
      'Its main job: spin until you feel sick, then spin back the other way to "unwind". The cushion has a hole that grows a little every year. It still rolls perfectly to the TV.',
    memories: ['Office chair races down the hallway. Banned.'],
    photos: [P.chair],
  },
  // ---------- the plain desk (east) ----------
  {
    id: 'desk',
    title: 'The other desk',
    era: 'The "nice" desk',
    story:
      'The desk that was supposed to stay clean for company. It stayed clean for about a week. The books on top have never been opened. They\'re for decoration and looking smart.',
    memories: ['Has a drawer that only opens if you kick it.'],
  },
  {
    id: 'dk-books',
    title: 'Goosebumps, Space Jam & Sonic',
    era: 'Book order day',
    story:
      'The Scholastic book order form came home and every box got checked. Mom said pick two. We picked four and hid the other two in the stack.',
    memories: ['The scent of a new book order box.', 'A free poster came with the order.'],
  },
  {
    id: 'dk-vhs',
    title: 'Horror tape row',
    era: 'Too young for these',
    story:
      'Tapes that were "for when you\'re older". You watched them at a sleepover anyway and slept with the light on for a week.',
    memories: ['Just one more chapter of a scary tape became a whole movie.'],
  },
  {
    id: 'dk-photo',
    title: 'Anime picture',
    era: 'Saturday morning cartoons',
    story:
      'Drew this off the TV, paused on the exact frame, then framed it. The VCR\'s pause made everything shaky, so the drawing is shaky too.',
    memories: ['Woke up at 6 for the cartoons. Woke up at 11 on school days.'],
  },
  {
    id: 'dk-pencils',
    title: 'Pencil cups',
    era: 'Every color but the one you need',
    story:
      'Colored pencils for the state project, all sharpened to a point except the one color you need for the ocean. Someone always took the blue.',
    memories: ['Electric pencil sharpeners: ate half the pencil every time.'],
    photos: [P.pencils],
  },
  {
    id: 'dk-pager',
    title: 'Pager',
    era: '143 = I love you',
    story:
      'Found in a drawer, borrowed from an older cousin. You only knew three codes: 911, 143 and 07734, which is "hello" upside down on a calculator.',
    memories: ['Nobody ever paged you. You checked it anyway.'],
    photos: [P.pager],
  },
  {
    id: 'dk-lamp',
    title: 'Black desk lamp',
    era: 'Homework spotlight',
    story:
      'Pointed at the homework like an interrogation light. The homework never confessed.',
    memories: ['Bends in every direction except the one you need.'],
    photos: [P.lamp],
  },
  {
    id: 'dk-sticker',
    title: 'Warning sticker',
    era: 'Danger: kid inside',
    story:
      'Peeled off a box of something from the garage and stuck it on the desk because it looked cool. No idea what it was warning about. Probably fine.',
    memories: ['Nothing bad has happened. Yet.'],
  },
  // ---------- little things on the floor and walls ----------
  {
    id: 'gushers',
    title: 'Fruit Gushers',
    era: 'Snack trading currency',
    story:
      'At lunch one pack of Gushers could buy two Fruit Roll-Ups and a Capri Sun, or one pudding cup if the market was bad. Bite down and your head turns into a fruit, said the commercial. Did not happen. Still tried.',
    memories: ['Gushers were worth more than money in the cafeteria.'],
    photos: [P.gushers],
    video: V('fruit-gushers-1992-commercial', 'Fruit Gushers commercial, 1992'),
  },
  {
    id: 'cards',
    title: 'Pokémon cards',
    era: '1999 · Base Set',
    story:
      'The pile on the floor is the trade pile, the doubles and the "you can have it" cards. The binder is somewhere safe. The holographic Charizard was traded for a bike and that is a decision we live with.',
    memories: [
      'Sleeves that never fit. Rubber bands that ruined everything.',
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
      'Two minutes in the microwave: lava on the outside, still frozen in the middle. Pizza rolls were worse, a little pocket of sun that burned the roof of your mouth every time. Every time. We never learned.',
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
      'Saved birthday money for six months for these. Wore them once outside, got a scuff, cried, and they\'ve lived on the floor next to the shelf ever since, toes pointed out like they\'re on display. Because they are.',
    memories: ['Pump them up, lace them tight, walk weird so they don\'t crease.'],
    photos: [P.jordans],
  },
  {
    id: 'car',
    title: 'RC trucks',
    era: 'Batteries not included',
    story:
      'Christmas morning: three RC trucks and zero batteries in the whole house. Had to wait till the store opened on the 26th. Then they drove under the bed and never came out for three years.',
    memories: ['The remotes used the same frequency, so racing friends was chaos.'],
  },
  {
    id: 'hotwheels',
    title: 'Hot Wheels track',
    era: '1968 · Mattel · orange track forever',
    story:
      'It started as one loop. Then the track went off the toy shelf, under the bed, across the hallway and down the stairs, held together with tape and a dictionary for the jump. Every car got launched off it at least once. Only the slow, ugly station wagon ever made it all the way through the loop.',
    memories: [
      'The orange track doubled as a sword, a whip and the thing Mom swore she\'d throw out.',
      'Zero to sixty in one flick of the finger. Sixty to under the couch forever.',
      'Somebody always said their car was "the fastest" and then it flew off the first curve.',
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
      'Hundreds of them. Whole battles across the carpet, the bed, the bathtub. The guy with the bazooka was the most valuable soldier. The guy lying down with the rifle could never stand up for anything.',
    memories: ['Stepping on one barefoot is worse than Lego. Fight us.'],
    photos: [P.army],
    action: { kind: 'army', label: 'Send the troops!' },
  },
  {
    id: 'ispy-book',
    title: 'I Spy',
    era: '1992 · Scholastic · picture riddles by Jean Marzollo & Walter Wick',
    story:
      'Every Scholastic book fair it was right there on the front table, shrink-wrapped, $12.95, and you had exactly 85 cents and a pencil topper. So you checked it out from the school library instead. Then you checked it out again. Then it just sort of... lived under your bed. This copy still has the library pocket glued in the front. The due date says October 1998. The librarian has not forgotten.',
    memories: [
      'Somebody always circled the answers in pen, so every library copy was already half solved.',
      'Walter Wick built every page with real toys and photographed it. No computers. Just a guy with a LOT of marbles.',
      'The riddles rhyme, so you read them in a sing-song voice whether you wanted to or not.',
      'Late fee is ten cents a day. It has been a while. The librarian is now playing I Spy with YOU, and you are the missing book.',
    ],
    video: V('how-i-spy-books-are-made', "How 'I Spy' books are made"),
    action: { kind: 'ispy', label: 'Open the book' },
  },
  {
    id: 'furby',
    title: 'Furby',
    era: '1998 · the Christmas everyone fought over',
    story:
      'Mom stood in line at Toys"R"Us at 6 a.m. for this one, and a lady in the next aisle offered her a hundred dollars for it. It speaks Furbish, it learns English the longer you keep it, and it has no off switch. None. The only way to shut it up is to take the batteries out with a screwdriver, and it wakes up in the middle of the night anyway to say "me sleepy" in a dark closet.',
    memories: [
      'The NSA actually banned Furbies from its offices in 1999 in case they were recording secrets. They weren\'t. They were just saying "kah may-may".',
      'Two Furbies in the same room will talk to each other forever. Nobody knows what they\'re planning.',
      'Feed it too much and it gets sick. Turn it upside down and it screams. Turn off the light and it snores. Basically a little brother.',
      'Somebody at school swore you could make it say a bad word. You could not.',
    ],
    photos: [P.furby, P.furbyBoxed],
    video: V('youtube-ouh2Q_-pYLQ', 'Tiger Electronics Furby TV commercial'),
    action: { kind: 'furby', label: 'Pick it up' },
  },
  {
    id: 'armor',
    title: 'Action figure',
    era: 'Cool guy with a backpack',
    story:
      'Came with tiny guns and a tiny backpack, all lost within the first hour. He keeps watch over the NES now, which is a very important job.',
    memories: ['Had a real name and a whole backstory on the card. Never read it.'],
    photos: [P.figures],
  },
  {
    id: 'rubik',
    title: "Rubik's Cube",
    era: 'Solved once, by peeling the stickers',
    story:
      'Never solved it legit. Peeled the stickers off and put them back once, and showed everybody. Nobody believed it. They were right not to.',
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
      'Every tape here has been watched so many times the box art is worn white at the corners. Power Rangers on the tape, a little white rental sticker on the spine. The Pokémon tape has the Pikachu Thunderbolt part worn out.',
    memories: [
      'Fast-forwarding through the previews while holding Play so you could see them speed by.',
      'Be kind, rewind.',
    ],
    photos: [P.vhs, P.vhsKodak],
  },
  {
    id: 'vhs-loose',
    title: 'Loose tapes',
    era: 'Out of their cases',
    story:
      'Tapes out of their cases, because the cases were in the other room, because nobody puts things back. One is labeled "DO NOT TAPE OVER" and has been taped over.',
    memories: ['The cases are somewhere. Probably.'],
    photos: [P.vhsKodak],
  },
  {
    id: 'books',
    title: 'The book stack',
    era: 'Book report material',
    story:
      'Goosebumps, Harry Potter, Captain Underpants. Somebody snuck a Diary of a Wimpy Kid in here and it\'s from the wrong decade. Clearly a little brother.',
    memories: ['Book reports written from the back cover only.'],
  },
  {
    id: 'poster-pokemon',
    title: 'Pokémon poster',
    era: 'Came with the magazine',
    story:
      'Pulled from the middle of a magazine. The staple holes are right through Pikachu\'s face. It\'s still the best poster in the room.',
    memories: ['Taped up, fell down, taped up again with way more tape.'],
  },
  {
    id: 'poster-mummy',
    title: 'The Mummy poster',
    era: '1999 · watched at a sleepover',
    story:
      'The scarab beetle scene. That\'s all there is to say. Nobody slept.',
    memories: ['The poster faces the bed. That was a mistake.'],
  },
  {
    id: 'poster-giant',
    title: 'The Iron Giant poster',
    era: '1999',
    story:
      '"Superman." If you know, you know. Watched it once at a sleepover and three kids cried and said they had something in their eye.',
    memories: ['Everyone wanted a giant robot friend after this.'],
  },
  {
    id: 'poster-babe',
    title: 'Babe poster',
    era: '1995 · that\'ll do, pig',
    story:
      'Got it free with a Happy Meal. Sang "La la la" around the house for a month. Nobody in the house ate bacon for a week after the movie.',
    memories: ['"That\'ll do, pig. That\'ll do."'],
  },
];

export const PROP_CARDS: Record<string, PropCard> = Object.fromEntries(CARDS.map(card => [card.id, card]));

/** Old ids from before the shelf got its own card. */
const ALIASES: Record<string, string> = { teddy: 'south-shelf' };

export function propCardFor(id: string): PropCard | null {
  return PROP_CARDS[id] ?? PROP_CARDS[ALIASES[id] ?? ''] ?? null;
}
