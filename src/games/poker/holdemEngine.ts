import type { PokerCard, PokerPlayer, PokerState } from '../../types';
import { createPokerDeck, evaluatePokerHand, getAIPokerDecision } from '../../utils/pokerLogic';

/**
 * Four-handed Texas Hold'em for the table. Chips in a hand are `committed`
 * (already out of the stack). A short all-in only contests the layers it
 * paid for; the extra stays with the deeper stacks.
 */

export const SEAT_COUNT = 4;
export const SMALL_BLIND = 10;
export const BIG_BLIND = 20;
const REBUY = 500;

const NAMES = ['You', 'Bluffing Bob', 'Lucky Lisa', 'HighRoller Dave'] as const;
const PERSONALITY = ['balanced', 'bluffer', 'aggressive', 'tight'] as const;

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'over';
export type HoldemAction = 'fold' | 'check' | 'call' | 'raise' | 'allin';

export interface Seat {
  name: string;
  bot: boolean;
  chips: number;
  /** This street's bet, counted inside `committed`. */
  bet: number;
  committed: number;
  hole: PokerCard[];
  folded: boolean;
  allIn: boolean;
  /** Has matched the current bet since the last raise. */
  acted: boolean;
  handName?: string;
}

export interface Winner {
  seat: number;
  amount: number;
  hand: string;
}

export interface Holdem {
  deck: PokerCard[];
  board: PokerCard[];
  seats: Seat[];
  /** Highest bet on this street. */
  streetBet: number;
  dealer: number;
  /** Whose turn. -1 when the hand is over. */
  actor: number;
  street: Street;
  note: string;
  handNo: number;
  winners: Winner[];
}

export interface Legal {
  check: boolean;
  /** Chips required to match, capped by the stack. */
  call: number;
  /** Chips to put in for a minimum raise, or an all-in if the stack is shorter. 0 when a raise is impossible. */
  minRaise: number;
  allIn: number;
}

function seat(i: number, chips: number): Seat {
  return {
    name: NAMES[i] ?? `Seat ${i + 1}`,
    bot: i !== 0,
    chips,
    bet: 0,
    committed: 0,
    hole: [],
    folded: false,
    allIn: false,
    acted: false,
  };
}

function clone(s: Holdem): Holdem {
  return {
    ...s,
    deck: s.deck.map(c => ({ ...c })),
    board: s.board.map(c => ({ ...c })),
    seats: s.seats.map(p => ({ ...p, hole: p.hole.map(c => ({ ...c })) })),
    winners: s.winners.map(w => ({ ...w })),
  };
}

function post(p: Seat, n: number) {
  const pay = Math.min(p.chips, Math.max(0, n));
  p.chips -= pay;
  p.bet += pay;
  p.committed += pay;
  p.allIn = p.chips === 0 && pay > 0;
  return pay;
}

function canAct(p: Seat) {
  return !p.folded && !p.allIn && p.chips > 0;
}

function firstWhoCan(s: Holdem, start: number) {
  for (let i = 0; i < SEAT_COUNT; i += 1) {
    const k = (start + i) % SEAT_COUNT;
    if (canAct(s.seats[k])) return k;
  }
  return -1;
}

function standing(s: Holdem) {
  return s.seats.reduce((n, p) => n + (p.folded ? 0 : 1), 0);
}

export function committed(s: Holdem) {
  return s.seats.reduce((n, p) => n + p.committed, 0);
}

/** Chips already in the middle, not counting this street's bets in front of each seat. */
export function potBeforeStreet(s: Holdem) {
  return s.seats.reduce((n, p) => n + p.committed - p.bet, 0);
}

export function bankroll(s: Holdem) {
  return s.seats.reduce((n, p) => n + p.chips + p.committed, 0);
}

function dealBoard(s: Holdem, n: number) {
  for (let i = 0; i < n && s.deck.length > 0; i += 1) {
    const c = s.deck[0];
    s.deck = s.deck.slice(1);
    s.board.push({ ...c, faceUp: true });
  }
}

function streetClosed(s: Holdem) {
  const waiting = s.seats.filter(canAct);
  if (waiting.length === 0) return true;
  return waiting.every(p => p.acted && p.bet === s.streetBet);
}

function awardLast(s: Holdem) {
  const winner = s.seats.findIndex(p => !p.folded);
  const pot = committed(s);
  if (winner >= 0) s.seats[winner].chips += pot;
  s.seats.forEach(p => {
    p.committed = 0;
    p.bet = 0;
  });
  s.winners = winner >= 0 ? [{ seat: winner, amount: pot, hand: 'last one in' }] : [];
  s.street = 'over';
  s.actor = -1;
  s.streetBet = 0;
  s.note = winner >= 0 ? `${s.seats[winner].name} wins $${pot}. Everyone else folded.` : 'The hand is over.';
  return s;
}

function showdown(s: Holdem) {
  if (s.board.length < 5) dealBoard(s, 5 - s.board.length);
  const scores = s.seats.map(p => {
    if (p.folded || p.hole.length < 2) return -1;
    const ev = evaluatePokerHand([...p.hole, ...s.board]);
    p.handName = ev.name;
    p.hole.forEach(c => {
      c.faceUp = true;
    });
    return ev.score;
  });
  const left = s.seats.map(p => p.committed);
  const paid = new Map<number, number>();
  while (left.some(n => n > 0)) {
    const involved = left.map((n, i) => (n > 0 ? i : -1)).filter(i => i >= 0);
    const stake = Math.min(...involved.map(i => left[i]));
    const layer = stake * involved.length;
    involved.forEach(i => {
      left[i] -= stake;
    });
    const eligible = involved.filter(i => !s.seats[i].folded);
    if (layer <= 0) continue;
    if (eligible.length === 0) {
      involved.forEach(i => {
        s.seats[i].chips += stake;
      });
      continue;
    }
    const best = Math.max(...eligible.map(i => scores[i]));
    const winners = eligible.filter(i => scores[i] === best);
    const share = Math.floor(layer / winners.length);
    const odd = layer - share * winners.length;
    winners.forEach((i, k) => {
      const got = share + (k === 0 ? odd : 0);
      s.seats[i].chips += got;
      paid.set(i, (paid.get(i) ?? 0) + got);
    });
  }
  s.seats.forEach(p => {
    p.committed = 0;
    p.bet = 0;
  });
  s.winners = [...paid.entries()].map(([seat, amount]) => ({
    seat,
    amount,
    hand: s.seats[seat].handName ?? 'High Card',
  }));
  s.street = 'over';
  s.actor = -1;
  s.streetBet = 0;
  s.note = s.winners.length
    ? s.winners.map(w => `${s.seats[w.seat].name} takes $${w.amount} with ${w.hand}`).join('. ') + '.'
    : 'Showdown.';
  return s;
}

function runout(s: Holdem) {
  if (standing(s) <= 1) return awardLast(s);
  return showdown(s);
}

function openStreet(s: Holdem, street: Street, cards: number, label: string) {
  dealBoard(s, cards);
  s.street = street;
  s.seats.forEach(p => {
    p.bet = 0;
    p.acted = false;
  });
  s.streetBet = 0;
  s.actor = firstWhoCan(s, (s.dealer + 1) % SEAT_COUNT);
  s.note = label;
  if (s.actor < 0) return runout(s);
  return s;
}

function advance(s: Holdem): Holdem {
  if (standing(s) <= 1) return awardLast(s);
  if (s.seats.filter(canAct).length <= 1) return runout(s);
  if (s.street === 'preflop') return openStreet(s, 'flop', 3, 'Flop.');
  if (s.street === 'flop') return openStreet(s, 'turn', 1, 'Turn.');
  if (s.street === 'turn') return openStreet(s, 'river', 1, 'River.');
  return showdown(s);
}

function afterAction(s: Holdem, from: number): Holdem {
  if (standing(s) <= 1) return awardLast(s);
  if (streetClosed(s)) return advance(s);
  s.actor = firstWhoCan(s, (from + 1) % SEAT_COUNT);
  if (s.actor < 0) return runout(s);
  return s;
}

export function dealHand(prev: Holdem): Holdem {
  const s = clone(prev);
  s.handNo += 1;
  s.dealer = (s.dealer + 1) % SEAT_COUNT;
  s.board = [];
  s.winners = [];
  s.street = 'preflop';
  s.deck = createPokerDeck();
  let k = 0;
  s.seats = s.seats.map(p => {
    const chips = p.chips <= 0 ? REBUY : p.chips;
    const hole = [0, 1].map(() => ({ ...s.deck[k++], faceUp: !p.bot }));
    return { ...p, chips, hole, bet: 0, committed: 0, folded: false, allIn: false, acted: false, handName: undefined };
  });
  s.deck = s.deck.slice(k);
  post(s.seats[(s.dealer + 1) % SEAT_COUNT], SMALL_BLIND);
  post(s.seats[(s.dealer + 2) % SEAT_COUNT], BIG_BLIND);
  s.streetBet = Math.max(...s.seats.map(p => p.bet));
  s.actor = firstWhoCan(s, (s.dealer + 3) % SEAT_COUNT);
  s.note = 'Cards are out. Pre-flop.';
  if (s.actor < 0 || s.seats.filter(canAct).length <= 1) return runout(s);
  return s;
}

/** A fresh match. `stacks` is each seat's buy-in; seat 0 is you. */
export function newMatch(stacks: number[] = [1000, 1000, 1000, 1000]): Holdem {
  const blank: Holdem = {
    deck: [],
    board: [],
    seats: stacks.map((chips, i) => seat(i, chips)),
    streetBet: 0,
    dealer: SEAT_COUNT - 1,
    actor: -1,
    street: 'over',
    note: '',
    handNo: 0,
    winners: [],
  };
  return dealHand(blank);
}

export function legal(s: Holdem, seatNo = s.actor): Legal | null {
  if (s.street === 'over' || seatNo !== s.actor || seatNo < 0) return null;
  const p = s.seats[seatNo];
  if (!p || !canAct(p)) return null;
  const owe = Math.max(0, s.streetBet - p.bet);
  const call = Math.min(p.chips, owe);
  const minRaise = p.chips > call ? Math.min(p.chips, call + BIG_BLIND) : 0;
  return { check: owe === 0, call, minRaise, allIn: p.chips };
}

export function act(s0: Holdem, action: HoldemAction, amount = 0): Holdem {
  if (s0.street === 'over' || s0.actor < 0) return s0;
  const owed = Math.max(0, s0.streetBet - s0.seats[s0.actor].bet);
  let doing = action;
  if (doing === 'call' && owed === 0) doing = 'check';
  if (doing === 'check' && owed > 0) return s0;
  const s = clone(s0);
  const i = s.actor;
  const p = s.seats[i];
  const owe = Math.max(0, s.streetBet - p.bet);
  if (doing === 'fold') {
    p.folded = true;
    p.acted = true;
    s.note = `${p.name} folds.`;
  } else if (doing === 'check') {
    p.acted = true;
    s.note = `${p.name} checks.`;
  } else if (doing === 'call') {
    const pay = post(p, owe);
    p.acted = true;
    s.note = `${p.name} calls $${pay}.`;
  } else {
    const want = doing === 'allin' ? p.chips : Math.min(p.chips, Math.max(amount, owe));
    post(p, want);
    p.acted = true;
    if (p.bet > s.streetBet) {
      s.streetBet = p.bet;
      s.seats.forEach((o, k) => {
        if (k !== i && canAct(o)) o.acted = false;
      });
      s.note = p.allIn ? `${p.name} is all-in for $${p.bet}.` : `${p.name} raises to $${p.bet}.`;
    } else s.note = `${p.name} calls.`;
  }
  return afterAction(s, i);
}

function asState(s: Holdem, actor: number): PokerState {
  const players: PokerPlayer[] = s.seats.map((p, i) => ({
    id: `seat-${i}`,
    name: p.name,
    avatar: '',
    isBot: p.bot,
    chips: p.chips,
    currentBet: p.bet,
    totalRoundBet: p.committed,
    cards: p.hole,
    hasFolded: p.folded,
    isAllIn: p.allIn,
    personality: PERSONALITY[i],
  }));
  return {
    deck: s.deck,
    communityCards: s.board,
    players,
    pot: committed(s),
    currentBet: s.streetBet,
    minRaise: BIG_BLIND,
    dealerIndex: s.dealer,
    activePlayerIndex: actor,
    smallBlind: SMALL_BLIND,
    bigBlind: BIG_BLIND,
    phase: s.street === 'over' ? 'round_over' : s.street,
    lastActionMessage: s.note,
    winners: [],
    roundNumber: s.handNo,
    feltColor: 'emerald',
  };
}

/** One bot decision, turned into a legal action. */
export function applyBot(s: Holdem): Holdem {
  const i = s.actor;
  const L = legal(s);
  if (!L || i < 0 || !s.seats[i].bot) return s;
  const decision = getAIPokerDecision(asState(s, i).players[i], asState(s, i));
  let action = decision.action;
  if (action === 'check' && !L.check) action = L.call > 0 ? 'call' : 'fold';
  if (action === 'call' && L.call === 0) action = 'check';
  if ((action === 'raise' || action === 'allin') && L.minRaise <= 0 && action !== 'allin') action = L.check ? 'check' : 'call';
  const next = act(s, action, decision.amount);
  return next === s ? act(s, L.check ? 'check' : 'fold') : next;
}
