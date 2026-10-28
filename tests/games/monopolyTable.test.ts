import assert from 'node:assert/strict';
import { test } from 'node:test';
import { START_CASH } from '../../src/games/monopoly/monopolyData.ts';
import {
  auctionBid,
  auctionPass,
  buyPending,
  canTrade,
  canUnmortgage,
  judgeTrade,
  mortgage,
  newGame,
  proposeTrade,
  sellBuilding,
  tradeProblem,
  unmortgage,
  unmortgageCost,
  type GameState,
} from '../../src/games/monopoly/monopolyEngine.ts';

function match(): GameState {
  const s = newGame([
    { name: 'You', isAI: false, token: 'car', glyph: '' },
    { name: 'Mom', isAI: true, token: 'dog', glyph: '' },
  ]);
  s.stage = 'resolve';
  s.pendingPurchase = 1;
  s.players[0].at = 1;
  return s;
}

test('passing a property auctions it and the high bid takes the deed', () => {
  const opened = buyPending(match(), false);
  assert.equal(opened.stage, 'auction');
  assert.equal(opened.auction?.seat, 1);
  assert.equal(opened.pendingPurchase, null);
  const bid = auctionBid(opened);
  assert.equal(bid.auction?.high, 10);
  assert.equal(bid.auction?.leader, 1);
  assert.equal(bid.auction?.seat, 0);
  const won = auctionPass(bid);
  assert.equal(won.stage, 'end');
  assert.equal(won.auction, null);
  assert.equal(won.deeds[1]?.owner, 1);
  assert.equal(won.players[1].cash, START_CASH - 10);
  assert.equal(won.players[0].cash, START_CASH);
});

test('selling a house and mortgaging the street pays the bank rates', () => {
  const s = match();
  s.pendingPurchase = null;
  s.deeds[1] = { owner: 0, houses: 1, hotel: false, mortgaged: false };
  const sold = sellBuilding(s, 1);
  assert.equal(sold.deeds[1].houses, 0);
  assert.equal(sold.players[0].cash, START_CASH + 25);
  const pledged = mortgage(sold, 1);
  assert.equal(pledged.deeds[1].mortgaged, true);
  assert.equal(pledged.players[0].cash, START_CASH + 25 + 30);
});

const open = (owner: number, mortgaged = false) => ({ owner, houses: 0, hotel: false, mortgaged });

function table(): GameState {
  const s = match();
  s.pendingPurchase = null;
  return s;
}

test('a mortgage is lifted for its value plus ten percent', () => {
  const s = table();
  s.deeds[39] = open(0);
  const pledged = mortgage(s, 39);
  assert.equal(pledged.players[0].cash, START_CASH + 200);
  assert.equal(unmortgageCost(39), 220);
  assert.equal(canUnmortgage(pledged, 39, 0), true);
  const lifted = unmortgage(pledged, 39);
  assert.equal(lifted.deeds[39].mortgaged, false);
  assert.equal(lifted.players[0].cash, START_CASH - 20);
  // nothing to lift twice, and not on someone else's deed
  assert.equal(unmortgage(lifted, 39), lifted);
  const theirs = table();
  theirs.deeds[39] = open(1, true);
  assert.equal(canUnmortgage(theirs, 39, 0), false);
});

test('a mortgage cannot be lifted without the cash', () => {
  const s = table();
  s.deeds[39] = open(0, true);
  s.players[0].cash = 219;
  assert.equal(canUnmortgage(s, 39, 0), false);
  assert.equal(unmortgage(s, 39), s);
});

test('deeds in a colour group with houses cannot change hands', () => {
  const s = table();
  s.deeds[1] = open(0);
  s.deeds[3] = { owner: 0, houses: 1, hotel: false, mortgaged: false };
  s.deeds[5] = open(0);
  assert.equal(canTrade(s, 1, 0), false);
  assert.equal(canTrade(s, 3, 0), false);
  assert.equal(canTrade(s, 5, 0), true);
  assert.equal(canTrade(s, 5, 1), false);
  assert.match(tradeProblem(s, { from: 0, to: 1, give: [1], want: [], cash: 0 }) ?? '', /cannot trade/);
});

test('a fair cash offer for a lone street is taken', () => {
  const s = table();
  s.deeds[39] = open(1);
  const deal = { from: 0, to: 1, give: [], want: [39], cash: 520 };
  assert.equal(judgeTrade(s, deal).accept, true);
  const next = proposeTrade(s, deal);
  assert.equal(next.deeds[39].owner, 0);
  assert.equal(next.players[0].cash, START_CASH - 520);
  assert.equal(next.players[1].cash, START_CASH + 520);
});

test('a lowball offer is turned down and nothing moves', () => {
  const s = table();
  s.deeds[39] = open(1);
  const next = proposeTrade(s, { from: 0, to: 1, give: [], want: [39], cash: 200 });
  assert.equal(next.deeds[39].owner, 1);
  assert.equal(next.players[0].cash, START_CASH);
  assert.equal(next.players[1].cash, START_CASH);
  assert.match(next.log[0], /wants more/);
});

test('the computer will not hand over the last street of your colour set cheaply', () => {
  const s = table();
  s.deeds[37] = open(0);
  s.deeds[39] = open(1);
  // the price alone would buy a lone Boardwalk, but this one completes your set
  const cheap = { from: 0, to: 1, give: [], want: [39], cash: 600 };
  assert.equal(judgeTrade(s, cheap).accept, false);
  assert.match(proposeTrade(s, cheap).log[0], /colour set/);
  // paid what the set is worth to you, it deals
  assert.equal(judgeTrade(s, { ...cheap, cash: 1200 }).accept, true);
});

test('deeds and cash both ways: a swap plus a sweetener', () => {
  const s = table();
  s.deeds[6] = open(0);
  s.deeds[8] = open(1);
  s.deeds[9] = open(1);
  s.deeds[24] = open(1);
  // Oriental completes their light blues; you take Illinois and add $20
  const deal = { from: 0, to: 1, give: [6], want: [24], cash: 20 };
  assert.equal(judgeTrade(s, deal).accept, true);
  const next = proposeTrade(s, deal);
  assert.equal(next.deeds[6].owner, 1);
  assert.equal(next.deeds[24].owner, 0);
  assert.equal(next.players[0].cash, START_CASH - 20);
  assert.equal(next.players[1].cash, START_CASH + 20);
});

test('you can sell a deed to the computer for its cash', () => {
  const s = table();
  s.deeds[5] = open(0);
  const fair = { from: 0, to: 1, give: [5], want: [], cash: -150 };
  assert.equal(judgeTrade(s, fair).accept, true);
  const next = proposeTrade(s, fair);
  assert.equal(next.deeds[5].owner, 1);
  assert.equal(next.players[0].cash, START_CASH + 150);
  // too dear, or more than they can spare
  assert.equal(judgeTrade(s, { ...fair, cash: -260 }).accept, false);
  s.players[1].cash = 200;
  assert.equal(judgeTrade(s, fair).accept, false);
});

test('a mortgaged deed changes hands still mortgaged and is valued lower', () => {
  const s = table();
  s.deeds[39] = open(1, true);
  const deal = { from: 0, to: 1, give: [], want: [39], cash: 330 };
  assert.equal(judgeTrade(s, deal).accept, true);
  // the same money would not buy it clear
  const clear = table();
  clear.deeds[39] = open(1);
  assert.equal(judgeTrade(clear, deal).accept, false);
  const next = proposeTrade(s, deal);
  assert.equal(next.deeds[39].owner, 0);
  assert.equal(next.deeds[39].mortgaged, true);
});

test('an offer needs a deed and cash the proposer actually has', () => {
  const s = table();
  s.deeds[39] = open(1);
  assert.notEqual(tradeProblem(s, { from: 0, to: 1, give: [], want: [], cash: 100 }), null);
  assert.notEqual(tradeProblem(s, { from: 0, to: 1, give: [], want: [39], cash: START_CASH + 1 }), null);
  assert.notEqual(tradeProblem(s, { from: 0, to: 0, give: [], want: [39], cash: 0 }), null);
  const refused = proposeTrade(s, { from: 0, to: 1, give: [], want: [39], cash: START_CASH + 1 });
  assert.equal(refused.deeds[39].owner, 1);
});
