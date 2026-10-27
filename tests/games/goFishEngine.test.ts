import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CardRank, CardSuit, PlayingCard } from '../../src/types/index.ts';
import { ask, bookCount, fromDeal, newFish } from '../../src/games/gofish/goFishEngine.ts';

function card(rank: CardRank, suit: CardSuit, id: string): PlayingCard {
  return { rank, suit, value: 1, faceUp: true, id };
}

test('a new game deals five cards and leaves the rest in the pond', () => {
  const s = newFish();
  const dealt = s.players.reduce((n, p) => n + p.hand.length + p.books.length * 4, 0);
  assert.equal(dealt + s.pond.length, 52);
  assert.equal(s.turn, 0);
  assert.equal(s.over, false);
  assert.ok(s.players[0].hand.length > 0);
  assert.equal(s.players[0].hand.every(c => c.faceUp), true);
  assert.equal(s.players[1].hand.every(c => c.faceUp), false);
});

test('asking takes every matching card and keeps the turn', () => {
  const s = fromDeal(
    [
      [card('A', '♠', 'a1'), card('K', '♠', 'k1')],
      [card('A', '♥', 'a2'), card('A', '♦', 'a3'), card('2', '♠', 'c2')],
      [card('Q', '♠', 'q1')],
      [card('J', '♠', 'j1')],
    ],
    [card('9', '♠', 'n9')],
  );
  const next = ask(s, 1, 'A');
  assert.equal(next.players[0].hand.filter(c => c.rank === 'A').length, 3);
  assert.equal(next.players[1].hand.some(c => c.rank === 'A'), false);
  assert.equal(next.turn, 0);
  assert.equal(next.pond.length, 1);
});

test('a miss draws the top of the pond and passes the turn', () => {
  const s = fromDeal(
    [
      [card('A', '♠', 'a1')],
      [card('K', '♠', 'k1')],
      [card('Q', '♠', 'q1')],
      [card('J', '♠', 'j1')],
    ],
    [card('9', '♣', 'bottom'), card('4', '♠', 'top')],
  );
  const next = ask(s, 1, 'A');
  assert.equal(next.turn, 1);
  assert.equal(next.players[0].hand.some(c => c.id === 'top'), true);
  assert.equal(next.pond.length, 1);
  assert.equal(next.pond[0].id, 'bottom');
});

test('fishing the rank you asked for lets you ask again', () => {
  const s = fromDeal(
    [
      [card('A', '♠', 'a1')],
      [card('K', '♠', 'k1')],
      [card('Q', '♠', 'q1')],
      [card('J', '♠', 'j1')],
    ],
    [card('A', '♥', 'a2')],
  );
  const next = ask(s, 1, 'A');
  assert.equal(next.turn, 0);
  assert.equal(next.players[0].hand.filter(c => c.rank === 'A').length, 2);
  assert.equal(next.pond.length, 0);
});

test('four of a rank leave the hand and sit as a book', () => {
  const s = fromDeal(
    [
      [card('A', '♠', 'a1'), card('A', '♥', 'a2'), card('A', '♦', 'a3'), card('K', '♠', 'k1')],
      [card('A', '♣', 'a4'), card('2', '♠', 'c2')],
      [card('Q', '♠', 'q1')],
      [card('J', '♠', 'j1')],
    ],
    [],
  );
  const next = ask(s, 1, 'A');
  assert.equal(next.players[0].hand.some(c => c.rank === 'A'), false);
  assert.equal(next.players[0].books.length, 1);
  assert.equal(next.players[0].books[0].length, 4);
  assert.equal(bookCount(next), 1);
  assert.equal(next.players[0].hand.some(c => c.rank === 'K'), true);
  assert.equal(next.turn, 0);
});
