import { HostCharacter, TriviaQuestion, CustomTriviaPack } from '../../types/trivia';
import { NOSTALGIA_DECK } from './nostalgiaDeck';

export const TRIVIA_HOSTS: HostCharacter[] = [
  {
    id: 'buzz',
    name: 'DJ Rewind',
    title: 'The Bedroom Boombox',
    avatar: '📼',
    themeColor: 'from-amber-500 via-purple-600 to-indigo-700',
    accentGlow: 'text-yellow-400 border-yellow-400',
    personality: 'Talks like a 1991 kid who never left the block. Hushes the room when the 8-bit starts.',
    defaultGreeting: 'Born in \'91. The streetlights are coming on. Let\'s see what you still remember.'
  },
  {
    id: 'mortimer',
    name: 'Lord Mortimer',
    title: 'Victorian Ghost & Murder Mystery Master',
    avatar: '👻',
    themeColor: 'from-purple-950 via-slate-900 to-rose-950',
    accentGlow: 'text-rose-400 border-rose-500',
    personality: 'Gothic, eerie, politely sinister, welcomes players to his deadly Victorian manor.',
    defaultGreeting: 'Welcome to my humble manor... Answer correctly, or take your chances on the Killing Floor!'
  },
  {
    id: 'pixel8',
    name: 'Pixel-8 Hologram',
    title: 'Retro Arcade System AI',
    avatar: '👾',
    themeColor: 'from-cyan-900 via-blue-950 to-emerald-950',
    accentGlow: 'text-cyan-400 border-cyan-400',
    personality: 'Chiptune loving, glitchy 8-bit enthusiast who speaks in retro video game jargon.',
    defaultGreeting: 'SYSTEM ONLINE. The TV, the radio, and the tape just stepped aside. These 8-bit cues are ours. Listen.'
  },
  {
    id: 'scarlett',
    name: 'Director Scarlett',
    title: 'Hollywood Film Buff',
    avatar: '🎬',
    themeColor: 'from-rose-900 via-amber-950 to-slate-900',
    accentGlow: 'text-amber-400 border-amber-500',
    personality: 'Fast-talking film critic who quotes classic cinema and tests deep movie knowledge.',
    defaultGreeting: 'QUIET ON SET! Cameras rolling! Let\'s see who actually knows their Oscar winners and cult classics!'
  }
];

/** The Jackbox pack, rebuilt as Throwback Trivia. */
export const TRIVIA_QUESTIONS: TriviaQuestion[] = NOSTALGIA_DECK;

export const PRESET_CUSTOM_PACKS: CustomTriviaPack[] = [
  {
    id: 'pack_retro_90s',
    title: '90s Nostalgia & Cartoons',
    description: 'Throwback questions on 90s Saturday morning cartoons, commercials, VHS tapes, and snacks.',
    author: 'TriviaBot_Curator',
    category: '90s Pop Culture',
    createdAt: '2026',
    questions: [
      {
        id: 'c90_1',
        category: 'custom',
        type: 'multiple_choice',
        question: 'Which 90s animated series featured Tommy, Chuckie, Phil, Lil, and Angelica Pickles?',
        options: ['Hey Arnold!', 'Rugrats', 'Rocket Power', 'Doug'],
        correctIndex: 1,
        explanation: 'Rugrats aired on Nickelodeon starting in 1991 and ran for over a decade.',
        points: 1000
      },
      {
        id: 'c90_2',
        category: 'custom',
        type: 'multiple_choice',
        question: 'What electronic virtual pet keyring took the world by storm starting in Japan in 1996?',
        options: ['Tamagotchi', 'Furby', 'Digimon', 'Giga Pet'],
        correctIndex: 0,
        explanation: 'Bandai\'s Tamagotchi handheld egg-shaped digital pet sold tens of millions of units worldwide.',
        points: 1000
      }
    ]
  },
  {
    id: 'pack_horror_cinema',
    title: 'Slasher & Cult Horror',
    description: 'From Camp Crystal Lake to Elm Street and the Overlook Hotel.',
    author: 'Lord_Mortimer',
    category: 'Horror Films',
    createdAt: '2026',
    questions: [
      {
        id: 'hor_1',
        category: 'custom',
        type: 'multiple_choice',
        question: 'Who was the ACTUAL killer in the original Friday the 13th (1980) film?',
        options: ['Jason Voorhees', 'Mrs. Pamela Voorhees (his mother)', 'Freddy Krueger', 'Michael Myers'],
        correctIndex: 1,
        explanation: 'Pamela Voorhees was the killer seeking revenge for her son Jason drowning at Camp Crystal Lake in 1957.',
        points: 1000
      },
      {
        id: 'hor_2',
        category: 'custom',
        type: 'multiple_choice',
        question: 'What room number in The Shining (1980 film) was Danny Torrance told to stay away from?',
        options: ['Room 217', 'Room 237', 'Room 1408', 'Room 666'],
        correctIndex: 1,
        explanation: 'In Stanley Kubrick\'s film, it was changed to Room 237 (in Stephen King\'s book it was Room 217).',
        points: 1000
      }
    ]
  }
];

export const MOCK_TRIVIA_AI_BOTS = [
  {
    id: 'bot_carl',
    name: 'Cinephile Carl',
    avatar: '🍿',
    color: 'bg-rose-600',
    botPersonality: 'cinephile' as const,
    botAccuracy: 0.9,
    score: 0,
    lives: 3,
    isGhost: false,
    streak: 0,
    selectedAnswer: null,
    answerTimeMs: null,
    isAnswerCorrect: null,
    isBot: true
  },
  {
    id: 'bot_pete',
    name: 'Pixel Pete',
    avatar: '🕹️',
    color: 'bg-cyan-600',
    botPersonality: 'gamer' as const,
    botAccuracy: 0.88,
    score: 0,
    lives: 3,
    isGhost: false,
    streak: 0,
    selectedAnswer: null,
    answerTimeMs: null,
    isAnswerCorrect: null,
    isBot: true
  },
  {
    id: 'bot_bot9000',
    name: 'TriviaBot 9000',
    avatar: '🤖',
    color: 'bg-indigo-600',
    botPersonality: 'genius' as const,
    botAccuracy: 0.82,
    score: 0,
    lives: 3,
    isGhost: false,
    streak: 0,
    selectedAnswer: null,
    answerTimeMs: null,
    isAnswerCorrect: null,
    isBot: true
  },
  {
    id: 'bot_polly',
    name: 'Panic Polly',
    avatar: '😱',
    color: 'bg-amber-600',
    botPersonality: 'panic' as const,
    botAccuracy: 0.65,
    score: 0,
    lives: 3,
    isGhost: false,
    streak: 0,
    selectedAnswer: null,
    answerTimeMs: null,
    isAnswerCorrect: null,
    isBot: true
  }
];
