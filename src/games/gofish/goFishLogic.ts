import { PlayingCard, CardRank, CardSuit, GoFishPlayer, GoFishState } from '../../types';

export const createGoFishDeck = (): PlayingCard[] => {
  const suits: CardSuit[] = ['♠', '♥', '♦', '♣'];
  const ranks: CardRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: PlayingCard[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        value: 1,
        faceUp: true,
        id: `${suit}-${rank}-${Math.random().toString(36).substr(2, 5)}`
      });
    }
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

export const checkForBooks = (hand: PlayingCard[]): { newBooks: CardRank[]; remainingHand: PlayingCard[] } => {
  const rankCounts: Record<CardRank, PlayingCard[]> = {} as any;

  for (const card of hand) {
    if (!rankCounts[card.rank]) rankCounts[card.rank] = [];
    rankCounts[card.rank].push(card);
  }

  const newBooks: CardRank[] = [];
  const remainingHand: PlayingCard[] = [];

  for (const rank in rankCounts) {
    const cards = rankCounts[rank as CardRank];
    if (cards.length === 4) {
      newBooks.push(rank as CardRank);
    } else {
      remainingHand.push(...cards);
    }
  }

  return { newBooks, remainingHand };
};

/** Every ask made out loud, which is the information real players play off. */
export interface AskRecord {
  askerId: string;
  rank: CardRank;
}

/**
 * Bots play the table talk rather than guessing: if an opponent has asked for a
 * rank this bot holds, that opponent almost certainly still holds one, so ask
 * them for it. Failing that, lead with the rank the bot holds most of and press
 * the fullest hand, which is where the cards are.
 */
export const botChoice = (
  bot: GoFishPlayer,
  others: GoFishPlayer[],
  memory: AskRecord[],
): { targetId: string; rank: CardRank } | null => {
  const live = others.filter(p => p.hand.length > 0);
  if (live.length === 0 || bot.hand.length === 0) return null;

  const held = new Set(bot.hand.map(c => c.rank));
  for (let i = memory.length - 1; i >= 0; i -= 1) {
    const { askerId, rank } = memory[i];
    if (askerId === bot.id || !held.has(rank)) continue;
    const target = live.find(p => p.id === askerId);
    if (target) return { targetId: target.id, rank };
  }

  const counts = new Map<CardRank, number>();
  for (const card of bot.hand) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
  let rank = bot.hand[0].rank;
  let best = 0;
  for (const [r, n] of counts) {
    if (n > best) {
      best = n;
      rank = r;
    }
  }

  const target = live.reduce((a, b) => (b.hand.length > a.hand.length ? b : a));
  return { targetId: target.id, rank };
};
