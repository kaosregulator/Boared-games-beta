import type { TriviaQuestion } from '../../types/trivia';

/**
 * Throwback Trivia, for a kid born in 1991 and the class that grew up next to them.
 * Pictures are free-licensed files on Wikimedia Commons. Commercials stream from
 * the Internet Archive. Every tune is original and lives in src/utils/chiptunes.ts.
 */

function photo(file: string, credit: string, alt: string) {
  return {
    src: `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=960`,
    credit: `${credit} · Wikimedia Commons`,
    alt,
  };
}

const STREETLIGHT = photo(
  'Dusk (37147528873).jpg',
  'CC0, sodium street light at dusk',
  'A sodium street light glowing pink-orange at dusk',
);
const PANTS = photo(
  'Parachute Pant SR-71 Pilot Suit.jpg',
  'CC0, Tim-desser',
  'Shiny nylon parachute pants',
);
const PET = photo('Tamagotchi 0124 ubt.jpeg', 'Tomasz Sienicki, CC BY-SA 3.0', 'A Tamagotchi virtual pet');
const BOY = photo('Game-Boy-Original.jpg', 'Evan-Amos, public domain', 'An original gray Game Boy');
const TAPE = photo('VHS cassette with ruler.jpg', 'Damian Yerrick, public domain', 'A VHS cassette');
const JORDAN = photo('Nike Air Jordan I.jpg', 'Osyffar, CC0', 'Nike Air Jordan I sneakers');
const BRICK = photo('Nokia 5110.jpg', 'Soltys0, CC BY-SA 2.5', 'A Nokia 5110 phone');
const POG = photo('POG Carton at supermarket.png', 'SilliGuy.wiki, CC0', 'A carton of POG juice');
const POCKET = photo('Hot pocket.jpg', 'Schuym1, CC BY-SA 3.0', 'A Hot Pocket');
const SNES = photo('SNES-Mod1-Console-Set.png', 'Evan-Amos, CC BY-SA 3.0', 'A Super Nintendo');
const CARDS = photo('Pokemon cards and sets.jpg', 'Fernando Martello, CC BY-SA 4.0', 'Pokémon cards');

export const NOSTALGIA_DECK: TriviaQuestion[] = [
  // ----- pictures that fade in -----
  {
    id: 'tb_lights',
    category: 'laugh',
    type: 'picture_fade',
    question: 'We all knew what this meant. Nobody had to yell it. What just happened?',
    options: ['The streetlights came on', 'The ice cream truck left', 'Report cards came out', 'The pool closed for the year'],
    correctIndex: 0,
    explanation:
      'Sodium lamps bloom pink, then orange, and the whole block got the same message: go home. If you were still out, you were already late. That hush under the picture is our own lamp-hum, not a recording. Photo: CC0, Wikimedia Commons.',
    points: 1200,
    timeLimitSeconds: 18,
    fadeSeconds: 11,
    chiptuneId: 'dusk_hum',
    photo: STREETLIGHT,
  },
  {
    id: 'tb_pants',
    category: 'style',
    type: 'picture_fade',
    question: 'They whooshed when you walked, like a tiny parachute had opinions. What are these?',
    options: ['Parachute pants', 'JNCOs', 'Corduroys', 'Sweatpants with the knees blown out'],
    correctIndex: 0,
    explanation:
      'Nylon parachute pants came out of early-80s breaking and were still in somebody\'s closet when you were little — an older cousin, a thrift-store find, a dare. They announced you from the hallway. Photo: CC0, Wikimedia Commons. Wikipedia: parachute pants.',
    points: 1100,
    timeLimitSeconds: 16,
    fadeSeconds: 10,
    photo: PANTS,
  },
  {
    id: 'tb_pet',
    category: 'picture',
    type: 'picture_fade',
    question: 'It needed you more than long division did. What died under the desk during a test?',
    options: ['A Tamagotchi', 'A Furby', 'A Giga Pet that was fine, actually', 'The class goldfish'],
    correctIndex: 0,
    explanation:
      'Bandai\'s Tamagotchi hatched in Japan in November 1996 and hit the US in 1997. You were not allowed to press the buttons. You did it anyway, and then you held a funeral in your pencil case. Wikipedia: Tamagotchi. Photo: Tomasz Sienicki, CC BY-SA 3.0.',
    points: 1000,
    timeLimitSeconds: 16,
    fadeSeconds: 9,
    photo: PET,
  },
  {
    id: 'tb_boy',
    category: 'video_games',
    type: 'picture_fade',
    question: 'Pea-green screen, no backlight, and you still played it under the covers. What is this?',
    options: ['The original Nintendo Game Boy', 'A Sega Game Gear', 'A Nokia 5110', 'A TV remote from 1994'],
    correctIndex: 0,
    explanation:
      'The gray brick shipped in 1989 and was still the handheld on the bus when you were in elementary school. Tetris came in the box. The wormlight was a later mercy. Photo: Evan-Amos, public domain.',
    points: 1000,
    timeLimitSeconds: 14,
    fadeSeconds: 8,
    photo: BOY,
  },
  {
    id: 'tb_tape',
    category: 'heart',
    type: 'picture_fade',
    question: 'Someone wrote a title on the label in kid handwriting. What is actually on this tape?',
    options: [
      'Three cartoons, a birthday, and the news an uncle taped over',
      'One clean movie, start to finish',
      'A video game you can boot',
      'Nothing. It is still sealed.',
    ],
    correctIndex: 0,
    explanation:
      'A handwritten VHS was a fossil. You pressed play for the cartoon and got a birthday you forgot, then static, then the news. You did not tape over it. That was a rule you made up yourself. Photo: Damian Yerrick, public domain.',
    points: 1300,
    timeLimitSeconds: 18,
    fadeSeconds: 12,
    chiptuneId: 'heart_porch',
    photo: TAPE,
  },
  {
    id: 'tb_jordans',
    category: 'style',
    type: 'picture_fade',
    question: 'These were not "shoes." These were a personality. What are they?',
    options: ['Air Jordan I', 'Light-up LA Gear', 'Velcro sneakers for gym', 'Moon Boots'],
    correctIndex: 0,
    explanation:
      'The Air Jordan I landed in 1985 and never really left the floor of a 90s bedroom. Clean, or at least clean on picture day. Photo: CC0, Wikimedia Commons.',
    points: 1000,
    timeLimitSeconds: 14,
    fadeSeconds: 8,
    photo: JORDAN,
  },
  {
    id: 'tb_nokia',
    category: 'picture',
    type: 'picture_fade',
    question: 'Snake lived in here, and so did every number you were afraid to lose. What is it?',
    options: ['A Nokia 5110', 'A pager', 'A Tamagotchi', 'A Walkman'],
    correctIndex: 0,
    explanation:
      'The Nokia 5110 showed up in 1998. It could survive a drop off the porch, which is more than your feelings could. The commercial is out there on the Internet Archive if you want Drew Carey yelling about one. Photo: Soltys0, CC BY-SA 2.5.',
    points: 1000,
    timeLimitSeconds: 14,
    fadeSeconds: 8,
    photo: BRICK,
  },
  {
    id: 'tb_pog',
    category: 'laugh',
    type: 'picture_fade',
    question: 'Schools banned the game. The juice was innocent. What is this carton really a clue for?',
    options: ['POGs', 'Capri Sun', 'Lunchables', 'Hi-C Ecto Cooler'],
    correctIndex: 0,
    explanation:
      'POGs — milk caps, slammers, "for keeps" — got banned in a lot of elementary schools because somebody always cried in the office. The drink on the carton is the namesake. Photo: CC0, Wikimedia Commons.',
    points: 1100,
    timeLimitSeconds: 14,
    fadeSeconds: 8,
    photo: POG,
  },
  {
    id: 'tb_pocket',
    category: 'laugh',
    type: 'picture_fade',
    question: 'The outside is a liar. The inside is lava. What did you just bite?',
    options: ['A Hot Pocket', 'A Lunchable pizza', 'A fruit snack', 'A toaster waffle'],
    correctIndex: 0,
    explanation:
      'The first law of the microwave: the crust feels fine and the cheese does not. Hot Pockets were everywhere by the early 90s, and the 1992 commercial is still on the Internet Archive. Photo: Schuym1, CC BY-SA 3.0.',
    points: 1000,
    timeLimitSeconds: 14,
    fadeSeconds: 8,
    photo: POCKET,
  },

  // ----- archive commercials: guess the show, the game, the movie -----
  {
    id: 'tb_snes_ad',
    category: 'game_systems',
    type: 'video_clip',
    question: 'Watch the spot. Which box showed up in North America in August 1991, the year a lot of us got born?',
    options: ['The Super Nintendo', 'The Nintendo 64', 'The Sega Dreamcast', 'The PlayStation'],
    correctIndex: 0,
    explanation:
      'The Super Nintendo launched in North America on August 23, 1991. This spot is the 1992 commercial on the Internet Archive (Super_Nintendo_commercial_1992). Wikipedia: Super Nintendo Entertainment System.',
    points: 1200,
    timeLimitSeconds: 20,
    video: { archiveId: 'Super_Nintendo_commercial_1992', title: 'Super Nintendo commercial, 1992' },
    photo: SNES,
  },
  {
    id: 'tb_gushers',
    category: 'movies',
    type: 'video_clip',
    question: 'This 1992 commercial is not a cartoon. It is a snack yelling. Which one?',
    options: ["Fruit Gushers", "Dunkaroos", "Fruit by the Foot", "Gushers' cousin, the granola bar"],
    correctIndex: 0,
    explanation:
      'Fruit Gushers hit shelves around 1991–92 and the ads were unhinged on purpose. Clip: Internet Archive, fruit-gushers-1992-commercial.',
    points: 1100,
    timeLimitSeconds: 18,
    video: { archiveId: 'fruit-gushers-1992-commercial', title: 'Fruit Gushers commercial, 1992' },
  },
  {
    id: 'tb_gb_ad',
    category: 'video_games',
    type: 'video_clip',
    question: 'The commercial is older than you, and you still knew the brick. What is it selling?',
    options: ['Game Boy', 'Game Gear', 'Virtual Boy', 'A pager with Snake on it'],
    correctIndex: 0,
    explanation:
      'Nintendo\'s 1989 Game Boy commercial, streamed from the Internet Archive (1989-nintendo-game-boy-commercial). The gray one was still in backpacks all through the 90s.',
    points: 1000,
    timeLimitSeconds: 18,
    video: { archiveId: '1989-nintendo-game-boy-commercial', title: 'Nintendo Game Boy commercial, 1989' },
  },
  {
    id: 'tb_block',
    category: 'heart',
    type: 'video_clip',
    question: 'Blue and yellow. Be kind, rewind. Which store is this 1999 spot for?',
    options: ['Blockbuster', 'Hollywood Video', 'The grocery-store Redbox that did not exist yet', 'Suncoast'],
    correctIndex: 0,
    explanation:
      'You rewound it in the driveway or you did it on their machine and hoped the clerk who knew your name was working. Clip: Internet Archive, blockbuster-video-commercial-1999. The late fee was a character in your house.',
    points: 1200,
    timeLimitSeconds: 18,
    video: { archiveId: 'blockbuster-video-commercial-1999', title: 'Blockbuster Video commercial, 1999' },
  },
  {
    id: 'tb_jam',
    category: 'movies',
    type: 'video_clip',
    question: 'A trailer, 1996. Basketball, cartoons, and a soundtrack your older cousin played too loud. Which movie?',
    options: ['Space Jam', 'Cool Runnings', 'Air Bud', 'Like Mike'],
    correctIndex: 0,
    explanation:
      'Space Jam opened November 15, 1996. The trailer lives on the Internet Archive as trailer-for-space-jam. You did not need to understand the plot. You needed the shoes and the theme.',
    points: 1000,
    timeLimitSeconds: 18,
    video: { archiveId: 'trailer-for-space-jam', title: 'Space Jam trailer, 1996' },
  },
  {
    id: 'tb_ptcg',
    category: 'video_games',
    type: 'video_clip',
    question: 'This 2000 spot is not about the Game Boy. It is about the thing you sleeved in a binder. What is it?',
    options: ['The Pokémon Trading Card Game', 'Magic: The Gathering', 'Yu-Gi-Oh', 'POGs, again'],
    correctIndex: 0,
    explanation:
      'Pokémon Red and Blue landed in the US on September 28, 1998. The cards followed kids into 1999 and 2000, and onto the playground\'s most serious negotiations. Clip: Internet Archive, 2000-commercial-for-pokemon-trading-card-game. Photo: Fernando Martello, CC BY-SA 4.0.',
    points: 1100,
    timeLimitSeconds: 18,
    video: { archiveId: '2000-commercial-for-pokemon-trading-card-game', title: 'Pokémon Trading Card Game commercial, 2000' },
    photo: CARDS,
  },

  // ----- 8-bit, kept and thickened -----
  {
    id: 'tb_hop',
    category: 'chiptune_sound',
    type: 'sound_guess',
    question: 'The room just went quiet for this. It is ours — written for the bedroom, not ripped off a cartridge. What kind of 1991 game does it feel like?',
    options: ['A side-scrolling platformer', 'A golf menu', 'A racing countdown', 'A horror sting'],
    correctIndex: 0,
    explanation:
      'The old round played a famous plumber theme. This one does not. It is a new hop in that same shoes-off feeling: square lead, a quiet third underneath, a bass that lands on the strong beats. Super Mario World still showed up with the SNES in 1991. We just refused to steal the song.',
    points: 1500,
    timeLimitSeconds: 18,
    chiptuneId: 'platform_hop',
    mediaClue: { type: 'sound_clip', content: 'Boombox has the room', subtext: 'Original 8-bit · platform hop' },
  },
  {
    id: 'tb_cave',
    category: 'chiptune_sound',
    type: 'sound_guess',
    question: 'Same cave arpeggio as before, now with a drone and an answer phrase. Which 1998 adventure does this hush belong beside?',
    options: ['The Legend of Zelda: Ocarina of Time', 'GoldenEye 007', 'Crash Bandicoot', 'Tony Hawk\'s Pro Skater'],
    correctIndex: 0,
    explanation:
      'We kept the old cave notes and thickened them — a low drone, a second voice, a phrase that wanders home. It is not Koji Kondo\'s theme. It is the feeling of stepping into a dark room in Ocarina of Time (November 23, 1998) with the lights off. Wikipedia: The Legend of Zelda: Ocarina of Time.',
    points: 1500,
    timeLimitSeconds: 18,
    chiptuneId: 'zelda_cave',
    mediaClue: { type: 'sound_clip', content: 'Boombox has the room', subtext: 'Original 8-bit · cave' },
  },
  {
    id: 'tb_boss',
    category: 'chiptune_sound',
    type: 'sound_guess',
    question: 'The old boss bass is still in there. A lead stabs over it now. What kind of moment is this?',
    options: ['A boss fight', 'A save-point lullaby', 'A title screen you idle on', 'The pause menu'],
    correctIndex: 0,
    explanation:
      'Fast jumps in the bass, short square stabs on top. That is a fight, not a menu. Written here, in the shape of the 90s boss rooms that made you lean forward.',
    points: 1400,
    timeLimitSeconds: 16,
    chiptuneId: 'cyber_boss',
    mediaClue: { type: 'sound_clip', content: 'Boombox has the room', subtext: 'Original 8-bit · boss' },
  },
  {
    id: 'tb_rush',
    category: 'chiptune_sound',
    type: 'sound_guess',
    question: 'It runs up the scale twice, and the second time a friend comes in underneath. Where are you?',
    options: ['An arcade rush — go, go, go', 'A slow credits crawl', 'A fishing mini-game', 'The options screen'],
    correctIndex: 0,
    explanation:
      'The old rising run, played again with a harmony a fourth below and a bass that chases it. Carpet, tickets, and somebody\'s parent saying five more minutes.',
    points: 1400,
    timeLimitSeconds: 16,
    chiptuneId: 'arcade_rush',
    mediaClue: { type: 'sound_clip', content: 'Boombox has the room', subtext: 'Original 8-bit · rush' },
  },
  {
    id: 'tb_organ',
    category: 'murder_mystery',
    type: 'sound_guess',
    question: 'Minor chords, a drone, the hallway after the porch light. Which night of the week did this feeling live on?',
    options: ['The night you were allowed to watch the scary show', 'Saturday morning', 'Picture day', 'Field day'],
    correctIndex: 0,
    explanation:
      'Are You Afraid of the Dark? premiered in 1990 and lived in a lot of 90s bedrooms after that. Goosebumps books were already on the shelf by 1992. This organ is ours. The scared is yours. Wikipedia: Are You Afraid of the Dark?',
    points: 1400,
    timeLimitSeconds: 18,
    chiptuneId: 'spooky_organ',
    mediaClue: { type: 'sound_clip', content: 'Boombox has the room', subtext: 'Original · after dark' },
  },
  {
    id: 'tb_bell',
    category: 'chiptune_sound',
    type: 'sound_guess',
    question: 'Two bells. The second one is lower. What are you supposed to do?',
    options: ['Line up. Recess is over.', 'The ice cream truck is here', 'Someone scored a touchdown', 'The modem connected'],
    correctIndex: 0,
    explanation:
      'You heard it from the blacktop and your stomach dropped a little, even when you liked the next class. This bell is synthesized. The feeling is not.',
    points: 1200,
    timeLimitSeconds: 14,
    chiptuneId: 'recess_bell',
  },
  {
    id: 'tb_dial',
    category: 'laugh',
    type: 'sound_guess',
    question: 'This noise meant the computer was winning and the telephone was losing. What had to happen before anyone could call out?',
    options: ['Somebody had to kick you off the internet', 'You had to rewind the tape', 'The streetlights had to come on', 'You had to beat the level'],
    correctIndex: 0,
    explanation:
      'Dial-up tied up the house phone. Mom needing to call the doctor was the real boss. These chirps are an impression we wrote, not a recording of a modem handshake. The screech in your memory is still louder.',
    points: 1300,
    timeLimitSeconds: 16,
    chiptuneId: 'dialup',
  },
  {
    id: 'tb_saturday',
    category: 'chiptune_sound',
    type: 'sound_guess',
    question: 'A short bright ident, then it is gone. What part of the morning is this standing in for?',
    options: ['The bumper before the cartoons', 'The weather with the dad', 'The nightly news', 'A car commercial'],
    correctIndex: 0,
    explanation:
      'Saturday morning had a sound that meant you were allowed to be on the floor with a bowl. This bumper is original. The cereal is not in the code.',
    points: 1200,
    timeLimitSeconds: 14,
    chiptuneId: 'saturday',
  },

  // ----- the closet, the block, the heart -----
  {
    id: 'tb_jnco',
    category: 'style',
    type: 'multiple_choice',
    question: 'JNCOs, late 90s. If you wore them to school, what were you really doing to the hallway?',
    options: ['Sweeping it with the hems', 'Training for track', 'Matching the uniform pants', 'Hiding a Game Boy, badly, in a normal pocket'],
    correctIndex: 0,
    explanation:
      'JNCO started in Los Angeles in 1985 and blew up with skaters in the late 90s. Some pairs opened so wide at the ankle they had their own weather. You heard them coming. So did the teacher. Wikipedia: JNCO.',
    points: 1200,
    timeLimitSeconds: 16,
  },
  {
    id: 'tb_starter',
    category: 'style',
    type: 'multiple_choice',
    question: 'The shiny team jacket with the snaps. Why did a lot of schools tell you to leave it at home?',
    options: [
      'They were expensive, obvious, and kept disappearing off hooks',
      'The satin was a fire hazard next to the bunsen burners',
      'They were too warm for a building with no AC',
      'The snaps set off the metal detector every single day',
    ],
    correctIndex: 0,
    explanation:
      'Starter\'s satin snap jackets were the early-90s status coat. They cost real money, they were loud from across the cafeteria, and more than a few schools banned them after they started vanishing and starting arguments. You still wore yours to the mall. Wikipedia: Starter (clothing line).',
    points: 1200,
    timeLimitSeconds: 18,
  },
  {
    id: 'tb_mom',
    category: 'laugh',
    type: 'multiple_choice',
    question: 'You dialed a friend\'s house. The real final boss picked up. What did they want first?',
    options: ['Who is this, and is your mother home?', 'Your high score', 'A coupon code', 'Directions to the ice cream truck'],
    correctIndex: 0,
    explanation:
      'There was no caller ID you trusted and no texting your way around it. You used your polite voice, the one that only existed for other people\'s parents. If you got "hold on," you had won.',
    points: 1100,
  },
  {
    id: 'tb_name',
    category: 'heart',
    type: 'multiple_choice',
    question: 'Your whole name came off the porch — first, middle, and last. Which part was trouble?',
    options: ['The middle name', 'The first name, always', 'Only the last name', 'Whichever one the dog answered to'],
    correctIndex: 0,
    explanation:
      'The middle name was the siren. You could hear which one it was from the end of the driveway. The first name, softer, meant the plate was on the table. You learned the difference before you learned your times tables.',
    points: 1400,
    timeLimitSeconds: 18,
    chiptuneId: 'heart_porch',
  },
  {
    id: 'tb_desk',
    category: 'heart',
    type: 'multiple_choice',
    question: 'Monday the desk next to you was empty, and the teacher did not make a joke. What usually happened over the weekend?',
    options: ['They moved', 'They were suspended over POGs', 'It was picture day and they were late', 'The desk was always empty'],
    correctIndex: 0,
    explanation:
      'Somebody moved, and nobody warned the class. You kept the pencil groove in your head longer than you kept their number. That one still shows up.',
    points: 1400,
    timeLimitSeconds: 18,
    chiptuneId: 'heart_porch',
  },
  {
    id: 'tb_summer',
    category: 'heart',
    type: 'multiple_choice',
    question: 'The summer somebody on the block got a car, the street got quieter. What disappeared first?',
    options: [
      'The after-dinner games that needed a full team',
      'The streetlights',
      'Saturday cartoons',
      'The ice cream truck, forever',
    ],
    correctIndex: 0,
    explanation:
      'Kickball needs bodies. One driver\'s license and suddenly everyone is "riding with them." The porch light still came on. There just weren\'t enough of you left to start a game.',
    points: 1400,
    timeLimitSeconds: 18,
  },
  {
    id: 'tb_rewind',
    category: 'heart',
    type: 'multiple_choice',
    question: 'The sticker said BE KIND, REWIND. Who were you actually being kind to?',
    options: [
      'The next kid, and the clerk who knew your name',
      'Only the VCR heads',
      'The director',
      'The late-fee printer',
    ],
    correctIndex: 0,
    explanation:
      'You rewound it in the living room, or your dad made you do it in the driveway before you went in. Handing the tape over was a tiny ceremony. The store is gone. The sticker is still in your head.',
    points: 1300,
    timeLimitSeconds: 16,
  },

  // ----- the years, for the class of being born in 1991 -----
  {
    id: 'tb_hallway',
    category: 'murder_mystery',
    type: 'murder_trap',
    question: 'The hallway light was off and your room was at the end. What was the rule?',
    options: [
      'Run. Do not look in the dark doorway.',
      'Walk slow so the floorboards stay quiet',
      'Turn every light on behind you and leave them',
      'Call for the dog to go first',
    ],
    correctIndex: 0,
    explanation:
      'You know which one you did. The sprint, the leap onto the bed, the covers over your head like a lock. After Dark still has a Killing Floor for the ones who miss. The hallway was the original.',
    points: 1200,
    timeLimitSeconds: 16,
  },
  {
    id: 'tb_goose',
    category: 'murder_mystery',
    type: 'murder_trap',
    question: 'The books with the bumpy letters showed up in 1992 and lived in your backpack. Who wrote them?',
    options: ['R.L. Stine', 'Stephen King', 'Christopher Pike, only', 'Alvin Schwartz'],
    correctIndex: 0,
    explanation:
      'Goosebumps, R.L. Stine, starting in 1992. You were allowed to read them and then you were not allowed to sleep. Wikipedia: Goosebumps.',
    points: 1100,
  },
  {
    id: 'tb_afraid',
    category: 'murder_mystery',
    type: 'multiple_choice',
    question: 'A campfire, a story, and the feeling you checked the closet after. Which show was that, premiering in 1990 and living on in syndication while you grew up?',
    options: ['Are You Afraid of the Dark?', 'Tales from the Crypt', 'Eerie, Indiana', 'The Twilight Zone, the 80s one'],
    correctIndex: 0,
    explanation:
      'Are You Afraid of the Dark? premiered in 1990. Submitted for the approval of the Midnight Society, and then you submitted yourself for the approval of a night light. Wikipedia: Are You Afraid of the Dark?',
    points: 1200,
  },
  {
    id: 'tb_snes_year',
    category: 'game_systems',
    type: 'system_guess',
    question: 'North American stores got the Super Nintendo in August of which year?',
    options: ['1991', '1989', '1993', '1996'],
    correctIndex: 0,
    explanation:
      'August 23, 1991. If you were born that year, the console and you arrived in the same season, and you did not meet until you could reach the buttons. Wikipedia: Super Nintendo Entertainment System.',
    points: 1000,
    photo: SNES,
  },
  {
    id: 'tb_rugrats',
    category: 'movies',
    type: 'multiple_choice',
    question: 'Tommy, Chuckie, Phil, Lil, and Angelica. The show premiered in August 1991. What was it?',
    options: ['Rugrats', 'Hey Arnold!', 'Doug', 'Recess'],
    correctIndex: 0,
    explanation:
      'Rugrats premiered on Nickelodeon on August 11, 1991 and just stayed, the way a babysitter stays. Wikipedia: Rugrats.',
    points: 1000,
  },
  {
    id: 'tb_n64',
    category: 'game_systems',
    type: 'system_guess',
    question: 'Three prongs, a stick in the middle, cartridges in a world that was switching to discs. What launched in North America on September 29, 1996?',
    options: ['Nintendo 64', 'PlayStation', 'Sega Saturn', 'Dreamcast'],
    correctIndex: 0,
    explanation:
      'The Nintendo 64, with Super Mario 64 in the launch window. The controller looked like a dare. Wikipedia: Nintendo 64.',
    points: 1100,
  },
  {
    id: 'tb_dream',
    category: 'game_systems',
    type: 'system_guess',
    question: 'Sega\'s last console in North America picked a date you could chant. What was the date?',
    options: ['9/9/99', '1/1/00', '11/11/94', '7/7/97'],
    correctIndex: 0,
    explanation:
      'The Dreamcast launched in North America on September 9, 1999, with a little screen in the controller and a modem nobody\'s phone line was ready for. Wikipedia: Dreamcast.',
    points: 1200,
  },
  {
    id: 'tb_poke_year',
    category: 'video_games',
    type: 'multiple_choice',
    question: 'Pokémon Red and Blue reached the United States on September 28 of which year?',
    options: ['1998', '1996', '2001', '1991'],
    correctIndex: 0,
    explanation:
      'September 28, 1998. By then you were seven, which is exactly the right age to take a binder very seriously. Wikipedia: Pokémon Red and Blue.',
    points: 1100,
    photo: CARDS,
  },
  {
    id: 'tb_lion',
    category: 'movies',
    type: 'multiple_choice',
    question: 'You were about three. The theater was dark and a cub got held up over a rock. Which 1994 movie was that?',
    options: ['The Lion King', 'The Land Before Time', 'Ferngully', 'Balto'],
    correctIndex: 0,
    explanation:
      'The Lion King opened in the US in June 1994. A lot of people your age can still feel the stampede in their ribs and could not tell you why. Wikipedia: The Lion King.',
    points: 1000,
  },
  {
    id: 'tb_toy',
    category: 'movies',
    type: 'multiple_choice',
    question: 'November 22, 1995. Toys, when the people leave the room. Which movie?',
    options: ['Toy Story', 'Small Soldiers', 'The Indian in the Cupboard', 'Jumanji'],
    correctIndex: 0,
    explanation:
      'Toy Story was the first feature-length film made entirely with computer animation, and it arrived while you were four. You did not care how it was made. You cared that they were alive. Wikipedia: Toy Story.',
    points: 1000,
  },
  {
    id: 'tb_rangers',
    category: 'movies',
    type: 'multiple_choice',
    question: 'August 28, 1993. Five teenagers, a dinosaur, and a phrase you yelled in the yard. What aired?',
    options: ['Mighty Morphin Power Rangers', 'VR Troopers', 'Big Bad Beetleborgs', 'Sailor Moon, the US dub'],
    correctIndex: 0,
    explanation:
      'Mighty Morphin Power Rangers premiered in the US on August 28, 1993. Recess was never the same, and neither were the cardboard-tube swords. Wikipedia: Mighty Morphin Power Rangers.',
    points: 1100,
  },
  {
    id: 'tb_quote_back',
    category: 'movie_quotes',
    type: 'quote',
    question: 'Finish the line every kid practiced in a mirror in 1984, and then again on a taped-off-TV copy in the 90s: "I\'ll ___."',
    options: ['be back', 'be seeing you', 'get you', 'return later'],
    correctIndex: 0,
    explanation:
      'The Terminator, 1984. You were not alive for the premiere. You were alive for the rerun, the VHS, and the impression your uncle would not stop doing. The line is "I\'ll be back."',
    points: 1000,
    mediaClue: { type: 'quote_speaker', content: 'A machine in sunglasses', subtext: 'The Terminator (1984), via a 90s VHS' },
  },
];
