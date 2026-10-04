import { GameId } from './index';

export type TriviaCategory = 
  | 'movies'
  | 'movie_quotes'
  | 'actors'
  | 'video_games'
  | 'game_systems'
  | 'chiptune_sound'
  | 'murder_mystery'
  | 'custom';

export type TriviaSubMode = 
  | 'party_mix'
  | 'cinephile'
  | 'gaming_vault'
  | 'murder_mystery'
  | 'name_that_tune'
  | 'custom_pack';

export type MatchFormat = 
  | 'solo_vs_ai'
  | 'team_vs_ai'
  | 'pass_and_play'
  | 'ranked_arena';

export type HostExpression = 
  | 'happy'
  | 'excited'
  | 'shocked'
  | 'spooky'
  | 'smug'
  | 'laughing'
  | 'thinking';

export interface HostCharacter {
  id: string;
  name: string;
  title: string;
  avatar: string;
  themeColor: string;
  accentGlow: string;
  personality: string;
  defaultGreeting: string;
}

export interface TriviaQuestion {
  id: string;
  category: TriviaCategory;
  type: 'multiple_choice' | 'quote' | 'actor_star' | 'system_guess' | 'sound_guess' | 'murder_trap';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  hint?: string;
  points: number;
  timeLimitSeconds?: number;
  mediaClue?: {
    type: 'icon' | 'badge' | 'quote_speaker' | 'retro_sprite' | 'actor_name' | 'sound_clip';
    content: string;
    subtext?: string;
  };
  chiptuneId?: 'mario_run' | 'zelda_cave' | 'cyber_boss' | 'arcade_rush' | 'spooky_organ';
}

export interface TriviaPlayer {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isBot: boolean;
  score: number;
  lives: number;
  isGhost: boolean;
  streak: number;
  team?: 'Alpha' | 'Omega' | null;
  botPersonality?: 'cinephile' | 'gamer' | 'genius' | 'panic' | 'chaotic';
  botAccuracy?: number; // 0..1
  selectedAnswer: number | null;
  answerTimeMs: number | null;
  isAnswerCorrect: boolean | null;
  escapedHome?: boolean;
}

export type KillingFloorType = 
  | 'chalice_roulette'
  | 'wire_cut'
  | 'guillotine_reaction'
  | 'memory_code'
  | 'math_bomb';

export interface KillingFloorState {
  type: KillingFloorType;
  title: string;
  description: string;
  targetPlayerId: string;
  timeRemaining: number;
  isResolved: boolean;
  survived: boolean | null;
  chalices?: { id: number; poisoned: boolean; picked?: boolean }[];
  wireColors?: string[];
  safeWireIndex?: number;
  cutWireIndex?: number;
  targetReactionZone?: { start: number; end: number };
  currentGuillotinePos?: number;
  memoryCode?: number[];
  enteredMemoryCode?: number[];
  mathEquation?: { question: string; answer: number; options: number[] };
}

export interface CustomTriviaPack {
  id: string;
  title: string;
  description: string;
  author: string;
  category: string;
  createdAt: string;
  questions: TriviaQuestion[];
}
