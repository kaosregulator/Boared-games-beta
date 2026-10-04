export type GameId =
  | 'poker'
  | 'casino'
  | 'trivia'
  | 'battleship'
  | 'connect4'
  | 'chess'
  | 'checkers'
  | 'blackjack'
  | 'gofish'
  | 'pawnrush'
  | 'liarsdice';

export * from './trivia';

export type ViewMode = 'isometric' | '2d';

export type GameMode = 'ai' | 'pass_and_play' | 'discord_party';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface MiniAvatarConfig {
  skinTone: string; // 'fair' | 'warm' | 'tan' | 'dark' | 'pale' | 'cyber_neon'
  hairStyle: string; // 'retro_shag' | 'pompadour' | 'curly' | 'straight' | 'slick_back' | 'afro' | 'beanie' | 'punk_spiky' | 'bald'
  hairColor: string; // 'brunette' | 'blonde' | 'black' | 'ginger' | 'electric_blue' | 'neon_pink' | 'silver_gray'
  faceExpression: string; // 'focused' | 'cool_shades' | 'smiling' | 'determined' | 'smirking' | 'retro_glasses' | 'eyepatch'
  outfitType: string; // 'leather_jacket' | 'retro_hoodie' | 'varsity_jacket' | 'arcade_tee' | 'tuxedo' | 'hawaiian_shirt'
  outfitColor: string; // 'ruby_red' | 'ocean_blue' | 'emerald_green' | 'sunset_gold' | 'midnight_purple' | 'stealth_black'
  headwear: string; // 'none' | 'retro_cap_backward' | 'headphones' | 'aviator_shades' | 'headband' | 'fedora'
  accessory: string; // 'none' | 'gold_chain' | 'neon_badge' | 'gamer_pins' | 'dice_charm'
}

export interface UserProfile {
  id: string;
  name: string;
  avatarEmoji: string;
  avatarBg: string;
  tag: string;
  title: string;
  rank: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Grandmaster';
  seasonScore: number;
  chips: number;
  wins: number;
  losses: number;
  winStreak: number;
  miniAvatar?: MiniAvatarConfig;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  title: string;
  rank: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Grandmaster';
  score: number;
  wins: number;
  losses: number;
  favoriteGame: string;
  badge: string;
}

export interface DiscordUser {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isBot?: boolean;
  status?: 'online' | 'idle' | 'dnd';
  isSpeaking?: boolean;
}

export interface GameBoxArtOverride {
  coverImageUrl?: string; // Custom uploaded / URL front cover art
  spineImageUrl?: string; // Custom spine banner image
  customTitle?: string;
  customSubtitle?: string;
  customBrand?: string;
}

export interface ShelfCustomArtConfig {
  theme: 'wood_1989' | 'neon_arcade' | 'retro_lounge' | 'cyberpunk';
  poster1Url?: string; // Custom Left Poster
  poster2Url?: string; // Custom Right Poster
  topItemLeft?: string; // e.g. DeLorean, Boombox, Trophy
  topItemRight?: string; // e.g. Globe, Star Trek VHS, Lava Lamp
  vhsTapes?: string[]; // list of customized cassette names
  boxArtOverrides: Record<string, GameBoxArtOverride>;
}

export interface GameMetadata {
  id: GameId;
  title: string;
  subtitle: string;
  players: string;
  duration: string;
  boxColor: string;
  boxAccent: string;
  badge: string;
  description: string;
  rules: string[];
  icon: string;
  rating: string;
  coverImage?: string;
}

// ----------------------------------------------------
// POKER & CASINO TYPES
// ----------------------------------------------------
export type PokerSuit = '♠' | '♥' | '♦' | '♣';
export type PokerRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface PokerCard {
  id: string;
  suit: PokerSuit;
  rank: PokerRank;
  value: number; // 2..14 (Ace = 14)
  faceUp: boolean;
}

export type HandRanking =
  | 'royal_flush'
  | 'straight_flush'
  | 'four_of_a_kind'
  | 'full_house'
  | 'flush'
  | 'straight'
  | 'three_of_a_kind'
  | 'two_pair'
  | 'one_pair'
  | 'high_card';

export interface EvaluatedHand {
  ranking: HandRanking;
  name: string;
  score: number;
  bestCards: PokerCard[];
}

export type PokerPhase =
  | 'dealing'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'round_over';

export interface PokerPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  chips: number;
  currentBet: number;
  totalRoundBet: number;
  cards: PokerCard[];
  hasFolded: boolean;
  isAllIn: boolean;
  evaluatedHand?: EvaluatedHand;
  lastAction?: string;
  personality?: 'bluffer' | 'tight' | 'aggressive' | 'balanced';
}

export interface PokerState {
  deck: PokerCard[];
  communityCards: PokerCard[];
  players: PokerPlayer[];
  pot: number;
  currentBet: number;
  minRaise: number;
  dealerIndex: number;
  activePlayerIndex: number;
  smallBlind: number;
  bigBlind: number;
  phase: PokerPhase;
  lastActionMessage: string;
  winners: { player: PokerPlayer; amount: number; handName: string }[];
  roundNumber: number;
  feltColor: 'emerald' | 'blue' | 'crimson' | 'midnight';
}

// 5-Card Video Poker Types
export interface VideoPokerState {
  deck: PokerCard[];
  hand: PokerCard[];
  heldCards: boolean[];
  bet: number;
  phase: 'deal' | 'draw' | 'payout';
  credits: number;
  lastWin: number;
  resultMessage: string;
  handRankName?: string;
}

// Casino Slots Types
export interface SlotReelItem {
  symbol: string;
  id: string;
  multiplier: number;
}

export interface SlotsState {
  reels: string[][]; // 3 reels x 3 visible
  spinning: boolean;
  bet: number;
  lastWin: number;
  jackpotPool: number;
  isJackpot: boolean;
  message: string;
}

// Roulette Types
export type RouletteBetType =
  | 'red'
  | 'black'
  | 'even'
  | 'odd'
  | 'low' // 1-18
  | 'high' // 19-36
  | 'dozen1' // 1-12
  | 'dozen2' // 13-24
  | 'dozen3' // 25-36
  | 'number';

export interface RouletteBet {
  type: RouletteBetType;
  value?: number;
  amount: number;
}

export interface RouletteState {
  bets: RouletteBet[];
  spinning: boolean;
  winningNumber: number | null;
  winningColor: 'red' | 'black' | 'green' | null;
  lastWin: number;
  message: string;
}

// ----------------------------------------------------
// Battleship Types
// ----------------------------------------------------
export type ShipType = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer';

export interface Ship {
  id: string;
  type: ShipType;
  name: string;
  size: number;
  positions: { x: number; y: number }[];
  hits: number;
  sunk: boolean;
  color: string;
}

export type CellState = 'empty' | 'ship' | 'hit' | 'miss';

export interface BattleshipState {
  playerBoard: CellState[][];
  enemyBoard: CellState[][];
  playerShips: Ship[];
  enemyShips: Ship[];
  placementPhase: boolean;
  currentTurn: 'player' | 'enemy';
  selectedShip: ShipType | null;
  shipOrientation: 'horizontal' | 'vertical';
  lastMove: { x: number; y: number; hit: boolean; by: 'player' | 'enemy' } | null;
  winner: 'player' | 'enemy' | null;
  shotsFired: { player: number; enemy: number };
  hitsLanded: { player: number; enemy: number };
}

// ----------------------------------------------------
// Connect 4 Types
// ----------------------------------------------------
export type DiscColor = 'red' | 'yellow' | null;

export type Connect4Mode = 'classic' | 'blackout' | 'connect5' | 'pop_out' | 'blitz' | 'gravity_spin';

export interface Connect4RuleConfig {
  mode: Connect4Mode;
  rows: number;
  cols: number;
  winLength: number;
  turnTimerSeconds: number; // 0 = no limit, 10 = blitz
  allowPopOut: boolean;
  allowSpin: boolean;
}

export interface Connect4State {
  board: DiscColor[][]; // dynamic rows x cols
  rows: number;
  cols: number;
  currentTurn: 'red' | 'yellow';
  winner: 'red' | 'yellow' | 'draw' | null;
  winningLine: { row: number; col: number }[] | null;
  droppingDisc: { col: number; targetRow: number; currentRow: number; color: 'red' | 'yellow' } | null;
  moveHistory: { col: number; row: number; color: 'red' | 'yellow'; type?: 'drop' | 'pop' }[];
  mode: Connect4Mode;
  scores: { red: number; yellow: number }; // for blackout / combo modes
  turnTimeLeft: number;
  spinAngle: number;
}

// ----------------------------------------------------
// Chess Types
// ----------------------------------------------------
export type ChessPieceType = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
export type ChessPieceColor = 'w' | 'b';

export interface ChessPiece {
  type: ChessPieceType;
  color: ChessPieceColor;
  hasMoved?: boolean;
}

export type ChessBoard = (ChessPiece | null)[][];

export interface ChessMove {
  from: { r: number; c: number };
  to: { r: number; c: number };
  piece: ChessPiece;
  captured?: ChessPiece | null;
  promotion?: ChessPieceType;
  isCastle?: boolean;
  isEnPassant?: boolean;
}

export interface ChessState {
  board: ChessBoard;
  turn: ChessPieceColor;
  selectedSquare: { r: number; c: number } | null;
  validMoves: { r: number; c: number }[];
  capturedWhite: ChessPiece[];
  capturedBlack: ChessPiece[];
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  lastMove: ChessMove | null;
  moveHistory: string[];
}

// ----------------------------------------------------
// Checkers Types
// ----------------------------------------------------
export type CheckerPieceColor = 'red' | 'black';

export interface CheckerPiece {
  id: string;
  color: CheckerPieceColor;
  isKing: boolean;
}

export type CheckerBoard = (CheckerPiece | null)[][];

export interface CheckerMove {
  from: { r: number; c: number };
  to: { r: number; c: number };
  captured?: { r: number; c: number };
  becomesKing?: boolean;
}

export interface CheckersState {
  board: CheckerBoard;
  turn: CheckerPieceColor;
  selectedSquare: { r: number; c: number } | null;
  validMoves: CheckerMove[];
  redCount: number;
  blackCount: number;
  winner: CheckerPieceColor | 'draw' | null;
  lastMove: CheckerMove | null;
}

// ----------------------------------------------------
// Blackjack (21) Types
// ----------------------------------------------------
export type CardSuit = '♠' | '♥' | '♦' | '♣';
export type CardRank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface PlayingCard {
  suit: CardSuit;
  rank: CardRank;
  value: number;
  faceUp: boolean;
  id: string;
}

export interface BlackjackState {
  deck: PlayingCard[];
  playerHand: PlayingCard[];
  dealerHand: PlayingCard[];
  chips: number;
  currentBet: number;
  gamePhase: 'betting' | 'player_turn' | 'dealer_turn' | 'round_over';
  result: 'player_win' | 'dealer_win' | 'push' | 'blackjack' | 'bust' | null;
  resultMessage: string;
}

// ----------------------------------------------------
// Go Fish Types
// ----------------------------------------------------
export interface GoFishPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  hand: PlayingCard[];
  books: CardRank[];
}

export interface GoFishState {
  players: GoFishPlayer[];
  pond: PlayingCard[];
  currentTurnIndex: number;
  phase: 'ask' | 'fishing' | 'game_over';
  lastActionMessage: string;
  winner: GoFishPlayer | null;
}

// ----------------------------------------------------
// Pawn Rush (Sorry) Types
// ----------------------------------------------------
export type PawnColor = 'blue' | 'red' | 'green' | 'yellow';

export interface Pawn {
  id: number;
  color: PawnColor;
  position: number;
  stepIndex: number;
}

export interface PawnRushCard {
  id: string;
  value: '1' | '2' | '3' | '4' | '5' | '7' | '8' | '10' | '11' | '12' | 'SORRY';
  title: string;
  description: string;
  canStart: boolean;
}

export interface PawnRushState {
  players: PawnColor[];
  pawns: Record<PawnColor, Pawn[]>;
  currentTurnIndex: number;
  currentCard: PawnRushCard | null;
  deck: PawnRushCard[];
  discardPile: PawnRushCard[];
  selectedPawn: Pawn | null;
  validMoveOptions: { pawn: Pawn; targetPosition: number; description: string; swapWith?: Pawn }[];
  winner: PawnColor | null;
  message: string;
}

// ----------------------------------------------------
// Liar's Dice Types
// ----------------------------------------------------
export interface LiarsDicePlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  dice: number[];
  diceCount: number;
  isEliminated: boolean;
}

export interface LiarsDiceBid {
  playerId: string;
  quantity: number;
  faceValue: number;
}

export interface LiarsDiceState {
  players: LiarsDicePlayer[];
  currentTurnIndex: number;
  currentBid: LiarsDiceBid | null;
  lastBid: LiarsDiceBid | null;
  roundPhase: 'bidding' | 'reveal' | 'round_over' | 'game_over';
  revealedDice: { playerId: string; dice: number[] }[] | null;
  revealSummary: {
    challenger: string;
    bidder: string;
    actualCount: number;
    bidCount: number;
    loser: string;
    exactCall?: boolean;
  } | null;
  winner: LiarsDicePlayer | null;
}
