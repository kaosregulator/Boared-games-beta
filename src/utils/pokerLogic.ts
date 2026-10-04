import { PokerCard, PokerRank, PokerSuit, EvaluatedHand, HandRanking, PokerPlayer, PokerState } from '../types';

const SUITS: PokerSuit[] = ['♠', '♥', '♦', '♣'];
const RANKS: PokerRank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const RANK_VALUES: Record<PokerRank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14
};

export const RANK_NAMES: Record<number, string> = {
  2: '2s',
  3: '3s',
  4: '4s',
  5: '5s',
  6: '6s',
  7: '7s',
  8: '8s',
  9: '9s',
  10: '10s',
  11: 'Jacks',
  12: 'Queens',
  13: 'Kings',
  14: 'Aces'
};

export function createPokerDeck(): PokerCard[] {
  const deck: PokerCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}${suit}_${Math.random().toString(36).substr(2, 5)}`,
        suit,
        rank,
        value: RANK_VALUES[rank],
        faceUp: true
      });
    }
  }
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: PokerCard[]): PokerCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate all combinations of k elements from array
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const head = arr[0];
  const tail = arr.slice(1);
  const withHead = combinations(tail, k - 1).map(c => [head, ...c]);
  const withoutHead = combinations(tail, k);
  return [...withHead, ...withoutHead];
}

// Evaluate exact 5-card poker hand
export function evaluate5CardHand(cards: PokerCard[]): EvaluatedHand {
  if (cards.length !== 5) {
    return {
      ranking: 'high_card',
      name: 'High Card',
      score: 0,
      bestCards: cards
    };
  }

  // Sort descending by card value
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const values = sorted.map(c => c.value);
  const suits = sorted.map(c => c.suit);

  const isFlush = suits.every(s => s === suits[0]);

  // Check for straight
  let isStraight = false;
  let straightHigh = 0;

  // Regular straight
  if (
    values[0] - values[1] === 1 &&
    values[1] - values[2] === 1 &&
    values[2] - values[3] === 1 &&
    values[3] - values[4] === 1
  ) {
    isStraight = true;
    straightHigh = values[0];
  } else if (
    values[0] === 14 &&
    values[1] === 5 &&
    values[2] === 4 &&
    values[3] === 3 &&
    values[4] === 2
  ) {
    // 5-high straight (wheel: A-2-3-4-5)
    isStraight = true;
    straightHigh = 5;
  }

  // Value frequency count
  const counts: Record<number, number> = {};
  for (const v of values) {
    counts[v] = (counts[v] || 0) + 1;
  }

  const countPairs = Object.entries(counts).map(([v, count]) => ({
    val: Number(v),
    count
  }));
  // Sort by count desc, then val desc
  countPairs.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.val - a.val;
  });

  // 1. Royal Flush
  if (isFlush && isStraight && straightHigh === 14) {
    return {
      ranking: 'royal_flush',
      name: `Royal Flush (${suits[0]})`,
      score: 10000000,
      bestCards: sorted
    };
  }

  // 2. Straight Flush
  if (isFlush && isStraight) {
    return {
      ranking: 'straight_flush',
      name: `Straight Flush (${RANK_NAMES[straightHigh] || straightHigh} High)`,
      score: 9000000 + straightHigh,
      bestCards: sorted
    };
  }

  // 3. Four of a Kind
  if (countPairs[0].count === 4) {
    const quadVal = countPairs[0].val;
    const kicker = countPairs[1].val;
    return {
      ranking: 'four_of_a_kind',
      name: `Four of a Kind, ${RANK_NAMES[quadVal]}`,
      score: 8000000 + quadVal * 100 + kicker,
      bestCards: sorted
    };
  }

  // 4. Full House
  if (countPairs[0].count === 3 && countPairs[1].count === 2) {
    const tripVal = countPairs[0].val;
    const pairVal = countPairs[1].val;
    return {
      ranking: 'full_house',
      name: `Full House, ${RANK_NAMES[tripVal]} full of ${RANK_NAMES[pairVal]}`,
      score: 7000000 + tripVal * 100 + pairVal,
      bestCards: sorted
    };
  }

  // 5. Flush
  if (isFlush) {
    const score = 6000000 + values.reduce((acc, v, i) => acc + v * Math.pow(15, 4 - i), 0);
    return {
      ranking: 'flush',
      name: `Flush (${RANK_NAMES[values[0]]} High)`,
      score,
      bestCards: sorted
    };
  }

  // 6. Straight
  if (isStraight) {
    return {
      ranking: 'straight',
      name: `Straight (${RANK_NAMES[straightHigh]} High)`,
      score: 5000000 + straightHigh,
      bestCards: sorted
    };
  }

  // 7. Three of a Kind
  if (countPairs[0].count === 3) {
    const tripVal = countPairs[0].val;
    const kickers = countPairs.slice(1).map(cp => cp.val);
    const score = 4000000 + tripVal * 1000 + kickers[0] * 15 + (kickers[1] || 0);
    return {
      ranking: 'three_of_a_kind',
      name: `Three of a Kind, ${RANK_NAMES[tripVal]}`,
      score,
      bestCards: sorted
    };
  }

  // 8. Two Pair
  if (countPairs[0].count === 2 && countPairs[1].count === 2) {
    const highPair = Math.max(countPairs[0].val, countPairs[1].val);
    const lowPair = Math.min(countPairs[0].val, countPairs[1].val);
    const kicker = countPairs[2].val;
    const score = 3000000 + highPair * 1000 + lowPair * 50 + kicker;
    return {
      ranking: 'two_pair',
      name: `Two Pair, ${RANK_NAMES[highPair]} and ${RANK_NAMES[lowPair]}`,
      score,
      bestCards: sorted
    };
  }

  // 9. One Pair
  if (countPairs[0].count === 2) {
    const pairVal = countPairs[0].val;
    const kickers = countPairs.slice(1).map(cp => cp.val);
    const score = 2000000 + pairVal * 10000 + kickers[0] * 300 + (kickers[1] || 0) * 15 + (kickers[2] || 0);
    return {
      ranking: 'one_pair',
      name: `Pair of ${RANK_NAMES[pairVal]}`,
      score,
      bestCards: sorted
    };
  }

  // 10. High Card
  const score = 1000000 + values.reduce((acc, v, i) => acc + v * Math.pow(15, 4 - i), 0);
  return {
    ranking: 'high_card',
    name: `High Card (${RANK_NAMES[values[0]]})`,
    score,
    bestCards: sorted
  };
}

// Evaluate 5 to 7 cards (e.g. hole cards + community cards)
export function evaluatePokerHand(cards: PokerCard[]): EvaluatedHand {
  if (cards.length < 5) {
    // Partial evaluation for pre-flop or flop
    if (cards.length === 2) {
      const sorted = [...cards].sort((a, b) => b.value - a.value);
      if (sorted[0].value === sorted[1].value) {
        return {
          ranking: 'one_pair',
          name: `Pocket Pair of ${RANK_NAMES[sorted[0].value]}`,
          score: 2000000 + sorted[0].value * 1000,
          bestCards: sorted
        };
      }
      return {
        ranking: 'high_card',
        name: `${RANK_NAMES[sorted[0].value]} & ${RANK_NAMES[sorted[1].value]}`,
        score: 1000000 + sorted[0].value * 15 + sorted[1].value,
        bestCards: sorted
      };
    }
    return {
      ranking: 'high_card',
      name: `${cards.length} Cards`,
      score: 0,
      bestCards: cards
    };
  }

  if (cards.length === 5) {
    return evaluate5CardHand(cards);
  }

  // 6 or 7 cards: find best 5-card combination
  const combos = combinations(cards, 5);
  let bestHand: EvaluatedHand | null = null;

  for (const combo of combos) {
    const current = evaluate5CardHand(combo);
    if (!bestHand || current.score > bestHand.score) {
      bestHand = current;
    }
  }

  return (
    bestHand || {
      ranking: 'high_card',
      name: 'High Card',
      score: 0,
      bestCards: cards.slice(0, 5)
    }
  );
}

// Smart AI Poker Bot Decision
export function getAIPokerDecision(
  player: PokerPlayer,
  gameState: PokerState
): { action: 'fold' | 'check' | 'call' | 'raise' | 'allin'; amount: number; message: string } {
  const callAmount = gameState.currentBet - player.currentBet;
  const allCards = [...player.cards, ...gameState.communityCards];
  const evalResult = evaluatePokerHand(allCards);
  const personality = player.personality || 'balanced';

  // Calculate hand strength relative score
  const isPreflop = gameState.communityCards.length === 0;

  // Pre-flop logic
  if (isPreflop) {
    const card1 = player.cards[0]?.value || 0;
    const card2 = player.cards[1]?.value || 0;
    const isPair = card1 === card2;
    const isSuited = player.cards[0]?.suit === player.cards[1]?.suit;
    const highVal = Math.max(card1, card2);

    // Premium hands: AA, KK, QQ, JJ, AK
    const isPremium = isPair && highVal >= 10 || (highVal === 14 && Math.min(card1, card2) >= 11);
    const isGood = isPair || highVal >= 12 || (highVal >= 10 && isSuited);

    if (callAmount === 0) {
      if (isPremium && (personality === 'aggressive' || personality === 'bluffer')) {
        const raiseVal = Math.min(player.chips, gameState.bigBlind * 3);
        return { action: 'raise', amount: raiseVal, message: `raises $${raiseVal}` };
      }
      return { action: 'check', amount: 0, message: 'checks' };
    }

    if (isPremium) {
      if (personality === 'aggressive' && player.chips > callAmount * 2) {
        const raiseVal = Math.min(player.chips, callAmount * 2 + gameState.bigBlind);
        return { action: 'raise', amount: raiseVal, message: `raises to $${player.currentBet + raiseVal}` };
      }
      return { action: 'call', amount: Math.min(player.chips, callAmount), message: `calls $${callAmount}` };
    }

    if (isGood) {
      if (callAmount <= gameState.bigBlind * 3) {
        return { action: 'call', amount: Math.min(player.chips, callAmount), message: `calls $${callAmount}` };
      }
      return { action: 'fold', amount: 0, message: 'folds' };
    }

    // Weak preflop
    if (callAmount <= gameState.bigBlind) {
      return { action: 'call', amount: Math.min(player.chips, callAmount), message: `calls $${callAmount}` };
    }

    if (personality === 'bluffer' && Math.random() < 0.25) {
      const raiseVal = Math.min(player.chips, gameState.bigBlind * 2);
      return { action: 'raise', amount: raiseVal, message: `bluff raises to $${player.currentBet + raiseVal}` };
    }

    return { action: 'fold', amount: 0, message: 'folds' };
  }

  // Post-flop logic
  const rankScores: Record<HandRanking, number> = {
    royal_flush: 10,
    straight_flush: 9,
    four_of_a_kind: 8,
    full_house: 7,
    flush: 6,
    straight: 5,
    three_of_a_kind: 4,
    two_pair: 3,
    one_pair: 2,
    high_card: 1
  };

  const power = rankScores[evalResult.ranking] || 1;

  // Monsters: Flush, Full House, Quads, Straight
  if (power >= 5) {
    if (callAmount === 0) {
      const raiseVal = Math.min(player.chips, Math.max(gameState.bigBlind * 2, Math.floor(gameState.pot * 0.5)));
      return { action: 'raise', amount: raiseVal, message: `bets $${raiseVal}` };
    }
    if (personality === 'aggressive' && player.chips > callAmount * 2) {
      const raiseVal = Math.min(player.chips, callAmount * 2);
      return { action: 'raise', amount: raiseVal, message: `raises $${raiseVal}` };
    }
    return { action: 'call', amount: Math.min(player.chips, callAmount), message: `calls $${callAmount}` };
  }

  // Strong: Three of a Kind or Two Pair
  if (power >= 3) {
    if (callAmount === 0) {
      if (Math.random() < 0.6) {
        const betVal = Math.min(player.chips, gameState.bigBlind * 2);
        return { action: 'raise', amount: betVal, message: `bets $${betVal}` };
      }
      return { action: 'check', amount: 0, message: 'checks' };
    }
    if (callAmount <= gameState.pot * 0.7) {
      return { action: 'call', amount: Math.min(player.chips, callAmount), message: `calls $${callAmount}` };
    }
    return { action: 'fold', amount: 0, message: 'folds' };
  }

  // Moderate: One Pair
  if (power === 2) {
    if (callAmount === 0) {
      return { action: 'check', amount: 0, message: 'checks' };
    }
    if (callAmount <= gameState.bigBlind * 2 || callAmount <= gameState.pot * 0.3) {
      return { action: 'call', amount: Math.min(player.chips, callAmount), message: `calls $${callAmount}` };
    }
    return { action: 'fold', amount: 0, message: 'folds' };
  }

  // Weak: High Card
  if (callAmount === 0) {
    if (personality === 'bluffer' && Math.random() < 0.3) {
      const bluffBet = Math.min(player.chips, gameState.bigBlind * 2);
      return { action: 'raise', amount: bluffBet, message: `bluff bets $${bluffBet}` };
    }
    return { action: 'check', amount: 0, message: 'checks' };
  }

  if (personality === 'bluffer' && Math.random() < 0.15 && callAmount <= gameState.bigBlind * 2) {
    return { action: 'call', amount: Math.min(player.chips, callAmount), message: `calls $${callAmount}` };
  }

  return { action: 'fold', amount: 0, message: 'folds' };
}
