import { GameMetadata, LeaderboardEntry, UserProfile } from '../types';

export const GAME_CATALOG: GameMetadata[] = [
  {
    id: 'trivia',
    title: 'Jackbox Trivia Party & Murder Mystery',
    subtitle: 'Movie Quotes, Game Consoles, Killing Floor & Custom AI Packs',
    players: '1 - 8 Players (Party, AI Bots & Co-op)',
    duration: '5 - 15 min',
    boxColor: 'from-purple-950 via-indigo-950 to-slate-900',
    boxAccent: 'border-amber-400/50 text-amber-300',
    badge: 'Jackbox Style & AI',
    description: 'The ultimate animated game show party pack! Features Hollywood Cinephile (quotes, "this actor starred in..."), Video Game Vault (console specs & 8-bit clues), Trivia Murder Mystery with deadly Killing Floor traps, 8-bit synthesized audio rounds, and a Make-Your-Own Pack builder powered by Google AI!',
    rules: [
      'Choose from 5 Game Modes: Party Mix, Hollywood Cinephile, Video Game Vault, Trivia Murder Mystery, or Name That 8-Bit Melody.',
      'Answer fast to earn maximum speed points and multiplier streaks.',
      'In Trivia Murder Mystery: wrong answers send you to the Killing Floor to face deadly survival traps (Poison Chalice, Wire Cut, Guillotine Blade) or become a Ghost!',
      'Make your own custom packs or type any prompt to generate a full quiz instantly with Google AI Gemini!'
    ],
    icon: 'Sparkles',
    rating: '5.0 ★★★★★'
  },
  {
    id: 'poker',
    title: "Texas Hold'em Poker",
    subtitle: '4-Player High-Stakes Oval Table & 5-Card Video Poker',
    players: '1 - 4 Players (You vs 3 AI Bots)',
    duration: '5 - 15 min',
    boxColor: 'from-amber-950 via-yellow-950 to-slate-900',
    boxAccent: 'border-amber-400/40 text-amber-300',
    badge: 'Poker Room',
    description: 'Pull up a seat at the deluxe oval poker table! Deal hole cards, bet blinds, watch the community Flop, Turn & River, check, raise, bluff, go All-In, and evaluate winning hands from Royal Flush to High Card.',
    rules: [
      'Each player is dealt 2 private hole cards. Small & Big blinds post automatically.',
      'Pre-flop betting round: Check, Call, Raise, or Fold.',
      'The dealer reveals community cards: FLOP (3 cards), TURN (1 card), and RIVER (1 card).',
      'Make the highest-ranking 5-card poker hand using your 2 hole cards and the 5 community cards to sweep the pot!'
    ],
    icon: 'Flame',
    rating: '5.0 ★★★★★'
  },
  {
    id: 'casino',
    title: 'Royal Casino Lounge',
    subtitle: 'Lucky Retro 777 Slots, European Roulette & Faucet',
    players: 'Solo & High-Roller Party',
    duration: '1 - 10 min',
    boxColor: 'from-emerald-950 via-teal-950 to-slate-900',
    boxAccent: 'border-emerald-400/40 text-emerald-300',
    badge: 'Casino & Slots',
    description: 'The premier Discord Mini Casino! Spin mechanical 3-reel neon slots for up to 500x Jackpots, place inside/outside bets on the European Roulette wheel, and claim daily faucet chip rewards.',
    rules: [
      'Lucky 777 Slots: Set your wager and pull the spin lever to match 3 symbols for massive payout multipliers (777 = 500x).',
      'European Roulette: Bet on Red, Black, Even, Odd, Dozens, or single numbers (35:1). Spin the wheel to land the silver ball!',
      'Free Faucet: Claim daily bonuses of +1,000 chips to keep your bankroll full.'
    ],
    icon: 'Sparkles',
    rating: '4.9 ★★★★★'
  },
  {
    id: 'battleship',
    title: 'Battleship',
    subtitle: 'Classic Naval Combat with Dual 3D Radar Arrays',
    players: '1 - 2 Players (or AI Admiral)',
    duration: '5 - 10 min',
    boxColor: 'from-slate-900 via-blue-950 to-slate-900',
    boxAccent: 'border-blue-500/40 text-blue-400',
    badge: 'Dual 3D Radar',
    description: 'Command your realistic fleet of 5 naval warships (Aircraft Carrier, Battleship, Cruiser, Submarine, Destroyer) on side-by-side tactical radar grids. Launch artillery strikes, view water splashes, and sink the enemy fleet!',
    rules: [
      'Position your 5 warships (Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2) on your tactical fleet grid.',
      'Take turns targeting enemy coordinates on your radar array.',
      'Red glowing pegs indicate direct hits with explosive smoke; White pegs indicate ocean splashes (misses).',
      'Sink all 5 enemy vessels to achieve naval victory!'
    ],
    icon: 'Ship',
    rating: '4.9 ★★★★★'
  },
  {
    id: 'connect4',
    title: 'Connect Four',
    subtitle: 'Classic Upright Gravity Grid with Animated Hand Drops',
    players: '1 - 2 Players (or Minimax AI)',
    duration: '3 - 5 min',
    boxColor: 'from-blue-900 via-indigo-950 to-slate-900',
    boxAccent: 'border-amber-500/40 text-amber-400',
    badge: 'Hand Animated',
    description: 'The beloved vertical 7x6 grid game with smooth animated hands dropping pieces, realistic gravity disc bounce physics, and tactical 3D isometric perspectives.',
    rules: [
      'Take turns choosing one of 7 columns to drop your colored disc (Red or Yellow).',
      'Discs fall by gravity to the lowest unoccupied slot in the column.',
      'Connect 4 of your discs in a row horizontally, vertically, or diagonally to win.',
      'Block your opponent’s winning lines while creating double-ended traps!'
    ],
    icon: 'Grid',
    rating: '4.9 ★★★★★'
  },
  {
    id: 'chess',
    title: 'Chess',
    subtitle: 'Classic Staunton Chess with Realistic Piece Slide Hands',
    players: '1 - 2 Players (or Grandmaster AI)',
    duration: '10 - 20 min',
    boxColor: 'from-amber-950 via-stone-900 to-black',
    boxAccent: 'border-amber-400/40 text-amber-300',
    badge: 'Animated Hands',
    description: 'Carved wooden tournament chessboard featuring animated hands reaching and moving pieces, legal move path highlights, castling, en passant, pawn promotion, and checkmate detection.',
    rules: [
      'Standard Chess tournament rules. White moves first.',
      'Select any piece to see all legal moves on the wooden board.',
      'Supports special moves: Kingside/Queenside Castling and En Passant captures.',
      'Promote pawns reaching the 8th rank to Queen, Rook, Bishop, or Knight.',
      'Checkmate the opponent’s King to claim victory!'
    ],
    icon: 'Crown',
    rating: '5.0 ★★★★★'
  },
  {
    id: 'checkers',
    title: 'Checkers',
    subtitle: 'Classic Red vs. Black Draughts with King Crowns & Jumps',
    players: '1 - 2 Players (or Draughts AI)',
    duration: '5 - 12 min',
    boxColor: 'from-red-950 via-neutral-900 to-stone-950',
    boxAccent: 'border-red-500/40 text-red-400',
    badge: 'King Crowns',
    description: 'Classic 8x8 checkers on dark walnut squares. Slide diagonal pieces with hand animations, capture opponent pieces with double jumps, and reach the back row to get Kinged with a golden crown!',
    rules: [
      'Pieces move diagonally forward one square onto dark squares.',
      'Jump over an opponent’s adjacent piece into an open space to capture and remove it.',
      'Chain multiple jumps in a single turn if more opponent pieces can be captured.',
      'Reach the opposing back rank to be crowned KING—Kings can move and jump both forwards and backwards!',
      'Capture all enemy pieces or block all legal opponent moves to win.'
    ],
    icon: 'Shield',
    rating: '4.8 ★★★★★'
  },
  {
    id: 'blackjack',
    title: 'Blackjack (21)',
    subtitle: 'Classic Green Felt Casino Table with Chips & Dealer AI',
    players: '1 Player vs. Dealer AI (or Pass & Play)',
    duration: '3 - 8 min',
    boxColor: 'from-emerald-950 via-green-950 to-slate-900',
    boxAccent: 'border-emerald-400/40 text-emerald-300',
    badge: 'Casino Felt',
    description: 'Step up to the velvet green blackjack table! Place your bets with realistic poker chips ($5, $25, $100, $500), hit, stand, double down, or split. Dealer stands on 17.',
    rules: [
      'Place your wager using poker chips and receive 2 initial cards.',
      'Goal: Get your hand value closer to 21 than the dealer without going over (busting).',
      'Aces count as 1 or 11; Face cards (J, Q, K) count as 10.',
      'Hit to draw another card; Stand to end your turn; Double Down to double your bet for exactly 1 card.',
      'Natural Blackjack (Ace + 10-value card) pays 3:2!'
    ],
    icon: 'Flame',
    rating: '4.9 ★★★★★'
  },
  {
    id: 'gofish',
    title: 'Go Fish',
    subtitle: 'Classic Family Card Game with Lake Pond & "Go Fish!"',
    players: '2 - 4 Players (You vs 3 AI Bots)',
    duration: '5 - 10 min',
    boxColor: 'from-cyan-950 via-sky-950 to-blue-950',
    boxAccent: 'border-cyan-400/40 text-cyan-300',
    badge: 'Family Favorite',
    description: 'Dive into the classic fishing pond card game! Ask any player "Got any 7s?", steal matching cards from their hand, or hear them shout "GO FISH!" to draw from the pond. Collect sets of 4 to score books!',
    rules: [
      'Each player starts with 5 cards. The remaining cards form the center "Fishing Pond".',
      'On your turn, choose an opponent and ask for a card rank you already hold (e.g. "Do you have any Queens?").',
      'If they have that rank, they must give you all of them and you get another turn!',
      'If they do not, they yell "GO FISH!" and you draw a card from the lake.',
      'Collecting all 4 cards of any rank creates a BOOK. Player with the most books wins!'
    ],
    icon: 'Sparkles',
    rating: '4.8 ★★★★★'
  },
  {
    id: 'pawnrush',
    title: 'Sorry! (Pawn Rush)',
    subtitle: '4-Player Revenge Race with Slide Tracks & Bump Cards',
    players: '2 - 4 Players (Pass-and-Play or 3 Bots)',
    duration: '8 - 15 min',
    boxColor: 'from-rose-950 via-emerald-950 to-blue-950',
    boxAccent: 'border-emerald-400/40 text-emerald-300',
    badge: '4-Player Party',
    description: 'The ultimate party game of sweet revenge! Draw numbered action cards (1, 2, 4 Backwards, 7 Split, 11 Swap, SORRY!), navigate treacherous slide tracks, bump opponents back to Start, and race your pawns to Home.',
    rules: [
      'Draw a card on your turn. Use numbers 1 or 2 to move a pawn out of START.',
      'Card 4 moves backwards 4 spaces; Card 7 can split steps; Card 11 can swap places with an opponent!',
      'Drawing "SORRY!" moves a pawn from your Start to bump ANY opponent pawn back to their Start.',
      'Slide tracks automatically boost your pawn forward while wiping out all pawns in the slide path.',
      'First player to guide all 3 pawns safely into HOME wins!'
    ],
    icon: 'Sparkles',
    rating: '4.9 ★★★★★'
  },
  {
    id: 'liarsdice',
    title: "Liar's Dice (Perudo)",
    subtitle: 'Classic Pirate Cup Bluffing & Escalating Bids',
    players: '2 - 4 Players (or Pirate Bots)',
    duration: '5 - 10 min',
    boxColor: 'from-amber-900 via-amber-950 to-yellow-950',
    boxAccent: 'border-yellow-500/40 text-yellow-400',
    badge: 'Bluff & Bet',
    description: 'Shake leather dice cups, peek under your cup, make escalating bids on total dice across the table (1s are Wild!), or slam the table and call "LIAR!" to catch your rivals bluffing.',
    rules: [
      'Each player starts with 5 dice under their cup. Shake and secretly peek at your roll.',
      'Take turns bidding total dice count and face value across the whole table (e.g. "Four 5s").',
      'Aces (1s) are WILD and count towards any number unless someone bids on 1s directly.',
      'Each bid must increase the quantity of dice OR the face value.',
      'Call "LIAR!" if you doubt the last bid. All cups lift—loser loses a die until only one pirate remains!'
    ],
    icon: 'Dice',
    rating: '4.9 ★★★★★'
  }
];

export const INITIAL_USER_PROFILE: UserProfile = {
  id: 'user_me',
  name: 'Captain_Gamer',
  avatarEmoji: '🎮',
  avatarBg: 'from-blue-600 to-indigo-600',
  tag: '#1337',
  title: 'Naval Grandmaster',
  rank: 'Diamond',
  seasonScore: 2840,
  chips: 1500,
  wins: 48,
  losses: 12,
  winStreak: 6
};

export const LEADERBOARD_DATA: LeaderboardEntry[] = [
  { id: 'l1', name: 'Grandmaster_Elena', avatar: '👑', title: 'Tactical Genius', rank: 'Grandmaster', score: 3450, wins: 89, losses: 14, favoriteGame: 'Chess', badge: '🥇 1st Place' },
  { id: 'l2', name: 'Admiral_Nelson', avatar: '⚓', title: 'Fleet Commander', rank: 'Grandmaster', score: 3280, wins: 76, losses: 18, favoriteGame: 'Battleship', badge: '🥈 2nd Place' },
  { id: 'l3', name: 'Captain_Gamer (You)', avatar: '🎮', title: 'Naval Grandmaster', rank: 'Diamond', score: 2840, wins: 48, losses: 12, favoriteGame: "Texas Hold'em", badge: '🥉 3rd Place' },
  { id: 'l4', name: 'ShadowKing_09', avatar: '♟️', title: 'Draughts Master', rank: 'Diamond', score: 2690, wins: 45, losses: 15, favoriteGame: 'Checkers', badge: 'Top 5' },
  { id: 'l5', name: 'Vegas_Viper', avatar: '♠️', title: 'High-Roller Shark', rank: 'Platinum', score: 2420, wins: 38, losses: 19, favoriteGame: 'Casino Lounge', badge: 'Top 10' },
  { id: 'l6', name: 'PondFisher_99', avatar: '🎣', title: 'Book Collector', rank: 'Platinum', score: 2190, wins: 32, losses: 16, favoriteGame: 'Go Fish', badge: 'Top 10' },
  { id: 'l7', name: 'SorryNotSorry', avatar: '🎲', title: 'Revenge Racer', rank: 'Gold', score: 1850, wins: 28, losses: 20, favoriteGame: 'Sorry!', badge: 'Challenger' },
  { id: 'l8', name: 'Blackbeard_Bot', avatar: '🏴‍☠️', title: 'Dice Bluffer', rank: 'Gold', score: 1620, wins: 24, losses: 22, favoriteGame: "Liar's Dice", badge: 'Challenger' }
];

export const MOCK_DISCORD_USERS = [
  { id: 'u1', name: 'Captain_Gamer', avatar: '🎮', color: 'bg-blue-600', status: 'online' as const, isSpeaking: true },
  { id: 'u2', name: 'PixelKnight', avatar: '🛡️', color: 'bg-emerald-600', status: 'online' as const, isSpeaking: false },
  { id: 'u3', name: 'Valkyrie_99', avatar: '⚡', color: 'bg-amber-600', status: 'dnd' as const, isSpeaking: false },
  { id: 'u4', name: 'AstroBot', avatar: '🤖', color: 'bg-rose-600', isBot: true, status: 'online' as const, isSpeaking: false }
];
