// Guess Who rules and the original cast from the owner's Bored-games project.
export type HairColor = 'black' | 'brown' | 'blonde' | 'red' | 'white';
export type EyeColor = 'brown' | 'blue' | 'green';

export interface GuessWhoCharacter {
  id: string;
  name: string;
  gender: 'male' | 'female';
  hairColor: HairColor;
  eyeColor: EyeColor;
  hasGlasses: boolean;
  hasHat: boolean;
  hasFacialHair: boolean;
  isBald: boolean;
  hasEarrings: boolean;
  shirtColor: string;
  skinTone: string;
  hairHex: string;
  hatColor?: string;
}

export const GUESS_WHO_CHARACTERS: GuessWhoCharacter[] = [
  {
    id: 'mike',
    name: 'MIKE',
    gender: 'male',
    hairColor: 'brown',
    eyeColor: 'brown',
    hasGlasses: false,
    hasHat: true,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: false,
    shirtColor: '#1e293b',
    skinTone: '#f1c27d',
    hairHex: '#3b2219',
    hatColor: '#991b1b',
  },
  {
    id: 'emma',
    name: 'EMMA',
    gender: 'female',
    hairColor: 'red',
    eyeColor: 'green',
    hasGlasses: false,
    hasHat: false,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: true,
    shirtColor: '#be185d',
    skinTone: '#ffdbac',
    hairHex: '#b45309',
  },
  {
    id: 'ben',
    name: 'BEN',
    gender: 'male',
    hairColor: 'brown',
    eyeColor: 'blue',
    hasGlasses: true,
    hasHat: false,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: false,
    shirtColor: '#0369a1',
    skinTone: '#f1c27d',
    hairHex: '#451a03',
  },
  {
    id: 'farah',
    name: 'FARAH',
    gender: 'female',
    hairColor: 'black',
    eyeColor: 'brown',
    hasGlasses: false,
    hasHat: false,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: true,
    shirtColor: '#7e22ce',
    skinTone: '#8d5524',
    hairHex: '#090a0f',
  },
  {
    id: 'katie',
    name: 'KATIE',
    gender: 'female',
    hairColor: 'blonde',
    eyeColor: 'blue',
    hasGlasses: false,
    hasHat: true,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: false,
    shirtColor: '#15803d',
    skinTone: '#ffdbac',
    hairHex: '#eab308',
    hatColor: '#0284c7',
  },
  {
    id: 'jordan',
    name: 'JORDAN',
    gender: 'male',
    hairColor: 'black',
    eyeColor: 'brown',
    hasGlasses: false,
    hasHat: false,
    hasFacialHair: true,
    isBald: false,
    hasEarrings: false,
    shirtColor: '#b91c1c',
    skinTone: '#6f4e37',
    hairHex: '#111827',
  },
  {
    id: 'rachel',
    name: 'RACHEL',
    gender: 'female',
    hairColor: 'brown',
    eyeColor: 'green',
    hasGlasses: true,
    hasHat: false,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: true,
    shirtColor: '#9f1239',
    skinTone: '#f1c27d',
    hairHex: '#5c2c16',
  },
  {
    id: 'laura',
    name: 'LAURA',
    gender: 'female',
    hairColor: 'black',
    eyeColor: 'brown',
    hasGlasses: false,
    hasHat: false,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: false,
    shirtColor: '#0f766e',
    skinTone: '#c68642',
    hairHex: '#18181b',
  },
  {
    id: 'lily',
    name: 'LILY',
    gender: 'female',
    hairColor: 'black',
    eyeColor: 'green',
    hasGlasses: false,
    hasHat: true,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: true,
    shirtColor: '#1d4ed8',
    skinTone: '#8d5524',
    hairHex: '#090d16',
    hatColor: '#1e3a8a',
  },
  {
    id: 'nick',
    name: 'NICK',
    gender: 'male',
    hairColor: 'blonde',
    eyeColor: 'blue',
    hasGlasses: false,
    hasHat: false,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: false,
    shirtColor: '#ca8a04',
    skinTone: '#ffdbac',
    hairHex: '#facc15',
  },
  {
    id: 'sofia',
    name: 'SOFIA',
    gender: 'female',
    hairColor: 'brown',
    eyeColor: 'brown',
    hasGlasses: false,
    hasHat: false,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: true,
    shirtColor: '#ea580c',
    skinTone: '#c68642',
    hairHex: '#431407',
  },
  {
    id: 'olivia',
    name: 'OLIVIA',
    gender: 'female',
    hairColor: 'black',
    eyeColor: 'brown',
    hasGlasses: false,
    hasHat: false,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: true,
    shirtColor: '#db2777',
    skinTone: '#6f4e37',
    hairHex: '#09090b',
  },
  {
    id: 'gabe',
    name: 'GABE',
    gender: 'male',
    hairColor: 'black',
    eyeColor: 'brown',
    hasGlasses: false,
    hasHat: false,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: false,
    shirtColor: '#dc2626',
    skinTone: '#c68642',
    hairHex: '#18181b',
  },
  {
    id: 'liz',
    name: 'LIZ',
    gender: 'female',
    hairColor: 'white',
    eyeColor: 'blue',
    hasGlasses: true,
    hasHat: false,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: false,
    shirtColor: '#4f46e5',
    skinTone: '#ffdbac',
    hairHex: '#f8fafc',
  },
  {
    id: 'al',
    name: 'AL',
    gender: 'male',
    hairColor: 'white',
    eyeColor: 'brown',
    hasGlasses: true,
    hasHat: false,
    hasFacialHair: true,
    isBald: true,
    hasEarrings: false,
    shirtColor: '#166534',
    skinTone: '#8d5524',
    hairHex: '#f1f5f9',
  },
  {
    id: 'george',
    name: 'GEORGE',
    gender: 'male',
    hairColor: 'white',
    eyeColor: 'blue',
    hasGlasses: false,
    hasHat: true,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: false,
    shirtColor: '#ca8a04',
    skinTone: '#ffdbac',
    hairHex: '#e2e8f0',
    hatColor: '#334155',
  },
  {
    id: 'richard',
    name: 'RICHARD',
    gender: 'male',
    hairColor: 'brown',
    eyeColor: 'brown',
    hasGlasses: false,
    hasHat: false,
    hasFacialHair: true,
    isBald: true,
    hasEarrings: false,
    shirtColor: '#1e3a8a',
    skinTone: '#f1c27d',
    hairHex: '#5c2c16',
  },
  {
    id: 'eric',
    name: 'ERIC',
    gender: 'male',
    hairColor: 'blonde',
    eyeColor: 'blue',
    hasGlasses: false,
    hasHat: true,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: false,
    shirtColor: '#2563eb',
    skinTone: '#ffdbac',
    hairHex: '#fde047',
    hatColor: '#1e293b',
  },
  {
    id: 'maria',
    name: 'MARIA',
    gender: 'female',
    hairColor: 'brown',
    eyeColor: 'brown',
    hasGlasses: false,
    hasHat: true,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: true,
    shirtColor: '#b91c1c',
    skinTone: '#e0ac69',
    hairHex: '#3b2219',
    hatColor: '#dc2626',
  },
  {
    id: 'sam',
    name: 'SAM',
    gender: 'male',
    hairColor: 'white',
    eyeColor: 'green',
    hasGlasses: true,
    hasHat: false,
    hasFacialHair: false,
    isBald: true,
    hasEarrings: false,
    shirtColor: '#eab308',
    skinTone: '#ffdbac',
    hairHex: '#f1f5f9',
  },
  {
    id: 'david',
    name: 'DAVID',
    gender: 'male',
    hairColor: 'blonde',
    eyeColor: 'green',
    hasGlasses: false,
    hasHat: false,
    hasFacialHair: true,
    isBald: false,
    hasEarrings: false,
    shirtColor: '#047857',
    skinTone: '#ffdbac',
    hairHex: '#facc15',
  },
  {
    id: 'carmen',
    name: 'CARMEN',
    gender: 'female',
    hairColor: 'white',
    eyeColor: 'brown',
    hasGlasses: false,
    hasHat: false,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: true,
    shirtColor: '#9333ea',
    skinTone: '#6f4e37',
    hairHex: '#e2e8f0',
  },
  {
    id: 'max',
    name: 'MAX',
    gender: 'male',
    hairColor: 'red',
    eyeColor: 'green',
    hasGlasses: false,
    hasHat: false,
    hasFacialHair: true,
    isBald: false,
    hasEarrings: false,
    shirtColor: '#0284c7',
    skinTone: '#ffdbac',
    hairHex: '#c2410c',
  },
  {
    id: 'claire',
    name: 'CLAIRE',
    gender: 'female',
    hairColor: 'red',
    eyeColor: 'blue',
    hasGlasses: true,
    hasHat: true,
    hasFacialHair: false,
    isBald: false,
    hasEarrings: false,
    shirtColor: '#c026d3',
    skinTone: '#ffdbac',
    hairHex: '#ea580c',
    hatColor: '#a21caf',
  },
];

export interface GuessWhoQuestion {
  id: string;
  label: string;
  shortLabel: string;
  predicate: (char: GuessWhoCharacter) => boolean;
}

export const GUESS_WHO_QUESTIONS: GuessWhoQuestion[] = [
  {
    id: 'glasses',
    label: 'Does your mystery person wear glasses?',
    shortLabel: 'Wear Glasses?',
    predicate: (c) => c.hasGlasses,
  },
  {
    id: 'hat',
    label: 'Is your mystery person wearing a hat or cap?',
    shortLabel: 'Wearing a Hat?',
    predicate: (c) => c.hasHat,
  },
  {
    id: 'facial_hair',
    label: 'Does your mystery person have facial hair (mustache/beard)?',
    shortLabel: 'Facial Hair?',
    predicate: (c) => c.hasFacialHair,
  },
  {
    id: 'female',
    label: 'Is your mystery person female?',
    shortLabel: 'Female?',
    predicate: (c) => c.gender === 'female',
  },
  {
    id: 'male',
    label: 'Is your mystery person male?',
    shortLabel: 'Male?',
    predicate: (c) => c.gender === 'male',
  },
  {
    id: 'bald',
    label: 'Is your mystery person bald on top?',
    shortLabel: 'Bald on Top?',
    predicate: (c) => c.isBald,
  },
  {
    id: 'earrings',
    label: 'Is your mystery person wearing earrings?',
    shortLabel: 'Wearing Earrings?',
    predicate: (c) => c.hasEarrings,
  },
  {
    id: 'hair_black',
    label: 'Does your mystery person have black hair?',
    shortLabel: 'Black Hair?',
    predicate: (c) => c.hairColor === 'black',
  },
  {
    id: 'hair_brown',
    label: 'Does your mystery person have brown hair?',
    shortLabel: 'Brown Hair?',
    predicate: (c) => c.hairColor === 'brown',
  },
  {
    id: 'hair_blonde',
    label: 'Does your mystery person have blonde hair?',
    shortLabel: 'Blonde Hair?',
    predicate: (c) => c.hairColor === 'blonde',
  },
  {
    id: 'hair_red',
    label: 'Does your mystery person have red/auburn hair?',
    shortLabel: 'Red Hair?',
    predicate: (c) => c.hairColor === 'red',
  },
  {
    id: 'hair_white',
    label: 'Does your mystery person have white/silver hair?',
    shortLabel: 'White Hair?',
    predicate: (c) => c.hairColor === 'white',
  },
  {
    id: 'eyes_blue',
    label: 'Does your mystery person have blue eyes?',
    shortLabel: 'Blue Eyes?',
    predicate: (c) => c.eyeColor === 'blue',
  },
  {
    id: 'eyes_brown',
    label: 'Does your mystery person have brown eyes?',
    shortLabel: 'Brown Eyes?',
    predicate: (c) => c.eyeColor === 'brown',
  },
  {
    id: 'eyes_green',
    label: 'Does your mystery person have green eyes?',
    shortLabel: 'Green Eyes?',
    predicate: (c) => c.eyeColor === 'green',
  },
];

/**
 * 24+ Authentic 1990s / 1999 Nostalgia Jokes that shuffle on repeat without immediate duplicates!
 */
export const NOSTALGIA_1999_JOKES: string[] = [
  "Hold that thought—someone just picked up the kitchen landline and disconnected my 56k AOL dial-up!",
  "It's 1999! Better finish this round before the Y2K bug turns our toaster into a Decepticon at midnight!",
  "Those picture stands just flipped down faster than my Tamagotchi's health bar during 3rd-period math class!",
  "Whoa! That deduction was smoother than a fresh pair of JNCO jeans sliding across a roller-rink floor!",
  "Don't look now, but my Furby in the closet just whispered who your Mystery Person is in Furbish.",
  "Be Kind, Please Rewind! If we don't finish this match by 9 PM, Blockbuster's charging us a $3 late fee!",
  "I haven't seen a suspect lineup this intense since I tried downloading one MP3 on Napster over 4 hours!",
  "Hold my Neon Green Surge soda and my Gelly Roll pens—this detective work is getting Y2K-certified!",
  "Look at those frosted tips! Half this Guess Who board looks like they're about to drop a 1999 boy-band single on TRL!",
  "BOP IT! TWIST IT! PULL IT! FLIP IT! Sorry, wrong 1999 tabletop classic, my muscle memory kicked in!",
  "That move was more dramatic than Neo dodging bullets on the roof in The Matrix!",
  "Hang on, let me check my pager... nope, just my mom telling me Pizza Rolls are done!",
  "If you win this round, I'm trading you my holographic Base Set Charizard—just kidding, nobody trades a Charizard in '99!",
  "Those plastic frames clacking down sound just like typing an AIM away message in Comic Sans on a mechanical keyboard!",
  "Wait—let me blow into the game cartridge first so our luck loads properly!",
  "I'm taking notes in my Lisa Frank trapper keeper right next to my collection of 60-second HitClips!",
  "That guess was bolder than wearing an inflatable neon plastic armchair to a formal dinner in 1999!",
  "Windows 98 3D Pipes screensaver has nothing on the 3D angles of this tabletop!",
  "Careful! One wrong guess and you'll get slimed like a 1999 Nickelodeon game show contestant!",
  "My Nokia 3210 battery still has 4 bars from last month, and I'm still not sure if your person has a hat!",
  "That elimination wave hit harder than the THX Deep Note booming in a 1999 multiplex theater!",
  "Hold up, let me adjust the rabbit-ear antenna on the CRT TV so I can see your tray better!",
];

export interface NarratorLine {
  id: string;
  speaker: string;
  playByPlay: string;
  joke99: string;
  timestamp: string;
}

export interface GuessWhoGameState {
  playerSecret: GuessWhoCharacter; // Red's mystery card (sitting in Red's front slot)
  aiSecret: GuessWhoCharacter; // Blue's mystery card (what Red is trying to deduce)
  playerFoldedIds: string[]; // IDs of stands folded down on Player's Red tray
  aiFoldedIds: string[]; // IDs of stands folded down on Opponent's Blue tray
  askedQuestionIds: string[];
  aiAskedQuestionIds: string[];
  turn: 'player' | 'ai';
  turnCount: number;
  winner: 'player' | 'ai' | null;
  winReason: string;
  narratorLog: NarratorLine[];
  jokeQueue: string[];
  lastQuestionResult: {
    asker: 'You (Red)' | 'CPU (Blue)';
    questionText: string;
    answer: boolean;
    eliminatedCount: number;
  } | null;
}

export function createShuffledJokes(rng: () => number = Math.random): string[] {
  const arr = [...NOSTALGIA_1999_JOKES];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function popNext1999Joke(
  currentQueue: string[],
  rng: () => number = Math.random
): { joke: string; nextQueue: string[] } {
  const queue = currentQueue.length > 0 ? [...currentQueue] : createShuffledJokes(rng);
  const joke = queue.pop()!;
  return { joke, nextQueue: queue };
}

export function createInitialGuessWhoState(
  rng: () => number = Math.random
): GuessWhoGameState {
  const chars = [...GUESS_WHO_CHARACTERS];
  const pIdx = Math.floor(rng() * chars.length);
  let aiIdx = Math.floor(rng() * chars.length);
  if (aiIdx === pIdx) {
    aiIdx = (pIdx + 1) % chars.length;
  }

  const playerSecret = chars[pIdx];
  const aiSecret = chars[aiIdx];
  const initialJokes = createShuffledJokes(rng);
  const firstJoke = initialJokes.pop()!;

  return {
    playerSecret,
    aiSecret,
    playerFoldedIds: [],
    aiFoldedIds: [],
    askedQuestionIds: [],
    aiAskedQuestionIds: [],
    turn: 'player',
    turnCount: 1,
    winner: null,
    winReason: '',
    jokeQueue: initialJokes,
    lastQuestionResult: null,
    narratorLog: [
      {
        id: 'intro-1999',
        speaker: 'DJ Y2K (1999 Host)',
        playByPlay: `Welcome to Basement Game Night 1999! Your Mystery Card in the front slot is ${playerSecret.name}. Ask a Yes/No question or click any 3D picture stand to flip it down!`,
        joke99: firstJoke,
        timestamp: 'Turn 1',
      },
    ],
  };
}

/**
 * Evaluates a trait question asked by the Player against the AI's secret character,
 * automatically folds down all eliminated characters on the Player's 3D Red tray,
 * and generates word-for-word turn commentary + a shuffled 1999 joke.
 */
export function askGuessWhoQuestion(
  state: GuessWhoGameState,
  questionId: string,
  rng: () => number = Math.random
): GuessWhoGameState {
  if (state.winner || state.turn !== 'player') return state;

  const question = GUESS_WHO_QUESTIONS.find((q) => q.id === questionId);
  if (!question) return state;

  const matchesSecret = question.predicate(state.aiSecret);
  const foldedSet = new Set(state.playerFoldedIds);
  let newlyFolded = 0;

  for (const char of GUESS_WHO_CHARACTERS) {
    if (foldedSet.has(char.id)) continue;
    const charMatches = question.predicate(char);
    // If secret has trait (YES), fold anyone who does NOT have trait.
    // If secret does NOT have trait (NO), fold anyone who DOES have trait.
    if (charMatches !== matchesSecret) {
      foldedSet.add(char.id);
      newlyFolded++;
    }
  }

  const remainingStanding = GUESS_WHO_CHARACTERS.length - foldedSet.size;
  const { joke, nextQueue } = popNext1999Joke(state.jokeQueue, rng);
  const answerWord = matchesSecret ? 'YES!' : 'NOPE!';

  const playByPlay = `You asked: "${question.label}" — Blue answers "${answerWord}" CLACK-CLACK! ${newlyFolded} picture stand${
    newlyFolded === 1 ? '' : 's'
  } folded down on your Red board (${remainingStanding} suspects still standing)!`;

  const nextLine: NarratorLine = {
    id: `turn-${state.turnCount}-p`,
    speaker: 'DJ Y2K (1999 Host)',
    playByPlay,
    joke99: joke,
    timestamp: `Turn ${state.turnCount}`,
  };

  return {
    ...state,
    playerFoldedIds: Array.from(foldedSet),
    askedQuestionIds: [...state.askedQuestionIds, questionId],
    turn: 'ai',
    jokeQueue: nextQueue,
    lastQuestionResult: {
      asker: 'You (Red)',
      questionText: question.label,
      answer: matchesSecret,
      eliminatedCount: newlyFolded,
    },
    narratorLog: [nextLine, ...state.narratorLog].slice(0, 12),
  };
}

/**
 * Executes the AI Opponent's turn (Blue tray): picks the most informative unasked question
 * (or guesses if down to 1 standing character), folds down eliminated Blue stands,
 * and adds word-for-word narrator commentary + a fresh 1999 joke.
 */
export function executeAiGuessWhoTurn(
  state: GuessWhoGameState,
  rng: () => number = Math.random
): GuessWhoGameState {
  if (state.winner || state.turn !== 'ai') return state;

  const aiFoldedSet = new Set(state.aiFoldedIds);
  const aiRemaining = GUESS_WHO_CHARACTERS.filter((c) => !aiFoldedSet.has(c.id));

  // If AI has narrowed it down to 1 character (or 2 characters after many turns), AI makes a direct guess!
  if (aiRemaining.length === 1 || (aiRemaining.length === 2 && state.turnCount >= 6)) {
    const guessChar = aiRemaining[0];
    const isCorrect = guessChar.id === state.playerSecret.id;
    const { joke, nextQueue } = popNext1999Joke(state.jokeQueue, rng);

    if (isCorrect) {
      const playByPlay = `CPU (Blue) points across the table: "Is your Mystery Person ${guessChar.name}?!" — BINGO! Blue guessed your card ${state.playerSecret.name}!`;
      return {
        ...state,
        turn: 'player',
        winner: 'ai',
        winReason: `Blue deduced your Mystery Person (${state.playerSecret.name})!`,
        jokeQueue: nextQueue,
        narratorLog: [
          {
            id: `ai-win-${state.turnCount}`,
            speaker: 'DJ Y2K (1999 Host)',
            playByPlay,
            joke99: joke,
            timestamp: `Turn ${state.turnCount}`,
          },
          ...state.narratorLog,
        ].slice(0, 12),
      };
    } else {
      aiFoldedSet.add(guessChar.id);
      const playByPlay = `CPU (Blue) gambled on ${guessChar.name} and MISSED! Blue folds ${guessChar.name}'s stand down! Your turn!`;
      return {
        ...state,
        aiFoldedIds: Array.from(aiFoldedSet),
        turn: 'player',
        turnCount: state.turnCount + 1,
        jokeQueue: nextQueue,
        narratorLog: [
          {
            id: `ai-miss-${state.turnCount}`,
            speaker: 'DJ Y2K (1999 Host)',
            playByPlay,
            joke99: joke,
            timestamp: `Turn ${state.turnCount}`,
          },
          ...state.narratorLog,
        ].slice(0, 12),
      };
    }
  }

  // Pick a question that splits the AI's remaining candidates closest to 50/50
  const unasked = GUESS_WHO_QUESTIONS.filter(
    (q) => !state.aiAskedQuestionIds.includes(q.id)
  );
  const pool = unasked.length > 0 ? unasked : GUESS_WHO_QUESTIONS;

  let bestQ = pool[0];
  let bestScore = Infinity;
  for (const q of pool) {
    const yesCount = aiRemaining.filter((c) => q.predicate(c)).length;
    const diff = Math.abs(yesCount - aiRemaining.length / 2);
    if (diff < bestScore) {
      bestScore = diff;
      bestQ = q;
    }
  }

  const matchesPlayerSecret = bestQ.predicate(state.playerSecret);
  let newlyFolded = 0;
  for (const char of GUESS_WHO_CHARACTERS) {
    if (aiFoldedSet.has(char.id)) continue;
    if (bestQ.predicate(char) !== matchesPlayerSecret) {
      aiFoldedSet.add(char.id);
      newlyFolded++;
    }
  }

  const blueLeft = GUESS_WHO_CHARACTERS.length - aiFoldedSet.size;
  const { joke, nextQueue } = popNext1999Joke(state.jokeQueue, rng);
  const answerWord = matchesPlayerSecret ? 'YES!' : 'NO!';

  const playByPlay = `CPU (Blue) asks: "${bestQ.label}" — You answer "${answerWord}" Blue flips down ${newlyFolded} blue stand${
    newlyFolded === 1 ? '' : 's'
  } (${blueLeft} left on Blue's tray). Your move!`;

  return {
    ...state,
    aiFoldedIds: Array.from(aiFoldedSet),
    aiAskedQuestionIds: [...state.aiAskedQuestionIds, bestQ.id],
    turn: 'player',
    turnCount: state.turnCount + 1,
    jokeQueue: nextQueue,
    lastQuestionResult: {
      asker: 'CPU (Blue)',
      questionText: bestQ.label,
      answer: matchesPlayerSecret,
      eliminatedCount: newlyFolded,
    },
    narratorLog: [
      {
        id: `turn-${state.turnCount}-ai`,
        speaker: 'DJ Y2K (1999 Host)',
        playByPlay,
        joke99: joke,
        timestamp: `Turn ${state.turnCount}`,
      },
      ...state.narratorLog,
    ].slice(0, 12),
  };
}

/**
 * Allows the player to make a direct final accusation ("Guess Mystery Person") on any character.
 */
export function makeDirectCharacterGuess(
  state: GuessWhoGameState,
  characterId: string,
  rng: () => number = Math.random
): GuessWhoGameState {
  if (state.winner) return state;
  const guessedChar = GUESS_WHO_CHARACTERS.find((c) => c.id === characterId);
  if (!guessedChar) return state;

  const { joke, nextQueue } = popNext1999Joke(state.jokeQueue, rng);

  if (guessedChar.id === state.aiSecret.id) {
    // Fold all other stands on player tray for dramatic reveal!
    const allOtherIds = GUESS_WHO_CHARACTERS.filter(
      (c) => c.id !== guessedChar.id
    ).map((c) => c.id);
    const playByPlay = `BOOYAH! You guessed ${guessedChar.name} and NAILED IT! Blue's Mystery Card was indeed ${state.aiSecret.name}! You are the 1999 Tabletop Champion!`;

    return {
      ...state,
      playerFoldedIds: allOtherIds,
      winner: 'player',
      winReason: `You correctly identified ${state.aiSecret.name} in ${state.turnCount} turns!`,
      jokeQueue: nextQueue,
      narratorLog: [
        {
          id: `win-${state.turnCount}`,
          speaker: 'DJ Y2K (1999 Host)',
          playByPlay,
          joke99: joke,
          timestamp: `Victory!`,
        },
        ...state.narratorLog,
      ].slice(0, 12),
    };
  } else {
    // Wrong guess -> fold that character down and pass turn to AI
    const foldedSet = new Set(state.playerFoldedIds);
    foldedSet.add(guessedChar.id);
    const playByPlay = `Psych! You guessed ${guessedChar.name}, but Blue shakes their head NO! ${guessedChar.name}'s stand flips down and your turn passes to Blue!`;

    return {
      ...state,
      playerFoldedIds: Array.from(foldedSet),
      turn: 'ai',
      jokeQueue: nextQueue,
      narratorLog: [
        {
          id: `miss-${state.turnCount}-${characterId}`,
          speaker: 'DJ Y2K (1999 Host)',
          playByPlay,
          joke99: joke,
          timestamp: `Turn ${state.turnCount}`,
        },
        ...state.narratorLog,
      ].slice(0, 12),
    };
  }
}

/**
 * Manually toggles a single character stand up/down on the player's Red tray when clicked in 3D.
 */
export function toggleCharacterStand(
  state: GuessWhoGameState,
  characterId: string,
  rng: () => number = Math.random
): GuessWhoGameState {
  const foldedSet = new Set(state.playerFoldedIds);
  const char = GUESS_WHO_CHARACTERS.find((c) => c.id === characterId);
  if (!char) return state;

  const isFoldingDown = !foldedSet.has(characterId);
  if (isFoldingDown) {
    foldedSet.add(characterId);
  } else {
    foldedSet.delete(characterId);
  }

  const { joke, nextQueue } = popNext1999Joke(state.jokeQueue, rng);
  const playByPlay = isFoldingDown
    ? `CLACK! You manually flipped ${char.name}'s picture stand down (${
        24 - foldedSet.size
      } suspects left standing).`
    : `FLIP! You popped ${char.name}'s picture stand back up!`;

  return {
    ...state,
    playerFoldedIds: Array.from(foldedSet),
    jokeQueue: nextQueue,
    narratorLog: [
      {
        id: `manual-${Date.now()}-${characterId}`,
        speaker: 'DJ Y2K (1999 Host)',
        playByPlay,
        joke99: joke,
        timestamp: `Turn ${state.turnCount}`,
      },
      ...state.narratorLog,
    ].slice(0, 12),
  };
}
