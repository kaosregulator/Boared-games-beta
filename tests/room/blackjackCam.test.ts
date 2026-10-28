import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BANK_AT, BET_AT, BLACKJACK_BEATS, DEALER_ROW, PLAYER_ROW, blackjackShot, settleBeats } from '../../src/room/table/blackjackCam.ts';

test('every beat of a hand has a follow shot the camera can reach', () => {
  for (const beat of BLACKJACK_BEATS) {
    const { shot, ms } = blackjackShot(beat);
    assert.ok(ms >= 600, `${beat} holds long enough to read`);
    assert.ok(shot.pitch >= 0.12 && shot.pitch <= 1.5, `${beat} pitch in range`);
    assert.ok(shot.dist > 0.2 && shot.dist < 0.8, `${beat} distance`);
  }
});

test('the shots look at what just happened', () => {
  assert.equal(blackjackShot('hit', 0.05).shot.target[2], PLAYER_ROW);
  assert.equal(blackjackShot('hit', 0.05).shot.target[0], 0.05);
  assert.equal(blackjackShot('bust', -0.03).shot.target[2], PLAYER_ROW);
  assert.equal(blackjackShot('flip').shot.target[2], DEALER_ROW);
  assert.equal(blackjackShot('dealerDraw', 0.04).shot.target[0], 0.04);
  assert.deepEqual([blackjackShot('payout').shot.target[0], blackjackShot('payout').shot.target[2]], BET_AT);
  assert.deepEqual([blackjackShot('collect').shot.target[0], blackjackShot('collect').shot.target[2]], BANK_AT);
  const settle = blackjackShot('settle').shot;
  // both rows in one frame
  assert.ok(settle.target[2] > DEALER_ROW && settle.target[2] < PLAYER_ROW);
  assert.ok(settle.dist > blackjackShot('hit').shot.dist);
});

test('a settled hand follows the chips: paid and collected, pushed home, or taken', () => {
  assert.deepEqual(settleBeats(20, 10), ['settle', 'payout', 'collect']);
  assert.deepEqual(settleBeats(25, 10), ['settle', 'payout', 'collect']);
  assert.deepEqual(settleBeats(10, 10), ['settle', 'collect']);
  assert.deepEqual(settleBeats(0, 10), ['settle', 'houseTakes']);
});
