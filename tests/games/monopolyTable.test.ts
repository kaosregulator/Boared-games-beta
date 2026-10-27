import assert from 'node:assert/strict';
import { test } from 'node:test';
import { START_CASH } from '../../src/games/monopoly/monopolyData.ts';
import { auctionBid, auctionPass, buyPending, mortgage, newGame, offerTrade, sellBuilding, type GameState } from '../../src/games/monopoly/monopolyEngine.ts';

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

test('a trade moves the street to the other player for most of its price', () => {
  const s = match();
  s.pendingPurchase = null;
  s.deeds[1] = { owner: 0, houses: 0, hotel: false, mortgaged: false };
  const next = offerTrade(s);
  assert.equal(next.deeds[1].owner, 1);
  assert.equal(next.players[0].cash, START_CASH + 48);
  assert.equal(next.players[1].cash, START_CASH - 48);
});
