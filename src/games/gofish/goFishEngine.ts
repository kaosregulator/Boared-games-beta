import type { CardRank, GoFishPlayer, PlayingCard } from '../../types';
import { botChoice, checkForBooks, createGoFishDeck, type AskRecord } from './goFishLogic';

/**
 * Go Fish for the table. Hands, the pond, and books are all cards. Asking
 * takes every card of that rank; four of them leave the hand and sit as a book.
 * A lucky draw of the rank you asked for keeps the turn.
 */

export interface Fisher {
  id: string;
  name: string;
  bot: boolean;
  hand: PlayingCard[];
  books: PlayingCard[][];
}

export interface Fish {
  players: Fisher[];
  pond: PlayingCard[];
  turn: number;
  log: AskRecord[];
  note: string;
  over: boolean;
  winner: number;
}

const NAMES = ['You', 'Alice', 'Bob', 'Charlie'] as const;

function cloneCard(c: PlayingCard): PlayingCard {
  return { ...c };
}

function clone(s: Fish): Fish {
  return {
    ...s,
    pond: s.pond.map(cloneCard),
    log: s.log.map(r => ({ ...r })),
    players: s.players.map(p => ({
      ...p,
      hand: p.hand.map(cloneCard),
      books: p.books.map(b => b.map(cloneCard)),
    })),
  };
}

function asPlayer(p: Fisher): GoFishPlayer {
  return {
    id: p.id,
    name: p.name,
    avatar: '',
    isBot: p.bot,
    hand: p.hand,
    books: p.books.map(b => b[0].rank),
  };
}

export function bookCount(s: Fish) {
  return s.players.reduce((n, p) => n + p.books.length, 0);
}

function layBooks(p: Fisher) {
  const { newBooks, remainingHand } = checkForBooks(p.hand);
  for (const rank of newBooks) {
    const cards = p.hand.filter(c => c.rank === rank);
    p.books.push(cards.map(c => ({ ...c, faceUp: true })));
  }
  p.hand = remainingHand.map(c => ({ ...c, faceUp: !p.bot }));
}

function othersHaveCards(s: Fish, turn: number) {
  return s.players.some((p, i) => i !== turn && p.hand.length > 0);
}

function finish(s: Fish): Fish {
  s.over = true;
  s.winner = s.players.reduce((best, _, i, all) => (all[i].books.length > all[best].books.length ? i : best), 0);
  const w = s.players[s.winner];
  s.note = `${w.name} wins with ${w.books.length} book${w.books.length === 1 ? '' : 's'}.`;
  return s;
}

function nextTurn(s: Fish): Fish {
  if (bookCount(s) >= 13) return finish(s);
  const cards = s.players.reduce((n, p) => n + p.hand.length, 0);
  if (s.pond.length === 0 && cards === 0) return finish(s);
  if (s.pond.length === 0 && s.players.filter(p => p.hand.length > 0).length < 2) return finish(s);
  s.turn = (s.turn + 1) % s.players.length;
  return openTurn(s);
}

/** Draw when a hand is empty, then leave the turn ready to ask. */
function openTurn(s: Fish): Fish {
  if (s.over) return s;
  const me = s.players[s.turn];
  if (me.hand.length === 0 && s.pond.length > 0) {
    const drawn = s.pond[s.pond.length - 1];
    s.pond = s.pond.slice(0, -1);
    me.hand = [{ ...drawn, faceUp: !me.bot }];
    layBooks(me);
    s.note = `${me.name} fishes a card to start the turn.`;
  }
  if (bookCount(s) >= 13) return finish(s);
  if (me.hand.length === 0 || !othersHaveCards(s, s.turn)) return nextTurn(s);
  if (!s.note) s.note = `${me.name}'s turn.`;
  return s;
}

export function newFish(): Fish {
  const deck = createGoFishDeck();
  const players: Fisher[] = NAMES.map((name, i) => ({
    id: `p${i + 1}`,
    name,
    bot: i !== 0,
    hand: [],
    books: [],
  }));
  for (let n = 0; n < 5; n += 1) {
    for (const p of players) {
      const c = deck.pop();
      if (c) p.hand.push({ ...c, faceUp: !p.bot });
    }
  }
  players.forEach(layBooks);
  const s: Fish = {
    players,
    pond: deck.map(c => ({ ...c, faceUp: false })),
    turn: 0,
    log: [],
    note: 'Ask someone for a rank you hold.',
    over: false,
    winner: -1,
  };
  return openTurn(s);
}

/** A dealt position, for tests. Pond's last card is the next one fished. */
export function fromDeal(hands: PlayingCard[][], pond: PlayingCard[], turn = 0): Fish {
  const players: Fisher[] = NAMES.map((name, i) => ({
    id: `p${i + 1}`,
    name,
    bot: i !== 0,
    hand: (hands[i] ?? []).map(c => ({ ...c, faceUp: ! (i !== 0) })),
    books: [],
  }));
  players.forEach(layBooks);
  return openTurn({
    players,
    pond: pond.map(c => ({ ...c, faceUp: false })),
    turn,
    log: [],
    note: '',
    over: false,
    winner: -1,
  });
}

export function heldRanks(s: Fish, seat = s.turn): CardRank[] {
  return [...new Set(s.players[seat]?.hand.map(c => c.rank) ?? [])];
}

export function ask(s0: Fish, target: number, rank: CardRank): Fish {
  if (s0.over || target === s0.turn || target < 0 || target >= s0.players.length) return s0;
  const mine = s0.players[s0.turn];
  if (!mine.hand.some(c => c.rank === rank)) return s0;
  if (!othersHaveCards(s0, s0.turn)) return s0;
  const s = clone(s0);
  const asker = s.players[s.turn];
  const other = s.players[target];
  s.log = [...s.log.slice(-23), { askerId: asker.id, rank }];
  const given = other.hand.filter(c => c.rank === rank);
  if (given.length > 0) {
    other.hand = other.hand.filter(c => c.rank !== rank);
    asker.hand = [...asker.hand, ...given.map(c => ({ ...c, faceUp: !asker.bot }))];
    layBooks(asker);
    s.note = `${other.name} hands over ${given.length} ${rank}${given.length === 1 ? '' : 's'}. Ask again.`;
    if (bookCount(s) >= 13) return finish(s);
    if (asker.hand.length === 0 || !othersHaveCards(s, s.turn)) return nextTurn(s);
    return s;
  }
  s.note = `${other.name} says go fish.`;
  if (s.pond.length === 0) return nextTurn(s);
  const drawn = { ...s.pond[s.pond.length - 1], faceUp: !asker.bot };
  s.pond = s.pond.slice(0, -1);
  const lucky = drawn.rank === rank;
  asker.hand = [...asker.hand, drawn];
  layBooks(asker);
  if (lucky) {
    s.note = `${asker.name} fishes the ${rank} and goes again.`;
    if (bookCount(s) >= 13) return finish(s);
    if (asker.hand.length === 0 || !othersHaveCards(s, s.turn)) return nextTurn(s);
    return s;
  }
  s.note = `${asker.name} fishes and misses. ${s.players[(s.turn + 1) % s.players.length].name} is next.`;
  return nextTurn(s);
}

export function applyBot(s: Fish): Fish {
  if (s.over || !s.players[s.turn]?.bot) return s;
  const me = s.players[s.turn];
  const choice = botChoice(
    asPlayer(me),
    s.players.filter((_, i) => i !== s.turn).map(asPlayer),
    s.log,
  );
  if (!choice) return s;
  const target = s.players.findIndex(p => p.id === choice.targetId);
  const next = ask(s, target, choice.rank);
  return next === s ? s : next;
}
