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
