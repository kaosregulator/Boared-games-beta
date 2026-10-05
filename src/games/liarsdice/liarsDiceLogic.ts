import { LiarsDiceBid, LiarsDicePlayer, LiarsDiceState } from '../../types';

export function rollDice(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => a - b);
}

export function initializeLiarsDice(): LiarsDiceState {
  const players: LiarsDicePlayer[] = [
    { id: 'p1', name: 'You (Captain)', avatar: '🏴‍☠️', isBot: false, dice: rollDice(5), diceCount: 5, isEliminated: false },
    { id: 'b1', name: 'Blackbeard Bot', avatar: '🦜', isBot: true, dice: rollDice(5), diceCount: 5, isEliminated: false },
    { id: 'b2', name: 'Barnaby Bot', avatar: '⚓', isBot: true, dice: rollDice(5), diceCount: 5, isEliminated: false }
  ];

  return {
    players,
    currentTurnIndex: 0,
    currentBid: null,
    lastBid: null,
    roundPhase: 'bidding',
    revealedDice: null,
    revealSummary: null,
    winner: null
  };
}

export function countMatchingDice(allDice: number[][], faceValue: number): number {
  let count = 0;
  for (const hand of allDice) {
    for (const d of hand) {
      if (d === faceValue || (faceValue !== 1 && d === 1)) {
        count++;
      }
    }
  }
  return count;
}

export function isValidBid(newBid: { quantity: number; faceValue: number }, currentBid: LiarsDiceBid | null): boolean {
  if (!currentBid) return newBid.quantity >= 1;

  if (newBid.faceValue === 1 && currentBid.faceValue !== 1) {
    return newBid.quantity >= Math.ceil(currentBid.quantity / 2);
  }

  if (newBid.quantity > currentBid.quantity) return true;
  if (newBid.quantity === currentBid.quantity && newBid.faceValue > currentBid.faceValue) return true;

  return false;
}

/**
 * The cheapest legal raise over `bid`, nudged toward faces the bidder actually
 * holds. Without this a bot sitting on a bid of sixes has no legal raise to
 * find and ends up repeating the bid it was given.
 */
export function nextLegalRaise(
  bid: LiarsDiceBid,
  hand: number[],
  totalDice: number,
): { quantity: number; faceValue: number } | null {
  const candidates: { quantity: number; faceValue: number }[] = [];
  for (let f = bid.faceValue + 1; f <= 6; f += 1) candidates.push({ quantity: bid.quantity, faceValue: f });
  for (let f = 2; f <= 6; f += 1) candidates.push({ quantity: bid.quantity + 1, faceValue: f });
  candidates.push({ quantity: Math.max(1, Math.ceil(bid.quantity / 2)), faceValue: 1 });

  const held = new Map<number, number>();
  for (const d of hand) held.set(d, (held.get(d) ?? 0) + 1);

  const legal = candidates.filter(c => c.quantity <= totalDice && isValidBid(c, bid));
  if (legal.length === 0) return null;

  legal.sort(
    (a, b) =>
      a.quantity - (held.get(a.faceValue) ?? 0) * 0.4 - (b.quantity - (held.get(b.faceValue) ?? 0) * 0.4),
  );
  return legal[0];
}
