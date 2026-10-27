import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act, applyBot, bankroll, committed, legal, newMatch, potBeforeStreet } from '../../src/games/poker/holdemEngine.ts';

test('the button is you, and the blinds are posted', () => {
  const s = newMatch();
  assert.equal(s.dealer, 0);
  assert.equal(s.actor, 3);
  assert.equal(s.street, 'preflop');
  assert.equal(s.seats[1].bet, 10);
  assert.equal(s.seats[2].bet, 20);
  assert.equal(s.seats[1].chips, 990);
  assert.equal(s.seats[2].chips, 980);
  assert.equal(committed(s), 30);
  assert.equal(s.seats[0].hole.length, 2);
  assert.equal(s.seats[0].hole[0].faceUp, true);
  assert.equal(s.seats[1].hole[0].faceUp, false);
  assert.equal(bankroll(s), 4000);
});

test('calling around and the big blind checking deals the flop', () => {
  let s = newMatch();
  s = act(s, 'call');
  assert.equal(s.actor, 0);
  s = act(s, 'call');
  s = act(s, 'call');
  assert.equal(s.actor, 2);
  assert.equal(legal(s)?.check, true);
  s = act(s, 'check');
  assert.equal(s.street, 'flop');
  assert.equal(s.board.length, 3);
  assert.equal(s.actor, 1);
  assert.equal(s.streetBet, 0);
  assert.equal(committed(s), 80);
  assert.equal(potBeforeStreet(s), 80);
  assert.equal(bankroll(s), 4000);
});

test('a raise sends the action back around', () => {
  let s = newMatch();
  s = act(s, 'call');
  s = act(s, 'raise', 60);
  assert.equal(s.seats[0].bet, 60);
  assert.equal(s.streetBet, 60);
  assert.equal(s.actor, 1);
  assert.equal(s.seats[2].acted, false);
  assert.equal(s.seats[3].acted, false);
  assert.equal(bankroll(s), 4000);
});

test('three folds award the blinds to the last player in', () => {
  let s = newMatch();
  s = act(s, 'fold');
  s = act(s, 'fold');
  s = act(s, 'fold');
  assert.equal(s.street, 'over');
  assert.equal(s.seats[2].chips, 1010);
  assert.equal(s.seats[1].chips, 990);
  assert.equal(s.seats[0].chips, 1000);
  assert.equal(s.seats[3].chips, 1000);
  assert.equal(bankroll(s), 4000);
});

function callOrCheck(s: ReturnType<typeof newMatch>) {
  const L = legal(s);
  assert.ok(L);
  return L.check ? act(s, 'check') : act(s, 'call');
}

test('a checked-down hand pays the board and keeps every chip', () => {
  let s = newMatch();
  let guard = 0;
  while (s.street !== 'over' && guard < 40) {
    s = callOrCheck(s);
    guard += 1;
  }
  assert.equal(s.street, 'over');
  assert.equal(s.board.length, 5);
  assert.equal(s.seats.reduce((n, p) => n + p.chips, 0), 4000);
  assert.ok(s.winners.length >= 1);
  assert.ok(s.winners.every(w => w.hand.length > 0));
});

test('a short all-in cannot take chips it never matched', () => {
  let s = newMatch([1000, 1000, 1000, 30]);
  assert.equal(bankroll(s), 3030);
  s = act(s, 'allin');
  let guard = 0;
  while (s.street !== 'over' && guard < 40) {
    s = callOrCheck(s);
    guard += 1;
  }
  assert.equal(s.street, 'over');
  assert.equal(bankroll(s), 3030);
  assert.ok(s.seats[3].chips <= 120);
});

test('a bot answers when it is their turn', () => {
  const s = newMatch();
  assert.equal(s.seats[s.actor].bot, true);
  const next = applyBot(s);
  assert.notEqual(next, s);
  assert.equal(bankroll(next), 4000);
  assert.ok(next.actor !== s.actor || next.street !== s.street);
});
