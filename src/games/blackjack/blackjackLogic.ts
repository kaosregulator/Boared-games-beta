import { PlayingCard, CardSuit, CardRank } from '../../types';

export const createDeck = (): PlayingCard[] => {
  const suits: CardSuit[] = ['♠', '♥', '♦', '♣'];
  const ranks: CardRank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: PlayingCard[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      let value = 10;
      if (rank === 'A') value = 11;
      else if (['J', 'Q', 'K'].includes(rank)) value = 10;
      else value = parseInt(rank, 10);

      deck.push({
        suit,
        rank,
        value,
        faceUp: true,
        id: `${suit}-${rank}-${Math.random().toString(36).substr(2, 5)}`
      });
    }
  }

  // Fisher-Yates Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

export const calculateHandScore = (hand: PlayingCard[]): { total: number; isSoft: boolean; isBust: boolean; isBlackjack: boolean } => {
  const visibleCards = hand.filter(c => c.faceUp);
  let total = 0;
  let aceCount = 0;

  for (const card of visibleCards) {
    total += card.value;
    if (card.rank === 'A') aceCount++;
  }

  while (total > 21 && aceCount > 0) {
    total -= 10;
    aceCount--;
  }

  const isBust = total > 21;
  const isBlackjack = visibleCards.length === 2 && total === 21;
  const isSoft = aceCount > 0;

  return { total, isSoft, isBust, isBlackjack };
};
