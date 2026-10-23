/**
 * Prime Time Rerun: a mini Jeopardy-style board for the throwback crowd.
 * Five categories, five tiles each. The clue is the answer; you pick the
 * question. Right adds the tile's value, wrong takes it away. One tile hides
 * a double. The right response is always written first and gets shuffled.
 */

export interface RerunClue {
  value: number;
  clue: string;
  responses: string[];
  note: string;
  /** Optional sound cue from src/utils/chiptunes.ts. */
  chiptuneId?: string;
}

export interface RerunCategory {
  title: string;
  clues: RerunClue[];
}

export const RERUN_VALUES = [100, 200, 300, 400, 500];

export const RERUN_CATEGORIES: RerunCategory[] = [
  {
    title: 'HEARD IT GROWING UP',
    clues: [
      {
        value: 100,
        clue: 'Shut that door! Mom wanted to know if you were raised in one of these.',
        responses: ['What is a barn?', 'What is a tent?', 'What is a bus?', 'What is a cave?'],
        note: 'Nobody was. The barn would have had the door shut.',
      },
      {
        value: 200,
        clue: 'Dad, standing at the light switch, asking if you think he owns this.',
        responses: ['What is the electric company?', 'What is the power plant?', 'What is the bank?', 'What is the Sun?'],
        note: 'Every lamp left on was a line item, read aloud.',
      },
      {
        value: 300,
        clue: 'These do not grow on trees, according to everyone who ever said no to a Super Soaker.',
        responses: ['What is money?', 'What are allowances?', 'What are Pokémon cards?', 'What are leaves?'],
        note: 'The couch cushions, however, paid out about 35 cents.',
      },
      {
        value: 400,
        clue: 'The minutes you had to wait after eating before you could get back in the pool.',
        responses: ['What is 30?', 'What is 5?', 'What is 60?', 'What is 15?'],
        note: 'Science never backed it up. Moms never backed down.',
      },
      {
        value: 500,
        clue: '"Ask your father" was always answered with this.',
        responses: ['What is "ask your mother"?', 'What is "yes"?', 'What is "maybe later"?', 'What is "go outside"?'],
        note: 'The loop could run all afternoon. By then the sleepover was over.',
      },
    ],
  },
  {
    title: 'TGIF',
    clues: [
      {
        value: 100,
        clue: '"Did I do that?" asked this neighbor, standing in the rubble of the Winslows\' kitchen.',
        responses: ['Who is Steve Urkel?', 'Who is Screech?', 'Who is Kimmy Gibbler?', 'Who is Eddie Winslow?'],
        note: 'Family Matters, Friday nights on ABC.',
      },
      {
        value: 200,
        clue: 'Three girls, a dad, an uncle with a mullet, and a guy who did cartoon voices, all in one San Francisco house.',
        responses: ['What is Full House?', 'What is Step by Step?', 'What is Growing Pains?', 'What is Family Matters?'],
        note: '"Have mercy." "How rude!" "You got it, dude."',
      },
      {
        value: 300,
        clue: 'Cory and Topanga\'s teacher lived next door and taught them everything from sixth grade to college.',
        responses: ['Who is Mr. Feeny?', 'Who is Mr. Belding?', 'Who is Mr. Turner?', 'Who is Mr. Cooper?'],
        note: 'Boy Meets World. Feeny-ny-nyyyy.',
      },
      {
        value: 400,
        clue: 'This teenage witch had a talking cat named Salem.',
        responses: ['Who is Sabrina?', 'Who is Phoebe?', 'Who is Wendy?', 'Who is Samantha?'],
        note: 'Sabrina the Teenage Witch joined TGIF in 1996.',
      },
      {
        value: 500,
        clue: 'Carl Winslow\'s job on Family Matters.',
        responses: ['What is a police officer?', 'What is a mailman?', 'What is a firefighter?', 'What is a principal?'],
        note: 'A Chicago cop, who was no match for one kid in suspenders.',
      },
    ],
  },
  {
    title: 'GAME SHOW NIGHT',
    clues: [
      {
        value: 100,
        clue: 'You had to do this on every clue on the show this board is borrowing from.',
        responses: ['What is answer in the form of a question?', 'What is spin the wheel?', 'What is guess the price?', 'What is take the slime?'],
        note: 'And Grandpa answered faster than the contestants, from the recliner.',
      },
      {
        value: 200,
        clue: '"Come on down!" meant you were next on this show.',
        responses: ['What is The Price Is Right?', 'What is Wheel of Fortune?', 'What is Family Feud?', 'What is Supermarket Sweep?'],
        note: 'Sick days meant Bob Barker and a can of soup.',
      },
      {
        value: 300,
        clue: 'Nickelodeon show where you could skip the question, take the physical challenge, and probably get slimed.',
        responses: ['What is Double Dare?', 'What is GUTS?', 'What is Figure It Out?', 'What is Nick Arcade?'],
        note: 'Marc Summers, an obstacle course, and a giant nose you had to pick.',
      },
      {
        value: 400,
        clue: 'Olmec watched kids run his temple on this show, and almost nobody finished.',
        responses: ['What is Legends of the Hidden Temple?', 'What is Fort Boyard?', 'What is Wild & Crazy Kids?', 'What is Global GUTS?'],
        note: 'The Shrine of the Silver Monkey has been unsolvable since 1993.',
      },
      {
        value: 500,
        clue: 'On this show, families shouted "SURVEY SAYS!" at a big board.',
        responses: ['What is Family Feud?', 'What is Match Game?', 'What is Card Sharks?', 'What is The Joker\'s Wild?'],
        note: 'One hundred people surveyed, and none of them were ever your family.',
      },
    ],
  },
  {
    title: 'COMMERCIAL BREAK',
    clues: [
      {
        value: 100,
        clue: 'He crashes through your wall and yells "OH YEAH!"',
        responses: ['Who is the Kool-Aid Man?', 'Who is the Hamburglar?', 'Who is Tony the Tiger?', 'Who is the Noid?'],
        note: 'Dad paid for the walls.',
      },
      {
        value: 200,
        clue: '"Silly rabbit," these are for kids.',
        responses: ['What is Trix?', 'What is Lucky Charms?', 'What is Cocoa Puffs?', 'What is Kix?'],
        note: 'The rabbit never got a single bowl.',
      },
      {
        value: 300,
        clue: 'Six feet of bubble gum, "for you, not them."',
        responses: ['What is Bubble Tape?', 'What is Big League Chew?', 'What is Bubblicious?', 'What is Hubba Bubba?'],
        note: 'Everyone tried the whole six feet once.',
      },
      {
        value: 400,
        clue: '"Pizza! Pizza!" came from this chain, two pies for one price.',
        responses: ['What is Little Caesars?', 'What is Pizza Hut?', 'What is Domino\'s?', 'What is Chuck E. Cheese?'],
        note: 'Pizza Hut had BOOK IT! though, so it was a tie.',
      },
      {
        value: 500,
        clue: 'He keeps going and going and going.',
        responses: ['Who is the Energizer Bunny?', 'Who is the Duracell Bunny?', 'Who is the Trix Rabbit?', 'Who is the Nesquik Bunny?'],
        note: 'Born in 1989 as a joke about the other battery bunny.',
      },
    ],
  },
  {
    title: 'CARTRIDGE YEARS',
    clues: [
      {
        value: 100,
        clue: 'What every kid did to a cartridge that wouldn\'t start.',
        responses: ['What is blow in it?', 'What is lick it?', 'What is freeze it?', 'What is shake it?'],
        note: 'It did not help. We did it anyway.',
      },
      {
        value: 200,
        clue: 'He laughed at you from the grass every time you missed a duck.',
        responses: ['Who is the Duck Hunt dog?', 'Who is Yoshi?', 'Who is Donkey Kong?', 'Who is Toad?'],
        note: 'You could not shoot him. Everybody tried.',
      },
      {
        value: 300,
        clue: 'The Game Boy played this Russian folk song until the batteries died.',
        responses: ['What is the Tetris song?', 'What is the Kirby song?', 'What is the Pokémon theme?', 'What is the Dr. Mario song?'],
        note: '"Korobeiniki," 1861. Listen.',
        chiptuneId: 'korobeiniki',
      },
      {
        value: 400,
        clue: 'Your whole wagon party died of this in the school computer lab.',
        responses: ['What is dysentery?', 'What is the flu?', 'What is snakebite?', 'What is boredom?'],
        note: 'The Oregon Trail. You named the oxen after your friends.',
      },
      {
        value: 500,
        clue: 'Up, Up, Down, Down, Left, Right, Left, Right, B, A, Start.',
        responses: ['What is the Konami Code?', 'What is the Game Genie?', 'What is the Contra password?', 'What is the reset trick?'],
        note: 'Thirty lives in Contra. A secret handshake for life.',
      },
    ],
  },
];
