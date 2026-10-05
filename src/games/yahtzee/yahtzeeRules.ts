/**
 * Full Yahtzee scoring, including the parts the old stub skipped: the 35 point
 * upper-section bonus at 63, the +100 bonus for every Yahtzee after the first,
 * and the Joker rules that govern where a bonus Yahtzee may be placed.
 */

export type UpperCategory = 'aces' | 'twos' | 'threes' | 'fours' | 'fives' | 'sixes';
export type LowerCategory =
  | 'threeKind'
  | 'fourKind'
  | 'fullHouse'
  | 'smallStraight'
  | 'largeStraight'
  | 'yahtzee'
  | 'chance';
export type Category = UpperCategory | LowerCategory;

export const UPPER: { id: UpperCategory; label: string; face: number }[] = [
  { id: 'aces', label: 'Aces', face: 1 },
  { id: 'twos', label: 'Twos', face: 2 },
  { id: 'threes', label: 'Threes', face: 3 },
  { id: 'fours', label: 'Fours', face: 4 },
  { id: 'fives', label: 'Fives', face: 5 },
  { id: 'sixes', label: 'Sixes', face: 6 },
];

export const LOWER: { id: LowerCategory; label: string; detail: string }[] = [
  { id: 'threeKind', label: 'Three of a kind', detail: 'Sum of all dice' },
  { id: 'fourKind', label: 'Four of a kind', detail: 'Sum of all dice' },
  { id: 'fullHouse', label: 'Full house', detail: '25' },
  { id: 'smallStraight', label: 'Small straight', detail: '30' },
  { id: 'largeStraight', label: 'Large straight', detail: '40' },
  { id: 'yahtzee', label: 'YAHTZEE', detail: '50' },
  { id: 'chance', label: 'Chance', detail: 'Sum of all dice' },
];

export const ALL_CATEGORIES: Category[] = [...UPPER.map(u => u.id), ...LOWER.map(l => l.id)];

export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS = 35;
export const YAHTZEE_BONUS = 100;

export type ScoreCard = Partial<Record<Category, number>>;

export interface PlayerState {
  name: string;
  isAI: boolean;
  card: ScoreCard;
  /** Extra Yahtzees rolled after the 50 point box was filled. */
  yahtzeeBonuses: number;
}

export function counts(dice: number[]) {
  const c = [0, 0, 0, 0, 0, 0, 0];
  dice.forEach(d => {
    if (d >= 1 && d <= 6) c[d] += 1;
  });
  return c;
}

const sum = (dice: number[]) => dice.reduce((a, b) => a + b, 0);

function straightRun(c: number[]) {
  let best = 0;
  let run = 0;
  for (let f = 1; f <= 6; f += 1) {
    if (c[f] > 0) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}

export function isYahtzee(dice: number[]) {
  return dice.length === 5 && counts(dice).some(n => n === 5);
}

/**
 * Raw score for a category.
 *
 * `card` is needed for the Joker rules: once the Yahtzee box is filled, a new
 * five-of-a-kind scores its full house / straight boxes at face value (25/30/40)
 * even though the dice are not literally a full house or a straight.
 */
export function scoreFor(category: Category, dice: number[], card: ScoreCard = {}): number {
  const c = counts(dice);
  const total = sum(dice);
  const upper = UPPER.find(u => u.id === category);
  if (upper) return c[upper.face] * upper.face;

  const jokerActive =
    isYahtzee(dice) && card.yahtzee !== undefined && c[dice[0]] === 5;

  switch (category) {
    case 'threeKind':
      return c.some(n => n >= 3) ? total : 0;
    case 'fourKind':
      return c.some(n => n >= 4) ? total : 0;
    case 'fullHouse':
      if (jokerActive) return 25;
      return c.includes(3) && c.includes(2) ? 25 : 0;
    case 'smallStraight':
      if (jokerActive) return 30;
      return straightRun(c) >= 4 ? 30 : 0;
    case 'largeStraight':
      if (jokerActive) return 40;
      return straightRun(c) >= 5 ? 40 : 0;
    case 'yahtzee':
      return isYahtzee(dice) ? 50 : 0;
    case 'chance':
      return total;
    default:
      return 0;
  }
}

/**
 * Which boxes a player may legally use for these dice.
 *
 * Normally that is every empty box. The Joker rules add one restriction: with a
 * bonus Yahtzee, the matching upper box must be used if it is still open, and
 * only once it is full may the lower section be used.
 */
export function legalCategories(dice: number[], card: ScoreCard): Category[] {
  const open = ALL_CATEGORIES.filter(cat => card[cat] === undefined);
  if (!isYahtzee(dice) || card.yahtzee === undefined) return open;

  const face = dice[0];
  const matching = UPPER.find(u => u.face === face)!.id;
  if (card[matching] === undefined) return [matching];
  const lowerOpen = open.filter(cat => LOWER.some(l => l.id === cat));
  return lowerOpen.length > 0 ? lowerOpen : open;
}

export function upperSubtotal(card: ScoreCard) {
  return UPPER.reduce((acc, u) => acc + (card[u.id] ?? 0), 0);
}

export function upperBonus(card: ScoreCard) {
  return upperSubtotal(card) >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS : 0;
}

export function lowerSubtotal(card: ScoreCard) {
  return LOWER.reduce((acc, l) => acc + (card[l.id] ?? 0), 0);
}

export function grandTotal(player: PlayerState) {
  return (
    upperSubtotal(player.card) +
    upperBonus(player.card) +
    lowerSubtotal(player.card) +
    player.yahtzeeBonuses * YAHTZEE_BONUS
  );
}

export function cardComplete(card: ScoreCard) {
  return ALL_CATEGORIES.every(cat => card[cat] !== undefined);
}

export function emptyPlayer(name: string, isAI: boolean): PlayerState {
  return { name, isAI, card: {}, yahtzeeBonuses: 0 };
}

/* ------------------------------- opponent --------------------------------- */

/** Expected value of keeping a face for the upper section. */
function upperValue(card: ScoreCard, face: number, kept: number) {
  const id = UPPER.find(u => u.face === face)!.id;
  if (card[id] !== undefined) return 0;
  return kept * face * 1.15;
}

/**
 * Which dice the opponent keeps. Chases a Yahtzee or a straight when it is
 * close, otherwise keeps the most valuable repeated face, and respects what is
 * still open on its own card.
 */
export function aiKeepMask(dice: number[], card: ScoreCard, rollsLeft: number): boolean[] {
  const c = counts(dice);
  const best = { face: 0, n: 0 };
  for (let f = 6; f >= 1; f -= 1) {
    if (c[f] > best.n) {
      best.face = f;
      best.n = c[f];
    }
  }

  const run = straightRun(c);
  const wantsStraight =
    (card.largeStraight === undefined || card.smallStraight === undefined) &&
    run >= 3 &&
    best.n <= 2;

  if (wantsStraight && rollsLeft > 0) {
    // keep one of each distinct face inside the longest run
    const seen = new Set<number>();
    return dice.map(d => {
      if (c[d] > 0 && !seen.has(d)) {
        seen.add(d);
        return true;
      }
      return false;
    });
  }

  if (best.n >= 2) {
    const alt = [1, 2, 3, 4, 5, 6]
      .filter(f => f !== best.face && c[f] >= 2)
      .sort((a, b) => upperValue(card, b, c[b]) - upperValue(card, a, c[a]))[0];
    const face = alt !== undefined && upperValue(card, alt, c[alt]) > upperValue(card, best.face, best.n) ? alt : best.face;
    return dice.map(d => d === face);
  }

  // Nothing paired: keep high faces that still have an open upper box.
  return dice.map(d => d >= 5 && card[UPPER.find(u => u.face === d)!.id] === undefined);
}

/** Which open box the opponent fills, balancing raw points against waste. */
export function aiChooseCategory(dice: number[], card: ScoreCard): Category {
  const legal = legalCategories(dice, card);
  let bestCat = legal[0];
  let bestScore = -Infinity;

  for (const cat of legal) {
    const raw = scoreFor(cat, dice, card);
    let weighted = raw;

    // Holding the upper section open is worth something because of the bonus.
    const upper = UPPER.find(u => u.id === cat);
    if (upper) {
      const needed = UPPER_BONUS_THRESHOLD - upperSubtotal(card);
      if (raw >= upper.face * 3) weighted += 4;
      if (raw < upper.face * 2 && needed > 0) weighted -= 6;
    }

    // Don't burn the big boxes for nothing while easier boxes are open.
    if ((cat === 'yahtzee' || cat === 'largeStraight') && raw === 0) weighted -= 14;
    if (cat === 'chance' && raw < 20) weighted -= 8;
    if (cat === 'fullHouse' && raw === 0) weighted -= 5;

    if (weighted > bestScore) {
      bestScore = weighted;
      bestCat = cat;
    }
  }
  return bestCat;
}
