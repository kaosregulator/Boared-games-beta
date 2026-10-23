import { HostCharacter, TriviaQuestion, CustomTriviaPack } from '../../types/trivia';
import { NOSTALGIA_DECK } from './nostalgiaDeck';

export const TRIVIA_HOSTS: HostCharacter[] = [
  {
    id: 'buzz',
    name: 'DJ Rewind',
    title: 'Owns every tape on the shelf',
    avatar: '📼',
    themeColor: 'from-amber-500 via-purple-600 to-indigo-700',
    accentGlow: 'text-yellow-400 border-yellow-400',
    personality: 'Talks like a kid from 1991 who never left the block. Hushes the room when the boombox starts.',
    defaultGreeting: "Shoes off, door shut, lights OFF if you leave the room. Let's see what you still remember.",
  },
  {
    id: 'mortimer',
    name: 'The Babysitter',
    title: 'Lets you stay up for the scary stuff',
    avatar: '🕯️',
    themeColor: 'from-purple-950 via-slate-900 to-rose-950',
    accentGlow: 'text-rose-400 border-rose-500',
    personality: 'Tells the story with a flashlight under her chin. Miss one and the Killing Floor gets you.',
    defaultGreeting: "Your parents won't be home till late. Miss a question and you go down to the basement. Alone.",
  },
  {
    id: 'pixel8',
    name: 'Cousin Pixel',
    title: 'Has every cartridge, lets you hold none',
    avatar: '👾',
    themeColor: 'from-cyan-900 via-blue-950 to-emerald-950',
    accentGlow: 'text-cyan-400 border-cyan-400',
    personality: 'The older cousin with the good console. Blows in every cartridge.',
    defaultGreeting: "TV's off, radio's off, tape's off. The boombox has the room. Don't touch my controller.",
  },
  {
    id: 'scarlett',
    name: 'Mom, From the Kitchen',
    title: 'Heard everything, saw everything',
    avatar: '🍳',
    themeColor: 'from-rose-900 via-amber-950 to-slate-900',
    accentGlow: 'text-amber-400 border-amber-500',
    personality: 'Yells trivia through the wall. Wants to know who left the fridge open.',
    defaultGreeting: "I'm not asking twice. Who left the front door open? Were you raised in a barn? Answer the question.",
  },
];

/** Every throwback question. Modes filter this by category and type. */
export const TRIVIA_QUESTIONS: TriviaQuestion[] = NOSTALGIA_DECK;

export const PRESET_CUSTOM_PACKS: CustomTriviaPack[] = [
  {
    id: 'pack_retro_90s',
    title: 'Saturday Morning Starter Pack',
    description: 'Cartoons, cereal, and a pet that died in your desk.',
    author: 'DJ Rewind',
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
    title: 'Sleepover Scary Movies',
    description: 'The tapes your older cousin rented when the parents went out.',
    author: 'The Babysitter',
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
    name: 'Know-It-All Kyle',
    avatar: '🤓',
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
    name: 'Cousin Bobby',
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
    name: 'Grandpa',
    avatar: '👴',
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
    name: 'Little Sister',
    avatar: '🎀',
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
